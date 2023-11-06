const mongoose = require('mongoose');
const _ = require('lodash');

const FavoritesSchema = mongoose.Schema({
	favoriteBrews : [String],
	user          : { type: String }
});

FavoritesSchema.statics.getByUser = async function(username){
	const query = { user: username };
	const brews = await Favorites.find(query, fields).lean().exec() //lean() converts results to JSObjects
		.catch((error)=>{throw 'Can not find favorites for user';});
	return brews;
};
const Favorites = mongoose.model('Favorites', FavoritesSchema);


module.exports = {
	schema : FavoritesSchema,
	model  : Favorites,
};
