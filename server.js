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
- Active Mode: ${mode === 'puzzle' ? 'TACTICAL PUZZLE' : 'REPERTOIRE THEORY & SPARRING'}
- Active Repertoire: ${repertoire === 'white_attack' ? 'WHITE: Aggressive 1.e4 Openings (Fried Liver, Evans Gambit, Grand Prix, Smith-Morra)' : 'BLACK: Sicilian Dragon (Yugoslav Attack Defense)'}
- Line / Context: ${boardContext.preset || 'Main Line'}
- FEN: ${boardContext.fen || 'N/A'}
- Full Move Sequence: ${boardContext.san_history || 'N/A'}
- Last Move Played: ${boardContext.last_move || 'None'}
${moveBeingExplained ? `- Move Being Analyzed: ${moveBeingExplained}` : ''}
- Active Turn: ${boardContext.turn || 'White'} to move
- In Check: ${boardContext.is_check ? 'YES' : 'No'}
- Game Over: ${boardContext.is_game_over ? (boardContext.is_checkmate ? 'CHECKMATE' : 'DRAW') : 'Active'}
- Legal Candidate Moves: ${Array.isArray(boardContext.legal_moves) ? boardContext.legal_moves.slice(0, 10).join(', ') : 'N/A'}
`;
  }

  let strategicThemes = '';
  if (repertoire === 'white_attack') {
    strategicThemes = `
THEORY & STRATEGY (WHITE 1.e4 ATTACK):
- Target f7: In the Italian / Fried Liver (4.Ng5, 6.Nxf7!), attack the uncastled king directly.
- King Hunt Dynamics: When Black plays 5...Nxd5? respond with 6.Nxf7! followed by 7.Qf3+ Ke6 8.Nc3, increasing pressure before Black consolidates.
- Evans Gambit (4.b4!) and Morra (3.c3!): Prioritize tempo, central occupation, and open diagonals over material.
- Grand Prix (f4-f5): Direct kingside pawn break targeting light squares.`;
  } else {
    strategicThemes = `
THEORY & STRATEGY (BLACK SICILIAN DRAGON):
- The g7 Bishop: Black's key asset along the h8-a1 diagonal. Never trade it without decisive tactical compensation.
- The ...Rxc3 Exchange Sacrifice: Shatters White's queenside shelter, opening the c-file for ...Qa5, ...Rfc8, and ...Nc4.
- Central Counter: Against White's flank pawn storm (h4-h5), strike in the center with ...d5!
- Outpost c4: Critical square for Black's knight to command the queenside.
- Tempo in Opposite Castling: In the Yugoslav Attack, passive moves (like ...a6 or ...h6) surrender crucial tempi. Black must relentlessly pursue active counterplay with ...Rc8, ...Nc4, or ...d5!.`;
  }

  let modeGuidance = '';
  if (mode === 'puzzle') {
    modeGuidance = `
PUZZLE GUIDANCE:
- If a hint is requested, provide a concise tactical clue highlighting key pins, files, or undefended squares without revealing the move.
- When solved, give a sharp, 2-sentence breakdown of the tactical refutation.`;
  } else if (moveBeingExplained) {
    modeGuidance = `
MOVE EXPLANATION GUIDANCE:
- For ${moveBeingExplained}, give a precise 3-sentence summary: (1) Immediate tactical threat, (2) Structural impact, (3) Tactical alternative or principle.`;
  } else if (boardContext?.game_review) {
    const rev = boardContext.game_review;
    modeGuidance = `
GAME REVIEW GUIDANCE:
- Accuracy: White ${rev.white_accuracy || 'N/A'}% | Black ${rev.black_accuracy || 'N/A'}%.
- Deliver a concise summary of the critical turning point (Move ${rev.turning_point_move || 'N/A'} ${rev.turning_point_san || ''}) and give 2 concrete tactical takeaways. Keep it under 4 sentences.`;
  }

  return `You are Grandmaster Julian Vance, a master chess tactician and coach.
You are mentoring a student via iMessage.

${boardInfo}

COACHING PRINCIPLES:
1. BREVITY & PRECISION: Keep every response strictly between 2 to 4 sentences. Be direct, authoritative, and incisive.
2. NO EMOJIS: Do NOT use any emojis. Communicate with pure analytical clarity and classical elegance.
3. CHESS TRUTH & THEORY: Reference exact notation (e.g., 6.Nxf7!, 7.Qf3+, ...Rxc3, 12...Nc4, 12...h5). Never hallucinate board pieces or positions; rely strictly on the live FEN and move sequence provided.
${strategicThemes}
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
