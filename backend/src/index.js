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
import mongoose from "mongoose";

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
		methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
	})
);

// Initialize socket only in development
if (process.env.NODE_ENV !== "production") {
	const httpServer = createServer(app);
	initializeSocket(httpServer);
}

// Clerk middleware
app.use(clerkMiddleware());

// File upload configuration
app.use(
	fileUpload({
		useTempFiles: true,
		tempFileDir: "/tmp",
		createParentPath: true,
		limits: {
			fileSize: 10 * 1024 * 1024, // 10MB max file size
		},
	})
);

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

// Root route
app.get('/', (req, res) => {
	res.json({ message: 'Welcome to Spotify Clone API' });
});

// Health check endpoint with MongoDB status
app.get('/health', async (req, res) => {
	try {
		const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
		res.status(200).json({ 
			status: 'ok',
			database: dbStatus,
			environment: process.env.NODE_ENV
		});
	} catch (error) {
		res.status(500).json({ 
			status: 'error',
			message: error.message
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

// 404 handler - This should be the last middleware
app.use((req, res) => {
	console.log('404 Not Found:', req.method, req.url);
	res.status(404).json({ 
		message: "Route not found",
		path: req.url,
		method: req.method
	});
});

// MongoDB connection with retry mechanism
let isConnected = false;
const connectWithRetry = async () => {
	if (isConnected) return;
	
	try {
		if (!process.env.MONGODB_URI) {
			throw new Error('MONGODB_URI is not defined in environment variables');
		}

		await mongoose.connect(process.env.MONGODB_URI, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
			serverSelectionTimeoutMS: 5000,
			socketTimeoutMS: 45000,
		});

		isConnected = true;
		console.log('MongoDB connected successfully');

		// Handle connection events
		mongoose.connection.on('error', (err) => {
			console.error('MongoDB connection error:', err);
			isConnected = false;
		});

		mongoose.connection.on('disconnected', () => {
			console.log('MongoDB disconnected');
			isConnected = false;
		});

	} catch (error) {
		console.error('MongoDB connection error:', error);
		isConnected = false;
		// Retry connection after 5 seconds
		setTimeout(connectWithRetry, 5000);
	}
};

// Start server only in development
if (process.env.NODE_ENV !== "production") {
	const httpServer = createServer(app);
	httpServer.listen(PORT, () => {
		console.log(`Server is running on port ${PORT}`);
		connectWithRetry();
	});
}

// Initialize database connection
connectWithRetry();

// Export for Vercel
export default app;
