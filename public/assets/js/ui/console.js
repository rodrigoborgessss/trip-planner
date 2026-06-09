// Liga o painel de controlo ao estado e expõe handlers para a página orquestrar.
import { CONFIG } from '../config.js';
import { state, saveState } from '../state.js';
import { currentRadiusKm } from '../map/reach.js';
import { fmtH, num } from '../lib/format.js';

const $ = (id) => document.getElementById(id);

// handlers vindos da página: { onSlide, onSlideEnd, onModeChange, onLocate,
//                              onSearch, onSurprise, onBrowse }
export function initConsole(h) {
  // critério: raio vs tempo
  $('modeSeg').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    state.mode = b.dataset.mode;
    setSeg('modeSeg', b);
    applyAccent();
    applyRangeBounds();
    syncReadout();
    h.onModeChange();
  });

  // slider: ao vivo no input, recálculo final no change
  $('critRange').addEventListener('input', () => {
    if (state.mode === 'radius') state.radiusKm = +$('critRange').value;
    else state.timeH = +$('critRange').value;
    syncReadout();
    h.onSlide();
  });
  $('critRange').addEventListener('change', () => h.onSlideEnd());

  // sem limite (o mundo todo) — desativa os controlos de critério
  $('noLimit').addEventListener('change', (e) => {
    state.noLimit = e.target.checked;
    $('critControls').classList.toggle('off', state.noLimit);
    saveState();
    h.onModeChange();
  });

  // viagem
  $('tripSeg').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    state.trip = b.dataset.trip;
    setSeg('tripSeg', b);
    $('returnField').style.display = state.trip === 'one' ? 'none' : '';
    saveState();
  });
  $('paxPlus').onclick = () => setPax(state.pax + 1);
  $('paxMinus').onclick = () => setPax(state.pax - 1);
  $('dateOut').onchange = (e) => { state.dateOut = e.target.value; saveState(); };
  $('dateBack').onchange = (e) => { state.dateBack = e.target.value; saveState(); };
  $('budget').oninput = (e) => { state.budget = e.target.value || null; saveState(); };
  $('currency').onchange = (e) => { state.currency = e.target.value.split(' ')[0]; saveState(); };
  $('nationality').onchange = (e) => { state.nationality = e.target.value; saveState(); };
  $('airport').onchange = (e) => { state.airport = e.target.value; saveState(); };

  // ações
  $('btnLocate').onclick = h.onLocate;
  $('btnSearch').onclick = h.onSearch;
  $('btnSurprise').onclick = h.onSurprise;
  $('btnBrowse').onclick = h.onBrowse;

  // mobile: recolher/expandir a consola (folha inferior)
  const grabber = $('consoleGrabber');
  if (grabber) grabber.onclick = () => document.querySelector('.console').classList.toggle('collapsed');
}

function setPax(n) {
  state.pax = Math.max(1, Math.min(9, n));
  $('paxVal').textContent = state.pax;
  saveState();
}

function setSeg(segId, active) {
  document.querySelectorAll(`#${segId} button`).forEach((x) => x.classList.toggle('on', x === active));
}

export function applyAccent() {
  const root = document.documentElement.style;
  root.setProperty('--accent', state.mode === 'radius' ? 'var(--amber)' : 'var(--teal)');
  root.setProperty('--accent-soft', state.mode === 'radius' ? 'var(--amber-soft)' : 'var(--teal-soft)');
  $('brandDot').style.background = CONFIG.colors[state.mode];
}

export function applyRangeBounds() {
  const r = $('critRange');
  const cfg = state.mode === 'radius' ? CONFIG.reach.radius : CONFIG.reach.time;
  r.min = cfg.min; r.max = cfg.max; r.step = cfg.step;
  r.value = state.mode === 'radius' ? state.radiusKm : state.timeH;
  if (state.mode === 'radius') {
    $('scaleMin').textContent = num(cfg.min) + ' km';
    $('scaleMax').textContent = num(cfg.max) + ' km';
    $('modeHint').textContent = 'A zona dourada mostra tudo a este raio em linha reta da tua origem.';
  } else {
    $('scaleMin').textContent = cfg.min + 'h';
    $('scaleMax').textContent = cfg.max + 'h';
    $('modeHint').textContent = 'A zona azul estima os países alcançáveis neste tempo de voo direto.';
  }
}

export function syncReadout() {
  if (state.mode === 'radius') {
    $('critVal').textContent = num(state.radiusKm);
    $('critUnit').textContent = 'km';
    const h = state.radiusKm / CONFIG.flight.cruiseKmh + CONFIG.flight.overheadH;
    $('critMeta').innerHTML = `≈ <b>${fmtH(h)}</b> de voo<br>direto estimado`;
  } else {
    $('critVal').textContent = String(state.timeH).replace('.0', '');
    $('critUnit').textContent = 'h';
    $('critMeta').innerHTML = `≈ <b>${num(currentRadiusKm())} km</b><br>em voo direto`;
  }
}

export function renderOriginUI() {
  $('originName').textContent = state.origin.name;
  $('originCoord').textContent = `${state.origin.lat.toFixed(3)} , ${state.origin.lng.toFixed(3)}`;
}

export function setStep(n) {
  [1, 2, 3].forEach((i) => {
    const el = $('st' + i);
    el.classList.toggle('active', i === n);
    el.classList.toggle('done', i < n);
  });
}

// preenche o painel a partir do estado (ex.: ao voltar de outra página)
export function hydrateConsole() {
  $('airport').value = state.airport;
  $('paxVal').textContent = state.pax;
  if (state.dateOut) $('dateOut').value = state.dateOut;
  if (state.dateBack) $('dateBack').value = state.dateBack;
  if (state.budget) $('budget').value = state.budget;
  $('nationality').value = state.nationality;
  setSeg('modeSeg', document.querySelector(`#modeSeg [data-mode="${state.mode}"]`));
  setSeg('tripSeg', document.querySelector(`#tripSeg [data-trip="${state.trip}"]`));
  $('noLimit').checked = state.noLimit;
  $('critControls').classList.toggle('off', state.noLimit);
  $('returnField').style.display = state.trip === 'one' ? 'none' : '';
  applyAccent();
  applyRangeBounds();
  syncReadout();
  renderOriginUI();
}
