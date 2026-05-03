import express from "express";
import {
  getConversation,
  getConversationList,
  getUnreadCount,
} from "../controllers/dm.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

router.get("/conversations", authMiddleware, getConversationList);
router.get("/unread", authMiddleware, getUnreadCount);
router.get("/:userId", authMiddleware, getConversation);

export default router;
