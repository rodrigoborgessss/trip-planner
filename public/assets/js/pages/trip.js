// Página do plano de viagem — agora EDITÁVEL.
// Lê o plano (tp_plan) guardado pela página do destino e deixa o utilizador
// remover locais, mudá-los de dia (menu ou arrastar) e adicionar os que ficaram
// de fora. Tudo é guardado em sessionStorage e o PDF/rotas refletem as edições.
import { t } from '../i18n.js';

let plan = JSON.parse(sessionStorage.getItem('tp_plan') || 'null');
const root = document.getElementById('plan');
const save = () => { try { sessionStorage.setItem('tp_plan', JSON.stringify(plan)); } catch (e) {} };

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtDate = (s) => { if (!s) return ''; try { return new Date(s).toLocaleDateString(undefined, { day: '2-digit', month: 'short' }); } catch (e) { return s; } };

const IC_GRIP = '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="6" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="15" cy="18" r="1.4"/></svg>';
const IC_TRASH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13"/></svg>';
const IC_MAP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/></svg>';

// --- barra de ações (voltar / tema / pdf) -------------------------------
document.querySelector('.btn-ghost').textContent = '← ' + t('trip.back');
const pdfBtn = document.getElementById('pdfBtn');
pdfBtn.textContent = t('trip.pdf');
pdfBtn.onclick = () => window.print();

const themeBtn = document.createElement('button');
themeBtn.className = 'btn-theme';
themeBtn.setAttribute('aria-label', t('trip.theme'));
const setTheme = (dark) => {
  document.body.classList.toggle('dark', dark);
  themeBtn.textContent = dark ? '☀' : '☾';
  try { localStorage.setItem('tp_trip_dark', dark ? '1' : '0'); } catch (e) {}
};
themeBtn.onclick = () => setTheme(!document.body.classList.contains('dark'));
document.querySelector('.trip-actions').insertBefore(themeBtn, pdfBtn);
try { setTheme(localStorage.getItem('tp_trip_dark') === '1'); } catch (e) { setTheme(false); }

// --- render -------------------------------------------------------------
if (!plan) {
  root.innerHTML = `<div class="empty">${t('trip.title')} — sem dados.<br><a href="search.html">Começa no mapa</a>.</div>`;
} else {
  if (!Array.isArray(plan.days)) plan.days = [];
  if (!Array.isArray(plan.pool)) plan.pool = [];
  render();
}

function usedNames() {
  const s = new Set();
  plan.days.forEach((d) => d.forEach((a) => s.add(a.name)));
  return s;
}

function render() {
  const p = plan; const cur = p.currency || 'EUR'; const f = p.flight;

  const flightBlock = f
    ? `<div class="line"><div><b>${esc(f.airline)}</b><div class="muted">${esc(f.from)} → ${esc(f.to)} · ${f.stops === 0 ? t('fl.direct') : f.stops + ' ' + t('fl.stops')}</div></div><div class="price">${esc(f.price)} ${esc(f.currency || cur)}</div></div>`
    : `<div class="muted">${t('trip.noflight')}</div>`;

  const transportBlock = (p.transport || []).map((tr) =>
    `<div class="line"><div><b>${esc(tr.title)}</b> <span class="muted">· ${esc(tr.sub)}</span></div><a href="${esc(tr.url)}" target="_blank" rel="noopener">↗</a></div>`).join('');

  const hotelBlock = p.hotel ? `
    <section class="block">
      <h2>${t('trip.hotel')}</h2>
      <div class="line">
        <div><b>${esc(p.hotel.name || p.hotel.provider)}</b>${p.hotel.stars ? ` <span class="stars">${'★'.repeat(p.hotel.stars)}</span>` : ''}</div>
        ${p.hotel.deeplink ? `<a href="${esc(p.hotel.deeplink)}" target="_blank" rel="noopener">${t('trip.book')} ↗</a>` : ''}
      </div>
    </section>` : '';

  const daysBlock = p.days.map((day, di) => dayHTML(day, di)).join('');

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
    <section class="block"><h2>${t('trip.flight')}</h2>${flightBlock}</section>
    <section class="block"><h2>${t('trip.transport')}</h2>${transportBlock}</section>
    ${hotelBlock}
    <section class="block">
      <h2>${t('trip.day')}s · ${esc(p.city)} <span class="edit-hint">${t('trip.edithint')}</span></h2>
      ${daysBlock}
    </section>
    <footer class="foot">TripPlanner${p.origin ? ` · ${t('trip.from')} ${esc(p.origin)} → ${esc(p.city)}` : ''}</footer>
  `;
  wire();
}

function dayHTML(day, di) {
  const pts = day.filter((a) => typeof a.lat === 'number');
  const routeUrl = pts.length >= 2 ? 'https://www.google.com/maps/dir/' + pts.map((a) => `${a.lat},${a.lng}`).join('/') : null;
  const acts = day.length ? day.map((a, ii) => actHTML(a, di, ii)).join('') : `<div class="muted day-empty">—</div>`;
  const unused = (plan.pool || []).filter((x) => !usedNames().has(x.name));
  const addSel = unused.length
    ? `<select class="add-sel no-print" data-day="${di}"><option value="">+ ${t('trip.add')}…</option>${unused.map((x) => `<option value="${esc(x.name)}">${esc(x.name)}</option>`).join('')}</select>`
    : '';
  return `<div class="day">
    <div class="day-h">${t('trip.day')} ${di + 1}${routeUrl ? ` <a class="route" href="${esc(routeUrl)}" target="_blank" rel="noopener">${IC_MAP} ${t('trip.route')}</a>` : ''}</div>
    <div class="day-list" data-day="${di}">${acts}</div>
    ${addSel}
  </div>`;
}

function actHTML(a, di, ii) {
  const opts = plan.days.map((_, d) => `<option value="${d}"${d === di ? ' selected' : ''}>${t('trip.day')} ${d + 1}</option>`).join('');
  return `<div class="act edit" draggable="true" data-day="${di}" data-idx="${ii}">
    <span class="grip no-print">${IC_GRIP}</span>
    <a class="act-main" href="${esc(a.link)}" target="_blank" rel="noopener"><b>${esc(a.name)}</b><span class="muted">${esc(a.category)}</span></a>
    <select class="move-sel no-print" data-day="${di}" data-idx="${ii}" aria-label="${t('trip.moveday')}">${opts}</select>
    <button class="del no-print" data-day="${di}" data-idx="${ii}" aria-label="${t('trip.remove')}">${IC_TRASH}</button>
  </div>`;
}

function wire() {
  root.querySelectorAll('.del').forEach((b) => b.onclick = () => {
    plan.days[+b.dataset.day].splice(+b.dataset.idx, 1); save(); render();
  });
  root.querySelectorAll('.move-sel').forEach((s) => s.onchange = () => {
    const d = +s.dataset.day, i = +s.dataset.idx, to = +s.value;
    if (to !== d) { const [it] = plan.days[d].splice(i, 1); plan.days[to].push(it); save(); render(); }
  });
  root.querySelectorAll('.add-sel').forEach((s) => s.onchange = () => {
    const d = +s.dataset.day; const name = s.value; if (!name) return;
    const it = (plan.pool || []).find((x) => x.name === name);
    if (it) { plan.days[d].push({ ...it }); save(); render(); }
  });

  // arrastar entre dias (desktop)
  let drag = null;
  root.querySelectorAll('.act.edit').forEach((el) => {
    el.addEventListener('dragstart', () => { drag = { d: +el.dataset.day, i: +el.dataset.idx }; el.classList.add('dragging'); });
    el.addEventListener('dragend', () => { el.classList.remove('dragging'); drag = null; });
  });
  root.querySelectorAll('.day-list').forEach((list) => {
    list.addEventListener('dragover', (e) => { e.preventDefault(); list.classList.add('over'); });
    list.addEventListener('dragleave', () => list.classList.remove('over'));
    list.addEventListener('drop', (e) => {
      e.preventDefault(); list.classList.remove('over'); if (!drag) return;
      const to = +list.dataset.day; const [it] = plan.days[drag.d].splice(drag.i, 1);
      plan.days[to].push(it); save(); render();
    });
  });
}
