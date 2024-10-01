/* eslint-disable max-lines */
const _ = require('lodash');
const HomebrewModel = require('./homebrew.model.js').model;
const router = require('express').Router();
const zlib = require('zlib');
const GoogleActions = require('./googleActions.js');
const Markdown = require('../shared/naturalcrit/markdown.js');
const yaml = require('js-yaml');
const asyncHandler = require('express-async-handler');
const { nanoid } = require('nanoid');
const { splitTextStyleAndMetadata } = require('../shared/helpers.js');
const rateLimit = require('express-rate-limit');

const { DEFAULT_BREW, DEFAULT_BREW_LOAD } = require('./brewDefaults.js');

const Themes = require('../themes/themes.json');

const isStaticTheme = (renderer, themeName)=>{
	return Themes[renderer]?.[themeName] !== undefined;
};

// const getTopBrews = (cb) => {
// 	HomebrewModel.find().sort({ views: -1 }).limit(5).exec(function(err, brews) {
// 		cb(brews);
// 	});
// };

// Define rate limiter options
const rateLimiter = rateLimit({
	timeWindow : 5 * 60 * 1000, // 5 minutes window
	max        : 5, // limit each IP to 100 requests per timeWindow
	handler: (req, res, next) => {
		console.log(`Rate limiting user ${req.account?.username}`);
		throw { HBErrorCode: '55', status: 429, message: 'Too many requests from this IP, please try again after 5 minutes'};
	}
});

// Define the delay middleware function
const delayMiddleware = (delay) => {
  return (req, res, next) => {
    setTimeout(() => {
      next();
    }, delay);
  };
};

const MAX_TITLE_LENGTH = 100;

const api = {
	homebrewApi : router,
	getId       : (req)=>{
		// Set the id and initial potential google id, where the google id is present on the existing brew.
		let id = req.params.id, googleId = req.body?.googleId;

		// If the id is longer than 12, then it's a google id + the edit id. This splits the longer id up.
		if(id.length > 12) {
			if(id.length >= (33 + 12)) {    // googleId is minimum 33 chars (may increase)
				googleId = id.slice(0, -12);  // current editId is 12 chars
			} else {                        // old editIds used to be 10 chars;
				googleId = id.slice(0, -10);  // if total string is too short, must be old brew
				console.log('Old brew, using 10-char Id');
			}
			id = id.slice(googleId.length);
		}
		return { id, googleId };
	},
	//Get array of any of this user's brews tagged with `meta:theme`
	getUsersBrewThemes : async (username)=>{
		if(!username)
			return {};

		const fields = [
			'title',
			'tags',
			'shareId',
			'thumbnail',
			'textBin',
			'text',
			'authors',
			'renderer'
		];

		const userThemes = {};

		const brews = await HomebrewModel.getByUser(username, true, fields, { tags: { $in: ['meta:theme', 'meta:Theme'] } });

		if(brews) {
			for (const brew of brews) {
				userThemes[brew.renderer] ??= {};
				userThemes[brew.renderer][brew.shareId] = {
					name         : brew.title,
					renderer     : brew.renderer,
					baseTheme    : brew.theme,
					baseSnippets : false,
					author       : brew.authors[0],
					path         : brew.shareId,
					thumbnail    : brew.thumbnail || '/assets/naturalCritLogoWhite.svg'
				};
			}
		}

		return userThemes;
	},
	getBrew : (accessType, stubOnly = false)=>{
		// Create middleware with the accessType passed in as part of the scope
		return async (req, res, next)=>{
			// Get relevant IDs for the brew
			const { id, googleId } = api.getId(req);

			// Try to find the document in the Homebrewery database -- if it doesn't exist, that's fine.
			let stub = await HomebrewModel.get(accessType === 'edit' ? { editId: id } : { shareId: id })
				.catch((err)=>{
					if(googleId) {
						console.warn(`Unable to find document stub for ${accessType}Id ${id}`);
					} else {
						console.warn(err);
					}
				});
			stub = stub?.toObject();

			if(stub?.lock?.locked && accessType != 'edit') {
				throw { HBErrorCode: '51', code: stub.lock.code, message: stub.lock.shareMessage, brewId: stub.shareId, brewTitle: stub.title };
			}

			// If there is a google id, try to find the google brew
			if(!stubOnly && (googleId || stub?.googleId)) {
				let googleError;
				const googleBrew = await GoogleActions.getGoogleBrew(googleId || stub?.googleId, id, accessType)
					.catch((err)=>{
						googleError = err;
					});
				// Throw any error caught while attempting to retrieve Google brew.
				if(googleError) {
					const reason = googleError.errors?.[0].reason;
					if(reason == 'notFound') {
						throw { ...googleError, HBErrorCode: '02', authors: stub?.authors, account: req.account?.username };
					} else {
						throw { ...googleError, HBErrorCode: '01' };
					}
				}
				// Combine the Homebrewery stub with the google brew, or if the stub doesn't exist just use the google brew
				stub = stub ? _.assign({ ...api.excludeStubProps(stub), stubbed: true }, api.excludeGoogleProps(googleBrew)) : googleBrew;
			}
			const authorsExist = stub?.authors?.length > 0;
			const isAuthor = stub?.authors?.includes(req.account?.username);
			const isInvited = stub?.invitedAuthors?.includes(req.account?.username);
			if(accessType === 'edit' && (authorsExist && !(isAuthor || isInvited))) {
				const accessError = { name: 'Access Error', status: 401 };
				if(req.account){
					throw { ...accessError, message: 'User is not an Author', HBErrorCode: '03', authors: stub.authors, brewTitle: stub.title, shareId: stub.shareId };
				}
				throw { ...accessError, message: 'User is not logged in', HBErrorCode: '04', authors: stub.authors, brewTitle: stub.title, shareId: stub.shareId };
			}

			// If after all of that we still don't have a brew, throw an exception
			if(!stub && !stubOnly) {
				throw { name: 'BrewLoad Error', message: 'Brew not found', status: 404, HBErrorCode: '05', accessType: accessType, brewId: id };
			}

			// Clean up brew: fill in missing fields with defaults / fix old invalid values
			if(stub) {
				stub.tags     = stub.tags     || undefined; // Clear empty strings
				stub.renderer = stub.renderer || undefined; // Clear empty strings
				stub = _.defaults(stub, DEFAULT_BREW_LOAD); // Fill in blank fields
			}

			req.brew = stub ?? {};
			next();
		};
	},

	getCSS : async (req, res)=>{
		const { brew } = req;
		if(!brew) return res.status(404).send('');
		splitTextStyleAndMetadata(brew);
		if(!brew.style) return res.status(404).send('');

		res.set({
			'Cache-Control' : 'no-cache',
			'Content-Type'  : 'text/css'
		});
		return res.status(200).send(brew.style);
	},

	mergeBrewText : (brew)=>{
		let text = brew.text;
		if(brew.style !== undefined) {
			text = `\`\`\`css\n` +
				`${brew.style || ''}\n` +
				`\`\`\`\n\n` +
				`${text}`;
		}
		const metadata = _.pick(brew, ['title', 'description', 'tags', 'systems', 'renderer', 'theme']);
		text = `\`\`\`metadata\n` +
			`${yaml.dump(metadata)}\n` +
			`\`\`\`\n\n` +
			`${text}`;
		return text;
	},
	getGoodBrewTitle : (text)=>{
		const tokens = Markdown.marked.lexer(text);
		return (tokens.find((token)=>token.type === 'heading' || token.type === 'paragraph')?.text || 'No Title')
			.slice(0, MAX_TITLE_LENGTH);
	},
	excludePropsFromUpdate : (brew)=>{
		// Remove undesired properties
		const modified = _.clone(brew);
		const propsToExclude = ['_id', 'views', 'lastViewed'];
		for (const prop of propsToExclude) {
			delete modified[prop];
		}
		return modified;
	},
	excludeGoogleProps : (brew)=>{
		const modified = _.clone(brew);
		const propsToExclude = ['version', 'tags', 'systems', 'published', 'authors', 'owner', 'views', 'thumbnail'];
		for (const prop of propsToExclude) {
			delete modified[prop];
		}
		return modified;
	},
	excludeStubProps : (brew)=>{
		const propsToExclude = ['text', 'textBin'];
		for (const prop of propsToExclude) {
			brew[prop] = undefined;
		}
		return brew;
	},
	beforeNewSave : (account, brew)=>{
		if(!brew.title) {
			brew.title = api.getGoodBrewTitle(brew.text);
		}

		brew.authors = (account) ? [account.username] : [];
		brew.text = api.mergeBrewText(brew);

		_.defaults(brew, DEFAULT_BREW);

		brew.title = brew.title.trim();
		brew.description = brew.description.trim();
	},
	newGoogleBrew : async (account, brew, res)=>{
		const oAuth2Client = GoogleActions.authCheck(account, res);

		const newBrew = api.excludeGoogleProps(brew);

		return await GoogleActions.newGoogleBrew(oAuth2Client, newBrew);
	},
	newBrew : async (req, res)=>{
		const brew = req.body;
		const { saveToGoogle } = req.query;

		delete brew.editId;
		delete brew.shareId;
		delete brew.googleId;

		api.beforeNewSave(req.account, brew);

		const newHomebrew = new HomebrewModel(brew);
		newHomebrew.editId = nanoid(12);
		newHomebrew.shareId = nanoid(12);

		let googleId, saved;
		if(saveToGoogle) {
			googleId = await api.newGoogleBrew(req.account, newHomebrew, res);

			if(!googleId) return;
			api.excludeStubProps(newHomebrew);
			newHomebrew.googleId = googleId;
		} else {
			// Compress brew text to binary before saving
			newHomebrew.textBin = zlib.deflateRawSync(newHomebrew.text);
			// Delete the non-binary text field since it's not needed anymore
			newHomebrew.text = undefined;
		}

		saved = await newHomebrew.save()
			.catch((err)=>{
				console.error(err, err.toString(), err.stack);
				throw { name: 'BrewSave Error', message: `Error while creating new brew, ${err.toString()}`, status: 500, HBErrorCode: '06' };
			});
		if(!saved) return;
		saved = saved.toObject();

		res.status(200).send(saved);
	},
	getThemeBundle : async(req, res)=>{
		/*	getThemeBundle: Collects the theme and all parent themes
				returns an object containing an array of css, and an array of snippets, in render order

				req.params.id       : The shareId ( User theme ) or name ( static theme )
				req.params.renderer : The Markdown renderer used for this theme */

		req.params.renderer = _.upperFirst(req.params.renderer);
		let currentTheme;
		const completeStyles   = [];
		const completeSnippets = [];

		while (req.params.id) {
			//=== User Themes ===//
			if(!isStaticTheme(req.params.renderer, req.params.id)) {
				await api.getBrew('share')(req, res, ()=>{})
					.catch((err)=>{
						if(err.HBErrorCode == '05')
							err = { ...err, name: 'ThemeLoad Error', message: 'Theme Not Found', HBErrorCode: '09' };
						throw err;
					});

				currentTheme = req.brew;
				splitTextStyleAndMetadata(currentTheme);

				// If there is anything in the snippets or style members, append them to the appropriate array
				if(currentTheme?.snippets) completeSnippets.push(JSON.parse(currentTheme.snippets));
				if(currentTheme?.style) completeStyles.push(`/* From Brew: ${req.protocol}://${req.get('host')}/share/${req.params.id} */\n\n${currentTheme.style}`);

				req.params.id       = currentTheme.theme;
				req.params.renderer = currentTheme.renderer;
			}
			//=== Static Themes ===//
			else {
				const localSnippets = `${req.params.renderer}_${req.params.id}`; // Just log the name for loading on client
				const localStyle    = `@import url(\"/themes/${req.params.renderer}/${req.params.id}/style.css\");`;
				completeSnippets.push(localSnippets);
				completeStyles.push(`/* From Theme ${req.params.id} */\n\n${localStyle}`);

				req.params.id = Themes[req.params.renderer][req.params.id].baseTheme;
			}
		}

		const returnObj = {
			// Reverse the order of the arrays so they are listed oldest parent to youngest child.
			styles   : completeStyles.reverse(),
			snippets : completeSnippets.reverse()
		};

		res.setHeader('Content-Type', 'application/json');
		return res.status(200).send(returnObj);
	},
	updateBrew : async (req, res)=>{
		// Initialize brew from request and body, destructure query params, and set the initial value for the after-save method
		const brewFromClient = api.excludePropsFromUpdate(req.body);
		const brewFromServer = req.brew;
		if(brewFromServer.version && brewFromClient.version && brewFromServer.version > brewFromClient.version) {
			console.log(`Version mismatch on brew ${brewFromClient.editId}`);
			res.setHeader('Content-Type', 'application/json');
			return res.status(409).send(JSON.stringify({ message: `The brew has been changed on a different device. Please save your changes elsewhere, refresh, and try again.` }));
		}

		let brew = _.assign(brewFromServer, brewFromClient);
		const googleId = brew.googleId;
		const { saveToGoogle, removeFromGoogle } = req.query;
		let afterSave = async ()=>true;

		brew.title = brew.title.trim();
		brew.description = brew.description.trim() || '';
		brew.text = api.mergeBrewText(brew);

		if(brew.googleId && removeFromGoogle) {
			// If the google id exists and we're removing it from google, set afterSave to delete the google brew and mark the brew's google id as undefined
			afterSave = async ()=>{
				return await api.deleteGoogleBrew(req.account, googleId, brew.editId, res)
					.catch((err)=>{
						console.error(err);
						res.status(err?.status || err?.response?.status || 500).send(err.message || err);
					});
			};

			brew.googleId = undefined;
		} else if(!brew.googleId && saveToGoogle) {
			// If we don't have a google id and the user wants to save to google, create the google brew and set the google id on the brew
			brew.googleId = await api.newGoogleBrew(req.account, api.excludeGoogleProps(brew), res);

			if(!brew.googleId) return;
		} else if(brew.googleId) {
			// If the google id exists and no other actions are being performed, update the google brew
			const updated = await api.updateGoogleBrew(req.account, api.excludeGoogleProps(brew), res, req);

			if(!updated) return;
		}

		if(brew.googleId) {
			// If the google id exists after all those actions, exclude the props that are stored in google and aren't needed for rendering the brew items
			api.excludeStubProps(brew);
		} else {
			// Compress brew text to binary before saving
			brew.textBin = zlib.deflateRawSync(brew.text);
			// Delete the non-binary text field since it's not needed anymore
			brew.text = undefined;
		}
		brew.updatedAt = new Date();
		brew.version = (brew.version || 1) + 1;

		if(req.account) {
			brew.authors = _.uniq(_.concat(brew.authors, req.account.username));
			brew.invitedAuthors = _.uniq(_.filter(brew.invitedAuthors, (a)=>req.account.username !== a));
		}

		// define a function to catch our save errors
		const saveError = (err)=>{
			console.error(err);
			res.status(err.status || 500).send(err.message || 'Unable to save brew to Homebrewery database');
		};
		let saved;
		if(!brew._id) {
			// if the brew does not have a stub id, create and save it, then write the new value back to the brew.
			saved = await new HomebrewModel(brew).save().catch(saveError);
		} else {
			// if the brew does have a stub id, update it using the stub id as the key.
			brew = _.assign(await HomebrewModel.findOne({ _id: brew._id }), brew);
			saved = await brew.save()
				.catch(saveError);
		}
		if(!saved) return;
		// Call and wait for afterSave to complete
		const after = await afterSave();
		if(!after) return;

		res.status(200).send(saved);
	},

	updateGoogleBrew : async (account, brew, res, req)=>{
		//let oAuth2Client;
		//if(account.googleId)
		//	oAuth2Client = GoogleActions.authCheck(account, res);

		return await GoogleActions.updateGoogleBrew(brew, undefined, req.ip);
	},

	deleteGoogleBrew : async (account, id, editId, res)=>{
		const auth = await GoogleActions.authCheck(account, res);
		await GoogleActions.deleteGoogleBrew(auth, id, editId);
		return true;
	},
	deleteBrew : async (req, res, next)=>{
		// Delete an orphaned stub if its Google brew doesn't exist
		try {
			await api.getBrew('edit')(req, res, ()=>{});
		} catch (err) {
			// Only if the error code is HBErrorCode '02', that is, Google returned "404 - Not Found"
			if(err.HBErrorCode == '02') {
				const { id, googleId } = api.getId(req);
				console.warn(`No google brew found for id ${googleId}, the stub with id ${id} will be deleted.`);
				await HomebrewModel.deleteOne({ editId: id });
				return next();
			}
		}

		let brew = req.brew;
		const { googleId, editId } = brew;
		const account = req.account;
		const isOwner = account && (brew.authors.length === 0 || brew.authors[0] === account.username);
		// If the user is the owner and the file is saved to google, mark the google brew for deletion
		const shouldDeleteGoogleBrew = googleId && isOwner;

		if(brew._id) {
			brew = _.assign(await HomebrewModel.findOne({ _id: brew._id }), brew);
			if(account) {
				// Remove current user as author
				brew.authors = _.pull(brew.authors, account.username);
			}

			if(brew.authors.length === 0) {
				// Delete brew if there are no authors left
				await HomebrewModel.deleteOne({ _id: brew._id })
					.catch((err)=>{
						console.error(err);
						throw { name: 'BrewDelete Error', message: 'Error while removing', status: 500, HBErrorCode: '07', brewId: brew._id };
					});
			} else {
				if(shouldDeleteGoogleBrew) {
					// When there are still authors remaining, we delete the google brew but store the full brew in the Homebrewery database
					brew.googleId = undefined;
					brew.textBin = zlib.deflateRawSync(brew.text);
					brew.text = undefined;
				}
				brew.markModified('authors'); //Mongo will not properly update arrays without markModified()
				await brew.save()
					.catch((err)=>{
						throw { name: 'BrewAuthorDelete Error', message: err, status: 500, HBErrorCode: '08', brewId: brew._id };
					});
			}
		}
		if(shouldDeleteGoogleBrew) {
			const deleted = await api.deleteGoogleBrew(account, googleId, editId, res)
				.catch((err)=>{
					console.error(err);
					res.status(500).send(err);
				});
			if(!deleted) return;
		}

		res.status(204).send();
	}
};

// router.use('/api', rateLimiter);
router.use('/api', require('./middleware/check-client-version.js'));
router.post('/api', asyncHandler(api.newBrew));
router.put('/api/:id', asyncHandler(api.getBrew('edit', true)), asyncHandler(api.updateBrew));
router.put('/api/update/:id', asyncHandler(api.getBrew('edit', true)), delayMiddleware(1000), asyncHandler(api.updateBrew));
router.delete('/api/:id', asyncHandler(api.deleteBrew));
router.get('/api/remove/:id', asyncHandler(api.deleteBrew));
router.get('/api/theme/:renderer/:id', asyncHandler(api.getThemeBundle));

module.exports = api;
