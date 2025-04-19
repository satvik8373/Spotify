import { Router } from "express";
import * as spotifyService from "../services/spotify.service.js";

const router = Router();

// Route to initiate Spotify login
router.get("/login", (req, res) => {
  const authUrl = spotifyService.getAuthorizationUrl();
  res.json({ authUrl });
});

// Route to handle Spotify callback
router.get("/callback", async (req, res) => {
  const { code, state } = req.query;
  
  if (!code) {
    return res.status(400).json({ message: "Authorization code is required" });
  }
  
  try {
    const tokenData = await spotifyService.getAccessToken(code);
    
    // In a real app, you would associate this token with the user
    // and store it securely (e.g., in a database)
    
    // For this example, we'll return the tokens directly
    // In production, you would set cookies or send tokens to your frontend
    res.json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in
    });
  } catch (error) {
    console.error("Spotify callback error:", error);
    res.status(500).json({ message: "Failed to authenticate with Spotify" });
  }
});

// Route to refresh token
router.post("/refresh-token", async (req, res) => {
  const { refresh_token } = req.body;
  
  if (!refresh_token) {
    return res.status(400).json({ message: "Refresh token is required" });
  }
  
  try {
    const tokenData = await spotifyService.refreshAccessToken(refresh_token);
    res.json({
      access_token: tokenData.access_token,
      expires_in: tokenData.expires_in
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(500).json({ message: "Failed to refresh token" });
  }
});

// Get current user's profile
router.get("/me", async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: "Valid Spotify access token is required" });
  }
  
  const accessToken = authHeader.split(' ')[1];
  
  try {
    const profile = await spotifyService.getUserProfile(accessToken);
    res.json(profile);
  } catch (error) {
    console.error("Error getting user profile:", error);
    res.status(500).json({ message: "Failed to fetch Spotify profile" });
  }
});

// Get user's playlists
router.get("/playlists", async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: "Valid Spotify access token is required" });
  }
  
  const accessToken = authHeader.split(' ')[1];
  
  try {
    const playlists = await spotifyService.getUserPlaylists(accessToken);
    res.json(playlists);
  } catch (error) {
    console.error("Error getting playlists:", error);
    res.status(500).json({ message: "Failed to fetch Spotify playlists" });
  }
});

// Get tracks from a playlist
router.get("/playlists/:playlistId/tracks", async (req, res) => {
  const { playlistId } = req.params;
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: "Valid Spotify access token is required" });
  }
  
  const accessToken = authHeader.split(' ')[1];
  
  try {
    const tracks = await spotifyService.getPlaylistTracks(accessToken, playlistId);
    res.json(tracks);
  } catch (error) {
    console.error("Error getting playlist tracks:", error);
    res.status(500).json({ message: "Failed to fetch playlist tracks" });
  }
});

// Search Spotify
router.get("/search", async (req, res) => {
  const { q, type, limit } = req.query;
  const authHeader = req.headers.authorization;
  
  if (!q) {
    return res.status(400).json({ message: "Search query is required" });
  }
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: "Valid Spotify access token is required" });
  }
  
  const accessToken = authHeader.split(' ')[1];
  
  try {
    const results = await spotifyService.search(accessToken, q, type, limit);
    res.json(results);
  } catch (error) {
    console.error("Error searching Spotify:", error);
    res.status(500).json({ message: "Failed to search Spotify" });
  }
});

export default router; 