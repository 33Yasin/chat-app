import * as dmService from "../services/dm.service.js";

export const getConversation = async (req, res) => {
  try {
    const messages = await dmService.getConversation({
      userId: req.userId,
      otherUserId: parseInt(req.params.userId),
    });
    res.json({ messages });
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Sunucu hatası." });
  }
};

export const getConversationList = async (req, res) => {
  try {
    const conversations = await dmService.getConversationList(req.userId);
    res.json({ conversations });
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Sunucu hatası." });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const unread = await dmService.getUnreadCount(req.userId);
    res.json({ unread });
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Sunucu hatası." });
  }
};
