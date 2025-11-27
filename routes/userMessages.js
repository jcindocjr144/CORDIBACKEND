import express from "express";
import db from "../dbconfig.js";
import getUser from "../middleware/getUser.js";

const router = express.Router();

router.post("/send", getUser, async (req, res) => {
  const { message, receiver_id } = req.body;
  const user = req.user;

  if (!message) {
    return res.status(400).json({ success: false, message: "Message cannot be empty" });
  }

  try {
    let receiverId;

    if (user.role === "admin") {
      if (!receiver_id) {
        return res.status(400).json({ success: false, message: "Receiver ID is required for admin" });
      }
      receiverId = receiver_id;
    } else {
      const [admins] = await db.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
      if (admins.length === 0) {
        return res.status(404).json({ success: false, message: "No admin found" });
      }
      receiverId = admins[0].id;
    }

    const [result] = await db.query(
      "INSERT INTO messages (sender_id, receiver_id, message, created_at, timestamp) VALUES (?, ?, ?, NOW(), NOW())",
      [user.id, receiverId, message]
    );

    const [autoReply] = await db.query(
      "SELECT response FROM auto_responses WHERE question = ? LIMIT 1",
      [message]
    );

    if (autoReply.length > 0 && autoReply[0].response) {
      await db.query(
        "INSERT INTO messages (sender_id, receiver_id, message, created_at, timestamp) VALUES (?, ?, ?, NOW(), NOW())",
        [receiverId, user.id, autoReply[0].response]
      );
    }

    res.json({ success: true, message: "Message sent", id: result.insertId, sender_id: user.id, receiver_id: receiverId });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/fetchMessages", async (req, res) => {
  const userId = req.query.user_id;
  if (!userId) return res.status(400).json({ success: false, message: "Missing user ID" });

  try {
    const [messages] = await db.query(
      "SELECT * FROM messages WHERE sender_id = ? OR receiver_id = ? ORDER BY timestamp ASC",
      [userId, userId]
    );
    res.json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/autoResponses", async (req, res) => {
  try {
    const [responses] = await db.query("SELECT id, question FROM auto_responses");
    res.json(responses);
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/getStudentInfo/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      "SELECT id, first_name, middle_name, last_name, suffix, gender, course, year_level, contact_number, date_of_birth FROM students WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json(rows[0]);
  } catch (err) {
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
