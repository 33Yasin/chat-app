import { useAuth } from "../context/AuthContext.jsx";

const ChatPage = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">
          Hoş geldin, {user?.username}! 👋
        </h1>
        <p className="text-gray-400 mb-6">Socket.io entegrasyonu yakında...</p>
        <button
          onClick={logout}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition"
        >
          Çıkış Yap
        </button>
      </div>
    </div>
  );
};

export default ChatPage;
