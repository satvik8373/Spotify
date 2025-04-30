import { Router } from "express";
import { authCallback, firebaseAuth, verifyToken } from "../controllers/auth.controller.js";
import { firebaseAuth as firebaseAuthMiddleware } from "../middleware/firebase-auth.middleware.js";

const router = Router();

// Clerk auth route
router.post("/callback", authCallback);

// Firebase auth routes
router.post("/firebase", firebaseAuthMiddleware, firebaseAuth);

// Token verification
router.get("/verify", verifyToken);

export default router;
