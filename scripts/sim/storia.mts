// Simulazione lunga senza interfaccia: il mondo dal 1881 in avanti con le sole nazioni non giocanti (il giocatore
// è San Marino, che non fa nulla), e un rapporto in Markdown per il bilanciamento: finanze e forze delle potenze
// anno per anno, guerre e paci, nazioni scomparse o nate, colonie, soggetti, province passate di mano.
// Controlla anche le invarianti a ogni turno. Tutto deterministico: stesso seme, stesso rapporto.
// Uso: npx tsx scripts/sim/storia.mts [anni=19] [seme=regnum] [file=rapporto.md]
import fs from 'node:fs';
import { newGame } from '../../src/engine/setup';
import { runTurn } from '../../src/engine/turn';
import { checkInvariants } from '../../src/engine/invariants';
import { formatDate, dateOf } from '../../src/engine/world';
import type { GameEvent, Tag } from '../../src/engine/types';

const years = Number(process.argv[2] ?? 19), seed = process.argv[3] ?? 'regnum', outFile = process.argv[4] ?? 'rapporto.md';
const M = JSON.parse(fs.readFileSync(new URL('../../public/data/europe1881.json', import.meta.url), 'utf8'));
const w = newGame(M, 'SMR', seed);
const s = w.state, map = w.map;
const name = (t: Tag) => w.profiles[t]?.name ?? t;
const majors = Object.keys(s.nations).filter((t) => w.profiles[t].major);

interface Snap { year: number; treasury: number; debt: number; income: number; net: number; men: number; prov: number; pop: number; stab: number }
const snap = (t: Tag, year: number): Snap => {
  const n = s.nations[t];
  let prov = 0, pop = 0;
  for (let p = 0; p < map.size; p++) if (s.owner[p] === t && !map.provinces[p].impassable) { prov++; pop += map.provinces[p].pop; }
  return { year, treasury: n.treasury, debt: n.debt, income: n.lastBudget?.income ?? 0, net: n.lastBudget?.net ?? 0, men: s.units.filter((u) => u.nation === t).reduce((a, u) => a + u.strength, 0), prov, pop, stab: n.stability };
};
const history = new Map<Tag, Snap[]>(majors.map((t) => [t, []]));
const owner0 = [...s.owner];
const alive0 = new Set(Object.keys(s.nations).filter((t) => s.nations[t].alive));
const subjects0 = new Map<Tag, Tag>();
const events: GameEvent[] = [];
const KEEP = new Set(['war_declared', 'peace', 'nation_annexed', 'liberation', 'subject', 'colonial', 'cession', 'indemnity', 'crisis', 'government']);
const violations = new Map<string, number>();
const wealth: [number, number][] = [];
const phaseMs = new Map<string, number>();

const t0 = performance.now();
let year = 1881, lastT = performance.now();
const turns = Math.round(years * 365.25 / 7);
for (let i = 0; i < turns; i++) {
  const rep = runTurn(w, (ph) => { const now = performance.now(); phaseMs.set(ph, (phaseMs.get(ph) ?? 0) + now - lastT); lastT = now; });
  lastT = performance.now();
  if (i === 0) { for (const x of s.subjects ?? []) subjects0.set(x.subject, x.overlord); for (const t of majors) history.get(t)!.push(snap(t, 1881)); }
  for (const e of rep.events) if (KEEP.has(e.type)) events.push(e);
  for (const v of checkInvariants(w)) { const k = v.replace(/\d+/g, 'N'); violations.set(k, (violations.get(k) ?? 0) + 1); }
  const y = dateOf(s.day).getUTCFullYear();
  if (y !== year) {
    year = y;
    for (const t of majors) if (s.nations[t].alive) history.get(t)!.push(snap(t, y));
    wealth.push([y, Object.values(s.nations).reduce((a, n) => a + (n.alive ? n.treasury - n.debt : 0), 0)]);
    process.stderr.write(`${y} `);
  }
}
const secs = (performance.now() - t0) / 1000;

// --- rapporto ---
const L: string[] = [];
const f0 = (v: number) => Math.round(v).toLocaleString('it-IT');
const f1 = (v: number) => (Math.round(v * 10) / 10).toLocaleString('it-IT');
L.push(`# Il mondo dal 1881 al ${year}, sole nazioni non giocanti`, '');
L.push(`Seme \`${seed}\`, ${turns} turni fino al ${formatDate(s.day)}. Calcolo: ${f0(secs)} s (${f0(secs * 1000 / turns)} ms a turno). Invarianti violate: ${violations.size ? [...violations].map(([k, n]) => `${k} (${n})`).join('; ') : 'nessuna'}.`, '');

L.push('## Le potenze: inizio e fine', '');
L.push('| potenza | province | popolazione (M) | uomini in armi | entrate/sett. | saldo/sett. | casse | debito | stabilità |', '|---|---|---|---|---|---|---|---|---|');
for (const t of majors) {
  const h = history.get(t)!, a = h[0], b = h[h.length - 1];
  if (!a) continue;
  const ch = (x: number, y: number, f = f0) => (Math.round(x) === Math.round(y) ? f(x) : `${f(x)} → ${f(y)}`);
  L.push(`| ${name(t)}${s.nations[t].alive ? '' : ' †'} | ${ch(a.prov, b.prov)} | ${ch(a.pop / 1e6, b.pop / 1e6, f1)} | ${ch(a.men, b.men)} | ${ch(a.income, b.income, f1)} | ${ch(a.net, b.net, f1)} | ${ch(a.treasury, b.treasury)} | ${ch(a.debt, b.debt)} | ${ch(a.stab, b.stab)} |`);
}
L.push('', '## Casse delle potenze ogni cinque anni (milioni)', '');
const ys = [...new Set([1881, ...wealth.map(([y]) => y).filter((y) => (y - 1881) % 5 === 0), year])];
L.push(`| potenza | ${ys.join(' | ')} |`, `|---|${ys.map(() => '---').join('|')}|`);
for (const t of majors) L.push(`| ${name(t)} | ${ys.map((y) => { const h = history.get(t)!.find((x) => x.year === y); return h ? `${f0(h.treasury)}${h.debt > 1 ? ` (−${f0(h.debt)})` : ''}` : '—'; }).join(' | ')} |`);
L.push('', 'Fra parentesi il debito.', '');
L.push('## Ricchezza netta del mondo (casse meno debiti, milioni)', '', `| anno | ${wealth.filter(([y]) => ys.includes(y)).map(([y]) => y).join(' | ')} |`, `|---|${wealth.filter(([y]) => ys.includes(y)).map(() => '---').join('|')}|`, `| | ${wealth.filter(([y]) => ys.includes(y)).map(([, v]) => f0(v)).join(' | ')} |`, '');

const by = (type: string) => events.filter((e) => e.type === type);
L.push(`## Guerre (${by('war_declared').length} dichiarate, ${by('peace').length} paci)`, '');
for (const e of events.filter((x) => x.type === 'war_declared' || x.type === 'peace' || x.type === 'nation_annexed' || x.type === 'liberation')) L.push(`- ${formatDate(e.day)}: ${e.text}`);
if (s.wars.length) L.push('', `Ancora in corso: ${s.wars.map((x) => `${x.name} (dal ${formatDate(x.startDay)})`).join('; ')}.`);

L.push('', '## Nazioni scomparse e nate', '');
const dead = [...alive0].filter((t) => !s.nations[t].alive), born = Object.keys(s.nations).filter((t) => s.nations[t].alive && !alive0.has(t));
L.push(`- Scomparse (${dead.length}): ${dead.map(name).join(', ') || 'nessuna'}.`, `- Nate (${born.length}): ${born.map(name).join(', ') || 'nessuna'}.`);

L.push('', '## Province passate di mano', '');
const moved = new Map<string, number>();
let fromNobody = 0;
for (let p = 0; p < map.size; p++) {
  if (map.provinces[p].impassable || s.owner[p] === owner0[p]) continue;
  if (!owner0[p]) fromNobody++;
  const k = `${owner0[p] ? name(owner0[p]) : 'terra di nessuno'} → ${s.owner[p] ? name(s.owner[p]) : 'terra di nessuno'}`;
  moved.set(k, (moved.get(k) ?? 0) + 1);
}
L.push(`${[...moved.values()].reduce((a, b) => a + b, 0)} province transitabili hanno cambiato padrone, di cui ${fromNobody} terre di nessuno. Terre di nessuno rimaste: ${s.owner.filter((o, p) => !o && !map.provinces[p].impassable).length}.`, '');
for (const [k, n] of [...moved].sort((a, b) => b[1] - a[1]).slice(0, 40)) L.push(`- ${k}: ${n}`);

L.push('', '## Soggetti', '');
const subNow = new Map((s.subjects ?? []).map((x) => [x.subject, x]));
const lost = [...subjects0].filter(([sub, lord]) => subNow.get(sub)?.overlord !== lord);
const gained = [...subNow.values()].filter((x) => subjects0.get(x.subject) !== x.overlord);
L.push(`- All'inizio ${subjects0.size}, alla fine ${subNow.size}.`, `- Legami finiti (${lost.length}): ${lost.map(([sub, lord]) => `${name(sub)} (di ${name(lord)})${s.nations[sub]?.alive ? '' : ' †'}`).join(', ') || 'nessuno'}.`, `- Legami nuovi (${gained.length}): ${gained.map((x) => `${name(x.subject)} (${x.level} di ${name(x.overlord)})`).join(', ') || 'nessuno'}.`);

L.push('', `## Colonie e crisi (${by('colonial').length} eventi coloniali, ${by('crisis').length} crisi, ${by('government').length} cambi di governo)`, '');
for (const e of by('colonial').slice(0, 60)) L.push(`- ${formatDate(e.day)}: ${e.text}`);

L.push('', '## Tempo per fase (ms a turno)', '', [...phaseMs].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${f0(v / turns)}`).join(', ') + '.', '');
fs.writeFileSync(outFile, L.join('\n'));
console.log(`\nrapporto scritto in ${outFile}: ${turns} turni in ${f0(secs)} s, ${violations.size} tipi di invarianti violate`);
