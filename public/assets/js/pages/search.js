// Controlador do ecrã de pesquisa. É aqui que os módulos se ligam.
import { CONFIG } from '../config.js';
import { state, loadState, saveState } from '../state.js';
import { initMap } from '../map/mapView.js';
import { initOrigin, locateMe } from '../map/origin.js';
import { initReach, updateReach, surprise } from '../map/reach.js';
import { initAirports, refresh as refreshAirports, getMainAirportByCC } from '../map/airports.js';
import * as Console from '../ui/console.js';
import * as Modal from '../ui/destinationModal.js';
import { toast } from '../ui/toast.js';
import { ISO3_TO_2 } from '../lib/iso.js';

loadState();
defaultDates();

const map = initMap();

initOrigin(map, () => { Console.renderOriginUI(); updateReach(); refreshAirports(); });

initReach(map, {
  onCountry: (feature) => { selectCountry(feature); Console.setStep(3); },
  onCount: (n) => { document.getElementById('reachCount').textContent = n; },
});

// Clicar num país resolve para o seu aeroporto principal (para nunca avançar
// sem aeroporto). Se não houver dados, abre o país como antes.
function selectCountry(feature) {
  const cc = ISO3_TO_2[feature.id] || (feature.properties && feature.properties.iso_a2);
  const ap = cc ? getMainAirportByCC(cc) : null;
  if (ap) Modal.openAirport(ap);
  else Modal.openCountry(feature, cc);
}

initAirports(map, (airport) => { Modal.openAirport(airport); Console.setStep(3); });

Modal.initModal();

Console.initConsole({
  onSlide: () => updateReach({ live: true }),
  onSlideEnd: () => { updateReach(); refreshAirports(); },
  onModeChange: () => { updateReach(); refreshAirports(); },
  onLocate: () => {
    toast('A localizar-te…');
    locateMe(
      (lat, lng) => { map.flyTo([lat, lng], 5, { duration: 1.2 }); Console.renderOriginUI(); updateReach(); refreshAirports(); },
      (msg) => toast(msg)
    );
  },
  onSearch: () => { saveState(); location.href = 'results.html'; },
  onSurprise: () => {
    const r = surprise();
    if (!r) return toast('Define primeiro um alcance no mapa.');
    toast(`🎲 Destino sorteado ${r.note}: ${r.name}`);
    if (r.feature) { selectCountry(r.feature); Console.setStep(3); }
  },
  onBrowse: () => { saveState(); location.href = 'browse.html'; },
});

Console.hydrateConsole();

if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      state.origin = { lat: pos.coords.latitude, lng: pos.coords.longitude, name: 'A minha localização' };
      saveState();
      map.setView([state.origin.lat, state.origin.lng], CONFIG.map.initialZoom);
      Console.renderOriginUI();
      updateReach();
      refreshAirports();
    },
    () => { updateReach(); },
    { timeout: 6000 }
  );
} else {
  updateReach();
}

function defaultDates() {
  if (!state.dateOut) state.dateOut = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
  if (!state.dateBack) state.dateBack = new Date(Date.now() + 37 * 864e5).toISOString().slice(0, 10);
}
