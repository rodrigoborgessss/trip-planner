// Cria o mapa e a camada de tiles. Orientado a norte (default do Leaflet).
// Os tiles acompanham o tema (claro/escuro).
import { CONFIG } from '../config.js';

export let map = null;
let tiles = null;

const tileURL = () =>
  document.documentElement.dataset.theme === 'light'
    ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
    : CONFIG.map.tiles;

export function initMap() {
  map = L.map('map', {
    zoomControl: false,
    worldCopyJump: true,
    minZoom: CONFIG.map.minZoom,
  }).setView([CONFIG.fallbackOrigin.lat, CONFIG.fallbackOrigin.lng], CONFIG.map.initialZoom);

  L.control.zoom({ position: 'topright' }).addTo(map);
  tiles = L.tileLayer(tileURL(), {
    attribution: CONFIG.map.attribution,
    subdomains: CONFIG.map.subdomains,
    maxZoom: 19,
  }).addTo(map);

  window.addEventListener('tp-theme', () => {
    if (tiles) tiles.remove();
    tiles = L.tileLayer(tileURL(), {
      attribution: CONFIG.map.attribution,
      subdomains: CONFIG.map.subdomains,
      maxZoom: 19,
    }).addTo(map);
  });

  return map;
}
