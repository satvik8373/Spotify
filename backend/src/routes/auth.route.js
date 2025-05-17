import { Router } from "express";
import { authCallback, firebaseAuth, verifyToken, checkAuth } from "../controllers/auth.controller.js";
import { firebaseAuth as firebaseAuthMiddleware } from "../middleware/firebase-auth.middleware.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = Router();

// Clerk auth route
router.post("/callback", authCallback);

// Firebase auth routes
router.post("/firebase", firebaseAuthMiddleware, firebaseAuth);

// Token verification
router.get("/verify", verifyToken);

// Add a debug endpoint to check auth status
router.get("/debug", (req, res) => {
  console.log("[AUTH DEBUG] Auth debug request received", {
    headers: {
      authorization: req.headers.authorization ? "Present" : "Missing",
      cookie: req.headers.cookie ? "Present" : "Missing"
    },
    auth: req.auth || "Missing"
  });
  
  res.json({
    authenticated: !!(req.auth?.userId || req.auth?.uid),
    userId: req.auth?.userId || null,
    uid: req.auth?.uid || null,
    email: req.auth?.email || null,
    headers: {
      authorization: !!req.headers.authorization,
      cookie: !!req.headers.cookie
    }
  });
});

// Protected route to check if user is authenticated
router.get("/check", protectRoute, checkAuth);

export default router;
