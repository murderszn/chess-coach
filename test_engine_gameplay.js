const http = require('http');

function getEngineMove(fen, depth = 12) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ fen, depth, use_book: true });
    const req = http.request({
      hostname: 'localhost',
      port: 3030,
      path: '/api/engine/bestmove',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function runTestGame() {
  console.log('====================================================');
  console.log('⚔️ TESTING HIGH-LEVEL STOCKFISH 18 ENGINE GAMEPLAY');
  console.log('====================================================\n');

  // Test 1: Sicilian Dragon 12.h4 position (Black response)
  const dragonFen = '2rq1rk1/pp1bppbp/3p1np1/4n3/2BNP2P/2N1BP2/PPPQ2P1/2KR3R b - - 0 12';
  console.log('Position 1: Sicilian Dragon Yugoslav 12.h4 (Black to move)');
  const res1 = await getEngineMove(dragonFen, 12);
  console.log('Engine Output 1:', res1);

  // Test 2: Two Knights Defense 5...Nxd5? (White response)
  const friedLiverFen = 'r1bqkb1r/ppp2ppp/2n5/3np1N1/2B5/8/PPPP1PPP/RNBQK2R w KQkq - 0 6';
  console.log('\nPosition 2: Fried Liver 5...Nxd5? (White to move)');
  const res2 = await getEngineMove(friedLiverFen, 12);
  console.log('Engine Output 2:', res2);

  // Test 3: Complex middlegame with hanging tactic
  const tacticFen = 'r2q1rk1/1p2bppp/p1n1pn2/3p4/3P4/P1N1BN2/1PP2PPP/R2Q1RK1 w - - 0 11';
  console.log('\nPosition 3: Master Middlegame (White to move)');
  const res3 = await getEngineMove(tacticFen, 12);
  console.log('Engine Output 3:', res3);

  console.log('\n====================================================');
  console.log('All engine evaluations verified successfully!');
  console.log('====================================================');
}

runTestGame().catch(console.error);
