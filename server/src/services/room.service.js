import pool from "../config/db.js";

export const getAllRooms = async () => {
  const result = await pool.query(
    "SELECT id, name, description, created_at FROM rooms ORDER BY created_at ASC",
  );
  return result.rows;
};

export const createRoom = async ({ name, description, userId }) => {
  if (!name?.trim()) {
    throw { status: 400, message: "Oda adı zorunludur." };
  }

  const existing = await pool.query("SELECT id FROM rooms WHERE name = $1", [
    name.trim(),
  ]);

  if (existing.rows.length > 0) {
    throw { status: 409, message: "Bu isimde bir oda zaten var." };
  }

  const result = await pool.query(
    `INSERT INTO rooms (name, description, created_by)
     VALUES ($1, $2, $3)
     RETURNING id, name, description, created_at`,
    [name.trim(), description?.trim() || null, userId],
  );

  return result.rows[0];
};

export const getOnlineUsers = async () => {
  const result = await pool.query(
    "SELECT id, username, avatar_url FROM users WHERE is_online = true ORDER BY username ASC",
  );
  return result.rows;
};
