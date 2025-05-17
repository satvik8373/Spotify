import { Song } from "../models/song.model.js";
import { Album } from "../models/album.model.js";
import { Playlist } from "../models/playlist.model.js";
import cloudinary from "../lib/cloudinary.js";

// helper function for cloudinary uploads
const uploadToCloudinary = async (file) => {
	try {
		const result = await cloudinary.uploader.upload(file.tempFilePath, {
			resource_type: "auto",
		});
		return result.secure_url;
	} catch (error) {
		console.log("Error in uploadToCloudinary", error);
		throw new Error("Error uploading to cloudinary");
	}
};

export const createSong = async (req, res, next) => {
	try {
		if (!req.files || !req.files.audioFile || !req.files.imageFile) {
			return res.status(400).json({ message: "Please upload all files" });
		}

		const { title, artist, albumId, duration } = req.body;
		const audioFile = req.files.audioFile;
		const imageFile = req.files.imageFile;

		const audioUrl = await uploadToCloudinary(audioFile);
		const imageUrl = await uploadToCloudinary(imageFile);

		const song = new Song({
			title,
			artist,
			audioUrl,
			imageUrl,
			duration,
			albumId: albumId || null,
		});

		await song.save();

		// if song belongs to an album, update the album's songs array
		if (albumId) {
			await Album.findByIdAndUpdate(albumId, {
				$push: { songs: song._id },
			});
		}
		res.status(201).json(song);
	} catch (error) {
		console.log("Error in createSong", error);
		next(error);
	}
};

export const deleteSong = async (req, res, next) => {
	try {
		const { id } = req.params;

		const song = await Song.findById(id);

		// if song belongs to an album, update the album's songs array
		if (song.albumId) {
			await Album.findByIdAndUpdate(song.albumId, {
				$pull: { songs: song._id },
			});
		}

		await Song.findByIdAndDelete(id);

		res.status(200).json({ message: "Song deleted successfully" });
	} catch (error) {
		console.log("Error in deleteSong", error);
		next(error);
	}
};

export const createAlbum = async (req, res, next) => {
	try {
		const { title, artist, releaseYear } = req.body;
		const { imageFile } = req.files;

		const imageUrl = await uploadToCloudinary(imageFile);

		const album = new Album({
			title,
			artist,
			imageUrl,
			releaseYear,
		});

		await album.save();

		res.status(201).json(album);
	} catch (error) {
		console.log("Error in createAlbum", error);
		next(error);
	}
};

export const deleteAlbum = async (req, res, next) => {
	try {
		const { id } = req.params;
		await Song.deleteMany({ albumId: id });
		await Album.findByIdAndDelete(id);
		res.status(200).json({ message: "Album deleted successfully" });
	} catch (error) {
		console.log("Error in deleteAlbum", error);
		next(error);
	}
};

export const checkAdmin = async (req, res, next) => {
	res.status(200).json({ admin: true });
};

/**
 * Get all public playlists for admin management
 */
export const getAllPublicPlaylists = async (req, res, next) => {
	try {
		// Find all public playlists and populate creator info
		const playlists = await Playlist.find({ isPublic: true })
			.populate('createdBy', 'fullName email')
			.populate('songs', 'title artist imageUrl duration')
			.sort({ updatedAt: -1 });

		res.status(200).json({
			success: true,
			count: playlists.length,
			data: playlists
		});
	} catch (error) {
		console.log("Error in getAllPublicPlaylists", error);
		next(error);
	}
};

/**
 * Update a playlist's details (admin only)
 */
export const updatePlaylist = async (req, res, next) => {
	try {
		const { id } = req.params;
		const { name, description, isPublic, imageUrl } = req.body;
		let uploadedImageUrl = imageUrl;

		// Find the playlist
		const playlist = await Playlist.findById(id);
		if (!playlist) {
			return res.status(404).json({
				success: false,
				message: "Playlist not found"
			});
		}

		// Check if there's an image file in the request
		if (req.files && req.files.image) {
			const imageFile = req.files.image;
			
			// Validate file type
			if (!imageFile.mimetype.startsWith('image/')) {
				return res.status(400).json({
					success: false,
					message: "Please upload an image file"
				});
			}
			
			// Validate file size (max 5MB)
			const maxSize = 5 * 1024 * 1024; // 5MB
			if (imageFile.size > maxSize) {
				return res.status(400).json({
					success: false,
					message: "Image size should be less than 5MB"
				});
			}

			// Upload to Cloudinary
			const result = await cloudinary.uploader.upload(imageFile.tempFilePath, {
				resource_type: "image",
				folder: "playlists",
				transformation: [
					{ width: 500, height: 500, crop: "limit" },
					{ quality: "auto" }
				]
			});
			
			uploadedImageUrl = result.secure_url;
		}

		// Update the playlist
		const updatedPlaylist = await Playlist.findByIdAndUpdate(
			id,
			{
				name: name || playlist.name,
				description: description !== undefined ? description : playlist.description,
				isPublic: isPublic !== undefined ? isPublic : playlist.isPublic,
				imageUrl: uploadedImageUrl || playlist.imageUrl
			},
			{ new: true }
		).populate('createdBy', 'fullName email')
		 .populate('songs', 'title artist imageUrl duration');

		res.status(200).json({
			success: true,
			data: updatedPlaylist
		});
	} catch (error) {
		console.log("Error in updatePlaylist", error);
		next(error);
	}
};

/**
 * Delete a playlist (admin only)
 */
export const deletePlaylist = async (req, res, next) => {
	try {
		const { id } = req.params;

		// Find and delete the playlist
		const deletedPlaylist = await Playlist.findByIdAndDelete(id);
		
		if (!deletedPlaylist) {
			return res.status(404).json({
				success: false,
				message: "Playlist not found"
			});
		}

		res.status(200).json({
			success: true,
			message: "Playlist deleted successfully",
			data: deletedPlaylist
		});
	} catch (error) {
		console.log("Error in deletePlaylist", error);
		next(error);
	}
};

/**
 * Feature or unfeature a playlist (admin only)
 */
export const featurePlaylist = async (req, res, next) => {
	try {
		const { id } = req.params;
		const { featured } = req.body;

		if (featured === undefined) {
			return res.status(400).json({
				success: false,
				message: "Featured status is required"
			});
		}

		// Find the playlist
		const playlist = await Playlist.findById(id);
		if (!playlist) {
			return res.status(404).json({
				success: false,
				message: "Playlist not found"
			});
		}

		// Update the featured status
		const updatedPlaylist = await Playlist.findByIdAndUpdate(
			id,
			{ featured },
			{ new: true }
		).populate('createdBy', 'fullName email')
		 .populate('songs', 'title artist imageUrl duration');

		res.status(200).json({
			success: true,
			data: updatedPlaylist
		});
	} catch (error) {
		console.log("Error in featurePlaylist", error);
		next(error);
	}
};

/**
 * Upload an image to Cloudinary
 * @route POST /api/admin/upload/image
 * @access Private (Admin only)
 */
export const uploadImage = async (req, res, next) => {
	try {
		// Check if file exists in the request
		if (!req.files || !req.files.image) {
			return res.status(400).json({
				success: false,
				message: "No image file uploaded"
			});
		}

		const imageFile = req.files.image;
		
		// Validate file type
		if (!imageFile.mimetype.startsWith('image/')) {
			return res.status(400).json({
				success: false,
				message: "Please upload an image file"
			});
		}
		
		// Validate file size (max 5MB)
		const maxSize = 5 * 1024 * 1024; // 5MB
		if (imageFile.size > maxSize) {
			return res.status(400).json({
				success: false,
				message: "Image size should be less than 5MB"
			});
		}

		// Upload to Cloudinary
		const result = await cloudinary.uploader.upload(imageFile.tempFilePath, {
			resource_type: "image",
			folder: "playlists",
			transformation: [
				{ width: 500, height: 500, crop: "limit" },
				{ quality: "auto" }
			]
		});

		// Return success response with image URL
		res.status(200).json({
			success: true,
			imageUrl: result.secure_url,
			public_id: result.public_id
		});
	} catch (error) {
		console.log("Error in uploadImage:", error);
		next(error);
	}
};
