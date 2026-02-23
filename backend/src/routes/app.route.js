import { Router } from "express";
import { getAppMessage } from "../controllers/app.controller.js";

const router = Router();

// Public endpoint - no authentication required
router.get("/message", getAppMessage);

export default router;
