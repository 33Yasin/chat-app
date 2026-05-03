import pool from "../config/db.js";

export const getUserProfile = async (userId) => {
  const result = await pool.query(
    "SELECT id, username, email, avatar_url, is_online, created_at FROM users WHERE id = $1",
    [userId],
  );

  if (result.rows.length === 0) {
    throw { status: 404, message: "Kullanıcı bulunamadı." };
  }

  return result.rows[0];
};

export const updateUserProfile = async ({ userId, username }) => {
  if (!username?.trim()) {
    throw { status: 400, message: "Kullanıcı adı boş olamaz." };
  }

  // Kullanıcı adı başkası tarafından kullanılıyor mu?
  const existing = await pool.query(
    "SELECT id FROM users WHERE username = $1 AND id != $2",
    [username.trim(), userId],
  );

  if (existing.rows.length > 0) {
    throw { status: 409, message: "Bu kullanıcı adı zaten kullanılıyor." };
  }

  const result = await pool.query(
    `UPDATE users 
     SET username = $1 
     WHERE id = $2 
     RETURNING id, username, email, avatar_url, created_at`,
    [username.trim(), userId],
  );

  return result.rows[0];
};
