import express from "express";
import db from "../dbconfig.js"; 

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM training");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch training data" });
  }
});

router.post("/", async (req, res) => {
  const { title, question, answer } = req.body;
  if (!title || !question || !answer) return res.status(400).json({ message: "Missing fields" });

  try {
    const [result] = await db.query(
      "INSERT INTO training (title, question, answer) VALUES (?, ?, ?)",
      [title, question, answer]
    );
    res.json({ id: result.insertId, title, question, answer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to add training data" });
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { title, question, answer } = req.body;
  try {
    await db.query(
      "UPDATE training SET title=?, question=?, answer=? WHERE id=?",
      [title, question, answer, id]
    );
    res.json({ id, title, question, answer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update training data" });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM training WHERE id=?", [id]);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete training data" });
  }
});

export default router;
