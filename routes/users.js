import express from "express";
import pool from "../dbconfig.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const [users] = await pool.query(
      "SELECT id, username, role, last_activity, created_at FROM users ORDER BY id ASC"
    );
    res.json(users);
  } catch {
    res.status(500).json({ message: "Database error" });
  }
});

router.put("/:id", async (req, res) => {
  const { username, password, role } = req.body;
  const { id } = req.params;
  if (!username || !role) return res.status(400).json({ message: "Missing username or role" });
  try {
    let query, params;
    if (password && password.trim() !== "") {
      query = "UPDATE users SET username=?, password=?, role=? WHERE id=?";
      params = [username, password, role, id];
    } else {
      query = "UPDATE users SET username=?, role=? WHERE id=?";
      params = [username, role, id];
    }
    const [result] = await pool.query(query, params);
    if (result.affectedRows === 0) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User updated successfully" });
  } catch {
    res.status(500).json({ message: "Failed to update user" });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query("DELETE FROM users WHERE id=?", [id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted successfully" });
  } catch {
    res.status(500).json({ message: "Failed to delete user" });
  }
});

router.put("/:id/activity", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("UPDATE users SET last_activity = NOW() WHERE id = ?", [id]);
    res.json({ message: "User activity updated" });
  } catch {
    res.status(500).json({ message: "Failed to update activity" });
  }
});

router.get("/contacts/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [users] = await pool.query(
      "SELECT id, username, role, last_activity FROM users WHERE id != ? ORDER BY username ASC",
      [id]
    );
    res.json(users);
  } catch {
    res.status(500).json({ message: "Failed to fetch contacts" });
  }
});

router.get("/messages/:senderId/:receiverId", async (req, res) => {
  const { senderId, receiverId } = req.params;
  try {
    const [messages] = await pool.query(
      `SELECT * FROM messages WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?) ORDER BY timestamp ASC`,
      [senderId, receiverId, receiverId, senderId]
    );
    res.json(messages);
  } catch {
    res.status(500).json({ message: "Failed to fetch messages" });
  }
});

router.post("/messages", async (req, res) => {
  const { sender_id, receiver_id, message } = req.body;
  if (!sender_id || !receiver_id || !message) return res.status(400).json({ message: "Missing message data" });
  try {
    await pool.query(
      "INSERT INTO messages (sender_id, receiver_id, message, timestamp) VALUES (?, ?, ?, NOW())",
      [sender_id, receiver_id, message]
    );
    res.json({ message: "Message sent successfully" });
  } catch {
    res.status(500).json({ message: "Failed to send message" });
  }
});

router.get("/getStudentInfo/:user_id", async (req, res) => {
  const { user_id } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT student_id, user_id, first_name, middle_name, last_name, suffix, gender, course, year_level, contact_number, date_of_birth, created_at 
       FROM students WHERE user_id = ?`,
      [user_id]
    );
    if (rows.length === 0) return res.status(404).json({ message: "Student not found" });
    res.json(rows[0]);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/updateStudent/:user_id", async (req, res) => {
  const { user_id } = req.params;
  const { first_name, middle_name, last_name, suffix, gender, course, year_level, contact_number, date_of_birth } = req.body;

  if (!first_name || !middle_name || !last_name || !suffix || !gender || !course || !year_level || !contact_number || !date_of_birth) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (!/^09\d{9}$/.test(contact_number)) return res.status(400).json({ message: "Contact number must be 11 digits and start with 09" });

  try {
    const [existing] = await db.query("SELECT * FROM students WHERE user_id = ?", [user_id]);

    if (existing.length === 0) {
      const [insertResult] = await db.query(
        "INSERT INTO students (user_id, first_name, middle_name, last_name, suffix, gender, course, year_level, contact_number, date_of_birth, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())",
        [user_id, first_name, middle_name, last_name, suffix, gender, course, year_level, contact_number, date_of_birth]
      );
      return res.json({ success: true, message: "Profile created successfully", student_id: insertResult.insertId });
    }

    const [updateResult] = await db.query(
      "UPDATE students SET first_name=?, middle_name=?, last_name=?, suffix=?, gender=?, course=?, year_level=?, contact_number=?, date_of_birth=? WHERE user_id=?",
      [first_name, middle_name, last_name, suffix, gender, course, year_level, contact_number, date_of_birth, user_id]
    );

    res.json({ success: true, message: "Profile updated successfully" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});


export default router;
