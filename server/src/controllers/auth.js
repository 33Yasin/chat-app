import * as authService from "../services/auth.service.js";

// Yeni kullanıcı kayıt denetleyicisi
export const register = async (req, res) => {
  try {
    const data = await authService.registerUser(req.body);
    res.status(201).json({ message: "Kayıt başarılı!", ...data });
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Sunucu hatası." });
  }
};

// Kullanıcı giriş denetleyicisi
export const login = async (req, res) => {
  try {
    const data = await authService.loginUser(req.body);
    res.json({ message: "Giriş başarılı!", ...data });
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Sunucu hatası." });
  }
};

// Kendi bilgilerini getiren denetleyici
export const getMe = async (req, res) => {
  try {
    const user = await authService.getUserById(req.userId);
    res.json({ user });
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ message: error.message || "Sunucu hatası." });
  }
};
