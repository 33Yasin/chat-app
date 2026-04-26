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

  // Yeni oda modal
  const [showModal, setShowModal] = useState(false);
  const [newRoom, setNewRoom] = useState({ name: "", description: "" });
  const [roomError, setRoomError] = useState("");
  const [roomLoading, setRoomLoading] = useState(false);

  const typingTimeout = useRef(null);
  const messagesEndRef = useRef(null);

  // Odaları ve online kullanıcıları çek
  useEffect(() => {
    api.get("/rooms").then((res) => setRooms(res.data.rooms));
    api
      .get("/rooms/online-users")
      .then((res) => setOnlineUsers(res.data.users));
  }, []);

  // Socket eventleri
  useEffect(() => {
    if (!socket) return;

    socket.on("messages:history", (msgs) => setMessages(msgs));

    socket.on("message:receive", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("typing:update", ({ username, isTyping }) => {
      setTypingUser(isTyping ? `${username} yazıyor...` : "");
    });

    socket.on("user:online", ({ userId, username }) => {
      setOnlineUsers((prev) => {
        const exists = prev.find((u) => u.id === userId);
        if (exists) return prev;
        return [...prev, { id: userId, username }];
      });
    });

    socket.on("user:offline", ({ userId }) => {
      setOnlineUsers((prev) => prev.filter((u) => u.id !== userId));
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

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Yeni oda oluştur
  const handleCreateRoom = async () => {
    setRoomError("");
    setRoomLoading(true);
    try {
      const res = await api.post("/rooms", newRoom);
      const created = res.data.room;
      setRooms((prev) => [...prev, created]);
      setNewRoom({ name: "", description: "" });
      setShowModal(false);
      joinRoom(created);
    } catch (err) {
      setRoomError(err.response?.data?.message || "Bir hata oluştu.");
    } finally {
      setRoomLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sol Sidebar — Odalar */}
      <div className="w-60 bg-gray-800 flex flex-col border-r border-gray-700">
        <div className="p-4 border-b border-gray-700">
          <h2 className="font-bold text-lg">💬 Chat App</h2>
          <p className="text-gray-400 text-sm">@{user?.username}</p>
        </div>

        {/* Oda listesi */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="flex items-center justify-between px-2 mb-2">
            <p className="text-gray-500 text-xs uppercase">Odalar</p>
            <button
              onClick={() => setShowModal(true)}
              className="text-gray-400 hover:text-white text-lg leading-none transition"
              title="Yeni oda oluştur"
            >
              +
            </button>
          </div>

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

      {/* Ana Chat Alanı */}
      <div className="flex-1 flex flex-col">
        {activeRoom ? (
          <>
            <div className="p-4 border-b border-gray-700 bg-gray-800">
              <h3 className="font-semibold"># {activeRoom.name}</h3>
              {activeRoom.description && (
                <p className="text-gray-400 text-sm">
                  {activeRoom.description}
                </p>
              )}
            </div>

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

              {typingUser && (
                <p className="text-gray-400 text-sm italic">{typingUser}</p>
              )}
              <div ref={messagesEndRef} />
            </div>

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

      {/* Sağ Sidebar — Online Kullanıcılar */}
      <div className="w-52 bg-gray-800 border-l border-gray-700 p-4">
        <p className="text-gray-500 text-xs uppercase mb-3">
          Online — {onlineUsers.length}
        </p>
        <div className="space-y-2">
          {onlineUsers.map((u) => (
            <div key={u.id} className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full" />
              <span
                className={`text-sm ${u.id === user?.id ? "text-indigo-400 font-semibold" : "text-gray-300"}`}
              >
                {u.username} {u.id === user?.id && "(sen)"}
              </span>
            </div>
          ))}
          {onlineUsers.length === 0 && (
            <p className="text-gray-600 text-sm">Kimse yok</p>
          )}
        </div>
      </div>

      {/* Yeni Oda Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Yeni Oda Oluştur</h3>

            {roomError && (
              <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">
                {roomError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-gray-300 text-sm mb-1 block">
                  Oda Adı *
                </label>
                <input
                  type="text"
                  placeholder="örn: teknoloji"
                  value={newRoom.name}
                  onChange={(e) =>
                    setNewRoom({ ...newRoom, name: e.target.value })
                  }
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-gray-300 text-sm mb-1 block">
                  Açıklama
                </label>
                <input
                  type="text"
                  placeholder="Oda hakkında kısa bir açıklama"
                  value={newRoom.description}
                  onChange={(e) =>
                    setNewRoom({ ...newRoom, description: e.target.value })
                  }
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowModal(false);
                  setRoomError("");
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg transition"
              >
                İptal
              </button>
              <button
                onClick={handleCreateRoom}
                disabled={roomLoading}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg transition disabled:opacity-50"
              >
                {roomLoading ? "Oluşturuluyor..." : "Oluştur"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;
