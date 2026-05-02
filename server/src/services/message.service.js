import pool from "../config/db.js";

// Veritabanından mesajı siler
export const deleteMessage = async ({ messageId, userId }) => {
  // Mesaj bu kullanıcıya mı ait kontrolü yap
  const result = await pool.query(
    "SELECT id, room_id FROM messages WHERE id = $1 AND user_id = $2",
    [messageId, userId],
  );

  if (result.rows.length === 0) {
    throw { status: 403, message: "Bu mesajı silme yetkiniz yok." };
  }

  // Mesajı veritabanından kalıcı olarak sil
  await pool.query("DELETE FROM messages WHERE id = $1", [messageId]);

  return { messageId, roomId: result.rows[0].room_id };
};

// Veritabanındaki mevcut bir mesajı günceller
export const editMessage = async ({ messageId, userId, content }) => {
  if (!content?.trim()) {
    throw { status: 400, message: "Mesaj boş olamaz." };
  }

  // Yetki varsa güncelle ve sonucu döndür
  const result = await pool.query(
    `UPDATE messages 
     SET content = $1, updated_at = NOW()
     WHERE id = $2 AND user_id = $3
     RETURNING id, content, room_id, updated_at`,
    [content.trim(), messageId, userId],
  );

  if (result.rows.length === 0) {
    throw { status: 403, message: "Bu mesajı düzenleme yetkiniz yok." };
  }

  return result.rows[0];
};
