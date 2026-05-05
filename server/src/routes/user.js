import express from "express";
import { getProfile, updateProfile, deleteProfile } from "../controllers/user.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

router.get("/profile", authMiddleware, getProfile);
router.put("/profile", authMiddleware, updateProfile);
router.delete("/profile", authMiddleware, deleteProfile);

export default router;
