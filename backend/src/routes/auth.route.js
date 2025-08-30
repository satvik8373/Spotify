import { Router } from "express";
import { firebaseAuth, verifyToken, logout } from "../controllers/auth.controller.js";
import { firebaseAuth as firebaseAuthMiddleware } from "../middleware/firebase-auth.middleware.js";

const router = Router();

// Firebase auth routes
router.post("/firebase", firebaseAuthMiddleware, firebaseAuth);

// Token verification
router.get("/verify", verifyToken);

// Logout (compatibility endpoint)
router.post("/logout", logout);

export default router;
