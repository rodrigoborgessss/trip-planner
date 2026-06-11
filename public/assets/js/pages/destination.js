// Página dedicada do destino. Lê o destino escolhido no mapa, pede ao backend
// o pacote completo (categorias + extras) e desenha os separadores.
import { CONFIG } from '../config.js';
import { state, loadState } from '../state.js';
import { fmtKm, fmtH, num } from '../lib/format.js';
import { lazyPhoto } from '../ui/photo.js';
import { t } from '../i18n.js';
import { flagImg } from '../lib/flag.js';

// miniatura: a foto carrega via Pexels (/api/photo) quando o cartão entra no
// ecrã. data-pname = nome do sítio/hotel; data-pctx = cidade (contexto).
const esc = (s) => String(s || '').replace(/"/g, '&quot;');
// 5 estrelas: as do hotel a dourado, as restantes a cinzento
function starHTML(n) {
  n = Math.max(0, Math.min(5, Math.round(n) || 0));
  return `<span class="gold">${'★'.repeat(n)}</span><span class="grey">${'★'.repeat(5 - n)}</span>`;
}
// link do Maps com nome + cidade + país e, se houver, as coordenadas do ponto
// (assim cai sempre no sítio certo, mesmo com nomes repetidos)
function mapsLink(p) {
  const q = encodeURIComponent([p.name, sel && sel.name, sel && sel.country].filter(Boolean).join(' '));
  return typeof p.lat === 'number'
    ? `https://www.google.com/maps/search/${q}/@${p.lat},${p.lng},16z`
    : `https://www.google.com/maps/search/${q}`;
}
function wireThumbs(container) {
  container.querySelectorAll('.pcard[data-pname]').forEach((el) => lazyPhoto(el, el.dataset.pname, el.dataset.pctx || ''));
}

loadState();
const sel = state.selected;
const root = document.getElementById('content');

// guardados após carregar, para o "criar viagem" montar o plano
let currentDest = null;
let currentFlights = [];
let currentPlaces = { hotels: [], leisure: [], culture: [] };

const flag = (iso2) =>
  !iso2 || iso2.length !== 2 ? '📍' : iso2.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));

if (!sel) {
  root.innerHTML = `<div class="empty">Não há destino selecionado.<br>Volta ao <a href="search.html">mapa</a> e escolhe um no globo.</div>`;
} else {
  fetchDestination();
}

async function fetchDestination() {
  try {
    const res = await fetch(`${CONFIG.apiBase}/destination`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: sel.name, lat: sel.lat, lng: sel.lng, cc: sel.cc,
        country: sel.country, continent: sel.continent, iata: sel.iata, airport: state.airport,
        origin: state.origin, dateOut: state.dateOut, dateBack: state.dateBack, pax: state.pax,
        nationality: state.nationality, currency: state.currency,
      }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error();
    render(data.destination, data.nights);
    loadPlaces();
  } catch (e) {
    root.innerHTML = `<div class="empty">Não foi possível montar o destino. Confirma que o servidor está a correr (<code>npm start</code>).</div>`;
  }
}

function render(d, nights) {
  const tpl = document.getElementById('tpl').content.cloneNode(true);
  const $ = (sel) => tpl.querySelector(sel);

  $('[data-flag]').innerHTML = flagImg(d.countryCode, 'hero-flag');
  $('[data-name]').textContent = d.name;
  $('[data-country]').textContent = [d.country, d.continent].filter(Boolean).join(' · ');
  $('[data-dist]').textContent = d.metrics.distanceKm ? fmtKm(d.metrics.distanceKm) : '—';
  $('[data-time]').textContent = d.metrics.flightTimeH ? fmtH(d.metrics.flightTimeH) : '—';
  $('[data-total]').textContent = d.metrics.estTotal ? `${num(d.metrics.estTotal)} ${d.metrics.currency}` : '—';

  const tabs = [
    ['flights', t('tab.flights'), d.categories.flights.length],
    ['hotels', t('tab.hotels'), '…'],
    ['transport', t('tab.transport'), null],
    ['leisure', t('tab.leisure'), '…'],
    ['culture', t('tab.culture'), '…'],
    ['extras', t('tab.extras'), null],
  ];

  const tabBar = $('[data-tabs]');
  tabs.forEach(([key, label, count], i) => {
    const b = document.createElement('button');
    b.dataset.tab = key;
    b.innerHTML = `${label}${count != null ? `<span class="badge">${count}</span>` : ''}`;
    if (i === 0) b.classList.add('on');
    b.onclick = () => {
      tabBar.querySelectorAll('button').forEach((x) => x.classList.remove('on'));
      b.classList.add('on');
      document.querySelectorAll('.section').forEach((s) => s.classList.toggle('on', s.dataset.sec === key));
    };
    tabBar.appendChild(b);
  });

  // preencher secções (hotéis/lazer/cultura entram depois, via loadPlaces)
  fill(tpl.querySelector('[data-sec="flights"]'), flightsHTML(d.categories.flights, sel.kind === 'airport'));
  fill(tpl.querySelector('[data-sec="hotels"]'), loadingHTML());
  fill(tpl.querySelector('[data-sec="transport"]'), transportHTML(sel));
  fill(tpl.querySelector('[data-sec="leisure"]'), loadingHTML());
  fill(tpl.querySelector('[data-sec="culture"]'), loadingHTML());
  fill(tpl.querySelector('[data-sec="extras"]'), extrasHTML(d.extras));
  tpl.querySelector('[data-sec="flights"]').classList.add('on');

  root.innerHTML = '';
  root.appendChild(tpl);
  root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.getAttribute('data-i18n')); });

  currentDest = d;
  currentFlights = d.categories.flights || [];

  // botão "criar viagem" logo a seguir ao hero
  const heroWrap = root.querySelector('.hero');
  if (heroWrap) {
    const cta = document.createElement('button');
    cta.className = 'create-trip';
    cta.innerHTML = `✨ ${t('trip.create')}`;
    cta.onclick = onCreateTrip;
    heroWrap.insertAdjacentElement('afterend', cta);
  }
  const hero = root.querySelector('.hero');
  if (hero) {
    lazyPhoto(hero, d.name, d.country);
    if (typeof d.lat === 'number') addMapButton(hero, d);
  }
}

function addMapButton(hero, d) {
  const b = document.createElement('button');
  b.className = 'mapbtn';
  b.title = 'Ver no mapa';
  b.innerHTML = '🗺️';
  b.onclick = () => openMapModal(d);
  hero.appendChild(b);
}

function openMapModal(d) {
  const o = 0.08;
  const bbox = `${d.lng - o},${d.lat - o},${d.lng + o},${d.lat + o}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${d.lat},${d.lng}`;
  const back = document.createElement('div');
  back.className = 'mapmodal-back';
  back.innerHTML = `
    <div class="mapmodal">
      <div class="mapmodal-head"><b>${d.name}</b><button class="mapmodal-close" aria-label="Fechar">×</button></div>
      <iframe src="${src}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
      <a class="mapmodal-link" href="https://www.openstreetmap.org/?mlat=${d.lat}&mlon=${d.lng}#map=11/${d.lat}/${d.lng}" target="_blank" rel="noopener">Abrir no OpenStreetMap →</a>
    </div>`;
  const close = () => back.remove();
  back.onclick = (e) => { if (e.target === back) close(); };
  back.querySelector('.mapmodal-close').onclick = close;
  document.body.appendChild(back);
}

function fill(el, html) { el.innerHTML = html; }
function loadingHTML() { return `<div class="empty">${t('misc.loading')}</div>`; }

// ---- Criar viagem -------------------------------------------------------
function nightsBetween(a, b) {
  if (!a || !b) return 1;
  const n = Math.round((new Date(b) - new Date(a)) / 86400000);
  return n > 0 ? n : 1;
}
function interleave(a, b) {
  const out = []; const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) { if (a[i]) out.push(a[i]); if (b[i]) out.push(b[i]); }
  return out;
}

function buildTripPlan() {
  const d = currentDest || {};
  const budget = Number(state.budget) || 0;
  const flights = (currentFlights || []).slice().sort((x, y) => (x.price || 1e9) - (y.price || 1e9));
  const flight = flights.find((f) => !budget || (f.price || 0) <= budget) || flights[0] || null;
  const hotel = (currentPlaces.hotels || []).find((h) => !h.linkOnly) || (currentPlaces.hotels || [])[0] || null;

  const nights = nightsBetween(state.dateOut, state.dateBack);
  const days = Math.max(1, nights);
  const pool = interleave(currentPlaces.culture || [], currentPlaces.leisure || []);
  const perDay = Math.max(2, Math.min(4, Math.ceil(pool.length / days) || 2));
  const dayPlans = [];
  for (let i = 0, idx = 0; i < days; i++, idx += perDay) {
    dayPlans.push((pool.slice(idx, idx + perDay)).map((p) => ({ name: p.name, category: p.category, link: mapsLink(p) })));
  }

  return {
    city: d.name, country: d.country, continent: d.continent, cc: d.countryCode,
    origin: state.origin && state.origin.name, airport: sel.airport || sel.name,
    dateOut: state.dateOut, dateBack: state.dateBack, pax: state.pax || 1, nights,
    budget, currency: (d.metrics && d.metrics.currency) || 'EUR',
    flight, hotel,
    transport: transportRows(sel).map(([title, sub, url]) => ({ title, sub, url })),
    days: dayPlans,
  };
}

function onCreateTrip() {
  try {
    sessionStorage.setItem('tp_plan', JSON.stringify(buildTripPlan()));
    location.href = 'trip.html';
  } catch (e) { console.error('plano:', e); }
}

// hotéis/lazer/cultura (OSM) — pedidos depois da página abrir
async function loadPlaces() {
  const payload = {
    name: sel.name, iata: sel.iata, lat: sel.lat, lng: sel.lng,
    dateOut: state.dateOut, dateBack: state.dateBack, pax: state.pax,
  };
  try {
    const r = await fetch(`${CONFIG.apiBase}/places`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    const data = await r.json();
    currentPlaces = { hotels: data.hotels || [], leisure: data.leisure || [], culture: data.culture || [] };
    setSection('hotels', hotelsHTML(data.hotels, data.nights || 1), data.hotels.length);
    setSection('leisure', placesHTML(data.leisure, 'lazer', 'OpenStreetMap'), data.leisure.length);
    setSection('culture', placesHTML(data.culture, 'cultura', 'OpenStreetMap'), data.culture.length);
  } catch (e) {
    setSection('hotels', empty('hotéis', 'OpenStreetMap + parceiros'), 0);
    setSection('leisure', empty('lazer', 'OpenStreetMap'), 0);
    setSection('culture', empty('cultura', 'OpenStreetMap'), 0);
  }
}

function setSection(key, html, count) {
  const sec = root.querySelector(`.section[data-sec="${key}"]`);
  if (sec) { sec.innerHTML = html; wireThumbs(sec); }
  const badge = root.querySelector(`[data-tabs] button[data-tab="${key}"] .badge`);
  if (badge) badge.textContent = count;
}

function flightsHTML(list, isAirport) {
  if (!list.length) {
    return isAirport
      ? empty('voos', 'Duffel (o self-service da Amadeus encerra a 17/07/2026)')
      : `<div class="empty">Escolhe um <b>aeroporto</b> no mapa para veres voos.<br>Quando clicas num país inteiro não há um destino concreto para pesquisar.</div>`;
  }
  return `<div class="cards">${list.map((f) => `
    <div class="card">
      <div class="main">
        <h4>${f.airline}</h4>
        <div class="meta">${f.from} → ${f.to} · ${f.durationH ? fmtH(f.durationH) : '—'} · ${f.stops === 0 ? t('fl.direct') : f.stops + ' ' + t('fl.stops')}</div>
      </div>
      <div class="price"><b>${num(f.price)} ${f.currency}</b><small>${t('fl.total')}</small>${f.deeplink ? `<br><a href="${f.deeplink}" target="_blank" rel="noopener">${t('fl.book')}</a>` : ''}</div>
    </div>`).join('')}</div>`;
}

function hotelsHTML(list, nights) {
  if (!list.length) return empty('hotéis', 'OpenStreetMap + parceiros');
  return `<div class="pcards">${list.map((h) => h.linkOnly
    ? `<a class="pcard" href="${h.deeplink}" target="_blank" rel="noopener"><div class="pcap"><h4>${h.provider}</h4><div class="meta">${t('ht.searchIn')} ${h.sub} · ${t('ht.see')}</div></div></a>`
    : `<a class="pcard" data-pname="${esc(h.name)}" data-pctx="${esc(sel && sel.name || '')}" href="${h.deeplink}" target="_blank" rel="noopener"><div class="pcap"><h4>${h.name}</h4><div class="hstars">${starHTML(h.stars)}</div></div></a>`
  ).join('')}</div>`;
}

function placeCards(list) {
  return `<div class="pcards">${list.map((p) => `
    <a class="pcard" data-pname="${esc(p.name)}" data-pctx="${esc(sel && sel.name || '')}" href="${mapsLink(p)}" target="_blank" rel="noopener">
      <div class="pcap"><h4>${p.name}</h4><div class="meta">${p.category}</div></div>
    </a>`).join('')}</div>`;
}

function placesHTML(list, label, src) {
  if (!list.length) return empty(label, src);
  if (!list.some((p) => p.group)) return placeCards(list);        // lazer: lista simples
  const order = ['Museus', 'Arte', 'Monumentos e memoriais', 'Castelos e fortes', 'Religioso', 'Sítios históricos', 'Outros'];
  const by = {};
  for (const p of list) (by[p.group] = by[p.group] || []).push(p);
  return Object.keys(by)
    .sort((a, b) => order.indexOf(a) - order.indexOf(b))
    .map((k) => `<h5 class="subgroup">${k}<span>${by[k].length}</span></h5>${placeCards(by[k])}`)
    .join('');
}

function simpleHTML(list, label, src) {
  if (!list.length) return empty(label, src);
  return `<div class="cards">${list.map((t) => `<div class="card"><div class="main"><h4>${t.type}</h4><div class="meta">${t.provider || ''}</div></div></div>`).join('')}</div>`;
}

// Deslocações: links prontos a usar (sem API/token). Levam o nome da cidade.
function transportRows(s) {
  const city = encodeURIComponent(s.name || '');
  const ll = (typeof s.lat === 'number') ? `@${s.lat},${s.lng},13z` : '';
  return [
    s.iata ? [t('tr.airport'), 'Rome2Rio', `https://www.rome2rio.com/map/${s.iata}-Airport/${city}`] : null,
    [t('tr.car'), 'Google Maps', `https://www.google.com/maps/search/aluguer+de+carros/${ll}`],
    [t('tr.transit'), 'Google Maps', `https://www.google.com/maps/search/public+transport/${ll}`],
    [t('tr.taxi'), 'Rome2Rio', `https://www.rome2rio.com/s/${city}`],
  ].filter(Boolean);
}

function transportHTML(s) {
  return `<div class="cards">${transportRows(s).map(([title, sub, url]) => `
    <div class="card">
      <div class="main"><h4>${title}</h4><div class="meta">${sub}</div></div>
      <div class="price"><a href="${url}" target="_blank" rel="noopener">${t('ht.see')}</a></div>
    </div>`).join('')}</div>`;
}

function extrasHTML(x) {
  const box = (title, body, src) => `<div class="xbox"><h4>${title}</h4>${body}${src ? `<div class="src">fonte: ${src}</div>` : ''}</div>`;
  const naBox = (title, src) => box(title, `<p style="color:var(--muted)">Sem dados ainda.</p>`, src);

  // segurança
  let safetyBox;
  if (x.safety && x.safety.score != null) {
    const d = x.safety.updatedISO ? new Date(x.safety.updatedISO).toLocaleDateString('pt-PT') : '';
    safetyBox = box(t('x.safety'),
      `<p><b>${x.safety.level}</b> · índice ${x.safety.score}/5${d ? ` · atualizado ${d}` : ''}</p>`,
      x.safety.source);
  } else {
    safetyBox = naBox(t('x.safety'), 'travel-advisory.info');
  }

  // clima
  let weatherBox;
  if (x.weather && (x.weather.max != null || x.weather.condition)) {
    const w = x.weather;
    weatherBox = box(t('x.weather'),
      `<p>${w.condition || '—'}${w.max != null ? ` · ${w.max}° / ${w.min}°` : ''}</p><div class="src" style="margin-top:2px">${w.basis}</div>`,
      'Open-Meteo');
  } else {
    weatherBox = naBox(t('x.weather'), 'Open-Meteo');
  }

  // visto / entrada
  let visaBox;
  if (x.visa && x.visa.label) {
    const v = x.visa;
    const icon = v.required === false ? '✅' : v.required === true ? '⚠️' : '🎫';
    visaBox = box(t('x.visa'),
      `<p>${icon} <b>${v.label}</b><br><span style="color:var(--muted);font-size:12px">passaporte ${v.from} → ${v.to}</span></p>`,
      v.source);
  } else {
    visaBox = naBox(t('x.visa'), 'passport-index');
  }

  // notícias
  let newsBox;
  if (x.news && x.news.length) {
    const items = x.news.slice(0, 5).map((n) => {
      const d = n.publishedISO ? new Date(n.publishedISO).toLocaleDateString('pt-PT') : '';
      return `<li><a href="${n.url}" target="_blank" rel="noopener">${escapeHTML(n.title || n.source)}</a><span class="nmeta">${n.source}${d ? ' · ' + d : ''}</span></li>`;
    }).join('');
    newsBox = `<div class="xbox xwide"><h4>${t('x.news')}</h4><ul class="news">${items}</ul><div class="src">fonte: GDELT</div></div>`;
  } else {
    newsBox = `<div class="xbox xwide">${naInner(t('x.news'), 'GDELT')}</div>`;
  }

  return `<div class="extras-grid">
    ${safetyBox}
    ${weatherBox}
    ${visaBox}
    ${naBox(t('x.sentiment'), 'análise das notícias')}
  </div>
  ${newsBox}
  <p style="color:var(--muted);font-size:13px;margin-top:14px;line-height:1.6">Os indicadores aparecem com fonte e data, em tom neutro. O índice de segurança agrega avisos oficiais (0 = seguro, 5 = evitar); não é um veredito, é o valor da fonte. O visto depende da nacionalidade escolhida no painel.</p>`;
}

function naInner(title, src) {
  return `<h4>${title}</h4><p style="color:var(--muted)">Sem dados ainda.</p><div class="src">fonte: ${src}</div>`;
}
function escapeHTML(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function empty(label, src) {
  return `<div class="empty">Ainda sem ${label}.<br>Liga a fonte em <code>server/services/</code> — sugestão: ${src}.</div>`;
}
