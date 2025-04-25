import { Router } from "express";
import { getAllSongs, getFeaturedSongs, getMadeForYouSongs, getTrendingSongs } from "../controllers/song.controller.js";
import { protectRoute, requireAdmin } from "../middleware/auth.middleware.js";
import { Song } from "../models/song.model.js";

const router = Router();

router.get("/", protectRoute, requireAdmin, getAllSongs);
router.get("/featured", getFeaturedSongs);
router.get("/made-for-you", getMadeForYouSongs);
router.get("/trending", getTrendingSongs);

// Get all songs
router.get("/all", async (req, res) => {
  try {
    const songs = await Song.find().populate("albumId");
    res.json(songs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a song from external source (JioSaavn, etc.)
router.post("/external", protectRoute, async (req, res) => {
  try {
    const { title, artist, imageUrl, audioUrl, duration } = req.body;
    
    // Validate required fields
    if (!title || !artist || !imageUrl || !audioUrl) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    
    // Create a new song
    const song = new Song({
      title,
      artist,
      imageUrl,
      audioUrl,
      duration: duration || 0,
      albumId: null // External songs might not have an album
    });
    
    await song.save();
    res.status(201).json(song);
  } catch (error) {
    console.error("Error creating external song:", error);
    res.status(500).json({ message: "Failed to create song", error: error.message });
  }
});

export default router;
