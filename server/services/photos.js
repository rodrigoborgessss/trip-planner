// Foto de cidade. Pexels (gratuito, com chave) dá fotos de atrações reais.
// Sem chave, recorre à Wikipedia, mas filtra brasões/bandeiras/logótipos.
// Devolve { url, source } para se perceber de onde veio cada foto.
const config = require('../config');
const cache = require('../cache/store');

const BAD = /coat_of_arms|escudo|bandera|\bflag\b|\bseal\b|logo|wappen|blason|crest|emblem/i;

async function getCityPhoto(city, country) {
  const q = (city || country || '').trim();
  if (!q) return { url: null, source: null };
  return cache.remember(`photo:${q}|${country || ''}`, 1440, async () => {
    if (config.keys.pexels) {
      const url = await pexels(`${q} ${country || ''}`.trim());
      if (url) return { url, source: 'pexels' };
    }
    const url = await wikipedia(q);
    return { url, source: url ? 'wikipedia' : null };
  });
}

async function pexels(query) {
  try {
    const r = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
      { headers: { Authorization: config.keys.pexels } }
    );
    if (!r.ok) {
      console.error(`[fotos] Pexels ${r.status} para "${query}" — verifica a PEXELS_KEY`);
      return null;
    }
    const j = await r.json();
    const p = j.photos && j.photos[0];
    return p ? (p.src.landscape || p.src.large || p.src.medium) : null;
  } catch (e) {
    console.error('[fotos] Pexels erro:', e.message);
    return null;
  }
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
    if (src && BAD.test(decodeURIComponent(src))) return null; // brasão/bandeira -> rejeita
    return src;
  } catch (e) { return null; }
}

module.exports = { getCityPhoto, hasPexels: () => !!config.keys.pexels };
