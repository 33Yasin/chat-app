import * as roomService from "../services/room.service.js";

export const getRooms = async (req, res) => {
  try {
    const rooms = await roomService.getAllRooms();
    res.json({ rooms });
  } catch (error) {
    res.status(500).json({ message: "Sunucu hatası." });
  }
};

export const createRoom = async (req, res) => {
  try {
    const room = await roomService.createRoom({
      ...req.body,
      userId: req.userId,
    });
    res.status(201).json({ room });
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Sunucu hatası." });
  }
};

export const getOnlineUsers = async (req, res) => {
  try {
    const users = await roomService.getOnlineUsers();
    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: "Sunucu hatası." });
  }
};
