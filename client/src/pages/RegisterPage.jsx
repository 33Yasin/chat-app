import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../services/api.js";

const RegisterPage = () => {
  // Form verilerini tutan state (kullanıcı adı, email ve şifre)
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  // Hata mesajını gösteren state
  const [error, setError] = useState("");
  // İstek yüklenme durumunu gösteren state
  const [loading, setLoading] = useState(false);
  
  // Auth context'ten login metodunu al
  const { login } = useAuth();
  // Sayfa yönlendirmesi için kullan
  const navigate = useNavigate();

  // Form gönderimi sırasında çağrılacak işlev
  const handleSubmit = async (e) => {
    e.preventDefault(); // Varsayılan gönderim davranışını iptal et
    setError(""); // Eski hataları temizle
    setLoading(true); // Yüklenme durumunu aktif et
    
    try {
      // Backend'e kayıt isteği gönder
      const res = await api.post("/auth/register", form);
      // Başarılıysa doğrudan giriş yap (gelen token ve user ile)
      login(res.data.token, res.data.user);
      // Sohbet sayfasına git
      navigate("/chat");
    } catch (err) {
      // Hata durumunda kullanıcıya hata mesajını göster
      setError(err.response?.data?.message || "Bir hata oluştu.");
    } finally {
      // İşlem bitince yüklenme durumunu sonlandır
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-white mb-2">Hesap Oluştur 🚀</h1>
        <p className="text-gray-400 mb-6">Hemen ücretsiz kayıt ol</p>

        {/* Hata uyarısı */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Kayıt formu */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-gray-300 text-sm mb-1 block">
              Kullanıcı Adı
            </label>
            <input
              type="text"
              placeholder="yasin"
              value={form.username}
              // Kullanıcı adını state'e aktar
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="text-gray-300 text-sm mb-1 block">Email</label>
            <input
              type="email"
              placeholder="yasin@example.com"
              value={form.email}
              // Email'i state'e aktar
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
              // Şifreyi state'e aktar
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading} // Yükleme sırasında butonu inaktif yap
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
          >
            {/* Buton içeriği dinamik */}
            {loading ? "Kayıt olunuyor..." : "Kayıt Ol"}
          </button>
        </form>

        <p className="text-gray-400 text-center mt-6">
          Zaten hesabın var mı?{" "}
          <Link to="/login" className="text-indigo-400 hover:underline">
            Giriş yap
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
