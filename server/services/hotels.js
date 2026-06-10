// Hotéis via Hotellook / Travelpayouts (afiliado com deeplink — sem processar
// pagamentos). Conta gratuita em travelpayouts.com dá o token e o "marker".
// Sem HOTELS_TOKEN devolve exemplos.
//
// Modelo: mostramos preços indicativos (cache do Hotellook) e mandamos o
// utilizador reservar no parceiro pelo deeplink com o teu marker (= comissão).
//
// TODO confirmar os campos exatos na doc atual do Travelpayouts/Hotellook ao
// ligares o token; o mapeamento está isolado em normalizeHotel().
const config = require('../config');
const cache = require('../cache/store');

async function searchHotels({ city, lat, lng, checkin, checkout, pax, currency }) {
  if (!config.keys.hotels) return mock({ lat, lng });
  const cur = (currency || 'EUR').toLowerCase();
  const loc = city || (lat != null ? `${lat},${lng}` : '');
  if (!loc) return [];

  return cache.remember(`htl:${loc}:${checkin}:${checkout}:${cur}`, 180, async () => {
    try {
      const u = `https://engine.hotellook.com/api/v2/cache.json`
        + `?location=${encodeURIComponent(loc)}`
        + (checkin ? `&checkIn=${checkin}` : '') + (checkout ? `&checkOut=${checkout}` : '')
        + `&currency=${cur}&limit=10&token=${config.keys.hotels}`;
      const r = await fetch(u);
      if (!r.ok) { console.error('[hotéis] Hotellook', r.status); return []; }
      const data = await r.json();
      const list = Array.isArray(data) ? data : (data.hotels || []);
      return list.slice(0, 10).map((h) => normalizeHotel(h, { city, checkin, checkout, pax, cur }));
    } catch (e) {
      console.error('[hotéis] erro:', e.message);
      return [];
    }
  });
}

function normalizeHotel(h, ctx) {
  const name = h.hotelName || h.name || 'Hotel';
  const price = h.priceFrom || h.priceAvg || h.price || null;
  return {
    id: h.hotelId || h.id || name,
    name,
    stars: h.stars || 0,
    pricePerNight: price ? Math.round(price) : null,
    currency: (ctx.cur || 'eur').toUpperCase(),
    rating: null,
    lat: h.location && h.location.geo && h.location.geo.lat,
    lng: h.location && h.location.geo && h.location.geo.lon,
    photo: null,
    deeplink: affiliate(name, ctx),
  };
}

// deeplink de afiliado para o Hotellook (search) com o teu marker
function affiliate(name, ctx) {
  const marker = config.keys.hotelsMarker;
  if (!marker) return null;
  const q = new URLSearchParams({
    destination: ctx.city || name,
    ...(ctx.checkin ? { checkIn: ctx.checkin } : {}),
    ...(ctx.checkout ? { checkOut: ctx.checkout } : {}),
    adults: String(ctx.pax || 1),
    marker,
  });
  return `https://search.hotellook.com/?${q.toString()}`;
}

function mock({ lat, lng }) {
  return [{
    id: 'h-1', name: 'Hotel Exemplo', stars: 4, pricePerNight: 80, currency: 'EUR',
    rating: 8.6, lat, lng, photo: null, deeplink: null,
  }];
}

module.exports = { searchHotels, hasToken: () => !!config.keys.hotels };
