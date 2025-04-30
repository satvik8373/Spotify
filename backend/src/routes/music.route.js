import { Router } from "express";
import axios from "axios";
import * as jiosaavnService from "../services/jiosaavn.service.js";
import * as spotifyService from "../services/spotify.service.js";
import { 
  getTrendingSongs, 
  searchSongs, 
  getBollywoodSongs, 
  getHollywoodSongs, 
  getHindiSongs,
  getSongDetails,
  getAlbumDetails
} from "../controllers/music.controller.js";

const router = Router();

// Constants
const JIOSAAVN_API_BASE_URL = process.env.JIOSAAVN_API_BASE_URL || "https://saavn.dev/api";

// Get music from Spotify
router.get("/spotify/featured", async (req, res) => {
  try {
    const featuredPlaylists = await spotifyService.getFeaturedPlaylists();
    res.json(featuredPlaylists);
  } catch (error) {
    console.error("Error fetching featured playlists:", error);
    res.status(500).json({ message: "Failed to fetch featured playlists" });
  }
});

// Get new releases from Spotify
router.get("/spotify/new-releases", async (req, res) => {
  try {
    const newReleases = await spotifyService.getNewReleases();
    res.json(newReleases);
  } catch (error) {
    console.error("Error fetching new releases:", error);
    res.status(500).json({ message: "Failed to fetch new releases" });
  }
});

// Proxy endpoint for JioSaavn search
router.get("/search", searchSongs);

// Get trending songs from both platforms
router.get("/combined/trending", async (req, res) => {
  try {
    // In a real app, we might want to get from both sources and combine
    const jiosaavnTrending = await jiosaavnService.getTrendingSongs();
    const spotifyTrending = await spotifyService.getTopTracks();
    
    res.json({
      jiosaavn: jiosaavnTrending,
      spotify: spotifyTrending
    });
  } catch (error) {
    console.error("Error fetching combined trending:", error);
    res.status(500).json({ message: "Failed to fetch combined trending songs" });
  }
});

// Get Bollywood songs
router.get("/bollywood", getBollywoodSongs);

// Get Hollywood songs
router.get("/hollywood", getHollywoodSongs);

// Get Hindi songs
router.get("/hindi", getHindiSongs);

// Get song details
router.get("/songs/:id", getSongDetails);

// Get album details
router.get("/albums/:id", getAlbumDetails);

// Get song details from both platforms (if available)
router.get("/combined/songs/:id", async (req, res) => {
  try {
    const { id, platform = "jiosaavn" } = req.params;
    
    if (platform === "jiosaavn") {
      const songDetails = await jiosaavnService.getSongDetails(id);
      res.json(songDetails);
    } else if (platform === "spotify") {
      const trackDetails = await spotifyService.getTrack(id);
      res.json(trackDetails);
    } else {
      res.status(400).json({ message: "Invalid platform specified" });
    }
  } catch (error) {
    console.error("Error fetching song details:", error);
    res.status(500).json({ message: "Failed to fetch song details" });
  }
});

// Proxy endpoint for lyrics
router.get("/lyrics/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ message: "Song ID is required" });
    }
    
    const response = await axios.get(`${JIOSAAVN_API_BASE_URL}/lyrics?id=${id}`);
    
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching lyrics:", error);
    res.status(500).json({ message: "Failed to fetch lyrics" });
  }
});

// Get trending songs (main endpoint)
router.get("/trending", getTrendingSongs);

export default router; 