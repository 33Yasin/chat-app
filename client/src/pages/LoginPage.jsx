import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../services/api.js";

const LoginPage = () => {
  // Form verilerini (email ve şifre) tutan state
  const [form, setForm] = useState({ email: "", password: "" });
  // Olası hata mesajlarını tutan state
  const [error, setError] = useState("");
  // İstek atılırkenki bekleme durumunu tutan state
  const [loading, setLoading] = useState(false);
  
  // Auth context'ten giriş fonksiyonunu al
  const { login } = useAuth();
  // Sayfa yönlendirmesi için navigate kancası
  const navigate = useNavigate();

  // Form gönderildiğinde çalışacak fonksiyon
  const handleSubmit = async (e) => {
    e.preventDefault(); // Sayfanın yenilenmesini engelle
    setError(""); // Önceki hataları temizle
    setLoading(true); // Yükleniyor durumunu başlat
    
    try {
      // API'ye giriş isteği at
      const res = await api.post("/auth/login", form);
      // Başarılı olursa token ve kullanıcı bilgisini locale/context'e kaydet
      login(res.data.token, res.data.user);
      // Sohbet sayfasına yönlendir
      navigate("/chat");
    } catch (err) {
      // Hata durumunda kullanıcıya gösterilecek mesajı state'e yaz
      setError(err.response?.data?.message || "Bir hata oluştu.");
    } finally {
      // İşlem bitince yükleme durumunu kapat
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-white mb-2">Hoş geldin 👋</h1>
        <p className="text-gray-400 mb-6">Hesabına giriş yap</p>

        {/* Hata varsa kullanıcıya göster */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Giriş Formu */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-gray-300 text-sm mb-1 block">Email</label>
            <input
              type="email"
              placeholder="yasin@example.com"
              value={form.email}
              // Email değeri değiştiğinde state'i güncelle
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="text-gray-300 text-sm mb-1 block">Şifre</label>
            <input
              type="password"
              placeholder="••••••••"
              value={form.password}
              // Şifre değeri değiştiğinde state'i güncelle
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading} // Yüklenirken butonu devre dışı bırak
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
          >
            {/* Buton içindeki metni duruma göre değiştir */}
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>

        <p className="text-gray-400 text-center mt-6">
          Hesabın yok mu?{" "}
          <Link to="/register" className="text-indigo-400 hover:underline">
            Kayıt ol
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
