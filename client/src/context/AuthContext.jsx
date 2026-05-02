import { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api.js";

// Kimlik doğrulama işlemleri için Context oluştur
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Kullanıcı bilgisini ve yüklenme durumunu tutan stateler
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Başlangıçta localStorage'da token varsa kullanıcı bilgilerini getir
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      api
        .get("/auth/me")
        .then((res) => setUser(res.data.user)) // Başarılıysa kullanıcıyı ayarla
        .catch(() => localStorage.removeItem("token")) // Hata durumunda geçersiz tokeni sil
        .finally(() => setLoading(false)); // Her durumda yüklenme bitirildi olarak işaretle
    } else {
      setLoading(false); // Token yoksa yüklenme bekleme süresini sonlandır
    }
  }, []);

  // Kullanıcı giriş yaptıktan sonra token'ı kaydet ve kullanıcıyı tanımla
  const login = (token, userData) => {
    localStorage.setItem("token", token);
    setUser(userData);
  };

  // Kullanıcı çıkış yaptığında token'ı sil ve kullanıcı bilgisini sıfırla
  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    // Context içerisindeki her bileşene aktarılacak değerler
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// İstediğimiz yerden Auth metodlarına kolay erişim için custom hook
export const useAuth = () => useContext(AuthContext);
