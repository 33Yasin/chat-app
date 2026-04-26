import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import "./config/db.js";
import authRoutes from "./routes/auth.js";
import initSocket from "./socket/index.js";
import roomRoutes from "./routes/room.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

// Socket.io başlat
initSocket(server);

app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);

app.get("/", (req, res) => {
  res.json({ message: "🚀 Chat App Server çalışıyor!" });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server ${PORT} portunda çalışıyor`);
});
