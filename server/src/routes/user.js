import express from "express";
import { getProfile, updateProfile } from "../controllers/user.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

router.get("/profile", authMiddleware, getProfile);
router.put("/profile", authMiddleware, updateProfile);

export default router;
