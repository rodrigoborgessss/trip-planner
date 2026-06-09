// Página dedicada do destino. Lê o destino escolhido no mapa, pede ao backend
// o pacote completo (categorias + extras) e desenha os separadores.
import { CONFIG } from '../config.js';
import { state, loadState } from '../state.js';
import { fmtKm, fmtH, num } from '../lib/format.js';
import { lazyPhoto } from '../ui/photo.js';

loadState();
const sel = state.selected;
const root = document.getElementById('content');

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
        nationality: state.nationality,
      }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error();
    render(data.destination, data.nights);
  } catch (e) {
    root.innerHTML = `<div class="empty">Não foi possível montar o destino. Confirma que o servidor está a correr (<code>npm start</code>).</div>`;
  }
}

function render(d, nights) {
  const tpl = document.getElementById('tpl').content.cloneNode(true);
  const $ = (sel) => tpl.querySelector(sel);

  $('[data-flag]').textContent = flag(d.countryCode);
  $('[data-name]').textContent = d.name;
  $('[data-country]').textContent = [d.country, d.continent].filter(Boolean).join(' · ');
  $('[data-dist]').textContent = d.metrics.distanceKm ? fmtKm(d.metrics.distanceKm) : '—';
  $('[data-time]').textContent = d.metrics.flightTimeH ? fmtH(d.metrics.flightTimeH) : '—';
  $('[data-total]').textContent = d.metrics.estTotal ? `${num(d.metrics.estTotal)} ${d.metrics.currency}` : '—';

  const tabs = [
    ['flights', 'Voos', d.categories.flights.length],
    ['hotels', 'Hotéis', d.categories.hotels.length],
    ['transport', 'Deslocações', d.categories.transport.length],
    ['leisure', 'Lazer', d.categories.leisure.length],
    ['culture', 'Cultura', d.categories.culture.length],
    ['extras', 'Extras', null],
  ];

  const tabBar = $('[data-tabs]');
  tabs.forEach(([key, label, count], i) => {
    const b = document.createElement('button');
    b.innerHTML = `${label}${count != null ? `<span class="badge">${count}</span>` : ''}`;
    if (i === 0) b.classList.add('on');
    b.onclick = () => {
      tabBar.querySelectorAll('button').forEach((x) => x.classList.remove('on'));
      b.classList.add('on');
      document.querySelectorAll('.section').forEach((s) => s.classList.toggle('on', s.dataset.sec === key));
    };
    tabBar.appendChild(b);
  });

  // preencher secções
  fill(tpl.querySelector('[data-sec="flights"]'), flightsHTML(d.categories.flights, sel.kind === 'airport'));
  fill(tpl.querySelector('[data-sec="hotels"]'), hotelsHTML(d.categories.hotels, nights));
  fill(tpl.querySelector('[data-sec="transport"]'), simpleHTML(d.categories.transport, 'deslocações', 'transporte local / aluguer (ex.: APIs de mobilidade)'));
  fill(tpl.querySelector('[data-sec="leisure"]'), placesHTML(d.categories.leisure, 'lazer', 'OpenTripMap / Foursquare'));
  fill(tpl.querySelector('[data-sec="culture"]'), placesHTML(d.categories.culture, 'cultura', 'OpenTripMap / Foursquare'));
  fill(tpl.querySelector('[data-sec="extras"]'), extrasHTML(d.extras));
  tpl.querySelector('[data-sec="flights"]').classList.add('on');

  root.innerHTML = '';
  root.appendChild(tpl);
  const hero = root.querySelector('.hero');
  if (hero) lazyPhoto(hero, d.name, d.country);
}

function fill(el, html) { el.innerHTML = html; }

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
        <div class="meta">${f.from} → ${f.to} · ${f.durationH ? fmtH(f.durationH) : '—'} · ${f.stops === 0 ? 'direto' : f.stops + ' escala(s)'}</div>
      </div>
      <div class="price"><b>${num(f.price)} ${f.currency}</b><small>total</small>${f.deeplink ? `<br><a href="${f.deeplink}" target="_blank" rel="noopener">Reservar →</a>` : ''}</div>
    </div>`).join('')}</div>`;
}

function hotelsHTML(list, nights) {
  if (!list.length) return empty('hotéis', 'Amadeus / RateHawk / afiliado Booking');
  return `<div class="cards">${list.map((h) => `
    <div class="card">
      <div class="main">
        <h4>${h.name}</h4>
        <div class="meta"><span class="stars">${'★'.repeat(h.stars || 0)}</span> · ${h.rating ? h.rating + '/10' : 's/ avaliação'}</div>
      </div>
      <div class="price"><b>${num(h.pricePerNight)} ${h.currency}</b><small>/noite · ${num(h.pricePerNight * nights)} ${h.currency} por ${nights} noite(s)</small><br><a href="${h.deeplink}" target="_blank" rel="noopener">Ver →</a></div>
    </div>`).join('')}</div>`;
}

function placesHTML(list, label, src) {
  if (!list.length) return empty(label, src);
  return `<div class="cards">${list.map((p) => `
    <div class="card"><div class="main"><h4>${p.name}</h4><div class="meta">${p.category}${p.rating ? ' · ' + p.rating + '★' : ''}</div></div></div>`).join('')}</div>`;
}

function simpleHTML(list, label, src) {
  if (!list.length) return empty(label, src);
  return `<div class="cards">${list.map((t) => `<div class="card"><div class="main"><h4>${t.type}</h4><div class="meta">${t.provider || ''}</div></div></div>`).join('')}</div>`;
}

function extrasHTML(x) {
  const box = (title, body, src) => `<div class="xbox"><h4>${title}</h4>${body}${src ? `<div class="src">fonte: ${src}</div>` : ''}</div>`;
  const naBox = (title, src) => box(title, `<p style="color:var(--muted)">Sem dados ainda.</p>`, src);

  // segurança
  let safetyBox;
  if (x.safety && x.safety.score != null) {
    const d = x.safety.updatedISO ? new Date(x.safety.updatedISO).toLocaleDateString('pt-PT') : '';
    safetyBox = box('🛡️ Segurança',
      `<p><b>${x.safety.level}</b> · índice ${x.safety.score}/5${d ? ` · atualizado ${d}` : ''}</p>`,
      x.safety.source);
  } else {
    safetyBox = naBox('🛡️ Segurança', 'travel-advisory.info');
  }

  // clima
  let weatherBox;
  if (x.weather && (x.weather.max != null || x.weather.condition)) {
    const w = x.weather;
    weatherBox = box('🌤️ Clima',
      `<p>${w.condition || '—'}${w.max != null ? ` · ${w.max}° / ${w.min}°` : ''}</p><div class="src" style="margin-top:2px">${w.basis}</div>`,
      'Open-Meteo');
  } else {
    weatherBox = naBox('🌤️ Clima', 'Open-Meteo');
  }

  // visto / entrada
  let visaBox;
  if (x.visa && x.visa.label) {
    const v = x.visa;
    const icon = v.required === false ? '✅' : v.required === true ? '⚠️' : '🎫';
    visaBox = box('🎫 Visto / entrada',
      `<p>${icon} <b>${v.label}</b><br><span style="color:var(--muted);font-size:12px">passaporte ${v.from} → ${v.to}</span></p>`,
      v.source);
  } else {
    visaBox = naBox('🎫 Visto / entrada', 'passport-index');
  }

  // notícias
  let newsBox;
  if (x.news && x.news.length) {
    const items = x.news.slice(0, 5).map((n) => {
      const d = n.publishedISO ? new Date(n.publishedISO).toLocaleDateString('pt-PT') : '';
      return `<li><a href="${n.url}" target="_blank" rel="noopener">${escapeHTML(n.title || n.source)}</a><span class="nmeta">${n.source}${d ? ' · ' + d : ''}</span></li>`;
    }).join('');
    newsBox = `<div class="xbox xwide"><h4>📰 Notícias recentes</h4><ul class="news">${items}</ul><div class="src">fonte: GDELT</div></div>`;
  } else {
    newsBox = `<div class="xbox xwide">${naInner('📰 Notícias recentes', 'GDELT')}</div>`;
  }

  return `<div class="extras-grid">
    ${safetyBox}
    ${weatherBox}
    ${visaBox}
    ${naBox('📊 Sentimento no país', 'análise das notícias')}
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
