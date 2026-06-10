// Navegação manual: continente > país > destino.
// Servida em níveis para não enviar a árvore toda de uma vez.
//   GET /api/browse                  -> continentes (com contagem de países)
//   GET /api/browse?continent=Europa -> países desse continente
//   GET /api/browse?cc=PT            -> destinos (aeroportos) desse país
const express = require('express');
const router = express.Router();

let AIRPORTS = [];
try { AIRPORTS = require('../../public/data/airports.json'); } catch (e) { AIRPORTS = []; }
const { continentOf } = require('../lib/region');

router.get('/browse', (req, res) => {
  const { continent, cc } = req.query;

  // nível 3: destinos de um país
  if (cc) {
    const list = AIRPORTS.filter((a) => a.cc === cc.toUpperCase())
      .sort((x, y) => (y.routes || 0) - (x.routes || 0))
      .map((a) => ({ iata: a.iata, name: a.name, city: a.city, lat: a.lat, lng: a.lng, big: a.big, routes: a.routes }));
    return res.json({ ok: true, level: 'destinations', cc: cc.toUpperCase(), destinations: list });
  }

  // nível 2: países de um continente
  if (continent) {
    const map = new Map();
    for (const a of AIRPORTS) {
      if (continentOf(a.cc, a.continent) !== continent) continue;
      const cur = map.get(a.cc) || { cc: a.cc, country: a.country, destinations: 0 };
      cur.destinations += 1;
      map.set(a.cc, cur);
    }
    const countries = [...map.values()].sort((x, y) => x.country.localeCompare(y.country, 'pt'));
    return res.json({ ok: true, level: 'countries', continent, countries });
  }

  // nível 1: continentes
  const map = new Map();
  for (const a of AIRPORTS) {
    const cont = continentOf(a.cc, a.continent);
    const cur = map.get(cont) || { name: cont, countries: new Set(), destinations: 0 };
    cur.countries.add(a.cc);
    cur.destinations += 1;
    map.set(cont, cur);
  }
  const order = ['Europa', 'África', 'Ásia', 'América do Norte', 'América do Sul', 'Oceânia'];
  const continents = [...map.values()]
    .map((c) => ({ name: c.name, countries: c.countries.size, destinations: c.destinations }))
    .sort((x, y) => order.indexOf(x.name) - order.indexOf(y.name));
  res.json({ ok: true, level: 'continents', continents });
});

module.exports = router;
