import { Router } from "express";
import { firebaseAuth, verifyToken, logout, googleMobileAuth, googleMobileCallback } from "../controllers/auth.controller.js";
import { firebaseAuth as firebaseAuthMiddleware } from "../middleware/firebase-auth.middleware.js";

const router = Router();

// Firebase auth routes
router.post("/firebase", firebaseAuthMiddleware, firebaseAuth);

// Google OAuth for mobile (Expo)
router.get("/google-mobile", googleMobileAuth);
router.get("/google-mobile/callback", googleMobileCallback);

// Token verification
router.get("/verify", verifyToken);

// Logout (compatibility endpoint)
router.post("/logout", logout);

export default router;
