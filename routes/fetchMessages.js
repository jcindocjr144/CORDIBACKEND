import express from "express";
import db from "../dbconfig.js";

const router = express.Router();

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
}

router.get("/", async (req, res) => {
  try {
    let { sender_id, receiver_id } = req.query;

    sender_id = Number(sender_id);
    receiver_id = Number(receiver_id);

    console.log("🟢 Fetching messages between:", sender_id, "and", receiver_id);

    if (isNaN(sender_id) || isNaN(receiver_id)) {
      console.warn("⚠️ Invalid sender_id or receiver_id");
      return res.status(400).json({ error: "Invalid sender_id or receiver_id" });
    }

    const [admin] = await query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    const adminId = admin ? admin.id : 0;

    if (sender_id === 0) sender_id = adminId;
    if (receiver_id === 0) receiver_id = adminId;

    const sql = `
      SELECT 
        m.id,
        m.sender_id,
        m.receiver_id,
        m.message,
        m.created_at,
        CASE 
          WHEN m.sender_id = ? THEN 'Admin'
          ELSE u.username
        END AS sender_name
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id
      WHERE 
        (m.sender_id = ? AND m.receiver_id = ?)
        OR (m.sender_id = ? AND m.receiver_id = ?)
      ORDER BY m.created_at ASC
    `;

    const params = [adminId, sender_id, receiver_id, receiver_id, sender_id];
    console.log("🧩 SQL params:", params);

    const results = await query(sql, params);

    console.log(`✅ Messages fetched: ${results.length}`);
    res.json(results);
  } catch (err) {
    console.error("❌ Error in /fetchMessages route:", err);
    res.status(500).json({ error: "Server error fetching messages" });
  }
});

export default router;
