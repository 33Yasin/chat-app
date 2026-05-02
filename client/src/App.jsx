import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import PrivateRoute from "./components/PrivateRoute.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import ChatPage from "./pages/ChatPage.jsx";

// Ana uygulama bileşeni ve rota yönetimi
const App = () => {
  return (
    // Tarayıcı yönlendirmesi için BrowserRouter kullanımı
    <BrowserRouter>
      {/* Kimlik doğrulama süreçleri için Auth sağlayıcısı */}
      <AuthProvider>
        <Routes>
          {/* Ana dizin: giriş sayfasına yönlendirir */}
          <Route path="/" element={<Navigate to="/login" />} />
          {/* Kullanıcı giriş sayfası */}
          <Route path="/login" element={<LoginPage />} />
          {/* Yeni kullanıcı kayıt sayfası */}
          <Route path="/register" element={<RegisterPage />} />
          {/* Sohbet sayfası: Sadece giriş yapmış kullanıcılar erişebilir */}
          <Route
            path="/chat"
            element={
              <PrivateRoute>
                <ChatPage />
              </PrivateRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
