import express from "express";
const router = express.Router();

router.post("/", (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ message: "Missing message" });

  const aiResponse =
    "I can only assist with CORDI school-related questions. How can I help you regarding our school?";

  res.json({ message: aiResponse });
});

export default router;
