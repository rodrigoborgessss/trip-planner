// Config do servidor. As chaves vêm de variáveis de ambiente (ver .env.example).
// Lê o .env sempre na raiz do projeto, dê por onde der o arranque do node.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

module.exports = {
  port: process.env.PORT || 3000,
  cacheTtlMin: Number(process.env.CACHE_TTL_MIN || 60),
  keys: {
    duffel: process.env.DUFFEL_TOKEN || '',
    hotels: process.env.HOTELS_TOKEN || '',
    activities: process.env.ACTIVITIES_TOKEN || '',
    safety: process.env.SAFETY_TOKEN || '',
    pexels: process.env.PEXELS_KEY || '',
    hotelsMarker: process.env.HOTELS_MARKER || '',
    geoapify: process.env.GEOAPIFY_KEY || '',
  },
};
