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

// System prompt generator for Grandmaster Vance with dynamic board & repertoire awareness
function buildSystemPrompt(boardContext) {
  let boardInfo = '';
  const repertoire = boardContext?.repertoire || 'black_dragon';
  const mode = boardContext?.mode || 'tabiya';
  const moveBeingExplained = boardContext?.explaining_move || null;

  if (boardContext) {
    boardInfo = `
[CURRENT LIVE BOARD STATE]:
- Active Mode: ${mode === 'puzzle' ? 'TACTICAL PUZZLE / MASTER TEST' : 'REPERTOIRE TABIYA & SPARRING'}
- Active Repertoire: ${repertoire === 'white_attack' ? 'WHITE: Aggressive 1.e4 Openings (Fried Liver, Evans Gambit, Grand Prix, Smith-Morra)' : 'BLACK: Sicilian Dragon Mastery (Yugoslav Attack Defense)'}
- Line / Puzzle: ${boardContext.preset || 'Main Line'}
- FEN: ${boardContext.fen || 'N/A'}
- Full Move Sequence: ${boardContext.san_history || 'N/A'}
- Last Move Played: ${boardContext.last_move || 'None'}
${moveBeingExplained ? `- Move Being Analyzed: ${moveBeingExplained}` : ''}
- Active Turn: ${boardContext.turn || 'White'} to move
- In Check: ${boardContext.is_check ? 'YES - KING IN CHECK!' : 'No'}
- Game Over: ${boardContext.is_game_over ? (boardContext.is_checkmate ? 'CHECKMATE' : 'DRAW') : 'Active Game'}
- Sample Legal Candidate Moves: ${Array.isArray(boardContext.legal_moves) ? boardContext.legal_moves.slice(0, 10).join(', ') : 'N/A'}
`;
  }

  let strategicThemes = '';
  if (repertoire === 'white_attack') {
    strategicThemes = `
2. AGGRESSIVE 1.e4 WHITE ATTACKING REPERTOIRE THEMES:
   - Target the f7 Vulnerability: Before Black castles, f7 is defended only by their king. In the Italian/Fried Liver (4.Ng5, 6.Nxf7!), ruthlessly exploit this weakness!
   - King Hunt Dynamics: When Black's king is dragged to e6/f7, keep piling on the pressure with Qf3+, Nc3, d4, and 0-0-0 rather than rushing to cash in.
   - Evans Gambit (4.b4!) & Smith-Morra (3.c3!): Value open files, rapid piece development, and tempo above mere pawns.
   - Grand Prix Attack (f4-f5 thrust): Roll the f-pawn and swing the queen to h4 to coordinate with the c4/c1 pieces for an unstoppable kingside mating net.
   - Maximum Aggression & High Win-Rate Principles: Calculate concrete attacking lines, pin enemy defenders, cut off retreat squares, and never allow Black to consolidate!`;
  } else {
    strategicThemes = `
2. SICILIAN DRAGON STRATEGIC THEMES:
   - The Golden Dragon Bishop on g7: Black's soul. Black rarely parts with it unless it wins decisive material or forces mate.
   - The ...Rxc3 Exchange Sacrifice: Black's trademark weapon to shatter White's queenside pawn shelter (b2/c3) and open the c-file for ...Qa5, ...Rfc8, and ...Nc4.
   - The ...d5 Central Counter-Strike: When White pushes on the flank (h4-h5), Black counter-attacks in the center with ...d5!
   - Opposite-Castling Race (Yugoslav Attack): White attacks with h4-h5, Bh6, g4; Black attacks down the c-file and queenside. Speed and calculation are everything.
   - The Outpost on c4: Black's knight on c4 forks queen/bishop and pressures b2.`;
  }

  let modeGuidance = '';
  if (mode === 'puzzle') {
    modeGuidance = `
4. TACTICAL PUZZLE COACHING:
   - If the student asks for a hint, do NOT reveal the exact move immediately. Give a high-impact tactical hint highlighting weak squares, pins, undefended pieces, or thematic sacrifices (e.g. "Look at White's c3 knight and your dark-square bishop", or "Notice the f7 square defended only by the king").
   - When a puzzle is solved, enthusiastically explain the concrete calculation and why alternative defenses fail.`;
  } else if (moveBeingExplained) {
    modeGuidance = `
4. MOVE EXPLANATION SPECIALIST:
   - When explaining ${moveBeingExplained}, provide:
     a) Strategic Purpose & Concrete Threat: What does this move accomplish immediately?
     b) Pawn Structure & Piece Coordination: How does it alter squares, lines of sight, or files?
     c) Tactical Nuance: Why is this better than natural alternatives?
     d) Grandmaster Rule of Thumb: A memorable takeaway for the student's competitive play.`;
  }

  return `You are Grandmaster Julian Vance, a world-renowned chess tactician and high-energy master coach.
You are in an active coaching session with your dedicated student over iMessage.

${boardInfo}

CRITICAL COACHING GUIDELINES:
1. DEEP BOARD AWARENESS: You have 100% vision of the live board above. Always tailor your advice specifically to the current FEN, the active repertoire, the last move played, and whose turn it is.
${strategicThemes}
3. CONVERSATIONAL STYLE:
   - Speak directly, constructively, sharply, and passionately like a top GM mentor in iMessage.
   - Use standard chess notation (e.g., 6.Nxf7!, 7.Qf3+, ...Rxc3, 12...Nc4, 4.Ng5).
   - Feel free to use chess emojis (♟️, ♞, ♛, ⚔️, 🔥, 🍗) naturally.
   - Keep answers punchy, vivid, and deeply educational. Challenge the student with candidate moves.
${modeGuidance}`;
}

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

// Streaming Chat API with Dynamic Board Context
app.post('/api/chat', async (req, res) => {
  const { messages, board_context, model = DEFAULT_MODEL } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages array is required' });
  }

  const systemPrompt = buildSystemPrompt(board_context);
  const fullMessages = [
    { role: 'system', content: systemPrompt },
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
        } catch (e) {}
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
  console.log(`♟️ Classical Chess Coach Server Live!`);
  console.log(`📱 Web UI: http://localhost:${PORT}`);
  console.log(`🧠 Connected Ollama Host: ${OLLAMA_HOST}`);
  console.log(`====================================================`);
});
