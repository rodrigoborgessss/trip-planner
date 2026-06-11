// Foto de cidade, guardada NO SERVIDOR.
// 1) resolve o URL (Pexels com chave; senão Wikipedia a filtrar brasões);
// 2) descarrega a imagem para public/data/photos e passa a servir do disco.
// Cada cidade é pedida à API uma única vez. Manifesto em cache/photos.json.
const fs = require('fs');
const path = require('path');
const config = require('../config');

const BAD = /coat_of_arms|escudo|bandera|\bflag\b|\bseal\b|logo|wappen|blason|crest|emblem/i;
const MANIFEST = path.join(__dirname, '..', 'cache', 'photos.json');
const PHOTODIR = path.join(__dirname, '..', '..', 'public', 'data', 'photos');

let manifest = {};
try { manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')); } catch (e) { manifest = {}; }
let t = null;
function persist() {
  clearTimeout(t);
  t = setTimeout(() => { try { fs.mkdirSync(path.dirname(MANIFEST), { recursive: true }); fs.writeFileSync(MANIFEST, JSON.stringify(manifest)); } catch (e) {} }, 800);
}

async function getCityPhoto(city, country) {
  const q = (city || country || '').trim();
  if (!q) return { url: null, source: null };
  const key = `${q}|${country || ''}`;

  // já resolvido? confirma que o ficheiro local ainda existe
  const cached = manifest[key];
  if (cached) {
    if (!cached.url || !cached.local) return cached;
    if (fs.existsSync(path.join(PHOTODIR, cached.file || ''))) return cached;
  }

  const { url, source } = await resolve(q, country);
  let result = { url, source, local: false };
  if (url) {
    const saved = await download(url, key);
    if (saved) result = { url: `/data/photos/${saved}`, source, local: true, file: saved };
  }
  manifest[key] = result;
  persist();
  return result;
}

async function resolve(q, country) {
  if (config.keys.pexels) {
    const url = await pexels(`${q} ${country || ''}`.trim());
    if (url) return { url, source: 'pexels' };
  }
  const url = await wikipedia(q);
  return { url, source: url ? 'wikipedia' : null };
}

async function download(url, key) {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const type = r.headers.get('content-type') || '';
    const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
    const file = slug(key) + '.' + ext;
    fs.mkdirSync(PHOTODIR, { recursive: true });
    const buf = Buffer.from(await r.arrayBuffer());
    fs.writeFileSync(path.join(PHOTODIR, file), buf);
    return file;
  } catch (e) { return null; }
}

function slug(s) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'x';
}

async function pexels(query) {
  try {
    const r = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
      { headers: { Authorization: config.keys.pexels } });
    if (!r.ok) { console.error(`[fotos] Pexels ${r.status} para "${query}"`); return null; }
    const j = await r.json();
    const p = j.photos && j.photos[0];
    return p ? (p.src.landscape || p.src.large || p.src.medium) : null;
  } catch (e) { console.error('[fotos] Pexels erro:', e.message); return null; }
}

async function wikipedia(title) {
  try {
    const r = await fetch(`https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}?redirect=true`,
      { headers: { Accept: 'application/json' } });
    if (!r.ok) return null;
    const j = await r.json();
    const src = (j.originalimage && j.originalimage.source) || (j.thumbnail && j.thumbnail.source) || null;
    if (src && BAD.test(decodeURIComponent(src))) return null;
    return src;
  } catch (e) { return null; }
}

module.exports = { getCityPhoto, hasPexels: () => !!config.keys.pexels };
