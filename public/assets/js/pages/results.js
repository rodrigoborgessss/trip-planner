// Página de resultados (lazy): mostra os destinos ao alcance com distância e
// tempo. O preço/voos só são pesquisados ao abrir cada destino.
import { CONFIG } from '../config.js';
import { state, loadState, saveState } from '../state.js';
import { fmtKm, fmtH } from '../lib/format.js';
import { lazyPhoto } from '../ui/photo.js';

loadState();
const content = document.getElementById('content');
const countEl = document.getElementById('count');
let current = [];
let sort = 'distance';

const flag = (iso2) =>
  !iso2 || iso2.length !== 2 ? '📍' : iso2.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));

document.getElementById('sort').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  sort = b.dataset.sort;
  document.querySelectorAll('#sort button').forEach((x) => x.classList.toggle('on', x === b));
  fetchResults();
});

fetchResults();

async function fetchResults() {
  try {
    const res = await fetch(`${CONFIG.apiBase}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: state.origin, airport: state.airport, mode: state.mode,
        radiusKm: state.radiusKm, timeH: state.timeH, noLimit: state.noLimit, sort,
      }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error();
    current = data.destinations;
    render(data.count);
  } catch (e) {
    content.innerHTML = `<div class="empty">Não foi possível obter os destinos. Confirma que o servidor está a correr (<code>npm start</code>).</div>`;
  }
}

function render(count) {
  countEl.textContent = `${count} ao alcance${count > current.length ? ` · a mostrar ${current.length}` : ''}`;
  if (!current.length) {
    content.innerHTML = `<div class="empty">Nada ao alcance com estes critérios.<br>Volta ao <a href="search.html">mapa</a> e aumenta o raio ou liga o "sem limite".</div>`;
    return;
  }
  const grid = document.createElement('div');
  grid.className = 'grid';
  for (const d of current) {
    const card = document.createElement('div');
    card.className = 'dcard';
    card.innerHTML = `
      <div class="banner">
        <span class="iata">${d.iata}</span>
        <span class="flag-badge">${flag(d.cc)}</span>
      </div>
      <div class="body">
        <h3>${d.city || d.name}</h3>
        <div class="country">${d.country}${d.continent ? ' · ' + d.continent : ''}</div>
        <div class="metrics">
          <div class="metric"><small>Distância</small><b>${fmtKm(d.distanceKm)}</b></div>
          <div class="metric"><small>Voo estimado</small><b>${fmtH(d.flightTimeH)}</b></div>
        </div>
        <div class="go">Ver voos e preços →</div>
      </div>`;
    card.onclick = () => open(d);
    grid.appendChild(card);
    lazyPhoto(card.querySelector('.banner'), d.city || d.name, d.country);
  }
  content.innerHTML = '';
  content.appendChild(grid);
}

function open(d) {
  state.selected = {
    kind: 'airport', name: d.city || d.name, country: d.country, cc: d.cc,
    lat: d.lat, lng: d.lng, continent: d.continent, iata: d.iata,
  };
  saveState();
  location.href = 'destination.html';
}
