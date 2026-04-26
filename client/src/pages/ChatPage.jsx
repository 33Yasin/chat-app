import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import useSocket from "../hooks/useSocket.js";
import api from "../services/api.js";

const ChatPage = () => {
  const { user, logout } = useAuth();
  const token = localStorage.getItem("token");
  const socket = useSocket(token);

  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [typingUser, setTypingUser] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const typingTimeout = useRef(null);
  const messagesEndRef = useRef(null);

  // Odaları çek
  useEffect(() => {
    api.get("/rooms").then((res) => setRooms(res.data.rooms));
  }, []);

  // Socket eventlerini dinle
  useEffect(() => {
    if (!socket) return;

    socket.on("messages:history", (msgs) => setMessages(msgs));

    socket.on("message:receive", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("typing:update", ({ username, isTyping }) => {
      setTypingUser(isTyping ? `${username} yazıyor...` : "");
    });

    socket.on("user:online", ({ username }) => {
      setOnlineUsers((prev) => [...new Set([...prev, username])]);
    });

    socket.on("user:offline", ({ username }) => {
      setOnlineUsers((prev) => prev.filter((u) => u !== username));
    });

    return () => {
      socket.off("messages:history");
      socket.off("message:receive");
      socket.off("typing:update");
      socket.off("user:online");
      socket.off("user:offline");
    };
  }, [socket]);

  // Otomatik scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Odaya katıl
  const joinRoom = (room) => {
    if (activeRoom?.id === room.id) return;
    setActiveRoom(room);
    setMessages([]);
    socket.emit("room:join", room.id);
  };

  // Mesaj gönder
  const sendMessage = () => {
    if (!input.trim() || !activeRoom) return;
    socket.emit("message:send", { roomId: activeRoom.id, content: input });
    setInput("");
    socket.emit("typing:stop", { roomId: activeRoom.id });
  };

  // Yazıyor göstergesi
  const handleTyping = (e) => {
    setInput(e.target.value);
    if (!activeRoom) return;

    socket.emit("typing:start", { roomId: activeRoom.id });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit("typing:stop", { roomId: activeRoom.id });
    }, 1500);
  };

  // Enter ile gönder
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h2 className="font-bold text-lg">💬 Chat App</h2>
          <p className="text-gray-400 text-sm">@{user?.username}</p>
        </div>

        {/* Oda listesi */}
        <div className="flex-1 overflow-y-auto p-3">
          <p className="text-gray-500 text-xs uppercase mb-2 px-2">Odalar</p>
          {rooms.map((room) => (
            <button
              key={room.id}
              onClick={() => joinRoom(room)}
              className={`w-full text-left px-3 py-2 rounded-lg mb-1 transition ${
                activeRoom?.id === room.id
                  ? "bg-indigo-600 text-white"
                  : "text-gray-300 hover:bg-gray-700"
              }`}
            >
              # {room.name}
            </button>
          ))}
        </div>

        {/* Çıkış */}
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={logout}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm transition"
          >
            Çıkış Yap
          </button>
        </div>
      </div>

      {/* Ana chat alanı */}
      <div className="flex-1 flex flex-col">
        {activeRoom ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-gray-700 bg-gray-800">
              <h3 className="font-semibold"># {activeRoom.name}</h3>
              <p className="text-gray-400 text-sm">{activeRoom.description}</p>
            </div>

            {/* Mesajlar */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.user_id === user?.id ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                      msg.user_id === user?.id
                        ? "bg-indigo-600 text-white rounded-br-none"
                        : "bg-gray-700 text-white rounded-bl-none"
                    }`}
                  >
                    {msg.user_id !== user?.id && (
                      <p className="text-indigo-400 text-xs font-semibold mb-1">
                        {msg.username}
                      </p>
                    )}
                    <p>{msg.content}</p>
                    <p className="text-xs opacity-60 mt-1 text-right">
                      {new Date(msg.created_at).toLocaleTimeString("tr-TR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}

              {/* Yazıyor göstergesi */}
              {typingUser && (
                <p className="text-gray-400 text-sm italic">{typingUser}</p>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Mesaj input */}
            <div className="p-4 border-t border-gray-700 bg-gray-800">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={handleTyping}
                  onKeyDown={handleKeyDown}
                  placeholder={`#${activeRoom.name} odasına mesaj yaz...`}
                  className="flex-1 bg-gray-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={sendMessage}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl transition"
                >
                  Gönder
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <p className="text-4xl mb-3">💬</p>
              <p className="text-xl">Bir oda seç ve sohbete başla!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
