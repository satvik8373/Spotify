import Playlist from '../models/playlist.model.js';
import { Song } from '../models/song.model.js';
import { User } from '../models/user.model.js';

// Create a new playlist
export const createPlaylist = async (req, res) => {
  try {
    const { name, description, isPublic } = req.body;
    const userId = req.auth.userId;

    // Get user by clerkId
    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const playlist = new Playlist({
      name,
      description,
      createdBy: user._id,
      isPublic: isPublic !== undefined ? isPublic : true,
    });

    await playlist.save();
    res.status(201).json(playlist);
  } catch (error) {
    res.status(500).json({ message: 'Error creating playlist', error: error.message });
  }
};

// Get all playlists (with filters for public/private)
export const getAllPlaylists = async (req, res) => {
  try {
    const { featured, public: isPublic } = req.query;
    const query = {};
    
    if (featured === 'true') {
      query.featured = true;
    }
    
    if (isPublic === 'true') {
      query.isPublic = true;
    }

    const playlists = await Playlist.find(query)
      .populate('createdBy', 'fullName imageUrl')
      .populate('songs')
      .sort({ createdAt: -1 });
    
    res.status(200).json(playlists);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving playlists', error: error.message });
  }
};

// Get user's playlists
export const getUserPlaylists = async (req, res) => {
  try {
    // Log authentication info for debugging
    console.log('Auth info:', {
      userId: req.auth?.userId || 'Not provided',
      paramUserId: req.params?.userId || 'Not provided',
      hasAuth: !!req.auth,
      headers: {
        authorization: !!req.headers.authorization,
        cookie: !!req.headers.cookie
      }
    });
    
    // Check if authentication is present
    if (!req.auth || !req.auth.userId) {
      return res.status(401).json({ 
        message: 'Authentication required', 
        error: 'No user ID found in request', 
        authPresent: !!req.auth 
      });
    }
    
    const clerkId = req.params.userId || req.auth.userId;
    
    // Get user by clerkId
    const user = await User.findOne({ clerkId });
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found', 
        clerkId: clerkId,
        authUserId: req.auth.userId
      });
    }
    
    const playlists = await Playlist.find({ createdBy: user._id })
      .populate('createdBy', 'fullName imageUrl')
      .populate('songs')
      .sort({ createdAt: -1 });
    
    res.status(200).json(playlists);
  } catch (error) {
    console.error('Error in getUserPlaylists:', error.message);
    res.status(500).json({ 
      message: 'Error retrieving user playlists', 
      error: error.message,
      authInfo: {
        hasAuth: !!req.auth,
        userId: req.auth?.userId || 'Not available'
      }
    });
  }
};

// Get a single playlist by ID
export const getPlaylistById = async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id)
      .populate('createdBy', 'fullName imageUrl clerkId')
      .populate('songs');
    
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }

    // Check if playlist is private and not owned by requestor
    if (!playlist.isPublic && playlist.createdBy.clerkId !== req.auth.userId) {
      return res.status(403).json({ message: 'You do not have permission to view this playlist' });
    }
    
    res.status(200).json(playlist);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving playlist', error: error.message });
  }
};

// Update a playlist
export const updatePlaylist = async (req, res) => {
  try {
    const { name, description, isPublic, featured, imageUrl } = req.body;
    const playlistId = req.params.id;
    
    const playlist = await Playlist.findById(playlistId).populate('createdBy', 'clerkId');
    
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }
    
    // Check if user is the owner of the playlist
    if (playlist.createdBy.clerkId !== req.auth.userId) {
      return res.status(403).json({ message: 'You do not have permission to update this playlist' });
    }
    
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
      playlistId,
      { 
        name: name || playlist.name,
        description: description !== undefined ? description : playlist.description,
        isPublic: isPublic !== undefined ? isPublic : playlist.isPublic,
        featured: featured !== undefined ? featured : playlist.featured,
        imageUrl: imageUrl || playlist.imageUrl
      },
      { new: true }
    ).populate('createdBy', 'fullName imageUrl').populate('songs');
    
    res.status(200).json(updatedPlaylist);
  } catch (error) {
    res.status(500).json({ message: 'Error updating playlist', error: error.message });
  }
};

// Add a song to a playlist
export const addSongToPlaylist = async (req, res) => {
  try {
    const { songId } = req.body;
    const playlistId = req.params.id;
    
    // Check if playlist exists
    const playlist = await Playlist.findById(playlistId).populate('createdBy', 'clerkId');
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }
    
    // Check if user is the owner of the playlist
    if (playlist.createdBy.clerkId !== req.auth.userId) {
      return res.status(403).json({ message: 'You do not have permission to modify this playlist' });
    }
    
    // Check if song exists
    const song = await Song.findById(songId);
    if (!song) {
      return res.status(404).json({ message: 'Song not found' });
    }
    
    // Check if song is already in the playlist
    if (playlist.songs.includes(songId)) {
      return res.status(400).json({ message: 'Song already in playlist' });
    }
    
    // Add song to playlist
    playlist.songs.push(songId);
    await playlist.save();
    
    const updatedPlaylist = await Playlist.findById(playlistId)
      .populate('createdBy', 'fullName imageUrl')
      .populate('songs');
    
    res.status(200).json(updatedPlaylist);
  } catch (error) {
    res.status(500).json({ message: 'Error adding song to playlist', error: error.message });
  }
};

// Remove a song from a playlist
export const removeSongFromPlaylist = async (req, res) => {
  try {
    const { songId } = req.body;
    const playlistId = req.params.id;
    
    // Check if playlist exists
    const playlist = await Playlist.findById(playlistId).populate('createdBy', 'clerkId');
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }
    
    // Check if user is the owner of the playlist
    if (playlist.createdBy.clerkId !== req.auth.userId) {
      return res.status(403).json({ message: 'You do not have permission to modify this playlist' });
    }
    
    // Remove song from playlist
    playlist.songs = playlist.songs.filter(id => id.toString() !== songId);
    await playlist.save();
    
    const updatedPlaylist = await Playlist.findById(playlistId)
      .populate('createdBy', 'fullName imageUrl')
      .populate('songs');
    
    res.status(200).json(updatedPlaylist);
  } catch (error) {
    res.status(500).json({ message: 'Error removing song from playlist', error: error.message });
  }
};

// Delete a playlist
export const deletePlaylist = async (req, res) => {
  try {
    const playlistId = req.params.id;
    
    // Check if playlist exists
    const playlist = await Playlist.findById(playlistId).populate('createdBy', 'clerkId');
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }
    
    // Check if user is the owner of the playlist
    if (playlist.createdBy.clerkId !== req.auth.userId) {
      return res.status(403).json({ message: 'You do not have permission to delete this playlist' });
    }
    
    await Playlist.findByIdAndDelete(playlistId);
    
    res.status(200).json({ message: 'Playlist deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting playlist', error: error.message });
  }
};

// Toggle featured status (admin only)
export const toggleFeatured = async (req, res) => {
  try {
    const playlistId = req.params.id;
    
    // Check if playlist exists
    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }
    
    // Toggle featured status
    playlist.featured = !playlist.featured;
    await playlist.save();
    
    res.status(200).json({ featured: playlist.featured });
  } catch (error) {
    res.status(500).json({ message: 'Error toggling featured status', error: error.message });
  }
}; 