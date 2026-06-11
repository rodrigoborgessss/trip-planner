// Cliente Overpass (OpenStreetMap) partilhado. GET + User-Agent + servidores
// alternativos por ordem (os públicos andam sobrecarregados).
const UA = 'TripPlanner/1.0 (projeto pessoal)';
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

async function overpass(query, tag = '') {
  const qs = '?data=' + encodeURIComponent(query);
  for (const base of ENDPOINTS) {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 11000); // não pendura num servidor lento
    try {
      const r = await fetch(base + qs, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: ctrl.signal });
      clearTimeout(to);
      if (!r.ok) { console.error(`[overpass${tag}] ${r.status} em ${base}`); continue; }
      return await r.json();
    } catch (e) {
      clearTimeout(to);
      console.error(`[overpass${tag}] ${e.name === 'AbortError' ? 'timeout' : 'erro'} em ${base}`);
    }
  }
  return null;
}

module.exports = { overpass };
