import * as roomService from "../services/room.service.js";

export const getRooms = async (req, res) => {
  try {
    const rooms = await roomService.getAllRooms();
    res.json({ rooms });
  } catch (error) {
    res.status(500).json({ message: "Sunucu hatası." });
  }
};
