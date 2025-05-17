import { Router } from "express";
import { checkAdmin, createAlbum, createSong, deleteAlbum, deleteSong } from "../controllers/admin.controller.js";
import { protectRoute, requireAdmin } from "../middleware/auth.middleware.js";
import { 
  getAllPublicPlaylists,
  updatePlaylist,
  deletePlaylist,
  featurePlaylist,
  uploadImage
} from "../controllers/admin.controller.js";

const router = Router();

router.use(protectRoute, requireAdmin);

router.get("/check", checkAdmin);

router.post("/songs", createSong);
router.delete("/songs/:id", deleteSong);

router.post("/albums", createAlbum);
router.delete("/albums/:id", deleteAlbum);

// Playlist management routes
router.get("/playlists", getAllPublicPlaylists);
router.put("/playlists/:id", updatePlaylist);
router.delete("/playlists/:id", deletePlaylist);
router.put("/playlists/:id/feature", featurePlaylist);

// Image upload route
router.post("/upload/image", uploadImage);

export default router;
