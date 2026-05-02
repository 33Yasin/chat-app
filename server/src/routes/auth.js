import express from "express";
import { register, login, getMe } from "../controllers/auth.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

// Yeni kullanıcı kaydı
router.post("/register", register);
// Kullanıcı girişi
router.post("/login", login);
// Mevcut kullanıcının kendi bilgilerini alması (middleware ile korunuyor)
router.get("/me", authMiddleware, getMe);

export default router;
