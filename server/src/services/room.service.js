import pool from "../config/db.js";

export const getAllRooms = async () => {
  const result = await pool.query(
    "SELECT id, name, description, created_at FROM rooms ORDER BY created_at ASC",
  );
  return result.rows;
};
