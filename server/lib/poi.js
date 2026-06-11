// Fonte de pontos de interesse (OpenStreetMap). Usa o GEOAPIFY (rápido e
// fiável, 3000/dia grátis) quando há chave; senão recorre ao Overpass público.
// Devolve sempre itens normalizados: { name, tags, lat, lng }
// (tags = tags OSM originais, para reaproveitar a lógica de fama/foto/categoria).
const config = require('../config');
const { overpass } = require('./overpass');

async function pois({ lat, lng, radius, geoapifyCats, overpassQuery, tag = '' }) {
  if (config.keys.geoapify) {
    const g = await geoapify(lat, lng, radius, geoapifyCats, tag);
    if (g) return g;                    // se o Geoapify responder, usamos
  }
  const data = await overpass(overpassQuery, tag);   // recurso: Overpass público
  if (!data) return null;
  return (data.elements || []).map((el) => ({
    name: (el.tags && el.tags.name) || '',
    tags: el.tags || {},
    lat: el.lat || (el.center && el.center.lat),
    lng: el.lon || (el.center && el.center.lon),
  }));
}

async function geoapify(lat, lng, radius, categories, tag) {
  try {
    const url = `https://api.geoapify.com/v2/places`
      + `?categories=${categories}`
      + `&filter=circle:${lng},${lat},${radius}`
      + `&bias=proximity:${lng},${lat}`
      + `&limit=200&apiKey=${config.keys.geoapify}`;
    const r = await fetch(url);
    if (!r.ok) { console.error(`[geoapify${tag}] ${r.status}`); return null; }
    const j = await r.json();
    return (j.features || []).map((f) => {
      const p = f.properties || {};
      const raw = (p.datasource && p.datasource.raw) || {};
      const wm = p.wiki_and_media || {};
      return {
        name: p.name || raw.name || '',
        tags: {
          ...raw,
          name: p.name || raw.name,
          website: raw.website || p.website,
          // o Geoapify entrega estes campos à parte (não em datasource.raw)
          wikidata: raw.wikidata || wm.wikidata || null,
          wikipedia: raw.wikipedia || wm.wikipedia || null,
          image: raw.image || wm.image || null,
        },
        lat: p.lat, lng: p.lon,
      };
    });
  } catch (e) {
    console.error(`[geoapify${tag}] erro:`, e.message);
    return null;
  }
}

module.exports = { pois };
