import express from "express";
import path from "path";
import cors from "cors";
import fs from "fs";
import { createServer } from "http";
import cron from "node-cron";
import fileUpload from "express-fileupload";

// Import our environment configuration
import env from "./lib/env.js";

// Import middleware and routes
import { clerkMiddleware } from "@clerk/express";
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

const __dirname = path.resolve();
const app = express();

// Initialize database connection
let dbConnection = null;
let dbConnectionAttempts = 0;
const MAX_DB_CONNECTION_ATTEMPTS = 3;

const initializeDB = async () => {
	try {
		if (!dbConnection) {
			console.log(`Attempting to connect to database (attempt ${dbConnectionAttempts + 1}/${MAX_DB_CONNECTION_ATTEMPTS})`);
			dbConnection = await connectDB();
			dbConnectionAttempts = 0; // Reset attempts on success
		}
		return dbConnection;
	} catch (error) {
		dbConnectionAttempts++;
		console.error(`Database connection failed (attempt ${dbConnectionAttempts}/${MAX_DB_CONNECTION_ATTEMPTS}):`, error);
		
		if (dbConnectionAttempts >= MAX_DB_CONNECTION_ATTEMPTS) {
			console.error("Maximum database connection attempts reached");
			throw new Error("Failed to connect to database after multiple attempts");
		}
		
		// Wait before retrying
		await new Promise(resolve => setTimeout(resolve, 1000));
		return initializeDB(); // Retry
	}
};

// Initialize socket only in development
if (env.NODE_ENV !== "production") {
	const httpServer = createServer(app);
	initializeSocket(httpServer);
}

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure CORS
app.use(
	cors({
		origin: env.NODE_ENV === "production" 
			? [env.FRONTEND_URL, "https://spotify-clone-satvik8373.vercel.app"]
			: ["http://localhost:3000", "http://localhost:3001"],
		credentials: true,
	})
);

// Clerk authentication middleware
app.use(clerkMiddleware());

// Configure file upload with memory storage for serverless
app.use(
	fileUpload({
		useTempFiles: env.NODE_ENV !== "production",
		tempFileDir: path.join(__dirname, "tmp"),
		createParentPath: true,
		limits: {
			fileSize: 10 * 1024 * 1024, // 10MB max file size
		},
	})
);

// Clean up temp files (only in development)
if (env.NODE_ENV !== "production") {
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

// Health check endpoint
app.get("/api/health", async (req, res) => {
	try {
		await initializeDB();
		res.status(200).json({ 
			status: "ok", 
			message: "Server is running",
			environment: env.NODE_ENV,
			database: "connected",
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		console.error("Health check failed:", error);
		res.status(500).json({ 
			status: "error", 
			message: "Server is running but database connection failed",
			error: env.NODE_ENV === "production" ? {} : error.message
		});
	}
});

// Initialize database before handling API routes
app.use(async (req, res, next) => {
	try {
		if (!dbConnection) {
			await initializeDB();
		}
		next();
	} catch (error) {
		console.error("Database middleware error:", error);
		next(error);
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

// Error handler
app.use((err, req, res, next) => {
	console.error("Error:", err);
	
	// Handle specific types of errors
	if (err.name === 'MongoError' || err.name === 'MongooseError') {
		return res.status(500).json({
			message: "Database error occurred",
			error: env.NODE_ENV === "production" ? {} : err.message
		});
	}
	
	if (err.name === 'ClerkError') {
		return res.status(401).json({
			message: "Authentication error",
			error: env.NODE_ENV === "production" ? {} : err.message
		});
	}
	
	// Default error response
	res.status(500).json({ 
		message: env.NODE_ENV === "production" ? "Internal server error" : err.message,
		error: env.NODE_ENV === "production" ? {} : err
	});
});

// Start server only in development
if (env.NODE_ENV !== "production") {
	const httpServer = createServer(app);
	httpServer.listen(env.PORT, () => {
		console.log(`Server is running on port ${env.PORT} in ${env.NODE_ENV} mode`);
	});
}

// Export for Vercel
export default app;
