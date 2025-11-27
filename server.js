import express from "express";
import cors from "cors";
import mysql from "mysql2";
import dotenv from "dotenv";

import signupRoutes from "./routes/signup.js";
import messagesRoutes from "./routes/messages.js";
import userMessages from "./routes/userMessages.js";
import fetchMessagesRoutes from "./routes/fetchMessages.js";
import autoResponsesRoutes from "./routes/autoResponses.js";
import aiRouter from "./routes/ai.js";
import authRoutes from "./routes/auth.js";
dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: true }));

const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "chatbotdb",
  waitForConnections: true,
  connectionLimit: 10,
});

app.use((req, res, next) => {
  req.db = db;
  next();
});

app.use("/api/signup", signupRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/userMessages", userMessages);
app.use("/api/fetchMessages", fetchMessagesRoutes);
app.use("/api/auto-responses", autoResponsesRoutes);
app.use("/api/ai", aiRouter);
app.use("/api/auth", authRoutes);

const adminAuth = (req, res, next) => {
  const userHeader = req.headers["user"];
  if (!userHeader) return res.status(401).json({ message: "Unauthorized" });
  try {
    const user = JSON.parse(userHeader);
    if (user.role !== "admin") return res.status(401).json({ message: "Unauthorized" });
    next();
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

app.post("/api/signup", (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role)
    return res.status(400).json({ message: "All fields are required" });

  db.query("SELECT id FROM users WHERE username = ?", [username], (err, existing) => {
    if (err) return res.status(500).json({ message: "Database error" });
    if (existing.length > 0) return res.status(400).json({ message: "Username already exists" });

    db.query(
      "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
      [username, password, role],
      (err2, result) => {
        if (err2) return res.status(500).json({ message: "Failed to register user" });
        res.json({ message: "User registered successfully", id: result.insertId });
      }
    );
  });
});

app.post("/api/signin", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ message: "All fields are required" });

  db.query(
    "SELECT id, username, password, role FROM users WHERE username = ?",
    [username],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Database error" });
      if (result.length === 0) return res.status(401).json({ message: "Invalid username or password" });

      const user = result[0];
      if (user.password !== password)
        return res.status(401).json({ message: "Invalid username or password" });

      db.query("UPDATE users SET is_online = 1 WHERE username = ?", [username], () => {
        res.json({ message: "Login successful", id: user.id, role: user.role, username: user.username });
      });
    }
  );
});

app.get("/api/users/total", (req, res) => {
  db.query("SELECT COUNT(*) AS total FROM users", (err, result) => {
    if (err) return res.status(500).json({ message: "Database error" });
    res.json({ total: result[0].total });
  });
});

app.get("/api/users/online", (req, res) => {
  db.query("SELECT COUNT(*) AS online FROM users WHERE is_online = 1", (err, result) => {
    if (err) return res.status(500).json({ message: "Database error" });
    res.json({ online: result[0].online });
  });
});

app.get("/api/auto-responses", adminAuth, (req, res) => {
  db.query("SELECT * FROM auto_responses", (err, results) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(results);
  });
});

app.post("/api/auto-responses", adminAuth, (req, res) => {
  const { question, response } = req.body;
  if (!question || !response) return res.status(400).json({ message: "Missing fields" });

  db.query(
    "INSERT INTO auto_responses (question, response) VALUES (?, ?) ON DUPLICATE KEY UPDATE response=?",
    [question, response, response],
    (err) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json({ message: "Response saved" });
    }
  );
});

app.put("/api/auto-responses/:id", adminAuth, (req, res) => {
  const { id } = req.params;
  const { response } = req.body;
  db.query("UPDATE auto_responses SET response=? WHERE id=?", [response, id], (err) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ message: "Response updated" });
  });
});

app.delete("/api/auto-responses/:id", adminAuth, (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM auto_responses WHERE id=?", [id], (err) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ message: "Response deleted" });
  });
});

app.get("/api/users", (req, res) => {
  db.query(
    "SELECT id, username, role, is_online, created_at, last_activity FROM users ORDER BY role, created_at DESC",
    (err, results) => {
      if (err) return res.status(500).json({ message: "Database error" });
      res.json(results);
    }
  );
});

app.put("/api/users/:id", adminAuth, (req, res) => {
  const { id } = req.params;
  const { username, password, role } = req.body;
  if (!username || !role) return res.status(400).json({ message: "Missing fields" });

  let sql, params;
  if (password && password.trim() !== "") {
    sql = "UPDATE users SET username=?, password=?, role=? WHERE id=?";
    params = [username, password, role, id];
  } else {
    sql = "UPDATE users SET username=?, role=? WHERE id=?";
    params = [username, role, id];
  }

  db.query(sql, params, (err, result) => {
    if (err) return res.status(500).json({ message: "Database error" });
    if (result.affectedRows === 0) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User updated successfully" });
  });
});

app.delete("/api/users/:id", adminAuth, (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM users WHERE id=?", [id], (err) => {
    if (err) return res.status(500).json({ message: "Database error" });
    res.json({ message: "User deleted successfully" });
  });
});

app.post("/api/logout", (req, res) => {
  const { username } = req.body;
  db.query("UPDATE users SET is_online = 0 WHERE username = ?", [username], (err) => {
    if (err) return res.status(500).json({ message: "Logout failed" });
    res.json({ message: "User logged out" });
  });
});

app.post("/api/messages", (req, res) => {
  const { sender_id, message } = req.body;
  if (!sender_id || !message) return res.status(400).json({ message: "sender_id and message required" });

  db.query("SELECT id FROM users WHERE role='admin' ORDER BY id ASC LIMIT 1", (err, result) => {
    if (err) return res.status(500).json({ message: "Database error" });
    if (result.length === 0) return res.status(404).json({ message: "No admin found" });

    const receiver_id = result[0].id;
    db.query("INSERT INTO messages (sender_id, receiver_id, message) VALUES (?, ?, ?)", [sender_id, receiver_id, message], (err2) => {
      if (err2) return res.status(500).json({ message: "Failed to send message" });
      res.json({ success: true, message: "Message stored successfully" });
    });
  });
});

app.get("/api/fetchMessages", async (req, res) => {
  let { sender_id, receiver_id } = req.query;
  sender_id = Number(sender_id);
  receiver_id = Number(receiver_id);
  if (isNaN(sender_id) || isNaN(receiver_id)) return res.status(400).json({ error: "Invalid sender_id or receiver_id" });

  const sql = `
    SELECT 
      m.id,
      m.sender_id,
      m.receiver_id,
      m.message,
      m.created_at,
      CASE 
        WHEN m.sender_id = 0 THEN 'Admin'
        ELSE u.username
      END AS sender_name
    FROM messages m
    LEFT JOIN users u ON m.sender_id = u.id
    WHERE 
      (m.sender_id = ? AND m.receiver_id = ?)
      OR (m.sender_id = ? AND m.receiver_id = ?)
    ORDER BY m.created_at ASC
  `;
  try {
    const [rows] = await db.promise().query(sql, [sender_id, receiver_id, receiver_id, sender_id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Cordi Chatbot backend running on port ${PORT}`);
});
