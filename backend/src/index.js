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
const PORT = env.PORT;

// Initialize socket only in development
if (env.NODE_ENV !== "production") {
	const httpServer = createServer(app);
	initializeSocket(httpServer);
}

// Configure CORS
app.use(
	cors({
		origin: env.NODE_ENV === "production" 
			? [env.FRONTEND_URL, "https://spotify-clone-satvik8373.vercel.app"]
			: ["http://localhost:3000", "http://localhost:3001", "https://fcf6-2401-4900-1f3f-bcc1-acdf-150c-4cb8-28aa.ngrok-free.app"],
		credentials: true,
	})
);

app.use(express.json());
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
app.get("/api/health", (req, res) => {
	res.status(200).json({ 
		status: "ok", 
		message: "Server is running",
		environment: env.NODE_ENV,
		timestamp: new Date().toISOString()
	});
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

// Serve static files in production
if (env.NODE_ENV === "production") {
	app.use(express.static(path.join(__dirname, "../frontend/dist")));
	app.get("*", (req, res) => {
		res.sendFile(path.resolve(__dirname, "../frontend", "dist", "index.html"));
	});
}

// Error handler
app.use((err, req, res, next) => {
	console.error("Error:", err.stack);
	res.status(500).json({ 
		message: env.NODE_ENV === "production" ? "Internal server error" : err.message,
		error: env.NODE_ENV === "production" ? {} : err
	});
});

// Connect to database
connectDB().catch(err => {
	console.error("Failed to connect to database:", err);
});

// Start server only in development
if (env.NODE_ENV !== "production") {
	const httpServer = createServer(app);
	httpServer.listen(PORT, () => {
		console.log(`Server is running on port ${PORT} in ${env.NODE_ENV} mode`);
	});
}

// Export for Vercel
export default app;
