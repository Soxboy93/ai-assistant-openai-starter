// Minimal Express server that exposes a single assistant endpoint
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { createAssistantReply } = require('./assistant');

const app = express();
app.use(bodyParser.json());

app.post('/api/assistant', async (req, res) => {
  try {
    const { messages, assistantConfig } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Request must include 'messages' array." });
    }

    const reply = await createAssistantReply(messages, assistantConfig || {});
    res.json({ reply });
  } catch (err) {
    console.error('Assistant error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`AI assistant server listening on http://localhost:${PORT}`);
});
