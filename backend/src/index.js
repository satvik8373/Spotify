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

const __dirname = path.resolve();
const app = express();
const PORT = process.env.PORT || 5000;

// Initialize socket only in development
if (process.env.NODE_ENV !== "production") {
	const httpServer = createServer(app);
	initializeSocket(httpServer);
}

// Configure CORS
app.use(
	cors({
		origin: process.env.NODE_ENV === "production" 
			? [process.env.FRONTEND_URL, "https://spotify-clone-satvik8373.vercel.app"]
			: ["http://localhost:3000", "http://localhost:3001", "https://fcf6-2401-4900-1f3f-bcc1-acdf-150c-4cb8-28aa.ngrok-free.app"],
		credentials: true,
	})
);

app.use(express.json()); // to parse req.body
app.use(clerkMiddleware()); // this will add auth to req obj => req.auth
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

app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/songs", songRoutes);
app.use("/api/albums", albumRoutes);
app.use("/api/stats", statRoutes);
app.use("/api/spotify", spotifyRoutes);
app.use("/api/music", musicRoutes);

// Special route to handle Spotify callback directly
app.get('/spotify-callback', (req, res) => {
	// Redirect to our API endpoint that handles the callback
	const { code, state } = req.query;
	res.redirect(`/api/spotify/callback?code=${code}&state=${state}`);
});

// Serve static files in production
if (process.env.NODE_ENV === "production") {
	app.use(express.static(path.join(__dirname, "../frontend/dist")));
	app.get("*", (req, res) => {
		res.sendFile(path.resolve(__dirname, "../frontend", "dist", "index.html"));
	});
}

// error handler
app.use((err, req, res, next) => {
	console.error(err.stack);
	res.status(500).json({ 
		message: process.env.NODE_ENV === "production" ? "Internal server error" : err.message 
	});
});

// Start server
if (process.env.NODE_ENV !== "production") {
	const httpServer = createServer(app);
	httpServer.listen(PORT, () => {
		console.log("Server is running on port " + PORT);
		connectDB();
	});
} else {
	// For Vercel
	app.listen(PORT, () => {
		console.log("Server is running on port " + PORT);
		connectDB();
	});
}

// Export for Vercel
export default app;
