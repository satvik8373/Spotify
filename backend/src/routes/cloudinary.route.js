import { Router } from "express";
import { handleSingleUpload } from "../middleware/multer.middleware.js";
import { 
  uploadImage, 
  deleteImage, 
  createTextPlaceholder 
} from "../controllers/cloudinary.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Upload image to Cloudinary
router.post("/upload", handleSingleUpload, uploadImage);

// Delete image from Cloudinary
router.delete("/delete/:public_id", deleteImage);

// Create a text-based placeholder image
router.post("/placeholder", createTextPlaceholder);

export default router; 