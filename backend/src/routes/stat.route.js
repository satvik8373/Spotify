import { Router } from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getStats } from "../controllers/stat.controller.js";

const router = Router();

router.get("/", protectRoute, getStats);

export default router;
