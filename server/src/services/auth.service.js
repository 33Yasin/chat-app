import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";

const generateToken = (userId) => {
  // Verilen ID için secret key ile JWT oluşturur
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// Yeni kullanıcı kaydını veritabanına ekler
export const registerUser = async ({ username, email, password }) => {
  if (!username || !email || !password) {
    throw { status: 400, message: "Tüm alanlar zorunludur." };
  }

  // Bu email veya kullanıcı adı kullanımda mı kontrol et
  const existing = await pool.query(
    "SELECT id FROM users WHERE email = $1 OR username = $2",
    [email, username],
  );

  if (existing.rows.length > 0) {
    throw {
      status: 409,
      message: "Bu email veya kullanıcı adı zaten kullanılıyor.",
    };
  }

  // Şifreyi şifrele (hashing)
  const hashedPassword = await bcrypt.hash(password, 12);

  // Veritabanına yeni kullanıcı ekle
  const result = await pool.query(
    `INSERT INTO users (username, email, password) 
     VALUES ($1, $2, $3) 
     RETURNING id, username, email, created_at`,
    [username, email, hashedPassword],
  );

  const user = result.rows[0];
  const token = generateToken(user.id);

  return { user, token };
};

// Kullanıcı girişini kontrol eder ve token döndürür
export const loginUser = async ({ email, password }) => {
  if (!email || !password) {
    throw { status: 400, message: "Email ve şifre zorunludur." };
  }

  // Kullanıcıyı veritabanından email ile bul
  const result = await pool.query("SELECT * FROM users WHERE email = $1", [
    email,
  ]);

  if (result.rows.length === 0) {
    throw { status: 401, message: "Email veya şifre hatalı." };
  }

  const user = result.rows[0];
  // Şifre eşleşiyor mu kontrol et
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw { status: 401, message: "Email veya şifre hatalı." };
  }

  // Kullanıcıyı çevrimiçi (online) olarak işaretle
  await pool.query("UPDATE users SET is_online = true WHERE id = $1", [
    user.id,
  ]);

  const token = generateToken(user.id);

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
    },
  };
};

// Kullanıcıyı ID'sine göre bulur
export const getUserById = async (userId) => {
  const result = await pool.query(
    "SELECT id, username, email, avatar_url, is_online, created_at FROM users WHERE id = $1",
    [userId],
  );

  if (result.rows.length === 0) {
    throw { status: 404, message: "Kullanıcı bulunamadı." };
  }

  return result.rows[0];
};
