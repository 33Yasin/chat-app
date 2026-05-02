import jwt from "jsonwebtoken";

// Kullanıcı yetkilendirmesi için ara katman (middleware)
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Header yoksa veya "Bearer " ile başlamıyorsa reddet
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Token bulunamadı." });
    }

    // Tokeni ayıkla ve geçerliliğini kontrol et
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Kullanıcı IDsini isteğe (request) ekle, böylece diğer işlemler kullanabilir
    req.userId = decoded.userId;
    next(); // Bir sonraki fonksiyona geç
  } catch (error) {
    return res.status(401).json({ message: "Geçersiz token." });
  }
};

export default authMiddleware;
