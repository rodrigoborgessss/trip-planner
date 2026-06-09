// Adaptador de voos — Duffel (https://duffel.com/docs).
// Sem DUFFEL_TOKEN definido devolve dados de exemplo, para a app continuar a
// demonstrar. Com token, faz a pesquisa real e normaliza para o schema.
//
// Notas:
// - O portal self-service da Amadeus encerra a 17/07/2026; a Duffel é a migração.
// - A Duffel é full-service (reservas via API), não dá deeplink de afiliado.
//   Por isso 'deeplink' fica null e a reserva é um passo à parte (criar order).
const config = require('../config');

const ENDPOINT = 'https://api.duffel.com/air/offer_requests?return_offers=true&supplier_timeout=15000';
const VERSION = process.env.DUFFEL_VERSION || 'v2';
const LIMIT = 8;          // nº de ofertas a devolver
const DIRECT_ONLY = false; // true => só voos diretos (max_connections: 0)

// from/to são códigos IATA (ex.: 'LIS', 'NRT'). pax = nº de adultos.
async function searchFlights({ fromIata, toIata, departISO, returnISO, pax }) {
  if (!fromIata || !toIata) return [];           // sem aeroporto de destino, não há pesquisa
  if (!config.keys.duffel) return mock({ fromIata, toIata, departISO, pax });

  const slices = [{ origin: fromIata, destination: toIata, departure_date: departISO }];
  if (returnISO) slices.push({ origin: toIata, destination: fromIata, departure_date: returnISO });

  const data = {
    slices,
    passengers: Array.from({ length: Math.max(1, pax || 1) }, () => ({ type: 'adult' })),
    cabin_class: 'economy',
  };
  if (DIRECT_ONLY) data.max_connections = 0;

  try {
    const r = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.keys.duffel}`,
        'Duffel-Version': VERSION,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ data }),
    });
    if (!r.ok) {
      console.error('Duffel respondeu', r.status, await safeText(r));
      return [];
    }
    const json = await r.json();
    const offers = (json.data && json.data.offers) || [];
    return offers
      .slice()
      .sort((a, b) => parseFloat(a.total_amount) - parseFloat(b.total_amount))
      .slice(0, LIMIT)
      .map(normalizeOffer);
  } catch (err) {
    console.error('Erro a contactar a Duffel:', err.message);
    return [];
  }
}

function normalizeOffer(o) {
  const slice = (o.slices && o.slices[0]) || {};
  const segs = slice.segments || [];
  const first = segs[0] || {};
  const last = segs[segs.length - 1] || {};
  return {
    id: o.id,
    airline: (o.owner && o.owner.name) || 'Companhia',
    from: (first.origin && first.origin.iata_code) || '',
    to: (last.destination && last.destination.iata_code) || '',
    departISO: first.departing_at || null,
    arriveISO: last.arriving_at || null,
    durationH: isoDurationToHours(slice.duration),
    stops: Math.max(0, segs.length - 1),
    price: Math.round(parseFloat(o.total_amount)),
    currency: o.total_currency || 'EUR',
    deeplink: null, // Duffel: reserva via API (criar order), não deeplink
  };
}

// "PT14H30M" -> 14.5
function isoDurationToHours(d) {
  if (!d) return null;
  const m = /P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/.exec(d);
  if (!m) return null;
  const [, days, hours, mins] = m.map((x) => (x ? Number(x) : 0));
  return +((days * 24) + hours + mins / 60).toFixed(2);
}

async function safeText(r) { try { return (await r.text()).slice(0, 300); } catch { return ''; } }

function mock({ fromIata, toIata, departISO, pax }) {
  return [{
    id: 'mock-1', airline: 'Exemplo Air', from: fromIata, to: toIata,
    departISO, arriveISO: departISO, durationH: 2.5, stops: 0,
    price: 120 * Math.max(1, pax || 1), currency: 'EUR', deeplink: null,
  }];
}

module.exports = { searchFlights, hasToken: () => !!config.keys.duffel };
