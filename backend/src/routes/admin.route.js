import { Router } from "express";
import { checkAdmin, createAlbum, createSong, deleteAlbum, deleteSong } from "../controllers/admin.controller.js";
import { protectRoute, requireAdmin } from "../middleware/auth.middleware.js";
import { 
  getAllPublicPlaylists,
  updatePlaylist,
  deletePlaylist,
  featurePlaylist,
  updatePlaylistWithImage
} from "../controllers/admin.controller.js";
import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";

const router = Router();

router.use(protectRoute, requireAdmin);

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`Created uploads directory at ${uploadsDir}`);
  }
} catch (error) {
  console.error(`Failed to create uploads directory: ${error.message}`);
  // Use a fallback directory if creation fails
  const tmpDir = path.join(process.cwd(), "tmp");
  try {
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    console.log(`Using fallback directory at ${tmpDir}`);
  } catch (innerError) {
    console.error(`Failed to create fallback directory: ${innerError.message}`);
  }
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    try {
      // Check if uploads directory exists and is writable
      if (fs.existsSync(uploadsDir) && fs.accessSync(uploadsDir, fs.constants.W_OK)) {
        return cb(null, uploadsDir);
      }
      
      // Fallback to system temp directory
      const os = require('os');
      cb(null, os.tmpdir());
    } catch (error) {
      console.error(`Error accessing uploads directory: ${error.message}`);
      // Fallback to system temp directory
      const os = require('os');
      cb(null, os.tmpdir());
    }
  },
  filename: function (req, file, cb) {
    const uniqueFilename = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueFilename);
  },
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept only image files
    if (!file.originalname.match(/\.(jpg|jpeg|png|webp)$/i)) {
      return cb(new Error("Only image files are allowed!"), false);
    }
    cb(null, true);
  },
});

router.get("/check", checkAdmin);

router.post("/songs", createSong);
router.delete("/songs/:id", deleteSong);

router.post("/albums", createAlbum);
router.delete("/albums/:id", deleteAlbum);

// Playlist management routes
router.get("/playlists", getAllPublicPlaylists);
router.put("/playlists/:id", updatePlaylist);
router.put("/playlists/:id/with-image", upload.single("image"), updatePlaylistWithImage);
router.delete("/playlists/:id", deletePlaylist);
router.put("/playlists/:id/feature", featurePlaylist);

export default router;
