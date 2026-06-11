// Camada de aeroportos/cidades.
// Mostra aeroportos reais (OurAirports) que estão ao alcance e dentro da área
// visível. Aparecem a partir de um zoom; os médios entram a partir de outro.
// Limita o número de marcadores para o mapa não engasgar.
import { CONFIG } from '../config.js';
import { state } from '../state.js';
import { currentRadiusKm, estimatePoint } from './reach.js';

let map = null;
let all = [];               // todos os aeroportos carregados
let byCC = {};              // aeroporto principal por país (ISO-2): o de mais rotas
let group = null;           // camada de marcadores
let onSelect = () => {};

export function initAirports(_map, onAirportSelect) {
  map = _map;
  onSelect = onAirportSelect || (() => {});
  group = L.layerGroup().addTo(map);

  fetch(CONFIG.airports.url)
    .then((r) => r.json())
    .then((data) => { all = data; indexByCountry(); refresh(); })
    .catch(() => {});

  map.on('moveend zoomend', refresh);
}

function indexByCountry() {
  byCC = {};
  for (const a of all) {
    const cur = byCC[a.cc];
    if (!cur || (a.routes || 0) > (cur.routes || 0)) byCC[a.cc] = a;
  }
}

// aeroporto principal de um país (ISO-2). Usado para auto-selecionar ao
// clicar num país, para nunca avançar sem aeroporto.
export function getMainAirportByCC(cc) {
  return (cc && byCC[cc.toUpperCase()]) || null;
}

// aeroporto do país MAIS PRÓXIMO de um ponto (lat,lng) — essencial para ilhas:
// clicar na Madeira dá Funchal, não Lisboa; Tenerife dá Tenerife, não Barcelona.
export function getNearestAirportByCC(cc, lat, lng) {
  if (!cc || typeof lat !== 'number') return getMainAirportByCC(cc);
  const c = cc.toUpperCase();
  let best = null, bestD = Infinity;
  for (const a of all) {
    if (a.cc !== c) continue;
    const d = hav(lat, lng, a.lat, a.lng);
    if (d < bestD) { bestD = d; best = a; }
  }
  return best || getMainAirportByCC(cc);
}

function hav(la1, lo1, la2, lo2) {
  const R = 6371, r = (x) => x * Math.PI / 180;
  const dLa = r(la2 - la1), dLo = r(lo2 - lo1);
  const x = Math.sin(dLa / 2) ** 2 + Math.cos(r(la1)) * Math.cos(r(la2)) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function refresh() {
  if (!map || !all.length) return;
  group.clearLayers();

  const zoom = map.getZoom();
  if (zoom < CONFIG.airports.showFrom) return; // longe demais: só zona/países

  const bounds = map.getBounds();
  const radius = currentRadiusKm();
  const includeMedium = zoom >= CONFIG.airports.mediumFrom;

  const visible = [];
  for (const a of all) {
    if (!a.big && !includeMedium) continue;
    if (!bounds.contains([a.lat, a.lng])) continue;
    const { km } = estimatePoint(a.lat, a.lng);
    if (km > radius) continue; // só ao alcance
    a._km = km;
    visible.push(a);
    if (visible.length > CONFIG.airports.maxMarkers * 1.5) break;
  }

  // grandes primeiro, depois mais próximos
  visible.sort((x, y) => (Number(y.big) - Number(x.big)) || (x._km - y._km));
  const color = CONFIG.colors[state.mode];

  for (const a of visible.slice(0, CONFIG.airports.maxMarkers)) {
    const m = L.circleMarker([a.lat, a.lng], {
      radius: a.big ? 5 : 3.5,
      color: '#0E1820',
      weight: 1.5,
      fillColor: color,
      fillOpacity: 0.95,
    }).addTo(group);
    m.bindTooltip(`${a.iata} · ${a.city || a.name}`, { direction: 'top', offset: [0, -4] });
    m.on('click', (ev) => { L.DomEvent.stopPropagation(ev); onSelect(a); });
  }
}
