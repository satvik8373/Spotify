import { Router } from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { checkAdminStatus, getAllUsers } from "../controllers/user.controller.js";
const router = Router();

router.get("/", protectRoute, getAllUsers);
router.get("/admin/check", protectRoute, checkAdminStatus);

export default router;
