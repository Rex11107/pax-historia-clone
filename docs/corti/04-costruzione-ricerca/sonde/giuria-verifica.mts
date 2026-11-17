// Sonda della giuria (corte 04): riverifica indipendente dei capi d'accusa più gravosi.
// Percorsi assoluti del clone corrente (/home/user/progetti/pax-historia-clone).
import fs from 'node:fs';
import { newGame } from '/home/user/progetti/pax-historia-clone/src/engine/setup';
import * as C from '/home/user/progetti/pax-historia-clone/src/engine/construction';
import * as R from '/home/user/progetti/pax-historia-clone/src/engine/research';
import { colonialWeight } from '/home/user/progetti/pax-historia-clone/src/engine/ethnic';

const M = JSON.parse(fs.readFileSync('/home/user/progetti/pax-historia-clone/public/data/europe1881.json', 'utf8'));
const w = newGame(M, 'SMR', 'regnum');
const s = w.state;

// Capo 1: bellica e miniera bloccate al livello 1
console.log('== capo 1: maxLevel e unlock');
console.log('GER bellica max', R.maxLevel(w, 'GER', 'bellica'), '| miniera max', R.maxLevel(w, 'GER', 'miniera'));
console.log('unlockTech bellica2 =', R.unlockTech('bellica', 2), '| miniera2 =', R.unlockTech('miniera', 2));
console.log('tech con unlock bellica/miniera:', R.TECHS.filter((x) => x.unlocks?.some(([b]) => b === 'bellica' || b === 'miniera')).map((x) => x.id).join(',') || '(nessuna)');

// Capo 8: miniere 1881 inerti (MINERAL senza oro/diamanti)
const b = C.buildings(w);
const inert: string[] = [];
for (let p = 0; p < b.length; p++) {
  if (!b[p].miniera) continue;
  const extra = C.extraLots(w, p);
  if (extra.length === 0) inert.push(`${w.map.provinces[p].name}[${w.map.resources[p].join('/')}]`);
}
console.log('== capo 8: miniere 1881 inerti (extraLots vuoto):', inert.length, inert.join(', '));

// Capo 7: giacimenti "resi sfruttabili" che non fanno nulla (provincia già ha la risorsa)
console.log('== capo 7: giacimenti');
for (const x of R.TECHS) for (const [r, lon, lat, n] of x.sites ?? []) {
  const id = w.map.locate(lon, lat);
  if (id === null) { console.log(x.id, n, r, 'NESSUNA PROVINCIA'); continue; }
  const already = w.map.resources[id].includes(r);
  console.log(x.id, n, r, '->', w.map.provinces[id].name, already ? `(già ha ${r}: lotto inerte)` : '(nuovo lotto)');
}

// Capo 2: logistica e rendite coloniali (pop grezza, non pesata con colonialWeight)
console.log('== capo 2: GBR top 8 per pop');
const gbrOwn = w.map.provinces.filter((p) => s.owner[p.id] === 'GBR' && !p.impassable).sort((a, c) => c.pop - a.pop);
console.log('top 8 GBR:', gbrOwn.slice(0, 8).map((p) => `${p.name}(cw=${colonialWeight(w, 'GBR', p.id)})`).join(', '));
console.log('logistica GBR:', C.logistics(w, 'GBR'));

// Capo 5/10: velocità ricerca indipendente dalla cassa
const g0 = R.projectsOf(w, 'GER')[0];
if (g0) { const v = R.speedOf(w, g0); s.nations.GER.treasury = 0; s.nations.GER.debt = 1_000_000; console.log('== capo 5: speedOf GER con cassa piena', v, '-> con cassa 0/debito', R.speedOf(w, g0)); }

// Capo 6: conoscenze 1881 dal solo numero industria
console.log('== capo 6: 1881 known');
for (const [t, ids] of [['USA', ['pezzi_intercambiabili', 'freno_westinghouse', 'telefono']], ['GER', ['thomas']], ['JAP', ['retrocarica', 'telegrafo']], ['CHI', ['retrocarica', 'telegrafo']]] as [string, string[]][]) {
  console.log(t, 'industria', w.profiles[t]?.industry, ids.map((id) => `${id}=${R.knows(w, t, id)}`).join(' '));
}

// Capo 11: livelli 1881 sopra il massimo consentito dalla ricerca
let over = 0; const ex: string[] = [];
for (let p = 0; p < b.length; p++) for (const [k, l] of Object.entries(b[p]) as [C.BuildingId, number][]) {
  const o = s.owner[p];
  if (o && l > R.maxLevel(w, o, k)) { over++; if (ex.length < 15) ex.push(`${w.map.provinces[p].name} ${k} ${l}>${R.maxLevel(w, o, k)}(${o})`); }
}
console.log('== capo 11: livelli sopra il massimo:', over, ex.join('; '));

// Capo 3: industria statica (profilo) vs industryOf
console.log('== capo 3: profilo vs industryOf, researchSlots usa il profilo');
for (const t of ['JAP', 'RUS', 'USA']) console.log(t, 'profilo', w.profiles[t]?.industry, 'industryOf', C.industryOf(w, t), 'researchSlots', R.researchSlots(w, t));
