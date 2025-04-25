import { Router } from "express";
import { clerkMiddleware } from "@clerk/express";
import { addSongToPlaylist, createPlaylist, deletePlaylist, getAllPlaylists, getPlaylistById, getUserPlaylists, removeSongFromPlaylist, toggleFeatured, updatePlaylist } from "../controllers/playlist.controller.js";
import { protectRoute, requireAdmin } from "../middleware/auth.middleware.js";

const router = Router();

// Get all playlists (public or featured) - no authentication required
router.get('/', getAllPlaylists);

// Get current user's playlists
router.get('/user', clerkMiddleware(), getUserPlaylists);

// Get playlists for a specific user
router.get('/user/:userId', clerkMiddleware(), getUserPlaylists);

// Get a single playlist by ID
router.get('/:id', clerkMiddleware(), getPlaylistById);

// Create a new playlist
router.post('/', clerkMiddleware(), createPlaylist);

// Update a playlist
router.put('/:id', clerkMiddleware(), updatePlaylist);

// Delete a playlist
router.delete('/:id', clerkMiddleware(), deletePlaylist);

// Add a song to a playlist
router.post('/:id/songs', clerkMiddleware(), addSongToPlaylist);

// Remove a song from a playlist
router.delete('/:id/songs', clerkMiddleware(), removeSongFromPlaylist);

// Toggle featured status (admin only)
router.patch('/:id/featured', clerkMiddleware(), toggleFeatured);

export default router; 