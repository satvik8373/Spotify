import { Song } from "../models/song.model.js";
import { Album } from "../models/album.model.js";
import { Playlist } from "../models/playlist.model.js";
import cloudinary from "../lib/cloudinary.js";

// helper function for cloudinary uploads
const uploadToCloudinary = async (file) => {
	try {
		console.log("Uploading file to Cloudinary:", typeof file, file.path || file.tempFilePath || "direct path");
		
		let uploadOptions = {
			resource_type: "auto",
			folder: "spotify-clone",
			overwrite: true,
			quality: "auto:good",
			fetch_format: "auto"
		};
		
		// If a public_id is provided, add it to the options
		if (file.public_id) {
			uploadOptions.public_id = file.public_id;
		}
		
		// Handle both file objects from express-fileupload and file paths from multer
		let result;
		if (file.tempFilePath) {
			// express-fileupload style
			console.log("Uploading via tempFilePath:", file.tempFilePath);
			result = await cloudinary.uploader.upload(file.tempFilePath, uploadOptions);
		} else if (typeof file === 'string') {
			// Direct path string
			console.log("Uploading via direct path string:", file);
			result = await cloudinary.uploader.upload(file, uploadOptions);
		} else if (file.path) {
			// Multer style
			console.log("Uploading via multer path:", file.path);
			result = await cloudinary.uploader.upload(file.path, uploadOptions);
		} else {
			throw new Error("Invalid file format for upload: " + JSON.stringify(file));
		}
		
		console.log("Cloudinary upload successful, URL:", result.secure_url);
		return result.secure_url;
	} catch (error) {
		console.error("Error in uploadToCloudinary:", error);
		throw new Error(`Error uploading to cloudinary: ${error.message}`);
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

		// Find the playlist
		const playlist = await Playlist.findById(id);
		if (!playlist) {
			return res.status(404).json({
				success: false,
				message: "Playlist not found"
			});
		}

		// Update the playlist
		const updatedPlaylist = await Playlist.findByIdAndUpdate(
			id,
			{
				name: name || playlist.name,
				description: description !== undefined ? description : playlist.description,
				isPublic: isPublic !== undefined ? isPublic : playlist.isPublic,
				imageUrl: imageUrl || playlist.imageUrl
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
 * Update a playlist with image upload (admin only)
 */
export const updatePlaylistWithImage = async (req, res, next) => {
	try {
		console.log("updatePlaylistWithImage called with file:", req.file ? req.file.filename : "no file");
		const { id } = req.params;
		const { name, description, isPublic, featured } = req.body;
		
		// Find the playlist
		const playlist = await Playlist.findById(id);
		if (!playlist) {
			return res.status(404).json({
				success: false,
				message: "Playlist not found"
			});
		}
		
		// Upload image to Cloudinary if provided
		let imageUrl = playlist.imageUrl;
		if (req.file) {
			try {
				console.log("Processing file upload for playlist:", id);
				// Use the uploadToCloudinary function with the file path
				imageUrl = await uploadToCloudinary({
					path: req.file.path,
					public_id: `playlists/${id}_${Date.now()}`
				});
				
				// Delete the temporary file after upload
				try {
					const fs = await import('fs/promises');
					await fs.unlink(req.file.path);
					console.log("Temporary file deleted successfully:", req.file.path);
				} catch (unlinkError) {
					console.log("Warning: Could not delete temporary file:", req.file.path, unlinkError.message);
					// Non-fatal error, continue with the update
				}
			} catch (uploadError) {
				console.error("Error uploading image to Cloudinary:", uploadError);
				return res.status(500).json({
					success: false,
					message: `Failed to upload image: ${uploadError.message}`
				});
			}
		} else if (req.body.imageUrl === '') {
			// If imageUrl is explicitly set to empty string, remove the image
			console.log("Removing image for playlist:", id);
			imageUrl = '';
		}
		
		// Convert string boolean values to actual booleans
		const parsedIsPublic = isPublic === 'true' || isPublic === true;
		const parsedFeatured = featured === 'true' || featured === true;
		
		console.log("Updating playlist with data:", {
			id,
			name: name || playlist.name,
			description: description !== undefined ? description : playlist.description,
			isPublic: parsedIsPublic,
			featured: parsedFeatured,
			hasImage: !!imageUrl
		});
		
		// Update the playlist
		const updatedPlaylist = await Playlist.findByIdAndUpdate(
			id,
			{
				name: name || playlist.name,
				description: description !== undefined ? description : playlist.description,
				isPublic: parsedIsPublic,
				featured: parsedFeatured,
				imageUrl: imageUrl,
				updatedAt: new Date()
			},
			{ new: true }
		).populate('createdBy', 'fullName email')
		 .populate('songs', 'title artist imageUrl duration');

		console.log("Playlist updated successfully:", updatedPlaylist._id);
		
		res.status(200).json({
			success: true,
			data: updatedPlaylist
		});
	} catch (error) {
		console.log("Error in updatePlaylistWithImage", error);
		next(error);
	}
};
