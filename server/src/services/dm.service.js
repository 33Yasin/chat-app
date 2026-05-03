import pool from "../config/db.js";

// İki kullanıcı arasındaki DM geçmişini getir
export const getConversation = async ({ userId, otherUserId }) => {
  const result = await pool.query(
    `SELECT dm.id, dm.content, dm.created_at, dm.updated_at, dm.is_read,
            dm.sender_id, dm.receiver_id,
            u.username as sender_username
     FROM direct_messages dm
     JOIN users u ON dm.sender_id = u.id
     WHERE (dm.sender_id = $1 AND dm.receiver_id = $2)
        OR (dm.sender_id = $2 AND dm.receiver_id = $1)
     ORDER BY dm.created_at ASC
     LIMIT 50`,
    [userId, otherUserId],
  );
  return result.rows;
};

// DM gönder
export const sendDM = async ({ senderId, receiverId, content }) => {
  if (!content?.trim()) {
    throw { status: 400, message: "Mesaj boş olamaz." };
  }

  const result = await pool.query(
    `INSERT INTO direct_messages (content, sender_id, receiver_id)
     VALUES ($1, $2, $3)
     RETURNING id, content, sender_id, receiver_id, created_at`,
    [content.trim(), senderId, receiverId],
  );

  return result.rows[0];
};

// Okunmamış DM sayısını getir
export const getUnreadCount = async (userId) => {
  const result = await pool.query(
    `SELECT sender_id, COUNT(*) as count
     FROM direct_messages
     WHERE receiver_id = $1 AND is_read = false
     GROUP BY sender_id`,
    [userId],
  );
  return result.rows;
};

// Mesajları okundu olarak işaretle
export const markAsRead = async ({ userId, otherUserId }) => {
  await pool.query(
    `UPDATE direct_messages 
     SET is_read = true
     WHERE receiver_id = $1 AND sender_id = $2 AND is_read = false`,
    [userId, otherUserId],
  );
};

// Konuşma listesini getir (son mesajlarla)
export const getConversationList = async (userId) => {
  const result = await pool.query(
    `SELECT DISTINCT ON (other_user_id)
            u.id as other_user_id,
            u.username as other_username,
            u.is_online,
            dm.content as last_message,
            dm.created_at as last_message_at,
            dm.sender_id as last_sender_id,
            COUNT(dm2.id) FILTER (WHERE dm2.is_read = false AND dm2.receiver_id = $1) as unread_count
     FROM direct_messages dm
     JOIN users u ON (
       CASE WHEN dm.sender_id = $1 THEN dm.receiver_id ELSE dm.sender_id END = u.id
     )
     LEFT JOIN direct_messages dm2 ON dm2.sender_id = u.id AND dm2.receiver_id = $1
     WHERE dm.sender_id = $1 OR dm.receiver_id = $1
     GROUP BY u.id, u.username, u.is_online, dm.content, dm.created_at, dm.sender_id
     ORDER BY other_user_id, dm.created_at DESC`,
    [userId],
  );
  return result.rows;
};
