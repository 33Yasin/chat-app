import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Yükleniyor...</div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" />;
};

export default PrivateRoute;
