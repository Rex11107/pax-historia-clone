// Sonda 2 (accusa): sei anni di sole nazioni non giocanti. Che cosa costruiscono, dove, che cosa ricercano e quando.
import fs from 'node:fs';
import { newGame } from '/home/claude/pax-historia-clone/src/engine/setup';
import { runTurn } from '/home/claude/pax-historia-clone/src/engine/turn';
import * as C from '/home/claude/pax-historia-clone/src/engine/construction';
import * as R from '/home/claude/pax-historia-clone/src/engine/research';
import { effectiveResources } from '/home/claude/pax-historia-clone/src/engine/trade';
import { dateOf } from '/home/claude/pax-historia-clone/src/engine/world';

const YEARS = Number(process.argv[2] ?? 6);
const M = JSON.parse(fs.readFileSync('/home/claude/pax-historia-clone/public/data/europe1881.json', 'utf8'));
const w = newGame(M, 'SMR', 'regnum');
const s = w.state;
const majors = Object.keys(s.nations).filter((t) => w.profiles[t].major).concat(['USA', 'JAP', 'SPA']).filter((x, i, a) => s.nations[x] && a.indexOf(x) === i);
// statico
console.log('maxLevel GER bellica', R.maxLevel(w, 'GER', 'bellica'), 'miniera', R.maxLevel(w, 'GER', 'miniera'), '| sblocchi:', ['bellica', 'miniera'].map((b) => `${b}2=${R.unlockTech(b as C.BuildingId, 2)?.id ?? 'NESSUNO'}`).join(' '));
const MIN = new Set(['carbone', 'ferro', 'metalli', 'zolfo', 'petrolio', 'sale', 'argento', 'stagno', 'nitrati']);
const b0 = C.buildings(w);
const dead: string[] = []; let mines = 0;
for (let p = 0; p < b0.length; p++) if (b0[p].miniera) { mines++; if (!w.map.resources[p].some((r) => MIN.has(r))) dead.push(`${w.map.provinces[p].name}[${w.map.resources[p].join('/')}]`); }
console.log(`miniere 1881: ${mines}, senza risorse minerarie (inutili): ${dead.length}: ${dead.join(', ')}`);
console.log('ITA carbone mancante?', effectiveResources(w, 'ITA').missing.includes('carbone'), 'montagne ITA', w.map.provinces.filter((p) => s.owner[p.id] === 'ITA' && p.terrain === 'mountain').length);
const colonies = (t: string) => new Set(w.map.provinces.filter((p) => s.owner[p.id] === t).map((p) => p.id));
// tracciamento
const seen = new Set<string>();
const started = new Map<string, Map<string, number>>(); // tag -> tipo -> n
const where = new Map<string, Map<number, number>>(); // tag -> provincia -> n
const refused = new Map<string, number>();
let spentC = new Map<string, number>();
const doneR: string[] = [];
const ahead: string[] = [];
const known0 = new Map(Object.keys(s.nations).map((t) => [t, new Set(R.research(w).known[t] ?? [])]));
const ind0 = new Map(majors.map((t) => [t, C.industryOf(w, t)]));
const phase = new Map<string, number>(); let last = performance.now();
let year = 1881;
const weeks = Math.round(YEARS * 52.18);
const treas0 = new Map(majors.map((t) => [t, s.nations[t].treasury]));
for (let i = 0; i < weeks; i++) {
  runTurn(w, (ph) => { const n = performance.now(); phase.set(ph, (phase.get(ph) ?? 0) + n - last); last = n; });
  last = performance.now();
  for (const pr of C.projects(w)) if (!seen.has(pr.id)) {
    seen.add(pr.id);
    const m = started.get(pr.nation) ?? new Map(); m.set(pr.type, (m.get(pr.type) ?? 0) + 1); started.set(pr.nation, m);
    const q = where.get(pr.nation) ?? new Map(); q.set(pr.province, (q.get(pr.province) ?? 0) + 1); where.set(pr.nation, q);
    spentC.set(pr.nation, (spentC.get(pr.nation) ?? 0) + pr.cost);
  }
  const y = dateOf(s.day).getUTCFullYear() + dateOf(s.day).getUTCMonth() / 12;
  for (const t of Object.keys(s.nations)) for (const id of R.research(w).known[t] ?? []) if (!known0.get(t)?.has(id)) {
    known0.get(t)?.add(id) ?? known0.set(t, new Set([id]));
    const x = R.tech(id)!;
    if (majors.includes(t)) doneR.push(`${t}:${id}@${y.toFixed(1)}(${x.year})`);
    if (y < x.year - 0.01) ahead.push(`${t}:${id}@${y.toFixed(1)}<${x.year}`);
  }
  if (Math.floor(y) !== year) { year = Math.floor(y); process.stderr.write(`${year} `); }
}
console.log('\n== cantieri avviati per tipo (potenze)');
for (const t of majors) {
  const m = started.get(t) ?? new Map();
  const q = where.get(t) ?? new Map();
  const col = [...q.keys()].filter((p) => w.map.provinces[p] && (w.profiles[t] && (C as any)) && false).length;
  const own = w.map.provinces.filter((p) => s.owner[p.id] === t && !p.impassable).length;
  const top = [...q.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([p, n]) => `${w.map.provinces[p].name}×${n}`).join(', ');
  console.log(t, [...m.entries()].map(([k, n]) => `${k} ${n}`).join(', '), `| province toccate ${q.size}/${own}`, `| spesa ${Math.round(spentC.get(t) ?? 0)} M`, `| tesoro ${Math.round(treas0.get(t)!)} -> ${Math.round(s.nations[t].treasury)}`, `| industria ${ind0.get(t)} -> ${C.industryOf(w, t)}`, `| top: ${top}`);
}
let totalStarted = 0; for (const m of started.values()) for (const n of m.values()) totalStarted += n;
console.log('cantieri avviati in tutto (tutte le nazioni):', totalStarted, 'nazioni che hanno costruito:', started.size);
console.log('== ricerche concluse dalle potenze:', doneR.length); console.log(doneR.join(' '));
console.log('== concluse prima della data storica (tutte):', ahead.length, ahead.slice(0, 15).join(' '));
let tot = 0; const per = new Map<string, number>();
for (const [t, k] of known0) { const n = k.size - (R.research(w).start[t] ?? 0); if (n > 0) { tot += n; per.set(t, n); } }
console.log('ricerche nuove totali:', tot, 'nazioni con almeno una:', per.size);
console.log('== effetti tecnologici GER, GBR, ITA, JAP:', ['GER', 'GBR', 'ITA', 'JAP'].map((t) => `${t} ${JSON.stringify(R.techEffects(w, t))}`).join('\n'));
console.log('== tempi per fase (ms totali su', weeks, 'turni):', [...phase.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${Math.round(v)}`).join(', '));
// tutto l'albero conosciuto: effetto massimo per la Germania
const all = R.TECHS.map((x) => x.id); const rk = R.research(w).known; const keep = [...rk.GER];
rk.GER = [...new Set([...keep, ...all])].sort((a, b) => keep.indexOf(a) - keep.indexOf(b));
rk.GER = [...keep, ...all.filter((x) => !keep.includes(x))];
console.log('== GER con TUTTO l\'albero:', JSON.stringify(R.techEffects(w, 'GER')));
