// Config do servidor. As chaves vêm de variáveis de ambiente (ver .env.example).
require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  cacheTtlMin: Number(process.env.CACHE_TTL_MIN || 60),
  keys: {
    duffel: process.env.DUFFEL_TOKEN || '',
    hotels: process.env.HOTELS_TOKEN || '',
    activities: process.env.ACTIVITIES_TOKEN || '',
    safety: process.env.SAFETY_TOKEN || '',
    pexels: process.env.PEXELS_KEY || '',
  },
};
