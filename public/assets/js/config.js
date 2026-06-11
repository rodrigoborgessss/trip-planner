// Config central do frontend. Mexes aqui, não espalhado pelo código.
export const CONFIG = {
  map: {
    tiles: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '© OpenStreetMap, © CARTO',
    subdomains: 'abcd',
    initialZoom: 4,
    minZoom: 2,
  },
  // contornos dos países (para pintar a parte alcançável). Podes servir local em /data.
  // Contornos de países em alta resolução (Natural Earth 50m), servidos
  // localmente. Inclui ilhas e arquipélagos pequenos (clicáveis como países).
  countriesGeoJSON: 'data/countries.geo.json',

  // aeroportos reais (OurAirports, com serviço regular). Servido localmente.
  airports: {
    url: 'data/airports.json',
    showFrom: 4,       // a partir deste zoom mostram-se aeroportos
    mediumFrom: 5,     // a partir deste zoom incluem-se os médios (senão só grandes)
    maxMarkers: 500,   // teto de marcadores desenhados de cada vez
  },

  // aproximação de voo direto: tempo ≈ distância/cruzeiro + overhead
  flight: { cruiseKmh: 800, overheadH: 0.75 },

  // limites dos critérios. Raio máx ~20.000 km = metade da circunferência da Terra (cobre o globo).
  reach: {
    radius: { min: 300, max: 20000, step: 100, default: 1500 },
    time:   { min: 1,   max: 20,    step: 0.5, default: 3 },
  },

  colors: { radius: '#F4A93C', time: '#36C7D0' },
  fallbackOrigin: { lat: 38.736, lng: -9.142, name: 'Lisboa, Portugal' },
  apiBase: '/api',
};
