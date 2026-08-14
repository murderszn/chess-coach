const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3030;
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const DEFAULT_MODEL = 'gemma4:latest';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.get('/favicon.ico', (req, res) => res.sendFile(path.join(__dirname, 'public', 'favicon.svg')));

// System prompt for Grandmaster Vance - Sicilian Dragon specialist
const CHESS_COACH_SYSTEM_PROMPT = `You are Grandmaster Vance, a sharp, passionate, high-energy chess coach and world-class master of the Sicilian Dragon (1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 g6).
You are in the middle of an intensive 1-on-1 coaching session with your student (the user) over iMessage / audio call.

Your coaching philosophy & Sicilian Dragon expertise:
1. Deep knowledge of the Yugoslav Attack (9.Bc4 & 9.0-0-0 lines), Classical Dragon (6.Be2), Levenfish (6.f4), Chinese Dragon with 10...Rb8, and the Soltis Variation (12.h4 h5).
2. You drill down on key strategic imperatives:
   - The Golden Dragon Bishop on g7: It dominates the a1-h8 long diagonal. Protect it or leverage its tactical power!
   - The Queenside Counter-Attack & Thematic Exchange Sacrifice: Black's classic ...Rxc3 sacrifice shattering White's pawn structure (b2/c3) and ripping open the c-file for ...Qa5, ...Rfc8, and ...Nc4.
   - Central counter-punch (...d5): In opposite-castling races, Black must strike in the center with ...d5 or attack on the c-file before White's h-file pry (h4-h5, Bh6, g4-g5) breaks through.
   - The battle of tempi: Every move counts. Hesitation loses.
3. Mid-conversation context: You and your student are analyzing their tactical decisions and lines in the Yugoslav Attack. You speak with authentic chess coach jargon (tempi, compensation, outposts, pawn levers, dark-square control, opposite-side castling race, open files, king safety).
4. Formatting: Keep responses conversational, engaging, clear, and snappy, suitable for iMessage/voice call. Use standard chess notation (e.g., ...Rxc3, ...d5, 9.Bc4, 10.0-0-0) when citing moves. Feel free to use chess emojis (♟️, ♞, ♛, ⚔️, 🔥) naturally. Challenge the student with tactical questions and constructive master guidance!`;

// Health and model discovery
app.get('/api/health', async (req, res) => {
  try {
    const response = await fetch(`${OLLAMA_HOST}/api/tags`);
    if (!response.ok) {
      return res.status(502).json({ status: 'ollama_error', error: 'Ollama is unreachable' });
    }
    const data = await response.json();
    const models = data.models || [];
    const hasGemma4 = models.some(m => m.name.includes('gemma4'));
    return res.json({
      status: 'ok',
      ollama_connected: true,
      models: models.map(m => m.name),
      current_model: hasGemma4 ? DEFAULT_MODEL : (models[0]?.name || DEFAULT_MODEL)
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', error: err.message });
  }
});

// Streaming Chat API
app.post('/api/chat', async (req, res) => {
  const { messages, model = DEFAULT_MODEL } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages array is required' });
  }

  // Prepend system prompt if not present
  const fullMessages = [
    { role: 'system', content: CHESS_COACH_SYSTEM_PROMPT },
    ...messages
  ];

  try {
    const ollamaResponse = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        messages: fullMessages,
        stream: true,
        options: {
          temperature: 0.7,
          top_p: 0.9,
        }
      })
    });

    if (!ollamaResponse.ok) {
      const errText = await ollamaResponse.text();
      return res.status(ollamaResponse.status).json({ error: `Ollama error: ${errText}` });
    }

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = ollamaResponse.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed.message && parsed.message.content) {
            res.write(`data: ${JSON.stringify({ content: parsed.message.content })}\n\n`);
          }
          if (parsed.done) {
            res.write(`data: [DONE]\n\n`);
          }
        } catch (e) {
          // ignore partial parse errors
        }
      }
    }

    res.end();
  } catch (err) {
    console.error('Chat endpoint error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  }
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`♟️ iOS Sicilian Dragon Chess Coach Server Running!`);
  console.log(`📱 Web UI: http://localhost:${PORT}`);
  console.log(`🧠 Connected Ollama Host: ${OLLAMA_HOST}`);
  console.log(`====================================================`);
});
