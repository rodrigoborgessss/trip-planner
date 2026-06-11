// Override de continente por país (ISO-2).
// Agrupa o Médio Oriente numa categoria própria (em vez de Ásia/Europa).
// Acrescenta ou remove países aqui; depois corre tools/rebake-continents.js
// para refletir no dataset (que é o que o mapa lê diretamente).
const MIDDLE_EAST = ["IL", "PS", "TR", "LB", "SY", "JO", "IQ", "IR", "SA", "YE", "OM", "AE", "QA", "BH", "KW"];

const OVERRIDES = Object.fromEntries(MIDDLE_EAST.map((cc) => [cc, 'Médio Oriente']));
// exemplos extra (debatíveis): EG e CY ficam de fora por defeito.

function continentOf(cc, fallback) {
  return (cc && OVERRIDES[cc.toUpperCase()]) || fallback;
}

module.exports = { continentOf, OVERRIDES, MIDDLE_EAST };
