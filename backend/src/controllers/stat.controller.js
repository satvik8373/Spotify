import { Album } from "../models/album.model.js";
import { Song } from "../models/song.model.js";
import admin from "firebase-admin";

export const getStats = async (req, res, next) => {
	try {
		// Get Firebase user count
		let totalUsers = 0;
		try {
			const userList = await admin.auth().listUsers();
			totalUsers = userList.users.length;
		} catch (error) {
			console.error("Error listing Firebase users:", error);
		}
		
		const [totalSongs, totalAlbums, uniqueArtists] = await Promise.all([
			Song.countDocuments(),
			Album.countDocuments(),
			Song.aggregate([
				{
					$unionWith: {
						coll: "albums",
						pipeline: [],
					},
				},
				{
					$group: {
						_id: "$artist",
					},
				},
				{
					$count: "count",
				},
			]),
		]);

		res.status(200).json({
			totalAlbums,
			totalSongs,
			totalUsers,
			totalArtists: uniqueArtists[0]?.count || 0,
		});
	} catch (error) {
		next(error);
	}
};
