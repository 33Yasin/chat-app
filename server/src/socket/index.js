import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";

const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL,
      methods: ["GET", "POST"],
    },
  });

  // ✅ JWT Middleware — bağlanmadan önce token doğrula
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error("Token bulunamadı."));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch (error) {
      return next(new Error("Geçersiz token."));
    }
  });

  // ✅ Bağlantı olayları
  io.on("connection", async (socket) => {
    console.log(
      `✅ Kullanıcı bağlandı: ${socket.userId} (socket: ${socket.id})`,
    );

    // Kullanıcıyı online yap
    await pool.query("UPDATE users SET is_online = true WHERE id = $1", [
      socket.userId,
    ]);

    // Kullanıcı bilgisini çek
    const userResult = await pool.query(
      "SELECT id, username, avatar_url FROM users WHERE id = $1",
      [socket.userId],
    );
    const user = userResult.rows[0];

    // Tüm odalara bildir
    socket.broadcast.emit("user:online", {
      userId: socket.userId,
      username: user.username,
    });

    // ─── ODAYA KATIL ───────────────────────────────────────
    socket.on("room:join", async (roomId) => {
      socket.join(roomId);

      const messages = await pool.query(
        `SELECT m.id, m.content, m.created_at, m.updated_at,
            u.id as user_id, u.username, u.avatar_url,
            COALESCE(
              JSON_AGG(
                JSON_BUILD_OBJECT(
                  'emoji', r.emoji,
                  'count', r.reaction_count,
                  'user_ids', r.user_ids
                )
              ) FILTER (WHERE r.emoji IS NOT NULL),
              '[]'
            ) as reactions
     FROM messages m
     JOIN users u ON m.user_id = u.id
     LEFT JOIN (
       SELECT message_id, emoji, COUNT(*) as reaction_count,
              ARRAY_AGG(user_id) as user_ids
       FROM reactions
       GROUP BY message_id, emoji
     ) r ON r.message_id = m.id
     WHERE m.room_id = $1
     GROUP BY m.id, u.id, u.username, u.avatar_url
     ORDER BY m.created_at ASC
     LIMIT 50`,
        [roomId],
      );

      socket.emit("messages:history", messages.rows);

      io.to(roomId).emit("room:user_joined", {
        username: user.username,
        roomId,
      });
    });

    // ─── MESAJ GÖNDER ──────────────────────────────────────
    socket.on("message:send", async ({ roomId, content }) => {
      if (!content?.trim()) return;

      // Mesajı veritabanına kaydet
      const result = await pool.query(
        `INSERT INTO messages (content, user_id, room_id)
         VALUES ($1, $2, $3)
         RETURNING id, content, created_at`,
        [content.trim(), socket.userId, roomId],
      );

      const message = {
        ...result.rows[0],
        user_id: socket.userId,
        username: user.username,
        avatar_url: user.avatar_url,
      };

      // Odadaki herkese gönder
      io.to(roomId).emit("message:receive", message);
    });

    // ─── MESAJ SİL ─────────────────────────────────────────
    socket.on("message:delete", async ({ messageId, roomId }) => {
      try {
        await pool.query(
          "DELETE FROM messages WHERE id = $1 AND user_id = $2",
          [messageId, socket.userId],
        );
        // Odadaki herkese bildir
        io.to(roomId).emit("message:deleted", { messageId });
      } catch (error) {
        socket.emit("error", { message: "Mesaj silinemedi." });
      }
    });

    // ─── MESAJ DÜZENLE ─────────────────────────────────────
    socket.on("message:edit", async ({ messageId, roomId, content }) => {
      if (!content?.trim()) return;
      try {
        const result = await pool.query(
          `UPDATE messages 
       SET content = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING id, content, updated_at`,
          [content.trim(), messageId, socket.userId],
        );

        if (result.rows.length === 0) return;

        // Odadaki herkese bildir
        io.to(roomId).emit("message:edited", {
          messageId,
          content: result.rows[0].content,
          updated_at: result.rows[0].updated_at,
        });
      } catch (error) {
        socket.emit("error", { message: "Mesaj düzenlenemedi." });
      }
    });

    // ─── REAKSİYON TOGGLE ──────────────────────────────────
    socket.on("reaction:toggle", async ({ messageId, roomId, emoji }) => {
      try {
        // Mesajın bu odaya ait olduğunu doğrula
        const msgCheck = await pool.query(
          "SELECT id FROM messages WHERE id = $1 AND room_id = $2",
          [messageId, roomId],
        );
        if (msgCheck.rows.length === 0) return;

        // Reaksiyonu toggle et
        const existing = await pool.query(
          "SELECT id FROM reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3",
          [messageId, socket.userId, emoji],
        );

        if (existing.rows.length > 0) {
          await pool.query(
            "DELETE FROM reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3",
            [messageId, socket.userId, emoji],
          );
        } else {
          await pool.query(
            "INSERT INTO reactions (message_id, user_id, emoji) VALUES ($1, $2, $3)",
            [messageId, socket.userId, emoji],
          );
        }

        // Güncel reaksiyonları çek
        const result = await pool.query(
          `SELECT emoji, COUNT(*) as count, ARRAY_AGG(user_id) as user_ids
       FROM reactions WHERE message_id = $1 GROUP BY emoji`,
          [messageId],
        );

        // Odadaki herkese bildir
        io.to(roomId).emit("reaction:updated", {
          messageId,
          reactions: result.rows,
        });
      } catch (error) {
        console.error("Reaksiyon hatası:", error.message);
      }
    });

    // ─── YAZYOR GÖSTERGESİ ─────────────────────────────────
    socket.on("typing:start", ({ roomId }) => {
      socket.to(roomId).emit("typing:update", {
        username: user.username,
        isTyping: true,
      });
    });

    socket.on("typing:stop", ({ roomId }) => {
      socket.to(roomId).emit("typing:update", {
        username: user.username,
        isTyping: false,
      });
    });

    // ─── BAĞLANTI KESİLDİ ──────────────────────────────────
    socket.on("disconnect", async () => {
      console.log(`❌ Kullanıcı ayrıldı: ${socket.userId}`);

      await pool.query("UPDATE users SET is_online = false WHERE id = $1", [
        socket.userId,
      ]);

      socket.broadcast.emit("user:offline", {
        userId: socket.userId,
        username: user.username,
      });
    });

    // ─── ODA SİL ───────────────────────────────────────────
    socket.on("room:delete", async ({ roomId }) => {
      try {
        const result = await pool.query(
          "SELECT id FROM rooms WHERE id = $1 AND created_by = $2",
          [roomId, socket.userId],
        );

        if (result.rows.length === 0) return;

        await pool.query("DELETE FROM rooms WHERE id = $1", [roomId]);

        // Herkese bildir
        io.emit("room:deleted", { roomId });
      } catch (error) {
        socket.emit("error", { message: "Oda silinemedi." });
      }
    });

    // ─── ODA GÜNCELLE ──────────────────────────────────────
    socket.on("room:update", async ({ roomId, name, description }) => {
      try {
        const result = await pool.query(
          `UPDATE rooms 
       SET name = $1, description = $2 
       WHERE id = $3 AND created_by = $4
       RETURNING id, name, description, created_by, created_at`,
          [name.trim(), description?.trim() || null, roomId, socket.userId],
        );

        if (result.rows.length === 0) return;

        // Herkese bildir
        io.emit("room:updated", result.rows[0]);
      } catch (error) {
        socket.emit("error", { message: "Oda güncellenemedi." });
      }
    });
  });

  return io;
};

export default initSocket;
