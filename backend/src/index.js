import express from "express";
import dotenv from "dotenv";
import { clerkMiddleware } from "@clerk/express";
import fileUpload from "express-fileupload";
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

// Load environment variables
dotenv.config();

const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration
app.use(cors({
	origin: process.env.NODE_ENV === "production" 
		? [process.env.FRONTEND_URL, "https://spotify-clone-satvik8373.vercel.app"]
		: ["http://localhost:3000", "http://localhost:3001"],
	credentials: true,
	methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
	allowedHeaders: ['Content-Type', 'Authorization'],
}));

// File upload configuration
app.use(fileUpload({
	useTempFiles: false,
	limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
}));

// Authentication middleware
app.use(clerkMiddleware());

// Health check endpoint
app.get("/api/health", async (req, res) => {
	try {
		const dbConnection = await connectDB();
		res.json({
			status: "healthy",
			database: dbConnection ? "connected" : "disconnected",
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		res.status(500).json({
			status: "unhealthy",
			error: error.message,
			timestamp: new Date().toISOString(),
		});
	}
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

// Spotify callback
app.get('/spotify-callback', (req, res) => {
	const { code, state } = req.query;
	res.redirect(`/api/spotify/callback?code=${code}&state=${state}`);
});

// Global error handler
app.use((err, req, res, next) => {
	console.error('Error:', {
		message: err.message,
		stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
		path: req.path,
		method: req.method,
	});

	res.status(err.status || 500).json({
		error: process.env.NODE_ENV === 'production' 
			? 'Internal server error' 
			: err.message
	});
});

// 404 handler
app.use((req, res) => {
	res.status(404).json({ error: 'Not found' });
});

// Initialize database connection
connectDB().catch(console.error);

export default app;
