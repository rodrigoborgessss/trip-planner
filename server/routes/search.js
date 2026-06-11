// Pesquisa automática (lazy).
// A partir dos critérios do mapa, devolve os destinos candidatos: aeroportos
// ao alcance, com distância e tempo de voo já calculados, ordenados.
// NÃO chama a Duffel aqui — os voos/preços são pesquisados quando o utilizador
// abre cada destino (lazy). Assim não se rebenta o limite de pedidos.
const express = require('express');
const router = express.Router();
const geo = require('../services/geo');

// dataset de aeroportos (cacheado pelo require)
let AIRPORTS = [];
try { AIRPORTS = require('../../public/data/airports.json'); } catch (e) { AIRPORTS = []; }

const MAX = 5000; // teto de segurança (na prática, o mundo todo a partir da Europa ~3,4k)

router.post('/search', (req, res) => {
  const { origin, airport, mode, radiusKm, timeH, noLimit, sort } = req.body || {};
  if (!origin || typeof origin.lat !== 'number') {
    return res.status(400).json({ ok: false, error: 'Falta a origem.' });
  }
  const originIata = parseIata(airport);

  // raio efetivo (km). Sem limite => tudo.
  let reachKm = Infinity;
  if (!noLimit) {
    reachKm = mode === 'time'
      ? Math.max(0, (timeH || 0) - geo.OVERHEAD_H) * geo.CRUISE_KMH
      : (radiusKm || 0);
  }

  // calcular distância/tempo e filtrar pelo alcance
  const within = [];
  for (const a of AIRPORTS) {
    if (a.iata === originIata) continue;            // não sugerir o aeroporto de partida
    const km = geo.haversineKm({ lat: origin.lat, lng: origin.lng }, { lat: a.lat, lng: a.lng });
    if (km < 30 || km > reachKm) continue;          // nem o próprio sítio
    within.push({ ...a, distanceKm: Math.round(km), flightTimeH: +geo.flightTimeH(km).toFixed(2) });
  }

  // um destino por cidade (fica o maior; em empate, o mais perto)
  const byCity = new Map();
  for (const a of within) {
    const key = `${a.cc}|${a.city || a.name}`;
    const cur = byCity.get(key);
    if (!cur || (a.big && !cur.big) || (a.big === cur.big && a.distanceKm < cur.distanceKm)) {
      byCity.set(key, a);
    }
  }

  let list = [...byCity.values()];
  list.sort((x, y) => x.distanceKm - y.distanceKm); // distância e tempo dão a mesma ordem
  if (sort === 'name') list.sort((x, y) => (x.city || x.name).localeCompare(y.city || y.name, 'pt'));

  res.json({ ok: true, count: list.length, destinations: list.slice(0, MAX) });
});

// "LIS — Lisboa" -> "LIS"
function parseIata(s) {
  if (!s) return null;
  const m = /\b([A-Z]{3})\b/.exec(String(s).toUpperCase());
  return m ? m[1] : null;
}

module.exports = router;
