// Formatação reutilizável.
export const fmtH = (h) => {
  const m = Math.round(h * 60);
  return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;
};
export const fmtKm = (km) => Math.round(km).toLocaleString('pt-PT') + ' km';
export const num = (n) => Number(n).toLocaleString('pt-PT');
