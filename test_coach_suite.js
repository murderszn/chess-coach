/**
 * Comprehensive Student Role Play & Chess Correctness Test Suite
 * Tests AI responses, canonical book theory, move validation, and UI integrity.
 */

const http = require('http');

function postChat(payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = http.request('http://localhost:3030/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        // Parse SSE stream
        const lines = body.split('\n');
        let fullText = '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const str = line.replace('data: ', '').trim();
            if (str === '[DONE]') continue;
            try {
              const parsed = JSON.parse(str);
              if (parsed.content) fullText += parsed.content;
            } catch (e) {}
          }
        }
        resolve(fullText);
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('♟️ RUNNING STUDENT ROLE-PLAY COACHING TEST SUITE');
  console.log('====================================================\n');

  const results = [];

  // TEST 1: Sicilian Dragon Yugoslav 12.h4 Theory Check
  console.log('--- TEST 1: Student playing Black in Sicilian Dragon Yugoslav Attack (12.h4) ---');
  try {
    const reply1 = await postChat({
      board_context: {
        repertoire: 'black_dragon',
        preset: 'Yugoslav Attack (9.Bc4 Main Line)',
        fen: '2rq1rk1/pp1bppbp/3p1np1/4n3/2BNP2P/2N1BP2/PPPQ2P1/2KR3R b - - 0 12',
        san_history: '1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 g6 6.Be3 Bg7 7.f3 O-O 8.Qd2 Nc6 9.Bc4 Bd7 10.O-O-O Rc8 11.Bb3 Ne5 12.h4',
        last_move: '12.h4',
        turn: 'Black',
        is_check: false,
        is_game_over: false,
        legal_moves: ['Nc4', 'h5', 'Re8', 'Qa5', 'b5', 'a6']
      },
      messages: [
        { role: 'user', content: 'White just played 12.h4. What is our theoretical plan and candidate move as Black?' }
      ]
    });

    console.log('Coach Response:\n' + reply1 + '\n');

    const hasNoEmojis = !/[\u{1F300}-\u{1FAFF}]/u.test(reply1);
    const mentionsKeyMoves = /Nx?c4|h5|Rxc3/i.test(reply1);
    const isConcise = reply1.split(/[.!?]+/).filter(s => s.trim().length > 0).length <= 6;

    results.push({
      test: '1. Sicilian Dragon Yugoslav 12.h4 Theory',
      passed: hasNoEmojis && mentionsKeyMoves && isConcise,
      details: { hasNoEmojis, mentionsKeyMoves, isConcise, length: reply1.length }
    });
  } catch (err) {
    console.error('Test 1 error:', err);
    results.push({ test: '1. Sicilian Dragon Yugoslav 12.h4 Theory', passed: false, error: err.message });
  }

  // TEST 2: Student Playing White in Fried Liver Attack (5...Nxd5?)
  console.log('--- TEST 2: Student playing White in Fried Liver (5...Nxd5?) ---');
  try {
    const reply2 = await postChat({
      board_context: {
        repertoire: 'white_attack',
        preset: 'Fried Liver Attack (6.Nxf7!?)',
        fen: 'r1bqkb1r/ppp2ppp/2n5/3np1N1/2B5/8/PPPP1PPP/RNBQK2R w KQkq - 0 6',
        san_history: '1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Ng5 d5 5.exd5 Nxd5',
        last_move: '5...Nxd5',
        turn: 'White',
        is_check: false,
        is_game_over: false,
        legal_moves: ['Nxf7', 'd4', 'Qf3', 'O-O', 'Nc3']
      },
      messages: [
        { role: 'user', content: 'Black just played 5...Nxd5. What is our winning tactical strike?' }
      ]
    });

    console.log('Coach Response:\n' + reply2 + '\n');

    const hasNoEmojis2 = !/[\u{1F300}-\u{1FAFF}]/u.test(reply2);
    const mentionsNxf7 = /Nxf7/i.test(reply2);
    const isConcise2 = reply2.split(/[.!?]+/).filter(s => s.trim().length > 0).length <= 6;

    results.push({
      test: '2. White 1.e4 Fried Liver 6.Nxf7 Tactical Strike',
      passed: hasNoEmojis2 && mentionsNxf7 && isConcise2,
      details: { hasNoEmojis: hasNoEmojis2, mentionsNxf7, isConcise: isConcise2, length: reply2.length }
    });
  } catch (err) {
    console.error('Test 2 error:', err);
    results.push({ test: '2. White 1.e4 Fried Liver 6.Nxf7 Tactical Strike', passed: false, error: err.message });
  }

  // TEST 3: Student Makes a Passive Inaccuracy / Wrong Move (10...a6 in Dragon)
  console.log('--- TEST 3: Student playing passive move 10...a6 in Dragon ---');
  try {
    const reply3 = await postChat({
      board_context: {
        repertoire: 'black_dragon',
        preset: 'Yugoslav Attack',
        fen: 'r1bq1rk1/pp1bppbp/2np1np1/8/2BNP3/2N1BP2/PPPQ2PP/2KR3R b - - 0 10',
        san_history: '1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 g6 6.Be3 Bg7 7.f3 O-O 8.Qd2 Nc6 9.Bc4 Bd7 10.O-O-O a6',
        last_move: '10...a6',
        turn: 'White',
        is_check: false,
        is_game_over: false,
        legal_moves: ['Bb3', 'h4', 'g4', 'Kb1', 'Bh6']
      },
      messages: [
        { role: 'user', content: 'I played 10...a6 on the board. Is this good or should I have played something else?' }
      ]
    });

    console.log('Coach Response:\n' + reply3 + '\n');

    const hasNoEmojis3 = !/[\u{1F300}-\u{1FAFF}]/u.test(reply3);
    const mentionsInaccuracy = /tempo|passive|slow|prophylactic|Rc8|d5|b5|h4/i.test(reply3);

    results.push({
      test: '3. Inaccuracy Evaluation (10...a6 critique)',
      passed: hasNoEmojis3 && mentionsInaccuracy,
      details: { hasNoEmojis: hasNoEmojis3, mentionsInaccuracy, length: reply3.length }
    });
  } catch (err) {
    console.error('Test 3 error:', err);
    results.push({ test: '3. Inaccuracy Evaluation (10...a6 critique)', passed: false, error: err.message });
  }

  console.log('====================================================');
  console.log('TEST SUMMARY:');
  console.log(JSON.stringify(results, null, 2));
  console.log('====================================================');
}

runTests();
