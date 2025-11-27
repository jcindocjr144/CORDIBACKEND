import express from "express";
import db from "../dbconfig.js";

const router = express.Router();

router.post("/send", async (req, res) => {
  try {
    const { sender_id, receiver_id, message } = req.body;

    if (
      sender_id === undefined ||
      sender_id === null ||
      receiver_id === undefined ||
      receiver_id === null ||
      !message?.trim()
    ) {
      return res.status(400).json({
        success: false,
        error: "Missing fields",
        data: { sender_id, receiver_id, message },
      });
    }

    const sql = `
      INSERT INTO messages (sender_id, receiver_id, message, created_at)
      VALUES (?, ?, ?, NOW())
    `;

    const [result] = await db.query(sql, [sender_id, receiver_id, message.trim()]);

    console.log("✅ Message inserted into DB:", {
      id: result.insertId,
      sender_id,
      receiver_id,
      message,
    });

    res.json({ success: true, id: result.insertId, message: "Message sent successfully" });
  } catch (err) {
    console.error("❌ Error sending message:", err);
    res.status(500).json({ success: false, error: "Database insert failed" });
  }
});

router.get("/", async (req, res) => {
  try {
    const [results] = await db.query("SELECT * FROM messages ORDER BY created_at ASC");
    res.json(results);
  } catch (err) {
    console.error("❌ Error fetching messages:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

router.get("/:userId", async (req, res) => {
  const userId = req.params.userId;
  try {
    const [results] = await db.query(
      "SELECT * FROM messages WHERE sender_id = ? OR receiver_id = ? ORDER BY created_at ASC",
      [userId, userId]
    );
    res.json(results);
  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch messages" });
  }
});

router.get("/fetchMessages", async (req, res) => {
  const { sender_id, receiver_id } = req.query;

  if (!sender_id || !receiver_id) {
    return res.status(400).json({
      success: false,
      error: "Missing sender or receiver ID",
    });
  }

  const sql = `
    SELECT * FROM messages
    WHERE (sender_id = ? AND receiver_id = ?)
       OR (sender_id = ? AND receiver_id = ?)
    ORDER BY created_at ASC
  `;

  try {
    const [results] = await db.query(sql, [
      sender_id,
      receiver_id,
      receiver_id,
      sender_id,
    ]);
    res.json(results);
  } catch (err) {
    console.error("❌ Error fetching conversation:", err);
    res.status(500).json({ success: false, error: "Failed to fetch conversation" });
  }
});

router.get("/getAdmin", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, username, role FROM users WHERE role = 'admin'"
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "No admin found" });
    }
    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching admins:", err);
    res.status(500).json({ error: "Failed to fetch admins" });
  }
});

export default router;
