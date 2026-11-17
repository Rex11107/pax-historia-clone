// Governi e crisi per paese in 19 anni (1881-1899), sole nazioni non giocanti: serve a tarare la politica interna
// (corte 05; fase C, «frequenza delle crisi per paese»). Conta i cambi di governo e le crisi aperte di ogni paese
// e scrive il capo e il regime al 30 dicembre 1899. Circa 2-3 minuti.
// Uso: npx tsx scripts/sim/governi.mts [seme=regnum] [sigle separate da virgola]
import fs from 'node:fs';
import { newGame } from '../../src/engine/setup';
import { runTurn } from '../../src/engine/turn';
import { politicsOf } from '../../src/engine/politics';

const seed = process.argv[2] ?? 'regnum';
const tags = (process.argv[3] ?? 'ITA,FRA,GBR,GER,AUH,RUS,TUR,SPA,NED,BEL,USA,BOL,COL,MEX').split(',');
const M = JSON.parse(fs.readFileSync(new URL('../../public/data/europe1881.json', import.meta.url), 'utf8'));
const w = newGame(M, 'SMR', seed);
const gov: Record<string, number> = {}, open: Record<string, number> = {};
// 6939 giorni: dal 1° gennaio 1881 al 31 dicembre 1899
while (w.state.day < 6939) for (const e of runTurn(w).events) {
  if (e.nations?.length !== 1 || !tags.includes(e.nations[0])) continue;
  const t = e.nations[0];
  if (e.type === 'government') gov[t] = (gov[t] ?? 0) + 1;
  if (e.type === 'crisis_open') open[t] = (open[t] ?? 0) + 1;
}
for (const t of tags) {
  const ps = politicsOf(w, t);
  console.log(`${t.padEnd(4)} governi ${String(gov[t] ?? 0).padStart(3)}  crisi ${String(open[t] ?? 0).padStart(3)}  capo nel 1899: ${ps?.head ?? '-'} (${ps?.regime ?? '-'})`);
}
