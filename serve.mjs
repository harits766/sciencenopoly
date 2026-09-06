/**
 * Server statis kecil untuk pengembangan: `node serve.mjs` lalu buka
 * http://localhost:5173 . Melayani `src/` supaya ES module bisa dimuat.
 */

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), 'src');
const PORT = Number(process.env.PORT) || 5173;

const TIPE = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

createServer(async (req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  const rel = normalize(url === '/' ? '/index.html' : url).replace(/^([/\\])+/, '');
  const file = join(ROOT, rel);

  if (!file.startsWith(ROOT)) { res.writeHead(403).end('Terlarang'); return; }

  try {
    const isi = await readFile(file);
    res.writeHead(200, { 'content-type': TIPE[extname(file)] || 'application/octet-stream' });
    res.end(isi);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('404 — ' + rel + ' tidak ditemukan');
  }
}).listen(PORT, () => console.log('Sciencenopoly berjalan di http://localhost:' + PORT));
