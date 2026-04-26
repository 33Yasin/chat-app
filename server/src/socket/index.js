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
      console.log(`👤 ${user.username} odaya katıldı: ${roomId}`);

      // Odanın son 50 mesajını çek
      const messages = await pool.query(
        `SELECT m.id, m.content, m.created_at,
                u.id as user_id, u.username, u.avatar_url
         FROM messages m
         JOIN users u ON m.user_id = u.id
         WHERE m.room_id = $1
         ORDER BY m.created_at ASC
         LIMIT 50`,
        [roomId],
      );

      // Sadece bu kullanıcıya geçmiş mesajları gönder
      socket.emit("messages:history", messages.rows);

      // Odadakilere katılım bildir
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
  });

  return io;
};

export default initSocket;
