import { Router } from "express";
import * as spotifyService from "../services/spotify.service.js";
import { storeSpotifyTokens, getSpotifyTokens } from '../services/spotifyTokenService.js';
import { syncSpotifyLikedSongs, getSyncedLikedSongs, getSyncStatus, migrateLikedSongsStructure } from '../services/spotifySyncService.js';
import admin from '../config/firebase.js';
import axios from 'axios';

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

// Route to handle real-time like/unlike operations
router.post("/like-unlike", async (req, res) => {
  const { userId, trackId, action } = req.body;
  
  console.log("=== Spotify Like/Unlike Debug ===");
  console.log("Request received:", { userId, trackId, action });
  
  if (!userId || !trackId || !action) {
    console.error("❌ Missing required parameters");
    return res.status(400).json({ 
      message: "User ID, track ID, and action are required",
      error: "MISSING_PARAMETERS"
    });
  }
  
  if (!['like', 'unlike'].includes(action)) {
    console.error("❌ Invalid action");
    return res.status(400).json({ 
      message: "Action must be 'like' or 'unlike'",
      error: "INVALID_ACTION"
    });
  }
  
  try {
    console.log(`🔄 Processing ${action} for track: ${trackId}`);
    const result = await handleSpotifyLikeUnlike(userId, trackId, action);
    console.log(`✅ ${action} completed successfully`);
    
    res.json({
      success: true,
      message: `Track ${action}d successfully`,
      data: result
    });
  } catch (error) {
    console.error(`❌ Error processing ${action}:`, error);
    res.status(500).json({ 
      message: `Failed to ${action} track`,
      error: error.message
    });
  }
});

// Route to delete all liked songs for a user
router.delete("/liked-songs/:userId", async (req, res) => {
  const { userId } = req.params;
  
  console.log("=== Delete All Liked Songs Debug ===");
  console.log("User ID:", userId);
  
  if (!userId) {
    console.error("❌ Missing user ID");
    return res.status(400).json({ 
      message: "User ID is required",
      error: "MISSING_USER_ID"
    });
  }
  
  try {
    console.log("🔄 Deleting all liked songs for user:", userId);
    
    // Get user's liked songs from Firestore (new nested structure)
    const likedSongsRef = admin.firestore().collection('users').doc(userId).collection('likedSongs');
    const likedSongsSnapshot = await likedSongsRef.get();
    
    if (likedSongsSnapshot.empty) {
      console.log("✅ No liked songs found to delete");
      return res.json({
        success: true,
        message: "No liked songs found to delete",
        deletedCount: 0
      });
    }
    
    // Get all track IDs to remove from Spotify
    const trackIds = [];
    likedSongsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.trackId) {
        trackIds.push(data.trackId);
      }
    });
    
    console.log(`Found ${trackIds.length} liked songs to delete`);
    
    // Remove from Spotify if user has valid tokens
    try {
      const tokens = await getSpotifyTokens(userId);
      if (tokens && tokens.access_token) {
        console.log("🔄 Removing songs from Spotify...");
        
        // Spotify API allows removing up to 50 tracks at once
        const batchSize = 50;
        for (let i = 0; i < trackIds.length; i += batchSize) {
          const batch = trackIds.slice(i, i + batchSize);
          
          await axios.delete('https://api.spotify.com/v1/me/tracks', {
            data: { ids: batch },
            headers: {
              'Authorization': `Bearer ${tokens.access_token}`,
              'Content-Type': 'application/json'
            }
          });
          
          console.log(`Removed batch ${Math.floor(i / batchSize) + 1} from Spotify`);
        }
        console.log("✅ All songs removed from Spotify");
      }
    } catch (spotifyError) {
      console.warn("⚠️ Warning: Could not remove songs from Spotify:", spotifyError.message);
      // Continue with Firestore deletion even if Spotify fails
    }
    
    // Delete all documents from Firestore (new nested structure)
    console.log("🔄 Deleting songs from Firestore...");
    const batch = admin.firestore().batch();
    likedSongsSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    console.log("✅ All songs deleted from Firestore");
    
    // Update sync metadata
    const syncMetadataRef = admin.firestore().collection('users').doc(userId).collection('spotifySync').doc('metadata');
    await syncMetadataRef.set({
      lastSyncAt: admin.firestore.FieldValue.serverTimestamp(),
      lastAction: 'delete_all',
      syncStatus: 'completed',
      totalSongs: 0,
      deletedCount: trackIds.length
    }, { merge: true });
    
    console.log("✅ Sync metadata updated");
    
    res.json({
      success: true,
      message: `Successfully deleted ${trackIds.length} liked songs`,
      deletedCount: trackIds.length
    });
    
  } catch (error) {
    console.error("❌ Error deleting all liked songs:", error);
    res.status(500).json({ 
      message: "Failed to delete all liked songs",
      error: error.message
    });
  }
});

// Route to migrate liked songs from old structure to new structure
router.post("/migrate/:userId", async (req, res) => {
  const { userId } = req.params;
  
  console.log("=== Migration Debug ===");
  console.log("User ID:", userId);
  
  if (!userId) {
    console.error("❌ Missing user ID");
    return res.status(400).json({ 
      message: "User ID is required",
      error: "MISSING_USER_ID"
    });
  }
  
  try {
    console.log("🔄 Starting migration for user:", userId);
    const result = await migrateLikedSongsStructure(userId);
    
    res.json({
      success: true,
      message: result.message,
      migratedCount: result.migrated
    });
    
  } catch (error) {
    console.error("❌ Migration failed:", error);
    res.status(500).json({ 
      message: "Migration failed",
      error: error.message
    });
  }
});

// Check Spotify connection status for a user
router.get("/connection-status/:userId", async (req, res) => {
  const { userId } = req.params;
  
  if (!userId) {
    return res.status(400).json({ 
      message: "User ID is required",
      connected: false
    });
  }
  
  try {
    const tokens = await getSpotifyTokens(userId);
    
    if (!tokens) {
      return res.json({
        connected: false,
        message: "No Spotify connection found"
      });
    }
    
    // Verify the token is still valid by making a test API call
    try {
      const response = await axios.get('https://api.spotify.com/v1/me', {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`
        }
      });
      
      return res.json({
        connected: true,
        spotifyUser: {
          id: response.data.id,
          displayName: response.data.display_name,
          email: response.data.email,
          imageUrl: response.data.images?.[0]?.url
        },
        expiresAt: tokens.expires_at
      });
    } catch (apiError) {
      // Token might be invalid, try to refresh
      if (apiError.response?.status === 401) {
        return res.json({
          connected: false,
          message: "Spotify token expired and refresh failed"
        });
      }
      throw apiError;
    }
  } catch (error) {
    console.error("Error checking Spotify connection:", error);
    res.status(500).json({ 
      connected: false,
      message: "Failed to check Spotify connection",
      error: error.message
    });
  }
});

// Get fresh tokens for frontend (with auto-refresh)
router.get("/tokens/:userId", async (req, res) => {
  const { userId } = req.params;
  
  if (!userId) {
    return res.status(400).json({ 
      message: "User ID is required"
    });
  }
  
  try {
    const tokens = await getSpotifyTokens(userId);
    
    if (!tokens) {
      return res.status(404).json({
        message: "No Spotify tokens found for user"
      });
    }
    
    res.json({
      access_token: tokens.access_token,
      expires_at: tokens.expires_at,
      // Don't send refresh_token to frontend for security
    });
  } catch (error) {
    console.error("Error getting tokens:", error);
    res.status(500).json({ 
      message: "Failed to get tokens",
      error: error.message
    });
  }
});

// Disconnect Spotify (remove tokens)
router.delete("/disconnect/:userId", async (req, res) => {
  const { userId } = req.params;
  
  if (!userId) {
    return res.status(400).json({ 
      message: "User ID is required"
    });
  }
  
  try {
    const { removeSpotifyTokens } = await import('../services/spotifyTokenService.js');
    await removeSpotifyTokens(userId);
    
    res.json({
      success: true,
      message: "Spotify disconnected successfully"
    });
  } catch (error) {
    console.error("Error disconnecting Spotify:", error);
    res.status(500).json({ 
      message: "Failed to disconnect Spotify",
      error: error.message
    });
  }
});

// Repair/normalize existing liked songs data
router.post("/repair/:userId", async (req, res) => {
  const { userId } = req.params;
  
  if (!userId) {
    return res.status(400).json({ 
      message: "User ID is required"
    });
  }
  
  try {
    console.log(`Starting data repair for user: ${userId}`);
    
    const likedSongsRef = admin.firestore().collection('users').doc(userId).collection('likedSongs');
    const snapshot = await likedSongsRef.get();
    
    if (snapshot.empty) {
      return res.json({
        success: true,
        message: "No songs to repair",
        repairedCount: 0
      });
    }
    
    const BATCH_SIZE = 500;
    let repairedCount = 0;
    let batch = admin.firestore().batch();
    let batchCount = 0;
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const updates = {};
      let needsUpdate = false;
      
      // Ensure id field exists
      if (!data.id) {
        updates.id = data.trackId || data.songId || doc.id;
        needsUpdate = true;
      }
      
      // Ensure songId field exists
      if (!data.songId) {
        updates.songId = data.id || data.trackId || doc.id;
        needsUpdate = true;
      }
      
      // Ensure imageUrl exists (copy from coverUrl if needed)
      if (!data.imageUrl && data.coverUrl) {
        updates.imageUrl = data.coverUrl;
        needsUpdate = true;
      }
      
      // Ensure audioUrl exists (copy from previewUrl if needed)
      if (!data.audioUrl && data.previewUrl) {
        updates.audioUrl = data.previewUrl;
        needsUpdate = true;
      }
      
      // Ensure albumName exists (copy from album if needed)
      if (!data.albumName && data.album) {
        updates.albumName = data.album;
        needsUpdate = true;
      }
      
      // Ensure source field exists
      if (!data.source) {
        // If it has spotifyUrl or trackId, it's from Spotify
        updates.source = (data.spotifyUrl || data.trackId) ? 'spotify' : 'mavrixfy';
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        batch.update(doc.ref, updates);
        repairedCount++;
        batchCount++;
        
        // Commit batch if it reaches the limit
        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          batch = admin.firestore().batch();
          batchCount = 0;
        }
      }
    }
    
    // Commit remaining updates
    if (batchCount > 0) {
      await batch.commit();
    }
    
    console.log(`Repaired ${repairedCount} songs for user: ${userId}`);
    
    res.json({
      success: true,
      message: `Repaired ${repairedCount} songs`,
      repairedCount,
      totalSongs: snapshot.size
    });
    
  } catch (error) {
    console.error("Error repairing data:", error);
    res.status(500).json({ 
      message: "Failed to repair data",
      error: error.message
    });
  }
});

export default router; 