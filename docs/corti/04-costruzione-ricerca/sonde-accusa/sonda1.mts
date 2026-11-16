// Sonda 1 (accusa): stato al 1881 dopo un turno, ritorno delle opere, conoscenze, costo della ricerca, exploit.
import fs from 'node:fs';
import { newGame } from '/home/claude/pax-historia-clone/src/engine/setup';
import { runTurn } from '/home/claude/pax-historia-clone/src/engine/turn';
import * as C from '/home/claude/pax-historia-clone/src/engine/construction';
import * as R from '/home/claude/pax-historia-clone/src/engine/research';
import { budget } from '/home/claude/pax-historia-clone/src/engine/economy';

const M = JSON.parse(fs.readFileSync('/home/claude/pax-historia-clone/public/data/europe1881.json', 'utf8'));
const w = newGame(M, 'SMR', 'regnum');
const s = w.state;
runTurn(w);
const majors = Object.keys(s.nations).filter((t) => w.profiles[t].major);
console.log('== potenze: industria, conoscenze, entrate, opere, costo ricerca, slot');
for (const t of [...majors, 'USA', 'JAP', 'BEL', 'SWE', 'SPA', 'TUR', 'CHI'].filter((x, i, a) => s.nations[x] && a.indexOf(x) === i)) {
  const b = s.nations[t].lastBudget!;
  const k = R.research(w).known[t];
  const tc = R.weeklyCost(w, t, R.tech('acciaio_massa')!);
  console.log(t, 'ind', w.profiles[t].industry, 'known', k.length, 'income', b.income, 'works', b.works, 'research', b.research, 'maint', b.maintenance, 'net', b.net, 'treas', Math.round(s.nations[t].treasury),
    'cantieri', C.slots(w, t), 'ricerche', R.researchSlots(w, t), 'costo acciaio_massa/sett', tc, 'quota', (tc / b.income * 100).toFixed(2) + '%',
    'pezzi', R.knows(w, t, 'pezzi_intercambiabili'), 'thomas', R.knows(w, t, 'thomas'), 'raffin', R.knows(w, t, 'raffinazione'), 'binari', R.knows(w, t, 'binari_acciaio'), 'telefono', R.knows(w, t, 'telefono'));
}
console.log('== ritorno: settimane per ripagare il livello 1 nella provincia piu popolosa (lordo - manutenzione)');
for (const t of ['GBR', 'GER', 'ITA', 'RUS']) {
  const own = w.map.provinces.filter((p) => s.owner[p.id] === t && !p.impassable).sort((a, b) => b.pop - a.pop);
  for (const p of [own[0], own[Math.floor(own.length / 2)]]) {
    const popM = p.pop / 1e6;
    const row: string[] = [];
    for (const [k, inc, cost, up] of [['agricoltura', 0.04 + popM * 0.05, 4, 0.005], ['tessile', 0.1 + popM * 0.1, 7, 0.01], ['chimica', 0.12 + popM * 0.08, 9, 0.01], ['siderurgia', 0.15 + popM * 0.1, 12, 0.015], ['porto', 0.08, 7, 0.03]] as [string, number, number, number][]) {
      const eff = k === 'agricoltura' || k === 'porto' ? 1 : C.inputEfficiency(w, t, k as C.BuildingId);
      row.push(`${k} ${Math.round(cost / (inc * eff - up))}`);
    }
    console.log(t, p.name, `${popM.toFixed(2)} M ab.`, row.join(', '));
  }
}
// giacimenti: dove cadono
console.log('== giacimenti');
for (const x of R.TECHS) for (const [r, lon, lat, n] of x.sites ?? []) { const id = w.map.locate(lon, lat); console.log(x.id, n, r, id === null ? 'NESSUNA PROVINCIA' : `${w.map.provinces[id].name} (${s.owner[id]}) gia ha ${w.map.resources[id].join('/')}`); }
// livelli del 1881 oltre il massimo che la ricerca consente
let over = 0; const ex: string[] = [];
const b = C.buildings(w);
for (let p = 0; p < b.length; p++) for (const [k, l] of Object.entries(b[p]) as [C.BuildingId, number][]) { const o = s.owner[p]; if (o && l > R.maxLevel(w, o, k)) { over++; if (ex.length < 12) ex.push(`${w.map.provinces[p].name} ${k} ${l}>${R.maxLevel(w, o, k)} (${o})`); } }
console.log('== livelli 1881 sopra il massimo consentito dalla ricerca:', over, ex.join('; '));
// exploit 1: collaborazione, chi paga
const rp = R.research(w);
console.log('== collaborazione SMR? no; ITA con GER: quota ITA', (() => { rp.known.ITA.push('antisepsi'); const e = R.proposeCollab(w, 'ITA', 'GER', 'batteriologia'); return e ?? `ITA ${R.researchCost(w, 'ITA')} GER ${R.researchCost(w, 'GER')}`; })());
// exploit 2: cantiere aperto e annullato in un vassallo
const sub = (s.subjects ?? []).find((x) => x.level !== 'tributario');
if (sub) {
  const p = w.map.provinces.find((q) => s.owner[q.id] === sub.subject && s.controller[q.id] === sub.subject && !q.impassable && q.terrain !== 'mountain' && q.terrain !== 'desert')!;
  s.nations[sub.overlord].treasury += 100;
  const t0 = s.nations[sub.overlord].treasury, inv0 = sub.invested ?? 0;
  for (let i = 0; i < 4; i++) { const e = C.startProject(w, sub.overlord, p.id, 'agricoltura'); const pr = C.projects(w).find((x) => x.nation === sub.overlord && x.province === p.id); if (pr) C.cancelProject(w, pr.id); else console.log('rifiuto', e); }
  console.log('== vassallo', sub.overlord, '->', sub.subject, 'spesa netta', (t0 - s.nations[sub.overlord].treasury).toFixed(1), 'invested', inv0, '->', sub.invested);
}
// exploit 3: annullare il cantiere di un altro
const other = C.projects(w).find((x) => x.nation !== s.player);
console.log('== annullare un cantiere altrui:', other ? `${other.nation} ${other.type} -> ${C.cancelProject(w, other.id) ?? 'annullato'} ` : 'nessun cantiere AI aperto');
// ricerca in deficit: la velocita non dipende dalla cassa
const p0 = R.projectsOf(w, 'GER')[0];
if (p0) { const v = R.speedOf(w, p0); s.nations.GER.treasury = 0; s.nations.GER.debt = 1e6; console.log('== velocita GER con cassa 0 e debito 1e6:', v, '->', R.speedOf(w, p0)); }
// cache: tempo di industryOf/logistics per tutte le nazioni, a cache fredda
const tags = Object.keys(s.nations).filter((t) => s.nations[t].alive);
let t1 = performance.now(); C.touchBuildings(); for (const t of tags) C.logistics(w, t); const cold = performance.now() - t1;
t1 = performance.now(); for (const t of tags) C.logistics(w, t); const warm = performance.now() - t1;
t1 = performance.now(); for (const t of tags) C.maintenanceOf(w, t); const mt = performance.now() - t1;
t1 = performance.now(); for (const t of tags) C.manpowerBonus(w, t); const mb = performance.now() - t1;
t1 = performance.now(); for (const t of tags) budget(w, t); const bt = performance.now() - t1;
console.log(`== tempi (ms, ${tags.length} nazioni): logistics fredda ${cold.toFixed(0)} calda ${warm.toFixed(1)}, maintenanceOf ${mt.toFixed(0)}, manpowerBonus ${mb.toFixed(0)}, budget ${bt.toFixed(0)}`);
