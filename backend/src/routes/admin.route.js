import { Router } from "express";
import { checkAdmin, createAlbum, createSong, deleteAlbum, deleteSong } from "../controllers/admin.controller.js";
import { protectRoute, requireAdmin } from "../middleware/auth.middleware.js";
import { 
  getAllPublicPlaylists,
  updatePlaylist,
  deletePlaylist,
  featurePlaylist
} from "../controllers/admin.controller.js";

const router = Router();

router.use(protectRoute, requireAdmin);

router.get("/check", checkAdmin);

router.post("/songs", createSong);
router.delete("/songs/:id", deleteSong);

router.post("/albums", createAlbum);
router.delete("/albums/:id", deleteAlbum);

// Playlist management routes
router.get("/playlists", requireAdmin, getAllPublicPlaylists);
router.put("/playlists/:id", requireAdmin, updatePlaylist);
router.delete("/playlists/:id", requireAdmin, deletePlaylist);
router.put("/playlists/:id/feature", requireAdmin, featurePlaylist);

export default router;
