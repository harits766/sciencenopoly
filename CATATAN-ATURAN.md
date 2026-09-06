# Catatan penerjemahan aturan

Dokumen aslinya adalah karya ilmiah tentang papan permainan fisik, bukan spesifikasi
perangkat lunak. Sebagian besar aturan bisa dipindahkan apa adanya, tetapi ada
beberapa titik yang perlu keputusan supaya permainannya bisa berjalan sendiri di
komputer. Semua keputusan itu dicatat di sini, lengkap dengan alasan dan tempat
mengubahnya kalau ternyata maksud aslinya berbeda.

Angka aturan yang bisa disetel ada di `RULES` pada [`src/js/engine.js`](src/js/engine.js).

---

## 1. Moderator dipegang komputer

**Aturan 1** menyebut "minimal 2 pemain dan maksimal 4 pemain serta 1 moderator".
Sesuai permintaan, moderator dijalankan komputer sehingga keempat orang bisa
ikut bermain.

**Aturan 9** menyuruh moderator mencocokkan kartu question dan answer lewat angka
skor di bawah masing-masing kartu — "jika skornya sama berarti benar". Cara itu
adalah siasat agar moderator manusia bisa memeriksa tanpa perlu hafal jawabannya.
Komputer tahu pasangan kartu yang sebenarnya, jadi pencocokan memakai `pairId`
(selalu tepat), sementara angka skor tetap dipakai sebagai nilai poin persis
seperti **aturan 10**. Layar moderator tetap menampilkan kalimat "mencocokkan skor
kedua kartu" supaya alurnya sama dengan permainan aslinya.

## 2. Simbol "titik aman" (☮)

Simbol ini muncul **4 kali** di foto papan (Gambar 2) tetapi **tidak ada** dalam
daftar 10 penjelasan simbol (Gambar 3). Satu-satunya petunjuk ada di definisi
Sciencenopoly pada Tinjauan Pustaka: pemain mengumpulkan poin "dari berbagai cara
yang ada, seperti: menjawab kartu pertanyaan, **mendapatkan titik aman**, menjawab
dadu unsur, dan lain-lain".

Karena itu petak ini dijalankan sebagai **titik aman: +1 poin dan tidak ada efek
buruk**. Nilainya ada di `RULES.BONUS_TITIK_AMAN`.

## 3. Berapa lama efek ×2 bertahan

**Simbol 6** berbunyi "Berapapun skor yang didapat +/- akan di ×2" tanpa menyebut
durasinya. Yang dipakai di sini: menempati petak ×2 memberi satu tanda ×2 yang
menggandakan **perolehan skor berikutnya** (positif maupun negatif), lalu tanda itu
habis.

Pengecualiannya adalah biaya yang dibayar sukarela — denda penjara 3 poin dan tiket
pesawat 2 poin. Keduanya bukan "skor yang didapat" melainkan ongkos tindakan, jadi
tidak digandakan dan tanda ×2 tetap tersimpan untuk dipakai nanti.

## 4. Kapan pemain boleh menjawab pertanyaan orang lain

Di papan fisik, siapa pun boleh langsung menyahut begitu merasa punya kartu answer
yang cocok. Di satu perangkat hal itu mustahil karena kartu tiap pemain harus
dirahasiakan.

Yang dipakai: **klaim dilakukan di awal giliranmu sendiri**. Ini bukan pengurangan
aturan — **aturan 11** memang menyatakan sebuah pertanyaan berlaku "sampai giliran
jalan kembali ke dia lagi", jadi setiap pemain lain tetap mendapat tepat satu
kesempatan sebelum pertanyaan itu kedaluwarsa. Dalam satu giliran pemain boleh
mencoba beberapa kali; setiap percobaan dinilai sendiri-sendiri, dan risiko −3 poin
per kesalahan sudah cukup menahan orang menebak-nebak.

## 5. Kartu answer yang salah tidak kembali

**Aturan 9** menyuruh pemain "menyerahkan kartu question dan answer yang dimaksud
kepada moderator". Dokumen tidak menyebut kartu yang salah dikembalikan, jadi kartu
itu tetap di moderator. Ini juga penting untuk keseimbangan: kalau kartu salah
kembali ke tangan, pemain bisa mencoba semua kartunya satu per satu sampai ketemu.

## 6. Kapan permainan berakhir

**Aturan 13** dan **aturan 16** tidak sepenuhnya sejalan. Aturan 13 berkata
permainan "belum berakhir sampai semua pemain menghabiskan kartunya", sedangkan
aturan 16 berkata skor dihitung "sampai tinggal tersisa satu pemain atau kartu
question atau answer habis".

Yang dipakai adalah **aturan 16** sebagai syarat berakhir:

- tersisa paling banyak satu pemain yang masih memegang kartu, **atau**
- tumpukan kartu question atau answer habis.

Aturan 13 tetap berlaku dalam arti aslinya: pemain yang kartunya habis berhenti
bermain, tetapi permainan tidak ikut berhenti karena itu. Begitu pula **aturan 15** —
pemain yang kartu answer-nya habis tetapi masih memegang kartu question belum
dianggap selesai sampai pertanyaannya terjawab atau kedaluwarsa.

## 7. Dua macam kartu question milik moderator

Dokumen menyebut dua hal berbeda yang sama-sama berada di moderator:

| Sumber | Skor terlihat? | Nilai kalau dijawab |
|---|---|---|
| **Aturan 8** — moderator membacakan kartu saat tak ada pemain yang memegang kartu question | Tidak ("tanpa menyebutkan skor") | Skor penuh kartu itu |
| **Aturan 11** — kartu pemain yang kedaluwarsa, diserahkan "dengan skor terbuka" | Ya | +1 poin saja (**aturan 12**) |

Perbedaan nilainya masuk akal: begitu skor sebuah kartu terbuka, pemain bisa
mencocokkannya cuma dengan melihat angka di kartu answer-nya, jadi hadiahnya
dikecilkan. Kartu terbuka ini sekaligus jadi tempat membuang kartu answer sisa,
yang berguna karena **aturan 14** memotong 3 poin untuk tiap kartu answer yang
masih dipegang saat permainan bubar.

## 8. Isi dadu unsur

Dokumen menyebut "3 dadu unsur dan 1 dadu normal" tetapi tidak mencantumkan sisi-sisinya,
dan tulisan pada dadu di Gambar 2 terlalu buram untuk dibaca. Ketiga dadu diisi 18
unsur dari nomor atom 1–20 — persis cakupan materi kelas 10:

| Dadu | Sisi |
|---|---|
| 1 | H, He, Li, C, N, O |
| 2 | F, Ne, Na, Mg, Al, Si |
| 3 | P, S, Cl, Ar, K, Ca |

**Aturan 6** ("setiap pergantian giliran, maka terjadi juga pergantian dadu unsur")
dijalankan dengan memakai dadu 1 → 2 → 3 → 1 … bergantian tiap giliran.
Ubah di [`src/js/data/elements.js`](src/js/data/elements.js).

## 9. Isi 20 kartu question dan 20 kartu answer

Dokumen menyebut jumlahnya tetapi tidak memuat isinya. Kedua puluh pasang kartu
ditulis pada materi yang sama — sejarah penemuan atom, partikel penyusun atom,
isotop/isobar/isoton, golongan dan periode, hukum oktaf, energi ionisasi, dan
kecenderungan jari-jari atom. Skor tiap kartu 2–4 poin sesuai tingkat kesulitannya.
Ubah di [`src/js/data/cards.js`](src/js/data/cards.js).

## 10. Hal-hal kecil lain

- **Petak START (aturan 3).** Bunyinya "jika pemain kembali lagi ke start". Diberlakukan
  untuk **melewati maupun berhenti tepat** di START, seperti kebiasaan monopoli.
- **Membayar tiket pesawat (simbol 8).** Dokumen hanya melarang skor jadi minus untuk
  denda penjara. Aturan yang sama diterapkan pada pesawat: tombol bayar mati kalau
  skormu kurang dari 2.
- **Skor boleh negatif** di luar dua kasus di atas — misalnya karena jawaban salah
  (−3), petak minus, atau potongan kartu sisa di akhir permainan.
- **Arah jalan bidak tetap searah jarum jam.** Simbol 5 menyebut "urutan giliran
  berubah putaran", yang diartikan sebagai urutan bermain, bukan arah bidak.
- **Petak tukar kartu (simbol 7)** boleh dilewati; menukar itu hak, bukan kewajiban.

## 11. Alat dan bahan

Alat dan bahan pada dokumen (karton, lem, gunting, aplikasi Desygner) adalah untuk
membuat papan fisik. Padanan digitalnya: papan dan seluruh simbol digambar dengan
HTML/CSS, dadu dan pengocokan kartu memakai pembangkit acak, dan berkasnya berjalan
di peramban mana pun tanpa perlu dipasang.
