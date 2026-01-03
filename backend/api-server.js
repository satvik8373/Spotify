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

// Spotify API configuration
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || 'mavrixfy://spotify-callback';

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

// Spotify API Routes
app.get('/api/spotify/login', (req, res) => {
  try {
    if (!SPOTIFY_CLIENT_ID) {
      return res.status(500).json({ 
        error: 'Spotify client ID not configured',
        message: 'SPOTIFY_CLIENT_ID environment variable is missing'
      });
    }

    const scopes = [
      'user-read-private',
      'user-read-email',
      'user-library-read',
      'user-library-modify',
      'playlist-read-private',
      'playlist-read-collaborative'
    ].join(' ');

    const authUrl = `https://accounts.spotify.com/authorize?` +
      `response_type=code&` +
      `client_id=${SPOTIFY_CLIENT_ID}&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `redirect_uri=${encodeURIComponent(SPOTIFY_REDIRECT_URI)}&` +
      `state=${Math.random().toString(36).substring(7)}`;

    console.log('Generated Spotify auth URL:', authUrl);
    res.json({ authUrl });
  } catch (error) {
    console.error('Spotify login error:', error);
    res.status(500).json({ error: 'Failed to generate Spotify authorization URL' });
  }
});

app.post('/api/spotify/callback', async (req, res) => {
  const { code, redirect_uri, userId } = req.body;
  
  console.log("=== Spotify Callback Debug ===");
  console.log("Spotify callback received:", { 
    code: code ? 'present' : 'missing', 
    redirect_uri, 
    userId 
  });
  console.log("Using CLIENT_ID:", SPOTIFY_CLIENT_ID ? 'present' : 'missing');
  console.log("Using CLIENT_SECRET:", SPOTIFY_CLIENT_SECRET ? 'present' : 'missing');
  
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
  
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    console.error("❌ Missing Spotify credentials");
    console.error("CLIENT_ID present:", !!SPOTIFY_CLIENT_ID);
    console.error("CLIENT_SECRET present:", !!SPOTIFY_CLIENT_SECRET);
    return res.status(500).json({ 
      message: "Spotify credentials not configured",
      error: "MISSING_CREDENTIALS"
    });
  }
  
  try {
    console.log("🔄 Exchanging code for tokens...");
    
    // Exchange authorization code for access token
    const tokenResponse = await axios.post('https://accounts.spotify.com/api/token', 
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirect_uri || SPOTIFY_REDIRECT_URI,
        client_id: SPOTIFY_CLIENT_ID,
        client_secret: SPOTIFY_CLIENT_SECRET
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    const tokenData = tokenResponse.data;
    console.log("✅ Tokens received successfully");
    
    // Store tokens in Firestore
    if (admin) {
      console.log("🔄 Storing tokens in Firestore...");
      const db = admin.firestore();
      const userTokensRef = db.collection('users').doc(userId).collection('spotifyTokens').doc('current');
      
      await userTokensRef.set({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in,
        token_type: tokenData.token_type,
        scope: tokenData.scope,
        expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)),
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log("✅ Tokens stored in Firestore");
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

app.get('/api/spotify/sync-status/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    if (!admin) {
      return res.status(500).json({
        connected: false,
        message: "Firebase not available"
      });
    }

    const db = admin.firestore();
    const userTokensRef = db.collection('users').doc(userId).collection('spotifyTokens').doc('current');
    const tokenDoc = await userTokensRef.get();
    
    if (!tokenDoc.exists) {
      return res.json({
        connected: false,
        message: "No Spotify connection found"
      });
    }
    
    const tokenData = tokenDoc.data();
    const isExpired = tokenData.expires_at && tokenData.expires_at.toDate() < new Date();
    
    res.json({
      connected: true,
      expires_at: tokenData.expires_at,
      is_expired: isExpired,
      scope: tokenData.scope,
      last_updated: tokenData.updated_at
    });
  } catch (error) {
    console.error("Error getting sync status:", error);
    res.status(500).json({ 
      connected: false,
      message: "Failed to get sync status",
      error: error.message
    });
  }
});

app.post('/api/spotify/sync', async (req, res) => {
  const { userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }
  
  try {
    if (!admin) {
      return res.status(500).json({ message: "Firebase not available" });
    }

    // Get user's Spotify tokens
    const db = admin.firestore();
    const userTokensRef = db.collection('users').doc(userId).collection('spotifyTokens').doc('current');
    const tokenDoc = await userTokensRef.get();
    
    if (!tokenDoc.exists) {
      return res.status(400).json({ message: "No Spotify connection found" });
    }
    
    const tokenData = tokenDoc.data();
    let accessToken = tokenData.access_token;
    
    // Check if token is expired and refresh if needed
    if (tokenData.expires_at && tokenData.expires_at.toDate() < new Date()) {
      console.log("🔄 Token expired, refreshing...");
      
      const refreshResponse = await axios.post('https://accounts.spotify.com/api/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: tokenData.refresh_token,
          client_id: SPOTIFY_CLIENT_ID,
          client_secret: SPOTIFY_CLIENT_SECRET
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      const newTokenData = refreshResponse.data;
      accessToken = newTokenData.access_token;
      
      // Update stored tokens
      await userTokensRef.update({
        access_token: newTokenData.access_token,
        expires_in: newTokenData.expires_in,
        expires_at: new Date(Date.now() + (newTokenData.expires_in * 1000)),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log("✅ Token refreshed successfully");
    }
    
    // Fetch liked songs from Spotify
    console.log("🔄 Fetching liked songs from Spotify...");
    const likedSongsResponse = await axios.get('https://api.spotify.com/v1/me/tracks?limit=50', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    const spotifyLikedSongs = likedSongsResponse.data.items;
    console.log(`Found ${spotifyLikedSongs.length} liked songs on Spotify`);
    
    // Store in Firestore
    const likedSongsRef = db.collection('users').doc(userId).collection('likedSongs');
    let syncedCount = 0;
    
    for (const item of spotifyLikedSongs) {
      const track = item.track;
      const songId = `spotify_${track.id}`;
      
      // Check if song already exists
      const existingDoc = await likedSongsRef.doc(songId).get();
      if (!existingDoc.exists) {
        await likedSongsRef.doc(songId).set({
          songId: songId,
          trackId: track.id,
          title: track.name,
          artist: track.artists.map(a => a.name).join(', '),
          albumName: track.album.name,
          imageUrl: track.album.images[0]?.url || '',
          audioUrl: track.preview_url || '',
          duration: track.duration_ms,
          source: 'spotify',
          spotifyUri: track.uri,
          likedAt: admin.firestore.FieldValue.serverTimestamp(),
          addedAt: new Date(item.added_at)
        });
        syncedCount++;
      }
    }
    
    console.log(`✅ Synced ${syncedCount} new songs`);
    
    res.json({ 
      success: true, 
      message: `Synced ${syncedCount} new songs from Spotify`,
      total: spotifyLikedSongs.length,
      synced: syncedCount
    });
  } catch (error) {
    console.error("Manual sync error:", error);
    res.status(500).json({ 
      message: "Sync failed",
      error: error.message
    });
  }
});

app.delete('/api/spotify/liked-songs/:userId', async (req, res) => {
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
    if (!admin) {
      return res.status(500).json({ message: "Firebase not available" });
    }

    console.log("🔄 Deleting all liked songs for user:", userId);
    
    // Get user's liked songs from Firestore
    const db = admin.firestore();
    const likedSongsRef = db.collection('users').doc(userId).collection('likedSongs');
    const likedSongsSnapshot = await likedSongsRef.get();
    
    if (likedSongsSnapshot.empty) {
      console.log("✅ No liked songs found to delete");
      return res.json({
        success: true,
        message: "No liked songs found to delete",
        deletedCount: 0
      });
    }
    
    // Delete all documents from Firestore
    console.log("🔄 Deleting songs from Firestore...");
    const batch = db.batch();
    likedSongsSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    console.log("✅ All songs deleted from Firestore");
    
    res.json({
      success: true,
      message: `Successfully deleted ${likedSongsSnapshot.size} liked songs`,
      deletedCount: likedSongsSnapshot.size
    });
    
  } catch (error) {
    console.error("❌ Error deleting all liked songs:", error);
    res.status(500).json({ 
      message: "Failed to delete all liked songs",
      error: error.message
    });
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