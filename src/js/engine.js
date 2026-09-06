/**
 * Mesin aturan Sciencenopoly.
 *
 * Modul ini adalah "moderator komputer": semua pengecekan benar/salah, pembagian
 * skor, dan urutan giliran yang di papan aslinya dikerjakan seorang moderator
 * manusia (aturan 1, 8, 9, 10) dijalankan di sini. Tidak ada DOM di file ini
 * supaya logikanya bisa diuji terpisah dengan `node --test`.
 *
 * Nomor aturan pada komentar merujuk ke "ATURAN PERMAINAN SCIENCENOPOLY"
 * di dokumen penelitian.
 */

import { BOARD, BOARD_SIZE, TILE } from './data/board.js';
import { ELEMENT_DICE, BY_SYMBOL } from './data/elements.js';
import { buildQuestionDeck, buildAnswerDeck, CARD_PAIRS } from './data/cards.js';

export const PLAYER_COLORS = ['#e4572e', '#2e86ab', '#3fa34d', '#b5179e'];

/** Nilai-nilai aturan yang bisa disetel; angka default diambil dari dokumen. */
export const RULES = {
  KARTU_AWAL: 2,          // aturan 2  — tiap pemain diberi 2 kartu answer
  BONUS_START: 2,         // aturan 3  — kembali/melewati start
  BONUS_DADU_UNSUR: 2,    // aturan 5  — +2 poin ATAU +2 langkah
  LANGKAH_DADU_UNSUR: 2,  // aturan 5
  PENALTI_SALAH: 3,       // aturan 10.2 — jawaban salah -3
  BONUS_KARTU_TERBUKA: 1, // aturan 12 — menjawab kartu terbuka moderator +1
  PENALTI_SISA_ANSWER: 3, // aturan 14 — tiap kartu answer tersisa -3
  BAYAR_PENJARA: 3,       // simbol 4
  BAYAR_PESAWAT: 2,       // simbol 8
  BONUS_TITIK_AMAN: 1,    // simbol titik aman (lihat CATATAN-ATURAN.md)
  BONUS_PLUS: 2,          // simbol 9
  BONUS_MINUS: 2,         // simbol 10
};

/* ------------------------------------------------------------------ acak --- */

/** RNG mulberry32 - dipakai supaya jalannya permainan bisa diulang saat diuji. */
export function makeRng(seed = (Date.now() >>> 0)) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

const JAWABAN = Object.fromEntries(CARD_PAIRS.map((p) => [p.id, p.a]));

/* ----------------------------------------------------------------- game ---- */

export class Game {
  constructor(names, opts) {
    const options = opts || {};
    if (names.length < 2 || names.length > 4) {
      throw new Error('Sciencenopoly dimainkan oleh 2 sampai 4 pemain (aturan 1).');
    }
    this.rng = makeRng(options.seed);

    this.players = names.map((name, i) => ({
      id: i,
      name: (name || '').trim() || ('Pemain ' + (i + 1)),
      color: PLAYER_COLORS[i],
      pos: 0,
      score: 0,
      answers: [],      // kartu answer di tangan
      questions: [],    // kartu question aktif milik pemain ini (aturan 7 & 11)
      jail: false,
      jailProgress: 0,  // jumlah dadu unsur yang sudah dijawab benar di penjara
      skipNext: false,  // kena efek petak SKIP dari pemain sebelumnya
      x2: false,        // efek petak x2 (simbol 6) menunggu dipakai
      finished: false,
    }));

    this.qDeck = shuffle(buildQuestionDeck(), this.rng);
    this.aDeck = shuffle(buildAnswerDeck(), this.rng);
    this.discard = [];
    this.openQuestions = [];       // aturan 11 - kartu question milik moderator, skor terbuka
    this.moderatorQuestion = null; // aturan 8  - kartu question yang dibacakan moderator

    this.current = 0;
    this.direction = 1;            // dibalik oleh petak REVERSE
    this.turnCount = 0;
    this.log = [];
    this.gameOver = false;
    this.result = null;
    this.pending = null;
    this.dice = { normal: null, element: null, elementDiceIndex: 0 };
    this.turn = null;              // data sementara giliran berjalan

    // aturan 2 - setiap pemain diberikan 2 kartu answer
    for (const p of this.players) {
      for (let i = 0; i < RULES.KARTU_AWAL; i++) this._drawAnswer(p, true);
    }
    this._say('sistem', 'Permainan dimulai. Setiap pemain menerima ' + RULES.KARTU_AWAL + ' kartu answer (aturan 2).');
    this._beginTurn();
  }

  /* --------------------------------------------------------- utilitas ---- */

  get player() { return this.players[this.current]; }

  _say(type, text) { this.log.push({ type: type, text: text, turn: this.turnCount }); }

  /**
   * Satu-satunya jalan mengubah skor.
   * `doubleable`: efek x2 (simbol 6) hanya berlaku untuk perolehan skor,
   * bukan untuk biaya yang dibayar sukarela (penjara / pesawat).
   */
  _score(p, delta, reason, doubleable) {
    const bolehGanda = doubleable !== false;
    let d = delta;
    if (bolehGanda && d !== 0 && p.x2) {
      d *= 2;
      p.x2 = false;
      this._say('skor', p.name + ': efek x2 aktif - ' + (delta > 0 ? '+' : '') + delta + ' menjadi ' + (d > 0 ? '+' : '') + d + '.');
    }
    p.score += d;
    if (d !== 0) this._say('skor', p.name + ' ' + (d > 0 ? '+' : '') + d + ' poin (' + reason + '). Total: ' + p.score + '.');
    return d;
  }

  _drawAnswer(p, quiet) {
    if (this.aDeck.length === 0) return null;
    const card = this.aDeck.pop();
    p.answers.push(card);
    if (!quiet) this._say('kartu', p.name + ' mengambil 1 kartu answer.');
    return card;
  }

  activePlayers() { return this.players.filter((p) => !p.finished); }

  /** Semua pertanyaan yang boleh diklaim pemain `p`, beserta nilai poinnya. */
  claimableFor(p) {
    const out = [];
    for (const other of this.players) {
      if (other.id === p.id) continue;
      for (const q of other.questions) {
        out.push({ ref: 'p:' + q.uid, card: q, sumber: 'kartu ' + other.name, nilai: q.skor, skorTerbuka: false });
      }
    }
    if (this.moderatorQuestion) {
      const q = this.moderatorQuestion;
      out.push({ ref: 'm:' + q.uid, card: q, sumber: 'moderator', nilai: q.skor, skorTerbuka: false });
    }
    for (const q of this.openQuestions) {
      out.push({ ref: 'o:' + q.uid, card: q, sumber: 'meja moderator (skor terbuka)', nilai: RULES.BONUS_KARTU_TERBUKA, skorTerbuka: true });
    }
    return out;
  }

  /* ------------------------------------------------------- alur giliran -- */

  _beginTurn() {
    if (this.gameOver) return;
    if (this.activePlayers().length <= 1) {
      return this._endGame('Tersisa satu pemain yang masih memegang kartu (aturan 16).');
    }
    if (this.qDeck.length === 0 || this.aDeck.length === 0) {
      return this._endGame('Kartu question atau answer sudah habis (aturan 16).');
    }

    this.turnCount++;
    // aturan 6 - setiap pergantian giliran, dadu unsur juga berganti
    this.dice.elementDiceIndex = (this.turnCount - 1) % ELEMENT_DICE.length;
    this.dice.normal = null;
    this.dice.element = null;

    const p = this.player;

    // aturan 11 - pertanyaan berlaku sampai giliran jalan kembali ke pemiliknya.
    // Kartu yang diambil pada giliran sebelumnya (drawnOnTurn < turnCount) berarti
    // sudah dilewati semua pemain lain tanpa ada yang bisa menjawab.
    const expired = p.questions.filter((q) => q.drawnOnTurn < this.turnCount);
    for (const q of expired) {
      p.questions = p.questions.filter((x) => x.uid !== q.uid);
      this._score(p, q.skor, 'tidak ada pemain yang bisa menjawab pertanyaannya (aturan 11)');
      this.openQuestions.push(q);
      this._say('kartu', 'Kartu question itu diserahkan ke moderator dengan skor terbuka (aturan 11).');
    }

    this._refreshFinished();
    if (this.gameOver) return;
    if (p.finished) { this._nextTurn(); return; }

    // efek petak SKIP dari pemain sebelumnya (simbol 1)
    if (p.skipNext) {
      p.skipNext = false;
      this._say('petak', p.name + ' kehilangan giliran karena pemain sebelumnya menempati petak SKIP (simbol 1).');
      this._nextTurn();
      return;
    }

    // aturan 8 - kalau tidak ada pemain yang memegang kartu question,
    // moderator mengambil 1 kartu question dan membacakannya.
    this._maybeModeratorQuestion();

    this.turn = { tileDie: null, planeProgress: 0 };
    this.pending = { kind: 'handoff', playerId: p.id };
  }

  _maybeModeratorQuestion() {
    const adaKartuPemain = this.players.some((p) => p.questions.length > 0);
    if (!adaKartuPemain && !this.moderatorQuestion && this.qDeck.length > 0) {
      this.moderatorQuestion = this.qDeck.pop();
      this._say('moderator', 'Tidak ada pemain yang memegang kartu question, jadi moderator membacakan: "' + this.moderatorQuestion.teks + '" (aturan 8).');
    }
  }

  /**
   * Penjaga: setiap aksi dari UI hanya boleh dijalankan kalau permainan memang
   * sedang menunggu aksi itu. Tanpa ini, klik ganda / tombol yang ditekan dua
   * kali bisa memakai `pending` yang sudah berganti.
   */
  _menunggu(kind) {
    return !this.gameOver && !!this.pending && this.pending.kind === kind;
  }

  /** Dipanggil UI setelah layar serah-terima perangkat ditutup. */
  ackHandoff() {
    if (!this._menunggu('handoff')) return;
    this._openTurnMenu();
  }

  _openTurnMenu() {
    const p = this.player;
    this.pending = {
      kind: 'turn_menu',
      playerId: p.id,
      bisaKlaim: p.answers.length > 0 && this.claimableFor(p).length > 0,
      diPenjara: p.jail,
    };
  }

  /* ------------------------------------------------------------ klaim ---- */

  /** aturan 9 & 12 - pemain menyerahkan kartu answer untuk sebuah pertanyaan. */
  claim(ref, answerUid) {
    if (!this._menunggu('turn_menu')) return;
    const p = this.player;
    const target = this.claimableFor(p).find((c) => c.ref === ref);
    const answer = p.answers.find((a) => a.uid === answerUid);
    if (!target || !answer) return;

    p.answers = p.answers.filter((a) => a.uid !== answerUid);
    const benar = answer.pairId === target.card.pairId;

    this._say('klaim', p.name + ' menjawab pertanyaan dari ' + target.sumber + ' dengan kartu answer "' + answer.teks + '".');

    if (benar) {
      // aturan 10.1 - skor sesuai yang tertulis di kartu
      // aturan 12  - kartu yang sudah dibuka moderator hanya bernilai +1
      this._say('moderator', 'Moderator mencocokkan skor kedua kartu: SAMA, berarti BENAR (aturan 9).');
      this._score(p, target.nilai, target.skorTerbuka
        ? 'menjawab kartu terbuka moderator (aturan 12)'
        : 'jawaban benar (aturan 10.1)');
      this._removeQuestion(target);
      this.discard.push(answer, target.card);
    } else {
      // aturan 10.2 - jawaban salah, skor pemain dikurangi 3
      this._say('moderator', 'Moderator mencocokkan skor kedua kartu: BERBEDA, berarti SALAH (aturan 9). Jawaban yang benar: "' + (JAWABAN[target.card.pairId] || '-') + '".');
      this._score(p, -RULES.PENALTI_SALAH, 'jawaban salah (aturan 10.2)');
      this.discard.push(answer);
    }

    this._refreshFinished();
    if (this.gameOver) return;
    this._openTurnMenu();
  }

  _removeQuestion(target) {
    const jenis = target.ref.split(':')[0];
    if (jenis === 'm') this.moderatorQuestion = null;
    else if (jenis === 'o') this.openQuestions = this.openQuestions.filter((q) => q.uid !== target.card.uid);
    else for (const pl of this.players) pl.questions = pl.questions.filter((q) => q.uid !== target.card.uid);
  }

  /* ------------------------------------------------------- dadu & jalan -- */

  /** aturan 5 - lempar 1 dadu normal bersama 1 dadu unsur. */
  rollDice() {
    if (!this._menunggu('turn_menu')) return;
    const p = this.player;
    if (p.jail) { this._openJail(); return; }

    this.dice.normal = 1 + Math.floor(this.rng() * 6);
    const face = Math.floor(this.rng() * 6);
    this.dice.element = BY_SYMBOL[ELEMENT_DICE[this.dice.elementDiceIndex][face]];
    this._say('dadu', p.name + ' melempar dadu normal = ' + this.dice.normal + ' dan dadu unsur ' + (this.dice.elementDiceIndex + 1) + ' = ' + this.dice.element.sym + '.');
    this.pending = { kind: 'element_question', ctx: 'giliran', element: this.dice.element };
  }

  /** Jawaban nomor atom; `nomor` boleh null kalau pemain memilih tidak menjawab. */
  answerElement(nomor) {
    if (!this._menunggu('element_question')) return;
    const p = this.player;
    const el = this.pending.element;
    const ctx = this.pending.ctx;
    const benar = Number(nomor) === el.z;
    this._say('unsur', benar
      ? p.name + ' menjawab nomor atom ' + el.sym + ' = ' + el.z + '. BENAR.'
      : p.name + ' menjawab ' + (nomor === null || nomor === undefined || nomor === '' ? '(tidak menjawab)' : nomor) + ' untuk ' + el.sym + '. SALAH - nomor atom ' + el.sym + ' (' + el.name + ') adalah ' + el.z + '.');

    if (ctx === 'giliran') {
      // aturan 5 - benar: pilih +2 poin atau +2 langkah.
      // salah: tidak dapat apa pun DAN tidak ada pengurangan poin.
      if (benar) {
        this.pending = { kind: 'element_choice' };
      } else {
        this._say('unsur', 'Tidak ada poin dan tidak ada pengurangan (aturan 5).');
        this._startMove(this.dice.normal);
      }
      return;
    }

    if (ctx === 'plus') { // simbol 9
      const d = this.turn.tileDie;
      const didapat = this._score(p, benar ? d + RULES.BONUS_PLUS : d, benar
        ? 'petak PLUS: dadu ' + d + ' + bonus ' + RULES.BONUS_PLUS + ' (simbol 9)'
        : 'petak PLUS: dadu ' + d + ' saja (simbol 9)');
      this.pending = { kind: 'info', text: benar
        ? 'Benar! Dadu normal ' + d + ' + bonus ' + RULES.BONUS_PLUS + ' = +' + didapat + ' poin.'
        : 'Salah. Kamu tetap mendapat +' + didapat + ' poin dari angka dadu normal saja.', next: 'end_turn' };
      return;
    }

    if (ctx === 'minus') { // simbol 10
      const d = this.turn.tileDie;
      const didapat = this._score(p, benar ? RULES.BONUS_MINUS - d : -d, benar
        ? 'petak MINUS: +' + RULES.BONUS_MINUS + ' lalu -' + d + ' (simbol 10)'
        : 'petak MINUS: -' + d + ' (simbol 10)');
      this.pending = { kind: 'info', text: benar
        ? 'Benar! Bonus +' + RULES.BONUS_MINUS + ' dikurangi dadu normal ' + d + ' = ' + (didapat > 0 ? '+' : '') + didapat + ' poin.'
        : 'Salah. Kamu kena pengurangan penuh dari angka dadu normal: ' + didapat + ' poin.', next: 'end_turn' };
      return;
    }

    if (ctx === 'penjara') { // simbol 4
      if (!benar) {
        p.jailProgress = 0;
        this._say('petak', p.name + ' gagal keluar dari penjara (simbol 4).');
        this.pending = { kind: 'info', text: 'Gagal keluar dari penjara. Giliranmu selesai.', next: 'end_turn' };
        return;
      }
      p.jailProgress++;
      if (p.jailProgress >= 2) {
        p.jail = false;
        p.jailProgress = 0;
        this._say('petak', p.name + ' menjawab 2 dadu unsur dan keluar dari penjara (simbol 4).');
        this.pending = { kind: 'info', text: 'Kamu berhasil keluar dari penjara! Giliranmu selesai.', next: 'end_turn' };
      } else {
        this._askElement('penjara', 'Benar! Sekarang jawab dadu unsur kedua untuk keluar penjara.');
      }
      return;
    }

    if (ctx === 'pesawat') { // simbol 8
      if (!benar) {
        this.turn.planeProgress = 0;
        this._say('petak', p.name + ' salah menjawab, jadi tidak jadi naik pesawat (simbol 8).');
        this.pending = { kind: 'info', text: 'Jawaban salah, kamu tetap di petak pesawat.', next: 'end_turn' };
        return;
      }
      this.turn.planeProgress++;
      if (this.turn.planeProgress >= 2) this.pending = { kind: 'plane_destination' };
      else this._askElement('pesawat', 'Benar! Sekarang jawab dadu unsur kedua untuk naik pesawat.');
      return;
    }
  }

  _askElement(ctx, catatan) {
    const face = Math.floor(this.rng() * 6);
    const el = BY_SYMBOL[ELEMENT_DICE[this.dice.elementDiceIndex][face]];
    this.dice.element = el;
    this.pending = { kind: 'element_question', ctx: ctx, element: el, catatan: catatan };
  }

  /** aturan 5 - pemain memilih hadiah setelah menjawab dadu unsur dengan benar. */
  chooseElementReward(pilihan) {
    if (!this._menunggu('element_choice')) return;
    const p = this.player;
    if (pilihan === 'poin') {
      this._score(p, RULES.BONUS_DADU_UNSUR, 'menjawab dadu unsur dengan benar (aturan 5)');
      this._startMove(this.dice.normal);
    } else {
      this._say('unsur', p.name + ' memilih +' + RULES.LANGKAH_DADU_UNSUR + ' langkah (aturan 5).');
      this._startMove(this.dice.normal + RULES.LANGKAH_DADU_UNSUR);
    }
  }

  _startMove(steps) {
    const p = this.player;
    const from = p.pos;
    const to = (from + steps) % BOARD_SIZE;
    // aturan 3 - kembali lagi ke start
    if (from + steps >= BOARD_SIZE) this._score(p, RULES.BONUS_START, 'melewati/kembali ke START (aturan 3)');
    p.pos = to;
    this._say('jalan', p.name + ' berjalan ' + steps + ' langkah ke petak ' + (to + 1) + ' (' + BOARD[to] + ').');
    this.pending = { kind: 'moving', from: from, to: to, steps: steps };
  }

  /** Dipanggil UI setelah animasi bidak selesai. */
  ackMove() {
    if (!this._menunggu('moving')) return;
    this._resolveTile();
  }

  /* ------------------------------------------------------------ petak ---- */

  _resolveTile() {
    const p = this.player;
    const tile = BOARD[p.pos];

    if (tile === TILE.START) {
      this.pending = { kind: 'info', text: 'Kamu berhenti tepat di START.', next: 'end_turn' };
      return;
    }

    if (tile === TILE.SAFE) {
      this._score(p, RULES.BONUS_TITIK_AMAN, 'titik aman');
      this.pending = { kind: 'info', text: 'Titik aman: +' + RULES.BONUS_TITIK_AMAN + ' poin, tidak ada efek buruk.', next: 'end_turn' };
      return;
    }

    if (tile === TILE.SKIP) {
      const next = this.players[this._nextIndex(this.current)];
      next.skipNext = true;
      this._say('petak', p.name + ' menempati SKIP, jadi ' + next.name + ' tidak mendapat giliran (simbol 1).');
      this.pending = { kind: 'info', text: 'Petak SKIP! ' + next.name + ' kehilangan giliran berikutnya.', next: 'end_turn' };
      return;
    }

    if (tile === TILE.REVERSE) {
      this.direction *= -1;
      this._say('petak', 'Urutan giliran berbalik arah (simbol 5).');
      this.pending = { kind: 'info', text: 'Petak REVERSE! Urutan giliran sekarang berbalik arah.', next: 'end_turn' };
      return;
    }

    if (tile === TILE.X2) {
      p.x2 = true;
      this._say('petak', p.name + ' mendapat efek x2 untuk perolehan skor berikutnya (simbol 6).');
      this.pending = { kind: 'info', text: 'Petak x2! Perolehan skor berikutnya (+ atau -) akan dikali dua.', next: 'end_turn' };
      return;
    }

    if (tile === TILE.JAIL) {
      p.jail = true;
      p.jailProgress = 0;
      this._say('petak', p.name + ' masuk penjara (simbol 4).');
      this.pending = { kind: 'info', text: 'Petak TENGKORAK! Kamu masuk penjara. Giliran berikutnya: bayar 3 poin atau jawab 2 dadu unsur untuk keluar.', next: 'end_turn' };
      return;
    }

    if (tile === TILE.ANSWER) {
      const c = this._drawAnswer(p, false);
      this.pending = { kind: 'info', text: c
        ? 'Kamu mengambil kartu answer: "' + c.teks + '" (skor ' + c.skor + ').'
        : 'Tumpukan kartu answer sudah habis.', next: 'end_turn' };
      this._checkDecks();
      return;
    }

    if (tile === TILE.QUESTION) { this._drawQuestion(); return; }

    if (tile === TILE.SWAP) {
      const options = this.players
        .filter((o) => o.id !== p.id && !o.finished)
        .map((o) => ({ id: o.id, name: o.name, jumlahKartu: o.answers.length + o.questions.length }));
      this.pending = options.length
        ? { kind: 'swap_target', options: options }
        : { kind: 'info', text: 'Petak TUKAR KARTU, tetapi tidak ada pemain lain yang masih memegang kartu.', next: 'end_turn' };
      return;
    }

    if (tile === TILE.PLANE) {
      this.pending = { kind: 'plane_pay', bisaBayar: p.score >= RULES.BAYAR_PESAWAT };
      return;
    }

    if (tile === TILE.PLUS) {
      this.turn.tileDie = 1 + Math.floor(this.rng() * 6);
      this._say('petak', 'Petak PLUS - ' + p.name + ' melempar ulang dadu normal = ' + this.turn.tileDie + ' (simbol 9).');
      this._askElement('plus', 'Dadu normal menunjukkan ' + this.turn.tileDie + '. Jawab benar untuk bonus +' + RULES.BONUS_PLUS + '.');
      return;
    }

    if (tile === TILE.MINUS) {
      this.turn.tileDie = 1 + Math.floor(this.rng() * 6);
      this._say('petak', 'Petak MINUS - ' + p.name + ' melempar ulang dadu normal = ' + this.turn.tileDie + ' (simbol 10).');
      this._askElement('minus', 'Dadu normal menunjukkan ' + this.turn.tileDie + '. Jawab benar untuk meredam kerugian (+' + RULES.BONUS_MINUS + ').');
      return;
    }
  }

  /** aturan 7 - pemain mengambil kartu question. */
  _drawQuestion() {
    const p = this.player;
    if (this.qDeck.length === 0) {
      this.pending = { kind: 'info', text: 'Tumpukan kartu question sudah habis.', next: 'end_turn' };
      this._checkDecks();
      return;
    }
    const card = this.qDeck.pop();
    this._say('kartu', p.name + ' mengambil 1 kartu question.');

    // aturan 8 - kartu moderator berlaku sampai ada pemain yang mengambil kartu question
    if (this.moderatorQuestion) {
      this.discard.push(this.moderatorQuestion);
      this.moderatorQuestion = null;
      this._say('moderator', 'Kartu question moderator tidak berlaku lagi (aturan 8).');
    }

    // aturan 7 - kalau punya kartu answer yang tepat, dia harus menjawabnya sendiri
    const cocok = p.answers.find((a) => a.pairId === card.pairId);
    if (cocok) {
      p.answers = p.answers.filter((a) => a.uid !== cocok.uid);
      this._score(p, card.skor, 'menjawab sendiri kartu question dengan kartu answer miliknya (aturan 7 & 10.1)');
      this.discard.push(card, cocok);
      this.pending = { kind: 'info', text: 'Kartu question: "' + card.teks + '"\n\nKamu punya jawabannya: "' + cocok.teks + '" sehingga langsung +' + card.skor + ' poin (aturan 7).', next: 'end_turn' };
    } else {
      card.drawnOnTurn = this.turnCount;
      p.questions.push(card);
      this._say('moderator', 'Pertanyaan dibacakan ke seluruh pemain tanpa menyebutkan skornya (aturan 7): "' + card.teks + '"');
      this.pending = { kind: 'info', text: 'Kartu question: "' + card.teks + '"\n\nKamu tidak punya kartu answer yang cocok, jadi pertanyaan ini dibacakan untuk semua pemain. Kalau sampai giliranmu berikutnya belum ada yang menjawab, skornya (' + card.skor + ') jadi milikmu (aturan 11).', next: 'end_turn' };
    }
    this._checkDecks();
  }

  /** simbol 7 - tukar semua kartu dengan pemain lain. */
  swapWith(targetId) {
    if (!this._menunggu('swap_target')) return;
    const p = this.player;
    if (targetId !== null && targetId !== undefined) {
      const t = this.players[targetId];
      const a = p.answers; p.answers = t.answers; t.answers = a;
      const q = p.questions; p.questions = t.questions; t.questions = q;
      this._say('petak', p.name + ' menukar SELURUH kartunya dengan ' + t.name + ' (simbol 7).');
      this.pending = { kind: 'info', text: 'Semua kartumu ditukar dengan seluruh kartu ' + t.name + '.', next: 'end_turn' };
    } else {
      this._say('petak', p.name + ' memilih tidak menukar kartu.');
      this.pending = { kind: 'info', text: 'Kamu memilih tidak menukar kartu.', next: 'end_turn' };
    }
  }

  /** simbol 8 - cara membayar tiket pesawat. */
  planePay(metode) {
    if (!this._menunggu('plane_pay')) return;
    const p = this.player;
    if (metode === 'poin') {
      this._score(p, -RULES.BAYAR_PESAWAT, 'membayar tiket pesawat (simbol 8)', false);
      this.pending = { kind: 'plane_destination' };
    } else if (metode === 'dadu') {
      this.turn.planeProgress = 0;
      this._askElement('pesawat', 'Jawab 2 dadu unsur dengan benar untuk naik pesawat tanpa membayar.');
    } else {
      this.pending = { kind: 'info', text: 'Kamu tetap di petak pesawat.', next: 'end_turn' };
    }
  }

  planeFlyTo(index) {
    if (!this._menunggu('plane_destination')) return;
    const p = this.player;
    p.pos = ((index % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE;
    this._say('petak', p.name + ' terbang ke petak ' + (p.pos + 1) + ' (' + BOARD[p.pos] + ') (simbol 8).');
    this._resolveTile(); // efek petak tujuan tetap berlaku
  }

  /* ----------------------------------------------------------- penjara --- */

  _openJail() {
    const p = this.player;
    this.pending = { kind: 'jail', bisaBayar: p.score - RULES.BAYAR_PENJARA >= 0 };
  }

  jailChoice(pilihan) {
    if (!this._menunggu('jail')) return;
    const p = this.player;
    if (pilihan === 'bayar') {
      this._score(p, -RULES.BAYAR_PENJARA, 'membayar denda penjara (simbol 4)', false);
      p.jail = false;
      p.jailProgress = 0;
      this.pending = { kind: 'info', text: 'Kamu membayar 3 poin dan keluar dari penjara. Giliranmu selesai.', next: 'end_turn' };
    } else if (pilihan === 'dadu') {
      p.jailProgress = 0;
      this._askElement('penjara', 'Jawab 2 dadu unsur dengan benar untuk keluar dari penjara.');
    } else {
      this.pending = { kind: 'info', text: 'Kamu tetap di penjara. Giliranmu selesai.', next: 'end_turn' };
    }
  }

  /* ------------------------------------------------ akhir giliran & main - */

  /** Dipanggil UI untuk melanjutkan dari layar informasi. */
  ack() {
    if (!this._menunggu('info')) return;
    const next = this.pending.next;
    this.pending = null;
    if (next === 'end_turn') this._endTurn();
    else this._openTurnMenu();
  }

  _endTurn() {
    this._refreshFinished();
    if (this.gameOver) return;
    this._nextTurn();
  }

  _nextIndex(from) {
    const n = this.players.length;
    for (let step = 1; step <= n; step++) {
      const idx = (((from + this.direction * step) % n) + n) % n;
      if (!this.players[idx].finished) return idx;
    }
    return from;
  }

  _nextTurn() {
    this.current = this._nextIndex(this.current);
    this._beginTurn();
  }

  /** aturan 13 & 15 - pemain selesai kalau tidak memegang kartu apa pun lagi. */
  _refreshFinished() {
    for (const p of this.players) {
      if (!p.finished && p.answers.length === 0 && p.questions.length === 0) {
        p.finished = true;
        this._say('sistem', p.name + ' sudah tidak memegang kartu apa pun, jadi selesai bermain (aturan 13 & 15).');
      }
    }
    if (this.activePlayers().length <= 1) {
      this._endGame('Tersisa satu pemain yang masih memegang kartu (aturan 16).');
    }
  }

  _checkDecks() {
    if (this.qDeck.length === 0 || this.aDeck.length === 0) {
      this._endGame('Kartu question atau answer sudah habis (aturan 16).');
    }
  }

  _endGame(alasan) {
    if (this.gameOver) return;
    this.gameOver = true;
    this._say('sistem', 'Permainan berakhir. ' + alasan);

    // aturan 14 - setiap kartu answer yang tersisa mengurangi poin -3
    for (const p of this.players) {
      if (p.answers.length > 0) {
        const potong = p.answers.length * RULES.PENALTI_SISA_ANSWER;
        p.score -= potong;
        this._say('skor', p.name + ' menyisakan ' + p.answers.length + ' kartu answer sehingga -' + potong + ' poin (aturan 14). Total akhir: ' + p.score + '.');
      }
    }

    // aturan 16 - pemenang ditentukan dari skor, bukan urutan selesai
    const peringkat = this.players.slice().sort((a, b) => b.score - a.score);
    const tertinggi = peringkat[0].score;
    const juara = peringkat.filter((p) => p.score === tertinggi);
    this.result = { peringkat: peringkat, juara: juara, alasan: alasan };
    this._say('sistem', juara.length > 1
      ? 'Seri! ' + juara.map((p) => p.name).join(' & ') + ' sama-sama mengumpulkan ' + tertinggi + ' poin.'
      : 'Pemenang: ' + juara[0].name + ' dengan ' + tertinggi + ' poin (aturan 16).');
    this.pending = { kind: 'game_over' };
  }
}
