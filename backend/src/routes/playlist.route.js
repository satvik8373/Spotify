import { Router } from "express";
import { 
  addSongToPlaylist, 
  createPlaylist, 
  deletePlaylist, 
  getAllPlaylists, 
  getPlaylistById, 
  getUserPlaylists, 
  removeSongFromPlaylist, 
  toggleFeatured, 
  updatePlaylist,
  autoPopulatePlaylist,
  bulkAddSongsToPlaylist,
  importJioSaavnPlaylist,
  autoPopulateFromJioSaavn,
  getJioSaavnPlaylistsByCategory,
  searchJioSaavnPlaylists
} from "../controllers/playlist.controller.js";
import { firebaseAuth, optionalFirebaseAuth } from "../middleware/firebase-auth.middleware.js";
import { createShareLink, getSharedPlaylist } from "../services/moodPlaylist/shareHandler.js";

const router = Router();

// Get all playlists (public or featured) - no authentication required
router.get('/', getAllPlaylists);

// Search JioSaavn playlists (web only)
router.get('/jiosaavn/search', searchJioSaavnPlaylists);

// Get JioSaavn playlists by category (web only)
router.get('/jiosaavn/category', getJioSaavnPlaylistsByCategory);

// Get current user's playlists
router.get('/user', optionalFirebaseAuth, getUserPlaylists);

// Get playlists for a specific user
router.get('/user/:userId', optionalFirebaseAuth, getUserPlaylists);

// Get a single playlist by ID
router.get('/:id', optionalFirebaseAuth, getPlaylistById);

// Create a new playlist
router.post('/', firebaseAuth, createPlaylist);

// Import JioSaavn playlist (web only)
router.post('/import/jiosaavn', firebaseAuth, importJioSaavnPlaylist);

// Update a playlist
router.put('/:id', firebaseAuth, updatePlaylist);

// Delete a playlist
router.delete('/:id', firebaseAuth, deletePlaylist);

// Add a song to a playlist
router.post('/:id/songs', firebaseAuth, addSongToPlaylist);

// Bulk add songs to playlist with rate limit handling
router.post('/:id/songs/bulk', firebaseAuth, bulkAddSongsToPlaylist);

// Auto-populate playlist based on category and title
router.post('/:id/auto-populate', firebaseAuth, autoPopulatePlaylist);

// Auto-populate playlist from JioSaavn (web only)
router.post('/:id/auto-populate/jiosaavn', firebaseAuth, autoPopulateFromJioSaavn);

// Remove a song from a playlist
router.delete('/:id/songs', firebaseAuth, removeSongFromPlaylist);

// Toggle featured status (admin only)
router.patch('/:id/featured', firebaseAuth, toggleFeatured);

// Share playlist - Create shareable link (authenticated)
// POST /api/playlists/:id/share
// Requirements: 10.1, 10.3, 10.4, 10.5
router.post('/:id/share', firebaseAuth, async (req, res) => {
  try {
    const playlistId = req.params.id;
    const userId = req.auth.uid;
    
    // Call share handler service
    const result = await createShareLink(playlistId, userId);
    
    if (!result.success) {
      // Determine appropriate status code based on error type
      let statusCode = 500;
      if (result.error === 'Playlist not found') {
        statusCode = 404;
      } else if (result.error === 'Permission denied') {
        statusCode = 403;
      }
      
      return res.status(statusCode).json({
        success: false,
        error: result.error,
        message: result.message,
      });
    }
    
    // Return success response with share URL and ID
    return res.status(200).json({
      success: true,
      shareUrl: result.shareUrl,
      shareId: result.shareId,
      message: result.message,
    });
  } catch (error) {
    console.error('Error in share playlist endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Something went wrong. Please try again.',
    });
  }
});

// Access shared playlist - Public endpoint (no authentication required)
// GET /api/playlists/share/:shareId
// Requirements: 10.4, 10.5
router.get('/share/:shareId', async (req, res) => {
  try {
    const shareId = req.params.shareId;
    
    // Call share handler service
    const result = await getSharedPlaylist(shareId);
    
    if (!result.success) {
      // Determine appropriate status code based on error type
      let statusCode = 500;
      if (result.error === 'Share not found') {
        statusCode = 404;
      } else if (result.error === 'Playlist not found') {
        statusCode = 404;
      } else if (result.error === 'Playlist not public') {
        statusCode = 403;
      }
      
      return res.status(statusCode).json({
        success: false,
        error: result.error,
        message: result.message,
      });
    }
    
    // Return success response with playlist data
    return res.status(200).json({
      success: true,
      playlist: result.playlist,
      shareInfo: result.shareInfo,
    });
  } catch (error) {
    console.error('Error in get shared playlist endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Unable to load the shared playlist. Please try again.',
    });
  }
});

export default router; 