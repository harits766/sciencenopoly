/**
 * Semua fungsi penggambar tampilan. Tidak menyimpan state permainan sendiri —
 * selalu menggambar ulang dari objek Game yang diberikan.
 */

import { BOARD, BOARD_SIZE, TILE_INFO, gridPos } from './data/board.js';
import { ELEMENTS } from './data/elements.js';
import { RULES } from './engine.js';

export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/** Membuat elemen DOM ringkas: el('div', {class:'x'}, 'isi'). */
export function el(tag, attrs, ...kids) {
  const node = document.createElement(tag);
  for (const k in (attrs || {})) {
    if (k === 'class') node.className = attrs[k];
    else if (k === 'html') node.innerHTML = attrs[k];
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), attrs[k]);
    else if (attrs[k] !== null && attrs[k] !== undefined && attrs[k] !== false) node.setAttribute(k, attrs[k]);
  }
  for (const kid of kids.flat()) {
    if (kid === null || kid === undefined || kid === false) continue;
    node.append(kid.nodeType ? kid : document.createTextNode(kid));
  }
  return node;
}

/* -------------------------------------------------------------- papan --- */

/**
 * @param override {null|{playerId:number, pos:number}} posisi bidak sementara
 *        selama animasi jalan, supaya state permainan tidak perlu diutak-atik.
 */
export function renderBoard(root, game, override) {
  root.textContent = '';
  const posisi = (p) => (override && override.playerId === p.id ? override.pos : p.pos);

  for (let i = 0; i < BOARD_SIZE; i++) {
    const jenis = BOARD[i];
    const info = TILE_INFO[jenis];
    const { row, col } = gridPos(i);
    const sudut = i === 0 || i === 7 || i === 14 || i === 21;

    const tile = el('div', {
      class: 'tile t-' + info.cls + (sudut ? ' corner' : ''),
      style: `grid-row:${row};grid-column:${col}`,
      title: info.label + ' — ' + info.desc,
      'data-tile': i,
    },
      el('span', { class: 'num' }, String(i + 1)),
      el('span', { class: 'glyph' }, info.icon),
      el('span', { class: 'name' }, info.label),
    );

    const disini = game.players.filter((p) => posisi(p) === i);
    if (disini.length) {
      tile.append(el('div', { class: 'tokens' }, disini.map((p) => el('span', {
        class: 'token' + (p.id === game.current && !game.gameOver ? ' now' : ''),
        style: 'background:' + p.color,
        title: p.name + (p.jail ? ' (di penjara)' : ''),
      }))));
    }
    root.append(tile);
  }

  root.append(renderCenter(game));
}

function renderCenter(game) {
  const d = game.dice;
  const wrap = el('div', { class: 'board-center' });

  wrap.append(el('div', { class: 'center-atom' },
    el('span', { class: 'orbit o1' }), el('span', { class: 'orbit o2' }),
    el('span', { class: 'orbit o3' }), el('span', { class: 'nucleus' })));

  wrap.append(el('div', { class: 'dice-tray' },
    el('div', { class: 'die', id: 'die-normal' }, d.normal ? String(d.normal) : '?'),
    el('div', { class: 'die element', id: 'die-element' }, d.element ? d.element.sym : '?'),
  ));
  wrap.append(el('div', { class: 'dice-caption' },
    'Dadu normal · dadu unsur ' + (d.elementDiceIndex + 1) + '/3'));

  wrap.append(el('div', { class: 'decks' },
    el('div', { class: 'deck q' }, 'QUESTION', el('small', {}, game.qDeck.length + ' kartu')),
    el('div', { class: 'deck a' }, 'ANSWER', el('small', {}, game.aDeck.length + ' kartu')),
  ));
  return wrap;
}

/** Papan statis tanpa bidak untuk layar awal — supaya pengunjung langsung
 *  melihat permainannya, bukan formulir kosong. */
export function renderBoardPreview(root) {
  root.textContent = '';
  for (let i = 0; i < BOARD_SIZE; i++) {
    const info = TILE_INFO[BOARD[i]];
    const { row, col } = gridPos(i);
    root.append(el('div', {
      class: 'tile t-' + info.cls + ([0, 7, 14, 21].includes(i) ? ' corner' : ''),
      style: `grid-row:${row};grid-column:${col}`,
      title: info.label + ' — ' + info.desc,
    },
      el('span', { class: 'glyph' }, info.icon),
      el('span', { class: 'name' }, info.label),
    ));
  }
  root.append(el('div', { class: 'board-center' },
    el('div', { class: 'center-atom' },
      el('span', { class: 'orbit o1' }), el('span', { class: 'orbit o2' }),
      el('span', { class: 'orbit o3' }), el('span', { class: 'nucleus' })),
    el('div', { class: 'decks' },
      el('div', { class: 'deck q' }, 'QUESTION', el('small', {}, '20 kartu')),
      el('div', { class: 'deck a' }, 'ANSWER', el('small', {}, '20 kartu')))));
}

/* ---------------------------------------------------------- papan skor -- */

export function renderScoreboard(root, game) {
  root.textContent = '';
  for (const p of game.players) {
    const status = [];
    status.push(p.answers.length + ' answer');
    if (p.questions.length) status.push(p.questions.length + ' question');
    if (p.jail) status.push('di penjara');
    if (p.x2) status.push('×2 siap');
    if (p.skipNext) status.push('kena skip');
    if (p.finished) status.push('selesai');

    root.append(el('li', {
      class: (p.id === game.current && !game.gameOver ? 'now ' : '') + (p.finished ? 'done' : ''),
    },
      el('span', { class: 'sb-dot', style: 'background:' + p.color }),
      el('span', {},
        el('span', { class: 'sb-name' }, p.name), el('br'),
        el('span', { class: 'sb-meta' }, status.join(' · '))),
      el('span', { class: 'sb-score' }, String(p.score)),
    ));
  }
}

/* ------------------------------------------------------ meja moderator -- */

export function renderModerator(root, game) {
  root.textContent = '';
  const potong = (t) => (t.length > 130 ? t.slice(0, 130) + '…' : t);

  if (game.moderatorQuestion) {
    root.append(el('div', { class: 'mod-card' },
      el('span', { class: 'tag' }, 'Dibacakan moderator'),
      el('div', {}, potong(game.moderatorQuestion.teks)),
      el('div', { class: 'sb-meta' }, 'Skor dirahasiakan (aturan 8).')));
  }

  for (const p of game.players) {
    for (const q of p.questions) {
      root.append(el('div', { class: 'mod-card' },
        el('span', { class: 'tag', style: 'background:' + p.color }, 'Kartu ' + p.name),
        el('div', {}, potong(q.teks)),
        el('div', { class: 'sb-meta' }, 'Berlaku sampai giliran ' + p.name + ' kembali (aturan 11).')));
    }
  }

  for (const q of game.openQuestions) {
    root.append(el('div', { class: 'mod-card open' },
      el('span', { class: 'tag' }, 'Terbuka · +' + RULES.BONUS_KARTU_TERBUKA),
      el('div', {}, potong(q.teks)),
      el('div', { class: 'sb-meta' }, 'Skor kartu ' + q.skor + ' sudah terbuka, jadi hanya bernilai +' + RULES.BONUS_KARTU_TERBUKA + ' (aturan 12).')));
  }

  if (!root.children.length) {
    root.append(el('div', { class: 'mod-empty' }, 'Belum ada pertanyaan yang beredar.'));
  }
}

/* -------------------------------------------------------------- catatan - */

export function renderLog(root, game) {
  root.textContent = '';
  for (const baris of game.log.slice(-120)) {
    root.append(el('p', { class: baris.type }, baris.text));
  }
  root.scrollTop = root.scrollHeight;
}

/* ----------------------------------------------------- tabel periodik --- */

const KOLOM = { IA: 1, IIA: 2, IIIA: 13, IVA: 14, VA: 15, VIA: 16, VIIA: 17, VIIIA: 18 };
const KELAS = { IA: 'g1', IIA: 'g2', VIIIA: 'g8' };

export function periodicTableHTML() {
  const sel = ELEMENTS.map((e) => {
    const kelas = KELAS[e.golongan] || 'gp';
    return `<div class="el ${kelas}" style="grid-column:${KOLOM[e.golongan]};grid-row:${e.periode}"
      title="${esc(e.name)} — golongan ${e.golongan}, periode ${e.periode}, konfigurasi ${e.konfigurasi}">
      <i>${e.z}</i><b>${e.sym}</b><i>${esc(e.name)}</i></div>`;
  }).join('');

  return `
    <h2>Tabel Periodik Unsur (nomor atom 1–20)</h2>
    <p class="sub">Cakupan materi kelas 10 IPA sekaligus isi ketiga dadu unsur.</p>
    <div class="pt">${sel}</div>
    <div class="pt-legend">
      <div><b>Golongan</b> = lajur tegak, unsur di dalamnya punya elektron valensi sama sehingga sifat kimianya mirip.</div>
      <div><b>Periode</b> = lajur mendatar, menyatakan banyaknya kulit atom.</div>
      <div>Dalam satu golongan ke bawah jari-jari atom membesar; dalam satu periode ke kanan jari-jari atom mengecil.</div>
    </div>`;
}

/* ------------------------------------------------------------- aturan --- */

export function rulesHTML() {
  const simbol = Object.keys(TILE_INFO)
    .filter((k) => k !== 'START')
    .map((k) => {
      const t = TILE_INFO[k];
      return `<li><span class="s t-${t.cls}">${t.icon}</span><span><b>${esc(t.label)}</b> — ${esc(t.desc)}</span></li>`;
    }).join('');

  return `
    <h2>Cara Bermain Sciencenopoly</h2>
    <p class="sub">Aturan disalin dari dokumen penelitian; peran moderator dijalankan komputer.</p>
    <div class="rules">
      <h3>Aturan permainan</h3>
      <ol>
        <li>Dimainkan 2 sampai 4 pemain. Moderator dipegang komputer sehingga semua orang ikut bermain.</li>
        <li>Sebelum mulai, setiap pemain diberi ${RULES.KARTU_AWAL} kartu answer.</li>
        <li>Melewati atau kembali ke START memberi +${RULES.BONUS_START} poin.</li>
        <li>Ada 4 dadu: 1 dadu normal dan 3 dadu unsur.</li>
        <li>Setiap giliran, pemain melempar 1 dadu normal bersama 1 dadu unsur. Kalau bisa menyebutkan nomor atom pada dadu unsur, pemain memilih +${RULES.BONUS_DADU_UNSUR} poin atau +${RULES.LANGKAH_DADU_UNSUR} langkah. Kalau salah atau tidak menjawab, tidak dapat apa-apa dan tidak ada pengurangan poin.</li>
        <li>Setiap pergantian giliran, dadu unsur yang dipakai juga berganti.</li>
        <li>Pemain yang mendapat kartu question harus menjawabnya dengan kartu answer miliknya. Kalau tidak punya yang cocok, pertanyaannya dibacakan ke semua pemain tanpa menyebutkan skor di bawahnya.</li>
        <li>Kalau tidak ada pemain yang memegang kartu question, moderator mengambil 1 kartu question dan membacakannya tanpa skor. Kartu moderator berlaku sampai ada pemain yang mengambil kartu question.</li>
        <li>Pemain yang merasa punya kartu answer yang tepat menyerahkan kartunya ke moderator bersama kartu question-nya. Moderator mencocokkan skor di bawah kedua kartu: sama berarti benar, beda berarti salah.</li>
        <li>Jawaban benar mendapat skor sesuai yang tertulis di kartu; jawaban salah dikurangi ${RULES.PENALTI_SALAH} poin.</li>
        <li>Pertanyaan seorang pemain berlaku sampai giliran kembali kepadanya. Kalau belum ada yang bisa menjawab, skor pertanyaan itu menjadi miliknya dan kartunya diserahkan ke moderator dengan skor terbuka.</li>
        <li>Menjawab kartu yang sudah dibuka moderator hanya bernilai +${RULES.BONUS_KARTU_TERBUKA} poin.</li>
        <li>Pemain yang sudah tidak memegang kartu apa pun selesai bermain, tetapi permainan belum berakhir.</li>
        <li>Saat permainan berakhir, setiap kartu answer yang masih dipegang mengurangi ${RULES.PENALTI_SISA_ANSWER} poin.</li>
        <li>Pemain yang kartu answer-nya habis tetapi masih punya kartu question harus menunggu sampai pertanyaannya tidak berlaku lagi atau terjawab pemain lain.</li>
        <li>Pemenang ditentukan dari skor yang dikumpulkan sampai tersisa satu pemain atau kartu question/answer habis, bukan dari urutan selesai.</li>
      </ol>

      <h3>Arti simbol di papan</h3>
      <ul class="sym-list">${simbol}</ul>
    </div>`;
}
