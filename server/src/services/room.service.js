import pool from "../config/db.js";

// Tüm odaları oluşturulma tarihine göre sırayla getirir
export const getAllRooms = async () => {
  const result = await pool.query(
    "SELECT id, name, description, created_by, created_at FROM rooms ORDER BY created_at ASC",
  );
  return result.rows;
};

// Veritabanında yeni bir sohbet odası oluşturur
export const createRoom = async ({ name, description, userId }) => {
  if (!name?.trim()) {
    throw { status: 400, message: "Oda adı zorunludur." };
  }

  // Aynı isimde bir oda var mı diye kontrol et
  const existing = await pool.query("SELECT id FROM rooms WHERE name = $1", [
    name.trim(),
  ]);

  if (existing.rows.length > 0) {
    throw { status: 409, message: "Bu isimde bir oda zaten var." };
  }

  // Yeni odayı ekle
  const result = await pool.query(
    `INSERT INTO rooms (name, description, created_by)
     VALUES ($1, $2, $3)
     RETURNING id, name, description, created_at`,
    [name.trim(), description?.trim() || null, userId],
  );

  return result.rows[0];
};

// Yalnızca is_online durumu true olan kullanıcıları liste olarak getirir
export const getOnlineUsers = async () => {
  const result = await pool.query(
    "SELECT id, username, avatar_url FROM users WHERE is_online = true ORDER BY username ASC",
  );
  return result.rows;
};

export const updateRoom = async ({ roomId, userId, name, description }) => {
  if (!name?.trim()) {
    throw { status: 400, message: "Oda adı zorunludur." };
  }

  // Oda bu kullanıcıya ait mi?
  const room = await pool.query(
    "SELECT id FROM rooms WHERE id = $1 AND created_by = $2",
    [roomId, userId],
  );

  if (room.rows.length === 0) {
    throw { status: 403, message: "Bu odayı düzenleme yetkiniz yok." };
  }

  // İsim çakışıyor mu?
  const existing = await pool.query(
    "SELECT id FROM rooms WHERE name = $1 AND id != $2",
    [name.trim(), roomId],
  );

  if (existing.rows.length > 0) {
    throw { status: 409, message: "Bu isimde bir oda zaten var." };
  }

  const result = await pool.query(
    `UPDATE rooms 
     SET name = $1, description = $2 
     WHERE id = $3 
     RETURNING id, name, description, created_by, created_at`,
    [name.trim(), description?.trim() || null, roomId],
  );

  return result.rows[0];
};

export const deleteRoom = async ({ roomId, userId }) => {
  const room = await pool.query(
    "SELECT id, name FROM rooms WHERE id = $1 AND created_by = $2",
    [roomId, userId],
  );

  if (room.rows.length === 0) {
    throw { status: 403, message: "Bu odayı silme yetkiniz yok." };
  }

  await pool.query("DELETE FROM rooms WHERE id = $1", [roomId]);

  return { roomId, roomName: room.rows[0].name };
};
