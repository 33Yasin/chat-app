import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import useSocket from "../hooks/useSocket.js";
import api from "../services/api.js";
import {
  Search,
  Pencil,
  Trash2,
  X,
  Menu,
  Users,
  Settings,
  Plus,
  Check,
} from "lucide-react";
import DMPanel from "../components/DMPanel.jsx";

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

  // Mobile Sidebar States
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isOnlineUsersOpen, setIsOnlineUsersOpen] = useState(false);

  // Message Selection
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const [messageToDelete, setMessageToDelete] = useState(null);
  const pressTimerRef = useRef(null);

  // DM State
  const [activeDMs, setActiveDMs] = useState([]); // açık DM panelleri
  const [dmNotifications, setDmNotifications] = useState({}); // { userId: count }

  const handlePressStart = (msgId) => {
    if (editingId) return;
    pressTimerRef.current = setTimeout(() => {
      setSelectedMessageId(msgId);
      if (navigator.vibrate) navigator.vibrate(50);
    }, 400);
  };

  const handlePressEnd = () => {
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
  };

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
    socket.on("dm:notification", ({ senderId, senderUsername, content }) => {
      setDmNotifications((prev) => ({
        ...prev,
        [senderId]: (prev[senderId] || 0) + 1,
      }));
    });
    socket.on("message:read_update", ({ messageId, readCount }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, read_count: readCount } : m,
        ),
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
      socket.off("dm:notification");
      socket.off("message:read_update");
    };
  }, [socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mesajlar yüklendiğinde okundu event'i gönder
  useEffect(() => {
    if (!socket || !activeRoom || messages.length === 0) return;

    // Son 10 mesajı okundu olarak işaretle
    const recentMessages = messages.slice(-10);
    recentMessages.forEach((msg) => {
      if (msg.user_id !== user?.id) {
        socket.emit("message:read", {
          messageId: msg.id,
          roomId: activeRoom.id,
        });
      }
    });
  }, [messages, activeRoom, socket]);

  const joinRoom = (room) => {
    if (activeRoom?.id === room.id) return;
    setActiveRoom(room);
    setMessages([]);
    setSearchOpen(false);
    setSearchQuery("");
    socket.emit("room:join", room.id);
    setIsSidebarOpen(false);
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
    setEditingRoom(null);
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

  const openDM = (targetUser) => {
    // Zaten açıksa tekrar açma
    if (activeDMs.find((u) => u.id === targetUser.id)) return;
    setActiveDMs((prev) => [...prev, targetUser]);
    // Bildirimi temizle
    setDmNotifications((prev) => {
      const updated = { ...prev };
      delete updated[targetUser.id];
      return updated;
    });
  };

  const closeDM = (userId) => {
    setActiveDMs((prev) => prev.filter((u) => u.id !== userId));
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
      {/* Mobil Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sol Sidebar — Odalar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-gray-800 flex flex-col border-r border-gray-700 transform transition-transform duration-300 md:relative md:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 border-b border-gray-700">
          <h2 className="font-bold text-lg">💬 Chat App</h2>
          <p className="text-gray-400 text-sm">@{user?.username}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <div className="flex items-center justify-between px-2 mb-2">
            <p className="text-gray-500 text-xs uppercase">Odalar</p>
            <button
              onClick={() => setShowModal(true)}
              className="text-gray-400 hover:text-white transition"
              title="Yeni oda oluştur"
            >
              <Plus size={20} />
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
                    onClick={() => {
                      setEditingRoom({
                        id: room.id,
                        name: room.name,
                        description: room.description || "",
                      });
                    }}
                    className="text-gray-400 hover:text-white w-6 h-6 flex items-center justify-center rounded transition shrink-0"
                  >
                    <Settings size={18} />
                  </button>
                )}
              </div>
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
            <div className="relative z-30 border-b border-gray-700 bg-gray-800">
              {selectedMessageId ? (
                <div className="flex items-center justify-between p-3 sm:p-4 bg-indigo-900/40">
                  <div className="flex items-center gap-3 z-10">
                    <button
                      onClick={() => setSelectedMessageId(null)}
                      className="text-gray-400 hover:text-white w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-700 transition"
                      title="İptal"
                    >
                      <X size={20} />
                    </button>
                    <span className="text-sm font-semibold text-indigo-100">
                      1 Seçili
                    </span>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 z-10">
                    {messages.find((m) => m.id === selectedMessageId)
                      ?.user_id === user?.id && (
                      <>
                        <button
                          onClick={() => {
                            const msg = messages.find(
                              (m) => m.id === selectedMessageId,
                            );
                            if (msg) startEdit(msg);
                            setSelectedMessageId(null);
                          }}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-indigo-400 hover:bg-gray-700 transition"
                          title="Düzenle"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          onClick={() => {
                            setMessageToDelete(selectedMessageId);
                          }}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-400 hover:bg-gray-700 transition"
                          title="Sil"
                        >
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 sm:p-4 relative">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <button
                      onClick={() => setIsSidebarOpen(true)}
                      className="md:hidden text-gray-400 hover:text-white w-8 h-8 flex items-center justify-center rounded hover:bg-gray-700 transition"
                    >
                      <Menu size={20} />
                    </button>
                    <div>
                      <h3 className="font-semibold text-sm sm:text-base truncate max-w-[90px] sm:max-w-[200px]">
                        # {activeRoom.name}
                      </h3>
                      {activeRoom.description && (
                        <p className="text-gray-400 text-xs sm:text-sm hidden sm:block truncate max-w-xs">
                          {activeRoom.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 ml-auto">
                    <div className="relative flex items-center gap-1 sm:gap-2">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Ara..."
                        className="w-24 sm:w-48 lg:w-64 bg-gray-700 text-white px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      {searchQuery && (
                        <div className="absolute top-full right-0 mt-1 text-xs text-gray-300 bg-gray-700/90 backdrop-blur px-2 py-1 rounded shadow-lg z-20 whitespace-nowrap border border-gray-600">
                          {filteredMessages.length} sonuç
                        </div>
                      )}
                      <button
                        onClick={() => {
                          if (searchQuery) setSearchQuery("");
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition shrink-0"
                        title={searchQuery ? "Aramayı Temizle" : "Ara"}
                      >
                        <Search size={18} />
                      </button>
                    </div>
                    <button
                      onClick={() => setIsOnlineUsersOpen(true)}
                      className="lg:hidden text-gray-400 hover:text-white w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-700 transition shrink-0"
                      title="Online Kullanıcılar"
                    >
                      <Users size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 relative">
              {/* Seçim Overlay'i */}
              {selectedMessageId && (
                <div
                  className="fixed inset-0 bg-black/20 z-20"
                  onClick={() => setSelectedMessageId(null)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setSelectedMessageId(null);
                  }}
                />
              )}

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
                  className={`flex ${msg.user_id === user?.id ? "justify-end" : "justify-start"} relative`}
                  onTouchStart={() => handlePressStart(msg.id)}
                  onTouchEnd={handlePressEnd}
                  onTouchMove={handlePressEnd}
                  onMouseDown={() => handlePressStart(msg.id)}
                  onMouseUp={handlePressEnd}
                  onMouseLeave={handlePressEnd}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (editingId) return;
                    setSelectedMessageId(msg.id);
                    if (navigator.vibrate) navigator.vibrate(50);
                  }}
                >
                  <div
                    className={`relative max-w-[85%] md:max-w-md lg:max-w-lg transition-transform ${selectedMessageId === msg.id ? "scale-[1.02] z-30" : ""}`}
                  >
                    {/* Seçili Mesaj Emoji Seçici */}
                    {selectedMessageId === msg.id && editingId !== msg.id && (
                      <div
                        className={`absolute top-1/2 -translate-y-1/2 ${
                          msg.user_id === user?.id
                            ? "right-[calc(100%+0.5rem)]"
                            : "left-[calc(100%+0.5rem)]"
                        } bg-gray-800 border border-gray-700 rounded-full shadow-2xl z-40 px-3 py-2 flex gap-1 sm:gap-2 animate-in fade-in zoom-in duration-200`}
                      >
                        {EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleReaction(msg.id, emoji);
                              setSelectedMessageId(null);
                            }}
                            className="text-lg sm:text-xl hover:bg-gray-700 w-8 h-8 flex items-center justify-center rounded-full transition hover:scale-110 shrink-0"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
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
                        <input
                          type="text"
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") submitEdit(msg.id);
                            if (e.key === "Escape") cancelEdit();
                          }}
                          onBlur={() => submitEdit(msg.id)}
                          autoFocus
                          style={{
                            width: `${Math.max(editContent.length + 1, 5)}ch`,
                          }}
                          className="bg-transparent text-white outline-none border-b border-white/40 p-0 m-0 max-w-full"
                        />
                      ) : (
                        <p
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            if (msg.user_id === user?.id) {
                              startEdit(msg);
                              setSelectedMessageId(null);
                            }
                          }}
                          className={
                            msg.user_id === user?.id ? "cursor-text" : ""
                          }
                          title={
                            msg.user_id === user?.id
                              ? "Düzenlemek için çift tıkla"
                              : ""
                          }
                        >
                          {msg.content}
                        </p>
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
                        {/* Okundu bilgisi — sadece kendi mesajında */}
                        {msg.user_id === user?.id && (
                          <span className="text-xs opacity-60">
                            {msg.read_count > 0 ? (
                              <span className="text-blue-400">
                                ✓✓ {msg.read_count}
                              </span>
                            ) : (
                              <span className="text-gray-400">✓</span>
                            )}
                          </span>
                        )}
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

            <div className="p-3 sm:p-4 border-t border-gray-700 bg-gray-800">
              <div className="flex gap-2 sm:gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={handleTyping}
                  onKeyDown={handleKeyDown}
                  placeholder={`#${activeRoom.name} odasına mesaj yaz...`}
                  className="flex-1 bg-gray-700 text-white px-3 py-2 sm:px-4 sm:py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm sm:text-base"
                />
                <button
                  onClick={sendMessage}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-xl transition text-sm sm:text-base"
                >
                  Gönder
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col relative">
            <div className="p-3 border-b border-gray-700 bg-gray-800 md:hidden flex justify-between items-center">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="text-gray-400 hover:text-white flex items-center gap-2 text-sm bg-gray-700 px-3 py-1.5 rounded-lg"
              >
                <Menu size={16} /> Odalar
              </button>
              <button
                onClick={() => setIsOnlineUsersOpen(true)}
                className="lg:hidden text-gray-400 hover:text-white flex items-center gap-2 text-sm bg-gray-700 px-3 py-1.5 rounded-lg"
              >
                <Users size={16} /> Online
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-center text-gray-500">
                <p className="text-4xl sm:text-5xl mb-3 sm:mb-4">💬</p>
                <p className="text-lg sm:text-xl">
                  Bir oda seç ve sohbete başla!
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobil Online Kullanıcılar Overlay */}
      {isOnlineUsersOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsOnlineUsersOpen(false)}
        />
      )}

      {/* Sağ Sidebar — Online Kullanıcılar */}
      <div
        className={`fixed inset-y-0 right-0 z-40 w-52 bg-gray-800 border-l border-gray-700 p-4 transform transition-transform duration-300 lg:relative lg:translate-x-0 ${
          isOnlineUsersOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <p className="text-gray-500 text-xs uppercase mb-3">
          Online — {onlineUsers.length}
        </p>
        <div className="space-y-2">
          {onlineUsers.map((u) => (
            <div key={u.id} className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full" />
              <button
                onClick={() => u.id !== user?.id && openDM(u)}
                className={`text-sm flex-1 text-left transition ${
                  u.id === user?.id
                    ? "text-indigo-400 font-semibold cursor-default"
                    : "text-gray-300 hover:text-white cursor-pointer"
                }`}
              >
                {u.username} {u.id === user?.id && "(sen)"}
              </button>

              {/* Okunmamış bildirim */}
              {dmNotifications[u.id] > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                  {dmNotifications[u.id]}
                </span>
              )}
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Odayı Düzenle</h3>
              <button
                onClick={() => {
                  setEditingRoom(null);
                  setEditRoomError("");
                }}
                className="text-gray-400 hover:text-white transition"
              >
                <X size={24} />
              </button>
            </div>
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
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => handleDeleteRoom(editingRoom.id)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg transition flex items-center justify-center"
                title="Odayı Sil"
              >
                <Trash2 size={20} />
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
                <X size={24} />
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
      {/* Mesaj Silme Onay Modalı */}
      {messageToDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-xl font-bold mb-3 text-white">Mesajı Sil</h3>
            <p className="text-gray-300 text-sm mb-6">
              Bu mesajı silmek istediğinize emin misiniz? Bu işlem geri
              alınamaz.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setMessageToDelete(null)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-lg transition font-medium text-sm"
              >
                İptal
              </button>
              <button
                onClick={() => {
                  deleteMessage(messageToDelete);
                  setMessageToDelete(null);
                  setSelectedMessageId(null);
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg transition font-medium text-sm"
              >
                Evet, Sil
              </button>
            </div>
          </div>
        </div>
      )}
      {/* DM Panelleri */}
      {activeDMs.map((targetUser, index) => (
        <div
          key={targetUser.id}
          style={{ right: `${224 + index * 320 + index * 8}px` }}
          className="fixed bottom-0 z-30"
        >
          <DMPanel
            currentUser={user}
            targetUser={targetUser}
            socket={socket}
            onClose={() => closeDM(targetUser.id)}
          />
        </div>
      ))}
    </div>
  );
};

export default ChatPage;
