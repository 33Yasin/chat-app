import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

// Sadece giriş yapmış kullanıcıların erişebileceği özel rotalar için bileşen
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth(); // Auth context'ten kullanıcı bilgisini çek

  // Yüklenme (veri kontrol) aşamasında kullanıcıyı beklet
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Yükleniyor...</div>
      </div>
    );
  }

  // Kullanıcı varsa sayfanın içeriğini (children) göster, yoksa giriş sayfasına yönlendir
  return user ? children : <Navigate to="/login" />;
};

export default PrivateRoute;
