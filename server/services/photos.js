// Foto de cidade. Pexels (com chave) dá fotos de atrações reais; sem chave,
// Wikipedia a filtrar brasões/bandeiras. Devolve { url, source }.
//
// Cache em DISCO (cache/photos.json): cada cidade só é pedida à API uma vez;
// depois os URLs ficam guardados e sobrevivem a reinícios — sem voltar a
// chamar o Pexels/Wikipedia. (Guardar os ficheiros de imagem em si fica para
// depois; por agora guardamos os URLs, que já evita as chamadas repetidas.)
const fs = require('fs');
const path = require('path');
const config = require('../config');

const BAD = /coat_of_arms|escudo|bandera|\bflag\b|\bseal\b|logo|wappen|blason|crest|emblem/i;
const FILE = path.join(__dirname, '..', 'cache', 'photos.json');

let disk = {};
try { disk = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) { disk = {}; }
let writeTimer = null;
function persist() {
  clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    try { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(disk)); }
    catch (e) { /* sem persistência, segue só em memória */ }
  }, 1000);
}

async function getCityPhoto(city, country) {
  const q = (city || country || '').trim();
  if (!q) return { url: null, source: null };
  const key = `${q}|${country || ''}`;
  if (key in disk) return disk[key];                 // já resolvido antes: sem chamada à API

  const result = await resolve(q, country);
  disk[key] = result;
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

async function pexels(query) {
  try {
    const r = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
      { headers: { Authorization: config.keys.pexels } }
    );
    if (!r.ok) { console.error(`[fotos] Pexels ${r.status} para "${query}" — verifica a PEXELS_KEY`); return null; }
    const j = await r.json();
    const p = j.photos && j.photos[0];
    return p ? (p.src.landscape || p.src.large || p.src.medium) : null;
  } catch (e) { console.error('[fotos] Pexels erro:', e.message); return null; }
}

async function wikipedia(title) {
  try {
    const r = await fetch(
      `https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}?redirect=true`,
      { headers: { Accept: 'application/json' } }
    );
    if (!r.ok) return null;
    const j = await r.json();
    const src = (j.originalimage && j.originalimage.source) || (j.thumbnail && j.thumbnail.source) || null;
    if (src && BAD.test(decodeURIComponent(src))) return null;
    return src;
  } catch (e) { return null; }
}

module.exports = { getCityPhoto, hasPexels: () => !!config.keys.pexels };
