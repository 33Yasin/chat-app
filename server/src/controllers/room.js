import * as roomService from "../services/room.service.js";

// Tüm odaları getiren denetleyici
export const getRooms = async (req, res) => {
  try {
    const rooms = await roomService.getAllRooms();
    res.json({ rooms });
  } catch (error) {
    res.status(500).json({ message: "Sunucu hatası." });
  }
};

// Yeni oda oluşturan denetleyici
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

// Çevrimiçi kullanıcıları getiren denetleyici
export const getOnlineUsers = async (req, res) => {
  try {
    const users = await roomService.getOnlineUsers();
    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: "Sunucu hatası." });
  }
};

export const updateRoom = async (req, res) => {
  try {
    const room = await roomService.updateRoom({
      roomId: parseInt(req.params.id),
      userId: req.userId,
      ...req.body,
    });
    res.json({ room });
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Sunucu hatası." });
  }
};

export const deleteRoom = async (req, res) => {
  try {
    const result = await roomService.deleteRoom({
      roomId: parseInt(req.params.id),
      userId: req.userId,
    });
    res.json({ message: "Oda silindi.", ...result });
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Sunucu hatası." });
  }
};
