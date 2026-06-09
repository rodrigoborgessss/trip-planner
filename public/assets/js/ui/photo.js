// Foto de cidade via backend (/api/photo) — assim a chave do Pexels fica no
// servidor. Carregamento lazy: só pede quando o cartão entra no ecrã.
// Se não houver foto, fica o fundo gradiente por baixo.
const cache = new Map();

export async function cityPhoto(city, country) {
  const key = `${city || ''}|${country || ''}`;
  if (cache.has(key)) return cache.get(key);
  try {
    const r = await fetch(`/api/photo?city=${encodeURIComponent(city || '')}&country=${encodeURIComponent(country || '')}`);
    const j = await r.json();
    cache.set(key, j.url || null);
    return j.url || null;
  } catch (e) {
    cache.set(key, null);
    return null;
  }
}

export function lazyPhoto(el, city, country) {
  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach(async (e) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const src = await cityPhoto(city, country);
        if (src) {
          const img = new Image();
          img.onload = () => { el.style.backgroundImage = `url("${src}")`; el.classList.add('has-photo'); };
          img.src = src;
        }
      });
    },
    { rootMargin: '250px' }
  );
  io.observe(el);
}
