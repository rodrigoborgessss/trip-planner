// Schema normalizado — o contrato de dados único da app.
// Todos os adaptadores de serviço (voos, hotéis, etc.) devem converter a
// resposta da sua API para esta forma. Assim trocar de fornecedor não obriga
// a mexer no frontend nem no resto do backend.

function makeDestination({ id, name, country, countryCode, continent, lat, lng, photo, flag }) {
  return {
    id,
    name,
    country,
    countryCode,            // ISO-2 (ex.: 'PT')
    continent,
    lat,
    lng,
    photo: photo || null,
    flag: flag || null,

    // resumo mostrado no cartão da lista
    metrics: {
      distanceKm: null,
      flightTimeH: null,
      estTotal: null,       // voos + hotéis + deslocação
      currency: 'EUR',
    },

    // uma página por categoria no destino
    categories: {
      flights: [],   // { id, airline, from, to, departISO, arriveISO, durationH, stops, price, currency, deeplink }
      hotels: [],    // { id, name, stars, pricePerNight, currency, rating, lat, lng, photo, deeplink }
      transport: [], // { id, type, from, to, price, currency, provider }
      leisure: [],   // { id, name, category, rating, price, lat, lng, photo, source }
      culture: [],   // { id, name, category, rating, lat, lng, photo, source }
    },

    // página dedicada de extras
    extras: {
      safety: null,      // { score, level, source, updatedISO }
      advisories: [],    // { type, text, source, updatedISO }
      news: [],          // { title, url, source, publishedISO, sentiment }
      visa: null,        // { required, notes, source }
      weather: null,     // { tempC, condition, season }
      sentiment: null,   // { score, label }
    },

    updatedISO: new Date().toISOString(),
  };
}

// Agrupa destinos em árvore continente > país > destinos (para a navegação manual e filtros).
function groupByGeography(destinations) {
  const tree = {};
  for (const d of destinations) {
    tree[d.continent] = tree[d.continent] || {};
    tree[d.continent][d.country] = tree[d.continent][d.country] ||
      { countryCode: d.countryCode, flag: d.flag, destinations: [] };
    tree[d.continent][d.country].destinations.push(d);
  }
  return tree;
}

module.exports = { makeDestination, groupByGeography };
