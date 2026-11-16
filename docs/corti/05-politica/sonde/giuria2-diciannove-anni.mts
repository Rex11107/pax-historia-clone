// Sonda 2 della giuria, corte 05 (politica): 19 anni della sola fase politica e dei ministri (economia, guerre e
// stabilità ferme al 1881), per rifare in modo indipendente la sonda 3 dell'accusa, che non è nel repository.
// Uso: npx tsx docs/corti/05-politica/sonde/giuria2-diciannove-anni.mts [settimane=991] [seme=regnum]
import fs from 'node:fs';
import { newGame } from '../../../../src/engine/setup';
import { weeklyPolitics, politicsOf } from '../../../../src/engine/politics';
import { weeklyMinisters, headMinister } from '../../../../src/engine/ministers';
import { formatDate, dateOf } from '../../../../src/engine/world';
import type { GameEvent } from '../../../../src/engine/types';

const weeks = Number(process.argv[2] ?? 991), seed = process.argv[3] ?? 'regnum';
const M = JSON.parse(fs.readFileSync(new URL('../../../../public/data/europe1881.json', import.meta.url), 'utf8'));
const w = newGame(M, 'SMR', seed);
const s = w.state;
const head0 = new Map<string, string>();
for (const t of Object.keys(s.nations)) { const ps = politicsOf(w, t); if (ps) head0.set(t, ps.head); }
const opened = new Map<string, number>(), crisisEv = new Map<string, number>(), govs = new Map<string, number>(), elections = new Map<string, number>();
const heads = new Map<string, Set<string>>();
let total = { opened: 0, crisis: 0, gov: 0 };
const ghost: string[] = [];
const t0 = performance.now();
for (let i = 0; i < weeks && performance.now() - t0 < 80000; i++) {
  s.day += 7;
  const ev: GameEvent[] = [];
  weeklyPolitics(w, ev);
  weeklyMinisters(w, ev);
  for (const e of ev) {
    const t = e.nations[0];
    if (e.type === 'crisis') { total.crisis++; crisisEv.set(t, (crisisEv.get(t) ?? 0) + 1); if (/perde la maggioranza|blocca il governo|crisi a corte/.test(e.text)) { total.opened++; opened.set(t, (opened.get(t) ?? 0) + 1); } }
    if (e.type === 'government') { total.gov++; govs.set(t, (govs.get(t) ?? 0) + 1); const ps = politicsOf(w, t)!; (heads.get(t) ?? heads.set(t, new Set()).get(t)!).add(ps.head); const h = headMinister(w, t); const y = dateOf(s.day).getUTCFullYear(); if (h && y > h.years[1]) ghost.push(`${formatDate(s.day)} ${t}: ${ps.head} (scheda ${h.years.join('-')})`); }
    if (e.type === 'election') elections.set(t, (elections.get(t) ?? 0) + 1);
  }
}
console.log(`fino al ${formatDate(s.day)} in ${Math.round((performance.now() - t0) / 1000)} s`);
console.log(`eventi 'crisis' ${total.crisis}, di cui aperture di crisi ${total.opened}; cambi di governo ${total.gov}`);
const all = [...new Set([...opened.keys(), ...govs.keys()])].sort((a, b) => (govs.get(b) ?? 0) - (govs.get(a) ?? 0));
console.log('per nazione (aperture / eventi crisis / governi / elezioni):');
console.log(all.map((t) => `${t} ${opened.get(t) ?? 0}/${crisisEv.get(t) ?? 0}/${govs.get(t) ?? 0}/${elections.get(t) ?? 0}`).join('; '));
const reg = (t: string) => politicsOf(w, t)?.regime;
for (const r of ['constitutional', 'autocracy'] as const) {
  const ts = Object.keys(s.nations).filter((t) => reg(t) === r);
  console.log(`${r}: ${ts.length} nazioni, aperture ${ts.reduce((a, t) => a + (opened.get(t) ?? 0), 0)}, cambi di governo ${ts.reduce((a, t) => a + (govs.get(t) ?? 0), 0)}`);
}
console.log(`capi al ${formatDate(s.day)}: ${['ITA', 'FRA', 'GBR', 'GER', 'AUH', 'RUS', 'TUR', 'SPA', 'POR', 'SWE', 'SER', 'USA'].map((t) => `${t} ${politicsOf(w, t)!.head}${politicsOf(w, t)!.head === head0.get(t) ? ' (=1881)' : ''}`).join('; ')}`);
console.log(`capi diversi in Francia: ${[...(heads.get('FRA') ?? [])].join(', ')}`);
console.log(`nomine di capi oltre gli anni della loro scheda: ${ghost.length}; prime: ${ghost.slice(0, 6).join(' | ')}`);
