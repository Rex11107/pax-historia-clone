// Sonda 1: bilancio di partenza scomposto + 3 anni di simulazione (UK, USA, GER, FRA, ITA, RUS)
import fs from 'node:fs';
import { newGame } from '/home/claude/pax-historia-clone/src/engine/setup';
import { runTurn } from '/home/claude/pax-historia-clone/src/engine/turn';
import { budget } from '/home/claude/pax-historia-clone/src/engine/economy';
import { colonialWeight } from '/home/claude/pax-historia-clone/src/engine/ethnic';
import { industryOf } from '/home/claude/pax-historia-clone/src/engine/construction';
import { govEffects } from '/home/claude/pax-historia-clone/src/engine/politics';

const M = JSON.parse(fs.readFileSync('/home/claude/pax-historia-clone/public/data/europe1881.json', 'utf8'));
const w = newGame(M, 'SMR', 'regnum');
const s = w.state;
const T = ['GBR', 'USA', 'GER', 'FRA', 'ITA', 'RUS', 'AUH', 'TUR', 'CHN', 'JAP'].filter((t) => s.nations[t]);
const info = (t: string) => {
  let raw = 0, eff = 0, prov = 0;
  for (let i = 0; i < s.owner.length; i++) if (s.owner[i] === t) { raw += w.map.provinces[i].pop; eff += w.map.provinces[i].pop * colonialWeight(w, t, i) * (w.profiles[t].fiscal ?? 1); if (!w.map.provinces[i].impassable) prov++; }
  const men = s.units.filter((u) => u.nation === t).reduce((a, u) => a + u.strength, 0);
  return { rawM: +(raw / 1e6).toFixed(1), effM: +(eff / 1e6).toFixed(1), prov, men, ind: industryOf(w, t), govInc: govEffects(w, t).income };
};
console.log('=== PARTENZA ===');
for (const t of T) { const b = budget(w, t); console.log(t, JSON.stringify(info(t)), 'treas', s.nations[t].treasury, 'debt', s.nations[t].debt, JSON.stringify(b)); }
const t0 = performance.now();
const ext: Record<string, Record<string, number>> = {};
for (let i = 0; i < 156; i++) {
  runTurn(w);
  for (const t of T) { const e = s.nations[t].lastExtra ?? {}; ext[t] ??= {}; for (const [k, v] of Object.entries(e)) ext[t][k] = (ext[t][k] ?? 0) + (v as number); }
  if (performance.now() - t0 > 75000) { console.log('stop a turno', i); break; }
}
console.log('=== DOPO 3 ANNI ===', ((performance.now() - t0) / 1000).toFixed(0), 's');
for (const t of T) { const b = s.nations[t].lastBudget!; console.log(t, JSON.stringify(info(t)), 'treas', Math.round(s.nations[t].treasury), 'debt', Math.round(s.nations[t].debt), 'tax', s.nations[t].policies.tax, JSON.stringify(b)); console.log('   extra 3 anni', JSON.stringify(Object.fromEntries(Object.entries(ext[t]).map(([k, v]) => [k, Math.round(v)])))); }
