import { Router } from "express";
import { 
  getLikedSongs, 
  addLikedSong, 
  removeLikedSong, 
  isSongLiked,
  syncLikedSongs
} from "../controllers/likedSong.controller.js";
import { firebaseAuth, optionalFirebaseAuth } from "../middleware/firebase-auth.middleware.js";

const router = Router();

// Get all liked songs for the current user
router.get("/", optionalFirebaseAuth, getLikedSongs);

// Check if a song is liked
router.get("/check/:songId", optionalFirebaseAuth, isSongLiked);

// Add a song to liked songs
router.post("/", optionalFirebaseAuth, addLikedSong);

// Remove a song from liked songs
router.delete("/:songId", optionalFirebaseAuth, removeLikedSong);

// Sync liked songs between local storage and server
router.post("/sync", optionalFirebaseAuth, syncLikedSongs);

export default router; 