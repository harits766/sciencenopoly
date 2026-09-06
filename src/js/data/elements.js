/**
 * Dadu unsur — 3 buah, masing-masing 6 sisi (dokumen: "3 dadu unsur dan 1 dadu normal").
 * Sisi dadu memakai unsur nomor atom 1–20, yaitu cakupan materi
 * "Struktur Atom dan Sistem Periodik Unsur" kelas 10 IPA.
 *
 * Aturan 6: "Setiap pergantian giliran, maka terjadi juga pergantian dadu unsur"
 * → dadu dipakai bergiliran 1 → 2 → 3 → 1 …
 */

export const ELEMENTS = [
  { z: 1,  sym: 'H',  name: 'Hidrogen',  golongan: 'IA',    periode: 1, konfigurasi: '1' },
  { z: 2,  sym: 'He', name: 'Helium',    golongan: 'VIIIA', periode: 1, konfigurasi: '2' },
  { z: 3,  sym: 'Li', name: 'Litium',    golongan: 'IA',    periode: 2, konfigurasi: '2, 1' },
  { z: 4,  sym: 'Be', name: 'Berilium',  golongan: 'IIA',   periode: 2, konfigurasi: '2, 2' },
  { z: 5,  sym: 'B',  name: 'Boron',     golongan: 'IIIA',  periode: 2, konfigurasi: '2, 3' },
  { z: 6,  sym: 'C',  name: 'Karbon',    golongan: 'IVA',   periode: 2, konfigurasi: '2, 4' },
  { z: 7,  sym: 'N',  name: 'Nitrogen',  golongan: 'VA',    periode: 2, konfigurasi: '2, 5' },
  { z: 8,  sym: 'O',  name: 'Oksigen',   golongan: 'VIA',   periode: 2, konfigurasi: '2, 6' },
  { z: 9,  sym: 'F',  name: 'Fluorin',   golongan: 'VIIA',  periode: 2, konfigurasi: '2, 7' },
  { z: 10, sym: 'Ne', name: 'Neon',      golongan: 'VIIIA', periode: 2, konfigurasi: '2, 8' },
  { z: 11, sym: 'Na', name: 'Natrium',   golongan: 'IA',    periode: 3, konfigurasi: '2, 8, 1' },
  { z: 12, sym: 'Mg', name: 'Magnesium', golongan: 'IIA',   periode: 3, konfigurasi: '2, 8, 2' },
  { z: 13, sym: 'Al', name: 'Aluminium', golongan: 'IIIA',  periode: 3, konfigurasi: '2, 8, 3' },
  { z: 14, sym: 'Si', name: 'Silikon',   golongan: 'IVA',   periode: 3, konfigurasi: '2, 8, 4' },
  { z: 15, sym: 'P',  name: 'Fosforus',  golongan: 'VA',    periode: 3, konfigurasi: '2, 8, 5' },
  { z: 16, sym: 'S',  name: 'Belerang',  golongan: 'VIA',   periode: 3, konfigurasi: '2, 8, 6' },
  { z: 17, sym: 'Cl', name: 'Klorin',    golongan: 'VIIA',  periode: 3, konfigurasi: '2, 8, 7' },
  { z: 18, sym: 'Ar', name: 'Argon',     golongan: 'VIIIA', periode: 3, konfigurasi: '2, 8, 8' },
  { z: 19, sym: 'K',  name: 'Kalium',    golongan: 'IA',    periode: 4, konfigurasi: '2, 8, 8, 1' },
  { z: 20, sym: 'Ca', name: 'Kalsium',   golongan: 'IIA',   periode: 4, konfigurasi: '2, 8, 8, 2' },
];

export const BY_SYMBOL = Object.fromEntries(ELEMENTS.map((e) => [e.sym, e]));

/** Tiga dadu unsur, 6 sisi tiap dadu. */
export const ELEMENT_DICE = [
  ['H', 'He', 'Li', 'C', 'N', 'O'],     // dadu unsur 1 — periode 1–2
  ['F', 'Ne', 'Na', 'Mg', 'Al', 'Si'],  // dadu unsur 2 — periode 2–3
  ['P', 'S', 'Cl', 'Ar', 'K', 'Ca'],    // dadu unsur 3 — periode 3–4
];

/** Unsur pada sisi ke-`faceIndex` (0–5) dari dadu unsur ke-`diceIndex` (0–2). */
export function faceElement(diceIndex, faceIndex) {
  return BY_SYMBOL[ELEMENT_DICE[diceIndex][faceIndex]];
}
