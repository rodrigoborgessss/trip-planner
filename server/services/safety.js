// Extras do destino com fontes reais e gratuitas (sem chave):
//   - Clima: Open-Meteo (previsão até ~16 dias; além disso, média do ano
//     anterior nas mesmas datas, como "típico para a época").
//   - Segurança: travel-advisory.info (índice 0=seguro a 5=evitar, com fonte).
// Notícias, visto e sentimento ficam para depois.
//
// Tudo cacheado (são dados estáticos/lentos — NUNCA caches preços).
const cache = require('../cache/store');

let VISA = {};
try { VISA = require('../data/visa.json'); } catch (e) { VISA = {}; }

async function getExtras({ countryCode, country, lat, lng, dateOut, nationality }) {
  const [safety, weather, news] = await Promise.all([
    countryCode ? getSafety(countryCode) : null,
    typeof lat === 'number' ? getWeather(lat, lng, dateOut) : null,
    country ? getNews(country) : [],
  ]);
  return {
    safety,
    advisories: safety && safety.message
      ? [{ type: 'aviso', text: safety.message, source: safety.source, updatedISO: safety.updatedISO }]
      : [],
    news,
    visa: getVisa(nationality, countryCode),
    weather,
    sentiment: null,
  };
}

// ---- notícias (GDELT, gratuito) ----
async function getNews(country) {
  return cache.remember(`news:${country}`, 180, async () => {
    try {
      const q = encodeURIComponent(`"${country}" (sourcelang:eng OR sourcelang:por)`);
      const u = `https://api.gdeltproject.org/api/v2/doc/doc?query=${q}&mode=ArtList&maxrecords=6&sort=DateDesc&format=json`;
      const r = await fetch(u);
      if (!r.ok) return [];
      const j = await r.json();
      return (j.articles || []).slice(0, 6).map((a) => ({
        title: a.title,
        url: a.url,
        source: a.domain || '',
        publishedISO: gdeltDate(a.seendate),
        sentiment: null,
      }));
    } catch (e) { return []; }
  });
}
function gdeltDate(s) {
  if (!s || s.length < 15) return null;
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(9, 11)}:${s.slice(11, 13)}:00Z`;
}

// ---- visto / entrada (dataset passport-index) ----
function getVisa(nationality, destCC) {
  const nat = (nationality || 'PT').toUpperCase();
  const dst = (destCC || '').toUpperCase();
  if (!dst) return null;
  const code = VISA[nat] && VISA[nat][dst];
  if (code == null) return null;
  return { ...interpretVisa(code), from: nat, to: dst, source: 'passportindex.org' };
}
function interpretVisa(code) {
  if (code === '-1') return { required: false, label: 'mesmo país' };
  if (code === 'visa free') return { required: false, label: 'sem visto' };
  if (/^\d+$/.test(code)) return { required: false, label: `sem visto até ${code} dias` };
  if (code === 'visa on arrival') return { required: false, label: 'visto à chegada' };
  if (code === 'eta') return { required: true, label: 'autorização eletrónica (ETA)' };
  if (code === 'e-visa') return { required: true, label: 'e-visa' };
  if (code === 'visa required') return { required: true, label: 'visto necessário' };
  if (code === 'no admission') return { required: true, label: 'entrada não permitida' };
  return { required: null, label: String(code) };
}

// ---- segurança ----
async function getSafety(cc) {
  return cache.remember(`sec:${cc}`, 720, async () => {
    try {
      const r = await fetch(`https://www.travel-advisory.info/api?countrycode=${encodeURIComponent(cc)}`);
      if (!r.ok) return null;
      const j = await r.json();
      const entry = j && j.data && j.data[cc.toUpperCase()];
      const a = entry && entry.advisory;
      if (!a) return null;
      return {
        score: typeof a.score === 'number' ? +a.score.toFixed(1) : null,
        level: scoreLevel(a.score),
        message: a.message || null,
        source: a.source || 'travel-advisory.info',
        updatedISO: a.updated || null,
      };
    } catch (e) { return null; }
  });
}

function scoreLevel(s) {
  if (s == null) return 'sem dados';
  if (s < 1) return 'risco baixo';
  if (s < 2.5) return 'risco moderado';
  if (s < 4) return 'risco elevado';
  return 'risco muito elevado';
}

// ---- clima ----
async function getWeather(lat, lng, dateOut) {
  const key = `wx:${lat.toFixed(2)},${lng.toFixed(2)}:${dateOut || 'now'}`;
  return cache.remember(key, 180, async () => {
    try {
      const days = dateOut ? Math.round((new Date(dateOut) - Date.now()) / 864e5) : 0;
      const daily = 'temperature_2m_max,temperature_2m_min,weather_code';

      // previsão (até ~16 dias)
      if (!dateOut || (days >= 0 && days <= 15)) {
        const d = dateOut || new Date().toISOString().slice(0, 10);
        const u = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=${daily}&timezone=auto&start_date=${d}&end_date=${d}`;
        return parseDaily(await fetchJSON(u), 'previsão');
      }

      // além de 16 dias: mesma data do ano anterior (típico para a época)
      const ly = shiftYear(dateOut, -1);
      const u = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&daily=${daily}&timezone=auto&start_date=${ly}&end_date=${ly}`;
      return parseDaily(await fetchJSON(u), 'típico (ano anterior)');
    } catch (e) { return null; }
  });
}

async function fetchJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('http ' + r.status);
  return r.json();
}

function parseDaily(j, basis) {
  const d = j && j.daily;
  if (!d || !d.time || !d.time.length) return null;
  return {
    max: round(d.temperature_2m_max && d.temperature_2m_max[0]),
    min: round(d.temperature_2m_min && d.temperature_2m_min[0]),
    code: d.weather_code && d.weather_code[0],
    condition: wmo(d.weather_code && d.weather_code[0]),
    basis,
  };
}

const round = (n) => (typeof n === 'number' ? Math.round(n) : null);

// WMO weather codes -> texto
function wmo(c) {
  const m = {
    0: 'céu limpo', 1: 'pouco nublado', 2: 'parcialmente nublado', 3: 'nublado',
    45: 'nevoeiro', 48: 'nevoeiro gelado', 51: 'chuvisco fraco', 53: 'chuvisco', 55: 'chuvisco forte',
    61: 'chuva fraca', 63: 'chuva', 65: 'chuva forte', 71: 'neve fraca', 73: 'neve', 75: 'neve forte',
    80: 'aguaceiros', 81: 'aguaceiros', 82: 'aguaceiros fortes', 95: 'trovoada', 96: 'trovoada com granizo', 99: 'trovoada forte',
  };
  return m[c] || (c == null ? null : 'variável');
}

function shiftYear(iso, delta) {
  const d = new Date(iso);
  d.setFullYear(d.getFullYear() + delta);
  return d.toISOString().slice(0, 10);
}

module.exports = { getExtras };
