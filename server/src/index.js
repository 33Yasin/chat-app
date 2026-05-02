import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import "./config/db.js";
import authRoutes from "./routes/auth.js";
import initSocket from "./socket/index.js";
import roomRoutes from "./routes/room.js";
import messageRoutes from "./routes/message.js";

// .env dosyasındaki ortam değişkenlerini yükler
dotenv.config();

// Express uygulamasını ve HTTP sunucusunu başlat
const app = express();
const server = http.createServer(app);

// Socket.io'yu HTTP sunucusuna bağla
initSocket(server);

// CORS ayarları (Gelen isteklere izin ver) ve JSON parse işlemi
app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());

// Tanımlanmış yönlendirme (route) yollarını uygulamaya ekle
app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/messages", messageRoutes);

// Sunucunun çalışıp çalışmadığını test etmek için kök rota
app.get("/", (req, res) => {
  res.json({ message: "🚀 Chat App Server çalışıyor!" });
});

// Sunucuyu dinlemeye başla
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server ${PORT} portunda çalışıyor`);
});
