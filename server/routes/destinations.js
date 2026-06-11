// Rotas de destinos: árvore para navegação manual + destino completo.
const express = require('express');
const router = express.Router();

const { makeDestination, groupByGeography } = require('../models/schema');
const flights = require('../services/flights');
const hotels = require('../services/hotels');
const activities = require('../services/activities');
const safety = require('../services/safety');
const geo = require('../services/geo');

// árvore continente > país > destino (navegação manual)
router.get('/destinations', async (req, res) => {
  res.json({ ok: true, tree: groupByGeography([]) });
});

// destino completo: monta todas as categorias + extras a partir dos serviços.
// É este o contrato que a página dedicada consome. Quando os serviços passarem
// a devolver dados reais, esta página enche-se sozinha.
router.post('/destination', async (req, res) => {
  const { name, lat, lng, cc, country, continent, iata, airport, origin, dateOut, dateBack, pax, nationality, currency } = req.body || {};
  try {
    const fromIata = parseIata(airport);
    const toIata = iata || null; // só existe quando o destino é um aeroporto
    const d = makeDestination({
      id: `${cc || 'XX'}-${String(name || '').toLowerCase().replace(/\s+/g, '-')}`,
      name, country: country || name, countryCode: cc || 'XX',
      continent: continent || '', lat, lng,
    });

    // métricas (distância/tempo a partir da origem)
    if (origin && typeof lat === 'number') {
      const km = geo.haversineKm({ lat: origin.lat, lng: origin.lng }, { lat, lng });
      d.metrics.distanceKm = Math.round(km);
      d.metrics.flightTimeH = +geo.flightTimeH(km).toFixed(2);
    }

    const nights = nightsBetween(dateOut, dateBack);
    // só voos + extras aqui (rápido). Hotéis/lazer/cultura (OSM, lentos) vão em /places.
    const [fl, ex] = await Promise.all([
      flights.searchFlights({ fromIata, toIata, departISO: dateOut, returnISO: dateBack, pax }),
      safety.getExtras({ countryCode: cc, country: country || name, lat, lng, dateOut, nationality }),
    ]);
    d.categories.flights = fl;
    d.extras = ex;

    // estimativa total: voo (real). Hotéis não têm preço grátis, somam-se só se existirem.
    const flightPrices = fl.map((f) => f.price).filter((p) => typeof p === 'number');
    const cheapFlight = flightPrices.length ? Math.min(...flightPrices) : 0;
    d.metrics.estTotal = cheapFlight || null;
    d.metrics.estBasis = 'voos';
    d.metrics.currency = (fl[0] && fl[0].currency) || 'EUR';

    res.json({ ok: true, destination: d, nights });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Falha a montar o destino.' });
  }
});

// hotéis + lazer + cultura (OpenStreetMap). Chamado À PARTE pela página, depois
// de ela já ter aberto — para o Overpass lento não segurar o ecrã todo.
router.post('/places', async (req, res) => {
  const { name, iata, lat, lng, dateOut, dateBack, pax } = req.body || {};
  try {
    // sequencial (não em paralelo): dois pedidos ao mesmo servidor Overpass ao
    // mesmo tempo competiam e davam timeout. Um de cada vez é mais fiável.
    const act = await activities.searchActivities({ lat, lng });
    const ht = await hotels.searchHotels({ city: name, iata, lat, lng, checkin: dateOut, checkout: dateBack, pax });
    res.json({ ok: true, hotels: ht, leisure: act.leisure, culture: act.culture, nights: nightsBetween(dateOut, dateBack) });
  } catch (e) {
    res.json({ ok: true, hotels: [], leisure: [], culture: [], nights: 1 });
  }
});

function nightsBetween(a, b) {
  if (!a || !b) return 1;
  const n = (new Date(b) - new Date(a)) / 864e5;
  return n > 0 ? Math.round(n) : 1;
}

// "LIS — Lisboa" -> "LIS"
function parseIata(s) {
  if (!s) return null;
  const m = /\b([A-Z]{3})\b/.exec(String(s).toUpperCase());
  return m ? m[1] : null;
}

module.exports = router;
