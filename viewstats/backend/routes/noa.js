const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

router.post('/chat', async (req, res) => {
  try {
    const { message, context } = req.body;

    const systemPrompt = `You are NOA, an AI trading assistant for ViewStats — a prediction market trading tool for YouTube view targets.

You have access to the user's data:

RECENT TRADES:
${JSON.stringify(context.trades, null, 2)}

RECENT TRANSACTIONS:
${JSON.stringify(context.transactions, null, 2)}

ACTIVE EVENTS (events where expiry_time is in the future):
${JSON.stringify(context.events, null, 2)}

CURRENT DATE AND TIME: ${new Date().toISOString()}

IMPORTANT: When answering questions about active/expired events, always compare the event's expiry_time with the current date and time above to determine if it is active or expired. Count carefully and precisely.

Your job is to:
- Analyze trading performance
- Give insights on winning/losing patterns
- Answer questions about current events
- Give honest, direct trading advice
- Keep responses concise and actionable
- Never show your reasoning or working — just give the final answer
- Never mention event IDs or UUIDs

Always respond in a helpful, direct, professional tone.`;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      model: 'llama-3.3-70b-versatile',
      max_tokens: 500,
      temperature: 0.7
    });

    const reply = completion.choices[0].message.content;
    res.json({ reply });

  } catch (err) {
    console.error('NOA error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;