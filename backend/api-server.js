// Vercel-compatible Express server
import express from "express";
import cors from "cors";

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