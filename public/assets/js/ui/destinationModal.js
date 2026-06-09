// Modal de destino: abre centrado ao clicar num país OU num aeroporto/cidade,
// com distância e tempo de voo estimado. Guarda o destino escolhido no estado
// para a página dedicada o usar.
import { fmtKm, fmtH } from '../lib/format.js';
import { estimatePoint } from '../map/reach.js';
import { state, saveState } from '../state.js';

function flagEmoji(iso2) {
  if (!iso2 || iso2.length !== 2) return '📍';
  return iso2.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}
const $ = (id) => document.getElementById(id);

export function initModal() {
  $('destClose').onclick = close;
  $('modalBackdrop').onclick = close;
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  $('dcOpenFull').onclick = () => {
    saveState();
    location.href = 'destination.html';
  };
}

function show(sel, est) {
  state.selected = sel;
  saveState();
  $('dcFlag').textContent = flagEmoji(sel.cc);
  $('dcName').textContent = sel.name;
  $('dcSub').textContent = sel.sub;
  $('dcDist').textContent = fmtKm(est.km);
  $('dcTime').textContent = fmtH(est.hours);
  $('modalBackdrop').classList.add('show');
  $('destCard').classList.add('show');
}

// clique num país (fallback quando não há aeroporto)
export function openCountry(feature, cc) {
  let c;
  try { c = turf.centroid(feature).geometry.coordinates; } catch (e) { return; }
  const name = feature.properties.name || feature.id;
  const code = (cc || feature.properties.iso_a2 || '').toUpperCase();
  show(
    { kind: 'country', name, country: name, cc: code, lat: c[1], lng: c[0], continent: '', sub: `desde ${airport()}` },
    estimatePoint(c[1], c[0])
  );
}

// clique num aeroporto/cidade
export function openAirport(a) {
  show(
    {
      kind: 'airport', name: a.city || a.name, country: a.country, cc: a.cc,
      lat: a.lat, lng: a.lng, continent: a.continent, iata: a.iata,
      sub: `${a.iata} · ${a.country} · desde ${airport()}`,
    },
    estimatePoint(a.lat, a.lng)
  );
}

export function close() {
  $('modalBackdrop').classList.remove('show');
  $('destCard').classList.remove('show');
}
function airport() { return (state.airport || '—').split(' — ')[0]; }
