// Núcleo do alcance.
// A zona é uma "bolha" geodésica (distância real). No mapa Mercator, quando o
// raio chega a um polo, a zona fecha-se pelo topo do mapa para se ler como
// "tudo o que está deste lado está ao alcance" — em vez da parábola aberta.
//
// O círculo redesenha AO VIVO com o slider; a pintura dos países corre logo a
// seguir (com pequeno atraso) para o arrasto ficar suave.
import { CONFIG } from '../config.js';
import { state } from '../state.js';

let map = null;
let fillLayer = null;      // preenchimento da zona
let edgeLayer = null;      // contorno tracejado (só o bordo real)
let baseLayer = null;      // países clicáveis (invisíveis)
let highlights = [];       // partes alcançáveis pintadas
let worldGeo = null;
let lastFill = null;       // polígono da zona (reutilizado pela pintura)
let paintTimer = null;
let onCountrySelect = () => {};
let onCountChange = () => {};

export function initReach(_map, { onCountry, onCount }) {
  map = _map;
  onCountrySelect = onCountry || (() => {});
  onCountChange = onCount || (() => {});
  loadCountries();
}

export function currentRadiusKm() {
  if (state.noLimit) return Infinity;
  if (state.mode === 'radius') return state.radiusKm;
  return Math.max(0, state.timeH - CONFIG.flight.overheadH) * CONFIG.flight.cruiseKmh;
}
const accent = () => CONFIG.colors[state.mode];

export function updateReach({ live = false } = {}) {
  if (state.noLimit) { drawWorld(); return; }
  drawZone();
  clearTimeout(paintTimer);
  if (live) paintTimer = setTimeout(paintCountries, 120);
  else paintCountries();
}

// sem limite: tinge o mundo todo e marca todos os países como alcançáveis
function drawWorld() {
  const world = turf.polygon([[[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]]]);
  lastFill = world;
  if (fillLayer) fillLayer.remove();
  if (edgeLayer) edgeLayer.remove();
  highlights.forEach((l) => l.remove());
  highlights = [];
  fillLayer = L.geoJSON(world, {
    style: { color: 'transparent', weight: 0, fillColor: accent(), fillOpacity: 0.07 },
    interactive: false,
  }).addTo(map);
  state.reachableCountries = worldGeo ? worldGeo.features.map((f) => f.properties.name || f.id) : [];
  onCountChange(state.reachableCountries.length || '—');
}

// ---- construir a zona, tratando polos e antimeridiano ----
function buildReach(center, radiusKm) {
  const [lng, lat] = center;
  const toNorth = turf.distance(turf.point(center), turf.point([lng, 90]), { units: 'kilometers' });
  const toSouth = turf.distance(turf.point(center), turf.point([lng, -90]), { units: 'kilometers' });
  const enclN = radiusKm >= toNorth;
  const enclS = radiusKm >= toSouth;

  // bordo: pontos a distância radiusKm em todos os rumos
  const raw = [];
  for (let b = 0; b <= 360; b += 1) {
    raw.push(turf.destination(turf.point(center), radiusKm, b, { units: 'kilometers' }).geometry.coordinates);
  }

  // caso global (ambos os polos dentro): preenche o mundo
  if (enclN && enclS) {
    return { fill: turf.polygon([[[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]]]), edge: null };
  }

  // sem polo: círculo simples
  if (!enclN && !enclS) {
    const ring = raw.slice();
    if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) ring.push(ring[0]);
    return { fill: turf.polygon([ring]), edge: turf.lineString(raw) };
  }

  // um polo dentro: fecha a calote por cima (ou por baixo)
  const poleLat = enclN ? 90 : -90;
  const wrapped = raw.map(([x, y]) => [((x + 540) % 360) - 180, y]).sort((a, b) => a[0] - b[0]);
  const fillRing = [[-180, poleLat], ...wrapped, [180, poleLat], [-180, poleLat]];
  return { fill: turf.polygon([fillRing]), edge: turf.lineString(wrapped) };
}

function drawZone() {
  const km = currentRadiusKm();
  const { fill, edge } = buildReach([state.origin.lng, state.origin.lat], km);
  lastFill = fill;

  if (fillLayer) fillLayer.remove();
  if (edgeLayer) edgeLayer.remove();

  fillLayer = L.geoJSON(fill, {
    style: { color: 'transparent', weight: 0, fillColor: accent(), fillOpacity: 0.12 },
    interactive: false,
  }).addTo(map);

  if (edge) {
    edgeLayer = L.geoJSON(edge, {
      style: { color: accent(), weight: 1.5, dashArray: '4 4', fill: false },
      interactive: false,
    }).addTo(map);
  }
}

function paintCountries() {
  if (!lastFill) return;
  highlights.forEach((l) => l.remove());
  highlights = [];
  if (!worldGeo) { onCountChange('—'); return; }

  const fbb = turf.bbox(lastFill);
  const reachable = [];
  for (const f of worldGeo.features) {
    try {
      if (!bboxOverlap(fbb, turf.bbox(f))) continue;
      const inter = turf.intersect(lastFill, f);
      if (!inter) continue;
      reachable.push(f.properties.name || f.id);
      const layer = L.geoJSON(inter, {
        style: { color: accent(), weight: 1, fillColor: accent(), fillOpacity: 0.3 },
      }).addTo(map);
      layer.on('click', (ev) => { L.DomEvent.stopPropagation(ev); onCountrySelect(f, ev.latlng); });
      highlights.push(layer);
    } catch (e) { /* topologia inválida — ignora */ }
  }
  state.reachableCountries = reachable;
  onCountChange(reachable.length);
}

function loadCountries() {
  fetch(CONFIG.countriesGeoJSON)
    .then((r) => r.json())
    .then((geo) => {
      worldGeo = geo;
      baseLayer = L.geoJSON(geo, {
        style: { color: 'transparent', weight: 0, fillColor: '#fff', fillOpacity: 0 },
        onEachFeature: (f, layer) =>
          layer.on('click', (ev) => { L.DomEvent.stopPropagation(ev); onCountrySelect(f, ev.latlng); }),
      }).addTo(map);
      updateReach();
    })
    .catch(() => updateReach());
}

// Surpresa: ação 1 — sortear país (dentro do alcance, ou de todos).
export function surprise() {
  let pool = state.reachableCountries;
  let note = 'dentro do teu alcance';
  if (!pool || !pool.length) {
    if (!worldGeo) return null;
    pool = worldGeo.features.map((f) => f.properties.name || f.id);
    note = 'em todos os destinos';
  }
  const name = pool[Math.floor(Math.random() * pool.length)];
  const feature = worldGeo && worldGeo.features.find((f) => (f.properties.name || f.id) === name);
  if (feature) {
    try { const c = turf.centroid(feature).geometry.coordinates; map.flyTo([c[1], c[0]], 5, { duration: 1.2 }); } catch (e) {}
  }
  return { name, note, feature };
}

function bboxOverlap(a, b) { return !(b[0] > a[2] || b[2] < a[0] || b[1] > a[3] || b[3] < a[1]); }

// distância + tempo de voo estimado a partir da origem
export function estimatePoint(lat, lng) {
  const km = turf.distance(
    turf.point([state.origin.lng, state.origin.lat]),
    turf.point([lng, lat]),
    { units: 'kilometers' }
  );
  return { km, hours: km / CONFIG.flight.cruiseKmh + CONFIG.flight.overheadH };
}
export function estimateTo(feature) {
  const c = turf.centroid(feature).geometry.coordinates;
  return estimatePoint(c[1], c[0]);
}
