# Arsitektur

Catatan teknis untuk siapa pun yang mau mengubah atau melanjutkan proyek ini.
Untuk cara main dan cara menjalankan, lihat [README.md](README.md); untuk alasan
di balik tiap penafsiran aturan, lihat [CATATAN-ATURAN.md](CATATAN-ATURAN.md).

## Prinsip utama

`src/js/engine.js` memuat seluruh aturan permainan dan **tidak menyentuh DOM sama
sekali**. Karena itu setiap aturan bisa diuji langsung dengan Node, tanpa peramban.
Semua pengecekan benar/salah, pembagian skor, dan urutan giliran — yang di papan
aslinya dikerjakan seorang moderator manusia — ada di berkas ini.

Konsekuensinya: **jangan pernah menaruh logika aturan di `main.js` atau `ui.js`.**
Kalau sebuah aturan tidak bisa diuji lewat `npm test`, berarti ia salah tempat.

## Bagaimana layar dan aturan berbicara

`Game` tidak tahu apa-apa soal tombol. Ia hanya mengumumkan satu objek
`game.pending` yang menyatakan **masukan apa yang sedang ditunggu**:

| `pending.kind` | Arti |
|---|---|
| `handoff` | menunggu perangkat berpindah ke pemain berikutnya |
| `turn_menu` | pemain memilih: lempar dadu, klaim jawaban, atau lihat kartu |
| `element_question` | menunggu jawaban nomor atom |
| `element_choice` | menunggu pilihan +2 poin atau +2 langkah |
| `moving` | bidak sedang berjalan (animasi) |
| `info` | menunggu pemain menekan "Lanjut" |
| `jail` | menunggu cara keluar penjara |
| `swap_target` | menunggu pilihan lawan untuk tukar kartu |
| `plane_pay` / `plane_destination` | menunggu cara bayar dan petak tujuan |
| `game_over` | permainan selesai |

`src/js/main.js` adalah satu-satunya tempat yang bereaksi terhadap `pending`:
`render()` menggambar ulang semuanya dari state, lalu `renderPending()` memilih
tampilan berdasarkan `pending.kind`.

**Menambah aturan yang butuh masukan pemain** berarti menambah satu `kind` baru di
engine dan satu cabang baru di `renderPending()`.

## Penjaga aksi ganda

Setiap metode publik `Game` dijaga `_menunggu(kind)`:

```js
rollDice() {
  if (!this._menunggu('turn_menu')) return;
  ...
}
```

Tanpa ini, klik ganda atau tombol basi bisa menjalankan aksi terhadap `pending`
yang sudah berganti — bug nyata yang sempat muncul saat pengujian di peramban.
**Metode publik baru wajib dijaga dengan cara yang sama.**

## Data yang boleh diubah guru

Semua ada di `src/js/data/` dan berbentuk larik biasa, bukan kode:

- `board.js` — 28 petak dan posisinya pada grid 8×8
- `elements.js` — unsur 1–20 dan isi ketiga dadu unsur
- `cards.js` — 20 pasang kartu question & answer

Angka aturan yang bisa disetel (besar denda, potongan kartu sisa, dan sebagainya)
dikumpulkan di `RULES` pada `engine.js` — **jangan tulis angka langsung di tengah
kode**.

## Proses build

`build.mjs` menyatukan keenam modul ES ke dalam satu skop sambil membuang
`import`/`export`. Akibatnya: **nama tingkat atas harus unik di seluruh enam modul**.
Kalau dua berkas mendeklarasikan `const x`, hasil build akan rusak walau `npm test`
tetap lolos.

Keluarannya dua berkas:

- `dist/index.html` — permainan lengkap dalam satu berkas, dipakai GitHub Pages
  sekaligus bisa dibuka dengan klik ganda
- `dist/artifact.html` — isi halaman tanpa kerangka dokumen

## Perintah

```bash
npm test          # node --test test/engine.test.mjs
npm run build     # src/ -> dist/index.html + dist/artifact.html
node serve.mjs    # server pengembangan di http://localhost:5173
```

Tidak ada dependensi npm sama sekali; cukup Node.js 18 atau lebih baru. Jalankan
`npm test` lalu `npm run build` setiap kali mengubah sumber — `dist/` ikut disimpan
di repositori, bukan dibuat mendadak.

Skrip tes menyebut nama berkas tes satu per satu, bukan memakai pola glob: npm
menjalankan skrip lewat cmd.exe di Windows dan bash di Linux, dan tidak ada bentuk
glob yang benar di keduanya. Berkas tes baru harus ditambahkan namanya ke skrip.

## Kebiasaan penulisan

- Komentar menyebut nomor aturan aslinya (`aturan 5`, `simbol 9`). Pertahankan
  rujukan itu saat mengubah perilaku, dan tambahkan tes yang dinamai sesuai aturannya.
- Teks antarmuka dan nama variabel memakai bahasa Indonesia — pembacanya siswa dan
  guru.
- Setiap bagian dokumen yang harus ditafsirkan dicatat di `CATATAN-ATURAN.md`.
  Perbarui berkas itu kalau penafsirannya berubah.
