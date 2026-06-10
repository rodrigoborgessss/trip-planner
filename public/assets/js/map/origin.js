// Gere a origem do utilizador: marcador arrastável, clique no mapa e GPS.
import { state, saveState } from '../state.js';

let marker = null;
let onChangeCb = () => {};

const icon = L.divIcon({
  className: 'origin-marker',
  html:
    '<svg width="30" height="30" viewBox="0 0 30 30">' +
    '<circle cx="15" cy="15" r="13" fill="#F4A93C" fill-opacity="0.25"/>' +
    '<circle cx="15" cy="15" r="6" fill="#F4A93C" stroke="#0E1820" stroke-width="2.5"/></svg>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

export function initOrigin(map, onChange) {
  onChangeCb = onChange || (() => {});
  marker = L.marker([state.origin.lat, state.origin.lng], { icon, draggable: true }).addTo(map);

  marker.on('dragend', () => {
    const p = marker.getLatLng();
    setOrigin(p.lat, p.lng, coordName(p.lat, p.lng));
  });
  map.on('click', (e) => {
    marker.setLatLng(e.latlng);
    setOrigin(e.latlng.lat, e.latlng.lng, coordName(e.latlng.lat, e.latlng.lng));
  });
}

function coordName(lat, lng) {
  return `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
}

export function setOrigin(lat, lng, name) {
  state.origin = { lat, lng, name };
  saveState();
  onChangeCb();
}

// move o marcador e a origem (usado pelo "definir como partida")
export function moveOrigin(lat, lng, name) {
  if (marker) marker.setLatLng([lat, lng]);
  setOrigin(lat, lng, name);
}

// Pede GPS. callbacks: onLocated(lat,lng) / onError(msg)
export function locateMe(onLocated, onError) {
  if (!navigator.geolocation) return onError('Geolocalização indisponível neste dispositivo.');
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      marker.setLatLng([lat, lng]);
      setOrigin(lat, lng, 'A minha localização');
      onLocated(lat, lng);
    },
    () => onError('Não foi possível obter a localização. Arrasta o ponto no mapa.'),
    { timeout: 6000 }
  );
}
