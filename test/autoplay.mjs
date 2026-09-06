/**
 * Pemain otomatis: menjalankan sebuah Game sampai selesai dengan menjawab
 * setiap `pending` yang muncul. Dipakai oleh tes untuk memastikan mesin aturan
 * tidak pernah macet dan tidak pernah menghasilkan state yang tidak valid.
 */

import { BOARD, BOARD_SIZE, TILE } from '../src/js/data/board.js';

/**
 * @param {import('../src/js/engine.js').Game} g
 * @param {object} opts
 *   pintar  : true  = selalu menjawab dadu unsur & klaim kartu dengan benar
 *             false = menjawab asal (menguji jalur "salah")
 *   maxStep : batas pengaman supaya tes tidak menggantung
 *   onState : callback pemeriksa invarian setiap langkah
 */
export function autoplay(g, opts = {}) {
  const { pintar = true, maxStep = 20000, onState = null } = opts;
  const rng = opts.rng || Math.random;
  let steps = 0;

  while (!g.gameOver && steps < maxStep) {
    steps++;
    if (onState) onState(g);
    const p = g.pending;
    if (!p) throw new Error('pending kosong padahal permainan belum selesai (langkah ' + steps + ')');

    switch (p.kind) {
      case 'handoff':
        g.ackHandoff();
        break;

      case 'turn_menu': {
        const me = g.player;
        const bisa = g.claimableFor(me);
        // cari klaim yang benar-benar cocok
        let dilakukan = false;
        for (const t of bisa) {
          const cocok = me.answers.find((a) => a.pairId === t.card.pairId);
          if (cocok) { g.claim(t.ref, cocok.uid); dilakukan = true; break; }
        }
        if (dilakukan) break;
        // sesekali klaim ngawur untuk menguji jalur jawaban salah
        if (!pintar && bisa.length && me.answers.length && rng() < 0.25) {
          g.claim(bisa[0].ref, me.answers[0].uid);
          break;
        }
        g.rollDice();
        break;
      }

      case 'element_question':
        g.answerElement(pintar || rng() < 0.6 ? p.element.z : 99);
        break;

      case 'element_choice':
        g.chooseElementReward(rng() < 0.5 ? 'poin' : 'langkah');
        break;

      case 'moving':
        g.ackMove();
        break;

      case 'info':
        g.ack();
        break;

      case 'jail':
        g.jailChoice(p.bisaBayar && rng() < 0.5 ? 'bayar' : 'dadu');
        break;

      case 'swap_target':
        g.swapWith(rng() < 0.5 ? p.options[0].id : null);
        break;

      case 'plane_pay':
        g.planePay(p.bisaBayar && rng() < 0.5 ? 'poin' : 'dadu');
        break;

      case 'plane_destination': {
        // pilih petak mana saja kecuali petak pesawat itu sendiri
        let tujuan = Math.floor(rng() * BOARD_SIZE);
        if (BOARD[tujuan] === TILE.PLANE) tujuan = (tujuan + 1) % BOARD_SIZE;
        g.planeFlyTo(tujuan);
        break;
      }

      case 'game_over':
        return steps;

      default:
        throw new Error('pending tidak dikenal: ' + p.kind);
    }
  }

  if (!g.gameOver) throw new Error('permainan tidak selesai dalam ' + maxStep + ' langkah');
  return steps;
}
