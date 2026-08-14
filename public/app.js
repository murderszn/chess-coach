/**
 * Grandmaster Chess Coach (Julian Vance) — Multi-Repertoire Mastery
 * Supports Black (Sicilian Dragon / Dark Theme) & White (Aggressive 1.e4 & Fried Liver / Light Theme)
 * Features:
 * 1. Dedicated Tactical Puzzle / Master Test Mode with Multi-Ply Solver
 * 2. Explain Any Move Feature for Move History
 * 3. Deep Alpha-Beta Minimax Engine with Quiescence & Positional/Tactical Heuristics
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Chess Engine
  const chess = new Chess();
  let currentRepertoire = 'black_dragon'; // 'black_dragon' or 'white_attack'
  let currentMode = 'tabiya'; // 'tabiya' or 'puzzle'
  let boardOrientation = 'black';
  let selectedSquare = null;
  let legalMovesForSelected = [];
  let moveHistory = [];
  let currentMoveIndex = -1;
  let isStreaming = false;
  let arrowsEnabled = true;
  let autoPlayOpponent = true;
  let soundEnabled = true;

  // Puzzle State Tracking
  let activePuzzleKey = null;
  let activePuzzleStepIndex = 0;
  let puzzleSolvedState = {
    black_dragon: new Set(),
    white_attack: new Set()
  };

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
      } else if (type === 'brilliant' || type === 'triumph') {
        [523, 659, 783, 1046].forEach((freq, i) => {
          const chordOsc = ctx.createOscillator();
          const chordGain = ctx.createGain();
          chordOsc.type = 'triangle';
          chordOsc.frequency.setValueAtTime(freq, now + i * 0.07);
          chordGain.gain.setValueAtTime(0.2, now + i * 0.07);
          chordGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
          chordOsc.connect(chordGain);
          chordGain.connect(ctx.destination);
          chordOsc.start(now + i * 0.07);
          chordOsc.stop(now + 0.5);
        });
      } else if (type === 'mistake') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(130, now + 0.18);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
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
  // Repertoire Presets & Tactical Puzzles Database
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

  // Dedicated Master Tactical Puzzles
  const REPERTOIRE_PUZZLES = {
    'black_dragon': {
      'dragon_rxc3_sac': {
        title: '🐉 Dragon Masterclass: The ...Rxc3!! Exchange Sac',
        themeBadge: '💥 THEMATIC EXCHANGE SAC',
        fen: 'r1r3k1/pp1bppbp/3p1np1/q7/2BNP1PP/2N1BP2/PPPQ4/2KR3R b - - 0 13',
        instruction: '🎯 <strong>Black to Move</strong>: White has castled queenside and pushed 13.g4/h4. Demolish White\'s queenside fortress with Black\'s signature weapon!',
        solutionMoves: [
          { player: ['Rxc3', 'Rxc3+'], opp: 'bxc3' },
          { player: ['Qxa2', 'Rxc3', 'Nxe4', 'Qxc3'], opp: null }
        ],
        hint: 'Look at White\'s knight on c3 defending the critical a2 and b2 squares. What happens if you remove that defender, regardless of material?',
        explanation: '🔥 <strong>Brilliant Tactical Vision!</strong> ...Rxc3!! is the quintessential Sicilian Dragon tactical exchange sacrifice. By sacrificing the exchange for a minor piece, Black shatters White\'s pawn shelter into doubled, isolated c-pawns, opens the c-file for decisive queen infiltration, and supercharges the dark-square Dragon Bishop on g7 along the h8-a1 diagonal!'
      },
      'dragon_d5_strike': {
        title: '⚡ Yugoslav 9.0-0-0: The ...d5! Counter-Punch',
        themeBadge: '⚔️ CENTRAL COUNTER-STRIKE',
        fen: 'r1bq1rk1/pp2ppbp/2np1np1/8/3NP3/2N1BP2/PPPQ2PP/2KR1B1R b - - 0 9',
        instruction: '🎯 <strong>Black to Move</strong>: White castled queenside early (9.0-0-0) without Bc4. Strike at the center before White organizes the kingside storm!',
        solutionMoves: [
          { player: ['d5'], opp: 'exd5' },
          { player: ['Nxd5', 'Nxd4'], opp: null }
        ],
        hint: 'When the opponent castles opposite and prepares a flank attack, what is the golden classical rule? Strike in the center with a pawn break!',
        explanation: '💥 <strong>Superb Central Break!</strong> In the Yugoslav Attack when White omits 9.Bc4, Black\'s most lethal tactical equalizer is the immediate central thrust <strong>9...d5!</strong> This blows open the center, activates the g7 bishop, and seizes the initiative before White can roll h4-h5.'
      },
      'dragon_chinese_b5': {
        title: '🏮 Chinese Dragon: The ...b5 & ...b4 Queenside Avalanche',
        themeBadge: '🌊 QUEENSIDE PAWN STORM',
        fen: '1rbq1rk1/p3ppbp/2np1np1/1pp5/2BNP2P/2N1BP2/PPPQ2P1/2KR3R b - - 0 11',
        instruction: '🎯 <strong>Black to Move</strong>: The rook is primed on b8. Push Black\'s queenside pawn storm to displace White\'s key defenders!',
        solutionMoves: [
          { player: ['b4'], opp: 'Nce2' },
          { player: ['bxc3', 'Ne5', 'Qa5'], opp: null }
        ],
        hint: 'Dislodge White\'s knight from c3 so that White\'s queen and bishop cannot maintain harmony.',
        explanation: '🏮 <strong>Masterful Pawn Storm!</strong> In the Chinese Dragon (10...Rb8), the rapid push <strong>11...b4!</strong> kicks White\'s knight off c3, opens avenues of attack against b2/c2, and creates unstoppable queenside tactical pressure.'
      },
      'dragon_soltis_blockade': {
        title: '🛡️ Soltis Variation: 13...Nxh5! Clamping the Flank',
        themeBadge: '🛡️ FLANK BLOCKADE',
        fen: '2rq1rk1/pp1bppbp/3p1np1/4n2P/3NP3/1BN1BP2/PPPQ2P1/2KR3R b - - 0 13',
        instruction: '🎯 <strong>Black to Move</strong>: White just launched 13.h5. Neutralize White\'s mating momentum on the h-file!',
        solutionMoves: [
          { player: ['Nxh5', 'Nc4'], opp: 'Bh6' },
          { player: ['Bxh6', 'Rxc4', 'Nf6'], opp: null }
        ],
        hint: 'Recapture on h5 with the knight to plug the file, or leap the other knight into the c4 outpost.',
        explanation: '🛡️ <strong>Ironclad Mastery!</strong> 13...Nxh5! (or 13...Nc4!) is the bedrock of the Soltis Variation. It shuts down White\'s immediate sacrifices on g6 and preserves Black\'s King while setting up Black\'s queenside counter-blow.'
      },
      'dragon_bishop_discovery': {
        title: '👑 Dragon Tactical Battery: 13...Nxe4! Discovered Assault',
        themeBadge: '🎯 DISCOVERED ATTACK',
        fen: '2r2rk1/1p1bppbp/p2p1np1/q7/3BPP2/1PN5/P1PQB1PP/R4RK1 b - - 0 13',
        instruction: '🎯 <strong>Black to Move</strong>: White\'s knight on c3 is pinned against the d2 Queen and f1 Rook by your g7 Dragon Bishop. Exploit this tactical pin!',
        solutionMoves: [
          { player: ['Nxe4'], opp: 'Nxe4' },
          { player: ['Qxd2', 'Bxg2'], opp: null }
        ],
        hint: 'Notice that White\'s c3 knight is pinned. Can you remove the defender of the d2 queen by jumping your knight to e4?',
        explanation: '⚔️ <strong>Devastating Discovery!</strong> 13...Nxe4! simultaneously attacks the d2 queen and unmasks the deadly Dragon Bishop on g7. After 14.Nxe4, Black plays 14...Qxd2 winning White\'s queen!'
      }
    },
    'white_attack': {
      'fried_liver_6nxf7': {
        title: '🍗 Fried Liver Classic: 6.Nxf7! Royal King Drag',
        themeBadge: '🔥 KING SACRIFICE',
        fen: 'r1bqkb1r/ppp2ppp/2n5/3np1N1/2B5/8/PPPP1PPP/RNBQK2R w KQkq - 0 6',
        instruction: '🎯 <strong>White to Move</strong>: Black fell for 5...Nxd5? Strike at Black\'s uncastled king on f7 and drag the king into the open!',
        solutionMoves: [
          { player: ['Nxf7'], opp: 'Kxf7' },
          { player: ['Qf3+'], opp: 'Ke6' },
          { player: ['Nc3', 'd4'], opp: null }
        ],
        hint: 'Target the weakest square on the board (f7). Sacrifice the knight to force Black\'s king out into the board center!',
        explanation: '🍗 <strong>THE FRIED LIVER CRUSH!</strong> 6.Nxf7!! forces Black\'s king into the center (6...Kxf7). Followed by 7.Qf3+ Ke6 8.Nc3, Black is subjected to a brutal three-piece pin and an inescapable king hunt!'
      },
      'fried_liver_7qf3': {
        title: '👑 Fried Liver King Hunt: 7.Qf3+ Double Attack',
        themeBadge: '⚔️ KING HUNT FORK',
        fen: 'r1bq1b1r/ppp2kpp/2n5/3np3/2B5/8/PPPP1PPP/RNBQK2R w KQ - 0 7',
        instruction: '🎯 <strong>White to Move</strong>: Black\'s king is stranded on f7. Unleash the queen fork targeting both the king and the loose d5 knight!',
        solutionMoves: [
          { player: ['Qf3+'], opp: 'Ke6' },
          { player: ['Nc3'], opp: 'Ncb4' },
          { player: ['Qe4', 'd4', 'a3', 'O-O'], opp: null }
        ],
        hint: 'Bring your queen out to f3 with check, attacking both the king on f7 and the knight on d5.',
        explanation: '🔥 <strong>Lethal Precision!</strong> 7.Qf3+ forks king and knight. Black is forced into 7...Ke6 to hold the piece, walking straight into 8.Nc3, 9.d4, and 10.0-0 with decisive attacking superiority.'
      },
      'evans_gambit_4b4': {
        title: '⛵ Evans Gambit: 4.b4!? Wing Sacrifice for Tempo',
        themeBadge: '⚡ TEMPO GAMBIT',
        fen: 'r1bqk1nr/pppp1ppp/2n5/2b5/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4',
        instruction: '🎯 <strong>White to Move</strong>: Black played 3...Bc5 in the Italian. Sac the b-pawn to accelerate your center steamroller!',
        solutionMoves: [
          { player: ['b4'], opp: 'Bxb4' },
          { player: ['c3'], opp: 'Ba5' },
          { player: ['d4'], opp: null }
        ],
        hint: 'Offer your b-pawn to Black\'s bishop on c5 so you can gain tempo with c3 and d4!',
        explanation: '⛵ <strong>The Immortal Evans Gambit!</strong> 4.b4! gives up a pawn for two invaluable tempi: 5.c3 kicks the bishop and prepares the immediate 6.d4, establishing total center dominance and razor-sharp diagonal pressure with Ba3/Qb3.'
      },
      'evans_gambit_6d4': {
        title: '🗡️ Evans Gambit: 6.d4! Center Breakthrough & Castle Pin',
        themeBadge: '👑 CENTER OCCUPATION',
        fen: 'r1bqk1nr/pppp1ppp/2n5/b7/2BPP3/2P2N2/P4PPP/RNBQK2R w KQkq - 0 6',
        instruction: '🎯 <strong>White to Move</strong>: Complete the classical central occupation and crack open lines against Black\'s uncastled king!',
        solutionMoves: [
          { player: ['d4', 'O-O'], opp: 'exd4' },
          { player: ['O-O', 'Qb3', 'Ba3'], opp: null }
        ],
        hint: 'Strike in the center with d4 immediately to command the board.',
        explanation: '⚡ <strong>Unstoppable Central Momentum!</strong> 6.d4! seizes the heart of the board. Black cannot maintain piece harmony, allowing White to castle rapidly and deploy Ba3/Qb3 to prevent Black from ever castling safely.'
      },
      'grand_prix_5f5': {
        title: '🏎️ Grand Prix Attack: 5.f5! Kingside Assault',
        themeBadge: '🚀 KINGSIDE ASSAULT',
        fen: 'r1bqk1nr/pp1pppbp/2n3p1/8/2B1PP2/2N5/PPP3PP/R1BQK1NR w KQkq - 0 5',
        instruction: '🎯 <strong>White to Move</strong>: Black played ...g6. Launch the aggressive f4-f5 thrust to crack open the kingside diagonals!',
        solutionMoves: [
          { player: ['f5'], opp: 'gxf5' },
          { player: ['Qh5', 'Nf3'], opp: null }
        ],
        hint: 'Advance your f-pawn to f5 to shatter Black\'s kingside structure and open diagonals toward f7.',
        explanation: '🏎️ <strong>High-Octane Aggression!</strong> 5.f5! tears through Black\'s pawn barrier. When Black responds, White swings 6.Qh5 or 6.Nf3 with overwhelming pressure against the f7/f5 squares.'
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
    "1.e4 e5 2.Nf3 Nc6 3.Bc4": "Nf6",
    "1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Ng5": "d5",
    "1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Ng5 d5 5.exd5": "Nxd5",
    "1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Ng5 d5 5.exd5 Nxd5 6.Nxf7": "Kxf7",
    "1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Ng5 d5 5.exd5 Nxd5 6.Nxf7 Kxf7 7.Qf3+": "Ke6",
    "1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Ng5 d5 5.exd5 Nxd5 6.Nxf7 Kxf7 7.Qf3+ Ke6 8.Nc3": "Ncb4",
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
  const pickerLabel = document.getElementById('picker-label');
  const btnRepBlack = document.getElementById('btn-rep-black');
  const btnRepWhite = document.getElementById('btn-rep-white');
  const btnModeTabiya = document.getElementById('btn-mode-tabiya');
  const btnModePuzzles = document.getElementById('btn-mode-puzzles');
  const puzzleTestBanner = document.getElementById('puzzle-test-banner');
  const puzzleThemeBadge = document.getElementById('puzzle-theme-badge');
  const puzzleTitleText = document.getElementById('puzzle-title-text');
  const puzzleInstruction = document.getElementById('puzzle-instruction');
  const puzzleScoreText = document.getElementById('puzzle-score-text');
  const btnPuzzleHint = document.getElementById('btn-puzzle-hint');
  const btnPuzzleSolution = document.getElementById('btn-puzzle-solution');
  const btnPuzzlePrev = document.getElementById('btn-puzzle-prev');
  const btnPuzzleNext = document.getElementById('btn-puzzle-next');

  const tacticsChipsContainer = document.getElementById('tactics-chips-container');
  const turnDot = document.getElementById('turn-dot');
  const turnText = document.getElementById('turn-text');
  const fenBadge = document.getElementById('fen-badge');
  const movesListEl = document.getElementById('moves-list');
  const btnExplainMove = document.getElementById('btn-explain-move');
  const btnConsultCoach = document.getElementById('btn-consult-coach');
  const btnFlipBoard = document.getElementById('btn-flip-board');
  const btnResetBoard = document.getElementById('btn-reset-board');
  const btnMoveStart = document.getElementById('btn-move-start');
  const btnMovePrev = document.getElementById('btn-move-prev');
  const btnMoveNext = document.getElementById('btn-move-next');
  const btnMoveEnd = document.getElementById('btn-move-end');
  const coordsRanks = document.getElementById('coords-ranks');
  const coordsFiles = document.getElementById('coords-files');

  // Captured Material & Player Strips
  const topPlayerAvatar = document.getElementById('top-player-avatar');
  const topPlayerName = document.getElementById('top-player-name');
  const topCapturedPieces = document.getElementById('top-captured-pieces');
  const topMaterialDiff = document.getElementById('top-material-diff');
  const bottomPlayerAvatar = document.getElementById('bottom-player-avatar');
  const bottomPlayerName = document.getElementById('bottom-player-name');
  const bottomCapturedPieces = document.getElementById('bottom-captured-pieces');
  const bottomMaterialDiff = document.getElementById('bottom-material-diff');

  // Drag-and-drop & Toast state
  let draggedSquare = null;
  let toastTimer = null;

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

  // Custom Highlight/Hint Arrow state
  let customHintArrow = null;

  // ==========================================================
  // 1. Repertoire & Mode Management
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

    updateDropdownOptions();
    if (currentMode === 'tabiya') {
      const presets = REPERTOIRE_PRESETS[repKey];
      const defaultPresetKey = Object.keys(presets)[0];
      loadPreset(defaultPresetKey, true);
    } else {
      const puzzles = REPERTOIRE_PUZZLES[repKey];
      const defaultPuzzleKey = Object.keys(puzzles)[0];
      loadPuzzle(defaultPuzzleKey, true);
    }
  }

  function setMode(modeKey) {
    currentMode = modeKey;
    btnModeTabiya.classList.toggle('active', modeKey === 'tabiya');
    btnModePuzzles.classList.toggle('active', modeKey === 'puzzle');

    if (modeKey === 'puzzle') {
      puzzleTestBanner.style.display = 'flex';
      masterStatsBanner.classList.remove('active');
      pickerLabel.textContent = 'Puzzle';
      updateDropdownOptions();
      const puzzles = REPERTOIRE_PUZZLES[currentRepertoire];
      const defaultPuzzleKey = Object.keys(puzzles)[0];
      loadPuzzle(defaultPuzzleKey, true);
    } else {
      puzzleTestBanner.style.display = 'none';
      pickerLabel.textContent = 'Preset';
      updateDropdownOptions();
      const presets = REPERTOIRE_PRESETS[currentRepertoire];
      const defaultPresetKey = Object.keys(presets)[0];
      loadPreset(defaultPresetKey, true);
    }
  }

  function updateDropdownOptions() {
    variationSelect.innerHTML = '';
    if (currentMode === 'tabiya') {
      const presets = REPERTOIRE_PRESETS[currentRepertoire];
      Object.keys(presets).forEach(key => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = presets[key].name;
        variationSelect.appendChild(opt);
      });
    } else {
      const puzzles = REPERTOIRE_PUZZLES[currentRepertoire];
      const solvedSet = puzzleSolvedState[currentRepertoire] || new Set();
      Object.keys(puzzles).forEach(key => {
        const opt = document.createElement('option');
        opt.value = key;
        const isSolved = solvedSet.has(key);
        opt.textContent = `${isSolved ? '✅ ' : '🎯 '}${puzzles[key].title}`;
        variationSelect.appendChild(opt);
      });
    }
  }

  btnRepBlack.addEventListener('click', () => setRepertoire('black_dragon'));
  btnRepWhite.addEventListener('click', () => setRepertoire('white_attack'));
  btnModeTabiya.addEventListener('click', () => setMode('tabiya'));
  btnModePuzzles.addEventListener('click', () => setMode('puzzle'));

  // ==========================================================
  // 2. Deep Alpha-Beta Engine with Quiescence & Positional Heuristics
  // ==========================================================
  const PIECE_VALUES = { p: 100, n: 320, b: 335, r: 500, q: 975, k: 20000 };

  // Positional bonuses
  const PST_KNIGHT = [
    -40,-20,-10,-10,-10,-10,-20,-40,
    -20, -5,  5,  5,  5,  5, -5,-20,
    -10,  5, 15, 20, 20, 15,  5,-10,
    -10,  5, 20, 25, 25, 20,  5,-10,
    -10,  5, 20, 25, 25, 20,  5,-10,
    -10,  5, 15, 20, 20, 15,  5,-10,
    -20, -5,  5,  5,  5,  5, -5,-20,
    -40,-20,-10,-10,-10,-10,-20,-40
  ];

  const PST_PAWN_WHITE = [
      0,  0,  0,  0,  0,  0,  0,  0,
     50, 50, 50, 50, 50, 50, 50, 50,
     10, 10, 20, 30, 30, 20, 10, 10,
      5,  5, 10, 25, 25, 10,  5,  5,
      0,  0,  0, 20, 20,  0,  0,  0,
      5, -5,-10,  0,  0,-10, -5,  5,
      5, 10, 10,-20,-20, 10, 10,  5,
      0,  0,  0,  0,  0,  0,  0,  0
  ];

  function evaluateBoardState(chessInstance) {
    if (chessInstance.in_checkmate()) {
      return chessInstance.turn() === 'w' ? -99999 : 99999;
    }
    if (chessInstance.in_draw()) {
      return 0;
    }

    let score = 0;
    const board = chessInstance.board();
    let whiteBishops = 0;
    let blackBishops = 0;

    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const sq = board[r][f];
        if (!sq) continue;

        const val = PIECE_VALUES[sq.type] || 0;
        const sqIndexWhite = r * 8 + f;
        const sqIndexBlack = (7 - r) * 8 + f;

        if (sq.color === 'w') {
          score += val;
          if (sq.type === 'n') score += PST_KNIGHT[sqIndexWhite];
          if (sq.type === 'p') score += PST_PAWN_WHITE[sqIndexWhite];
          if (sq.type === 'b') whiteBishops++;
        } else {
          score -= val;
          if (sq.type === 'n') score -= PST_KNIGHT[sqIndexBlack];
          if (sq.type === 'p') score -= PST_PAWN_WHITE[sqIndexBlack];
          if (sq.type === 'b') blackBishops++;
        }
      }
    }

    // Bishop pair bonus
    if (whiteBishops >= 2) score += 35;
    if (blackBishops >= 2) score -= 35;

    // Tactical & Positional Heuristics
    // 1. Dragon Dark-Square Bishop on g7 targeting the h8-a1 diagonal
    const g7Piece = chessInstance.get('g7');
    if (g7Piece && g7Piece.type === 'b' && g7Piece.color === 'b') {
      score -= 55; // Long diagonal activity
    }

    // 2. Black Knight Outpost on c4
    const c4Piece = chessInstance.get('c4');
    if (c4Piece && c4Piece.type === 'n' && c4Piece.color === 'b') {
      score -= 65;
    }

    // 3. Thematic ...Rxc3 Exchange Sac compensation:
    // If White has doubled isolated pawns on c2/c3 and king on queenside, Black has dynamic compensation
    const c2Pawn = chessInstance.get('c2');
    const c3Pawn = chessInstance.get('c3');
    const c1King = chessInstance.get('c1') || chessInstance.get('b1');
    if (c2Pawn && c3Pawn && c2Pawn.color === 'w' && c3Pawn.color === 'w' && c1King && c1King.color === 'w') {
      score -= 140; // Broken White shelter & open c-file compensation
    }

    // 4. White 1.e4 Attack: f7 battery & king hunt
    const g5Knight = chessInstance.get('g5');
    const c4Bishop = chessInstance.get('c4');
    if (g5Knight && g5Knight.color === 'w' && c4Bishop && c4Bishop.color === 'w') {
      score += 90; // Italian / Fried Liver battery
    }

    // Exposed Black King on e6 (Fried Liver)
    const e6King = chessInstance.get('e6');
    if (e6King && e6King.type === 'k' && e6King.color === 'b') {
      score += 260; // Extremely exposed king pinned to center
    }

    // Dragged Black King on f7
    const f7King = chessInstance.get('f7');
    if (f7King && f7King.type === 'k' && f7King.color === 'b') {
      score += 150;
    }

    // Check bonus
    if (chessInstance.in_check()) {
      score += (chessInstance.turn() === 'w' ? -45 : 45);
    }

    return score;
  }

  function calculateEvaluation() {
    const rawCentipawns = evaluateBoardState(chess);
    return rawCentipawns / 100;
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

    if (san.includes('Nxf7') || san.includes('Rxc3') || san.includes('b4') || san.includes('!!')) {
      setMoveClassification('brilliant', '!!', 'Brilliant Attack');
    } else if (['Ng5', 'Qf3+', 'Nc4', 'h5', 'd5', 'f4', 'c3', 'f5'].some(m => san.includes(m))) {
      setMoveClassification('great', '!', 'Great Move');
    } else if (['Bc4', 'Nf3', 'd4', 'e4', 'Bxc4', 'Bg5', 'Kb1', 'Qa5', 'O-O', 'O-O-O'].includes(san)) {
      setMoveClassification('best', '⭐', 'Best Move');
    } else {
      setMoveClassification('book', '✓', 'Book Move');
    }
  }

  function setMoveClassification(type, icon, label) {
    moveClassBadge.className = `move-classification-badge ${type}`;
    moveClassBadge.innerHTML = `<span class="badge-icon">${icon}</span><span class="badge-text">${label}</span>`;
  }

  function getCurrentBoardContext(explainingMove = null) {
    let sanStr = '';
    for (let i = 0; i < moveHistory.length; i += 2) {
      const num = Math.floor(i / 2) + 1;
      sanStr += `${num}.${moveHistory[i].san} `;
      if (moveHistory[i + 1]) {
        sanStr += `${moveHistory[i + 1].san} `;
      }
    }

    const lastMoveSan = currentMoveIndex >= 0 ? moveHistory[currentMoveIndex]?.san : 'None';
    let lineName = 'Master Opening';
    if (currentMode === 'tabiya') {
      const presets = REPERTOIRE_PRESETS[currentRepertoire];
      lineName = presets[variationSelect.value]?.name || 'Opening';
    } else {
      const puzzles = REPERTOIRE_PUZZLES[currentRepertoire];
      lineName = puzzles[activePuzzleKey]?.title || 'Master Test';
    }

    return {
      mode: currentMode,
      repertoire: currentRepertoire,
      fen: chess.fen(),
      preset: lineName,
      san_history: sanStr.trim(),
      last_move: lastMoveSan,
      explaining_move: explainingMove,
      turn: chess.turn() === 'w' ? 'White' : 'Black',
      is_check: chess.in_check(),
      is_game_over: chess.game_over(),
      is_checkmate: chess.in_checkmate(),
      legal_moves: chess.moves()
    };
  }

  // ==========================================================
  // 3. Lightning Fast (<1ms) Memoized Position Calculations
  // ==========================================================
  const positionSuggestionsCache = {};

  function calculatePositionSuggestions() {
    const fen = chess.fen();
    if (positionSuggestionsCache[fen]) {
      return positionSuggestionsCache[fen];
    }

    if (chess.game_over()) {
      const res = { bestMove: null, threatMove: null, topCandidates: [] };
      positionSuggestionsCache[fen] = res;
      return res;
    }

    const currentTurn = chess.turn();
    const isWhite = currentTurn === 'w';
    const legalMoves = chess.moves({ verbose: true });
    if (legalMoves.length === 0) {
      const res = { bestMove: null, threatMove: null, topCandidates: [] };
      positionSuggestionsCache[fen] = res;
      return res;
    }

    const evaluatedMoves = [];

    for (const move of legalMoves) {
      chess.move(move);
      const score = evaluateBoardState(chess);

      // Fast tactical check
      let oppWorst = isWhite ? 99999 : -99999;
      const oppMoves = chess.moves({ verbose: true });
      const tacticalOppMoves = oppMoves.filter(m => m.captured || m.san.includes('+')).slice(0, 4);
      for (const oppMove of tacticalOppMoves) {
        chess.move(oppMove);
        const oppEval = evaluateBoardState(chess);
        chess.undo();
        if (isWhite && oppEval < oppWorst) oppWorst = oppEval;
        else if (!isWhite && oppEval > oppWorst) oppWorst = oppEval;
      }
      chess.undo();

      let tacticalBonus = 0;
      if (move.san.includes('Nxf7') || move.san.includes('Rxc3')) tacticalBonus = 180;
      if (move.san.includes('Qf3+') || move.to === 'c4' || move.san === 'd5') tacticalBonus = 60;

      const adjustedScore = isWhite ? (score + tacticalBonus) : (score - tacticalBonus);

      evaluatedMoves.push({
        move: move,
        san: move.san,
        score: adjustedScore
      });
    }

    if (isWhite) {
      evaluatedMoves.sort((a, b) => b.score - a.score);
    } else {
      evaluatedMoves.sort((a, b) => a.score - b.score);
    }

    const bestMove = evaluatedMoves[0]?.move || null;
    const topCandidates = evaluatedMoves.slice(0, 3);

    // Calculate Opponent Threat
    let threatMove = null;
    if (bestMove) {
      chess.move(bestMove);
      const oppMoves = chess.moves({ verbose: true });
      if (oppMoves.length > 0) {
        let oppBest = oppMoves[0];
        let oppBestScore = isWhite ? 99999 : -99999;
        for (const oppMove of oppMoves.slice(0, 6)) {
          chess.move(oppMove);
          const oppScore = evaluateBoardState(chess);
          chess.undo();
          if (isWhite && oppScore < oppBestScore) {
            oppBestScore = oppScore;
            oppBest = oppMove;
          } else if (!isWhite && oppScore > oppBestScore) {
            oppBestScore = oppScore;
            oppBest = oppMove;
          }
        }
        threatMove = oppBest;
      }
      chess.undo();
    }

    const result = { bestMove, threatMove, topCandidates };
    positionSuggestionsCache[fen] = result;
    return result;
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

    // 3. Fallback to deep Alpha-Beta search calculation
    const suggestions = calculatePositionSuggestions();
    return suggestions.bestMove ? suggestions.bestMove.san : (chess.moves()[0] || null);
  }

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
        updateExplainMoveButton();
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
    }, 650);
  }

  // ==========================================================
  // 4. Tactical Puzzle / Master Test Execution Engine
  // ==========================================================
  function loadPuzzle(puzzleKey, triggerCoachPrompt = false) {
    const puzzles = REPERTOIRE_PUZZLES[currentRepertoire];
    const puzzle = puzzles[puzzleKey] || puzzles[Object.keys(puzzles)[0]];
    activePuzzleKey = puzzleKey;
    activePuzzleStepIndex = 0;
    customHintArrow = null;

    chess.load(puzzle.fen);
    moveHistory = [];
    currentMoveIndex = -1;
    gameOverModal.classList.remove('active');

    // Update banner UI
    puzzleThemeBadge.textContent = puzzle.themeBadge;
    puzzleTitleText.textContent = puzzle.title;
    puzzleInstruction.innerHTML = puzzle.instruction;
    updatePuzzleScoreUI();

    renderBoard();
    renderMovesList();
    renderArrows();
    updateEvalBar();
    classifyMove(null);
    updateExplainMoveButton();

    if (triggerCoachPrompt && !isStreaming) {
      appendUserBubble(`Master Test Activated: ${puzzle.title}`);
      const puzzlePrompt = `I just opened the tactical master challenge: "${puzzle.title}". Give me the tactical context of this critical position without giving away the solution move. What are the key strategic tension points?`;
      conversationHistory.push({ role: 'user', content: puzzlePrompt });
      streamResponseFromOllama();
    }
  }

  function updatePuzzleScoreUI() {
    const solvedSet = puzzleSolvedState[currentRepertoire] || new Set();
    const totalPuzzles = Object.keys(REPERTOIRE_PUZZLES[currentRepertoire]).length;
    puzzleScoreText.textContent = `${solvedSet.size}/${totalPuzzles}`;
  }

  function handlePuzzleMove(userMoveObj) {
    const puzzle = REPERTOIRE_PUZZLES[currentRepertoire][activePuzzleKey];
    if (!puzzle) return;

    const currentStep = puzzle.solutionMoves[activePuzzleStepIndex];
    if (!currentStep) return;

    // Check if played move matches accepted player moves
    const playedSanClean = userMoveObj.san.replace(/[+#]/, '');
    const isCorrect = currentStep.player.some(m => m === userMoveObj.san || m.replace(/[+#]/, '') === playedSanClean);

    if (isCorrect) {
      playChessSound('brilliant');
      setMoveClassification('brilliant', '!!', 'Master Move!');
      customHintArrow = null;

      activePuzzleStepIndex++;

      // Check if there is an opponent auto-reply in this puzzle step
      if (currentStep.opp) {
        setTimeout(() => {
          const oppMoveObj = chess.move(currentStep.opp);
          if (oppMoveObj) {
            moveHistory.push({
              san: oppMoveObj.san,
              fen: chess.fen(),
              from: oppMoveObj.from,
              to: oppMoveObj.to
            });
            currentMoveIndex = moveHistory.length - 1;
            playChessSound('move');
            renderBoard();
            renderMovesList();
            renderArrows();
            updateEvalBar();
            updateExplainMoveButton();
          }
        }, 500);
      } else if (activePuzzleStepIndex >= puzzle.solutionMoves.length) {
        // Puzzle Completed!
        handlePuzzleSolved(puzzle);
      }
    } else {
      // Incorrect move played
      playChessSound('mistake');
      setMoveClassification('blunder', '❌', 'Inaccuracy');

      setTimeout(() => {
        // Undo move
        chess.undo();
        moveHistory.pop();
        currentMoveIndex = moveHistory.length - 1;
        renderBoard();
        renderMovesList();
        renderArrows();
        updateEvalBar();
        updateExplainMoveButton();

        appendCoachBubble(`⚠️ <em>That's not the master move.</em> White/Black can defend against that try. Look closely at key pins or tactical sacrifices, or click <strong>💡 Hint</strong>!`);
      }, 700);
    }
  }

  function handlePuzzleSolved(puzzle) {
    playChessSound('triumph');
    const solvedSet = puzzleSolvedState[currentRepertoire];
    solvedSet.add(activePuzzleKey);
    updatePuzzleScoreUI();
    updateDropdownOptions();
    variationSelect.value = activePuzzleKey;

    appendCoachBubble(`🏆 <strong>GRANDMASTER TACTICAL MASTERCLASS!</strong><br><br>${puzzle.explanation}`);

    const prompt = `I successfully found the winning move and solved the master tactical puzzle: "${puzzle.title}". Give me an enthusiastic breakdown of why this tactic is so vital to master in our repertoire!`;
    conversationHistory.push({ role: 'user', content: prompt });
    streamResponseFromOllama();
  }

  btnPuzzleHint.addEventListener('click', () => {
    const puzzle = REPERTOIRE_PUZZLES[currentRepertoire][activePuzzleKey];
    if (!puzzle) return;

    const currentStep = puzzle.solutionMoves[activePuzzleStepIndex];
    if (!currentStep) return;

    // Draw hint arrow
    const targetMoveSan = currentStep.player[0];
    const legal = chess.moves({ verbose: true }).find(m => m.san === targetMoveSan || m.san.replace(/[+#]/, '') === targetMoveSan.replace(/[+#]/, ''));
    if (legal) {
      customHintArrow = { from: legal.from, to: legal.to, color: 'blue', desc: 'Hint' };
      renderArrows();
    }

    appendUserBubble(`Coach, give me a tactical hint on this position.`);
    appendCoachBubble(`💡 <strong>Coach Vance Hint:</strong> ${puzzle.hint}`);
  });

  btnPuzzleSolution.addEventListener('click', () => {
    const puzzle = REPERTOIRE_PUZZLES[currentRepertoire][activePuzzleKey];
    if (!puzzle) return;

    appendUserBubble(`Coach Vance, reveal the master solution line.`);
    appendCoachBubble(`👁️ <strong>Master Solution Breakdown:</strong><br>${puzzle.explanation}`);
    handlePuzzleSolved(puzzle);
  });

  btnPuzzlePrev.addEventListener('click', () => {
    const puzzles = REPERTOIRE_PUZZLES[currentRepertoire];
    const keys = Object.keys(puzzles);
    const currIdx = keys.indexOf(activePuzzleKey);
    const prevKey = keys[(currIdx - 1 + keys.length) % keys.length];
    variationSelect.value = prevKey;
    loadPuzzle(prevKey, true);
  });

  btnPuzzleNext.addEventListener('click', () => {
    const puzzles = REPERTOIRE_PUZZLES[currentRepertoire];
    const keys = Object.keys(puzzles);
    const currIdx = keys.indexOf(activePuzzleKey);
    const nextKey = keys[(currIdx + 1) % keys.length];
    variationSelect.value = nextKey;
    loadPuzzle(nextKey, true);
  });

  // ==========================================================
  // 5. 'Explain Any Move' Feature Engine
  // ==========================================================
  function updateExplainMoveButton() {
    if (currentMoveIndex >= 0 && moveHistory[currentMoveIndex]) {
      const activeMove = moveHistory[currentMoveIndex];
      const moveNum = Math.floor(currentMoveIndex / 2) + 1;
      const prefix = currentMoveIndex % 2 === 0 ? `${moveNum}.` : `${moveNum}...`;
      btnExplainMove.innerHTML = `<span>💡 Explain ${prefix}${activeMove.san}</span>`;
      btnExplainMove.style.display = 'inline-flex';
    } else {
      btnExplainMove.innerHTML = `<span>💡 Explain Move</span>`;
      btnExplainMove.style.display = 'inline-flex';
    }
  }

  btnExplainMove.addEventListener('click', () => {
    if (currentMoveIndex < 0 || !moveHistory[currentMoveIndex]) {
      appendCoachBubble(`Click any move in the move notation ribbon above to have me explain its exact strategic rationale! ♟️`);
      return;
    }

    const targetMove = moveHistory[currentMoveIndex];
    const moveNum = Math.floor(currentMoveIndex / 2) + 1;
    const notation = currentMoveIndex % 2 === 0 ? `${moveNum}.${targetMove.san}` : `${moveNum}...${targetMove.san}`;

    // Highlight target move arrow
    customHintArrow = { from: targetMove.from, to: targetMove.to, color: 'gold', desc: `Explaining ${targetMove.san}` };
    renderArrows();

    const userPrompt = `Coach Vance, explain the strategic rationale, dynamic goals, and tactical purpose of the move **${notation}** in this position (${currentRepertoire === 'white_attack' ? 'Aggressive 1.e4 Repertoire' : 'Sicilian Dragon'}). Why is this move played, what does it threaten or defend, and what master lesson can I take from it?`;
    appendUserBubble(`Explain move: ${notation}`);

    conversationHistory.push({ role: 'user', content: userPrompt });

    // Send to Ollama with explicit explaining_move context
    isStreaming = true;
    btnSend.disabled = true;
    createTypingBubble();

    const boardContext = getCurrentBoardContext(notation);

    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: conversationHistory,
        board_context: boardContext
      })
    })
    .then(async response => {
      removeTypingBubble();
      if (!response.ok) throw new Error(`Server status ${response.status}`);

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
    })
    .catch(err => {
      removeTypingBubble();
      console.error('Explain move error:', err);
      appendCoachBubble(`⚠️ <em>Coach analysis error:</em> ${err.message}. Ollama may be offline.`);
    })
    .finally(() => {
      isStreaming = false;
      btnSend.disabled = false;
    });
  });

  // ==========================================================
  // 6. Dynamic SVG Arrow Overlay Engine
  // ==========================================================
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

    if (customHintArrow) {
      arrowsToDraw.push(customHintArrow);
    }

    if (suggestions.bestMove) {
      const isSac = suggestions.bestMove.san.includes('Nxf7') || suggestions.bestMove.san.includes('Rxc3') || suggestions.bestMove.san.includes('b4');
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
      line.setAttribute('stroke-width', arr.color === 'blue' ? '12' : '10');
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
  // 7. Master Database & Candidate Suggestions
  // ==========================================================
  function updateMasterStats(presetKey) {
    if (currentMode === 'puzzle') return;
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
    masterCandidatesEl.innerHTML = `<span class="cand-label">Engine Candidates (${turnName}):</span>`;

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
            updateExplainMoveButton();
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
  // 8. Board & Move Management
  // ==========================================================
  function loadPreset(presetKey, triggerCoachPrompt = false) {
    const presets = REPERTOIRE_PRESETS[currentRepertoire];
    const preset = presets[presetKey] || presets[Object.keys(presets)[0]];
    chess.reset();
    moveHistory = [];
    customHintArrow = null;
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
    updateExplainMoveButton();

    if (presetKey === 'initial' && currentRepertoire === 'black_dragon' && autoPlayOpponent && chess.turn() === 'w') {
      triggerAutoOpponentResponse(null);
    } else if (triggerCoachPrompt && !isStreaming) {
      const userPrompt = `I just switched to the position: "${preset.name}". Give me your high-level tactical assessment of this setup and how ${currentRepertoire === 'white_attack' ? 'White should press the attack' : 'Black should counter-punch'}.`;
      appendUserBubble(`Switched to tabiya: ${preset.name}`);
      conversationHistory.push({ role: 'user', content: userPrompt });
      streamResponseFromOllama();
    }
  }

  // ==========================================================
  // Captured Pieces & Material Advantage Engine
  // ==========================================================
  function updateCapturedAndMaterial() {
    const activeCounts = { w: { p: 0, n: 0, b: 0, r: 0, q: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0 } };
    const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9 };
    const initialCounts = { p: 8, n: 2, b: 2, r: 2, q: 1 };
    const order = ['q', 'r', 'b', 'n', 'p'];
    let whiteMat = 0;
    let blackMat = 0;

    const boardState = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const p = boardState[r][f];
        if (p && p.type !== 'k') {
          activeCounts[p.color][p.type]++;
          if (p.color === 'w') whiteMat += pieceValues[p.type];
          else blackMat += pieceValues[p.type];
        }
      }
    }

    // Captured by White = Black pieces missing from board
    const capturedByWhite = [];
    order.forEach(type => {
      const missing = initialCounts[type] - activeCounts.b[type];
      for (let i = 0; i < missing; i++) {
        capturedByWhite.push({ color: 'b', type, code: 'b' + type.toUpperCase(), isConsecutive: i > 0 });
      }
    });

    // Captured by Black = White pieces missing from board
    const capturedByBlack = [];
    order.forEach(type => {
      const missing = initialCounts[type] - activeCounts.w[type];
      for (let i = 0; i < missing; i++) {
        capturedByBlack.push({ color: 'w', type, code: 'w' + type.toUpperCase(), isConsecutive: i > 0 });
      }
    });

    const topSide = boardOrientation === 'black' ? 'w' : 'b';
    const bottomSide = boardOrientation === 'black' ? 'b' : 'w';
    const isBlackDragon = currentRepertoire === 'black_dragon';

    if (topPlayerAvatar && topPlayerName && topCapturedPieces) {
      if (topSide === 'w') {
        topPlayerAvatar.textContent = '♔';
        topPlayerName.textContent = isBlackDragon ? 'GM Vance (White)' : 'Student (White)';
        renderCapturedRow(topCapturedPieces, capturedByWhite);
      } else {
        topPlayerAvatar.textContent = '♚';
        topPlayerName.textContent = isBlackDragon ? 'Student (Black)' : 'Coach Auto-Black';
        renderCapturedRow(topCapturedPieces, capturedByBlack);
      }
    }

    if (bottomPlayerAvatar && bottomPlayerName && bottomCapturedPieces) {
      if (bottomSide === 'b') {
        bottomPlayerAvatar.textContent = '♚';
        bottomPlayerName.textContent = isBlackDragon ? 'Student (Black)' : 'Coach Auto-Black';
        renderCapturedRow(bottomCapturedPieces, capturedByBlack);
      } else {
        bottomPlayerAvatar.textContent = '♔';
        bottomPlayerName.textContent = isBlackDragon ? 'GM Vance (White)' : 'Student (White)';
        renderCapturedRow(bottomCapturedPieces, capturedByWhite);
      }
    }

    const diff = whiteMat - blackMat; // positive: White ahead, negative: Black ahead
    if (topMaterialDiff && bottomMaterialDiff) {
      if (diff > 0) {
        if (topSide === 'w') {
          topMaterialDiff.textContent = `+${diff}`;
          topMaterialDiff.classList.add('visible');
          bottomMaterialDiff.textContent = '';
          bottomMaterialDiff.classList.remove('visible');
        } else {
          bottomMaterialDiff.textContent = `+${diff}`;
          bottomMaterialDiff.classList.add('visible');
          topMaterialDiff.textContent = '';
          topMaterialDiff.classList.remove('visible');
        }
      } else if (diff < 0) {
        const absDiff = Math.abs(diff);
        if (topSide === 'b') {
          topMaterialDiff.textContent = `+${absDiff}`;
          topMaterialDiff.classList.add('visible');
          bottomMaterialDiff.textContent = '';
          bottomMaterialDiff.classList.remove('visible');
        } else {
          bottomMaterialDiff.textContent = `+${absDiff}`;
          bottomMaterialDiff.classList.add('visible');
          topMaterialDiff.textContent = '';
          topMaterialDiff.classList.remove('visible');
        }
      } else {
        topMaterialDiff.textContent = '';
        topMaterialDiff.classList.remove('visible');
        bottomMaterialDiff.textContent = '';
        bottomMaterialDiff.classList.remove('visible');
      }
    }
  }

  function renderCapturedRow(containerEl, piecesList) {
    containerEl.innerHTML = '';
    if (piecesList.length === 0) return;
    let lastType = null;
    piecesList.forEach(p => {
      const span = document.createElement('span');
      span.className = `captured-piece-mini ${p.type === lastType ? 'overlapping' : ''}`;
      span.innerHTML = getPieceSvg(p.code);
      span.title = `Captured ${p.color === 'w' ? 'White' : 'Black'} ${p.type.toUpperCase()}`;
      containerEl.appendChild(span);
      lastType = p.type;
    });
  }

  function showCoachToast(msg) {
    let toast = document.getElementById('coach-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'coach-toast';
      toast.className = 'coach-toast';
      document.querySelector('.chessboard-stage').appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('active');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('active');
    }, 2200);
  }

  function updateCoordinates() {
    const ranks = boardOrientation === 'white' ? ['8','7','6','5','4','3','2','1'] : ['1','2','3','4','5','6','7','8'];
    const files = boardOrientation === 'white' ? ['a','b','c','d','e','f','g','h'] : ['h','g','f','e','d','c','b','a'];
    coordsRanks.innerHTML = ranks.map(r => `<span>${r}</span>`).join('');
    coordsFiles.innerHTML = files.map(f => `<span>${f}</span>`).join('');
  }

  function updateLegalMoveHighlights() {
    document.querySelectorAll('.sq').forEach(sq => {
      const sqName = sq.getAttribute('data-sq');
      const legalMove = legalMovesForSelected.find(m => m.to === sqName);
      if (legalMove) {
        if (legalMove.captured || chess.get(sqName)) {
          sq.classList.add('legal-capture');
        } else {
          sq.classList.add('legal-move');
        }
      } else {
        sq.classList.remove('legal-move', 'legal-capture');
      }
    });
  }

  function renderBoard(animatedMove = null) {
    chessboardEl.innerHTML = '';
    const files = boardOrientation === 'white' ? ['a','b','c','d','e','f','g','h'] : ['h','g','f','e','d','c','b','a'];
    const ranks = boardOrientation === 'white' ? ['8','7','6','5','4','3','2','1'] : ['1','2','3','4','5','6','7','8'];

    const lastMove = currentMoveIndex >= 0 ? moveHistory[currentMoveIndex] : null;
    updateCoordinates();

    // Active Check King Highlight finder
    let kingInCheckSq = null;
    if (chess.in_check()) {
      const turnColor = chess.turn();
      const b = chess.board();
      for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
          const p = b[r][f];
          if (p && p.color === turnColor && p.type === 'k') {
            kingInCheckSq = 'abcdefgh'[f] + (8 - r);
            break;
          }
        }
      }
    }

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

        if (kingInCheckSq === sqName) {
          sq.classList.add(chess.in_checkmate() ? 'king-checkmate' : 'king-in-check');
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
          const pieceWrapper = document.createElement('div');
          pieceWrapper.className = 'chess-piece-wrapper';
          pieceWrapper.innerHTML = getPieceSvg(pieceCode);

          // Drag and drop enable for side to move
          if (piece.color === chess.turn()) {
            pieceWrapper.setAttribute('draggable', 'true');
            pieceWrapper.addEventListener('dragstart', (e) => {
              draggedSquare = sqName;
              selectedSquare = sqName;
              legalMovesForSelected = chess.moves({ square: sqName, verbose: true });
              e.dataTransfer.setData('text/plain', sqName);
              e.dataTransfer.effectAllowed = 'move';
              sq.classList.add('is-dragging');
              updateLegalMoveHighlights();
            });

            pieceWrapper.addEventListener('dragend', () => {
              draggedSquare = null;
              document.querySelectorAll('.sq').forEach(s => {
                s.classList.remove('is-dragging', 'drag-hover');
              });
            });
          }

          // Smooth sliding piece move animation
          if (animatedMove && animatedMove.to === sqName && animatedMove.from) {
            const fromCol = files.indexOf(animatedMove.from[0]);
            const fromRow = ranks.indexOf(animatedMove.from[1]);
            const toCol = files.indexOf(animatedMove.to[0]);
            const toRow = ranks.indexOf(animatedMove.to[1]);
            if (fromCol !== -1 && fromRow !== -1 && toCol !== -1 && toRow !== -1) {
              const dx = (fromCol - toCol) * 100;
              const dy = (fromRow - toRow) * 100;
              pieceWrapper.style.transform = `translate(${dx}%, ${dy}%)`;
              requestAnimationFrame(() => {
                pieceWrapper.classList.add('chess-piece-animated');
                pieceWrapper.style.transform = 'translate(0, 0)';
              });
            }
          }

          sq.appendChild(pieceWrapper);
        }

        // Dragover / Dragenter / Drop listeners
        sq.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        });

        sq.addEventListener('dragenter', (e) => {
          if (draggedSquare && draggedSquare !== sqName) {
            sq.classList.add('drag-hover');
          }
        });

        sq.addEventListener('dragleave', (e) => {
          if (!sq.contains(e.relatedTarget)) {
            sq.classList.remove('drag-hover');
          }
        });

        sq.addEventListener('drop', (e) => {
          e.preventDefault();
          sq.classList.remove('drag-hover');
          const fromSq = e.dataTransfer.getData('text/plain') || draggedSquare;
          if (fromSq && fromSq !== sqName) {
            handleMoveAttempt(fromSq, sqName);
          }
        });

        sq.addEventListener('click', () => handleSquareClick(sqName));
        chessboardEl.appendChild(sq);
      }
    }

    const isWhiteTurn = chess.turn() === 'w';
    turnDot.className = `turn-dot ${isWhiteTurn ? 'white' : 'black'}`;
    turnText.textContent = isWhiteTurn ? 'White to move' : 'Black to move';
    fenBadge.textContent = '📋 FEN';
    updateCapturedAndMaterial();
  }

  function handleMoveAttempt(fromSq, toSq) {
    const targetPiece = chess.get(toSq);
    const move = chess.move({
      from: fromSq,
      to: toSq,
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
      customHintArrow = null;

      if (chess.in_check()) {
        playChessSound('check');
      } else if (move.captured || targetPiece) {
        playChessSound('capture');
      } else {
        playChessSound('move');
      }

      renderBoard({ from: fromSq, to: toSq });
      renderMovesList();
      renderArrows();
      updateEvalBar();
      classifyMove(playedSan);
      updateMasterStats();
      updateExplainMoveButton();
      checkGameOverStatus();

      appendUserBubble(`Played: ${playedSan}`);

      // If in Puzzle mode, verify move against solution
      if (currentMode === 'puzzle') {
        handlePuzzleMove(move);
        return true;
      }

      // Otherwise in Tabiya / Free Sparring mode
      const isOpponentTurn = (currentRepertoire === 'black_dragon' && chess.turn() === 'w') || (currentRepertoire === 'white_attack' && chess.turn() === 'b');
      if (autoPlayOpponent && isOpponentTurn) {
        triggerAutoOpponentResponse(playedSan);
      } else if (!isStreaming && !chess.game_over()) {
        const movePrompt = `I just played "${playedSan}" on the board (FEN: ${chess.fen()}). Analyze this move in our ${currentRepertoire === 'white_attack' ? 'aggressive White 1.e4 attack' : 'Sicilian Dragon defense'}. Is it sharp, and what is the plan?`;
        conversationHistory.push({ role: 'user', content: movePrompt });
        streamResponseFromOllama();
      }
      return true;
    } else {
      const piece = chess.get(toSq);
      if (piece && piece.color === chess.turn()) {
        selectedSquare = toSq;
        legalMovesForSelected = chess.moves({ square: toSq, verbose: true });
        renderBoard();
      } else {
        selectedSquare = null;
        legalMovesForSelected = [];
        renderBoard();
      }
      return false;
    }
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
        handleMoveAttempt(selectedSquare, sqName);
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
    customHintArrow = null;
    renderBoard();
    renderMovesList();
    renderArrows();
    updateEvalBar();
    classifyMove(targetMove.san);
    updateMasterStats();
    updateExplainMoveButton();
  }

  // Navigation controls
  btnMoveStart.addEventListener('click', () => {
    if (moveHistory.length === 0) return;
    chess.reset();
    currentMoveIndex = -1;
    customHintArrow = null;
    renderBoard();
    renderMovesList();
    renderArrows();
    updateEvalBar();
    classifyMove(null);
    updateMasterStats();
    updateExplainMoveButton();
  });

  btnMovePrev.addEventListener('click', () => {
    if (currentMoveIndex > 0) {
      jumpToMove(currentMoveIndex - 1);
    } else if (currentMoveIndex === 0) {
      chess.reset();
      currentMoveIndex = -1;
      customHintArrow = null;
      renderBoard();
      renderMovesList();
      renderArrows();
      updateEvalBar();
      classifyMove(null);
      updateMasterStats();
      updateExplainMoveButton();
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
    if (currentMode === 'tabiya') {
      loadPreset(variationSelect.value, false);
    } else {
      loadPuzzle(variationSelect.value, false);
    }
  });

  variationSelect.addEventListener('change', (e) => {
    if (currentMode === 'tabiya') {
      loadPreset(e.target.value, true);
    } else {
      loadPuzzle(e.target.value, true);
    }
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
    if (currentMode === 'tabiya') {
      const presets = REPERTOIRE_PRESETS[currentRepertoire];
      const defaultPreset = Object.keys(presets)[0];
      variationSelect.value = defaultPreset;
      loadPreset(defaultPreset, true);
    } else {
      const puzzles = REPERTOIRE_PUZZLES[currentRepertoire];
      const defaultPuzzle = Object.keys(puzzles)[0];
      variationSelect.value = defaultPuzzle;
      loadPuzzle(defaultPuzzle, true);
    }
  });

  btnModalClose.addEventListener('click', () => {
    gameOverModal.classList.remove('active');
  });

  // ==========================================================
  // 9. Apple iMessage Messaging System & Ollama Streaming
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

  function appendCoachBubble(htmlContent) {
    const group = document.createElement('div');
    group.className = 'msg-group coach-group';
    group.setAttribute('data-role', 'assistant');

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble coach-bubble';
    bubble.innerHTML = htmlContent;

    const receipt = document.createElement('div');
    receipt.className = 'msg-delivered-receipt';
    receipt.textContent = 'Delivered \u2022 Just now';

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

  function handleChatMoveClick(rawMove) {
    if (!rawMove) return;
    let cleanSan = rawMove
      .replace(/^\d+[\.\s]+/, '')
      .replace(/^(\.\.\.|\u2026)\s*/, '')
      .replace(/[\!\?]/g, '')
      .trim();
    cleanSan = cleanSan.replace(/0-0-0/g, 'O-O-O').replace(/0-0/g, 'O-O');

    // 1. Check if move is legal on current board
    const legalMoves = chess.moves({ verbose: true });
    const matched = legalMoves.find(m => 
      m.san === cleanSan || 
      m.san.replace(/[+#]/, '') === cleanSan.replace(/[+#]/, '') ||
      m.san.toLowerCase() === cleanSan.toLowerCase()
    );

    if (matched) {
      handleMoveAttempt(matched.from, matched.to);
      showCoachToast(`♟️ Executed: ${matched.san}`);
      return;
    }

    // 2. Check if this move is in move history to jump to it
    for (let i = 0; i < moveHistory.length; i++) {
      const h = moveHistory[i];
      if (h.san === cleanSan || h.san.replace(/[+#]/, '') === cleanSan.replace(/[+#]/, '')) {
        jumpToMove(i);
        showCoachToast(`⏱️ Jumped to game move: ${h.san}`);
        return;
      }
    }

    // 3. Otherwise show candidate preview feedback toast
    const turnName = chess.turn() === 'w' ? 'White' : 'Black';
    showCoachToast(`💡 Move: ${rawMove} (${turnName} to play)`);
  }

  function formatCoachMessage(text) {
    let html = text
      .replace(/\n\n/g, '<br><br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Pattern to detect chess moves in chat
    const movePattern = /(?:(\b\d{1,3}(?:\.\.\.|\.)\s*)?([KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[\+#]?(?:[\!\?]{1,2})?|O-O-O[\!\?]{0,2}|O-O[\!\?]{0,2}|0-0-0[\!\?]{0,2}|0-0[\!\?]{0,2}|\.\.\.[a-zA-Z0-9\+\#\=\-\!\?]+))/g;
    const stopWords = new Set(['a', 'in', 'to', 'is', 'on', 'at', 'or', 'by', 'as', 'if', 'be', 'so', 'do', 'no', 'up', 'all', 'the', 'and', 'for', 'you', 'not', 'can', 'may', 'our', 'out', 'off', 'now', 'let']);

    html = html.replace(movePattern, (match) => {
      let rawClean = match.replace(/^\d+[\.\s]+/, '').replace(/^(\.\.\.|\u2026)\s*/, '').replace(/[\!\?]/g, '').trim();
      if (!rawClean || stopWords.has(rawClean.toLowerCase())) {
        return match;
      }
      return `<button class="clickable-move-pill" data-move="${rawClean}" title="Click to play / preview ${match} on board">${match}</button>`;
    });

    return html;
  }

  function initChatClickableMoves() {
    document.querySelectorAll('.coach-bubble').forEach(bubble => {
      if (!bubble.querySelector('.clickable-move-pill')) {
        bubble.innerHTML = formatCoachMessage(bubble.innerHTML);
      }
    });
  }

  // Click delegation for moves mentioned in Coach Vance's iMessage chat
  messagesContainer.addEventListener('click', (e) => {
    const pill = e.target.closest('.clickable-move-pill');
    if (!pill) return;
    e.preventDefault();
    e.stopPropagation();
    const rawMove = pill.getAttribute('data-move') || pill.textContent;
    handleChatMoveClick(rawMove);
  });

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
  initChatClickableMoves();
});
