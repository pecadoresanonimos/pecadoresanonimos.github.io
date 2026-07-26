// scripts/nuevo-episodio.mjs
//
// Agrega un episodio nuevo al sitio (o re-renderiza) desde episodios.json.
//
// Uso:
//   node scripts/nuevo-episodio.mjs <urlYouTube> <urlSpotify> [--titulo "..."] [--desc "..."]
//     -> saca el ID de cada URL, toma el título de YouTube (si no pones --titulo),
//        lo agrega como episodio destacado y baja el anterior a "anteriores".
//
//   node scripts/nuevo-episodio.mjs
//     -> solo re-genera la sección de episodios desde episodios.json (sin agregar).
//
// Después:  git add -A && git commit -m "Nuevo episodio" && git push
//
// No necesita instalar nada (Node 20+ trae fetch).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const JSON_PATH = path.join(ROOT, 'episodios.json');
const HTML_PATH = path.join(ROOT, 'index.html');

// ---------- argumentos ----------
const argv = process.argv.slice(2);
let urlYT = null;
let urlSP = null;
let titulo = null;
let desc = null;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--titulo') titulo = argv[++i];
  else if (a === '--desc') desc = argv[++i];
  else if (/^https?:\/\//.test(a) && /youtu/.test(a)) urlYT = a;
  else if (/^https?:\/\//.test(a) && /spotify/.test(a)) urlSP = a;
}

const idYouTube = (u) => (u || '').match(/(?:youtu\.be\/|[?&]v=|embed\/)([\w-]{11})/)?.[1] || null;
const idSpotify = (u) => (u || '').match(/episode\/([A-Za-z0-9]+)/)?.[1] || null;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s) => esc(s).replace(/"/g, '&quot;');
const desHtml = (s) =>
  String(s)
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');

async function tituloDeYouTube(id) {
  const r = await fetch('https://www.youtube.com/watch?v=' + id, {
    headers: { 'Accept-Language': 'es-ES,es' },
  });
  const html = await r.text();
  const m =
    html.match(/<meta name="title" content="([^"]+)"/) ||
    html.match(/<meta property="og:title" content="([^"]+)"/) ||
    html.match(/<title>([^<]+)<\/title>/);
  let t = m ? desHtml(m[1]) : '';
  t = t.replace(/\s*-\s*YouTube\s*$/, '').replace(/\s*\|\s*Pecadores An[óo]nimos\s*$/i, '').trim();
  return t;
}

function renderRegion(eps) {
  const f = eps[0];
  const prev = eps.slice(1);
  const L = [];
  L.push('    <!-- @EPISODIOS:INICIO — región generada por scripts/nuevo-episodio.mjs desde episodios.json. No editar a mano. -->');
  L.push('    <div class="platforms reveal">');
  L.push(`      <a href="https://open.spotify.com/episode/${f.spotify}" target="_blank" rel="noopener" class="btn btn-dark" id="spotifyLink">▸ Escuchar en Spotify</a>`);
  L.push(`      <a href="https://youtu.be/${f.youtube}" target="_blank" rel="noopener" class="btn btn-ghost" id="youtubeLink">▸ Ver en YouTube</a>`);
  L.push('    </div>');
  L.push('');
  L.push('    <!-- EPISODIO DESTACADO -->');
  L.push('    <div class="featured-ep reveal">');
  L.push(`      <div class="featured-tag">Episodio ${f.num}</div>`);
  L.push(`      <h3 class="featured-title">${esc(f.titulo)}</h3>`);
  L.push(`      <p class="featured-desc">${esc(f.desc)}</p>`);
  L.push('    </div>');
  L.push('');
  L.push('    <div class="embed-grid">');
  L.push(`      <!-- YOUTUBE: video real del episodio ${f.num} -->`);
  L.push('      <div class="embed-card reveal">');
  L.push('        <h3><span class="dot"></span> En YouTube</h3>');
  L.push('        <div class="video-wrap">');
  L.push(`          <iframe src="https://www.youtube.com/embed/${f.youtube}"`);
  L.push(`            title="Pecadores Anónimos - Episodio ${f.num}: ${escAttr(f.titulo)}" frameborder="0"`);
  L.push('            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"');
  L.push('            referrerpolicy="strict-origin-when-cross-origin" allowfullscreen loading="lazy"></iframe>');
  L.push('        </div>');
  L.push('      </div>');
  L.push('');
  L.push('      <!-- SPOTIFY: episodio real -->');
  L.push('      <div class="embed-card reveal">');
  L.push('        <h3><span class="dot"></span> En Spotify</h3>');
  L.push('        <iframe style="border-radius:12px" class="spotify-embed"');
  L.push(`          src="https://open.spotify.com/embed/episode/${f.spotify}?utm_source=generator&theme=0"`);
  L.push('          width="100%" height="352" frameborder="0" allowfullscreen');
  L.push('          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"');
  L.push('          loading="lazy"></iframe>');
  L.push('      </div>');
  L.push('    </div>');

  if (prev.length) {
    L.push('');
    L.push('    <!-- ====================== EPISODIOS ANTERIORES ====================== -->');
    L.push('    <div class="prev-eps reveal">');
    L.push('      <h3 class="prev-eps-title">Episodios anteriores</h3>');
    for (const p of prev) {
      L.push('      <div class="prev-ep">');
      L.push('        <div class="prev-ep-info">');
      L.push(`          <span class="prev-ep-num">Episodio ${p.num}</span>`);
      L.push(`          <strong>${esc(p.titulo)}</strong>`);
      L.push('        </div>');
      L.push('        <div class="prev-ep-links">');
      L.push(`          <a href="https://open.spotify.com/episode/${p.spotify}" target="_blank" rel="noopener" class="btn btn-dark">Spotify</a>`);
      L.push(`          <a href="https://youtu.be/${p.youtube}" target="_blank" rel="noopener" class="btn btn-ghost">YouTube</a>`);
      L.push('        </div>');
      L.push('      </div>');
    }
    L.push('    </div>');
  }
  L.push('    <!-- @EPISODIOS:FIN -->');
  return L.join('\n');
}

async function main() {
  let eps = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));

  if (urlYT || urlSP) {
    const yt = idYouTube(urlYT);
    const sp = idSpotify(urlSP);
    if (!yt) throw new Error('No pude sacar el ID de YouTube de: ' + urlYT);
    if (!sp) throw new Error('No pude sacar el ID de Spotify de: ' + urlSP);
    if (!titulo) {
      console.log('Obteniendo título de YouTube...');
      titulo = await tituloDeYouTube(yt);
    }
    if (!titulo) throw new Error('No pude obtener el título; pásalo con --titulo "..."');
    const num = Math.max(0, ...eps.map((e) => e.num)) + 1;
    const nuevo = { num, titulo, desc: desc || titulo, youtube: yt, spotify: sp };
    eps = [nuevo, ...eps];
    fs.writeFileSync(JSON_PATH, JSON.stringify(eps, null, 2) + '\n', 'utf8');
    console.log(`✅ Agregado como Episodio ${num}: "${titulo}"`);
  } else {
    console.log('Sin URLs: solo re-genero la sección desde episodios.json.');
  }

  const html = fs.readFileSync(HTML_PATH, 'utf8');
  const re = /    <!-- @EPISODIOS:INICIO[\s\S]*?<!-- @EPISODIOS:FIN -->/;
  if (!re.test(html)) throw new Error('No encontré los marcadores @EPISODIOS en index.html');
  fs.writeFileSync(HTML_PATH, html.replace(re, renderRegion(eps)), 'utf8');
  console.log(`✅ index.html actualizado (${eps.length} episodios: 1 destacado + ${eps.length - 1} anteriores).`);
  console.log('   Ahora:  git add -A && git commit -m "Nuevo episodio" && git push');
}

main().catch((e) => {
  console.error('💥', e.message);
  process.exit(1);
});
