import { Router } from "express";
import { firebaseAuth } from "../middleware/firebase-auth.middleware.js";
import { getAllUsers, deleteUserAccount } from "../controllers/user.controller.js";
const router = Router();

router.get("/", firebaseAuth, getAllUsers);
router.delete("/account", firebaseAuth, deleteUserAccount);

export default router;
