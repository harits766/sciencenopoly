/**
 * Menggabungkan seluruh sumber di `src/` menjadi:
 *
 *   dist/index.html      berkas HTML mandiri lengkap — bisa dibuka dengan klik
 *                        ganda tanpa server (browser menolak ES module dari
 *                        protokol file://), sekaligus halaman yang disajikan
 *                        GitHub Pages.
 *   dist/artifact.html   isi halaman saja (tanpa <!doctype>/<html>/<head>/
 *                        <body>) untuk diterbitkan sebagai Artifact.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, 'src');
const OUT = join(ROOT, 'dist', 'index.html');

// Urutan penting: modul yang dipakai modul lain harus lebih dulu.
const MODUL = [
  'js/data/board.js',
  'js/data/elements.js',
  'js/data/cards.js',
  'js/engine.js',
  'js/ui.js',
  'js/main.js',
];

/** Membuang sintaks modul supaya semua berkas bisa disatukan dalam satu skop. */
function bersihkan(kode) {
  return kode
    .replace(/^import\b[^;]*;\s*$/gm, '')                          // hapus baris import
    .replace(/^export\s+(const|let|var|function|class|async)\b/gm, '$1') // export deklarasi
    .replace(/^export\s*\{[^}]*\};?\s*$/gm, '');                   // export { ... }
}

const css = readFileSync(join(SRC, 'css/styles.css'), 'utf8');
const js = MODUL.map((f) => {
  const isi = bersihkan(readFileSync(join(SRC, f), 'utf8'));
  return '/* ================= ' + f + ' ================= */\n' + isi;
}).join('\n');

let html = readFileSync(join(SRC, 'index.html'), 'utf8');
html = html
  .replace('<link rel="stylesheet" href="css/styles.css">', '<style>\n' + css + '\n</style>')
  .replace('<script type="module" src="js/main.js"></script>',
    '<script>\n(function(){\n"use strict";\n' + js + '\n})();\n</script>');

if (html.includes('href="css/styles.css"') || html.includes('src="js/main.js"')) {
  throw new Error('Gagal menyisipkan CSS/JS — periksa penanda di src/index.html');
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, html, 'utf8');

// Varian Artifact: hanya isi <head> yang relevan + isi <body>, karena kerangka
// dokumennya disediakan oleh penerbit Artifact.
const kepala = html.match(/<title>[\s\S]*?<\/style>/)[0];
const badan = html.match(/<body>([\s\S]*)<\/body>/)[1];
writeFileSync(join(ROOT, 'dist', 'artifact.html'), kepala + '\n' + badan.trim() + '\n', 'utf8');

const kb = (n) => (Buffer.byteLength(n) / 1024).toFixed(1);
console.log('dist/index.html    dibuat (' + kb(html) + ' KB, ' + MODUL.length + ' modul disatukan)');
console.log('dist/artifact.html dibuat (' + kb(kepala + badan) + ' KB)');
