// Estado da pesquisa. Persiste em sessionStorage para sobreviver à navegação
// entre o mapa, a página de resultados e a navegação manual.
import { CONFIG } from './config.js';

const KEY = 'tripplanner.search';

export const state = {
  origin: { ...CONFIG.fallbackOrigin },
  mode: 'radius',                 // 'radius' | 'time'
  noLimit: false,                 // sem critério: alcança o mundo todo
  radiusKm: CONFIG.reach.radius.default,
  timeH: CONFIG.reach.time.default,
  trip: 'round',                  // 'round' | 'one'
  pax: 2,
  dateOut: null,
  dateBack: null,
  budget: null,
  currency: 'EUR',
  nationality: 'PT',             // para os requisitos de visto
  airport: 'LIS — Lisboa',
  reachableCountries: [],
  selected: null,                 // destino escolhido (país ou aeroporto)
};

export function saveState() {
  try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
}

export function loadState() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY));
    if (saved) Object.assign(state, saved);
  } catch (e) {}
}
