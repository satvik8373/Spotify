import express from "express";
import { getLikedSongs, addLikedSong, removeLikedSong, isSongLiked, syncLikedSongs } from "../controllers/likedSong.controller.js";

const router = express.Router();

// GET /api/liked-songs - Get all liked songs for the authenticated user
router.get("/", getLikedSongs);

// POST /api/liked-songs - Add a song to liked songs
router.post("/", addLikedSong);

// DELETE /api/liked-songs/:songId - Remove a song from liked songs
router.delete("/:songId", removeLikedSong);

// GET /api/liked-songs/check/:songId - Check if a song is liked
router.get("/check/:songId", isSongLiked);

// POST /api/liked-songs/sync - Sync local liked songs with server
router.post("/sync", syncLikedSongs);

export default router; 