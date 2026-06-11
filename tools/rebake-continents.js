// Re-aplica os overrides de continente (server/lib/region.js) ao dataset de
// aeroportos. Corre depois de editares a lista MIDDLE_EAST / OVERRIDES:
//   node tools/rebake-continents.js
const fs = require('fs');
const path = require('path');
const { OVERRIDES } = require('../server/lib/region');

const P = path.join(__dirname, '..', 'public', 'data', 'airports.json');
const data = JSON.parse(fs.readFileSync(P, 'utf8'));

// Nota: isto só CONSEGUE mover países para os overrides; não desfaz overrides
// removidos (a continente original ficou para trás). Se removeres países da
// lista, regenera o dataset a partir do OurAirports. Para adicionar, basta isto.
let n = 0;
for (const a of data) {
  const ov = OVERRIDES[a.cc];
  if (ov && a.continent !== ov) { a.continent = ov; n++; }
}
fs.writeFileSync(P, JSON.stringify(data));
console.log(`Atualizados ${n} aeroportos.`);
