import { Router } from "express";
import * as spotifyService from "../services/spotify.service.js";
import { storeSpotifyTokens } from '../services/spotifyTokenService.js';
import { syncSpotifyLikedSongs, getSyncedLikedSongs, getSyncStatus } from '../services/spotifySyncService.js';

// Spotify API configuration
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

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
    const tokenData = await spotifyService.getAccessToken(CLIENT_ID, CLIENT_SECRET, code);
    
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

// POST route for frontend callback handling
router.post("/callback", async (req, res) => {
  const { code, redirect_uri, userId } = req.body;
  
  console.log("=== Spotify Callback Debug ===");
  console.log("Spotify callback received:", { 
    code: code ? 'present' : 'missing', 
    redirect_uri, 
    userId 
  });
  console.log("Using CLIENT_ID:", CLIENT_ID ? 'present' : 'missing');
  console.log("Using CLIENT_SECRET:", CLIENT_SECRET ? 'present' : 'missing');
  
  if (!code) {
    console.error("❌ Missing authorization code");
    return res.status(400).json({ 
      message: "Authorization code is required",
      error: "MISSING_CODE"
    });
  }
  
  if (!userId) {
    console.error("❌ Missing user ID");
    return res.status(400).json({ 
      message: "User ID is required",
      error: "MISSING_USER_ID"
    });
  }
  
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error("❌ Missing Spotify credentials");
    console.error("CLIENT_ID present:", !!CLIENT_ID);
    console.error("CLIENT_SECRET present:", !!CLIENT_SECRET);
    return res.status(500).json({ 
      message: "Spotify credentials not configured",
      error: "MISSING_CREDENTIALS"
    });
  }
  
  try {
    console.log("🔄 Exchanging code for tokens...");
    const tokenData = await spotifyService.getAccessToken(CLIENT_ID, CLIENT_SECRET, code);
    console.log("✅ Tokens received successfully");
    
    // Store tokens in Firestore
    console.log("🔄 Storing tokens in Firestore...");
    await storeSpotifyTokens(userId, tokenData);
    console.log("✅ Tokens stored in Firestore");
    
    // Perform initial sync
    try {
      console.log("🔄 Starting initial sync...");
      await syncSpotifyLikedSongs(userId);
      console.log("✅ Initial sync completed");
    } catch (syncError) {
      console.error("⚠️ Initial sync failed:", syncError);
      // Don't fail the auth if sync fails
    }
    
    console.log("=== Callback Success ===");
    res.json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
      synced: true
    });
  } catch (error) {
    console.error("❌ Spotify callback error:");
    console.error("Error details:", error.response?.data || error.message);
    console.error("Error status:", error.response?.status);
    console.error("Error stack:", error.stack);
    
    let errorMessage = "Failed to authenticate with Spotify";
    let errorCode = "AUTH_FAILED";
    
    if (error.response?.status === 400) {
      errorMessage = "Invalid authorization code or redirect URI mismatch";
      errorCode = "INVALID_CODE";
    } else if (error.response?.status === 401) {
      errorMessage = "Spotify credentials are invalid";
      errorCode = "INVALID_CREDENTIALS";
    } else if (error.response?.status === 403) {
      errorMessage = "Access denied by Spotify";
      errorCode = "ACCESS_DENIED";
    }
    
    res.status(500).json({ 
      message: errorMessage,
      error: errorCode,
      details: error.response?.data || error.message
    });
  }
});

// Manual sync endpoint
router.post("/sync", async (req, res) => {
  const { userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }
  
  try {
    const result = await syncSpotifyLikedSongs(userId);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Manual sync error:", error);
    res.status(500).json({ 
      message: "Sync failed",
      error: error.message
    });
  }
});

// Get synced liked songs
router.get("/liked-songs/:userId", async (req, res) => {
  const { userId } = req.params;
  
  try {
    const songs = await getSyncedLikedSongs(userId);
    res.json(songs);
  } catch (error) {
    console.error("Error getting liked songs:", error);
    res.status(500).json({ 
      message: "Failed to get liked songs",
      error: error.message
    });
  }
});

// Get sync status
router.get("/sync-status/:userId", async (req, res) => {
  const { userId } = req.params;
  
  try {
    const status = await getSyncStatus(userId);
    res.json(status);
  } catch (error) {
    console.error("Error getting sync status:", error);
    res.status(500).json({ 
      message: "Failed to get sync status",
      error: error.message
    });
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