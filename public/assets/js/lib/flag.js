// Bandeiras como IMAGEM (flagcdn). Os emojis de bandeira não são desenhados
// no Windows (aparecem as letras "PT", "FR"…), por isso usamos imagens reais.
export function flagImg(cc, cls = '') {
  if (!cc || cc.length !== 2) return '';
  const c = cc.toLowerCase();
  return `<img class="flagimg ${cls}" src="https://flagcdn.com/w40/${c}.png" alt="${cc}" loading="lazy">`;
}
