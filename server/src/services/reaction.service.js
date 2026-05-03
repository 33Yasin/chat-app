import pool from "../config/db.js";

export const toggleReaction = async ({ messageId, userId, emoji }) => {
  // Reaksiyon zaten var mı?
  const existing = await pool.query(
    "SELECT id FROM reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3",
    [messageId, userId, emoji],
  );

  if (existing.rows.length > 0) {
    // Varsa kaldır
    await pool.query(
      "DELETE FROM reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3",
      [messageId, userId, emoji],
    );
    return { action: "removed", messageId, userId, emoji };
  } else {
    // Yoksa ekle
    await pool.query(
      "INSERT INTO reactions (message_id, user_id, emoji) VALUES ($1, $2, $3)",
      [messageId, userId, emoji],
    );
    return { action: "added", messageId, userId, emoji };
  }
};

export const getReactionsByMessage = async (messageId) => {
  const result = await pool.query(
    `SELECT emoji, COUNT(*) as count, 
            ARRAY_AGG(user_id) as user_ids
     FROM reactions 
     WHERE message_id = $1 
     GROUP BY emoji`,
    [messageId],
  );
  return result.rows;
};
