import { Router } from "express";
import { 
  getLikedSongs, 
  addLikedSong, 
  removeLikedSong, 
  isSongLiked,
  syncLikedSongs
} from "../controllers/likedSong.controller.js";
import { firebaseAuth } from "../middleware/firebase-auth.middleware.js";

const router = Router();

// Get all liked songs for the current user (requires auth)
router.get("/", firebaseAuth, getLikedSongs);

// Check if a song is liked (requires auth)
router.get("/check/:songId", firebaseAuth, isSongLiked);

// Add a song to liked songs (requires auth)
router.post("/", firebaseAuth, addLikedSong);

// Remove a song from liked songs (requires auth)
router.delete("/:songId", firebaseAuth, removeLikedSong);

// Sync liked songs between local storage and server (requires auth)
router.post("/sync", firebaseAuth, syncLikedSongs);

export default router; 