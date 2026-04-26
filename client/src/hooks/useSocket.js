import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

const useSocket = (token) => {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) return;

    // Socket bağlantısını kur
    socketRef.current = io(import.meta.env.VITE_SOCKET_URL, {
      auth: { token },
    });

    socketRef.current.on("connect", () => {
      console.log("✅ Socket bağlandı:", socketRef.current.id);
    });

    socketRef.current.on("connect_error", (err) => {
      console.error("❌ Socket bağlantı hatası:", err.message);
    });

    // Cleanup — component unmount olunca bağlantıyı kes
    return () => {
      socketRef.current?.disconnect();
    };
  }, [token]);

  return socketRef.current;
};

export default useSocket;
