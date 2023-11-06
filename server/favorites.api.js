const asyncHandler = require('express-async-handler');
const favoritesModel = require('./favorites.model.js').model;
const router = require('express').Router();

// define a function to catch our save errors
const favoritesSaveError = (err)=>{
	console.error(err);
	res.status(err.status || 500).send(err.message || 'Unable to save favorites to Homebrewery database');
};


const favorites = {
	favoritesApi           : router,
	excludePropsFromUpdate : (brew)=>{
		// Remove undesired properties
		const modified = _.clone(brew);
		const propsToExclude = ['_id', 'views', 'lastViewed'];
		for (const prop of propsToExclude) {
			delete modified[prop];
		}
		return modified;
	},
	getFavorites : ()=>{
		return async (req, res, next)=>{
			let favs = await favoritesModel.get(req.params.user)
				.catch((err)=>{
					console.warn(err);
				});
			favs = favs?.toObject();
			req.favorites = favs ?? {};
			next();
		};
	},
	updateFavorites : async (req, res)=>{
		const favoritesFromClient = favorites.excludePropsFromUpdate(req.body);
		const favoritesFromServer = req.favorites;

		let collatedFavorites = _.assign(favoritesFromServer, favoritesFromClient);

		let saved;
		if(!collatedFavorites._id) {
			saved = await new favoritesModel(collatedFavorites).save().catch(favoritesSaveError);
		} else {
			collatedFavorites = _.assign(await FavoritesModel.findOne({ _id: collatedFavorites._id }), collatedFavorites);
			saved = await collatedFavorites.save().catch(favoritesSaveError);
		}
		res.status(200).send(saved);
	},
	deleteFavorite : async (req, res, next)=>{
		const prunedFavorites = favorites.getFavorites(req.params.user);
		if(prunedFavorites?.favoriteBrews.includes(req.params.brew)) {
			prunedFavorites?.favoriteBrews.splice(prunedFavorites?.favoriteBrews.indexOf(req.params.brew), 1);
			await collatedFavorites.save().catch(favoritesSaveError);
			res.status(204).send();
		} else {
			res.status(418).send();
		}
	}
};

router.use('/favorites', require('./middleware/check-client-version.js'));
router.get('/favorites/', asyncHandler(favorites.getFavorites()));
router.get('/favorites/:user', asyncHandler(favorites.getFavorites()));
router.put('/favorites/:user', asyncHandler(favorites.getFavorites()), asyncHandler(favorites.updateFavorites));
router.put('/favorites/update/:user/:brew', asyncHandler(favorites.getFavorites()), asyncHandler(favorites.updateFavorites));
router.delete('/favorites/:user/:brew', asyncHandler(favorites.deleteFavorite));
router.get('/favorites/remove/:user/:brew', asyncHandler(favorites.deleteFavorite));

module.exports = favorites;
