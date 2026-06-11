// Navegação manual: continente > país > destino.
// Cada nível é pedido ao backend (/api/browse) à medida que o utilizador desce.
// Ao escolher um destino, comporta-se como a apresentação automática.
import { CONFIG } from '../config.js';
import { state, loadState, saveState } from '../state.js';
import { lazyPhoto } from '../ui/photo.js';
import { t } from '../i18n.js';
import { flagImg } from '../lib/flag.js';

loadState();
const content = document.getElementById('content');
const crumbs = document.getElementById('crumbs');

const flag = (iso2) =>
  !iso2 || iso2.length !== 2 ? '🏳️' : iso2.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));

let path = []; // breadcrumb: [{label, fn}]

showContinents();

async function api(qs) {
  const r = await fetch(`${CONFIG.apiBase}/browse${qs}`);
  if (!r.ok) throw new Error();
  return r.json();
}

function setCrumbs() {
  crumbs.innerHTML = path.map((p, i) =>
    `<a href="#" data-i="${i}">${p.label}</a>`).join(' › ') || '';
  crumbs.querySelectorAll('a').forEach((a) =>
    (a.onclick = (e) => { e.preventDefault(); const go = path[+a.dataset.i] && path[+a.dataset.i].go; if (go) go(); }));
}

function loading(msg) { content.innerHTML = `<p class="state">${msg}</p>`; }

async function showContinents() {
  path = [{ label: 'Continentes', go: showContinents }];
  setCrumbs();
  loading('A carregar continentes…');
  try {
    const { continents } = await api('');
    grid(continents.map((c) => tile(
      c.name, `${c.countries} países · ${c.destinations} destinos`, '🌍',
      () => showCountries(c.name)
    )));
  } catch (e) { fail(); }
}

async function showCountries(continent) {
  path = [{ label: 'Continentes', go: showContinents }, { label: continent, go: () => showCountries(continent) }];
  setCrumbs();
  loading(`A carregar países de ${continent}…`);
  try {
    const { countries } = await api(`?continent=${encodeURIComponent(continent)}`);
    grid(countries.map((c) => tile(
      c.country, `${c.destinations} destino(s)`, flagImg(c.cc, 'lg'),
      () => showDestinations(c.cc, c.country)
    )));
  } catch (e) { fail(); }
}

async function showDestinations(cc, country) {
  path = path.slice(0, 2).concat({ label: country, go: () => showDestinations(cc, country) });
  setCrumbs();
  loading(`A carregar destinos de ${country}…`);
  try {
    const { destinations } = await api(`?cc=${encodeURIComponent(cc)}`);
    const g = document.createElement('div');
    g.className = 'grid';
    for (const d of destinations) {
      const card = document.createElement('div');
      card.className = 'dcard';
      card.innerHTML = `
        <div class="banner"><span class="iata">${d.iata}</span><span class="flag-badge">${flagImg(cc)}</span></div>
        <div class="body">
          <h3>${d.city || d.name}</h3>
          <div class="country">${d.name}</div>
          <div class="go">${t('modal.viewDest')} →</div>
        </div>`;
      card.onclick = () => open(d, cc, country);
      g.appendChild(card);
      lazyPhoto(card.querySelector('.banner'), d.city || d.name, country);
    }
    content.innerHTML = '';
    content.appendChild(g);
  } catch (e) { fail(); }
}

function open(d, cc, country) {
  state.selected = { kind: 'airport', name: d.city || d.name, country, cc, lat: d.lat, lng: d.lng, iata: d.iata };
  saveState();
  location.href = 'destination.html';
}

function tile(title, sub, icon, fn) {
  const el = document.createElement('div');
  el.className = 'btile';
  el.innerHTML = `<span class="ic">${icon}</span><div><b>${title}</b><small>${sub}</small></div>`;
  el.onclick = fn;
  return el;
}

function grid(tiles) {
  const g = document.createElement('div');
  g.className = 'bgrid';
  tiles.forEach((t) => g.appendChild(t));
  content.innerHTML = '';
  content.appendChild(g);
}

function fail() {
  content.innerHTML = `<div class="empty">Não foi possível carregar. Confirma que o servidor está a correr (<code>npm start</code>).</div>`;
}
