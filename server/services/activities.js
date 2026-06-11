// Lazer e cultura via OpenStreetMap / Overpass (grátis, sem chave).
// Ordena por POPULARIDADE (presença de Wikidata/Wikipédia é forte sinal de
// notoriedade), traz muitos, e enriquece os melhores com FOTO (Wikidata/Commons).
const cache = require('../cache/store');
const { pois } = require('../lib/poi');
const { enrichFame } = require('../lib/images');

const CULTURE = new Set(['museum', 'gallery', 'artwork', 'attraction']);
const TOP_TOURISM = new Set(['attraction', 'museum', 'viewpoint', 'gallery', 'theme_park', 'zoo']);
const PER_LIST = 30;       // quantos mostrar por lista
const PHOTOS_PER_LIST = 18; // a quantos vamos buscar foto

async function searchActivities({ lat, lng }) {
  if (typeof lat !== 'number') return { leisure: [], culture: [] };

  return cache.remember(`act:${lat.toFixed(3)},${lng.toFixed(3)}`, 1440, async () => {
    const q = `[out:json][timeout:18];
(
  node["tourism"~"^(attraction|museum|gallery|viewpoint|artwork|zoo|theme_park|aquarium)$"](around:8000,${lat},${lng});
  way["tourism"~"^(attraction|museum|gallery|theme_park|zoo)$"](around:8000,${lat},${lng});
  node["historic"]["name"](around:8000,${lat},${lng});
  node["leisure"~"^(park|garden|nature_reserve)$"]["name"](around:8000,${lat},${lng});
);
out center 150;`;

    const items = await pois({
      lat, lng, radius: 8000,
      geoapifyCats: 'tourism.sights,entertainment.museum,entertainment.culture,leisure.park,national_park,heritage',
      overpassQuery: q, tag: ':atividades',
    });
    if (!items) return { leisure: [], culture: [] };

    const seen = new Set();
    const leisure = [], culture = [];
    for (const it of items) {
      const tags = it.tags || {};
      const name = (tags.name || tags['name:pt'] || tags['name:en'] || '').trim();
      if (!name || seen.has(name)) continue;
      seen.add(name);
      const cult = isCulture(tags);
      const entry = {
        name,
        category: String(tags.tourism || tags.historic || tags.leisure || 'ponto de interesse').replace(/_/g, ' '),
        lat: it.lat,
        lng: it.lng,
        score: popularity(tags),
        fame: 0,
        wikidata: tags.wikidata || null,
        commons: /^File:/i.test(tags.wikimedia_commons || '') ? tags.wikimedia_commons.replace(/^File:/i, '') : null,
        photo: null,
        source: 'OpenStreetMap',
        ...(cult ? { group: cultureGroup(tags) } : {}),
      };
      (cult ? culture : leisure).push(entry);
    }

    // 1) pré-seleção barata por heurística (limita quanto vamos ao Wikidata)
    const pre = (arr) => arr.sort((a, b) => b.score - a.score).slice(0, 60);
    const Lp = pre(leisure), Cp = pre(culture);
    // 2) Wikidata: FAMA (nº de Wikipédias) para os que têm wikidata
    await enrichFame([...Lp, ...Cp]);
    // 3) ordenar pelos mais famosos primeiro (fama real; depois heurística)
    const rank = (arr) => arr.sort((a, b) => (b.fame - a.fame) || (b.score - a.score)).slice(0, PER_LIST);
    return { leisure: clean(rank(Lp)), culture: clean(rank(Cp)) };
  });
}

const TYPE_WEIGHT = {
  museum: 3, gallery: 3, attraction: 2, zoo: 2, theme_park: 2, aquarium: 2,
  park: 2, garden: 2, nature_reserve: 2, artwork: 1, viewpoint: 0,
};
function popularity(t) {
  const ty = t.tourism || t.leisure || (t.historic ? 'historic' : '');
  const tw = TYPE_WEIGHT[ty] != null ? TYPE_WEIGHT[ty] : (t.historic ? 2 : 0);
  return (t.wikidata ? 5 : 0) + (t.wikipedia ? 3 : 0)
    + (t.website || t['contact:website'] ? 1 : 0)
    + (t.wikimedia_commons || t.image ? 1 : 0)
    + tw;
}

// categoria da cultura (para agrupar no frontend)
function cultureGroup(t) {
  if (t.tourism === 'museum') return 'Museus';
  if (t.tourism === 'gallery' || t.tourism === 'artwork') return 'Arte';
  const h = t.historic;
  if (['castle', 'fort', 'fortress', 'city_gate', 'citywalls', 'tower'].includes(h)) return 'Castelos e fortes';
  if (['monument', 'memorial'].includes(h)) return 'Monumentos e memoriais';
  if (['church', 'monastery', 'chapel', 'cathedral'].includes(h) || t.amenity === 'place_of_worship' || t.religion) return 'Religioso';
  if (['archaeological_site', 'ruins', 'ruin'].includes(h)) return 'Sítios históricos';
  return 'Outros';
}
function isCulture(t) { return !!t.historic || CULTURE.has(t.tourism); }
function clean(arr) { return arr.map(({ score, fame, wikidata, commons, ...keep }) => keep); }


module.exports = { searchActivities, hasToken: () => true };
