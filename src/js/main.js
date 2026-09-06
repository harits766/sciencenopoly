/**
 * Pengendali antarmuka: menyambungkan mesin aturan (engine.js) dengan layar.
 * Alurnya sederhana — setiap kali state berubah, `render()` dipanggil dan
 * `game.pending` menentukan tombol apa yang muncul.
 */

import { Game, PLAYER_COLORS, RULES } from './engine.js';
import { BOARD, BOARD_SIZE, TILE, TILE_INFO } from './data/board.js';
import {
  el, esc, renderBoard, renderBoardPreview, renderScoreboard, renderModerator,
  renderLog, periodicTableHTML, rulesHTML,
} from './ui.js';

const $ = (sel) => document.querySelector(sel);

const layarSetup = $('#screen-setup');
const layarGame = $('#screen-game');
const papan = $('#board');
const kotakSkor = $('#scoreboard');
const kotakModerator = $('#moderator');
const kotakLog = $('#log');
const kotakAksi = $('#action');
const labelGiliran = $('#turn-label');
const overlay = $('#overlay');
const overlayBox = $('#overlay-box');

let game = null;
let jumlahPemain = 4;
let animasi = null;        // {playerId, pos} selama bidak berjalan
let sedangAnimasi = false;

const tidur = (ms) => new Promise((r) => setTimeout(r, ms));

/* ======================================================== layar setup ==== */

function buildNameInputs() {
  const wrap = $('#name-inputs');
  const lama = [...wrap.querySelectorAll('input')].map((i) => i.value);
  wrap.textContent = '';
  const contoh = ['Harits', 'Abdan', 'Sari', 'Rian'];
  for (let i = 0; i < jumlahPemain; i++) {
    wrap.append(el('div', { class: 'name-row' },
      el('span', { class: 'dot', style: 'background:' + PLAYER_COLORS[i] }),
      el('input', {
        type: 'text', maxlength: '16', value: lama[i] || '',
        placeholder: 'Pemain ' + (i + 1) + ' (mis. ' + contoh[i] + ')',
        'aria-label': 'Nama pemain ' + (i + 1),
      })));
  }
}

$('#player-count').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-n]');
  if (!btn) return;
  jumlahPemain = Number(btn.dataset.n);
  for (const b of $('#player-count').children) b.classList.toggle('on', b === btn);
  buildNameInputs();
});

$('#btn-start').addEventListener('click', () => {
  const nama = [...$('#name-inputs').querySelectorAll('input')]
    .map((i, idx) => i.value.trim() || 'Pemain ' + (idx + 1));
  game = new Game(nama);
  animasi = null;
  layarSetup.classList.add('hidden');
  layarGame.classList.remove('hidden');
  render();
});

$('#btn-quit').addEventListener('click', () => {
  if (!confirm('Keluar dari permainan yang sedang berjalan?')) return;
  game = null;
  tutupOverlay();
  layarGame.classList.add('hidden');
  layarSetup.classList.remove('hidden');
});

for (const btn of document.querySelectorAll('[data-panel]')) {
  btn.addEventListener('click', () => {
    const html = btn.dataset.panel === 'rules' ? rulesHTML() : periodicTableHTML();
    bukaOverlay(html + '<div class="overlay-actions"><button type="button" class="btn" data-close>Tutup</button></div>');
  });
}

/* ========================================================== overlay ====== */

function bukaOverlay(html, opsi) {
  overlayBox.innerHTML = html;
  overlay.classList.remove('hidden');
  overlayBox.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', tutupOverlay));
  if (opsi && opsi.after) opsi.after(overlayBox);
}

function tutupOverlay() { overlay.classList.add('hidden'); overlayBox.textContent = ''; }

/* =========================================================== render ====== */

function render() {
  if (!game) return;
  renderBoard(papan, game, animasi);
  renderScoreboard(kotakSkor, game);
  renderModerator(kotakModerator, game);
  renderLog(kotakLog, game);

  labelGiliran.textContent = game.gameOver
    ? 'Permainan selesai'
    : 'Giliran ke-' + game.turnCount + ' · ' + game.player.name +
      (game.direction === -1 ? ' · arah giliran terbalik' : '');

  if (!sedangAnimasi) renderPending();
}

/** Panel tindakan di bawah layar. */
function aksi(nama, pesan, tombol) {
  kotakAksi.textContent = '';
  const head = el('div', { class: 'action-head' });
  if (nama) head.append(el('span', { class: 'action-who' }, nama));
  if (pesan) head.append(el('span', { class: 'action-msg' }, pesan));
  kotakAksi.append(el('div', { class: 'action-inner' },
    head,
    el('div', { class: 'action-buttons' }, tombol || []),
  ));
}

function tombol(teks, kelas, onClick, mati) {
  return el('button', { type: 'button', class: 'btn ' + (kelas || ''), disabled: mati || null, onclick: onClick }, teks);
}

/* ------------------------------------------------------ tangan pemain --- */

function kartuTanganHTML(p) {
  if (!p.answers.length && !p.questions.length) return '<p class="mod-empty">Tidak ada kartu di tangan.</p>';
  const a = p.answers.map((c) =>
    `<div class="mod-card"><span class="tag" style="background:var(--krem)">Answer · skor ${c.skor}</span><div>${esc(c.teks)}</div></div>`).join('');
  const q = p.questions.map((c) =>
    `<div class="mod-card"><span class="tag">Question milikmu · skor ${c.skor}</span><div>${esc(c.teks)}</div></div>`).join('');
  return a + q;
}

/* ========================================================== pending ====== */

function renderPending() {
  const p = game.pending;
  if (!p) { aksi('', 'Menunggu…', []); return; }

  switch (p.kind) {
    case 'handoff': return pendingHandoff();
    case 'turn_menu': return pendingTurnMenu();
    case 'element_question': return pendingElement(p);
    case 'element_choice': return pendingElementChoice();
    case 'moving': return void jalankanAnimasi(p);
    case 'info': return pendingInfo(p);
    case 'jail': return pendingJail(p);
    case 'swap_target': return pendingSwap(p);
    case 'plane_pay': return pendingPlanePay(p);
    case 'plane_destination': return pendingPlaneDestination();
    case 'game_over': return pendingGameOver();
  }
}

/* --------------------------------------------------------- serah terima - */

function pendingHandoff() {
  const p = game.player;
  aksi(p.name, 'Serahkan perangkat ke ' + p.name + '.', [
    tombol('Saya ' + p.name + ', siap', 'primary', () => { tutupOverlay(); game.ackHandoff(); render(); }),
  ]);
  bukaOverlay(`
    <div class="handoff">
      <div class="big-dot" style="background:${p.color}"></div>
      <h2>Giliran ${esc(p.name)}</h2>
      <p class="sub">Serahkan perangkat ke ${esc(p.name)}, lalu tekan tombol di bawah.
      Kartu pemain lain tidak akan terlihat.</p>
      <div class="overlay-actions">
        <button type="button" class="btn primary big" id="ho-ok">Saya ${esc(p.name)}, siap</button>
      </div>
    </div>`, {
    after: (box) => box.querySelector('#ho-ok').addEventListener('click', () => {
      tutupOverlay(); game.ackHandoff(); render();
    }),
  });
}

/* -------------------------------------------------------- menu giliran -- */

function pendingTurnMenu() {
  const p = game.player;
  const bisa = game.claimableFor(p);
  const btns = [];

  if (p.jail) {
    btns.push(tombol('Urus penjara', 'warn', () => { game.rollDice(); render(); }));
  } else {
    btns.push(tombol('Lempar dadu', 'primary', () => kocokDadu()));
  }

  btns.push(tombol(
    'Jawab pertanyaan (' + bisa.length + ')',
    'info',
    () => bukaKlaim(),
    !(p.answers.length && bisa.length),
  ));
  btns.push(tombol('Lihat kartuku (' + (p.answers.length + p.questions.length) + ')', 'ghost', () => {
    bukaOverlay('<h2>Kartu ' + esc(p.name) + '</h2><p class="sub">Hanya kamu yang boleh melihat layar ini.</p>' +
      '<div class="moderator">' + kartuTanganHTML(p) + '</div>' +
      '<div class="overlay-actions"><button type="button" class="btn" data-close>Tutup</button></div>');
  }));

  const pesan = p.jail
    ? 'Kamu sedang di penjara. Bayar 3 poin atau jawab 2 dadu unsur untuk keluar.'
    : 'Lempar dadu untuk berjalan, atau jawab pertanyaan yang sedang beredar lebih dulu.';
  aksi(p.name, pesan, btns);
}

async function kocokDadu() {
  sedangAnimasi = true;
  const dn = $('#die-normal');
  const de = $('#die-element');
  if (dn) dn.classList.add('rolling');
  if (de) de.classList.add('rolling');
  await tidur(480);
  sedangAnimasi = false;
  game.rollDice();
  render();
}

/* ------------------------------------------------------------- klaim ---- */

function bukaKlaim() {
  const p = game.player;
  const bisa = game.claimableFor(p);
  let refTerpilih = null;
  let uidTerpilih = null;

  const daftarQ = bisa.map((c) => `
    <button type="button" class="choice" data-ref="${esc(c.ref)}">
      <span class="t">${esc(c.card.teks)}</span>
      <span class="m">Dari ${esc(c.sumber)} · bernilai +${c.nilai} poin${c.skorTerbuka ? ' (aturan 12)' : ''}</span>
    </button>`).join('');

  const daftarA = p.answers.map((a) => `
    <button type="button" class="choice" data-uid="${esc(a.uid)}">
      <span class="t">${esc(a.teks)}</span>
      <span class="m">Kartu answer · skor ${a.skor}</span>
    </button>`).join('');

  bukaOverlay(`
    <h2>Jawab pertanyaan</h2>
    <p class="sub">Pilih pertanyaan lalu kartu answer yang menurutmu cocok. Moderator akan mencocokkan
    keduanya (aturan 9). Benar mendapat skor kartu, salah dikurangi ${RULES.PENALTI_SALAH} poin (aturan 10).</p>
    <h3 style="font-size:13px;margin-bottom:6px">1. Pertanyaan yang beredar</h3>
    <div class="choices" id="pilih-q">${daftarQ}</div>
    <h3 style="font-size:13px;margin-bottom:6px">2. Kartu answer milikmu</h3>
    <div class="choices" id="pilih-a">${daftarA}</div>
    <div class="overlay-actions">
      <button type="button" class="btn ghost" data-close>Batal</button>
      <button type="button" class="btn primary" id="kirim" disabled>Serahkan ke moderator</button>
    </div>`, {
    after: (box) => {
      const kirim = box.querySelector('#kirim');
      const pilih = (wrap, attr, set) => {
        wrap.addEventListener('click', (e) => {
          const b = e.target.closest('.choice');
          if (!b) return;
          wrap.querySelectorAll('.choice').forEach((x) => x.classList.remove('sel'));
          b.classList.add('sel');
          set(b.dataset[attr]);
          kirim.disabled = !(refTerpilih && uidTerpilih);
        });
      };
      pilih(box.querySelector('#pilih-q'), 'ref', (v) => { refTerpilih = v; });
      pilih(box.querySelector('#pilih-a'), 'uid', (v) => { uidTerpilih = v; });
      kirim.addEventListener('click', () => {
        tutupOverlay();
        game.claim(refTerpilih, uidTerpilih);
        render();
      });
    },
  });
}

/* ------------------------------------------------------ pertanyaan unsur */

function pendingElement(p) {
  const el2 = p.element;
  aksi(game.player.name, p.catatan || 'Sebutkan nomor atom unsur pada dadu unsur.', []);
  bukaOverlay(`
    <h2>Dadu unsur</h2>
    <p class="sub">${esc(p.catatan || 'Berapa nomor atom unsur ini? Jawaban benar memberi hadiah, jawaban salah tidak mengurangi poin (aturan 5).')}</p>
    <div class="element-face">
      <div>
        <div class="sym">${esc(el2.sym)}</div>
        <div class="cap">nomor atom?</div>
      </div>
    </div>
    <div class="answer-input">
      <input id="jwb" type="text" inputmode="numeric" autocomplete="off" maxlength="3" placeholder="?">
    </div>
    <div class="keypad">
      ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((n) => `<button type="button" data-k="${n}">${n}</button>`).join('')}
    </div>
    <div class="overlay-actions">
      <button type="button" class="btn ghost" id="hapus">Hapus</button>
      <button type="button" class="btn warn" id="lewat">Tidak tahu</button>
      <button type="button" class="btn primary" id="jawab">Jawab</button>
    </div>`, {
    after: (box) => {
      const input = box.querySelector('#jwb');
      input.focus();
      box.querySelectorAll('[data-k]').forEach((b) => b.addEventListener('click', () => {
        if (input.value.length < 3) input.value += b.dataset.k;
      }));
      box.querySelector('#hapus').addEventListener('click', () => { input.value = ''; input.focus(); });
      const kirim = (nilai) => { tutupOverlay(); game.answerElement(nilai); render(); };
      box.querySelector('#jawab').addEventListener('click', () => kirim(input.value === '' ? null : Number(input.value)));
      box.querySelector('#lewat').addEventListener('click', () => kirim(null));
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') kirim(input.value === '' ? null : Number(input.value));
      });
    },
  });
}

function pendingElementChoice() {
  aksi(game.player.name, 'Jawabanmu benar! Pilih hadiahnya (aturan 5).', [
    tombol('+' + RULES.BONUS_DADU_UNSUR + ' poin', 'primary', () => { game.chooseElementReward('poin'); render(); }),
    tombol('+' + RULES.LANGKAH_DADU_UNSUR + ' langkah', 'info', () => { game.chooseElementReward('langkah'); render(); }),
  ]);
}

/* ------------------------------------------------------------ animasi --- */

async function jalankanAnimasi(p) {
  if (sedangAnimasi) return;
  sedangAnimasi = true;
  const id = game.player.id;
  aksi(game.player.name, 'Berjalan ' + p.steps + ' langkah…', []);
  for (let i = 1; i <= p.steps; i++) {
    animasi = { playerId: id, pos: (p.from + i) % BOARD_SIZE };
    renderBoard(papan, game, animasi);
    await tidur(150);
  }
  animasi = null;
  sedangAnimasi = false;
  game.ackMove();
  render();
}

/* --------------------------------------------------------------- info --- */

function pendingInfo(p) {
  const petak = TILE_INFO[BOARD[game.player.pos]];
  aksi(game.player.name + ' · ' + petak.icon + ' ' + petak.label, p.text, [
    tombol('Lanjut', 'primary', () => { game.ack(); render(); }),
  ]);
}

/* ------------------------------------------------------------ penjara --- */

function pendingJail(p) {
  aksi(game.player.name + ' · 💀 Penjara', 'Pilih cara keluar dari penjara (simbol 4).', [
    tombol('Bayar ' + RULES.BAYAR_PENJARA + ' poin', 'warn', () => { game.jailChoice('bayar'); render(); }, !p.bisaBayar),
    tombol('Jawab 2 dadu unsur', 'info', () => { game.jailChoice('dadu'); render(); }),
    tombol('Tetap di penjara', 'ghost', () => { game.jailChoice('tetap'); render(); }),
  ]);
}

/* -------------------------------------------------------- tukar kartu --- */

function pendingSwap(p) {
  aksi(game.player.name + ' · 🔄 Tukar kartu', 'Kamu boleh menukar SELURUH kartumu dengan seluruh kartu satu pemain lain (simbol 7).',
    p.options.map((o) => tombol(
      'Tukar dengan ' + o.name + ' (' + o.jumlahKartu + ' kartu)', 'info',
      () => { game.swapWith(o.id); render(); },
    )).concat([
      tombol('Tidak menukar', 'ghost', () => { game.swapWith(null); render(); }),
    ]));
}

/* ------------------------------------------------------------ pesawat --- */

function pendingPlanePay(p) {
  aksi(game.player.name + ' · ✈️ Pesawat', 'Bebas pindah ke petak mana saja, asal membayar ' + RULES.BAYAR_PESAWAT +
    ' poin atau menjawab 2 dadu unsur dengan benar (simbol 8).', [
    tombol('Bayar ' + RULES.BAYAR_PESAWAT + ' poin', 'warn', () => { game.planePay('poin'); render(); }, !p.bisaBayar),
    tombol('Jawab 2 dadu unsur', 'info', () => { game.planePay('dadu'); render(); }),
    tombol('Tidak jadi terbang', 'ghost', () => { game.planePay('tidak'); render(); }),
  ]);
}

function pendingPlaneDestination() {
  const sekarang = game.player.pos;
  const sel = [];
  for (let i = 0; i < BOARD_SIZE; i++) {
    if (i === sekarang) continue;
    const info = TILE_INFO[BOARD[i]];
    sel.push(`<button type="button" data-i="${i}"><span class="g">${info.icon}</span>${i + 1}. ${esc(info.label)}</button>`);
  }
  aksi(game.player.name + ' · ✈️ Pesawat', 'Pilih petak tujuan.', []);
  bukaOverlay(`
    <h2>Mau terbang ke mana?</h2>
    <p class="sub">Efek petak tujuan tetap berlaku setelah kamu mendarat.</p>
    <div class="grid-dest">${sel.join('')}</div>`, {
    after: (box) => box.querySelectorAll('[data-i]').forEach((b) => b.addEventListener('click', () => {
      tutupOverlay();
      game.planeFlyTo(Number(b.dataset.i));
      render();
    })),
  });
}

/* -------------------------------------------------------------- hasil --- */

function pendingGameOver() {
  const r = game.result;
  const medali = ['🥇', '🥈', '🥉', '4.'];
  const baris = r.peringkat.map((p, i) => `
    <li class="${r.juara.includes(p) ? 'champ' : ''}">
      <span class="pos">${medali[i] || (i + 1) + '.'}</span>
      <span class="sb-dot" style="background:${p.color}"></span>
      <span><b>${esc(p.name)}</b><br><span class="sb-meta">${p.answers.length} kartu answer tersisa</span></span>
      <span class="pts">${p.score}</span>
    </li>`).join('');

  aksi('Permainan selesai', r.alasan, [
    tombol('Main lagi', 'primary', () => { $('#btn-start').click(); }),
    tombol('Kembali ke menu', 'ghost', () => {
      game = null; tutupOverlay();
      layarGame.classList.add('hidden');
      layarSetup.classList.remove('hidden');
    }),
  ]);

  bukaOverlay(`
    <h2>Hasil akhir</h2>
    <p class="sub">${esc(r.alasan)} Pemenang ditentukan dari skor, bukan urutan selesai (aturan 16).</p>
    <ul class="rank">${baris}</ul>
    <div class="overlay-actions">
      <button type="button" class="btn ghost" data-close>Lihat papan</button>
      <button type="button" class="btn primary" id="ulang">Main lagi</button>
    </div>`, {
    after: (box) => box.querySelector('#ulang').addEventListener('click', () => {
      tutupOverlay(); $('#btn-start').click();
    }),
  });
}

/* ---------------------------------------------------------------- init -- */

buildNameInputs();
renderBoardPreview($('#board-preview'));
