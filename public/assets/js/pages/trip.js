// Página do plano de viagem. Lê o plano que a página do destino guardou em
// sessionStorage (tp_plan) e desenha um roteiro imprimível (Guardar PDF usa o
// diálogo de impressão do browser — controlo total do aspeto, sem dependências).
import { t } from '../i18n.js';

const plan = JSON.parse(sessionStorage.getItem('tp_plan') || 'null');
const root = document.getElementById('plan');

const fmtDate = (s) => {
  if (!s) return '';
  try { return new Date(s).toLocaleDateString(undefined, { day: '2-digit', month: 'short' }); }
  catch (e) { return s; }
};
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

document.querySelector('.btn-ghost').textContent = '← ' + t('trip.back');
const pdfBtn = document.getElementById('pdfBtn');
pdfBtn.textContent = t('trip.pdf');
pdfBtn.onclick = () => window.print();

if (!plan) {
  root.innerHTML = `<div class="empty">${t('trip.title')} — sem dados.<br><a href="search.html">Começa no mapa</a>.</div>`;
} else {
  render(plan);
}

function render(p) {
  const cur = p.currency || 'EUR';
  const f = p.flight;

  const flightBlock = f
    ? `<div class="line">
         <div><b>${esc(f.airline)}</b><div class="muted">${esc(f.from)} → ${esc(f.to)} · ${f.stops === 0 ? t('fl.direct') : f.stops + ' ' + t('fl.stops')}</div></div>
         <div class="price">${esc(f.price)} ${esc(f.currency || cur)}</div>
       </div>`
    : `<div class="muted">${t('trip.noflight')}</div>`;

  const transportBlock = (p.transport || []).map((tr) => `
    <div class="line">
      <div><b>${esc(tr.title)}</b> <span class="muted">· ${esc(tr.sub)}</span></div>
      <a href="${esc(tr.url)}" target="_blank" rel="noopener">↗</a>
    </div>`).join('');

  const hotelBlock = p.hotel ? `
    <section class="block">
      <h2>${t('trip.hotel')}</h2>
      <div class="line">
        <div><b>${esc(p.hotel.name || p.hotel.provider)}</b>${p.hotel.stars ? ` <span class="stars">${'★'.repeat(p.hotel.stars)}</span>` : ''}</div>
        ${p.hotel.deeplink ? `<a href="${esc(p.hotel.deeplink)}" target="_blank" rel="noopener">${t('trip.book')} ↗</a>` : ''}
      </div>
    </section>` : '';

  const daysBlock = (p.days || []).map((day, i) => `
    <div class="day">
      <div class="day-h">${t('trip.day')} ${i + 1}</div>
      ${day.length
        ? day.map((a) => `<a class="act" href="${esc(a.link)}" target="_blank" rel="noopener"><b>${esc(a.name)}</b><span class="muted">${esc(a.category)}</span></a>`).join('')
        : `<div class="muted">—</div>`}
    </div>`).join('');

  root.innerHTML = `
    <header class="cover">
      <div class="kicker">${t('trip.title')}</div>
      <h1>${esc(p.city)}</h1>
      <div class="sub">${[p.country, p.continent].filter(Boolean).map(esc).join(' · ')}</div>
      <div class="cover-meta">
        <span>${fmtDate(p.dateOut)} – ${fmtDate(p.dateBack)}</span>
        <span>${p.nights} ${t('trip.nights')}</span>
        <span>${p.pax} ${t('trip.travellers')}</span>
        ${p.budget ? `<span>${t('trip.budget')}: ${esc(p.budget)} ${cur}</span>` : ''}
      </div>
      <p class="intro">${t('trip.intro')}</p>
    </header>

    <section class="block">
      <h2>${t('trip.flight')}</h2>
      ${flightBlock}
    </section>

    <section class="block">
      <h2>${t('trip.transport')}</h2>
      ${transportBlock}
    </section>

    ${hotelBlock}

    <section class="block">
      <h2>${t('trip.day')}s · ${esc(p.city)}</h2>
      ${daysBlock}
    </section>

    <footer class="foot">TripPlanner${p.origin ? ` · ${t('trip.from')} ${esc(p.origin)} → ${esc(p.city)}` : ''}</footer>
  `;
}
