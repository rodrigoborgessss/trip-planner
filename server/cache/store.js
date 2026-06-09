// Cache simples em memória com TTL.
// Serve para dados estáticos (países, atividades, segurança).
// NÃO uses para preços de voos/hotéis: expiram em minutos e muitos
// fornecedores proíbem cachear preços nos termos de uso.
const config = require('../config');

const store = new Map();

function get(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

function set(key, value, ttlMin = config.cacheTtlMin) {
  store.set(key, { value, expires: Date.now() + ttlMin * 60_000 });
  return value;
}

// helper: usa cache ou corre a função e guarda
async function remember(key, ttlMin, fn) {
  const hit = get(key);
  if (hit) return hit;
  return set(key, await fn(), ttlMin);
}

module.exports = { get, set, remember };
