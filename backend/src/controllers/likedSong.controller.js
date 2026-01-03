import admin from "firebase-admin";

const db = admin.firestore();

// Helper to get user ID from Firebase authentication
const getUserId = (req) => {
  if (req.auth && req.auth.uid) {
    return req.auth.uid;
  }
  throw new Error("User not authenticated");
};

// Get all liked songs for the authenticated user
export const getLikedSongs = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    
    // Get liked songs from Firestore subcollection
    const likedSongsRef = db.collection('users').doc(userId).collection('likedSongs');
    const snapshot = await likedSongsRef.orderBy('likedAt', 'desc').get();
    
    const songs = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      songs.push({
        id: doc.id,
        songId: data.songId || doc.id,
        title: data.title,
        artist: data.artist,
        imageUrl: data.imageUrl,
        audioUrl: data.audioUrl,
        duration: data.duration || 0,
        albumName: data.albumName || data.album,
        source: data.source || 'mavrixfy',
        likedAt: data.likedAt
      });
    });
    
    res.status(200).json({
      success: true,
      count: songs.length,
      data: songs
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
    const { songId, title, artist, imageUrl, audioUrl, duration, albumName, album } = req.body;
    
    // Validate required fields
    if (!songId || !title || !artist || !audioUrl) {
      return res.status(400).json({
        success: false,
        message: "Missing required song information (songId, title, artist, audioUrl)"
      });
    }
    
    const userId = getUserId(req);
    
    // Check if song already exists
    const songRef = db.collection('users').doc(userId).collection('likedSongs').doc(songId);
    const existingDoc = await songRef.get();
    
    if (existingDoc.exists) {
      return res.status(400).json({
        success: false,
        message: "Song already in liked songs"
      });
    }
    
    // Add the song to Firestore
    const songData = {
      id: songId,
      songId: songId,
      title: title,
      artist: artist,
      imageUrl: imageUrl || '',
      audioUrl: audioUrl,
      duration: duration || 0,
      albumName: albumName || album || '',
      source: 'mavrixfy',
      likedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await songRef.set(songData);
    
    res.status(201).json({
      success: true,
      message: "Song added to liked songs",
      data: songData
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
    
    const userId = getUserId(req);
    
    // Remove the song from Firestore
    const songRef = db.collection('users').doc(userId).collection('likedSongs').doc(songId);
    const doc = await songRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: "Song not found in liked songs"
      });
    }
    
    await songRef.delete();
    
    res.status(200).json({
      success: true,
      message: "Song removed from liked songs"
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
    
    const userId = getUserId(req);
    
    // Check if song exists in Firestore
    const songRef = db.collection('users').doc(userId).collection('likedSongs').doc(songId);
    const doc = await songRef.get();
    
    res.status(200).json({
      success: true,
      isLiked: doc.exists
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
    
    const userId = getUserId(req);
    const likedSongsRef = db.collection('users').doc(userId).collection('likedSongs');
    
    // Get existing songs
    const existingSnapshot = await likedSongsRef.get();
    const existingSongIds = new Set();
    existingSnapshot.forEach(doc => {
      existingSongIds.add(doc.id);
    });
    
    // Process incoming songs and add new ones
    const batch = db.batch();
    let addedCount = 0;
    
    songs.forEach(song => {
      const songId = song.id || song.songId;
      if (songId && !existingSongIds.has(songId)) {
        const songRef = likedSongsRef.doc(songId);
        const songData = {
          id: songId,
          songId: songId,
          title: song.title || 'Unknown',
          artist: song.artist || 'Unknown Artist',
          imageUrl: song.imageUrl || '',
          audioUrl: song.audioUrl || '',
          duration: song.duration || 0,
          albumName: song.albumName || song.album || '',
          source: song.source || 'mavrixfy',
          likedAt: song.likedAt || admin.firestore.FieldValue.serverTimestamp()
        };
        batch.set(songRef, songData);
        addedCount++;
      }
    });
    
    // Commit the batch
    if (addedCount > 0) {
      await batch.commit();
    }
    
    // Get updated songs list
    const updatedSnapshot = await likedSongsRef.orderBy('likedAt', 'desc').get();
    const updatedSongs = [];
    updatedSnapshot.forEach(doc => {
      const data = doc.data();
      updatedSongs.push({
        id: doc.id,
        songId: data.songId || doc.id,
        title: data.title,
        artist: data.artist,
        imageUrl: data.imageUrl,
        audioUrl: data.audioUrl,
        duration: data.duration || 0,
        albumName: data.albumName,
        source: data.source,
        likedAt: data.likedAt
      });
    });
    
    res.status(200).json({
      success: true,
      message: `Synced ${addedCount} new songs`,
      count: updatedSongs.length,
      data: updatedSongs
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