import { Router } from "express";
import { getAllSongs, getFeaturedSongs, getMadeForYouSongs, getTrendingSongs } from "../controllers/song.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", protectRoute, getAllSongs);
router.get("/featured", getFeaturedSongs);
router.get("/made-for-you", getMadeForYouSongs);
router.get("/trending", getTrendingSongs);

// Get all songs
router.get("/all", async (req, res) => {
  try {
    // Firebase version would go here
    res.json({ message: "This endpoint now uses Firebase. Please use the frontend Firebase implementation." });
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
    
    // Firebase version would go here
    res.status(201).json({ 
      message: "This endpoint now uses Firebase. Please use the frontend Firebase implementation.",
      songData: { title, artist, imageUrl, audioUrl, duration }
    });
  } catch (error) {
    console.error("Error creating external song:", error);
    res.status(500).json({ message: "Failed to create song", error: error.message });
  }
});

export default router;
