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

import { initializeSocket } from "./lib/socket.js";
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
const PORT = process.env.PORT || 5000;

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure CORS
app.use(
	cors({
		origin: process.env.NODE_ENV === "production" 
			? ["https://mavrixfilms.live", "https://spotify-clone-satvik8373.vercel.app"]
			: ["http://localhost:3000", "http://localhost:3001"],
		credentials: true,
	})
);

// Initialize socket only in development
if (process.env.NODE_ENV !== "production") {
	const httpServer = createServer(app);
	initializeSocket(httpServer);
}

// Clerk middleware
app.use(clerkMiddleware());

// File upload configuration - disabled in production for serverless
if (process.env.NODE_ENV !== "production") {
	app.use(
		fileUpload({
			useTempFiles: true,
			tempFileDir: path.join(process.cwd(), "tmp"),
			createParentPath: true,
			limits: {
				fileSize: 10 * 1024 * 1024, // 10MB max file size
			},
		})
	);
} else {
	// In production, use memory storage instead of temp files
	app.use(
		fileUpload({
			useTempFiles: false,
			limits: {
				fileSize: 10 * 1024 * 1024, // 10MB max file size
			},
		})
	);
}

// Clean up temp files (only in development)
if (process.env.NODE_ENV !== "production") {
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

// Handle favicon.ico requests
app.get('/favicon.ico', (req, res) => {
	res.status(204).end();
});

// Health check endpoint
app.get('/health', (req, res) => {
	res.status(200).json({ status: 'ok' });
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

// Error handling middleware
app.use((err, req, res, next) => {
	console.error('Error:', err);
	res.status(err.status || 500).json({
		message: process.env.NODE_ENV === "production" 
			? "Internal server error" 
			: err.message,
		stack: process.env.NODE_ENV === "production" 
			? undefined 
			: err.stack
	});
});

// 404 handler
app.use((req, res) => {
	res.status(404).json({ message: "Route not found" });
});

// Connect to database
connectDB().catch(console.error);

// Start server only in development
if (process.env.NODE_ENV !== "production") {
	const httpServer = createServer(app);
	httpServer.listen(PORT, () => {
		console.log(`Server is running on port ${PORT}`);
	});
}

// Export for Vercel
export default app;
