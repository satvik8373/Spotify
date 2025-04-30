import express from "express";
import dotenv from "dotenv";

// Load environment variables first
dotenv.config();

import { clerkMiddleware } from "@clerk/express";
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
import adminRoutes from "./routes/admin.route.js";
import authRoutes from "./routes/auth.route.js";
import songRoutes from "./routes/song.route.js";
import albumRoutes from "./routes/album.route.js";
import statRoutes from "./routes/stat.route.js";
import spotifyRoutes from "./routes/spotify.route.js";
import musicRoutes from "./routes/music.route.js";
import playlistRoutes from "./routes/playlist.route.js";
import uploadRoutes from "./routes/upload.route.js";
import apiTestRoutes from "./routes/api-test.route.js";
import likedSongRoutes from "./routes/likedSong.route.js";
import cloudinaryRoutes from "./routes/cloudinary.route.js";

const __dirname = path.resolve();
const app = express();
const PORT = process.env.PORT || 5000;

const httpServer = createServer(app);
initializeSocket(httpServer);

// CORS configuration with proper credentials support
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL || 'https://mavrixfilms.live', 'http://localhost:3000'] 
    : 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
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

// Temporarily disable Clerk middleware during Firebase transition
// app.use(clerkMiddleware()); // this will add auth to req obj => req.auth

// Firebase authentication middleware
app.use(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const idToken = authHeader.split('Bearer ')[1];
    
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      req.auth = {
        ...req.auth, // Preserve Clerk auth if present
        uid: decodedToken.uid,
        email: decodedToken.email,
        firebase: decodedToken
      };
    } catch (error) {
      console.log("Firebase auth failed, continuing with other auth methods:", error.message);
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
app.use("/api/test", apiTestRoutes);

app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
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

// Special route to handle Spotify callback directly
app.get('/spotify-callback', (req, res) => {
	// Redirect to our API endpoint that handles the callback
	const { code, state } = req.query;
	res.redirect(`/api/spotify/callback?code=${code}&state=${state}`);
});

// Add a root route handler
app.get('/', (req, res) => {
	res.json({ 
    message: 'Spotify Clone API - Welcome! Use /api/playlists, /api/songs, etc.',
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
