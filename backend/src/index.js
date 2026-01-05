import express from "express";
import dotenv from "dotenv";

// Load environment variables first
dotenv.config();


import fileUpload from "express-fileupload";
import path from "path";
import cors from "cors";
import fs from "fs";
import { createServer } from "http";
import cron from "node-cron";

// Import Firebase admin
import admin from "./config/firebase.js";

import { initializeSocket } from "./lib/socket.js";

import userRoutes from "./routes/user.route.js";
import authRoutes from "./routes/auth.route.js";
import songRoutes from "./routes/song.route.js";
import albumRoutes from "./routes/album.route.js";
import statRoutes from "./routes/stat.route.js";
import spotifyRoutes from "./routes/spotify.route.js";
import musicRoutes from "./routes/music.route.js";
import playlistRoutes from "./routes/playlist.route.js";
import uploadRoutes from "./routes/upload.route.js";

import likedSongRoutes from "./routes/likedSong.route.js";
import cloudinaryRoutes from "./routes/cloudinary.route.js";
import deezerRoutes from "./routes/deezer.route.js";
import jiosaavnRoutes from "./routes/jiosaavn.route.js";

const __dirname = path.resolve();
const app = express();
const PORT = process.env.PORT || 5000;

const httpServer = createServer(app);
initializeSocket(httpServer);

// CORS configuration with proper credentials support
const corsOptions = {
  origin: (origin, callback) => {
    try {
      const defaultAllowed = [
        'http://localhost:3000',
        'http://localhost:5173',
        'https://mavrixfy.site',
        'https://www.mavrixfy.site',
        'https://1d3c38b2f441.ngrok-free.app',
        process.env.FRONTEND_URL || '',
      ].filter(Boolean);

      // Allow non-browser requests (no Origin)
      if (!origin) return callback(null, true);

      // Parse hostname safely
      let hostname = '';
      try { hostname = new URL(origin).hostname; } catch {}

      const isNgrok = hostname.endsWith('.ngrok-free.app') || hostname.endsWith('.ngrok.io');
      const isAllowed = defaultAllowed.includes(origin) || isNgrok;

      console.log('CORS check:', { origin, hostname, isNgrok, isAllowed, defaultAllowed });
      return callback(isAllowed ? null : new Error('Not allowed by CORS'), isAllowed);
    } catch (e) {
      // Fallback: deny if anything goes wrong
      return callback(new Error('CORS error'), false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  credentials: true, // Allow cookies to be sent with requests
  maxAge: 600
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle OPTIONS preflight requests for all routes
app.options('*', cors(corsOptions));

app.use(express.json()); // to parse req.body



// Firebase authentication middleware
app.use(async (req, res, next) => {
  // Initialize req.auth if not set
  req.auth = req.auth || {};
  
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
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
      // Check if it's a Firebase initialization error
      if (error.message.includes('Unable to detect a Project Id')) {
        console.error('Firebase Project ID not configured properly. Please check your environment variables.');
        console.error('To fix this, set FIREBASE_PROJECT_ID=spotify-8fefc in your environment variables.');
      } else {
        console.log("Firebase auth failed, continuing with other auth methods:", error.message);
      }
      // Don't fail the request - allow other auth methods to be checked
    }
  }
  
  next();
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, "public")));

// Only use file upload middleware in non-Vercel environment
if (!process.env.VERCEL) {
  app.use(
    fileUpload({
      useTempFiles: true,
      tempFileDir: path.join(__dirname, "tmp"),
      createParentPath: true,
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB  max file size
      },
    })
  );

  // cron jobs
  const tempDir = path.join(process.cwd(), "tmp");
  cron.schedule("0 * * * *", () => {
    if (fs.existsSync(tempDir)) {
      fs.readdir(tempDir, (err, files) => {
        if (err) {
          console.log("error", err);
          return;
        }
        for (const file of files) {
          fs.unlink(path.join(tempDir, file), (err) => {});
        }
      });
    }
  });
}

// API test routes


app.use("/api/users", userRoutes);

app.use("/api/auth", authRoutes);
app.use("/api/songs", songRoutes);
app.use("/api/albums", albumRoutes);
app.use("/api/stats", statRoutes);
app.use("/api/spotify", spotifyRoutes);
app.use("/api/music", musicRoutes);
app.use("/api/playlists", playlistRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/liked-songs", likedSongRoutes);
app.use("/api/cloudinary", cloudinaryRoutes);
app.use("/api/deezer", deezerRoutes);
app.use("/api/jiosaavn", jiosaavnRoutes);

// Special route to handle Spotify callback directly
app.get('/spotify-callback', (req, res) => {
	// Redirect to our API endpoint that handles the callback
	const { code, state } = req.query;
	res.redirect(`/api/spotify/callback?code=${code}&state=${state}`);
});

// Add a root route handler
app.get('/', (req, res) => {
	res.json({ 
    message: 'Mavrixfy API - Welcome! Use /api/playlists, /api/songs, etc.',
    environment: process.env.NODE_ENV || 'development',
    vercel: process.env.VERCEL ? 'yes' : 'no',
    timestamp: new Date().toISOString(),
    testEndpoint: '/api/test/health'
  });
});

if (process.env.NODE_ENV === "production" && !process.env.VERCEL) {
	app.use(express.static(path.join(__dirname, "../frontend/dist")));
	app.get("*", (req, res) => {
		res.sendFile(path.resolve(__dirname, "../frontend", "dist", "index.html"));
	});
}

// Add error handling middleware
app.use((err, req, res, next) => {
	console.error('Error:', err);
	res.status(err.status || 500).json({
		message: process.env.NODE_ENV === "production" 
			? "An error occurred" 
			: err.message,
		error: process.env.NODE_ENV === "development" ? err : {}
	});
});

// Start server
httpServer.listen(PORT, () => {
  console.log("Server is running on port " + PORT);
  console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'Not set'}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Running on Vercel: ${process.env.VERCEL ? 'Yes' : 'No'}`);
});
