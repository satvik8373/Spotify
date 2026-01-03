// Vercel-compatible Express server
import express from "express";
import cors from "cors";
import axios from "axios";

// Firebase admin (simplified for Vercel)
let admin;
try {
  const firebaseAdmin = await import('firebase-admin');
  admin = firebaseAdmin.default;
  
  // Initialize Firebase if not already initialized
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'spotify-8fefc',
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'spotify-8fefc.firebasestorage.app',
      databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://spotify-8fefc-default-rtdb.firebaseio.com'
    });
    console.log("Firebase Admin SDK initialized successfully");
  }
} catch (error) {
  console.error("Firebase initialization error:", error);
}

// JioSaavn API configuration
const JIOSAAVN_API_BASE_URL = 'https://jiosaavn-api-privatecvc2.vercel.app';

// Helper function to convert HTTP URLs to HTTPS for mixed content security
const convertToHttps = (url) => {
  if (typeof url === 'string' && url.startsWith('http://')) {
    return url.replace('http://', 'https://');
  }
  return url;
};

// Helper function to process JioSaavn response and fix URLs
const processJioSaavnResponse = (data) => {
  if (data && data.data && data.data.results) {
    data.data.results = data.data.results.map(song => {
      // Convert image URLs to HTTPS
      if (song.image && Array.isArray(song.image)) {
        song.image = song.image.map(img => ({
          ...img,
          link: convertToHttps(img.link)
        }));
      }
      
      // Convert download URLs to HTTPS
      if (song.downloadUrl && Array.isArray(song.downloadUrl)) {
        song.downloadUrl = song.downloadUrl.map(download => ({
          ...download,
          link: convertToHttps(download.link)
        }));
      }
      
      return song;
    });
  }
  return data;
};

// Create Express app
const app = express();

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://mavrixfy.site',
    'https://www.mavrixfy.site'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 600
};

app.use(cors(corsOptions));
app.use(express.json());

// Handle preflight requests
app.options('*', cors(corsOptions));

// Firebase auth middleware
app.use(async (req, res, next) => {
  req.auth = req.auth || {};
  
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ') && admin) {
    const idToken = authHeader.split('Bearer ')[1];
    
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      req.auth = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        firebase: decodedToken
      };
      console.log(`Firebase auth successful for user: ${decodedToken.uid}`);
    } catch (error) {
      console.log("Firebase auth failed:", error.message);
    }
  }
  
  next();
});

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Mavrixfy API - Working!',
    environment: process.env.NODE_ENV || 'development',
    vercel: process.env.VERCEL ? 'yes' : 'no',
    timestamp: new Date().toISOString(),
    firebase: admin ? 'initialized' : 'not available'
  });
});

app.get('/api/test', (req, res) => {
  res.json({
    message: 'API test endpoint working',
    timestamp: new Date().toISOString(),
    auth: req.auth.uid ? 'authenticated' : 'not authenticated'
  });
});

// JioSaavn API Routes
app.get('/api/jiosaavn/search/songs', async (req, res) => {
  try {
    const { query, limit = 20 } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const response = await axios.get(`${JIOSAAVN_API_BASE_URL}/search/songs`, {
      params: {
        query,
        page: 1,
        limit: parseInt(limit)
      }
    });
    
    const processedData = processJioSaavnResponse(response.data);
    res.json(processedData);
  } catch (error) {
    console.error('Search songs error:', error);
    res.status(500).json({ error: 'Failed to search songs' });
  }
});

app.get('/api/jiosaavn/trending', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    const response = await axios.get(`${JIOSAAVN_API_BASE_URL}/search/songs`, {
      params: {
        query: 'trending songs',
        page: 1,
        limit: parseInt(limit)
      }
    });
    
    const processedData = processJioSaavnResponse(response.data);
    res.json(processedData);
  } catch (error) {
    console.error('Get trending songs error:', error);
    res.status(500).json({ error: 'Failed to get trending songs' });
  }
});

app.get('/api/jiosaavn/new-releases', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    const response = await axios.get(`${JIOSAAVN_API_BASE_URL}/search/songs`, {
      params: {
        query: 'new releases',
        page: 1,
        limit: parseInt(limit)
      }
    });
    
    const processedData = processJioSaavnResponse(response.data);
    res.json(processedData);
  } catch (error) {
    console.error('Get new releases error:', error);
    res.status(500).json({ error: 'Failed to get new releases' });
  }
});

app.get('/api/jiosaavn/songs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const response = await axios.get(`${JIOSAAVN_API_BASE_URL}/songs`, {
      params: { id }
    });
    
    const processedData = processJioSaavnResponse(response.data);
    res.json(processedData);
  } catch (error) {
    console.error('Get song details error:', error);
    res.status(500).json({ error: 'Failed to get song details' });
  }
});

// Liked songs endpoints
app.get('/api/liked-songs', async (req, res) => {
  try {
    if (!req.auth.uid) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    if (!admin) {
      return res.status(500).json({
        success: false,
        message: "Firebase not available"
      });
    }

    const db = admin.firestore();
    const likedSongsRef = db.collection('users').doc(req.auth.uid).collection('likedSongs');
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
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
});

app.post('/api/liked-songs', async (req, res) => {
  try {
    if (!req.auth.uid) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const { songId, title, artist, imageUrl, audioUrl, duration, albumName, album } = req.body;
    
    if (!songId || !title || !artist || !audioUrl) {
      return res.status(400).json({
        success: false,
        message: "Missing required song information (songId, title, artist, audioUrl)"
      });
    }

    if (!admin) {
      return res.status(500).json({
        success: false,
        message: "Firebase not available"
      });
    }

    const db = admin.firestore();
    const songRef = db.collection('users').doc(req.auth.uid).collection('likedSongs').doc(songId);
    const existingDoc = await songRef.get();
    
    if (existingDoc.exists) {
      return res.status(400).json({
        success: false,
        message: "Song already in liked songs"
      });
    }
    
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
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
});

app.delete('/api/liked-songs/:songId', async (req, res) => {
  try {
    if (!req.auth.uid) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const { songId } = req.params;
    
    if (!songId) {
      return res.status(400).json({
        success: false,
        message: "Song ID is required"
      });
    }

    if (!admin) {
      return res.status(500).json({
        success: false,
        message: "Firebase not available"
      });
    }

    const db = admin.firestore();
    const songRef = db.collection('users').doc(req.auth.uid).collection('likedSongs').doc(songId);
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
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    firebase: admin ? 'OK' : 'Not available'
  });
});

// Export for Vercel
export default app;