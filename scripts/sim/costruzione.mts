// Costruzione e ricerca in 19 anni (1881-1899), solo nazioni non giocanti: per paese quante province hanno opere,
// quanti porti, quante ricerche completate e a che ritmo, e quanti patti di collaborazione fra non giocanti
// (corte 04; fase C). Circa 3 minuti. Uso: npx tsx scripts/sim/costruzione.mts [seme=regnum] [sigle]
import fs from 'node:fs';
import { newGame } from '../../src/engine/setup';
import { runTurn } from '../../src/engine/turn';
import { buildings, industryOf } from '../../src/engine/construction';
import { research } from '../../src/engine/research';

const seed = process.argv[2] ?? 'regnum';
const tags = (process.argv[3] ?? 'GBR,FRA,GER,RUS,AUH,ITA,TUR,SPA,NED,BEL,USA,JAP').split(',');
const M = JSON.parse(fs.readFileSync(new URL('../../public/data/europe1881.json', import.meta.url), 'utf8'));
const w = newGame(M, 'SMR', seed);
const start: Record<string, { known: number; ind: number; prov: number; ports: number }> = {};
const snap = (t: string) => {
  const b = buildings(w);
  let prov = 0, ports = 0;
  for (let p = 0; p < b.length; p++) if (w.state.owner[p] === t) { if (Object.keys(b[p]).length) prov++; ports += b[p].porto ?? 0; }
  return { known: research(w).known[t]?.length ?? 0, ind: industryOf(w, t), prov, ports };
};
for (const t of tags) start[t] = snap(t);
let collab = 0;
const done: Record<string, number> = {};
while (w.state.day < 6939) for (const e of runTurn(w).events) {
  if (e.type === 'research_done' && (e.nations?.length ?? 0) > 1) collab++;
  if (e.type === 'research_done') for (const t of e.nations ?? []) done[t] = (done[t] ?? 0) + 1;
}
console.log(`patti di ricerca completati: ${collab}`);
for (const t of tags) {
  const a = start[t], b = snap(t);
  console.log(`${t.padEnd(4)} province con opere ${String(a.prov).padStart(3)} → ${String(b.prov).padStart(3)}  porti ${String(a.ports).padStart(3)} → ${String(b.ports).padStart(3)}  industria ${String(a.ind).padStart(3)} → ${String(b.ind).padStart(3)}  conoscenze ${String(a.known).padStart(3)} → ${String(b.known).padStart(3)}  ricerche finite ${done[t] ?? 0}`);
}
