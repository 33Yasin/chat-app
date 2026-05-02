import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

// Özel Socket bağlantı kancası (hook)
const useSocket = (token) => {
  // Socket örneğini tutmak için referans
  const socketRef = useRef(null);

  useEffect(() => {
    // Token yoksa bağlantıyı kurma
    if (!token) return;

    // Socket bağlantısını kur
    socketRef.current = io(import.meta.env.VITE_SOCKET_URL, {
      auth: { token },
    });

    // Bağlantı başarılı olduğunda tetiklenir
    socketRef.current.on("connect", () => {
      console.log("✅ Socket bağlandı:", socketRef.current.id);
    });

    // Bağlantı hatası olduğunda tetiklenir
    socketRef.current.on("connect_error", (err) => {
      console.error("❌ Socket bağlantı hatası:", err.message);
    });

    // Cleanup — component unmount olunca bağlantıyı kes
    return () => {
      socketRef.current?.disconnect();
    };
  }, [token]);

  // Oluşturulan socket örneğini döndürür
  return socketRef.current;
};

export default useSocket;
