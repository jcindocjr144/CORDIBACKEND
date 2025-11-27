import express from "express";
import mysql from "mysql2";

const router = express.Router();

const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  database: "chatbotdb",
});

// ✅ Optional admin-only middleware (used for add/edit/delete)
const adminAuth = (req, res, next) => {
  try {
    const user = req.headers["user"];
    if (!user || JSON.parse(user).role !== "admin") {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

// ✅ Public: Get all auto responses (used by StudentDashboard & GuestDashboard)
router.get("/", (req, res) => {
  db.query("SELECT * FROM auto_responses", (err, results) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(results);
  });
});

// ✅ Public: Get auto response for a given question
router.get("/response", (req, res) => {
  const { question } = req.query;
  if (!question) return res.status(400).json({ message: "Missing question" });

  const sql = `
    SELECT response 
    FROM auto_responses 
    WHERE ? LIKE CONCAT('%', question, '%') 
    LIMIT 1
  `;

  db.query(sql, [question], (err, results) => {
    if (err) return res.status(500).json({ message: err.message });
    if (results.length > 0) return res.json(results[0]);
    res.json({ response: "I'm not sure about that yet, please ask something else!" });
  });
});

// ✅ Admin only: Add new or update existing response
router.post("/", adminAuth, (req, res) => {
  const { question, response } = req.body;
  if (!question || !response)
    return res.status(400).json({ message: "Missing fields" });

  const sql = `
    INSERT INTO auto_responses (question, response)
    VALUES (?, ?)
    ON DUPLICATE KEY UPDATE response=?, question=?
  `;
  db.query(sql, [question, response, response, question], (err) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ message: "Response saved" });
  });
});

// ✅ Admin only: Update a response by ID
router.put("/:id", adminAuth, (req, res) => {
  const { id } = req.params;
  const { question, response } = req.body;
  if (!question || !response)
    return res.status(400).json({ message: "Missing fields" });

  const sql = "UPDATE auto_responses SET question=?, response=? WHERE id=?";
  db.query(sql, [question, response, id], (err) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ message: "Response updated" });
  });
});

// ✅ Admin only: Delete response by ID
router.delete("/:id", adminAuth, (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM auto_responses WHERE id=?", [id], (err) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ message: "Response deleted" });
  });
});

export default router;
