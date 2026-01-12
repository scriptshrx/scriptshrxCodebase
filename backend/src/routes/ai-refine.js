const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post('/refine', authenticateToken, async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ error: 'Text required' });

        const completion = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || "gpt-4o",
            messages: [
                { role: "system", content: "You are an expert secretary. Convert the following rough meeting notes into a professional, structured meeting minute summary. Keep it concise." },
                { role: "user", content: text }
            ],
        });

        res.json({ refined: completion.choices[0].message.content });
    } catch (error) {
        console.error('AI Refine error:', error);
        res.status(500).json({ error: 'AI processing failed' });
    }
});

router.post('/analyze', authenticateToken, async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ error: 'Text required' });

        const completion = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || "gpt-4o",
            messages: [
                { role: "system", content: "Analyze the following meeting minutes and extract a list of 'Action Items' and 'Key Decisions'. Return them in a structured JSON format with keys 'actionItems' (array of strings) and 'decisions' (array of strings)." },
                { role: "user", content: text }
            ],
            response_format: { type: "json_object" }
        });

        res.json(JSON.parse(completion.choices[0].message.content));
    } catch (error) {
        console.error('AI Analysis error:', error);
        res.status(500).json({ error: 'AI analysis failed' });
    }
});

module.exports = router;
