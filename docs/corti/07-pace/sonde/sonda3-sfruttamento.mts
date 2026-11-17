// Sonda 3 della corte 07 (pace): quanto si compra con i punti, e chi può essere ridotto a vassallo.
// Uso: npx tsx docs/corti/07-pace/sonde/sonda3-sfruttamento.mts
import fs from 'node:fs';
import { newGame } from '../../../../src/engine/setup';
import * as P from '../../../../src/engine/peace';
import { declareWar } from '../../../../src/engine/diplomacy';

const M = JSON.parse(fs.readFileSync(new URL('../../../../public/data/europe1881.json', import.meta.url), 'utf8'));
const EU = M.euCount ?? 1375;
const r1 = (v: number) => Math.round(v * 10) / 10;

// A. Francia che ha occupato le isole britanniche: cosa le propone il motore, e quanta popolazione coloniale costiera
//    potrebbe chiedere con gli stessi punti (a costo doppio perché non occupata)
{
  const w = newGame(M, 'SMR', 'corte07'); const s = w.state;
  declareWar(w, 'FRA', 'GBR', 'sonda');
  const war = s.wars.at(-1)!;
  for (const p of w.map.provinces) if (s.owner[p.id] === 'GBR' && p.id < EU) s.controller[p.id] = 'FRA';
  const budget = P.budgetOf(w, war, 'FRA');
  const sug = P.suggestDemands(w, war, 'FRA', budget);
  console.log(`A. bilancio FRA ${budget}; proposta del motore: ${sug.map((d) => d.type + (d.type === 'cede' ? `(${d.provinces.length})` : d.type === 'indemnity' ? `(${d.amount} M)` : '')).join(', ')}`);
  const coastal = w.map.provinces.filter((p) => s.owner[p.id] === 'GBR' && p.id >= EU && p.coast && !p.impassable && p.id !== s.nations.GBR.capital).sort((a, b) => b.pop - a.pop);
  let left = budget, pop = 0; const got: number[] = [];
  for (const p of coastal) {
    const c = P.checkCession(w, 'GBR', 'FRA', [...got, p.id]);
    if (c.refusal || c.cost > budget) continue;
    got.push(p.id); left = budget - c.cost; pop += p.pop;
    if (got.length >= 30) break;
  }
  const c = P.checkCession(w, 'GBR', 'FRA', got);
  console.log(`A. con ${budget} punti: ${got.length} province coloniali costiere non occupate (${got.slice(0, 5).map((p) => w.map.provinces[p].name).join(', ')}…), ${r1(pop / 1e6)} milioni di abitanti, costo ${c.cost}, rifiuto ${c.refusal}`);
  console.log(`   per confronto: occupate le isole (${r1(w.map.provinces.filter((p) => s.owner[p.id] === 'GBR' && p.id < EU).reduce((a, p) => a + p.pop, 0) / 1e6)} M ab.), il motore propone solo indennità`);
}

// B. chi può diventare vassallo: le nazioni non 'major' più grandi
{
  const w = newGame(M, 'SMR', 'corte07'); const s = w.state;
  const rows = Object.keys(s.nations).filter((t) => s.nations[t].alive && !w.profiles[t].major).map((t) => ({ t, prov: w.map.provinces.filter((p) => s.owner[p.id] === t).length, pop: w.map.provinces.filter((p) => s.owner[p.id] === t).reduce((a, p) => a + p.pop, 0) })).sort((a, b) => b.pop - a.pop).slice(0, 10);
  console.log(`B. le dieci nazioni non 'grandi potenze' più popolose (vassallabili per 45 punti, protettorato per 60): ${rows.map((r) => `${r.t} ${r1(r.pop / 1e6)} M/${r.prov} prov.`).join('; ')}`);
  for (const [from, to] of [['SPA', 'POR'], ['CHN', 'JAP'], ['SPA', 'FRA'], ['GRE', 'TUR'], ['SER', 'BUL']]) {
    if (!s.nations[from] || !s.nations[to]) { console.log(`B. ${from}/${to} non esiste`); continue; }
    const d = P.demandCost(w, { type: 'vassal', from, to, level: 'vassallo' });
    console.log(`B. ${from} vassallo di ${to}: costo ${d.cost}, rifiuto ${d.refusal}; un quarto della ${from} ceduto invece costerebbe ≥ ${r1(25 * 0.6)}-${r1(25 * 1.8)} punti`);
  }
}
