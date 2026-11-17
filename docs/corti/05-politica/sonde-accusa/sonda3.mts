// Sonda 3 (accusa, corte politica): 19 anni della SOLA fase politica (economia, guerre e stabilità ferme al 1881),
// per vedere a lungo termine chi governa, quante crisi vere (avvii) e quanti eventi "crisis" totali, e i capi del 1899.
import fs from 'node:fs';
import { newGame } from '/home/claude/pax-historia-clone/src/engine/setup';
import { weeklyPolitics, politicsOf } from '/home/claude/pax-historia-clone/src/engine/politics';
import { weeklyMinisters, cabinetSummary } from '/home/claude/pax-historia-clone/src/engine/ministers';
import { formatDate } from '/home/claude/pax-historia-clone/src/engine/world';
import type { GameEvent } from '/home/claude/pax-historia-clone/src/engine/types';

const M = JSON.parse(fs.readFileSync('/home/claude/pax-historia-clone/public/data/europe1881.json', 'utf8'));
const w = newGame(M, 'SMR', 'regnum');
const s = w.state;
const c: Record<string, { start: number; ev: number; gov: number; el: number; heads: Set<string> }> = {};
for (let i = 0; i < 991; i++) {
  s.day += 7;
  const sink: GameEvent[] = [];
  weeklyPolitics(w, sink);
  weeklyMinisters(w, sink);
  for (const e of sink) for (const t of e.nations) {
    c[t] ??= { start: 0, ev: 0, gov: 0, el: 0, heads: new Set() };
    if (e.type === 'crisis') { c[t].ev++; if (/fiducia \d+\)/.test(e.text)) c[t].start++; }
    if (e.type === 'government') { c[t].gov++; c[t].heads.add(politicsOf(w, t)!.head); }
    if (e.type === 'election') c[t].el++;
  }
}
const out: string[] = [`fino a ${formatDate(s.day)}`];
const tot = Object.values(c).reduce((a, v) => ({ s: a.s + v.start, e: a.e + v.ev, g: a.g + v.gov }), { s: 0, e: 0, g: 0 });
out.push(`crisi avviate ${tot.s}, eventi 'crisis' totali ${tot.e}, cambi di governo ${tot.g}`);
for (const [t, v] of Object.entries(c).sort((a, b) => b[1].ev - a[1].ev)) out.push(`${t}: avvii ${v.start}, eventi ${v.ev}, governi ${v.gov}, elezioni ${v.el}, capi ${[...v.heads].join(' | ')}`);
out.push('--- capi e gabinetti al 1899');
for (const t of ['ITA', 'FRA', 'GBR', 'GER', 'AUH', 'RUS', 'TUR', 'SPA', 'POR', 'USA']) out.push(`${t}: ${politicsOf(w, t)!.head} (${politicsOf(w, t)!.gov.join('+')}); ${cabinetSummary(w, t)}`);
fs.writeFileSync('/tmp/claude-0/-home-claude/71d1d435-b3ef-5492-bb1b-33ac771cd107/scratchpad/corti/05-politica/sonda3.out', out.join('\n'));
console.log(out.join('\n'));
