// Sonda 2 della corte 07 (pace): guerre fra Stati imposte a mano (le nazioni non giocanti non le dichiarano da sole)
// e lasciate al motore fino alla pace. Registra punteggio settimana per settimana, chi chiude e con quali condizioni.
// Uso: npx tsx docs/corti/07-pace/sonde/sonda2-guerre.mts [settimane=110] [seme=corte07]
import fs from 'node:fs';
import { newGame } from '../../../../src/engine/setup';
import { runTurn } from '../../../../src/engine/turn';
import { declareWar } from '../../../../src/engine/diplomacy';
import { warScore } from '../../../../src/engine/peace';
import { formatDate } from '../../../../src/engine/world';
import type { GameEvent } from '../../../../src/engine/types';

const weeks = Number(process.argv[2] ?? 110), seed = process.argv[3] ?? 'corte07';
const M = JSON.parse(fs.readFileSync(new URL('../../../../public/data/europe1881.json', import.meta.url), 'utf8'));
const w = newGame(M, 'SMR', seed);
const s = w.state;
const pairs: [string, string][] = [['ITA', 'AUH'], ['RUS', 'TUR'], ['SER', 'BUL'], ['GRE', 'TUR'], ['FRA', 'GER'], ['SPA', 'POR']];
const wars: { id: string; name: string; att: string[]; def: string[]; last?: ReturnType<typeof warScore>; maxPts: number; end?: string }[] = [];
for (const [a, b] of pairs) {
  const err = declareWar(w, a, b, 'sonda della corte');
  const war = s.wars.at(-1)!;
  if (err) { console.log(`${a}-${b}: ${err}`); continue; }
  wars.push({ id: war.id, name: war.name, att: [...war.attackers], def: [...war.defenders], maxPts: 0 });
}
const keep = new Set(['peace', 'cession', 'subject', 'indemnity', 'liberation', 'trade', 'dismantle', 'demilitarize', 'alliances', 'annex', 'nation_annexed']);
const log: string[] = [];
const t0 = performance.now();
for (let i = 0; i < weeks && performance.now() - t0 < 75000; i++) {
  for (const x of wars) {
    const war = s.wars.find((y) => y.id === x.id);
    if (war) { x.last = warScore(w, war); x.maxPts = Math.max(x.maxPts, x.last.points); x.att = [...war.attackers]; x.def = [...war.defenders]; }
  }
  const rep = runTurn(w);
  for (const e of rep.events as GameEvent[]) if (keep.has(e.type)) log.push(`${formatDate(s.day)} [${e.type}] ${e.text}`);
  for (const x of wars) if (!x.end && !s.wars.some((y) => y.id === x.id)) x.end = formatDate(s.day);
}
console.log(`settimane simulate in ${Math.round((performance.now() - t0) / 1000)} s; giorno ${formatDate(s.day)}`);
for (const x of wars) {
  const l = x.last!;
  const ex = (t: string[]) => t.map((q) => `${q}:${Math.round(s.nations[q]?.warExhaustion ?? 0)}`).join(' ');
  console.log(`${x.name} [${x.att.join('+')} contro ${x.def.join('+')}] fine: ${x.end ?? 'IN CORSO'}; ultimo punteggio ${l.att}-${l.def} (punti ${l.points}, massimo visto ${x.maxPts}); quote ${Object.entries(l.share).map(([k, v]) => `${k} ${Math.round(v * 100)}%`).join(', ')}; stanchezza ora ${ex([...x.att, ...x.def])}`);
}
console.log('--- eventi di pace ---');
for (const l of log) console.log(l);
