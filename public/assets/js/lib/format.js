// Formatação reutilizável.
export const fmtH = (h) => {
  const m = Math.round(h * 60);
  return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;
};
export const fmtKm = (km) => Math.round(km).toLocaleString('pt-PT') + ' km';
export const num = (n) => Number(n).toLocaleString('pt-PT');

// Bandeiras como IMAGEM (flagcdn). Os emojis de bandeira não renderizam no
// Windows/Chrome (aparecem como "FR", "IT"…), por isso usamos imagens.
export const flagUrl = (cc) =>
  cc && cc.length === 2 ? `https://flagcdn.com/${cc.toLowerCase()}.svg` : '';
export const flagImg = (cc, cls = 'flag-img') =>
  cc && cc.length === 2
    ? `<img class="${cls}" src="${flagUrl(cc)}" alt="${cc.toUpperCase()}" loading="lazy" width="22">`
    : '';
