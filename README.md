# Sciencenopoly

Permainan papan digital untuk materi **Struktur Atom dan Sistem Periodik Unsur**
kelas 10 IPA, dibuat dari karya ilmiah *Pengembangan Media Pembelajaran
"Sciencenopoly"* oleh **Harits Abdurahman Aufa** dan **Muhammad Abdan Syakuuron**,
pembimbing **Sari Sri Sukmawati** — SMAI Nurul Fikri Boarding School Serang.

Papan, keempat sudut, kesepuluh simbol, keenam belas aturan, 20 kartu question,
20 kartu answer, satu dadu normal, dan tiga dadu unsur dipindahkan apa adanya dari
dokumen. **Peran moderator dijalankan komputer**, sehingga 2–4 orang bisa bermain
bersama tanpa perlu satu orang jadi wasit.

## Cara menjalankan

**Cara tercepat** — buka berkas ini dengan klik ganda, tidak perlu memasang apa pun
dan tidak perlu internet:

```
dist/index.html
```

**Untuk mengembangkan** — jalankan server lokal supaya berkas di `src/` bisa diubah
dan langsung dilihat hasilnya:

```bash
node serve.mjs
```

lalu buka <http://localhost:5173>.

**Menjalankan tes dan membangun ulang:**

```bash
npm test
```

```bash
npm run build
```

`npm run build` menyusun ulang `dist/index.html` (satu berkas mandiri, sekaligus
halaman yang disajikan GitHub Pages) dan `dist/artifact.html` (versi tanpa kerangka
dokumen). Tidak ada dependensi npm sama sekali — cukup Node.js 18 atau lebih baru.

## Cara bermain

Dimainkan bergantian di **satu perangkat**. Sebelum tiap giliran muncul layar
serah-terima, jadi kartu pemain lain tetap rahasia.

Satu giliran berjalan begini:

1. **Klaim (boleh dilewati).** Kalau ada pertanyaan yang sedang beredar dan kamu
   merasa punya kartu answer-nya, serahkan ke moderator. Benar mendapat skor kartu,
   salah dipotong 3 poin.
2. **Lempar dadu.** Satu dadu normal dan satu dadu unsur. Sebutkan nomor atom unsur
   yang muncul: benar boleh memilih **+2 poin** atau **+2 langkah**; salah tidak dapat
   apa-apa tetapi juga tidak dikurangi.
3. **Jalan** sebanyak angka dadu, lalu **efek petak** berlaku.

Melewati atau berhenti di START memberi +2 poin. Permainan berakhir saat tinggal
satu pemain yang masih memegang kartu atau salah satu tumpukan kartu habis; tiap
kartu answer yang tersisa memotong 3 poin, dan **pemenang ditentukan dari skor**,
bukan urutan selesai.

Aturan lengkap dan arti seluruh simbol bisa dibuka lewat tombol **Aturan** di dalam
permainan, dan tombol **Tabel Periodik** menampilkan unsur 1–20 sebagai bahan belajar.

### Susunan papan

28 petak, sama seperti foto papan aslinya. Nomor 1 di sudut kiri-atas, bertambah
searah jarum jam:

| Sisi | Petak |
|---|---|
| Sudut | 1 START · 8 ×2 · 15 Tengkorak (penjara) · 22 Pesawat |
| Baris atas | 2–7: − + − + − + |
| Kolom kanan | 9 Tukar · 10 Q · 11 Aman · 12 Q · 13 Skip · 14 A |
| Baris bawah | 16 Skip · 17 Aman · 18 A · 19 Aman · 20 Reverse · 21 Q |
| Kolom kiri | 23 Tukar · 24 Q · 25 Q · 26 Skip · 27 A · 28 Aman |

## Susunan berkas

```
src/
  index.html            kerangka halaman
  css/styles.css        seluruh tampilan
  js/
    data/board.js       28 petak + posisinya pada grid 8x8
    data/elements.js    unsur 1-20 dan isi ketiga dadu unsur
    data/cards.js       20 pasang kartu question & answer
    engine.js           mesin aturan — "moderator komputer", tanpa DOM
    ui.js               fungsi penggambar (papan, skor, catatan, tabel periodik)
    main.js             pengendali: menyambungkan mesin aturan dengan layar
test/
  engine.test.mjs       26 tes: tiap aturan + 200 permainan acak
  autoplay.mjs          pemain otomatis untuk uji ketahanan
build.mjs               menyatukan src/ menjadi satu berkas HTML
serve.mjs               server statis untuk pengembangan
.github/workflows/      uji + terbitkan otomatis ke GitHub Pages
```

Catatan teknis yang lebih rinci — cara mesin aturan dan layar berbicara, serta hal
yang harus dijaga saat mengubah kode — ada di [ARSITEKTUR.md](ARSITEKTUR.md).

`engine.js` sengaja tidak menyentuh DOM sama sekali, sehingga seluruh aturan bisa
diuji langsung dengan Node. Setiap aturan dari dokumen punya tesnya sendiri, dan
`autoplay.mjs` menjalankan 200 permainan acak penuh sambil memastikan jumlah kartu
selalu tetap 40 dan permainan tidak pernah macet.

## Menyesuaikan isi

- **Soal.** Ubah `CARD_PAIRS` di `src/js/data/cards.js`. Tiap baris berisi `q`
  (pertanyaan), `a` (jawaban), dan `skor` (poin bila terjawab benar).
- **Unsur di dadu.** Ubah `ELEMENT_DICE` di `src/js/data/elements.js`.
- **Nilai poin.** Ubah `RULES` di `src/js/engine.js` — misalnya besar denda penjara
  atau potongan kartu sisa.
- **Susunan petak.** Ubah `BOARD` di `src/js/data/board.js`.

Setelah mengubah apa pun, jalankan `npm test` lalu `npm run build`.

## Penerbitan

Setiap `git push` ke cabang `main` menjalankan [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml):
26 tes aturan dijalankan lebih dulu, lalu `dist/` dibangun ulang dan diterbitkan ke
GitHub Pages. Kalau ada tes yang gagal, penerbitan dibatalkan sehingga versi yang
rusak tidak pernah sampai ke pemain.

## Catatan

Beberapa bagian dokumen perlu ditafsirkan agar bisa dijalankan komputer — misalnya
simbol "titik aman" yang muncul di papan tetapi tidak ada di daftar penjelasan, dan
berapa lama efek ×2 bertahan. Seluruh keputusan itu dicatat beserta alasannya di
[CATATAN-ATURAN.md](CATATAN-ATURAN.md).
