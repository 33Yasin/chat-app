import express from "express";
import {
  getRooms,
  createRoom,
  getOnlineUsers,
  updateRoom,
  deleteRoom,
} from "../controllers/room.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

router.get("/", authMiddleware, getRooms);
router.post("/", authMiddleware, createRoom);
router.get("/online-users", authMiddleware, getOnlineUsers);
router.put("/:id", authMiddleware, updateRoom);
router.delete("/:id", authMiddleware, deleteRoom);

export default router;
