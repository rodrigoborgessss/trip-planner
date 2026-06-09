// Helpers geográficos do lado do servidor: distância e tempo de voo estimado.
// Mantém os mesmos parâmetros do frontend para os números baterem certo.
const CRUISE_KMH = 800;
const OVERHEAD_H = 0.75;

function haversineKm(a, b) {
  const R = 6371, toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
function flightTimeH(km) { return km / CRUISE_KMH + OVERHEAD_H; }

module.exports = { haversineKm, flightTimeH, CRUISE_KMH, OVERHEAD_H };
