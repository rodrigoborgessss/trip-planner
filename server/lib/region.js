// Override de continente por país (ISO-2).
// Por defeito vazio: usa-se o continente real dos dados.
// Israel, por exemplo, está geograficamente na Ásia (Médio Oriente). Se
// preferires agrupá-lo de outra forma (ex.: com a Europa, por causa dos voos),
// acrescenta aqui: { IL: 'Europa' }. Mesma ideia para Turquia, Chipre, etc.
const OVERRIDES = {
  // IL: 'Europa',
};

function continentOf(cc, fallback) {
  return (cc && OVERRIDES[cc.toUpperCase()]) || fallback;
}

module.exports = { continentOf, OVERRIDES };
