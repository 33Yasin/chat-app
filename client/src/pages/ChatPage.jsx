import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import useSocket from "../hooks/useSocket.js";
import api from "../services/api.js";

const ChatPage = () => {
  const { user, logout } = useAuth();
  const token = localStorage.getItem("token");
  const socket = useSocket(token);

  // Chat State
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [typingUser, setTypingUser] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [newRoom, setNewRoom] = useState({ name: "", description: "" });
  const [roomError, setRoomError] = useState("");
  const [roomLoading, setRoomLoading] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [hoveredId, setHoveredId] = useState(null);

  // Room State
  const [roomMenuId, setRoomMenuId] = useState(null);
  const [editingRoom, setEditingRoom] = useState(null);
  const [editRoomError, setEditRoomError] = useState("");
  const [editRoomLoading, setEditRoomLoading] = useState(false);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Profile State
  const [showProfile, setShowProfile] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [editUsername, setEditUsername] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState("");

  // emoji picker
  const [emojiPickerMsgId, setEmojiPickerMsgId] = useState(null);

  const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "👏", "🎉"];

  const filteredMessages = searchQuery.trim()
    ? messages.filter(
        (m) =>
          m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.username?.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : messages;

  const typingTimeout = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    api.get("/rooms").then((res) => setRooms(res.data.rooms));
    api
      .get("/rooms/online-users")
      .then((res) => setOnlineUsers(res.data.users));
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on("messages:history", (msgs) => setMessages(msgs));
    socket.on("message:receive", (msg) =>
      setMessages((prev) => [...prev, msg]),
    );
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
    socket.on("message:deleted", ({ messageId }) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    });
    socket.on("message:edited", ({ messageId, content, updated_at }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, content, updated_at } : m,
        ),
      );
    });
    socket.on("room:deleted", ({ roomId }) => {
      setRooms((prev) => prev.filter((r) => r.id !== roomId));
      setActiveRoom((prev) => (prev?.id === roomId ? null : prev));
      setMessages((prev) => (activeRoom?.id === roomId ? [] : prev));
    });
    socket.on("room:updated", (updatedRoom) => {
      setRooms((prev) =>
        prev.map((r) => (r.id === updatedRoom.id ? updatedRoom : r)),
      );
      setActiveRoom((prev) =>
        prev?.id === updatedRoom.id ? updatedRoom : prev,
      );
    });
    socket.on("reaction:updated", ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, reactions } : m)),
      );
    });

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
      socket.off("reaction:updated");
    };
  }, [socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const joinRoom = (room) => {
    if (activeRoom?.id === room.id) return;
    setActiveRoom(room);
    setMessages([]);
    setSearchOpen(false);
    setSearchQuery("");
    socket.emit("room:join", room.id);
  };

  const sendMessage = () => {
    if (!input.trim() || !activeRoom) return;
    socket.emit("message:send", { roomId: activeRoom.id, content: input });
    setInput("");
    socket.emit("typing:stop", { roomId: activeRoom.id });
  };

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

  const deleteMessage = (messageId) => {
    socket.emit("message:delete", { messageId, roomId: activeRoom.id });
  };

  const startEdit = (msg) => {
    setEditingId(msg.id);
    setEditContent(msg.content);
  };

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

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent("");
  };

  const handleDeleteRoom = (roomId) => {
    socket.emit("room:delete", { roomId });
    setRoomMenuId(null);
  };

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

  const openProfile = async () => {
    try {
      const res = await api.get("/users/profile");
      setProfileData(res.data.user);
      setEditUsername(res.data.user.username);
      setProfileError("");
      setProfileSuccess("");
      setShowProfile(true);
    } catch (err) {
      console.error("Profil yüklenemedi:", err);
    }
  };

  const handleUpdateProfile = async () => {
    setProfileError("");
    setProfileSuccess("");
    setProfileLoading(true);
    try {
      const res = await api.put("/users/profile", { username: editUsername });
      setProfileData(res.data.user);
      setProfileSuccess("Profil güncellendi!");

      // Auth context'teki user'ı da güncelle
      // (AuthContext'e updateUser ekleyeceğiz)
    } catch (err) {
      setProfileError(err.response?.data?.message || "Bir hata oluştu.");
    } finally {
      setProfileLoading(false);
    }
  };

  const toggleReaction = (messageId, emoji) => {
    socket.emit("reaction:toggle", {
      messageId,
      roomId: activeRoom.id,
      emoji,
    });
    setEmojiPickerMsgId(null);
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

                {room.created_by === user?.id && (
                  <button
                    onClick={() =>
                      setRoomMenuId(roomMenuId === room.id ? null : room.id)
                    }
                    className="text-gray-400 hover:text-white w-6 h-6 flex items-center justify-center rounded transition shrink-0"
                  >
                    ⚙️
                  </button>
                )}
              </div>

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

        <div className="p-4 border-t border-gray-700 space-y-2">
          <button
            onClick={openProfile}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-700 transition"
          >
            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-sm font-bold shrink-0">
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div className="text-left overflow-hidden">
              <p className="text-sm font-medium text-white truncate">
                {user?.username}
              </p>
              <p className="text-xs text-gray-400">Profili görüntüle</p>
            </div>
          </button>
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
            <div className="border-b border-gray-700 bg-gray-800">
              <div className="flex items-center justify-between p-4">
                <div>
                  <h3 className="font-semibold"># {activeRoom.name}</h3>
                  {activeRoom.description && (
                    <p className="text-gray-400 text-sm">
                      {activeRoom.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSearchOpen(!searchOpen);
                    setSearchQuery("");
                  }}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg transition ${
                    searchOpen
                      ? "bg-indigo-600 text-white"
                      : "text-gray-400 hover:text-white hover:bg-gray-700"
                  }`}
                  title="Mesajlarda ara"
                >
                  🔍
                </button>
              </div>

              {searchOpen && (
                <div className="px-4 pb-3">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Mesaj veya kullanıcı ara..."
                    autoFocus
                    className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {searchQuery && (
                    <p className="text-gray-500 text-xs mt-2 px-1">
                      {filteredMessages.length} sonuç bulundu
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {searchQuery && filteredMessages.length === 0 && (
                <div className="flex items-center justify-center h-32">
                  <p className="text-gray-500 text-sm">
                    "{searchQuery}" için sonuç bulunamadı
                  </p>
                </div>
              )}

              {filteredMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.user_id === user?.id ? "justify-end" : "justify-start"}`}
                  onMouseEnter={() => setHoveredId(msg.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <div className="relative max-w-xs lg:max-w-md">
                    {/* Düzenle / Sil butonları */}
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

                    {/* Emoji picker butonu */}
                    {hoveredId === msg.id && editingId !== msg.id && (
                      <div
                        className={`absolute -top-8 ${msg.user_id === user?.id ? "left-0" : "right-0"} z-10`}
                      >
                        <button
                          onClick={() =>
                            setEmojiPickerMsgId(
                              emojiPickerMsgId === msg.id ? null : msg.id,
                            )
                          }
                          className="bg-gray-700 hover:bg-gray-600 text-sm px-2 py-1 rounded-lg shadow-lg transition"
                        >
                          😊
                        </button>
                      </div>
                    )}

                    {/* Emoji picker dropdown */}
                    {emojiPickerMsgId === msg.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setEmojiPickerMsgId(null)}
                        />
                        <div
                          className={`absolute -top-16 ${msg.user_id === user?.id ? "left-0" : "right-0"} bg-gray-700 rounded-xl shadow-2xl z-20 p-2 flex gap-1`}
                        >
                          {EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => toggleReaction(msg.id, emoji)}
                              className="text-xl hover:bg-gray-600 w-9 h-9 flex items-center justify-center rounded-lg transition hover:scale-125"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Mesaj balonu */}
                    <div
                      className={`px-4 py-2 rounded-2xl ${
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
                            { hour: "2-digit", minute: "2-digit" },
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Reaksiyonlar */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div
                        className={`flex flex-wrap gap-1 mt-1 ${msg.user_id === user?.id ? "justify-end" : "justify-start"}`}
                      >
                        {msg.reactions.map((reaction) => (
                          <button
                            key={reaction.emoji}
                            onClick={() =>
                              toggleReaction(msg.id, reaction.emoji)
                            }
                            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition ${
                              reaction.user_ids?.includes(user?.id)
                                ? "bg-indigo-600/30 border-indigo-500 text-white"
                                : "bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-400"
                            }`}
                          >
                            <span>{reaction.emoji}</span>
                            <span>{reaction.count}</span>
                          </button>
                        ))}
                      </div>
                    )}
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

      {/* Profil Modal */}
      {showProfile && profileData && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Profil</h3>
              <button
                onClick={() => setShowProfile(false)}
                className="text-gray-400 hover:text-white transition"
              >
                ✕
              </button>
            </div>
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center text-3xl font-bold">
                {profileData.username?.[0]?.toUpperCase()}
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-xs uppercase mb-1 block">
                  Email
                </label>
                <p className="text-white bg-gray-700 px-4 py-3 rounded-lg text-sm">
                  {profileData.email}
                </p>
              </div>
              <div>
                <label className="text-gray-300 text-xs uppercase mb-1 block">
                  Kullanıcı Adı
                </label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs uppercase mb-1 block">
                  Üyelik Tarihi
                </label>
                <p className="text-gray-300 bg-gray-700 px-4 py-3 rounded-lg text-sm">
                  {new Date(profileData.created_at).toLocaleDateString(
                    "tr-TR",
                    { year: "numeric", month: "long", day: "numeric" },
                  )}
                </p>
              </div>
            </div>
            {profileError && (
              <div className="mt-4 bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg text-sm">
                {profileError}
              </div>
            )}
            {profileSuccess && (
              <div className="mt-4 bg-green-500/20 border border-green-500 text-green-400 px-4 py-3 rounded-lg text-sm">
                {profileSuccess}
              </div>
            )}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowProfile(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg transition"
              >
                Kapat
              </button>
              <button
                onClick={handleUpdateProfile}
                disabled={
                  profileLoading || editUsername === profileData.username
                }
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg transition disabled:opacity-50"
              >
                {profileLoading ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;
