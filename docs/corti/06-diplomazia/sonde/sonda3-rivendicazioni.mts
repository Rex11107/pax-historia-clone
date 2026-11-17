// Sonda 3 della corte 06 (diplomazia): le rivendicazioni al 1° gennaio 1881, per coppia (chi rivendica → padrone) e forza.
// Uso: npx tsx docs/corti/06-diplomazia/sonde/sonda3-rivendicazioni.mts
import fs from 'node:fs';
import { newGame } from '../../../../src/engine/setup';
import { claimsOn } from '../../../../src/engine/claims';

const M = JSON.parse(fs.readFileSync(new URL('../../../../public/data/europe1881.json', import.meta.url), 'utf8'));
const w = newGame(M, 'SMR', 'corte06');
const s = w.state;
const pairs = new Map<string, { n: number; ex: string[] }>();
let total = 0, provs = 0;
const t0 = performance.now();
for (let p = 0; p < w.map.size; p++) {
  const cl = claimsOn(w, p);
  if (cl.length) provs++;
  for (const c of cl) {
    total++;
    const k = `${c.nation}→${s.owner[p] || 'nessuno'} ${c.strength}`;
    const v = pairs.get(k) ?? { n: 0, ex: [] };
    v.n++; if (v.ex.length < 3) v.ex.push(`${w.map.provinces[p].name} (${c.reason})`);
    pairs.set(k, v);
  }
}
console.log(`${total} rivendicazioni su ${provs} province, calcolate in ${Math.round(performance.now() - t0)} ms`);
const majors = new Set(Object.keys(s.nations).filter((t) => w.profiles[t].major));
const rows = [...pairs].sort((a, b) => b[1].n - a[1].n);
console.log('--- fra grandi potenze o verso grandi potenze, nucleo e storiche ---');
for (const [k, v] of rows) { const [a, rest] = k.split('→'); const [o, str] = rest.split(' '); if ((majors.has(a) || majors.has(o)) && str !== 'pretesa') console.log(`${k}: ${v.n} — ${v.ex.join('; ')}`); }
console.log('--- le 15 coppie più numerose in assoluto ---');
for (const [k, v] of rows.slice(0, 15)) console.log(`${k}: ${v.n} — ${v.ex.join('; ')}`);
