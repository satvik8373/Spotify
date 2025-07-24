import { Router } from "express";
import { getAllSongs, getFeaturedSongs, getMadeForYouSongs, getTrendingSongs } from "../controllers/song.controller.js";
import { protectRoute, requireAdmin } from "../middleware/auth.middleware.js";
import fetch from 'node-fetch';

const router = Router();

router.get("/", protectRoute, requireAdmin, getAllSongs);
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

// Get a single song by ID for sharing
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Try to fetch from JioSaavn API first
    try {
      const response = await fetch(`https://saavn.dev/api/songs/${id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.data && data.data.length > 0) {
          const songData = data.data[0];
          const formattedSong = {
            _id: songData.id,
            title: songData.name,
            artist: songData.primaryArtists,
            albumId: null,
            imageUrl: songData.image?.[2]?.url || '',
            audioUrl: songData.downloadUrl?.[4]?.url || '',
            duration: parseInt(songData.duration || '0'),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          return res.json(formattedSong);
        }
      }
    } catch (error) {
      console.error('Error fetching from JioSaavn:', error);
    }
    
    // Firebase version would go here as fallback
    res.status(404).json({ message: "Song not found" });
  } catch (error) {
    console.error("Error fetching song:", error);
    res.status(500).json({ message: "Failed to fetch song", error: error.message });
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
