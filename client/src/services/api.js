import axios from "axios";

// Temel API URL'ini içeren axios örneği (instance) oluştur
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Her istekten önce çalışacak aracı (interceptor)
// Token varsa onu header'a otomatik ekler
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`; // Yetkilendirme token'ını başlığa ekle
  }
  return config; // Güncellenmiş yapılandırmayı (config) geri döndür
});

export default api;
