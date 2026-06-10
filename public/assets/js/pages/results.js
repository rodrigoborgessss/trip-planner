// Resultados (lazy).
// - Sem filtro ativo: destinos agrupados por país, em secções colapsáveis.
// - Filtro (distância/tempo/nome): 1º clique = ascendente, 2º = descendente,
//   3º = desliga (e voltam os grupos). Lista plana enquanto há filtro.
import { CONFIG } from '../config.js';
import { state, loadState, saveState } from '../state.js';
import { fmtKm, fmtH } from '../lib/format.js';
import { lazyPhoto } from '../ui/photo.js';

loadState();
const content = document.getElementById('content');
const countEl = document.getElementById('count');
let current = [];
let sortField = null;       // null | 'distance' | 'time' | 'name'
let sortDir = 'asc';        // 'asc' | 'desc'

const flag = (iso2) =>
  !iso2 || iso2.length !== 2 ? '📍' : iso2.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));

document.getElementById('sort').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  const f = b.dataset.sort;
  if (sortField !== f) { sortField = f; sortDir = 'asc'; }
  else if (sortDir === 'asc') sortDir = 'desc';
  else { sortField = null; sortDir = 'asc'; }     // 3º clique: desliga
  updateSortUI();
  draw();
});

function updateSortUI() {
  document.querySelectorAll('#sort button').forEach((b) => {
    const on = b.dataset.sort === sortField;
    b.classList.toggle('on', on);
    b.dataset.arrow = on ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';
    b.querySelector('.arr') && b.querySelector('.arr').remove();
    if (on) { const s = document.createElement('span'); s.className = 'arr'; s.textContent = sortDir === 'asc' ? ' ↑' : ' ↓'; b.appendChild(s); }
  });
}

fetchResults();

async function fetchResults() {
  try {
    const res = await fetch(`${CONFIG.apiBase}/search`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: state.origin, airport: state.airport, mode: state.mode,
        radiusKm: state.radiusKm, timeH: state.timeH, noLimit: state.noLimit,
      }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error();
    current = data.destinations;
    countEl.textContent = `${data.count} ao alcance${data.count > current.length ? ` · a mostrar ${current.length}` : ''}`;
    draw();
  } catch (e) {
    content.innerHTML = `<div class="empty">Não foi possível obter os destinos. Confirma que o servidor está a correr (<code>npm start</code>).</div>`;
  }
}

function draw() {
  if (!current.length) {
    content.innerHTML = `<div class="empty">Nada ao alcance com estes critérios.<br>Volta ao <a href="search.html">mapa</a> e aumenta o raio ou liga o "sem limite".</div>`;
    return;
  }
  content.innerHTML = '';
  if (sortField) drawFlat();
  else drawGrouped();
}

// lista plana ordenada
function drawFlat() {
  const list = [...current].sort(cmp);
  const grid = document.createElement('div');
  grid.className = 'grid';
  list.forEach((d) => grid.appendChild(card(d)));
  content.appendChild(grid);
}

function cmp(a, b) {
  let r;
  if (sortField === 'name') r = (a.city || a.name).localeCompare(b.city || b.name, 'pt');
  else if (sortField === 'time') r = a.flightTimeH - b.flightTimeH;
  else r = a.distanceKm - b.distanceKm;
  return sortDir === 'asc' ? r : -r;
}

// agrupado por país (colapsável)
function drawGrouped() {
  const groups = new Map();
  for (const d of current) {
    const key = d.country || '—';
    if (!groups.has(key)) groups.set(key, { cc: d.cc, items: [] });
    groups.get(key).items.push(d);
  }
  const ordered = [...groups.entries()].sort((a, b) => b[1].items.length - a[1].items.length);

  for (const [country, g] of ordered) {
    const sec = document.createElement('section');
    sec.className = 'cgroup collapsed';
    const head = document.createElement('button');
    head.className = 'cghead';
    head.innerHTML = `<span class="chev">⌄</span><span class="cgflag">${flag(g.cc)}</span><b>${country}</b><span class="cgn">${g.items.length}</span>`;
    const body = document.createElement('div');
    body.className = 'grid cgbody';
    g.items.sort((x, y) => x.distanceKm - y.distanceKm).forEach((d) => body.appendChild(card(d)));
    head.onclick = () => sec.classList.toggle('collapsed');
    sec.appendChild(head); sec.appendChild(body);
    content.appendChild(sec);
  }
}

function card(d) {
  const el = document.createElement('div');
  el.className = 'dcard';
  el.innerHTML = `
    <div class="banner"><span class="iata">${d.iata}</span><span class="flag-badge">${flag(d.cc)}</span></div>
    <div class="body">
      <h3>${d.city || d.name}</h3>
      <div class="country">${d.country}${d.continent ? ' · ' + d.continent : ''}</div>
      <div class="metrics">
        <div class="metric"><small>Distância</small><b>${fmtKm(d.distanceKm)}</b></div>
        <div class="metric"><small>Voo estimado</small><b>${fmtH(d.flightTimeH)}</b></div>
      </div>
      <div class="go">Ver voos e preços →</div>
    </div>`;
  el.onclick = () => open(d);
  lazyPhoto(el.querySelector('.banner'), d.city || d.name, d.country);
  return el;
}

function open(d) {
  state.selected = { kind: 'airport', name: d.city || d.name, country: d.country, cc: d.cc, lat: d.lat, lng: d.lng, continent: d.continent, iata: d.iata };
  saveState();
  location.href = 'destination.html';
}
