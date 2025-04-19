import { Router } from "express";
import axios from "axios";

const router = Router();

// Test endpoint
router.get("/test", (req, res) => {
  res.json({ message: "Music API is working!" });
});

// Base URL for JioSaavn API
const JIOSAAVN_API_BASE_URL = "https://saavn.dev/api";

// Proxy endpoint for search
router.get("/search", async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: "Query parameter is required" });
    }
    
    const response = await axios.get(`${JIOSAAVN_API_BASE_URL}/search/songs?query=${encodeURIComponent(query)}&page=1&limit=20`);
    
    res.json(response.data);
  } catch (error) {
    console.error("Error searching songs:", error);
    res.status(500).json({ message: "Failed to search songs" });
  }
});

// Proxy endpoint for bollywood songs
router.get("/bollywood", async (req, res) => {
  try {
    const response = await axios.get(`${JIOSAAVN_API_BASE_URL}/search/songs?query=bollywood%20hits&page=1&limit=15`);
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching bollywood songs:", error);
    res.status(500).json({ message: "Failed to fetch bollywood songs" });
  }
});

// Proxy endpoint for hollywood/english songs
router.get("/hollywood", async (req, res) => {
  try {
    const response = await axios.get(`${JIOSAAVN_API_BASE_URL}/search/songs?query=english%20top%20hits&page=1&limit=15`);
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching hollywood songs:", error);
    res.status(500).json({ message: "Failed to fetch hollywood songs" });
  }
});

// Proxy endpoint for official trending songs
router.get("/trending", async (req, res) => {
  try {
    const response = await axios.get(`${JIOSAAVN_API_BASE_URL}/search/songs?query=trending%20songs&page=1&limit=15`);
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching trending songs:", error);
    res.status(500).json({ message: "Failed to fetch trending songs" });
  }
});

// Proxy endpoint for trending Hindi songs
router.get("/hindi", async (req, res) => {
  try {
    const response = await axios.get(`${JIOSAAVN_API_BASE_URL}/search/songs?query=hindi%20top%20songs&page=1&limit=15`);
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching hindi songs:", error);
    res.status(500).json({ message: "Failed to fetch hindi songs" });
  }
});

// Proxy endpoint for song details
router.get("/songs/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ message: "Song ID is required" });
    }
    
    const response = await axios.get(`${JIOSAAVN_API_BASE_URL}/songs?id=${id}`);
    
    res.json(response.data);
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

// Proxy endpoint for albums
router.get("/albums/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ message: "Album ID is required" });
    }
    
    const response = await axios.get(`${JIOSAAVN_API_BASE_URL}/albums?id=${id}`);
    
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching album details:", error);
    res.status(500).json({ message: "Failed to fetch album details" });
  }
});

export default router; 