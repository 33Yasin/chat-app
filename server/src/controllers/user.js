import * as userService from "../services/user.service.js";

export const getProfile = async (req, res) => {
  try {
    const user = await userService.getUserProfile(req.userId);
    res.json({ user });
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Sunucu hatası." });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const user = await userService.updateUserProfile({
      userId: req.userId,
      username: req.body.username,
    });
    res.json({ message: "Profil güncellendi.", user });
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Sunucu hatası." });
  }
};

export const deleteProfile = async (req, res) => {
  try {
    await userService.deleteUserProfile(req.userId);
    res.json({ message: "Hesap başarıyla silindi." });
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Sunucu hatası." });
  }
};
