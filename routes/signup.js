import express from "express";
import pool from "../dbconfig.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    const [existingUser] = await pool.query(
      "SELECT * FROM users WHERE username = ?",
      [username]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({ message: "Username already taken." });
    }

    const [result] = await pool.query(
      "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
      [username, password, role]
    );

    if (role === "student") {
      await pool.query(
        "INSERT INTO students (user_id, created_at) VALUES (?, NOW())",
        [result.insertId]
      );
    }

    res.json({ message: "User registered successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Database error during signup." });
  }
});

export default router;
