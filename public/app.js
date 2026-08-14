/**
 * Grandmaster Chess Coach (Julian Vance) — Sicilian Dragon Analysis
 * Deep Board-Aware Dynamic Coaching Engine with Live Eval, SVG Arrows, & Auto-Opponent Sparring
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Chess Engine
  const chess = new Chess();
  let boardOrientation = 'black'; // Black perspective for Dragon players
  let selectedSquare = null;
  let legalMovesForSelected = [];
  let moveHistory = [];
  let currentMoveIndex = -1;
  let isStreaming = false;
  let arrowsEnabled = true;
  let autoPlayOpponent = true; // Auto-play White's most likely response

  // Opening Book Responses for Sicilian Dragon Tabiya
  const DRAGON_BOOK_RESPONSES = {
    // After 12.h4 in Yugoslav
    'Nc4': 'Bxc4',
    'h5': 'Bg5',
    'Rxc3': 'bxc3',
    'Qa5': 'Kb1',
    'd5': 'exd5',
    'a6': 'h5',
    'b6': 'h5',
    'Re8': 'h5',
    'Qc7': 'Kb1',
    // After 13.Bxc4
    'Rxc4': 'h5',
    // After 14.h5
    'Nxh5': 'g4',
    // After 15.g4
    'Nf6': 'Nde2',
    // After 16.Nde2
    'Rfc8': 'Bh6',
    'Qa5': 'Bh6',
    // After 13.Bg5
    'Rc4': 'Kb1',
    // After 9.0-0-0 in central d5 line
    'Nxd5': 'Nxd5',
    'Qxd5': 'c4'
  };

  // Sicilian Dragon Tabiya Presets with Master Stats & Tactical Arrows
  const TABIYA_PRESETS = {
    'yugoslav_12h4': {
      name: 'Yugoslav 9.Bc4 Main Line (12.h4)',
      moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6', 'Be3', 'Bg7', 'f3', 'O-O', 'Qd2', 'Nc6', 'Bc4', 'Bd7', 'O-O-O', 'Rc8', 'Bb3', 'Ne5', 'h4'],
      turnDesc: 'Black to move (12...Nc4, 12...h5, or 12...Qa5)',
      stats: { total: '3,840', whitePct: 45, drawPct: 27, blackPct: 28 },
      candidates: [
        { san: 'Nc4', label: '12...Nc4 (1,840 GMs \u2022 52% Score)' },
        { san: 'h5', label: '12...h5 (960 GMs \u2022 49% Score)' },
        { san: 'Qa5', label: '12...Qa5 (620 GMs \u2022 46% Score)' }
      ],
      arrows: [
        { from: 'h4', to: 'h5', color: 'red', desc: "White's pawn storm threat" },
        { from: 'e5', to: 'c4', color: 'green', desc: "Black's 12...Nc4 outpost jump" },
        { from: 'h7', to: 'h5', color: 'gold', desc: "Black's 12...h5 Soltis clamp" },
        { from: 'c8', to: 'c3', color: 'blue', desc: "...Rxc3 exchange sacrifice line" }
      ]
    },
    'exchange_sac': {
      name: 'Thematic ...Rxc3 Exchange Sac Setup',
      moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6', 'Be3', 'Bg7', 'f3', 'O-O', 'Qd2', 'Nc6', 'Bc4', 'Bd7', 'O-O-O', 'Rc8', 'Bb3', 'Ne5', 'h4', 'Nc4', 'Bxc4', 'Rxc4', 'h5', 'Nxh5', 'g4', 'Nf6', 'Nde2', 'Qa5'],
      turnDesc: 'Black to move (Preparing ...Rfc8 and ...Rxc3!)',
      stats: { total: '1,420', whitePct: 38, drawPct: 24, blackPct: 38 },
      candidates: [
        { san: 'Rfc8', label: '...Rfc8 (Double rooks on c-file)' },
        { san: 'Rxc3', label: '...Rxc3!! (Thematic Sac)' }
      ],
      arrows: [
        { from: 'c4', to: 'c3', color: 'gold', desc: "...Rxc3!! destruction of White's king" },
        { from: 'g7', to: 'a1', color: 'green', desc: "Dragon Bishop dominates diagonal" }
      ]
    },
    'soltis_h5': {
      name: 'Soltis Variation (12...h5)',
      moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6', 'Be3', 'Bg7', 'f3', 'O-O', 'Qd2', 'Nc6', 'Bc4', 'Bd7', 'O-O-O', 'Rc8', 'Bb3', 'Ne5', 'h4', 'h5'],
      turnDesc: 'White to move (13.Bg5 or 13.Kb1)',
      stats: { total: '960', whitePct: 44, drawPct: 30, blackPct: 26 },
      candidates: [
        { san: 'Bg5', label: '13.Bg5 (Pinning the f6 knight)' },
        { san: 'Kb1', label: '13.Kb1 (King safety prophylaxis)' }
      ],
      arrows: [
        { from: 'e3', to: 'g5', color: 'red', desc: "White's 13.Bg5 pin" },
        { from: 'e5', to: 'c4', color: 'green', desc: "Black's 13...Nc4 reply" }
      ]
    },
    'yugoslav_d5': {
      name: 'Yugoslav 9.0-0-0 d5! Central Strike',
      moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6', 'Be3', 'Bg7', 'f3', 'O-O', 'Qd2', 'Nc6', 'O-O-O', 'd5'],
      turnDesc: 'White to move (10.exd5 or 10.Qe1)',
      stats: { total: '2,150', whitePct: 41, drawPct: 32, blackPct: 27 },
      candidates: [
        { san: 'exd5', label: '10.exd5 (Main line pawn grab)' },
        { san: 'Qe1', label: '10.Qe1 (Positional retreat)' }
      ],
      arrows: [
        { from: 'd6', to: 'd5', color: 'green', desc: "Black strikes at White's center" },
        { from: 'e4', to: 'd5', color: 'red', desc: "White's 10.exd5 capture" }
      ]
    },
    'chinese_dragon': {
      name: 'Chinese Dragon (10...Rb8)',
      moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6', 'Be3', 'Bg7', 'f3', 'O-O', 'Qd2', 'Nc6', 'Bc4', 'Bd7', 'O-O-O', 'Rb8'],
      turnDesc: 'White to move (Preparing ...b5 pawn storm)',
      stats: { total: '830', whitePct: 46, drawPct: 24, blackPct: 30 },
      candidates: [
        { san: 'Bb3', label: '11.Bb3 (Bishop safety)' },
        { san: 'h4', label: '11.h4 (Flank race)' }
      ],
      arrows: [
        { from: 'b7', to: 'b5', color: 'green', desc: "Chinese Dragon ...b5 storm" },
        { from: 'h2', to: 'h4', color: 'red', desc: "White's h4 push" }
      ]
    },
    'levenfish': {
      name: 'Levenfish Attack (6.f4)',
      moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6', 'f4'],
      turnDesc: 'Black to move (6...Nc6 or 6...Bg7)',
      stats: { total: '1,120', whitePct: 48, drawPct: 22, blackPct: 30 },
      candidates: [
        { san: 'Nc6', label: '6...Nc6 (Classical development)' },
        { san: 'Bg7', label: '6...Bg7 (Immediate fianchetto)' }
      ],
      arrows: [
        { from: 'f4', to: 'f5', color: 'red', desc: "White's early pawn push threat" },
        { from: 'b8', to: 'c6', color: 'green', desc: "Black develops pressure on d4" }
      ]
    },
    'classical': {
      name: 'Classical Dragon (6.Be2)',
      moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6', 'Be2', 'Bg7', 'Be3', 'O-O', 'O-O'],
      turnDesc: 'Black to move (8...Nc6)',
      stats: { total: '4,500', whitePct: 43, drawPct: 35, blackPct: 22 },
      candidates: [
        { san: 'Nc6', label: '8...Nc6 (Harmonious play)' },
        { san: 'd5', label: '8...d5 (Equalizing strike)' }
      ],
      arrows: [
        { from: 'b8', to: 'c6', color: 'green', desc: "Standard Dragon knight outpost" }
      ]
    },
    'initial': {
      name: 'Standard Starting Position',
      moves: [],
      turnDesc: 'White to move',
      stats: { total: '10,000,000+', whitePct: 38, drawPct: 34, blackPct: 28 },
      candidates: [
        { san: 'e4', label: '1.e4 (King Pawn)' },
        { san: 'd4', label: '1.d4 (Queen Pawn)' }
      ],
      arrows: [
        { from: 'e2', to: 'e4', color: 'green', desc: "Open Game" }
      ]
    }
  };

  // Conversation history
  const conversationHistory = [
    {
      role: 'assistant',
      content: "Alright, let's analyze your Yugoslav Attack game. We have the critical tabiya after: 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 g6 6.Be3 Bg7 7.f3 0-0 8.Qd2 Nc6 9.Bc4 Bd7 10.0-0-0 Rc8 11.Bb3 Ne5 12.h4. Auto-Reply is ON: when you make a move on the board for Black, White will automatically respond with the most tested Grandmaster move, and I will break down the tactics for you! ♟️"
    }
  ];

  // DOM Elements
  const chessboardEl = document.getElementById('chessboard');
  const variationSelect = document.getElementById('variation-select');
  const turnDot = document.getElementById('turn-dot');
  const turnText = document.getElementById('turn-text');
  const fenBadge = document.getElementById('fen-badge');
  const movesListEl = document.getElementById('moves-list');
  const btnConsultCoach = document.getElementById('btn-consult-coach');
  const btnFlipBoard = document.getElementById('btn-flip-board');
  const btnResetBoard = document.getElementById('btn-reset-board');
  const btnMoveStart = document.getElementById('btn-move-start');
  const btnMovePrev = document.getElementById('btn-move-prev');
  const btnMoveNext = document.getElementById('btn-move-next');
  const btnMoveEnd = document.getElementById('btn-move-end');
  const coordsRanks = document.getElementById('coords-ranks');
  const coordsFiles = document.getElementById('coords-files');

  // Intelligence & Sparring Elements
  const moveClassBadge = document.getElementById('move-class-badge');
  const btnToggleAutoPlay = document.getElementById('btn-toggle-auto-play');
  const autoPlayStateText = document.getElementById('auto-play-state-text');
  const btnToggleArrows = document.getElementById('btn-toggle-arrows');
  const arrowsStateText = document.getElementById('arrows-state-text');
  const btnToggleMasterStats = document.getElementById('btn-toggle-master-stats');
  const masterStatsBanner = document.getElementById('master-stats-banner');
  const statsTotalGames = document.getElementById('stats-total-games');
  const statWhitePct = document.getElementById('stat-white-pct');
  const statDrawPct = document.getElementById('stat-draw-pct');
  const statBlackPct = document.getElementById('stat-black-pct');
  const masterCandidatesEl = document.getElementById('master-candidates');
  const arrowPathsGroup = document.getElementById('arrow-paths-group');
  const evalScoreText = document.getElementById('eval-score-text');
  const evalFillWhite = document.getElementById('eval-fill-white');
  const evalFillBlack = document.getElementById('eval-fill-black');

  // iMessage Elements
  const messagesContainer = document.getElementById('messages-container');
  const chatInput = document.getElementById('chat-input');
  const btnSend = document.getElementById('btn-send');
  const btnResetSession = document.getElementById('btn-reset-session');

  // ==========================================================
  // 1. Board Evaluation & Move Classification
  // ==========================================================
  function calculateEvaluation() {
    let score = 0;
    const pieceValues = { p: 1, n: 3.1, b: 3.3, r: 5, q: 9.5, k: 0 };
    
    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const sq = board[r][f];
        if (sq) {
          const val = pieceValues[sq.type] || 0;
          score += sq.color === 'w' ? val : -val;
        }
      }
    }

    // Sicilian Dragon Positional heuristics
    const g7Piece = chess.get('g7');
    if (g7Piece && g7Piece.type === 'b' && g7Piece.color === 'b') {
      score -= 0.35;
    }

    const c4Piece = chess.get('c4');
    if (c4Piece && c4Piece.type === 'n' && c4Piece.color === 'b') {
      score -= 0.5;
    }

    const h5Piece = chess.get('h5');
    if (h5Piece && h5Piece.type === 'p' && h5Piece.color === 'w') {
      score += 0.45;
    }

    const c8Piece = chess.get('c8');
    const c4Rook = chess.get('c4');
    if ((c8Piece && c8Piece.type === 'r' && c8Piece.color === 'b') || (c4Rook && c4Rook.type === 'r' && c4Rook.color === 'b')) {
      score -= 0.25;
    }

    return score;
  }

  function updateEvalBar() {
    const rawScore = calculateEvaluation();
    const formattedScore = (rawScore > 0 ? `+${rawScore.toFixed(1)}` : rawScore.toFixed(1));
    evalScoreText.textContent = formattedScore;

    const clampedScore = Math.max(-5, Math.min(5, rawScore));
    const whiteHeight = 50 + (clampedScore / 5) * 45;
    const blackHeight = 100 - whiteHeight;

    evalFillWhite.style.height = `${whiteHeight}%`;
    evalFillBlack.style.height = `${blackHeight}%`;
  }

  function classifyMove(san) {
    if (!san) {
      setMoveClassification('book', '✓', 'Book Tabiya');
      return;
    }

    if (san.includes('Rxc3') || san.includes('c3')) {
      setMoveClassification('brilliant', '!!', 'Brilliant Sac');
    } else if (san === 'Nc4' || san === 'h5' || san === 'd5') {
      setMoveClassification('great', '!', 'Great Move');
    } else if (san === 'Bxc4' || san === 'Bg5' || san === 'Kb1' || san === 'Qa5' || san === 'Bb3') {
      setMoveClassification('best', '⭐', 'Best Move');
    } else if (san === 'a6' || san === 'b6') {
      setMoveClassification('book', '✓', 'Book Move');
    } else {
      setMoveClassification('best', '⭐', 'Book Move');
    }
  }

  function setMoveClassification(type, icon, label) {
    moveClassBadge.className = `move-classification-badge ${type}`;
    moveClassBadge.innerHTML = `<span class="badge-icon">${icon}</span><span class="badge-text">${label}</span>`;
  }

  function getCurrentBoardContext() {
    let sanStr = '';
    for (let i = 0; i < moveHistory.length; i += 2) {
      const num = Math.floor(i / 2) + 1;
      sanStr += `${num}.${moveHistory[i].san} `;
      if (moveHistory[i + 1]) {
        sanStr += `${moveHistory[i + 1].san} `;
      }
    }

    const lastMoveSan = currentMoveIndex >= 0 ? moveHistory[currentMoveIndex]?.san : 'None';
    const activePreset = TABIYA_PRESETS[variationSelect.value]?.name || 'Sicilian Dragon';

    return {
      fen: chess.fen(),
      preset: activePreset,
      san_history: sanStr.trim(),
      last_move: lastMoveSan,
      turn: chess.turn() === 'w' ? 'White' : 'Black',
      is_check: chess.in_check(),
      is_game_over: chess.game_over(),
      is_checkmate: chess.in_checkmate(),
      legal_moves: chess.moves()
    };
  }

  // ==========================================================
  // 2. White Auto-Opponent Response Engine
  // ==========================================================
  function pickWhiteBestMove(lastBlackSan) {
    // 1. Check opening book lookup
    if (lastBlackSan && DRAGON_BOOK_RESPONSES[lastBlackSan]) {
      const bookSan = DRAGON_BOOK_RESPONSES[lastBlackSan];
      const valid = chess.moves().find(m => m === bookSan || m.replace(/[+#]/, '') === bookSan);
      if (valid) return valid;
    }

    // 2. Fallback heuristic evaluation
    const legalMoves = chess.moves({ verbose: true });
    if (legalMoves.length === 0) return null;

    let bestMove = legalMoves[0];
    let bestScore = -9999;

    for (const move of legalMoves) {
      chess.move(move);
      const score = calculateEvaluation(); // White wants positive score
      chess.undo();

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove.san;
  }

  function triggerWhiteAutoResponse(lastBlackSan) {
    if (!autoPlayOpponent || chess.turn() !== 'w' || chess.game_over()) return;

    turnText.textContent = 'White is calculating...';
    turnDot.className = 'turn-dot white';

    setTimeout(() => {
      if (chess.turn() !== 'w') return;

      const whiteMoveSan = pickWhiteBestMove(lastBlackSan);
      if (!whiteMoveSan) return;

      const moveObj = chess.move(whiteMoveSan);
      if (moveObj) {
        moveHistory.push({
          san: moveObj.san,
          fen: chess.fen(),
          from: moveObj.from,
          to: moveObj.to
        });
        currentMoveIndex = moveHistory.length - 1;
        renderBoard();
        renderMovesList();
        renderArrows();
        updateEvalBar();
        classifyMove(moveObj.san);

        // Coach Vance automatic tactical coaching on White's response
        if (!isStreaming) {
          const prompt = `The student played "${lastBlackSan}" for Black, and White responded with "${moveObj.san}" (FEN: ${chess.fen()}). Provide sharp, constructive grandmaster commentary on White's move, explain Black's tactical choices next, and ask the student for their move!`;
          conversationHistory.push({ role: 'user', content: prompt });
          streamResponseFromOllama();
        }
      }
    }, 750);
  }

  btnToggleAutoPlay.addEventListener('click', () => {
    autoPlayOpponent = !autoPlayOpponent;
    autoPlayStateText.textContent = autoPlayOpponent ? 'ON' : 'OFF';
    btnToggleAutoPlay.classList.toggle('active-toggle', autoPlayOpponent);
  });

  // ==========================================================
  // 3. Dynamic SVG Arrow Overlay Engine
  // ==========================================================
  function squareToSvgCoords(sq) {
    const file = sq[0];
    const rank = sq[1];
    const files = boardOrientation === 'white' ? 'abcdefgh' : 'hgfedcba';
    const ranks = boardOrientation === 'white' ? '87654321' : '12345678';

    const col = files.indexOf(file);
    const row = ranks.indexOf(rank);

    if (col === -1 || row === -1) return { x: 400, y: 400 };

    const sqSize = 100;
    return {
      x: col * sqSize + 50,
      y: row * sqSize + 50
    };
  }

  function renderArrows() {
    arrowPathsGroup.innerHTML = '';
    if (!arrowsEnabled) return;

    const preset = TABIYA_PRESETS[variationSelect.value];
    if (!preset || !preset.arrows) return;

    preset.arrows.forEach(arr => {
      const from = squareToSvgCoords(arr.from);
      const to = squareToSvgCoords(arr.to);

      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const shorten = 18;
      const targetX = to.x - (dx / dist) * shorten;
      const targetY = to.y - (dy / dist) * shorten;

      const markerColor = arr.color === 'green' ? '#34d399' : (arr.color === 'red' ? '#f87171' : (arr.color === 'gold' ? '#fbbf24' : '#60a5fa'));
      const markerId = `arrow-${arr.color}`;

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', from.x);
      line.setAttribute('y1', from.y);
      line.setAttribute('x2', targetX);
      line.setAttribute('y2', targetY);
      line.setAttribute('stroke', markerColor);
      line.setAttribute('stroke-width', '10');
      line.setAttribute('marker-end', `url(#${markerId})`);
      line.setAttribute('class', 'arrow-path');

      arrowPathsGroup.appendChild(line);
    });
  }

  btnToggleArrows.addEventListener('click', () => {
    arrowsEnabled = !arrowsEnabled;
    arrowsStateText.textContent = arrowsEnabled ? 'ON' : 'OFF';
    btnToggleArrows.classList.toggle('active-toggle', arrowsEnabled);
    renderArrows();
  });

  // ==========================================================
  // 4. Master Database Opening Stats
  // ==========================================================
  function updateMasterStats(presetKey) {
    const preset = TABIYA_PRESETS[presetKey] || TABIYA_PRESETS['yugoslav_12h4'];
    if (preset.stats) {
      statsTotalGames.textContent = `${preset.stats.total} Master Games in this line`;
      statWhitePct.style.width = `${preset.stats.whitePct}%`;
      statWhitePct.textContent = `${preset.stats.whitePct}% ♔`;

      statDrawPct.style.width = `${preset.stats.drawPct}%`;
      statDrawPct.textContent = `${preset.stats.drawPct}% =`;

      statBlackPct.style.width = `${preset.stats.blackPct}%`;
      statBlackPct.textContent = `${preset.stats.blackPct}% ♚`;
    }

    if (preset.candidates) {
      masterCandidatesEl.innerHTML = '<span class="cand-label">Top GM Moves:</span>';
      preset.candidates.forEach(cand => {
        const chip = document.createElement('button');
        chip.className = 'cand-chip';
        chip.textContent = cand.label;
        chip.addEventListener('click', () => {
          const move = chess.move(cand.san);
          if (move) {
            moveHistory.push({
              san: move.san,
              fen: chess.fen(),
              from: move.from,
              to: move.to
            });
            currentMoveIndex = moveHistory.length - 1;
            renderBoard();
            renderMovesList();
            classifyMove(move.san);
            updateEvalBar();

            appendUserBubble(`Master Move: ${cand.san}`);

            if (autoPlayOpponent && chess.turn() === 'w') {
              triggerWhiteAutoResponse(move.san);
            } else {
              const prompt = `I played the master candidate move "${cand.san}" (${cand.label}). Break down the calculation and what tactical ideas Black is pursuing.`;
              conversationHistory.push({ role: 'user', content: prompt });
              streamResponseFromOllama();
            }
          }
        });
        masterCandidatesEl.appendChild(chip);
      });
    }
  }

  btnToggleMasterStats.addEventListener('click', () => {
    masterStatsBanner.classList.toggle('active');
  });

  // ==========================================================
  // 5. Board & Move Management
  // ==========================================================
  function loadPreset(presetKey, triggerCoachPrompt = false) {
    const preset = TABIYA_PRESETS[presetKey] || TABIYA_PRESETS['yugoslav_12h4'];
    chess.reset();
    moveHistory = [];

    preset.moves.forEach(san => {
      const moveObj = chess.move(san);
      if (moveObj) {
        moveHistory.push({
          san: moveObj.san,
          fen: chess.fen(),
          from: moveObj.from,
          to: moveObj.to
        });
      }
    });

    currentMoveIndex = moveHistory.length - 1;
    renderBoard();
    renderMovesList();
    renderArrows();
    updateEvalBar();
    updateMasterStats(presetKey);
    classifyMove(moveHistory[currentMoveIndex]?.san || null);

    if (triggerCoachPrompt && !isStreaming) {
      const userPrompt = `I just switched to the position: "${preset.name}". Give me your high-level tactical assessment of this setup and what Black should prioritize.`;
      appendUserBubble(`Switched to tabiya: ${preset.name}`);
      conversationHistory.push({ role: 'user', content: userPrompt });
      streamResponseFromOllama();
    }
  }

  function updateCoordinates() {
    const ranks = boardOrientation === 'white' ? ['8','7','6','5','4','3','2','1'] : ['1','2','3','4','5','6','7','8'];
    const files = boardOrientation === 'white' ? ['a','b','c','d','e','f','g','h'] : ['h','g','f','e','d','c','b','a'];
    coordsRanks.innerHTML = ranks.map(r => `<span>${r}</span>`).join('');
    coordsFiles.innerHTML = files.map(f => `<span>${f}</span>`).join('');
  }

  function renderBoard() {
    chessboardEl.innerHTML = '';
    const files = boardOrientation === 'white' ? ['a','b','c','d','e','f','g','h'] : ['h','g','f','e','d','c','b','a'];
    const ranks = boardOrientation === 'white' ? ['8','7','6','5','4','3','2','1'] : ['1','2','3','4','5','6','7','8'];

    const lastMove = currentMoveIndex >= 0 ? moveHistory[currentMoveIndex] : null;
    updateCoordinates();

    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const file = files[f];
        const rank = ranks[r];
        const sqName = file + rank;
        const fileIdx = 'abcdefgh'.indexOf(file);
        const rankIdx = parseInt(rank) - 1;
        const isLight = (fileIdx + rankIdx) % 2 !== 0;

        const sq = document.createElement('div');
        sq.className = `sq ${isLight ? 'light' : 'dark'}`;
        sq.setAttribute('data-sq', sqName);

        // Highlight last move
        if (lastMove && (sqName === lastMove.from || sqName === lastMove.to)) {
          sq.classList.add('highlight');
        }

        // Selected square
        if (selectedSquare === sqName) {
          sq.classList.add('selected');
        }

        // Legal move indicators
        const legalMove = legalMovesForSelected.find(m => m.to === sqName);
        if (legalMove) {
          if (legalMove.captured || chess.get(sqName)) {
            sq.classList.add('legal-capture');
          } else {
            sq.classList.add('legal-move');
          }
        }

        // Piece SVG
        const piece = chess.get(sqName);
        if (piece) {
          const pieceCode = piece.color + piece.type.toUpperCase();
          sq.innerHTML = getPieceSvg(pieceCode);
        }

        sq.addEventListener('click', () => handleSquareClick(sqName));
        chessboardEl.appendChild(sq);
      }
    }

    // Turn indicator
    const isWhiteTurn = chess.turn() === 'w';
    turnDot.className = `turn-dot ${isWhiteTurn ? 'white' : 'black'}`;
    turnText.textContent = isWhiteTurn ? 'White to move' : 'Black to move';
    fenBadge.textContent = '📋 FEN';
  }

  function handleSquareClick(sqName) {
    if (!selectedSquare) {
      const piece = chess.get(sqName);
      if (piece && piece.color === chess.turn()) {
        selectedSquare = sqName;
        legalMovesForSelected = chess.moves({ square: sqName, verbose: true });
        renderBoard();
      }
    } else {
      if (selectedSquare === sqName) {
        selectedSquare = null;
        legalMovesForSelected = [];
        renderBoard();
      } else {
        const move = chess.move({
          from: selectedSquare,
          to: sqName,
          promotion: 'q'
        });

        if (move) {
          const playedSan = move.san;
          moveHistory.push({
            san: move.san,
            fen: chess.fen(),
            from: move.from,
            to: move.to
          });
          currentMoveIndex = moveHistory.length - 1;
          selectedSquare = null;
          legalMovesForSelected = [];
          renderBoard();
          renderMovesList();
          renderArrows();
          updateEvalBar();
          classifyMove(playedSan);

          appendUserBubble(`Played on board: ${playedSan}`);

          // If auto-opponent is enabled and it's White's turn, trigger White auto response!
          if (autoPlayOpponent && chess.turn() === 'w') {
            triggerWhiteAutoResponse(playedSan);
          } else if (!isStreaming) {
            const movePrompt = `I just played "${playedSan}" on the board (FEN: ${chess.fen()}). Analyze this move in the context of the Dragon. Is it strong, sharp, or does White have an immediate tactical counter-threat?`;
            conversationHistory.push({ role: 'user', content: movePrompt });
            streamResponseFromOllama();
          }

        } else {
          const piece = chess.get(sqName);
          if (piece && piece.color === chess.turn()) {
            selectedSquare = sqName;
            legalMovesForSelected = chess.moves({ square: sqName, verbose: true });
            renderBoard();
          } else {
            selectedSquare = null;
            legalMovesForSelected = [];
            renderBoard();
          }
        }
      }
    }
  }

  function renderMovesList() {
    movesListEl.innerHTML = '';
    for (let i = 0; i < moveHistory.length; i += 2) {
      const moveNum = Math.floor(i / 2) + 1;
      const whiteMove = moveHistory[i];
      const blackMove = moveHistory[i + 1];

      const whiteSpan = document.createElement('span');
      whiteSpan.className = `move-entry ${currentMoveIndex === i ? 'active-move' : ''}`;
      whiteSpan.innerHTML = `<span class="move-num">${moveNum}.</span>${whiteMove.san}`;
      whiteSpan.addEventListener('click', () => jumpToMove(i));

      movesListEl.appendChild(whiteSpan);

      if (blackMove) {
        const blackSpan = document.createElement('span');
        blackSpan.className = `move-entry ${currentMoveIndex === (i + 1) ? 'active-move' : ''}`;
        blackSpan.textContent = blackMove.san;
        blackSpan.addEventListener('click', () => jumpToMove(i + 1));
        movesListEl.appendChild(blackSpan);
      }
    }

    movesListEl.scrollLeft = movesListEl.scrollWidth;
  }

  function jumpToMove(index) {
    if (index < 0 || index >= moveHistory.length) return;
    const targetMove = moveHistory[index];
    chess.load(targetMove.fen);
    currentMoveIndex = index;
    selectedSquare = null;
    legalMovesForSelected = [];
    renderBoard();
    renderMovesList();
    renderArrows();
    updateEvalBar();
    classifyMove(targetMove.san);
  }

  // Navigation controls
  btnMoveStart.addEventListener('click', () => {
    if (moveHistory.length === 0) return;
    chess.reset();
    currentMoveIndex = -1;
    renderBoard();
    renderMovesList();
    renderArrows();
    updateEvalBar();
    classifyMove(null);
  });

  btnMovePrev.addEventListener('click', () => {
    if (currentMoveIndex > 0) {
      jumpToMove(currentMoveIndex - 1);
    } else if (currentMoveIndex === 0) {
      chess.reset();
      currentMoveIndex = -1;
      renderBoard();
      renderMovesList();
      renderArrows();
      updateEvalBar();
      classifyMove(null);
    }
  });

  btnMoveNext.addEventListener('click', () => {
    if (currentMoveIndex < moveHistory.length - 1) {
      jumpToMove(currentMoveIndex + 1);
    }
  });

  btnMoveEnd.addEventListener('click', () => {
    if (moveHistory.length > 0) {
      jumpToMove(moveHistory.length - 1);
    }
  });

  btnFlipBoard.addEventListener('click', () => {
    boardOrientation = boardOrientation === 'white' ? 'black' : 'white';
    renderBoard();
    renderArrows();
  });

  btnResetBoard.addEventListener('click', () => {
    loadPreset(variationSelect.value, false);
  });

  variationSelect.addEventListener('change', (e) => {
    loadPreset(e.target.value, true);
  });

  fenBadge.addEventListener('click', () => {
    navigator.clipboard.writeText(chess.fen());
    fenBadge.textContent = '✅ Copied!';
    setTimeout(() => { fenBadge.textContent = '📋 FEN'; }, 1500);
  });

  // Ask Coach Consultation Button
  btnConsultCoach.addEventListener('click', () => {
    const boardCtx = getCurrentBoardContext();
    const question = `Coach Vance, evaluate this position on the board (${boardCtx.preset}):\nMove: ${boardCtx.last_move} | Turn: ${boardCtx.turn} to play\nFEN: ${boardCtx.fen}\n\nWhat are the top tactical candidate moves for ${boardCtx.turn} and what plans should I formulate?`;
    
    chatInput.value = question;
    handleSendMessage();
  });

  // ==========================================================
  // 6. Apple iMessage Messaging System & Ollama Streaming
  // ==========================================================
  chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 100) + 'px';
  });

  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });

  btnSend.addEventListener('click', handleSendMessage);

  document.querySelectorAll('.tactic-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      chatInput.value = pill.getAttribute('data-msg');
      handleSendMessage();
    });
  });

  function appendUserBubble(text) {
    const group = document.createElement('div');
    group.className = 'msg-group user-group';
    group.setAttribute('data-role', 'user');

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble user-bubble';
    bubble.textContent = text;

    const receipt = document.createElement('div');
    receipt.className = 'msg-delivered-receipt';
    const now = new Date();
    let hours = now.getHours() % 12 || 12;
    let mins = now.getMinutes() < 10 ? '0' + now.getMinutes() : now.getMinutes();
    let ampm = now.getHours() >= 12 ? 'PM' : 'AM';
    receipt.textContent = `Delivered \u2022 ${hours}:${mins} ${ampm}`;

    group.appendChild(bubble);
    group.appendChild(receipt);
    messagesContainer.appendChild(group);
    scrollToBottom();
  }

  function createTypingBubble() {
    const group = document.createElement('div');
    group.className = 'msg-group coach-group typing-group';
    group.id = 'typing-indicator';

    const bubble = document.createElement('div');
    bubble.className = 'typing-bubble';
    bubble.innerHTML = `
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    `;

    group.appendChild(bubble);
    messagesContainer.appendChild(group);
    scrollToBottom();
  }

  function removeTypingBubble() {
    const typing = document.getElementById('typing-indicator');
    if (typing) typing.remove();
  }

  function formatCoachMessage(text) {
    let html = text
      .replace(/\n\n/g, '<br><br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Highlight move notations
    html = html.replace(/(\b\d+\.\s*[a-zA-Z0-9\+\#\=\-]+\s*[a-zA-Z0-9\+\#\=\-]*)/g, '<span style="color:#93c5fd; font-weight:600;">$1</span>');
    html = html.replace(/(\.\.\.[a-zA-Z0-9\+\#\=\-]+)/g, '<span style="color:#fdba74; font-weight:600;">$1</span>');
    return html;
  }

  function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  async function handleSendMessage() {
    const text = chatInput.value.trim();
    if (!text || isStreaming) return;

    chatInput.value = '';
    chatInput.style.height = 'auto';

    appendUserBubble(text);
    conversationHistory.push({ role: 'user', content: text });

    await streamResponseFromOllama();
  }

  async function streamResponseFromOllama() {
    isStreaming = true;
    btnSend.disabled = true;
    createTypingBubble();

    const boardContext = getCurrentBoardContext();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: conversationHistory,
          board_context: boardContext
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      removeTypingBubble();

      const group = document.createElement('div');
      group.className = 'msg-group coach-group';
      group.setAttribute('data-role', 'assistant');

      const bubble = document.createElement('div');
      bubble.className = 'msg-bubble coach-bubble';
      group.appendChild(bubble);

      const receipt = document.createElement('div');
      receipt.className = 'msg-delivered-receipt';
      receipt.textContent = 'Delivered \u2022 Just now';
      group.appendChild(receipt);

      messagesContainer.appendChild(group);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullAssistantReply = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            if (dataStr === '[DONE]') break;
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.content) {
                fullAssistantReply += parsed.content;
                bubble.innerHTML = formatCoachMessage(fullAssistantReply);
                scrollToBottom();
              }
            } catch (e) {}
          }
        }
      }

      conversationHistory.push({ role: 'assistant', content: fullAssistantReply });

    } catch (err) {
      removeTypingBubble();
      console.error('Chat error:', err);
      const errGroup = document.createElement('div');
      errGroup.className = 'msg-group coach-group';
      errGroup.innerHTML = `
        <div class="msg-bubble coach-bubble" style="border-left: 3px solid #ff3b30;">
          ⚠️ <em>Connection error:</em> ${err.message}. Ensure Ollama is running.
        </div>
      `;
      messagesContainer.appendChild(errGroup);
      scrollToBottom();
    } finally {
      isStreaming = false;
      btnSend.disabled = false;
    }
  }

  btnResetSession.addEventListener('click', () => {
    if (confirm('Reset coaching session to the Yugoslav Attack 12.h4 tabiya?')) {
      location.reload();
    }
  });

  // Initial load
  loadPreset('yugoslav_12h4', false);
});
