/**
 * 20 kartu question + 20 kartu answer (dokumen: "20 kartu answer dan 20 kartu question").
 *
 * Tiap pasang punya `skor` yang tercetak di bagian bawah kartu question DAN kartu
 * answer-nya. Sesuai aturan 9, moderator mencocokkan kedua kartu lewat skor ini.
 * Karena moderator di aplikasi ini dipegang komputer, pencocokan memakai `id`
 * pasangan (100% akurat), sedangkan `skor` tetap dipakai sebagai nilai poin
 * seperti aturan 10.
 *
 * Materi: Struktur Atom dan Sistem Periodik Unsur — kelas 10 IPA.
 */

export const CARD_PAIRS = [
  { id: 1,  skor: 2, q: 'Ilmuwan Yunani yang pertama kali mengemukakan gagasan "atomos", yaitu partikel terkecil yang tidak dapat dibagi lagi.', a: 'Democritus' },
  { id: 2,  skor: 2, q: 'Model atom berupa bola pejal yang tidak dapat dibagi lagi, dikemukakan tahun 1803 berdasarkan hukum Lavoisier dan hukum Proust.', a: 'Model atom John Dalton' },
  { id: 3,  skor: 3, q: 'Model atom "roti kismis": bola bermuatan positif dengan elektron tersebar merata di dalamnya.', a: 'Model atom J.J. Thomson' },
  { id: 4,  skor: 3, q: 'Model atom hasil percobaan penembakan partikel alfa pada lempeng emas tipis (eksperimen Geiger–Marsden).', a: 'Model atom Rutherford' },
  { id: 5,  skor: 3, q: 'Model atom tahun 1913 dari percobaan spektrum atom hidrogen: elektron mengelilingi inti pada kulit dengan tingkat energi tertentu.', a: 'Model atom Niels Bohr' },
  { id: 6,  skor: 2, q: 'Partikel penyusun atom yang bermuatan negatif dan ditemukan melalui percobaan tabung sinar katode.', a: 'Elektron' },
  { id: 7,  skor: 2, q: 'Partikel penyusun inti atom yang bermuatan positif.', a: 'Proton' },
  { id: 8,  skor: 2, q: 'Partikel penyusun inti atom yang tidak bermuatan (netral), ditemukan oleh James Chadwick.', a: 'Neutron' },
  { id: 9,  skor: 2, q: 'Jumlah proton di dalam inti sebuah atom disebut …', a: 'Nomor atom (Z)' },
  { id: 10, skor: 2, q: 'Jumlah proton ditambah jumlah neutron di dalam inti atom disebut …', a: 'Nomor massa (A)' },
  { id: 11, skor: 3, q: 'Atom-atom unsur sama yang memiliki nomor atom sama tetapi nomor massa berbeda, contoh ¹²C dan ¹⁴C.', a: 'Isotop' },
  { id: 12, skor: 3, q: 'Atom-atom unsur berbeda yang memiliki nomor massa sama, contoh ¹⁴C dan ¹⁴N.', a: 'Isobar' },
  { id: 13, skor: 3, q: 'Atom-atom unsur berbeda yang memiliki jumlah neutron sama, contoh ¹³C dan ¹⁴N.', a: 'Isoton' },
  { id: 14, skor: 3, q: 'Jumlah elektron yang berada pada kulit terluar suatu atom dan menentukan sifat kimianya.', a: 'Elektron valensi' },
  { id: 15, skor: 2, q: 'Lajur vertikal (kolom) pada tabel periodik; unsur di dalamnya punya elektron valensi sama sehingga sifat kimianya mirip.', a: 'Golongan' },
  { id: 16, skor: 2, q: 'Lajur horizontal (baris) pada tabel periodik; menyatakan jumlah kulit atom, ada 7 buah pada tabel periodik.', a: 'Periode' },
  { id: 17, skor: 4, q: 'Pengelompokan unsur menurut kenaikan massa atom, di mana unsur ke-8 memiliki sifat mirip dengan unsur ke-1 (J.A.R. Newlands, 1864).', a: 'Hukum Oktaf Newlands' },
  { id: 18, skor: 4, q: 'Energi minimum yang diperlukan untuk melepaskan satu elektron dari suatu atom netral dalam wujud gas.', a: 'Energi ionisasi' },
  { id: 19, skor: 3, q: 'Dalam satu golongan dari atas ke bawah, bagaimana kecenderungan jari-jari atom dan mengapa?', a: 'Semakin besar, karena jumlah kulit bertambah' },
  { id: 20, skor: 3, q: 'Dalam satu periode dari kiri ke kanan, bagaimana kecenderungan jari-jari atom dan mengapa?', a: 'Semakin kecil, karena muatan inti bertambah sedangkan jumlah kulit tetap' },
];

/** Membentuk 20 kartu question dari daftar pasangan. */
export function buildQuestionDeck() {
  return CARD_PAIRS.map((p) => ({ uid: `Q${p.id}`, pairId: p.id, skor: p.skor, teks: p.q, tipe: 'Q' }));
}

/** Membentuk 20 kartu answer dari daftar pasangan. */
export function buildAnswerDeck() {
  return CARD_PAIRS.map((p) => ({ uid: `A${p.id}`, pairId: p.id, skor: p.skor, teks: p.a, tipe: 'A' }));
}
