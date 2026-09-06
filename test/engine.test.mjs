import test from 'node:test';
import assert from 'node:assert/strict';

import { Game, RULES } from '../src/js/engine.js';
import { BOARD, BOARD_SIZE, TILE, gridPos } from '../src/js/data/board.js';
import { ELEMENT_DICE, BY_SYMBOL, ELEMENTS } from '../src/js/data/elements.js';
import { CARD_PAIRS, buildQuestionDeck, buildAnswerDeck } from '../src/js/data/cards.js';
import { autoplay } from './autoplay.mjs';

/* --------------------------------------------------------------- papan --- */

test('papan berisi 28 petak sesuai foto papan asli', () => {
  assert.equal(BOARD_SIZE, 28);
  assert.equal(BOARD[0], TILE.START);
  assert.equal(BOARD[7], TILE.X2);
  assert.equal(BOARD[14], TILE.JAIL);
  assert.equal(BOARD[21], TILE.PLANE);
  // baris atas: minus/plus berselang-seling
  assert.deepEqual(BOARD.slice(1, 7), [TILE.MINUS, TILE.PLUS, TILE.MINUS, TILE.PLUS, TILE.MINUS, TILE.PLUS]);
});

test('setiap petak menempati sel grid 8x8 yang unik dan berada di tepi', () => {
  const dipakai = new Set();
  for (let i = 0; i < BOARD_SIZE; i++) {
    const { row, col } = gridPos(i);
    assert.ok(row >= 1 && row <= 8 && col >= 1 && col <= 8, 'petak ' + i + ' di luar grid');
    assert.ok(row === 1 || row === 8 || col === 1 || col === 8, 'petak ' + i + ' bukan di tepi');
    const key = row + ',' + col;
    assert.ok(!dipakai.has(key), 'dua petak menempati sel yang sama: ' + key);
    dipakai.add(key);
  }
});

/* -------------------------------------------------------- kartu & dadu --- */

test('20 kartu question dan 20 kartu answer, tiap pasang punya jawaban unik', () => {
  assert.equal(buildQuestionDeck().length, 20);
  assert.equal(buildAnswerDeck().length, 20);
  assert.equal(new Set(CARD_PAIRS.map((p) => p.id)).size, 20);
  assert.equal(new Set(CARD_PAIRS.map((p) => p.a.toLowerCase())).size, 20);
});

test('3 dadu unsur, 6 sisi, semua unsur dikenali', () => {
  assert.equal(ELEMENT_DICE.length, 3);
  for (const dadu of ELEMENT_DICE) {
    assert.equal(dadu.length, 6);
    for (const sym of dadu) assert.ok(BY_SYMBOL[sym], 'unsur tidak dikenal: ' + sym);
  }
  const dipakai = ELEMENT_DICE.flat();
  assert.equal(new Set(dipakai).size, 18, 'tidak boleh ada unsur kembar antar dadu');
  for (const e of ELEMENTS) assert.ok(e.z >= 1 && e.z <= 20);
});

/* ------------------------------------------------------- aturan pokok ---- */

test('aturan 1: hanya 2 sampai 4 pemain', () => {
  assert.throws(() => new Game(['A']));
  assert.throws(() => new Game(['A', 'B', 'C', 'D', 'E']));
  assert.doesNotThrow(() => new Game(['A', 'B'], { seed: 1 }));
  assert.doesNotThrow(() => new Game(['A', 'B', 'C', 'D'], { seed: 1 }));
});

test('aturan 2: setiap pemain mulai dengan 2 kartu answer', () => {
  const g = new Game(['A', 'B', 'C', 'D'], { seed: 7 });
  for (const p of g.players) assert.equal(p.answers.length, RULES.KARTU_AWAL);
  assert.equal(g.aDeck.length, 20 - 4 * RULES.KARTU_AWAL);
});

test('aturan 3: melewati atau mendarat di START memberi +2 poin', () => {
  const g = new Game(['A', 'B'], { seed: 3 });
  const p = g.player;
  p.pos = 26;
  p.score = 0;
  g._startMove(4); // 26 + 4 = 30 -> lewat START
  assert.equal(p.pos, 2);
  assert.equal(p.score, RULES.BONUS_START);
});

test('aturan 5: dadu unsur benar memberi pilihan +2 poin atau +2 langkah; salah tidak mengurangi poin', () => {
  const g = new Game(['A', 'B'], { seed: 11 });
  g.ackHandoff();
  g.rollDice();
  assert.equal(g.pending.kind, 'element_question');
  const el = g.pending.element;
  const langkah = g.dice.normal;
  const p = g.player;

  g.answerElement(el.z);
  assert.equal(g.pending.kind, 'element_choice');
  g.chooseElementReward('poin');
  assert.equal(p.score, RULES.BONUS_DADU_UNSUR + (p.pos === (0 + langkah) % 28 ? 0 : 0));
  assert.equal(g.pending.kind, 'moving');
  assert.equal(g.pending.steps, langkah);

  // jawaban salah: tidak dapat apa pun, juga tidak dikurangi
  const g2 = new Game(['A', 'B'], { seed: 12 });
  g2.ackHandoff();
  g2.rollDice();
  const sebelum = g2.player.score;
  g2.answerElement(999);
  assert.equal(g2.player.score, sebelum, 'jawaban salah tidak boleh mengurangi poin (aturan 5)');
  assert.equal(g2.pending.kind, 'moving');
});

test('aturan 6: dadu unsur berganti setiap pergantian giliran', () => {
  const g = new Game(['A', 'B', 'C'], { seed: 21 });
  const terlihat = [];
  for (let i = 0; i < 6; i++) {
    terlihat.push(g.dice.elementDiceIndex);
    // majukan satu giliran secara paksa
    g.pending = null;
    g._nextTurn();
    if (g.gameOver) break;
  }
  assert.deepEqual(terlihat.slice(0, 6), [0, 1, 2, 0, 1, 2]);
});

test('aturan 7: kalau pemain punya kartu answer yang cocok, kartu question langsung terjawab sendiri', () => {
  const g = new Game(['A', 'B'], { seed: 31 });
  const p = g.player;
  const pasangan = CARD_PAIRS[0];
  const kartuQ = buildQuestionDeck().find((q) => q.pairId === pasangan.id);
  const kartuA = buildAnswerDeck().find((a) => a.pairId === pasangan.id);
  g.qDeck = [kartuQ];
  p.answers = [kartuA];
  p.score = 0;

  g._drawQuestion();
  assert.equal(p.score, pasangan.skor, 'skor sesuai yang tertulis di kartu (aturan 10.1)');
  assert.equal(p.answers.length, 0);
  assert.equal(p.questions.length, 0);
});

test('aturan 7 & 11: tanpa kartu answer yang cocok, pertanyaan jadi aktif dan skornya jatuh ke pemilik saat gilirannya kembali', () => {
  const g = new Game(['A', 'B'], { seed: 41 });
  const p = g.player;
  const pasangan = CARD_PAIRS[5];
  const kartuQ = buildQuestionDeck().find((q) => q.pairId === pasangan.id);
  g.qDeck = [kartuQ, ...g.qDeck];
  p.answers = buildAnswerDeck().filter((a) => a.pairId !== pasangan.id).slice(0, 2);
  p.score = 0;

  g._drawQuestion();
  assert.equal(p.questions.length, 1, 'pertanyaan menjadi aktif (aturan 7)');
  assert.equal(g.pending.kind, 'info');

  // giliran berputar sampai kembali ke pemilik
  g.ack();
  while (!g.gameOver && g.current !== p.id) { g.pending = null; g._nextTurn(); }

  assert.equal(p.questions.length, 0, 'pertanyaan kedaluwarsa saat giliran kembali (aturan 11)');
  assert.equal(p.score, pasangan.skor, 'skor pertanyaan diberikan ke pemiliknya (aturan 11)');
  assert.equal(g.openQuestions.length, 1, 'kartunya pindah ke moderator dengan skor terbuka (aturan 11)');
});

test('aturan 8: moderator membacakan kartu question saat tak ada pemain yang memegangnya', () => {
  const g = new Game(['A', 'B'], { seed: 51 });
  assert.ok(g.moderatorQuestion, 'di giliran pertama belum ada pemain yang punya kartu question');
  // begitu seorang pemain mengambil kartu question, kartu moderator gugur
  const p = g.player;
  p.answers = [];
  g._drawQuestion();
  assert.equal(g.moderatorQuestion, null);
});

test('aturan 9 & 10: klaim benar memberi skor kartu, klaim salah memotong 3 poin', () => {
  const g = new Game(['A', 'B'], { seed: 61 });
  const [a, b] = g.players;
  const pasangan = CARD_PAIRS[9];
  const kartuQ = buildQuestionDeck().find((q) => q.pairId === pasangan.id);
  const kartuA = buildAnswerDeck().find((x) => x.pairId === pasangan.id);
  const kartuSalah = buildAnswerDeck().find((x) => x.pairId !== pasangan.id);

  kartuQ.drawnOnTurn = g.turnCount;
  b.questions = [kartuQ];
  g.moderatorQuestion = null;
  g.current = a.id;
  g.ackHandoff();
  a.answers = [kartuA, kartuSalah];
  a.score = 0;

  const bisa = g.claimableFor(a);
  const target = bisa.find((c) => c.card.uid === kartuQ.uid);
  assert.ok(target);

  g.claim(target.ref, kartuA.uid);
  assert.equal(a.score, pasangan.skor);
  assert.equal(b.questions.length, 0);

  // klaim salah ke kartu terbuka
  const lain = CARD_PAIRS[10];
  g.openQuestions = [buildQuestionDeck().find((q) => q.pairId === lain.id)];
  const target2 = g.claimableFor(a).find((c) => c.skorTerbuka);
  const skorSebelum = a.score;
  g.claim(target2.ref, kartuSalah.uid);
  assert.equal(a.score, skorSebelum - RULES.PENALTI_SALAH, 'jawaban salah -3 (aturan 10.2)');
});

test('aturan 12: menjawab kartu terbuka moderator hanya bernilai +1', () => {
  const g = new Game(['A', 'B'], { seed: 71 });
  g.ackHandoff();
  const a = g.player;
  const pasangan = CARD_PAIRS[3];
  g.openQuestions = [buildQuestionDeck().find((q) => q.pairId === pasangan.id)];
  g.moderatorQuestion = null;
  const kartuA = buildAnswerDeck().find((x) => x.pairId === pasangan.id);
  a.answers = [kartuA, buildAnswerDeck().find((x) => x.pairId !== pasangan.id)];
  a.score = 0;
  a.x2 = false;

  const target = g.claimableFor(a).find((c) => c.skorTerbuka);
  g.claim(target.ref, kartuA.uid);
  assert.equal(a.score, RULES.BONUS_KARTU_TERBUKA);
  assert.ok(pasangan.skor > RULES.BONUS_KARTU_TERBUKA, 'kartu terbuka memang bernilai lebih kecil');
});

test('aturan 14: setiap kartu answer yang tersisa memotong 3 poin di akhir permainan', () => {
  const g = new Game(['A', 'B'], { seed: 81 });
  const [a, b] = g.players;
  a.score = 20;
  b.score = 20;
  a.answers = buildAnswerDeck().slice(0, 3);
  b.answers = [];
  b.questions = [];
  g._endGame('tes');
  assert.equal(a.score, 20 - 3 * RULES.PENALTI_SISA_ANSWER);
  assert.equal(b.score, 20);
});

test('aturan 16: pemenang ditentukan dari skor tertinggi, bukan urutan selesai', () => {
  const g = new Game(['A', 'B', 'C'], { seed: 91 });
  g.players[0].score = 5;
  g.players[1].score = 17;
  g.players[2].score = 9;
  for (const p of g.players) { p.answers = []; p.questions = []; }
  g._endGame('tes');
  assert.equal(g.result.juara.length, 1);
  assert.equal(g.result.juara[0].name, 'B');
  assert.deepEqual(g.result.peringkat.map((p) => p.name), ['B', 'C', 'A']);
});

/* ------------------------------------------------------------- simbol ---- */

test('simbol 1 (SKIP): pemain berikutnya kehilangan giliran', () => {
  const g = new Game(['A', 'B', 'C'], { seed: 101 });
  const p = g.player;
  p.pos = BOARD.indexOf(TILE.SKIP);
  g._resolveTile();
  assert.equal(g.players[1].skipNext, true);
});

test('simbol 4 (penjara): bayar 3 poin hanya boleh kalau tidak membuat skor minus', () => {
  const g = new Game(['A', 'B'], { seed: 111 });
  const p = g.player;
  g.ackHandoff();
  p.jail = true;
  p.score = 2;
  g.rollDice();
  assert.equal(g.pending.kind, 'jail');
  assert.equal(g.pending.bisaBayar, false, 'skor 2 tidak cukup untuk membayar 3');
  p.score = 3;
  g._openJail();
  assert.equal(g.pending.bisaBayar, true);
  g.jailChoice('bayar');
  assert.equal(p.jail, false);
  assert.equal(p.score, 0);
});

test('simbol 4 (penjara): harus benar 2 kali berturut-turut untuk keluar lewat dadu unsur', () => {
  const g = new Game(['A', 'B'], { seed: 121 });
  const p = g.player;
  p.jail = true;
  g._openJail();
  g.jailChoice('dadu');
  assert.equal(g.pending.kind, 'element_question');
  g.answerElement(g.pending.element.z);
  assert.equal(p.jail, true, 'satu jawaban benar belum cukup');
  assert.equal(g.pending.kind, 'element_question');
  g.answerElement(g.pending.element.z);
  assert.equal(p.jail, false, 'dua jawaban benar membebaskan pemain');
});

test('simbol 5 (REVERSE): urutan giliran berbalik arah', () => {
  const g = new Game(['A', 'B', 'C'], { seed: 131 });
  assert.equal(g.direction, 1);
  g.player.pos = BOARD.indexOf(TILE.REVERSE);
  g._resolveTile();
  assert.equal(g.direction, -1);
  assert.equal(g._nextIndex(0), 2, 'setelah reverse, giliran mundur');
});

test('simbol 6 (x2): perolehan skor berikutnya dikali dua, biaya sukarela tidak', () => {
  const g = new Game(['A', 'B'], { seed: 141 });
  const p = g.player;
  p.score = 0;
  p.pos = BOARD.indexOf(TILE.X2);
  g._resolveTile();
  assert.equal(p.x2, true);
  g._score(p, 3, 'tes');
  assert.equal(p.score, 6, 'skor dikali dua');
  assert.equal(p.x2, false, 'efek x2 dipakai sekali lalu habis');

  p.x2 = true;
  p.score = 10;
  g._score(p, -RULES.BAYAR_PESAWAT, 'tiket pesawat', false);
  assert.equal(p.score, 8, 'biaya sukarela tidak digandakan');
  assert.equal(p.x2, true, 'efek x2 masih tersimpan');
});

test('simbol 7 (tukar kartu): seluruh kartu kedua pemain benar-benar bertukar', () => {
  const g = new Game(['A', 'B'], { seed: 151 });
  const [a, b] = g.players;
  const kartuA = a.answers.map((c) => c.uid);
  const kartuB = b.answers.map((c) => c.uid);
  a.pos = BOARD.indexOf(TILE.SWAP);
  g._resolveTile();
  assert.equal(g.pending.kind, 'swap_target');
  g.swapWith(b.id);
  assert.deepEqual(a.answers.map((c) => c.uid), kartuB);
  assert.deepEqual(b.answers.map((c) => c.uid), kartuA);
});

test('simbol 9 & 10 (plus/minus): jawaban benar menambah bonus 2, salah hanya angka dadu', () => {
  // PLUS benar
  let g = new Game(['A', 'B'], { seed: 161 });
  let p = g.player;
  p.score = 0;
  p.pos = BOARD.indexOf(TILE.PLUS);
  g.turn = { tileDie: null, planeProgress: 0 };
  g._resolveTile();
  let d = g.turn.tileDie;
  g.answerElement(g.pending.element.z);
  assert.equal(p.score, d + RULES.BONUS_PLUS);

  // PLUS salah
  g = new Game(['A', 'B'], { seed: 162 });
  p = g.player;
  p.score = 0;
  p.pos = BOARD.indexOf(TILE.PLUS);
  g.turn = { tileDie: null, planeProgress: 0 };
  g._resolveTile();
  d = g.turn.tileDie;
  g.answerElement(999);
  assert.equal(p.score, d, 'salah tetap dapat angka dadu normal (simbol 9)');

  // MINUS benar
  g = new Game(['A', 'B'], { seed: 163 });
  p = g.player;
  p.score = 30;
  p.pos = BOARD.indexOf(TILE.MINUS);
  g.turn = { tileDie: null, planeProgress: 0 };
  g._resolveTile();
  d = g.turn.tileDie;
  g.answerElement(g.pending.element.z);
  assert.equal(p.score, 30 + RULES.BONUS_MINUS - d);

  // MINUS salah
  g = new Game(['A', 'B'], { seed: 164 });
  p = g.player;
  p.score = 30;
  p.pos = BOARD.indexOf(TILE.MINUS);
  g.turn = { tileDie: null, planeProgress: 0 };
  g._resolveTile();
  d = g.turn.tileDie;
  g.answerElement(999);
  assert.equal(p.score, 30 - d, 'salah kena pengurangan penuh (simbol 10)');
});

test('aksi ganda dari UI (klik dua kali) diabaikan, bukan bikin error', () => {
  const g = new Game(['A', 'B'], { seed: 171 });
  g.ackHandoff();
  g.ackHandoff();                       // handoff sudah lewat
  assert.equal(g.pending.kind, 'turn_menu');

  g.rollDice();
  g.rollDice();                         // dadu sudah dilempar
  assert.equal(g.pending.kind, 'element_question');

  const el = g.pending.element;
  g.answerElement(el.z);
  assert.doesNotThrow(() => g.answerElement(el.z), 'jawaban kedua harus diabaikan');

  // aksi yang tidak sedang ditunggu tidak boleh mengubah apa pun
  const sebelum = g.player.score;
  g.jailChoice('bayar');
  g.planePay('poin');
  g.swapWith(1);
  g.planeFlyTo(14);
  assert.equal(g.player.score, sebelum);
  assert.equal(g.player.pos, 0);
});

/* ------------------------------------------------------- uji ketahanan --- */

function invarian(g) {
  const semua = new Map();
  const catat = (c, tempat) => {
    assert.ok(!semua.has(c.uid), 'kartu ' + c.uid + ' ada di dua tempat: ' + semua.get(c.uid) + ' & ' + tempat);
    semua.set(c.uid, tempat);
  };
  g.qDeck.forEach((c) => catat(c, 'qDeck'));
  g.aDeck.forEach((c) => catat(c, 'aDeck'));
  g.discard.forEach((c) => catat(c, 'discard'));
  g.openQuestions.forEach((c) => catat(c, 'openQuestions'));
  if (g.moderatorQuestion) catat(g.moderatorQuestion, 'moderatorQuestion');
  g.players.forEach((p) => {
    p.answers.forEach((c) => catat(c, 'tangan ' + p.name));
    p.questions.forEach((c) => catat(c, 'question ' + p.name));
  });
  assert.equal(semua.size, 40, 'total kartu harus selalu 40 (20 Q + 20 A)');

  for (const p of g.players) {
    assert.ok(p.pos >= 0 && p.pos < BOARD_SIZE, 'posisi bidak di luar papan');
    assert.ok(Number.isInteger(p.score), 'skor harus bilangan bulat');
  }
}

test('100 permainan acak (pemain pandai) selesai tanpa macet dan invarian terjaga', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const jml = 2 + (seed % 3);
    const nama = ['Harits', 'Abdan', 'Sari', 'Rian'].slice(0, jml);
    const g = new Game(nama, { seed });
    autoplay(g, { pintar: true, onState: invarian, rng: mulberry(seed * 7919) });
    assert.ok(g.gameOver);
    assert.ok(g.result && g.result.juara.length >= 1);
  }
});

test('100 permainan acak (pemain asal-asalan) juga selalu selesai', () => {
  for (let seed = 500; seed < 600; seed++) {
    const jml = 2 + (seed % 3);
    const nama = ['P1', 'P2', 'P3', 'P4'].slice(0, jml);
    const g = new Game(nama, { seed });
    autoplay(g, { pintar: false, onState: invarian, rng: mulberry(seed * 104729) });
    assert.ok(g.gameOver);
  }
});

function mulberry(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
