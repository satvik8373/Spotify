import express from "express";
import dotenv from "dotenv";

// Load environment variables first
dotenv.config();

// Log environment for debugging
console.log(`Environment: ${process.env.NODE_ENV}`);
console.log(`MongoDB URI exists: ${!!process.env.MONGODB_URI}`);
console.log(`Frontend URL: ${process.env.FRONTEND_URL}`);

import { clerkMiddleware } from "@clerk/express";
import fileUpload from "express-fileupload";
import path from "path";
import cors from "cors";
import { connectDB } from "./lib/db.js";

import userRoutes from "./routes/user.route.js";
import adminRoutes from "./routes/admin.route.js";
import authRoutes from "./routes/auth.route.js";
import songRoutes from "./routes/song.route.js";
import albumRoutes from "./routes/album.route.js";
import statRoutes from "./routes/stat.route.js";
import spotifyRoutes from "./routes/spotify.route.js";
import musicRoutes from "./routes/music.route.js";

const app = express();

// Configure CORS with more permissive settings for debugging
app.use(
	cors({
		origin: "*", // Allow all origins for now
		credentials: true,
	})
);

app.use(express.json());
app.use(clerkMiddleware());

// Configure file upload with memory storage for serverless
app.use(
	fileUpload({
		useTempFiles: false,
		limits: {
			fileSize: 10 * 1024 * 1024, // 10MB max file size
		},
	})
);

// Add a health check endpoint
app.get("/api/health", (req, res) => {
	res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// API Routes
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/songs", songRoutes);
app.use("/api/albums", albumRoutes);
app.use("/api/stats", statRoutes);
app.use("/api/spotify", spotifyRoutes);
app.use("/api/music", musicRoutes);

// Spotify callback route
app.get('/spotify-callback', (req, res) => {
	const { code, state } = req.query;
	res.redirect(`/api/spotify/callback?code=${code}&state=${state}`);
});

// Error handler with more detailed logging
app.use((err, req, res, next) => {
	console.error("Error details:", {
		message: err.message,
		stack: err.stack,
		path: req.path,
		method: req.method,
		query: req.query,
		body: req.body,
	});
	
	res.status(500).json({ 
		message: "Internal server error",
		error: process.env.NODE_ENV === "production" ? "An unexpected error occurred" : err.message
	});
});

// Connect to database with error handling
connectDB().catch(err => {
	console.error("Failed to connect to database:", err);
	// Don't throw in serverless environment
});

// Export for Vercel
export default app;
