import express from "express";
import db from "../dbconfig.js";

const router = express.Router();

// Send message from guest to admin
router.post("/send", async (req, res) => {
  try {
    const { sender_id, message } = req.body;
    if (!sender_id || !message?.trim()) return res.status(400).json({ success: false, error: "Missing fields" });

    const [admins] = await db.query("SELECT id FROM users WHERE role='admin'");
    if (!admins.length) return res.status(404).json({ success: false, error: "No admin found" });

    const receiver_id = admins[0].id;
    const [result] = await db.query(
      "INSERT INTO messages (sender_id, receiver_id, message, created_at) VALUES (?, ?, ?, NOW())",
      [sender_id, receiver_id, message.trim()]
    );

    res.json({ success: true, id: result.insertId, message: "Message sent successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Database insert failed" });
  }
});

// Fetch messages between guest and admin
router.get("/fetchMessages", async (req, res) => {
  const { sender_id } = req.query;
  if (!sender_id) return res.status(400).json({ success: false, error: "Missing sender ID" });

  try {
    const [admins] = await db.query("SELECT id FROM users WHERE role='admin'");
    if (!admins.length) return res.status(404).json({ success: false, error: "No admin found" });

    const receiver_id = admins[0].id;
    const [messages] = await db.query(
      `SELECT * FROM messages
       WHERE (sender_id=? AND receiver_id=?) OR (sender_id=? AND receiver_id=?)
       ORDER BY created_at ASC`,
      [sender_id, receiver_id, receiver_id, sender_id]
    );

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to fetch conversation" });
  }
});

export default router;
