import { Router } from "express";
import { 
  getLikedSongs, 
  addLikedSong, 
  removeLikedSong, 
  isSongLiked,
  syncLikedSongs
} from "../controllers/likedSong.controller.js";
import {
  importLikedSongsFileController,
  retryLikedSongImportController,
} from "../controllers/likedSongImport.controller.js";
import { firebaseAuth, optionalFirebaseAuth } from "../middleware/firebase-auth.middleware.js";

const router = Router();
const validateImportUpload = (req, res, next) => {
  // Support both multipart upload and direct payload fallback.
  if (req.body?.fileName && typeof req.body?.fileContent === "string") {
    return next();
  }

  const incoming = req.files?.file;
  if (!incoming) {
    return res.status(400).json({
      success: false,
      message:
        "No file uploaded. Use multipart/form-data and attach CSV/TXT in `file` field.",
      details: {
        hasReqFiles: Boolean(req.files),
        availableFields: Object.keys(req.files || {}),
      },
    });
  }

  const file = Array.isArray(incoming) ? incoming[0] : incoming;
  const fileName = String(file?.name || file?.originalname || "").toLowerCase();
  const extension = fileName.split(".").pop();
  const mimeType = String(file?.mimetype || "").toLowerCase();

  const allowedExtensions = new Set(["csv", "txt"]);
  const allowedMime = new Set([
    "text/csv",
    "text/plain",
    "application/vnd.ms-excel",
    "application/octet-stream",
  ]);

  if (!allowedExtensions.has(extension || "") && !allowedMime.has(mimeType)) {
    return res.status(400).json({
      success: false,
      message: "Only CSV and TXT files are allowed.",
    });
  }

  if (Number(file?.size || 0) > 2 * 1024 * 1024) {
    return res.status(400).json({
      success: false,
      message: "Import file is too large. Maximum size is 2MB.",
    });
  }

  return next();
};

// Import liked songs from CSV/TXT with JioSaavn mapping
router.post("/import", firebaseAuth, validateImportUpload, importLikedSongsFileController);

// Retry failed imports
router.post("/import/retry", firebaseAuth, retryLikedSongImportController);

// Get all liked songs for the current user
router.get("/", optionalFirebaseAuth, getLikedSongs);

// Check if a song is liked
router.get("/check/:songId", optionalFirebaseAuth, isSongLiked);

// Add a song to liked songs
router.post("/", optionalFirebaseAuth, addLikedSong);

// Remove a song from liked songs
router.delete("/:songId", optionalFirebaseAuth, removeLikedSong);

// Sync liked songs between local storage and server
router.post("/sync", optionalFirebaseAuth, syncLikedSongs);

export default router; 
