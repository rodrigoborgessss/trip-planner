// Tema claro/escuro, partilhado por todas as páginas. Guarda em localStorage.
const KEY = 'tp.theme';
const apply = (t) => { document.documentElement.dataset.theme = t; };
apply(localStorage.getItem(KEY) || 'dark');

function icon(t) { return t === 'light' ? '🌙' : '☀️'; }

function mount() {
  if (document.getElementById('themeToggle')) return;
  const b = document.createElement('button');
  b.id = 'themeToggle';
  b.type = 'button';
  b.setAttribute('aria-label', 'Alternar tema claro/escuro');
  b.title = 'Tema claro/escuro';
  b.textContent = icon(document.documentElement.dataset.theme);
  b.onclick = () => {
    const t = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    apply(t);
    localStorage.setItem(KEY, t);
    b.textContent = icon(t);
    window.dispatchEvent(new CustomEvent('tp-theme', { detail: t }));
  };
  document.body.appendChild(b);
}

if (document.body) mount();
else addEventListener('DOMContentLoaded', mount);
