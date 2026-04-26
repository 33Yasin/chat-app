import express from "express";
import { getRooms } from "../controllers/room.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

router.get("/", authMiddleware, getRooms);

export default router;
