import { LikedSong } from "../models/likedSong.model.js";
import admin from "firebase-admin";

// Helper to identify user type and ID from request
const getUserIdentity = async (req) => {
  try {
    // Check for Firebase authentication
    if (req.auth && req.auth.uid) {
      return {
        userType: "firebase",
        userId: req.auth.uid,
        firebaseId: req.auth.uid
      };
    }
    

    
    // Check for Google authentication from token
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      
      try {
        // Try to verify as Firebase token first
        const decodedToken = await admin.auth().verifyIdToken(token);
        return {
          userType: "firebase",
          userId: decodedToken.uid,
          firebaseId: decodedToken.uid,
          email: decodedToken.email
        };
      } catch (firebaseError) {
        console.log("Not a Firebase token, trying Google userinfo:", firebaseError.message);
        
        try {
          // Verify the Google token with userinfo endpoint
          const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (response.ok) {
            const userInfo = await response.json();
            return {
              userType: "google",
              userId: userInfo.sub,
              googleId: userInfo.sub,
              email: userInfo.email
            };
          }
        } catch (err) {
          console.error("Error verifying Google token:", err);
        }
      }
    }
    
    throw new Error("User not authenticated");
  } catch (error) {
    console.error("Error identifying user:", error);
    throw error;
  }
};

// Get all liked songs for the authenticated user
export const getLikedSongs = async (req, res, next) => {
  try {
    const identity = await getUserIdentity(req);
    
    // Find or create liked songs document
    let likedSongsDoc = await LikedSong.findOne({
      userId: identity.userId,
      userType: identity.userType
    });
    
    if (!likedSongsDoc) {
      // Create a new empty document
      likedSongsDoc = await LikedSong.create({
        userId: identity.userId,
        userType: identity.userType,
        ...(identity.googleId && { googleId: identity.googleId }),
        songs: []
      });
    }
    
    // Return the songs in reversed order (newest first)
    res.status(200).json({
      success: true,
      count: likedSongsDoc.songs.length,
      data: likedSongsDoc.songs.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt))
    });
  } catch (error) {
    console.error("Error fetching liked songs:", error);
    res.status(401).json({
      success: false,
      message: "Not authorized to access liked songs",
      error: error.message
    });
  }
};

// Add a song to liked songs
export const addLikedSong = async (req, res, next) => {
  try {
    const { songId, title, artist, imageUrl, audioUrl, duration, albumId } = req.body;
    
    // Validate required fields
    if (!songId || !title || !artist || !imageUrl || !audioUrl) {
      return res.status(400).json({
        success: false,
        message: "Missing required song information"
      });
    }
    
    const identity = await getUserIdentity(req);
    
    // Find or create liked songs document
    let likedSongsDoc = await LikedSong.findOne({
      userId: identity.userId,
      userType: identity.userType
    });
    
    if (!likedSongsDoc) {
      // Create a new document
      likedSongsDoc = await LikedSong.create({
        userId: identity.userId,
        userType: identity.userType,
        ...(identity.googleId && { googleId: identity.googleId }),

        songs: []
      });
    }
    
    // Check if song already exists
    const songExists = likedSongsDoc.songs.some(song => song.songId === songId);
    if (songExists) {
      return res.status(400).json({
        success: false,
        message: "Song already in liked songs"
      });
    }
    
    // Add the song
    likedSongsDoc.songs.push({
      songId,
      title,
      artist,
      imageUrl,
      audioUrl,
      duration: duration || 0,
      albumId: albumId || null,
      addedAt: new Date()
    });
    
    await likedSongsDoc.save();
    
    res.status(201).json({
      success: true,
      message: "Song added to liked songs",
      data: likedSongsDoc.songs
    });
  } catch (error) {
    console.error("Error adding liked song:", error);
    res.status(401).json({
      success: false,
      message: "Not authorized to add liked song",
      error: error.message
    });
  }
};

// Remove a song from liked songs
export const removeLikedSong = async (req, res, next) => {
  try {
    const { songId } = req.params;
    
    if (!songId) {
      return res.status(400).json({
        success: false,
        message: "Song ID is required"
      });
    }
    
    const identity = await getUserIdentity(req);
    
    // Find liked songs document
    const likedSongsDoc = await LikedSong.findOne({
      userId: identity.userId,
      userType: identity.userType
    });
    
    if (!likedSongsDoc) {
      return res.status(404).json({
        success: false,
        message: "No liked songs found"
      });
    }
    
    // Filter out the song
    const initialCount = likedSongsDoc.songs.length;
    likedSongsDoc.songs = likedSongsDoc.songs.filter(song => song.songId !== songId);
    
    // Check if song was found and removed
    if (initialCount === likedSongsDoc.songs.length) {
      return res.status(404).json({
        success: false,
        message: "Song not found in liked songs"
      });
    }
    
    await likedSongsDoc.save();
    
    res.status(200).json({
      success: true,
      message: "Song removed from liked songs",
      data: likedSongsDoc.songs
    });
  } catch (error) {
    console.error("Error removing liked song:", error);
    res.status(401).json({
      success: false,
      message: "Not authorized to remove liked song",
      error: error.message
    });
  }
};

// Check if a song is liked
export const isSongLiked = async (req, res, next) => {
  try {
    const { songId } = req.params;
    
    if (!songId) {
      return res.status(400).json({
        success: false,
        message: "Song ID is required"
      });
    }
    
    const identity = await getUserIdentity(req);
    
    // Find liked songs document
    const likedSongsDoc = await LikedSong.findOne({
      userId: identity.userId,
      userType: identity.userType
    });
    
    if (!likedSongsDoc) {
      return res.status(200).json({
        success: true,
        isLiked: false
      });
    }
    
    // Check if song is in liked songs
    const isLiked = likedSongsDoc.songs.some(song => song.songId === songId);
    
    res.status(200).json({
      success: true,
      isLiked
    });
  } catch (error) {
    console.error("Error checking if song is liked:", error);
    res.status(401).json({
      success: false,
      message: "Not authorized to check liked status",
      error: error.message
    });
  }
};

// Sync local liked songs with server
export const syncLikedSongs = async (req, res, next) => {
  try {
    const { songs } = req.body;
    
    if (!Array.isArray(songs)) {
      return res.status(400).json({
        success: false,
        message: "Songs must be an array"
      });
    }
    
    const identity = await getUserIdentity(req);
    
    // Find or create liked songs document
    let likedSongsDoc = await LikedSong.findOne({
      userId: identity.userId,
      userType: identity.userType
    });
    
    if (!likedSongsDoc) {
      // Create a new document
      likedSongsDoc = await LikedSong.create({
        userId: identity.userId,
        userType: identity.userId,
        ...(identity.googleId && { googleId: identity.googleId }),
        songs: []
      });
    }
    
    // Map of existing songs by songId for quick lookup
    const existingSongs = {};
    likedSongsDoc.songs.forEach(song => {
      existingSongs[song.songId] = song;
    });
    
    // Process incoming songs
    const songsToAdd = [];
    songs.forEach(song => {
      if (!existingSongs[song.id || song.songId]) {
        songsToAdd.push({
          songId: song.id || song.songId,
          title: song.title,
          artist: song.artist,
          imageUrl: song.imageUrl,
          audioUrl: song.audioUrl,
          duration: song.duration || 0,
          albumId: song.albumId || null,
          addedAt: song.addedAt || new Date()
        });
      }
    });
    
    // Add any new songs
    if (songsToAdd.length > 0) {
      likedSongsDoc.songs = [...likedSongsDoc.songs, ...songsToAdd];
      await likedSongsDoc.save();
    }
    
    res.status(200).json({
      success: true,
      message: `Synced ${songsToAdd.length} songs`,
      data: likedSongsDoc.songs.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt))
    });
  } catch (error) {
    console.error("Error syncing liked songs:", error);
    res.status(401).json({
      success: false,
      message: "Not authorized to sync liked songs",
      error: error.message
    });
  }
}; 