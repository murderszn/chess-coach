/**
 * Grandmaster Chess Coach (Julian Vance) — Multi-Repertoire Mastery
 * Supports Black (Sicilian Dragon / Dark Theme) & White (Aggressive 1.e4 & Fried Liver / Light Theme)
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Chess Engine
  const chess = new Chess();
  let currentRepertoire = 'black_dragon'; // 'black_dragon' or 'white_attack'
  let boardOrientation = 'black';
  let selectedSquare = null;
  let legalMovesForSelected = [];
  let moveHistory = [];
  let currentMoveIndex = -1;
  let isStreaming = false;
  let arrowsEnabled = true;
  let autoPlayOpponent = true;
  let soundEnabled = true;

  // ==========================================================
  // Web Audio Synthesizer
  // ==========================================================
  let audioCtx = null;
  function getAudioContext() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function playChessSound(type = 'move') {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'capture') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.12);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'check') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.16);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
        osc.start(now);
        osc.stop(now + 0.16);
      } else if (type === 'gameover') {
        [440, 554, 659, 880].forEach((freq, i) => {
          const chordOsc = ctx.createOscillator();
          const chordGain = ctx.createGain();
          chordOsc.type = 'triangle';
          chordOsc.frequency.setValueAtTime(freq, now + i * 0.08);
          chordGain.gain.setValueAtTime(0.18, now + i * 0.08);
          chordGain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
          chordOsc.connect(chordGain);
          chordGain.connect(ctx.destination);
          chordOsc.start(now + i * 0.08);
          chordOsc.stop(now + 0.6);
        });
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(210, now + 0.08);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      }
    } catch (e) {}
  }

  // ==========================================================
  // Repertoire Presets (Black Dragon vs White 1.e4 Aggression)
  // ==========================================================
  const REPERTOIRE_PRESETS = {
    'black_dragon': {
      'yugoslav_12h4': {
        name: '🐉 Yugoslav 9.Bc4 Main Line (12.h4)',
        moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6', 'Be3', 'Bg7', 'f3', 'O-O', 'Qd2', 'Nc6', 'Bc4', 'Bd7', 'O-O-O', 'Rc8', 'Bb3', 'Ne5', 'h4'],
        stats: { total: '3,840', whitePct: 45, drawPct: 27, blackPct: 28 }
      },
      'exchange_sac': {
        name: '💥 Thematic ...Rxc3 Sac Setup',
        moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6', 'Be3', 'Bg7', 'f3', 'O-O', 'Qd2', 'Nc6', 'Bc4', 'Bd7', 'O-O-O', 'Rc8', 'Bb3', 'Ne5', 'h4', 'Nc4', 'Bxc4', 'Rxc4', 'h5', 'Nxh5', 'g4', 'Nf6', 'Nde2', 'Qa5'],
        stats: { total: '1,420', whitePct: 38, drawPct: 24, blackPct: 38 }
      },
      'soltis_h5': {
        name: '🛡️ Soltis Variation (12...h5)',
        moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6', 'Be3', 'Bg7', 'f3', 'O-O', 'Qd2', 'Nc6', 'Bc4', 'Bd7', 'O-O-O', 'Rc8', 'Bb3', 'Ne5', 'h4', 'h5'],
        stats: { total: '960', whitePct: 44, drawPct: 30, blackPct: 26 }
      },
      'yugoslav_d5': {
        name: '⚡ Yugoslav 9.0-0-0 d5! Strike',
        moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6', 'Be3', 'Bg7', 'f3', 'O-O', 'Qd2', 'Nc6', 'O-O-O', 'd5'],
        stats: { total: '2,150', whitePct: 41, drawPct: 32, blackPct: 27 }
      },
      'chinese_dragon': {
        name: '🏮 Chinese Dragon (10...Rb8)',
        moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6', 'Be3', 'Bg7', 'f3', 'O-O', 'Qd2', 'Nc6', 'Bc4', 'Bd7', 'O-O-O', 'Rb8'],
        stats: { total: '830', whitePct: 46, drawPct: 24, blackPct: 30 }
      },
      'levenfish': {
        name: '🗡️ Levenfish Attack (6.f4)',
        moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6', 'f4'],
        stats: { total: '1,120', whitePct: 48, drawPct: 22, blackPct: 30 }
      },
      'classical': {
        name: '♟️ Classical Dragon (6.Be2)',
        moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6', 'Be2', 'Bg7', 'Be3', 'O-O', 'O-O'],
        stats: { total: '4,500', whitePct: 43, drawPct: 35, blackPct: 22 }
      },
      'initial': {
        name: '🏁 Play as Black vs Computer (1.e4)',
        moves: [],
        stats: { total: '12,500,000+', whitePct: 38, drawPct: 34, blackPct: 28 }
      }
    },
    'white_attack': {
      'fried_liver_sac': {
        name: '🍗 Fried Liver Attack (6.Nxf7!?)',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Nxd5', 'Nxf7', 'Kxf7', 'Qf3+', 'Ke6', 'Nc3'],
        stats: { total: '18,500', whitePct: 62, drawPct: 12, blackPct: 26 }
      },
      'two_knights_4ng5': {
        name: '🎯 Italian: Two Knights (4.Ng5)',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Na5', 'Bb5+', 'c6', 'dxc6', 'bxc6', 'Be2'],
        stats: { total: '24,000', whitePct: 54, drawPct: 22, blackPct: 24 }
      },
      'evans_gambit': {
        name: '⛵ Evans Gambit Accepted (4.b4!?)',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'b4', 'Bxb4', 'c3', 'Ba5', 'd4'],
        stats: { total: '12,400', whitePct: 56, drawPct: 18, blackPct: 26 }
      },
      'grand_prix_sicilian': {
        name: '🏎️ Grand Prix Attack vs Sicilian (3.f4)',
        moves: ['e4', 'c5', 'Nc3', 'Nc6', 'f4', 'g6', 'Nf3', 'Bg7', 'Bc4', 'e6', 'f5'],
        stats: { total: '9,800', whitePct: 53, drawPct: 21, blackPct: 26 }
      },
      'smith_morra_gambit': {
        name: '💣 Smith-Morra Gambit vs Sicilian (3.c3!?)',
        moves: ['e4', 'c5', 'd4', 'cxd4', 'c3', 'dxc3', 'Nxc3', 'Nc6', 'Nf3', 'd6', 'Bc4'],
        stats: { total: '14,200', whitePct: 58, drawPct: 16, blackPct: 26 }
      },
      'kings_gambit': {
        name: "👑 King's Gambit Accepted (2.f4!?)",
        moves: ['e4', 'e5', 'f4', 'exf4', 'Nf3', 'g5', 'Bc4', 'g4', 'O-O'],
        stats: { total: '16,700', whitePct: 55, drawPct: 15, blackPct: 30 }
      },
      'white_start': {
        name: '🏁 Play as White (Start 1.e4 vs Auto-Black)',
        moves: [],
        stats: { total: '12,500,000+', whitePct: 38, drawPct: 34, blackPct: 28 }
      }
    }
  };

  // Quick Tactic Chips for each repertoire
  const REPERTOIRE_TACTICS = {
    'black_dragon': [
      { label: '⚔️ 12...Nc4 Outpost', msg: "I played 12...Nc4 forcing White's bishop off b3. How does Black handle 13.Bxc4 Rxc4 14.h5 Nxh5 15.g4 Nf6?" },
      { label: '🛡️ 12...h5 Soltis', msg: "I wanted to play 12...h5 (Soltis Variation) to clamp down the h-file. What is White's most dangerous counter?" },
      { label: '💥 ...Rxc3 Sac', msg: "I want to play the thematic exchange sacrifice ...Rxc3! What are the exact conditions where giving up the rook on c3 is completely winning?" },
      { label: '⚡ 9.0-0-0 d5! Strike', msg: "What if White plays 9.0-0-0 without Bc4? Can I strike immediately with 9...d5?" }
    ],
    'white_attack': [
      { label: '🍗 6.Nxf7! Fried Liver', msg: "I sacrificed my knight on f7 (6.Nxf7!). How do I maintain maximum tactical pressure against Black's exposed king on e6?" },
      { label: '🎯 4.Ng5 Italian Attack', msg: "In the Italian Two Knights (4.Ng5), how do I punish Black if they play 4...Bc5 (Traxler) or 5...Nxd5?" },
      { label: '⛵ 4.b4 Evans Gambit', msg: "I gave up the b4 pawn in the Evans Gambit for tempo. What are the key attacking paths down the c and d files?" },
      { label: '💣 3.c3 Smith-Morra', msg: "In the Smith-Morra Gambit vs the Sicilian, how do I coordinate my rooks on c1 and d1 for a rapid kingside mating net?" }
    ]
  };

  // Comprehensive Book Responses
  const OPENING_BOOK = {
    // White responses vs Black moves (when playing Black)
    "1.e4 c5": "Nf3",
    "1.e4 c5 2.Nf3 d6": "d4",
    "1.e4 c5 2.Nf3 d6 3.d4 cxd4": "Nxd4",
    "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6": "Nc3",
    "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 g6": "Be3",
    "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 g6 6.Be3 Bg7": "f3",
    "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 g6 6.Be3 Bg7 7.f3 O-O": "Qd2",
    "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 g6 6.Be3 Bg7 7.f3 O-O 8.Qd2 Nc6": "Bc4",
    "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 g6 6.Be3 Bg7 7.f3 O-O 8.Qd2 Nc6 9.Bc4 Bd7": "O-O-O",
    "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 g6 6.Be3 Bg7 7.f3 O-O 8.Qd2 Nc6 9.Bc4 Bd7 10.O-O-O Rc8": "Bb3",
    "1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 g6 6.Be3 Bg7 7.f3 O-O 8.Qd2 Nc6 9.Bc4 Bd7 10.O-O-O Rc8 11.Bb3 Ne5": "h4",
    "Nc4": "Bxc4",
    "h5": "Bg5",
    "Rxc3": "bxc3",
    "Qa5": "Kb1",
    "d5": "exd5",

    // Black responses vs White moves (when user plays as White)
    "1.e4": "e5",
    "1.e4 e5 2.Nf3": "Nc6",
    "1.e4 e5 2.Nf3 Nc6 3.Bc4": "Nf6", // Two Knights Defense
    "1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Ng5": "d5",
    "1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Ng5 d5 5.exd5": "Nxd5", // Fried Liver trigger
    "1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Ng5 d5 5.exd5 Nxd5 6.Nxf7": "Kxf7",
    "1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Ng5 d5 5.exd5 Nxd5 6.Nxf7 Kxf7 7.Qf3+": "Ke6",
    "1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Ng5 d5 5.exd5 Nxd5 6.Nxf7 Kxf7 7.Qf3+ Ke6 8.Nc3": "Ncb4",
    // Evans Gambit
    "1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5": "b4",
    "1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.b4": "Bxb4",
    "1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.b4 Bxb4 5.c3": "Ba5",
    "1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.b4 Bxb4 5.c3 Ba5 6.d4": "exd4"
  };

  // Conversation history
  const conversationHistory = [
    {
      role: 'assistant',
      content: "Welcome to Grandmaster Coaching! Switch between your Black Sicilian Dragon repertoire (Dark Theme) and your White Aggressive 1.e4 / Fried Liver repertoire (Light Theme) at any time. When you play your moves on the board, the computer will automatically respond, and I will coach you on winning calculations! ♟️"
    }
  ];

  // DOM Elements
  const chessboardEl = document.getElementById('chessboard');
  const variationSelect = document.getElementById('variation-select');
  const btnRepBlack = document.getElementById('btn-rep-black');
  const btnRepWhite = document.getElementById('btn-rep-white');
  const tacticsChipsContainer = document.getElementById('tactics-chips-container');
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
  const btnToggleSound = document.getElementById('btn-toggle-sound');
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

  // Modal Elements
  const gameOverModal = document.getElementById('game-over-modal');
  const gameOverTitle = document.getElementById('game-over-title');
  const gameOverSubtitle = document.getElementById('game-over-subtitle');
  const gameOverStats = document.getElementById('game-over-stats');
  const btnModalRematch = document.getElementById('btn-modal-rematch');
  const btnModalClose = document.getElementById('btn-modal-close');

  // iMessage Elements
  const messagesContainer = document.getElementById('messages-container');
  const chatInput = document.getElementById('chat-input');
  const btnSend = document.getElementById('btn-send');
  const btnResetSession = document.getElementById('btn-reset-session');

  // ==========================================================
  // 1. Repertoire & Theme Switcher
  // ==========================================================
  function setRepertoire(repKey) {
    currentRepertoire = repKey;

    if (repKey === 'white_attack') {
      document.body.classList.add('light-theme');
      btnRepWhite.classList.add('active');
      btnRepBlack.classList.remove('active');
      boardOrientation = 'white';
    } else {
      document.body.classList.remove('light-theme');
      btnRepBlack.classList.add('active');
      btnRepWhite.classList.remove('active');
      boardOrientation = 'black';
    }

    // Populate Presets dropdown
    variationSelect.innerHTML = '';
    const presets = REPERTOIRE_PRESETS[repKey];
    Object.keys(presets).forEach(key => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = presets[key].name;
      variationSelect.appendChild(opt);
    });

    // Populate Quick Tactics chips
    tacticsChipsContainer.innerHTML = '';
    const tactics = REPERTOIRE_TACTICS[repKey] || [];
    tactics.forEach(t => {
      const pill = document.createElement('button');
      pill.className = 'tactic-pill';
      pill.setAttribute('data-msg', t.msg);
      pill.textContent = t.label;
      pill.addEventListener('click', () => {
        chatInput.value = t.msg;
        handleSendMessage();
      });
      tacticsChipsContainer.appendChild(pill);
    });

    // Load first preset for this repertoire
    const defaultPresetKey = Object.keys(presets)[0];
    loadPreset(defaultPresetKey, true);
  }

  btnRepBlack.addEventListener('click', () => setRepertoire('black_dragon'));
  btnRepWhite.addEventListener('click', () => setRepertoire('white_attack'));

  // ==========================================================
  // 2. Board Evaluation & Move Classification
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

    // Positional heuristics
    const g7Piece = chess.get('g7');
    if (g7Piece && g7Piece.type === 'b' && g7Piece.color === 'b') score -= 0.35;

    const c4Knight = chess.get('c4');
    if (c4Knight && c4Knight.type === 'n' && c4Knight.color === 'b') score -= 0.5;

    // White attacking f7 pressure
    const g5Knight = chess.get('g5');
    const c4Bishop = chess.get('c4');
    if (g5Knight && g5Knight.color === 'w' && c4Bishop && c4Bishop.color === 'w') {
      score += 0.8; // White battery on f7
    }

    // Black exposed king on e6 (Fried Liver)
    const e6King = chess.get('e6');
    if (e6King && e6King.type === 'k' && e6King.color === 'b') {
      score += 1.8; // Exposed Black King
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

    if (san.includes('Nxf7') || san.includes('Rxc3') || san.includes('b4')) {
      setMoveClassification('brilliant', '!!', 'Brilliant Attack');
    } else if (['Ng5', 'Qf3+', 'Nc4', 'h5', 'd5', 'f4', 'c3'].some(m => san.includes(m))) {
      setMoveClassification('great', '!', 'Great Move');
    } else if (['Bc4', 'Nf3', 'd4', 'e4', 'Bxc4', 'Bg5', 'Kb1', 'Qa5'].includes(san)) {
      setMoveClassification('best', '⭐', 'Best Move');
    } else {
      setMoveClassification('book', '✓', 'Book Move');
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

    const presets = REPERTOIRE_PRESETS[currentRepertoire];
    const lastMoveSan = currentMoveIndex >= 0 ? moveHistory[currentMoveIndex]?.san : 'None';
    const activePreset = presets[variationSelect.value]?.name || 'Opening';

    return {
      repertoire: currentRepertoire,
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
  // 3. Auto-Opponent Response Engine
  // ==========================================================
  function getMoveHistorySanString() {
    let s = '';
    for (let i = 0; i < moveHistory.length; i += 2) {
      const num = Math.floor(i / 2) + 1;
      s += `${num}.${moveHistory[i].san} `;
      if (moveHistory[i + 1]) {
        s += `${moveHistory[i + 1].san} `;
      }
    }
    return s.trim();
  }

  function pickAutoOpponentMove(lastPlayerSan) {
    const fullHistory = getMoveHistorySanString();

    // 1. Check exact opening book sequence
    if (OPENING_BOOK[fullHistory]) {
      const bookSan = OPENING_BOOK[fullHistory];
      const valid = chess.moves().find(m => m === bookSan || m.replace(/[+#]/, '') === bookSan);
      if (valid) return valid;
    }

    // 2. Check tactical response opening book
    if (lastPlayerSan && OPENING_BOOK[lastPlayerSan]) {
      const bookSan = OPENING_BOOK[lastPlayerSan];
      const valid = chess.moves().find(m => m === bookSan || m.replace(/[+#]/, '') === bookSan);
      if (valid) return valid;
    }

    // 3. Fallback engine minimax calculation
    const legalMoves = chess.moves({ verbose: true });
    if (legalMoves.length === 0) return null;

    const currentTurn = chess.turn();
    let bestMove = legalMoves[0];
    let bestScore = currentTurn === 'w' ? -9999 : 9999;

    for (const move of legalMoves) {
      chess.move(move);
      const score = calculateEvaluation();
      chess.undo();

      if (currentTurn === 'w' && score > bestScore) {
        bestScore = score;
        bestMove = move;
      } else if (currentTurn === 'b' && score < bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove.san;
  }

  function triggerAutoOpponentResponse(lastPlayerSan) {
    const isPlayerTurn = (currentRepertoire === 'black_dragon' && chess.turn() === 'b') || (currentRepertoire === 'white_attack' && chess.turn() === 'w');
    if (!autoPlayOpponent || isPlayerTurn || chess.game_over()) return;

    const oppName = chess.turn() === 'w' ? 'White' : 'Black';
    turnText.textContent = `${oppName} is calculating...`;
    turnDot.className = `turn-dot ${chess.turn() === 'w' ? 'white' : 'black'}`;

    setTimeout(() => {
      if (isPlayerTurn) return;

      const oppMoveSan = pickAutoOpponentMove(lastPlayerSan);
      if (!oppMoveSan) return;

      const isCapture = chess.get(oppMoveSan) || oppMoveSan.includes('x');
      const moveObj = chess.move(oppMoveSan);

      if (moveObj) {
        moveHistory.push({
          san: moveObj.san,
          fen: chess.fen(),
          from: moveObj.from,
          to: moveObj.to
        });
        currentMoveIndex = moveHistory.length - 1;

        if (chess.in_check()) {
          playChessSound('check');
        } else if (moveObj.captured || isCapture) {
          playChessSound('capture');
        } else {
          playChessSound('move');
        }

        renderBoard();
        renderMovesList();
        renderArrows();
        updateEvalBar();
        classifyMove(moveObj.san);
        updateMasterStats();
        checkGameOverStatus();

        if (!isStreaming && !chess.game_over()) {
          const userSide = currentRepertoire === 'white_attack' ? 'White' : 'Black';
          const prompt = lastPlayerSan 
            ? `The student played "${lastPlayerSan}" as ${userSide}, and the opponent responded with "${moveObj.san}" (FEN: ${chess.fen()}). Provide sharp, constructive grandmaster commentary on this aggressive position and suggest candidate attack ideas for ${userSide}!`
            : `A new game just began in the ${currentRepertoire === 'white_attack' ? 'Aggressive 1.e4 White repertoire' : 'Sicilian Dragon'}. Guide the student on their next move!`;
          conversationHistory.push({ role: 'user', content: prompt });
          streamResponseFromOllama();
        }
      }
    }, 700);
  }

  function checkGameOverStatus() {
    if (chess.game_over()) {
      playChessSound('gameover');
      let title = 'GAME OVER';
      let subtitle = '';

      if (chess.in_checkmate()) {
        const winner = chess.turn() === 'w' ? 'Black' : 'White';
        title = `CHECKMATE! 👑`;
        subtitle = `${winner} wins by checkmate!`;
      } else if (chess.in_draw()) {
        title = `DRAW! 🤝`;
        subtitle = 'Game ended in a draw (stalemate, threefold repetition, or insufficient material).';
      }

      gameOverTitle.textContent = title;
      gameOverSubtitle.textContent = subtitle;
      gameOverStats.textContent = `Completed in ${Math.ceil(moveHistory.length / 2)} moves. FEN: ${chess.fen()}`;
      gameOverModal.classList.add('active');

      if (!isStreaming) {
        const postGamePrompt = `The game just concluded (${title} - ${subtitle}). Provide a grandmaster post-game recap analyzing our tactical battle in the ${currentRepertoire === 'white_attack' ? '1.e4 King attack' : 'Sicilian Dragon'}!`;
        conversationHistory.push({ role: 'user', content: postGamePrompt });
        streamResponseFromOllama();
      }
    }
  }

  btnToggleAutoPlay.addEventListener('click', () => {
    autoPlayOpponent = !autoPlayOpponent;
    autoPlayStateText.textContent = autoPlayOpponent ? 'ON' : 'OFF';
    btnToggleAutoPlay.classList.toggle('active-toggle', autoPlayOpponent);
  });

  btnToggleSound.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    btnToggleSound.textContent = soundEnabled ? '🔊 Sound' : '🔇 Muted';
    btnToggleSound.classList.toggle('active-toggle', soundEnabled);
  });

  btnModalRematch.addEventListener('click', () => {
    gameOverModal.classList.remove('active');
    const presets = REPERTOIRE_PRESETS[currentRepertoire];
    const defaultPreset = Object.keys(presets)[0];
    variationSelect.value = defaultPreset;
    loadPreset(defaultPreset, true);
  });

  btnModalClose.addEventListener('click', () => {
    gameOverModal.classList.remove('active');
  });

  // ==========================================================
  // 4. Dynamic SVG Arrow Overlay Engine
  // ==========================================================
  function calculatePositionSuggestions() {
    if (chess.game_over()) return { bestMove: null, threatMove: null, candidateMoves: [] };

    const currentTurn = chess.turn();
    const legalMoves = chess.moves({ verbose: true });
    if (legalMoves.length === 0) return { bestMove: null, threatMove: null, candidateMoves: [] };

    const evaluatedMoves = [];

    for (const move of legalMoves) {
      chess.move(move);
      const score = calculateEvaluation();
      
      let oppWorst = currentTurn === 'w' ? -9999 : 9999;
      const oppMoves = chess.moves({ verbose: true });
      for (const oppMove of oppMoves.slice(0, 6)) {
        chess.move(oppMove);
        const oppEval = calculateEvaluation();
        chess.undo();
        if (currentTurn === 'w' && oppEval < oppWorst) oppWorst = oppEval;
        else if (currentTurn === 'b' && oppEval > oppWorst) oppWorst = oppEval;
      }

      chess.undo();

      let attackBonus = 0;
      if (move.san.includes('Nxf7') || move.san.includes('Rxc3')) attackBonus = 2.0;
      if (move.san.includes('Qf3+') || move.to === 'c4') attackBonus = 0.8;

      const adjustedScore = currentTurn === 'w' 
        ? (score + attackBonus + (oppWorst !== -9999 ? oppWorst * 0.25 : 0))
        : (score - attackBonus - (oppWorst !== 9999 ? oppWorst * 0.25 : 0));

      evaluatedMoves.push({
        move: move,
        san: move.san,
        score: adjustedScore
      });
    }

    if (currentTurn === 'w') {
      evaluatedMoves.sort((a, b) => b.score - a.score);
    } else {
      evaluatedMoves.sort((a, b) => a.score - b.score);
    }

    const bestMove = evaluatedMoves[0]?.move || null;
    const topCandidates = evaluatedMoves.slice(0, 3);

    let threatMove = null;
    if (bestMove) {
      chess.move(bestMove);
      const oppMoves = chess.moves({ verbose: true });
      if (oppMoves.length > 0) {
        let oppBest = oppMoves[0];
        let oppBestScore = currentTurn === 'w' ? 9999 : -9999;
        for (const oppMove of oppMoves) {
          chess.move(oppMove);
          const oppEval = calculateEvaluation();
          chess.undo();
          if (currentTurn === 'w' && oppEval < oppBestScore) {
            oppBestScore = oppEval;
            oppBest = oppMove;
          } else if (currentTurn === 'b' && oppEval > oppBestScore) {
            oppBestScore = oppEval;
            oppBest = oppMove;
          }
        }
        threatMove = oppBest;
      }
      chess.undo();
    }

    return { bestMove, threatMove, topCandidates };
  }

  function squareToSvgCoords(sq) {
    if (!sq || sq.length < 2) return { x: 400, y: 400 };
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
    if (!arrowsEnabled || chess.game_over()) return;

    const suggestions = calculatePositionSuggestions();
    const arrowsToDraw = [];

    if (suggestions.bestMove) {
      const isSac = suggestions.bestMove.san.includes('Nxf7') || suggestions.bestMove.san.includes('Rxc3');
      arrowsToDraw.push({
        from: suggestions.bestMove.from,
        to: suggestions.bestMove.to,
        color: isSac ? 'gold' : 'green',
        desc: `Best: ${suggestions.bestMove.san}`
      });
    }

    if (suggestions.threatMove) {
      arrowsToDraw.push({
        from: suggestions.threatMove.from,
        to: suggestions.threatMove.to,
        color: 'red',
        desc: `Threat: ${suggestions.threatMove.san}`
      });
    }

    arrowsToDraw.forEach(arr => {
      const from = squareToSvgCoords(arr.from);
      const to = squareToSvgCoords(arr.to);

      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist === 0) return;

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
  // 5. Master Database & Candidate Suggestions
  // ==========================================================
  function updateMasterStats(presetKey) {
    const presets = REPERTOIRE_PRESETS[currentRepertoire];
    const preset = presets[presetKey || variationSelect.value] || presets[Object.keys(presets)[0]];
    const turnName = chess.turn() === 'w' ? 'White' : 'Black';

    if (preset && preset.stats) {
      statsTotalGames.textContent = `${preset.stats.total} Master Games in line (${turnName} to move)`;
      statWhitePct.style.width = `${preset.stats.whitePct}%`;
      statWhitePct.textContent = `${preset.stats.whitePct}% ♔`;

      statDrawPct.style.width = `${preset.stats.drawPct}%`;
      statDrawPct.textContent = `${preset.stats.drawPct}% =`;

      statBlackPct.style.width = `${preset.stats.blackPct}%`;
      statBlackPct.textContent = `${preset.stats.blackPct}% ♚`;
    }

    const suggestions = calculatePositionSuggestions();
    masterCandidatesEl.innerHTML = `<span class="cand-label">Engine Suggestions (${turnName}):</span>`;

    if (suggestions.topCandidates && suggestions.topCandidates.length > 0) {
      suggestions.topCandidates.forEach((cand, idx) => {
        const chip = document.createElement('button');
        chip.className = 'cand-chip';
        const icon = idx === 0 ? '⭐ Best: ' : (idx === 1 ? '🥈 Alt: ' : '🥉 Line: ');
        chip.textContent = `${icon}${cand.san}`;

        chip.addEventListener('click', () => {
          const isCapture = cand.san.includes('x');
          const move = chess.move(cand.san);
          if (move) {
            moveHistory.push({
              san: move.san,
              fen: chess.fen(),
              from: move.from,
              to: move.to
            });
            currentMoveIndex = moveHistory.length - 1;

            if (chess.in_check()) {
              playChessSound('check');
            } else if (move.captured || isCapture) {
              playChessSound('capture');
            } else {
              playChessSound('move');
            }

            renderBoard();
            renderMovesList();
            renderArrows();
            updateEvalBar();
            classifyMove(move.san);
            updateMasterStats();
            checkGameOverStatus();

            appendUserBubble(`Played: ${cand.san}`);

            const isPlayerTurn = (currentRepertoire === 'black_dragon' && chess.turn() === 'b') || (currentRepertoire === 'white_attack' && chess.turn() === 'w');
            if (autoPlayOpponent && !isPlayerTurn) {
              triggerAutoOpponentResponse(move.san);
            } else {
              const prompt = `I played the recommended move "${cand.san}" on the board (FEN: ${chess.fen()}). Break down the tactical plan and candidate follow-ups.`;
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
  // 6. Board & Move Management
  // ==========================================================
  function loadPreset(presetKey, triggerCoachPrompt = false) {
    const presets = REPERTOIRE_PRESETS[currentRepertoire];
    const preset = presets[presetKey] || presets[Object.keys(presets)[0]];
    chess.reset();
    moveHistory = [];
    gameOverModal.classList.remove('active');

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

    // If starting standard game as Black, White auto-plays 1.e4
    if (presetKey === 'initial' && currentRepertoire === 'black_dragon' && autoPlayOpponent && chess.turn() === 'w') {
      triggerAutoOpponentResponse(null);
    } else if (triggerCoachPrompt && !isStreaming) {
      const userPrompt = `I just switched to the position: "${preset.name}". Give me your high-level tactical assessment of this setup and how ${currentRepertoire === 'white_attack' ? 'White should press the attack' : 'Black should counter-punch'}.`;
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

        if (lastMove && (sqName === lastMove.from || sqName === lastMove.to)) {
          sq.classList.add('highlight');
        }

        if (selectedSquare === sqName) {
          sq.classList.add('selected');
        }

        const legalMove = legalMovesForSelected.find(m => m.to === sqName);
        if (legalMove) {
          if (legalMove.captured || chess.get(sqName)) {
            sq.classList.add('legal-capture');
          } else {
            sq.classList.add('legal-move');
          }
        }

        const piece = chess.get(sqName);
        if (piece) {
          const pieceCode = piece.color + piece.type.toUpperCase();
          sq.innerHTML = getPieceSvg(pieceCode);
        }

        sq.addEventListener('click', () => handleSquareClick(sqName));
        chessboardEl.appendChild(sq);
      }
    }

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
        const targetPiece = chess.get(sqName);
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

          if (chess.in_check()) {
            playChessSound('check');
          } else if (move.captured || targetPiece) {
            playChessSound('capture');
          } else {
            playChessSound('move');
          }

          renderBoard();
          renderMovesList();
          renderArrows();
          updateEvalBar();
          classifyMove(playedSan);
          updateMasterStats();
          checkGameOverStatus();

          appendUserBubble(`Played: ${playedSan}`);

          const isOpponentTurn = (currentRepertoire === 'black_dragon' && chess.turn() === 'w') || (currentRepertoire === 'white_attack' && chess.turn() === 'b');
          if (autoPlayOpponent && isOpponentTurn) {
            triggerAutoOpponentResponse(playedSan);
          } else if (!isStreaming && !chess.game_over()) {
            const movePrompt = `I just played "${playedSan}" on the board (FEN: ${chess.fen()}). Analyze this move in our ${currentRepertoire === 'white_attack' ? 'aggressive White 1.e4 attack' : 'Sicilian Dragon defense'}. Is it sharp, and what is the plan?`;
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
    updateMasterStats();
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
    updateMasterStats();
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
      updateMasterStats();
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

  btnConsultCoach.addEventListener('click', () => {
    const boardCtx = getCurrentBoardContext();
    const question = `Coach Vance, evaluate this position on the board (${boardCtx.preset}):\nMove: ${boardCtx.last_move} | Turn: ${boardCtx.turn} to play\nFEN: ${boardCtx.fen}\n\nWhat are the top tactical candidate moves for ${boardCtx.turn} and how do we press our aggressive attacking strategy?`;
    chatInput.value = question;
    handleSendMessage();
  });

  // ==========================================================
  // 7. Apple iMessage Messaging System & Ollama Streaming
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
    if (confirm('Reset coaching session to current tabiya?')) {
      location.reload();
    }
  });

  // Initial load
  setRepertoire('black_dragon');
});
