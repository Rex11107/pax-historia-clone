// Sonda 1 (accusa, corte politica): corsa lunga con sole nazioni non giocanti, conta crisi/governi/elezioni per nazione.
import fs from 'node:fs';
import { newGame } from '/home/claude/pax-historia-clone/src/engine/setup';
import { runTurn } from '/home/claude/pax-historia-clone/src/engine/turn';
import { formatDate } from '/home/claude/pax-historia-clone/src/engine/world';
import { politicsOf } from '/home/claude/pax-historia-clone/src/engine/politics';
import { ethnicStability, foreignShare } from '/home/claude/pax-historia-clone/src/engine/ethnic';
import { cabinetSummary } from '/home/claude/pax-historia-clone/src/engine/ministers';
import { stabilityTarget } from '/home/claude/pax-historia-clone/src/engine/economy';

const M = JSON.parse(fs.readFileSync('/home/claude/pax-historia-clone/public/data/europe1881.json', 'utf8'));
const w = newGame(M, 'SMR', 'regnum');
const s = w.state;
const WATCH = ['ITA', 'FRA', 'GBR', 'GER', 'AUH', 'RUS', 'TUR', 'SPA', 'POR', 'BEL', 'NED', 'DEN', 'SWE', 'SWI', 'GRE', 'ROM', 'SER', 'BUL', 'EGY', 'TUN', 'USA', 'MEX', 'BRA', 'JAP', 'CHI', 'PER', 'ARG'];
const cnt: Record<string, { crisis: number; gov: number; elec: number }> = {};
const heads: Record<string, string[]> = {};
const t0 = performance.now();
const stabLog: string[] = [];
for (const t of WATCH) { const ps = politicsOf(w, t); heads[t] = ps ? [`${formatDate(0)} ${ps.head} [${ps.regime}] conf ${ps.confidence} el ${ps.nextElection}`] : ['(nessuna politica)']; }
let turns = 0;
while (performance.now() - t0 < 78000) {
  const r = runTurn(w);
  turns++;
  for (const e of r.events) {
    if (!['crisis', 'government', 'election'].includes(e.type)) continue;
    for (const t of e.nations) {
      cnt[t] ??= { crisis: 0, gov: 0, elec: 0 };
      if (e.type === 'crisis') cnt[t].crisis++; else if (e.type === 'government') cnt[t].gov++; else cnt[t].elec++;
      if (WATCH.includes(t) && e.type !== 'crisis') heads[t].push(`${formatDate(s.day)} ${e.text.slice(0, 160)}`);
    }
  }
  if (turns % 52 === 0) stabLog.push(`${formatDate(s.day)}: ` + WATCH.slice(0, 12).map((t) => `${t} st${Math.round(s.nations[t].stability)}/conf${Math.round(politicsOf(w, t)?.confidence ?? -1)}`).join(' '));
}
const out: string[] = [];
out.push(`turni ${turns}, fino a ${formatDate(s.day)}, ${Math.round(performance.now() - t0)} ms`);
const all = Object.entries(cnt);
const tot = all.reduce((a, [, v]) => ({ c: a.c + v.crisis, g: a.g + v.gov, e: a.e + v.elec }), { c: 0, g: 0, e: 0 });
out.push(`totali: crisi ${tot.c}, governi ${tot.g}, elezioni ${tot.e}, nazioni coinvolte ${all.length}`);
out.push('per nazione (crisi/governi/elezioni):');
out.push(all.sort((a, b) => b[1].crisis - a[1].crisis).map(([t, v]) => `${t} ${v.crisis}/${v.gov}/${v.elec}`).join(', '));
const generic = all.filter(([t]) => !WATCH.slice(0, 20).includes(t));
out.push(`nazioni non europee/ripiego: ${generic.length}, loro crisi ${generic.reduce((a, [, v]) => a + v.crisis, 0)}, governi ${generic.reduce((a, [, v]) => a + v.gov, 0)}`);
// elezioni sincronizzate dei ripieghi
const elDays: Record<string, number> = {};
for (const t of Object.keys(s.nations)) { const ps = s.politics?.[t]; if (ps?.nextElection != null && !WATCH.slice(0, 20).includes(t)) { const k = formatDate(ps.nextElection); elDays[k] = (elDays[k] ?? 0) + 1; } }
out.push('prossime elezioni dei ripieghi (data: quante nazioni): ' + JSON.stringify(elDays));
for (const t of WATCH) { out.push(`--- ${t}`); out.push(...heads[t]); const ps = politicsOf(w, t); if (ps) out.push(`  fine: ${ps.head} gov ${ps.gov.join('+')} conf ${ps.confidence} seats ${ps.parties.map((p) => `${p.id}:${p.seats}/${p.pop}`).join(' ')}`); }
out.push('--- stabilità/fiducia ogni anno'); out.push(...stabLog);
out.push('--- etnie: quota estranea e effetto');
for (const t of ['GBR', 'FRA', 'GER', 'ITA', 'RUS', 'AUH', 'TUR', 'POR', 'BEL', 'SPA']) out.push(`${t} foreign ${foreignShare(w, t).toFixed(3)} base ${s.ethnicBase?.[t]?.toFixed(3)} effetto ${ethnicStability(w, t).toFixed(2)} target ${stabilityTarget(w, t).toFixed(1)}`);
out.push('--- gabinetti'); for (const t of ['ITA', 'FRA', 'GBR', 'GER', 'AUH', 'RUS', 'TUR', 'SPA']) out.push(`${t}: capo ${politicsOf(w, t)?.head}; ${cabinetSummary(w, t)}`);
fs.writeFileSync('/tmp/claude-0/-home-claude/71d1d435-b3ef-5492-bb1b-33ac771cd107/scratchpad/corti/05-politica/sonda1.out', out.join('\n'));
console.log(out.slice(0, 6).join('\n'));
