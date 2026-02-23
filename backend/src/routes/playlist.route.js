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

export default router; 