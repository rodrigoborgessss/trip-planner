// Lazer e cultura via OpenTripMap (gratuito, com chave free; sem cartão).
// Sem ACTIVITIES_TOKEN devolve exemplos. Com token, pontos de interesse reais
// à volta das coordenadas do destino, separados em lazer vs cultura.
//
// Alternativa fácil se o OpenTripMap andar instável: Geoapify Places (mesma ideia).
const config = require('../config');
const cache = require('../cache/store');

const CULTURE = /museum|cultur|histor|architect|monument|memorial|castle|fort|church|cathedral|temple|mosque|synagog|religion|theatre|galler|palace|ruin/i;

async function searchActivities({ lat, lng }) {
  if (typeof lat !== 'number') return { leisure: [], culture: [] };
  if (!config.keys.activities) return mock(lat, lng);

  return cache.remember(`act:${lat.toFixed(3)},${lng.toFixed(3)}`, 1440, async () => {
    try {
      const u = `https://api.opentripmap.com/0.1/en/places/radius?radius=12000&lon=${lng}&lat=${lat}`
        + `&kinds=interesting_places&rate=2&format=json&limit=60&apikey=${config.keys.activities}`;
      const r = await fetch(u);
      if (!r.ok) { console.error('[atividades] OpenTripMap', r.status); return { leisure: [], culture: [] }; }
      const items = await r.json();

      const seen = new Set();
      const leisure = [], culture = [];
      for (const it of items || []) {
        const name = (it.name || '').trim();
        if (!name || seen.has(name)) continue;
        seen.add(name);
        const kind = (it.kinds || '').replace(/_/g, ' ');
        const entry = {
          id: it.xid, name, category: prettyKind(it.kinds),
          rating: null, lat: it.point && it.point.lat, lng: it.point && it.point.lon, source: 'OpenTripMap',
        };
        (CULTURE.test(it.kinds || '') ? culture : leisure).push(entry);
      }
      return { leisure: leisure.slice(0, 12), culture: culture.slice(0, 12) };
    } catch (e) {
      console.error('[atividades] erro:', e.message);
      return { leisure: [], culture: [] };
    }
  });
}

// primeira "kind" legível
function prettyKind(kinds) {
  const first = String(kinds || '').split(',')[0] || 'ponto de interesse';
  return first.replace(/_/g, ' ');
}

function mock(lat, lng) {
  return {
    leisure: [{ id: 'l-1', name: 'Miradouro Exemplo', category: 'view points', rating: null, lat, lng, source: 'mock' }],
    culture: [{ id: 'c-1', name: 'Museu Exemplo', category: 'museums', rating: null, lat, lng, source: 'mock' }],
  };
}

module.exports = { searchActivities, hasToken: () => !!config.keys.activities };
