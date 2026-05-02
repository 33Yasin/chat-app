import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import useSocket from "../hooks/useSocket.js";
import api from "../services/api.js";

const ChatPage = () => {
  const { user, logout } = useAuth();
  const token = localStorage.getItem("token");
  // Socket bağlantısını başlat
  const socket = useSocket(token);

  // Uygulama stateleri
  const [rooms, setRooms] = useState([]); // Tüm odalar
  const [activeRoom, setActiveRoom] = useState(null); // Seçili oda
  const [messages, setMessages] = useState([]); // Odadaki mesajlar
  const [input, setInput] = useState(""); // Mesaj yazma alanı
  const [typingUser, setTypingUser] = useState(""); // "Yazıyor..." uyarısı
  const [onlineUsers, setOnlineUsers] = useState([]); // Çevrimiçi kullanıcılar

  // Oda oluşturma modalı stateleri
  const [showModal, setShowModal] = useState(false);
  const [newRoom, setNewRoom] = useState({ name: "", description: "" });
  const [roomError, setRoomError] = useState("");
  const [roomLoading, setRoomLoading] = useState(false);

  // Mesaj düzenleme stateleri
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [hoveredId, setHoveredId] = useState(null);

  // Oda düzenleme stateleri
  const [roomMenuId, setRoomMenuId] = useState(null);
  const [editingRoom, setEditingRoom] = useState(null); // { id, name, description }
  const [editRoomError, setEditRoomError] = useState("");
  const [editRoomLoading, setEditRoomLoading] = useState(false);

  const typingTimeout = useRef(null);
  // Mesaj listesinin sonuna kaydırma için referans
  const messagesEndRef = useRef(null);

  // Sayfa yüklendiğinde odaları ve çevrimiçi kullanıcıları çek
  useEffect(() => {
    api.get("/rooms").then((res) => setRooms(res.data.rooms));
    api
      .get("/rooms/online-users")
      .then((res) => setOnlineUsers(res.data.users));
  }, []);

  // Socket olay dinleyicileri
  useEffect(() => {
    if (!socket) return;

    // Odanın mesaj geçmişini al
    socket.on("messages:history", (msgs) => setMessages(msgs));
    // Yeni gelen mesajı listeye ekle
    socket.on("message:receive", (msg) =>
      setMessages((prev) => [...prev, msg]),
    );
    // Yazıyor... statüsünü güncelle
    socket.on("typing:update", ({ username, isTyping }) => {
      setTypingUser(isTyping ? `${username} yazıyor...` : "");
    });
    // Biri çevrimiçi olduğunda listeye ekle
    socket.on("user:online", ({ userId, username }) => {
      setOnlineUsers((prev) => {
        const exists = prev.find((u) => u.id === userId);
        if (exists) return prev;
        return [...prev, { id: userId, username }];
      });
    });
    // Biri çıkış yaptığında listeden çıkar
    socket.on("user:offline", ({ userId }) => {
      setOnlineUsers((prev) => prev.filter((u) => u.id !== userId));
    });
    // Telefondan silinen mesajı arayüzden de sil
    socket.on("message:deleted", ({ messageId }) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    });
    // Düzenlenen mesajın içeriğini güncelle
    socket.on("message:edited", ({ messageId, content, updated_at }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, content, updated_at } : m,
        ),
      );
    });

    // Oda silindiğinde
    socket.on("room:deleted", ({ roomId }) => {
      setRooms((prev) => prev.filter((r) => r.id !== roomId));
      setActiveRoom((prev) => (prev?.id === roomId ? null : prev));
      setMessages((prev) => (activeRoom?.id === roomId ? [] : prev));
    });

    // Oda güncellendiğinde
    socket.on("room:updated", (updatedRoom) => {
      setRooms((prev) =>
        prev.map((r) => (r.id === updatedRoom.id ? updatedRoom : r)),
      );
      setActiveRoom((prev) =>
        prev?.id === updatedRoom.id ? updatedRoom : prev,
      );
    });

    // Cleanup: Component unmount olduğunda tüm dinleyicileri kaldır
    return () => {
      socket.off("messages:history");
      socket.off("message:receive");
      socket.off("typing:update");
      socket.off("user:online");
      socket.off("user:offline");
      socket.off("message:deleted");
      socket.off("message:edited");
      socket.off("room:deleted");
      socket.off("room:updated");
    };
  }, [socket]);

  // Mesajlar değiştiğinde her zaman en alta kaydır
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Yeni bir odaya katıl
  const joinRoom = (room) => {
    if (activeRoom?.id === room.id) return;
    setActiveRoom(room);
    setMessages([]);
    socket.emit("room:join", room.id); // Sunucuya odaya katıldığımızı bildir
  };

  // Yeni mesaj gönder
  const sendMessage = () => {
    if (!input.trim() || !activeRoom) return;
    socket.emit("message:send", { roomId: activeRoom.id, content: input });
    setInput("");
    socket.emit("typing:stop", { roomId: activeRoom.id }); // Gönderince yazıyor statüsünü durdur
  };

  // Yazma eylemini algıla ve diğer kullanıcılara bildir
  const handleTyping = (e) => {
    setInput(e.target.value);
    if (!activeRoom) return;
    socket.emit("typing:start", { roomId: activeRoom.id });
    // 1.5 saniye yazılmadığında yazıyor durumunu kapat
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit("typing:stop", { roomId: activeRoom.id });
    }, 1500);
  };

  // Enter tuşuna basıldığında mesajı gönder (Shift+Enter alt satıra geçer)
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
      joinRoom(created); // Oluşturulan odaya otomatik olarak katıl
    } catch (err) {
      setRoomError(err.response?.data?.message || "Bir hata oluştu.");
    } finally {
      setRoomLoading(false);
    }
  };

  // Mesaj silme işlemi
  const deleteMessage = (messageId) => {
    socket.emit("message:delete", { messageId, roomId: activeRoom.id });
  };

  // Düzenleme modunu aktifleştir
  const startEdit = (msg) => {
    setEditingId(msg.id);
    setEditContent(msg.content);
  };

  // Düzenlenen mesajı kaydet
  const submitEdit = (messageId) => {
    if (!editContent.trim()) return;
    socket.emit("message:edit", {
      messageId,
      roomId: activeRoom.id,
      content: editContent,
    });
    setEditingId(null);
    setEditContent("");
  };

  // Düzenlemeyi iptal et
  const cancelEdit = () => {
    setEditingId(null);
    setEditContent("");
  };

  // Oda silme işlemi
  const handleDeleteRoom = (roomId) => {
    socket.emit("room:delete", { roomId });
    setRoomMenuId(null);
  };

  // Oda düzenleme işlemi
  const handleUpdateRoom = async () => {
    setEditRoomError("");
    setEditRoomLoading(true);
    try {
      socket.emit("room:update", {
        roomId: editingRoom.id,
        name: editingRoom.name,
        description: editingRoom.description,
      });
      setEditingRoom(null);
    } catch (err) {
      setEditRoomError("Bir hata oluştu.");
    } finally {
      setEditRoomLoading(false);
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

          {/* {rooms.map((room) => (
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
          ))} */}

          {rooms.map((room) => (
            <div key={room.id} className="relative">
              <div
                className={`flex items-center justify-between rounded-lg mb-1 pr-1 ${
                  activeRoom?.id === room.id
                    ? "bg-indigo-600"
                    : "hover:bg-gray-700"
                }`}
              >
                <button
                  onClick={() => joinRoom(room)}
                  className={`flex-1 text-left px-3 py-2 text-sm transition ${
                    activeRoom?.id === room.id ? "text-white" : "text-gray-300"
                  }`}
                >
                  # {room.name}
                </button>

                {/* Sadece oda sahibine ⚙️ göster */}
                {room.created_by === user?.id && (
                  <button
                    onClick={() =>
                      setRoomMenuId(roomMenuId === room.id ? null : room.id)
                    }
                    className="text-gray-400 hover:text-white w-6 h-6 flex items-center justify-center rounded transition flex-shrink-0"
                  >
                    ⚙️
                  </button>
                )}
              </div>

              {/* Dropdown menü */}
              {roomMenuId === room.id && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setRoomMenuId(null)}
                  />
                  <div className="absolute left-0 top-9 bg-gray-700 rounded-xl shadow-2xl z-20 overflow-hidden w-40">
                    <button
                      onClick={() => {
                        setEditingRoom({
                          id: room.id,
                          name: room.name,
                          description: room.description || "",
                        });
                        setRoomMenuId(null);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-200 hover:bg-gray-600 transition"
                    >
                      ✏️ <span>Düzenle</span>
                    </button>
                    <div className="border-t border-gray-600" />
                    <button
                      onClick={() => handleDeleteRoom(room.id)}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-gray-600 transition"
                    >
                      🗑️ <span>Sil</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

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
                  onMouseEnter={() => setHoveredId(msg.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <div className="relative">
                    {/* Aksiyon butonları */}
                    {msg.user_id === user?.id &&
                      hoveredId === msg.id &&
                      editingId !== msg.id && (
                        <div className="absolute -top-8 right-0 flex gap-1 bg-gray-700 rounded-lg px-2 py-1 shadow-lg z-10">
                          <button
                            onClick={() => startEdit(msg)}
                            className="text-gray-300 hover:text-white text-xs px-2 py-1 rounded hover:bg-gray-600 transition"
                          >
                            ✏️ Düzenle
                          </button>
                          <button
                            onClick={() => deleteMessage(msg.id)}
                            className="text-gray-300 hover:text-red-400 text-xs px-2 py-1 rounded hover:bg-gray-600 transition"
                          >
                            🗑️ Sil
                          </button>
                        </div>
                      )}

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

                      {/* Düzenleme modu */}
                      {editingId === msg.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") submitEdit(msg.id);
                              if (e.key === "Escape") cancelEdit();
                            }}
                            autoFocus
                            className="w-full bg-indigo-700 text-white px-2 py-1 rounded text-sm focus:outline-none focus:ring-1 focus:ring-white"
                          />
                          <div className="flex gap-2 text-xs">
                            <button
                              onClick={() => submitEdit(msg.id)}
                              className="text-green-300 hover:text-green-100"
                            >
                              ✓ Kaydet
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="text-gray-300 hover:text-white"
                            >
                              ✕ İptal
                            </button>
                            <span className="text-indigo-300 opacity-60">
                              ESC ile de iptal
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p>{msg.content}</p>
                      )}

                      <div className="flex items-center justify-end gap-1 mt-1">
                        {msg.updated_at && (
                          <span className="text-xs opacity-50 italic">
                            düzenlendi
                          </span>
                        )}
                        <p className="text-xs opacity-60">
                          {new Date(msg.created_at).toLocaleTimeString(
                            "tr-TR",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </p>
                      </div>
                    </div>
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
                className={`text-sm ${
                  u.id === user?.id
                    ? "text-indigo-400 font-semibold"
                    : "text-gray-300"
                }`}
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

      {/* Oda Düzenleme Modal */}
      {editingRoom && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Odayı Düzenle</h3>

            {editRoomError && (
              <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">
                {editRoomError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-gray-300 text-sm mb-1 block">
                  Oda Adı *
                </label>
                <input
                  type="text"
                  value={editingRoom.name}
                  onChange={(e) =>
                    setEditingRoom({ ...editingRoom, name: e.target.value })
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
                  value={editingRoom.description}
                  onChange={(e) =>
                    setEditingRoom({
                      ...editingRoom,
                      description: e.target.value,
                    })
                  }
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setEditingRoom(null);
                  setEditRoomError("");
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg transition"
              >
                İptal
              </button>
              <button
                onClick={handleUpdateRoom}
                disabled={editRoomLoading}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg transition disabled:opacity-50"
              >
                {editRoomLoading ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;
