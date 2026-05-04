import { useState, useEffect, useRef } from "react";
import api from "../services/api.js";

const DMPanel = ({ currentUser, targetUser, socket, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [typingUser, setTypingUser] = useState("");
  const messagesEndRef = useRef(null);
  const typingTimeout = useRef(null);
  const [readStatus, setReadStatus] = useState({}); // { messageId: bool }

  // Geçmiş mesajları yükle
  useEffect(() => {
    api.get(`/dm/${targetUser.id}`).then((res) => {
      setMessages(res.data.messages);
    });

    // Okundu olarak işaretle
    socket.emit("dm:read", { senderId: targetUser.id });
  }, [targetUser.id]);

  // Socket eventleri
  useEffect(() => {
    const handleReceive = (msg) => {
      if (
        (msg.sender_id === targetUser.id &&
          msg.receiver_id === currentUser.id) ||
        (msg.sender_id === currentUser.id && msg.receiver_id === targetUser.id)
      ) {
        setMessages((prev) => {
          if (prev.find((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        socket.emit("dm:read", { senderId: targetUser.id });
      }
    };

    const handleReadUpdate = ({ byUserId }) => {
      if (byUserId === targetUser.id) {
        setMessages((prev) =>
          prev.map((m) =>
            m.sender_id === currentUser.id ? { ...m, is_read: true } : m,
          ),
        );
      }
    };

    socket.on("dm:receive", handleReceive);
    socket.on("dm:read_update", handleReadUpdate);

    return () => {
      socket.off("dm:receive", handleReceive);
      socket.off("dm:read_update", handleReadUpdate); // ✅ BURAYA
    };
  }, [socket, targetUser.id, currentUser.id]);

  // Otomatik scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;
    socket.emit("dm:send", {
      receiverId: targetUser.id,
      content: input,
    });
    setInput("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div
      className="fixed bottom-0 right-64 w-80 bg-gray-800 rounded-t-xl shadow-2xl border border-gray-700 flex flex-col z-30"
      style={{ height: "420px" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-750 rounded-t-xl">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center text-xs font-bold">
            {targetUser.username?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">
              {targetUser.username}
            </p>
            <p className="text-xs text-green-400">● Online</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition"
        >
          ✕
        </button>
      </div>

      {/* Mesajlar */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 text-sm text-center">
              {targetUser.username} ile konuşma başlat!
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender_id === currentUser.id ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[200px] px-3 py-2 rounded-2xl text-sm ${
                msg.sender_id === currentUser.id
                  ? "bg-indigo-600 text-white rounded-br-none"
                  : "bg-gray-700 text-white rounded-bl-none"
              }`}
            >
              <p>{msg.content}</p>
              <div className="flex items-center justify-end gap-1 mt-1">
                <p className="text-xs opacity-60">
                  {new Date(msg.created_at).toLocaleTimeString("tr-TR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                {/* Okundu tiki — sadece gönderilen mesajlarda */}
                {msg.sender_id === currentUser.id && (
                  <span className="text-xs">
                    {msg.is_read ? (
                      <span className="text-blue-300">✓✓</span>
                    ) : (
                      <span className="opacity-60">✓</span>
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {typingUser && (
          <p className="text-gray-400 text-xs italic">
            {typingUser} yazıyor...
          </p>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Mesaj yaz..."
            className="flex-1 bg-gray-700 text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={sendMessage}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg transition text-sm"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
};

export default DMPanel;
