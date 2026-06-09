// Cria o mapa e a camada de tiles. Orientado a norte (default do Leaflet).
import { CONFIG } from '../config.js';

export let map = null;

export function initMap() {
  map = L.map('map', {
    zoomControl: false,
    worldCopyJump: true,
    minZoom: CONFIG.map.minZoom,
  }).setView([CONFIG.fallbackOrigin.lat, CONFIG.fallbackOrigin.lng], CONFIG.map.initialZoom);

  L.control.zoom({ position: 'topright' }).addTo(map);
  L.tileLayer(CONFIG.map.tiles, {
    attribution: CONFIG.map.attribution,
    subdomains: CONFIG.map.subdomains,
    maxZoom: 19,
  }).addTo(map);

  return map;
}
