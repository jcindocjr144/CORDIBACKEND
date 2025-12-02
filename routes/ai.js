import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";
import db from "../dbconfig.js";

dotenv.config();

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.post("/", async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ message: "Missing message" });

  try {
    const [trainingRows] = await db.query("SELECT question, answer FROM training");

    const trainingContent = trainingRows
      .map((t, index) => `Q${index + 1}: ${t.question}\nA${index + 1}: ${t.answer}`)
      .join("\n\n");

    const completion = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: `
You are CPC CHATBOT AI, the official assistant for Cordova Public College.
Answer student questions using only the CPC training data provided below.
Do not add any unrelated information.
Training Data:
${trainingContent}
          `,
        },
        {
          role: "user",
          content: message,
        },
      ],
    });

    const aiResponse = completion.output[0].content[0].text;
    res.json({ message: aiResponse });
  } catch (error) {
    console.error("AI ERROR:", error);
    res.status(500).json({ message: "CPC AI cannot process your request right now." });
  }
});

export default router;
