// Sonda 2 della corte 06 (diplomazia): il mondo senza LLM per qualche anno. Trattati firmati e scaduti,
// stima fra le grandi potenze all'inizio e alla fine, eventi dei soggetti. Si ferma a 75 s.
// Uso: npx tsx docs/corti/06-diplomazia/sonde/sonda2-tempo.mts [settimane=170] [seme=corte06]
import fs from 'node:fs';
import { newGame } from '../../../../src/engine/setup';
import { runTurn } from '../../../../src/engine/turn';
import { formatDate } from '../../../../src/engine/world';

const weeks = Number(process.argv[2] ?? 170), seed = process.argv[3] ?? 'corte06';
const M = JSON.parse(fs.readFileSync(new URL('../../../../public/data/europe1881.json', import.meta.url), 'utf8'));
const w = newGame(M, 'SMR', seed);
const s = w.state;
const majors = Object.keys(s.nations).filter((t) => w.profiles[t].major);
const op0 = new Map<string, number>();
for (const a of majors) for (const b of majors) if (a !== b) op0.set(`${a}>${b}`, s.nations[a].opinion[b] ?? 0);
const treaties0 = s.treaties.map((t) => `${t.type}:${t.a}-${t.b}`);
const count = new Map<string, number>();
const log: string[] = [];
const t0 = performance.now();
let i = 0;
for (; i < weeks && performance.now() - t0 < 75000; i++) {
  const rep = runTurn(w);
  for (const e of rep.events) {
    if (['treaty_signed', 'treaty_expired', 'treaty_violated', 'subject', 'war_declared', 'war_joined'].includes(e.type)) {
      count.set(e.type, (count.get(e.type) ?? 0) + 1);
      if (e.type !== 'treaty_signed' || !/commerciale/.test(e.text)) log.push(`${formatDate(e.day)} [${e.type}] ${e.text}`);
    }
  }
}
console.log(`${i} settimane in ${Math.round((performance.now() - t0) / 1000)} s, fino al ${formatDate(s.day)}`);
console.log(`eventi: ${[...count].map(([k, v]) => `${k} ${v}`).join(', ')}`);
const nowT = s.treaties.filter((t) => t.type !== 'trade').map((t) => `${t.type}:${t.a}-${t.b}`);
console.log(`trattati non commerciali all'inizio ${treaties0.length}, ora ${nowT.length}; nuovi: ${nowT.filter((x) => !treaties0.includes(x)).join(', ') || 'nessuno'}; spariti: ${treaties0.filter((x) => !nowT.includes(x)).join(', ') || 'nessuno'}`);
const moved: string[] = [];
for (const a of majors) for (const b of majors) if (a !== b) { const d = (s.nations[a].opinion[b] ?? 0) - op0.get(`${a}>${b}`)!; if (Math.abs(d) >= 8) moved.push(`${a}→${b} ${op0.get(`${a}>${b}`)}→${s.nations[a].opinion[b] ?? 0}`); }
console.log(`stime fra grandi potenze cambiate di almeno 8 punti: ${moved.length} su ${majors.length * (majors.length - 1)}: ${moved.join('; ')}`);
console.log('--- eventi (esclusi gli accordi commerciali firmati) ---');
for (const l of log.slice(0, 60)) console.log(l);
