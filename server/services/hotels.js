// Hotéis — hotéis REAIS da cidade (OpenStreetMap), com estrelas e foto quando
// existem, e deeplink de reserva (com o teu marker de afiliado = comissão).
//
// Porque não há preço inline: a API de dados de hotéis gratuita (Hotellook)
// foi descontinuada e não há fonte grátis fiável de PREÇOS ao vivo. O OSM dá
// os hotéis e fotos; o preço aparece no parceiro ao clicar. Para preços dentro
// da app é preciso uma API paga (RateHawk, Hotelbeds) — o render já está pronto
// para mostrar preço se um dia devolveres pricePerNight aqui.
const cache = require('../cache/store');
const config = require('../config');
const { pois } = require('../lib/poi');

async function searchHotels({ city, iata, lat, lng, checkin, checkout, pax }) {
  const dest = city || iata || '';
  const marker = config.keys.hotelsMarker;
  if (typeof lat !== 'number') return searchLinks(dest, checkin, checkout, pax, marker);

  return cache.remember(`htl:${lat.toFixed(3)},${lng.toFixed(3)}:${checkin}:${checkout}`, 720, async () => {
    const q = `[out:json][timeout:18];
(
  node["tourism"="hotel"]["name"](around:7000,${lat},${lng});
  way["tourism"="hotel"]["name"](around:7000,${lat},${lng});
);
out center 80;`;
    const items = await pois({ lat, lng, radius: 7000, geoapifyCats: 'accommodation.hotel', overpassQuery: q, tag: ':hotéis' });
    if (!items) return searchLinks(dest, checkin, checkout, pax, marker);

    const seen = new Set();
    const hotels = [];
    for (const it of items) {
      const t = it.tags || {};
      const name = (t.name || '').trim();
      if (!name || seen.has(name)) continue;
      seen.add(name);
      hotels.push({
        name,
        stars: parseInt(t.stars, 10) || 0,
        wikidata: t.wikidata || null,
        commons: /^File:/i.test(t.wikimedia_commons || '') ? t.wikimedia_commons.replace(/^File:/i, '') : null,
        photo: null,
        deeplink: bookingFor(name, dest, checkin, checkout, pax, marker),
      });
    }
    // melhores primeiro (estrelas, depois notoriedade); foto para o top
    hotels.sort((a, b) => b.stars - a.stars || (b.wikidata ? 1 : 0) - (a.wikidata ? 1 : 0));
    const top = hotels.slice(0, 15);
    if (!top.length) return searchLinks(dest, checkin, checkout, pax, marker);
    return top.map(({ wikidata, commons, fame, ...keep }) => keep);
  });
}

// deeplink de reserva do hotel concreto (pesquisa por nome + cidade) com marker
function bookingFor(name, dest, ci, co, pax, marker) {
  const q = new URLSearchParams({
    destination: `${name} ${dest}`.trim(),
    ...(ci ? { checkIn: ci } : {}), ...(co ? { checkOut: co } : {}),
    adults: String(pax || 1), ...(marker ? { marker } : {}),
  });
  return `https://search.hotellook.com/?${q.toString()}`;
}

// recurso: sem coords/OSM, devolve atalhos de pesquisa da cidade
function searchLinks(dest, ci, co, pax, marker) {
  const q = new URLSearchParams({
    destination: dest, ...(ci ? { checkIn: ci } : {}), ...(co ? { checkOut: co } : {}),
    adults: String(pax || 1), ...(marker ? { marker } : {}),
  });
  return [{ provider: 'Hotellook', sub: dest, linkOnly: true, deeplink: `https://search.hotellook.com/?${q.toString()}` }];
}

module.exports = { searchHotels, hasMarker: () => !!config.keys.hotelsMarker };
