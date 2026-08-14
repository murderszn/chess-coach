const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');

// Preserve native fetch before any WASM library might clobber global scope
const nodeFetch = globalThis.fetch;

const app = express();
const PORT = process.env.PORT || 3030;
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const DEFAULT_MODEL = 'gemma4:latest';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.get('/favicon.ico', (req, res) => res.sendFile(path.join(__dirname, 'public', 'favicon.svg')));

// System prompt generator for Grandmaster Vance with dynamic board & repertoire awareness
function buildSystemPrompt(boardContext, engineAnalysis = null) {
  let boardInfo = '';
  const repertoire = boardContext?.repertoire || 'black_dragon';
  const mode = boardContext?.mode || 'tabiya';
  const moveBeingExplained = boardContext?.explaining_move || null;

  let engineSection = '';
  if (engineAnalysis && engineAnalysis.best_move_san) {
    engineSection = `
[STOCKFISH 18 NNUE ENGINE TRUTH - DEPTH ${engineAnalysis.depth || 14}]:
- Verified Engine Best Move: ${engineAnalysis.best_move_san} (Evaluation: ${engineAnalysis.eval_score})
- Engine PV Line: ${engineAnalysis.pv || 'N/A'}
- CRITICAL ENGINE MANDATE: You MUST recommend ${engineAnalysis.best_move_san} as the primary candidate move. 
- TACTICAL SANITY: NEVER recommend moves that hang pieces or walk into direct capture (e.g. never suggest ...Qa5 if White's Queen or Bishop can capture it for free). Explain the concrete tactical reasoning for ${engineAnalysis.best_move_san}.
`;
  }

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
${engineSection}
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
- The ...Rxc3 Exchange Sacrifice: Shatters White's queenside shelter. If White recaptures with 13.bxc3, Black plays 13...Qa5. But if White recaptures with 13.Qxc3, Black MUST NOT play ...Qa5 (which blunders the Queen to 14.Qxa5); Black should instead play 13...h5! to halt the kingside attack, or active maneuvers like ...Rc8, ...Nc6, or ...Nc4.
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
3. CHESS TRUTH & ENGINE ACCURACY: Always recommend the Engine Best Move. NEVER hallucinate board pieces or recommend moves that hang pieces.
${strategicThemes}
${modeGuidance}`;
}


// Health and model discovery
app.get('/api/health', async (req, res) => {
  try {
    const response = await nodeFetch(`${OLLAMA_HOST}/api/tags`);
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

// Streaming Chat API with Dynamic Board Context & Live Stockfish Ground Truth
app.post('/api/chat', async (req, res) => {
  const { messages, board_context, model = DEFAULT_MODEL } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages array is required' });
  }

  let engineAnalysis = null;
  if (board_context && board_context.fen && !board_context.is_game_over) {
    try {
      const sfResult = await queryStockfish(board_context.fen, 14, 20);
      if (sfResult.bestMoveUci && sfResult.bestMoveUci !== '(none)') {
        const chessInstance = new Chess(board_context.fen);
        const from = sfResult.bestMoveUci.slice(0, 2);
        const to = sfResult.bestMoveUci.slice(2, 4);
        const promotion = sfResult.bestMoveUci.length > 4 ? sfResult.bestMoveUci[4] : undefined;
        const moveObj = chessInstance.move({ from, to, promotion });
        if (moveObj) {
          engineAnalysis = {
            best_move_san: moveObj.san,
            best_move_uci: sfResult.bestMoveUci,
            eval_score: (sfResult.scoreCp / 100).toFixed(2),
            pv: sfResult.pvLine,
            depth: sfResult.depth
          };
        }
      }
    } catch (e) {
      console.warn('Engine analysis query notice:', e.message);
    }
  }

  const systemPrompt = buildSystemPrompt(board_context, engineAnalysis);
  const fullMessages = [
    { role: 'system', content: systemPrompt },
    ...messages
  ];

  try {
    const ollamaResponse = await nodeFetch(`${OLLAMA_HOST}/api/chat`, {
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

// ==========================================================
// Stockfish 18 WASM + Lichess Master Opening Tree Engine
// ==========================================================
const initStockfish = require('stockfish');
const { Chess } = require('chess.js');

let stockfishEngine = null;
let engineReady = false;
let engineQueue = [];
let isEngineEvaluating = false;
let currentEngineCallback = null;

function initEngineInstance() {
  initStockfish().then(engine => {
    // Restore global fetch clobbered by emscripten WASM polyfill
    if (nodeFetch) {
      global.fetch = nodeFetch;
      globalThis.fetch = nodeFetch;
    }
    stockfishEngine = engine;
    engineReady = true;
    engine.listener = (line) => {
      if (currentEngineCallback && typeof line === 'string') {
        currentEngineCallback(line);
      }
    };
    engine.sendCommand('uci');
    engine.sendCommand('setoption name Skill Level value 20');
    console.log('♟️ Stockfish 18 WASM (NNUE) Engine Initialized (3500+ ELO)');
  }).catch(err => {
    if (nodeFetch) {
      global.fetch = nodeFetch;
      globalThis.fetch = nodeFetch;
    }
    console.error('Stockfish 18 initialization notice:', err.message);
  });
}

initEngineInstance();

function queryStockfish(fen, depth = 12, skillLevel = 20) {
  return new Promise((resolve, reject) => {
    if (!stockfishEngine || !engineReady) {
      return reject(new Error('Stockfish engine is initializing...'));
    }
    engineQueue.push({ fen, depth, skillLevel, resolve, reject });
    processEngineQueue();
  });
}

function processEngineQueue() {
  if (isEngineEvaluating || engineQueue.length === 0) return;
  isEngineEvaluating = true;

  const { fen, depth, skillLevel, resolve } = engineQueue.shift();
  let bestMoveUci = null;
  let scoreCp = 0;
  let mateMoves = null;
  let pvLine = '';

  const timeoutTimer = setTimeout(() => {
    currentEngineCallback = null;
    isEngineEvaluating = false;
    resolve({ bestMoveUci: null, scoreCp: 0, depth: 0 });
    processEngineQueue();
  }, 4000);

  currentEngineCallback = (line) => {
    if (typeof line !== 'string') return;
    if (line.includes('score cp ')) {
      const m = line.match(/score cp (-?\d+)/);
      if (m) scoreCp = parseInt(m[1], 10);
    } else if (line.includes('score mate ')) {
      const m = line.match(/score mate (-?\d+)/);
      if (m) mateMoves = parseInt(m[1], 10);
    }
    if (line.includes(' pv ')) {
      const m = line.match(/ pv (.*)$/);
      if (m) pvLine = m[1];
    }
    if (line.startsWith('bestmove ')) {
      clearTimeout(timeoutTimer);
      const parts = line.split(' ');
      bestMoveUci = parts[1];
      currentEngineCallback = null;
      isEngineEvaluating = false;
      resolve({ bestMoveUci, scoreCp, mateMoves, pvLine, depth });
      processEngineQueue();
    }
  };

  stockfishEngine.sendCommand(`setoption name Skill Level value ${skillLevel}`);
  stockfishEngine.sendCommand(`position fen ${fen}`);
  stockfishEngine.sendCommand(`go depth ${depth}`);
}

// Grandmaster Best Move Engine Endpoint
app.post('/api/engine/bestmove', async (req, res) => {
  const { fen, depth = 12, skill_level = 20, use_book = true } = req.body;
  if (!fen) {
    return res.status(400).json({ error: 'Missing fen parameter' });
  }

  try {
    const chessInstance = new Chess(fen);

    // 1. Try Lichess Master Opening Tree (Moves played by 2600+ Grandmasters)
    if (use_book && chessInstance.history().length < 24 && nodeFetch) {
      try {
        const lichessUrl = `https://explorer.lichess.ovh/masters?fen=${encodeURIComponent(fen)}&topGames=0`;
        const response = await nodeFetch(lichessUrl, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(1200) });
        if (response.ok) {
          const data = await response.json();
          if (data.moves && data.moves.length > 0) {
            // Pick top master move
            const topMove = data.moves[0];
            const moveObj = chessInstance.move(topMove.san);
            if (moveObj) {
              return res.json({
                success: true,
                best_move_san: moveObj.san,
                best_move_uci: topMove.uci,
                from: moveObj.from,
                to: moveObj.to,
                eval_score: ((topMove.white - topMove.black) / Math.max(1, (topMove.white + topMove.draws + topMove.black))).toFixed(2),
                is_book: true,
                book_source: 'Lichess Master Opening Database (2.5M+ GM Games)',
                master_games: topMove.white + topMove.draws + topMove.black
              });
            }
          }
        }
      } catch (bookErr) {
        // Fallback to Stockfish seamlessly
      }
    }

    // 2. Query Stockfish 18 WASM with NNUE
    const sfResult = await queryStockfish(fen, depth, skill_level);

    if (sfResult.bestMoveUci && sfResult.bestMoveUci !== '(none)') {
      const from = sfResult.bestMoveUci.slice(0, 2);
      const to = sfResult.bestMoveUci.slice(2, 4);
      const promotion = sfResult.bestMoveUci.length > 4 ? sfResult.bestMoveUci[4] : undefined;

      const moveObj = chessInstance.move({ from, to, promotion });
      if (moveObj) {
        return res.json({
          success: true,
          best_move_san: moveObj.san,
          best_move_uci: sfResult.bestMoveUci,
          from: moveObj.from,
          to: moveObj.to,
          eval_cp: sfResult.scoreCp,
          eval_score: (sfResult.scoreCp / 100).toFixed(2),
          mate_moves: sfResult.mateMoves,
          depth: sfResult.depth,
          is_book: false,
          engine: 'Stockfish 18 WASM NNUE (3500+ ELO)'
        });
      }
    }

    // 3. Fallback legal move
    const moves = chessInstance.moves({ verbose: true });
    if (moves.length > 0) {
      return res.json({
        success: true,
        best_move_san: moves[0].san,
        best_move_uci: moves[0].from + moves[0].to,
        from: moves[0].from,
        to: moves[0].to,
        eval_score: "0.0",
        is_book: false,
        engine: 'Fallback Engine'
      });
    }

    return res.status(400).json({ error: 'No legal moves in position' });
  } catch (err) {
    console.error('Engine bestmove error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`♟️ Classical Chess Coach Server Live!`);
  console.log(`📱 Web UI: http://localhost:${PORT}`);
  console.log(`🧠 Connected Ollama Host: ${OLLAMA_HOST}`);
  console.log(`⚡ Engine: Stockfish 18 WASM + Lichess Master DB`);
  console.log(`====================================================`);
});
