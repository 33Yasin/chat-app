import * as messageService from "../services/message.service.js";

// Mesaj silme denetleyicisi
export const deleteMessage = async (req, res) => {
  try {
    const result = await messageService.deleteMessage({
      messageId: parseInt(req.params.id),
      userId: req.userId,
    });
    res.json({ message: "Mesaj silindi.", ...result });
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Sunucu hatası." });
  }
};

// Mesaj düzenleme denetleyicisi
export const editMessage = async (req, res) => {
  try {
    const result = await messageService.editMessage({
      messageId: parseInt(req.params.id),
      userId: req.userId,
      content: req.body.content,
    });
    res.json({ message: "Mesaj düzenlendi.", ...result });
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Sunucu hatası." });
  }
};
