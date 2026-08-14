/**
 * Grandmaster Chess Coach (Julian Vance) — Sicilian Dragon Analysis
 * Deep Board-Aware Dynamic Coaching Engine
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

  // Sicilian Dragon Tabiya Presets
  const TABIYA_PRESETS = {
    'yugoslav_12h4': {
      name: 'Yugoslav 9.Bc4 Main Line (12.h4)',
      moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6', 'Be3', 'Bg7', 'f3', 'O-O', 'Qd2', 'Nc6', 'Bc4', 'Bd7', 'O-O-O', 'Rc8', 'Bb3', 'Ne5', 'h4'],
      turnDesc: 'Black to move (12...Nc4, 12...h5, or 12...Qa5)'
    },
    'exchange_sac': {
      name: 'Thematic ...Rxc3 Exchange Sac Setup',
      moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6', 'Be3', 'Bg7', 'f3', 'O-O', 'Qd2', 'Nc6', 'Bc4', 'Bd7', 'O-O-O', 'Rc8', 'Bb3', 'Ne5', 'h4', 'Nc4', 'Bxc4', 'Rxc4', 'h5', 'Nxh5', 'g4', 'Nf6', 'Nde2', 'Qa5'],
      turnDesc: 'Black to move (Preparing ...Rfc8 and ...Rxc3!)'
    },
    'soltis_h5': {
      name: 'Soltis Variation (12...h5)',
      moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6', 'Be3', 'Bg7', 'f3', 'O-O', 'Qd2', 'Nc6', 'Bc4', 'Bd7', 'O-O-O', 'Rc8', 'Bb3', 'Ne5', 'h4', 'h5'],
      turnDesc: 'White to move (13.Bg5 or 13.Kb1)'
    },
    'yugoslav_d5': {
      name: 'Yugoslav 9.0-0-0 d5! Central Strike',
      moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6', 'Be3', 'Bg7', 'f3', 'O-O', 'Qd2', 'Nc6', 'O-O-O', 'd5'],
      turnDesc: 'White to move (10.exd5 or 10.Qe1)'
    },
    'chinese_dragon': {
      name: 'Chinese Dragon (10...Rb8)',
      moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6', 'Be3', 'Bg7', 'f3', 'O-O', 'Qd2', 'Nc6', 'Bc4', 'Bd7', 'O-O-O', 'Rb8'],
      turnDesc: 'White to move (Preparing ...b5 pawn storm)'
    },
    'levenfish': {
      name: 'Levenfish Attack (6.f4)',
      moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6', 'f4'],
      turnDesc: 'Black to move (6...Nc6 or 6...Bg7)'
    },
    'classical': {
      name: 'Classical Dragon (6.Be2)',
      moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6', 'Be2', 'Bg7', 'Be3', 'O-O', 'O-O'],
      turnDesc: 'Black to move (8...Nc6)'
    },
    'initial': {
      name: 'Standard Starting Position',
      moves: [],
      turnDesc: 'White to move'
    }
  };

  // Conversation history
  const conversationHistory = [
    {
      role: 'assistant',
      content: "Alright, let's analyze your Yugoslav Attack game. We have the critical tabiya after: 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 g6 6.Be3 Bg7 7.f3 0-0 8.Qd2 Nc6 9.Bc4 Bd7 10.0-0-0 Rc8 11.Bb3 Ne5 12.h4. When White pushed 12.h4, you hesitated. In this opposite-castling race, hesitation is fatal. What was your concrete plan? Calculating 12...Nc4, 12...h5 Soltis, or preparing ...Rxc3? Make your move on the board or talk to me! ♟️"
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

  // iMessage Elements
  const messagesContainer = document.getElementById('messages-container');
  const chatInput = document.getElementById('chat-input');
  const btnSend = document.getElementById('btn-send');
  const btnResetSession = document.getElementById('btn-reset-session');

  // ==========================================================
  // 1. Board Context Generator
  // ==========================================================
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
  // 2. Board & Move Management
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
    fenBadge.textContent = '📋 Copy FEN';
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

          // Dynamic instant feedback on student's move!
          if (!isStreaming) {
            const movePrompt = `I just played "${playedSan}" on the board (FEN: ${chess.fen()}). Analyze this move in the context of the Dragon. Is it strong, sharp, or does White have an immediate tactical counter-threat?`;
            appendUserBubble(`Played on board: ${playedSan}`);
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
  }

  // Navigation controls
  btnMoveStart.addEventListener('click', () => {
    if (moveHistory.length === 0) return;
    chess.reset();
    currentMoveIndex = -1;
    renderBoard();
    renderMovesList();
  });

  btnMovePrev.addEventListener('click', () => {
    if (currentMoveIndex > 0) {
      jumpToMove(currentMoveIndex - 1);
    } else if (currentMoveIndex === 0) {
      chess.reset();
      currentMoveIndex = -1;
      renderBoard();
      renderMovesList();
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
    setTimeout(() => { fenBadge.textContent = '📋 Copy FEN'; }, 1500);
  });

  // Ask Coach Consultation Button
  btnConsultCoach.addEventListener('click', () => {
    const boardCtx = getCurrentBoardContext();
    const question = `Coach Vance, evaluate this position on the board (${boardCtx.preset}):\nMove: ${boardCtx.last_move} | Turn: ${boardCtx.turn} to play\nFEN: ${boardCtx.fen}\n\nWhat are the top tactical candidate moves for ${boardCtx.turn} and what plans should I formulate?`;
    
    chatInput.value = question;
    handleSendMessage();
  });

  // ==========================================================
  // 3. Apple iMessage Messaging System & Ollama Streaming
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
