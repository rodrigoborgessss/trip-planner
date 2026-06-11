// Enriquece itens (POIs, hotéis) com FOTO e FAMA, via Wikidata (em lote).
// - foto: imagem do Wikidata (P18) -> miniatura do Wikimedia Commons.
//         também aceita a tag wikimedia_commons (File:...) do OSM.
// - fama: número de Wikipédias (línguas) que têm artigo do sítio. É a melhor
//         medida grátis de "famoso" — a Torre dos Clérigos tem dezenas, um
//         miradouro de bairro tem zero.
const UA = 'TripPlanner/1.0 (projeto pessoal)';

function commonsThumb(file) {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=500`;
}

async function enrichImages(items) {
  // foto direta a partir da tag commons (se for um ficheiro)
  for (const it of items) {
    if (!it.photo && it.commons) it.photo = commonsThumb(it.commons);
  }
  const needWd = items.filter((it) => it.wikidata);
  for (let i = 0; i < needWd.length; i += 45) {
    const batch = needWd.slice(i, i + 45);
    const ids = batch.map((b) => b.wikidata).join('|');
    try {
      const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${ids}`
        + `&props=claims|sitelinks&format=json`;
      const r = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!r.ok) continue;
      const j = await r.json();
      for (const b of batch) {
        const ent = j.entities && j.entities[b.wikidata];
        if (!ent) continue;
        b.fame = ent.sitelinks ? Object.keys(ent.sitelinks).length : 0;
        if (!b.photo) {
          const p18 = ent.claims && ent.claims.P18 && ent.claims.P18[0];
          const file = p18 && p18.mainsnak && p18.mainsnak.datavalue && p18.mainsnak.datavalue.value;
          if (file) b.photo = commonsThumb(file);
        }
      }
    } catch (e) { /* segue sem foto/fama */ }
  }
  return items;
}

module.exports = { enrichImages, commonsThumb, enrichFame };

// só a FAMA (nº de Wikipédias), sem foto — usado para ordenar atividades.
async function enrichFame(items) {
  const needWd = items.filter((it) => it.wikidata);
  for (let i = 0; i < needWd.length; i += 45) {
    const batch = needWd.slice(i, i + 45);
    const ids = batch.map((b) => b.wikidata).join('|');
    try {
      const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${ids}&props=sitelinks&format=json`;
      const r = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!r.ok) continue;
      const j = await r.json();
      for (const b of batch) {
        const ent = j.entities && j.entities[b.wikidata];
        b.fame = ent && ent.sitelinks ? Object.keys(ent.sitelinks).length : 0;
      }
    } catch (e) { /* segue sem fama */ }
  }
  return items;
}
