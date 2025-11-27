import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.post("/reply", async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ message: "Missing message" });

  try {
    const completion = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: `
            You are **CORDI CHATBOT AI**, an official assistant 
            for Cordillera School (CORDI).

            Your job:
            - answer school-related questions
            - help with enrollment, courses, schedules
            - explain school rules, policies, announcements
            - assist students, teachers, and parents

            If someone asks about anything NOT related to school,
            answer only:
            "I can only assist with CORDI school-related questions.
            How can I help you regarding our school?"

            Your tone:
            - friendly
            - short answers
            - student-friendly
            - helpful
          `,
        },
        {
          role: "user",
          content: message,
        },
      ],
    });

    const aiResponse = completion.output[0].content[0].text;
    res.json({ response: aiResponse });
  } catch (error) {
    console.error("AI ERROR:", error);
    res.status(500).json({ response: "CORDI AI cannot process your request right now." });
  }
});

export default router;
