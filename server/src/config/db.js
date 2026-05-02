import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

// PostgreSQL veritabanı bağlantısı için havuz (pool) oluştur
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Veritabanı bağlantısını test et
pool.connect((err, client, release) => {
  if (err) {
    console.error("❌ PostgreSQL bağlantı hatası:", err.message);
  } else {
    console.log("✅ PostgreSQL bağlantısı başarılı!");
    release(); // Test bağlantısını serbest bırak
  }
});

export default pool;
