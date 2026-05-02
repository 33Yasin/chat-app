import express from "express";
import { deleteMessage, editMessage } from "../controllers/message.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// Mesaj silme rotası (Giriş zorunlu)
router.delete("/:id", authMiddleware, deleteMessage);
// Mesaj düzenleme rotası (Giriş zorunlu)
router.put("/:id", authMiddleware, editMessage);

export default router;
