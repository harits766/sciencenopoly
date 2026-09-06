/**
 * Papan Sciencenopoly — 28 petak, disalin persis dari foto papan asli
 * (Gambar 2 pada dokumen penelitian).
 *
 * Indeks 0 ada di sudut kiri-atas (START) dan bertambah searah jarum jam:
 *   0        : START (sudut hijau, kiri-atas)
 *   1  – 6   : baris atas    →  − + − + − +
 *   7        : ×2 (sudut kanan-atas)
 *   8  – 13  : kolom kanan   ↓  tukar, Q, aman, Q, skip, A
 *   14       : TENGKORAK / penjara (sudut kanan-bawah)
 *   15 – 20  : baris bawah   ←  skip, aman, A, aman, reverse, Q
 *   21       : PESAWAT (sudut kiri-bawah)
 *   22 – 27  : kolom kiri    ↑  tukar, Q, Q, skip, A, aman
 */

export const TILE = {
  START: 'START',
  PLUS: 'PLUS',
  MINUS: 'MINUS',
  X2: 'X2',
  SWAP: 'SWAP',
  QUESTION: 'QUESTION',
  ANSWER: 'ANSWER',
  SAFE: 'SAFE',
  SKIP: 'SKIP',
  JAIL: 'JAIL',
  REVERSE: 'REVERSE',
  PLANE: 'PLANE',
};

/** Metadata tampilan + penjelasan aturan tiap simbol (poin 1–10 dokumen). */
export const TILE_INFO = {
  START:    { label: 'START',   icon: '🏁', cls: 'start',    desc: 'Kembali/melewati START: +2 poin.' },
  PLUS:     { label: 'Plus',    icon: '➕', cls: 'plus',     desc: 'Lempar ulang dadu normal + dadu unsur. Jawaban benar: +angka dadu +2. Salah: +angka dadu saja.' },
  MINUS:    { label: 'Minus',   icon: '➖', cls: 'minus',    desc: 'Lempar ulang dadu normal + dadu unsur. Jawaban benar: +2 tetapi tetap −angka dadu. Salah: −angka dadu saja.' },
  X2:       { label: '×2',      icon: '✳️', cls: 'x2',       desc: 'Berapa pun skor (+/−) yang didapat berikutnya akan dikali dua.' },
  SWAP:     { label: 'Tukar',   icon: '🔄', cls: 'swap',     desc: 'Bebas menukar SEMUA kartumu dengan SEMUA kartu pemain lain.' },
  QUESTION: { label: 'Q',       icon: '❓', cls: 'question', desc: 'Ambil satu kartu question.' },
  ANSWER:   { label: 'A',       icon: '🅰️', cls: 'answer',   desc: 'Ambil satu kartu answer.' },
  SAFE:     { label: 'Aman',    icon: '☮️', cls: 'safe',     desc: 'Titik aman: +1 poin, tidak ada efek buruk.' },
  SKIP:     { label: 'Skip',    icon: '🚫', cls: 'skip',     desc: 'Pemain berikutnya tidak mendapat giliran.' },
  JAIL:     { label: 'Penjara', icon: '💀', cls: 'jail',     desc: 'Untuk keluar: bayar 3 poin (tidak boleh sampai minus) atau jawab 2 dadu unsur.' },
  REVERSE:  { label: 'Reverse', icon: '🔃', cls: 'reverse',  desc: 'Urutan giliran berbalik arah.' },
  PLANE:    { label: 'Pesawat', icon: '✈️', cls: 'plane',    desc: 'Pindah ke petak mana saja, bayar 2 poin atau jawab 2 dadu unsur dengan benar.' },
};

const T = TILE;

export const BOARD = [
  T.START,                                                    // 0  sudut kiri-atas
  T.MINUS, T.PLUS, T.MINUS, T.PLUS, T.MINUS, T.PLUS,          // 1–6  baris atas
  T.X2,                                                       // 7  sudut kanan-atas
  T.SWAP, T.QUESTION, T.SAFE, T.QUESTION, T.SKIP, T.ANSWER,   // 8–13 kolom kanan
  T.JAIL,                                                     // 14 sudut kanan-bawah
  T.SKIP, T.SAFE, T.ANSWER, T.SAFE, T.REVERSE, T.QUESTION,    // 15–20 baris bawah
  T.PLANE,                                                    // 21 sudut kiri-bawah
  T.SWAP, T.QUESTION, T.QUESTION, T.SKIP, T.ANSWER, T.SAFE,   // 22–27 kolom kiri
];

export const BOARD_SIZE = BOARD.length; // 28

/** Posisi tiap petak pada grid CSS 8×8 (baris, kolom mulai dari 1). */
export function gridPos(i) {
  if (i <= 7) return { row: 1, col: i + 1 };                 // baris atas, kiri→kanan
  if (i <= 13) return { row: i - 6, col: 8 };                // kolom kanan, atas→bawah
  if (i === 14) return { row: 8, col: 8 };                   // sudut kanan-bawah
  if (i <= 20) return { row: 8, col: 8 - (i - 14) };         // baris bawah, kanan→kiri
  if (i === 21) return { row: 8, col: 1 };                   // sudut kiri-bawah
  return { row: 8 - (i - 21), col: 1 };                      // kolom kiri, bawah→atas
}
