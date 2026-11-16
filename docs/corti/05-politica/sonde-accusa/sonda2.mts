// Sonda 2 (accusa, corte politica): verifiche puntuali senza simulazione lunga.
import fs from 'node:fs';
import { newGame } from '/home/claude/pax-historia-clone/src/engine/setup';
import { politicsOf, govEffects, crisisChance, crisisOptions, defaultOption, holdElection, confidence } from '/home/claude/pax-historia-clone/src/engine/politics';
import { headMinister, ministerEffects, cabinetOf } from '/home/claude/pax-historia-clone/src/engine/ministers';
import { budget, stabilityTarget } from '/home/claude/pax-historia-clone/src/engine/economy';
import { dayOf } from '/home/claude/pax-historia-clone/src/scenario/politics1881';

const M = JSON.parse(fs.readFileSync('/home/claude/pax-historia-clone/public/data/europe1881.json', 'utf8'));
const out: string[] = [];
const w = newGame(M, 'SMR', 'regnum');
const s = w.state;
// a) capi morti o congedati: effetti ancora attivi?
const fra = politicsOf(w, 'FRA')!; fra.head = 'Léon Gambetta'; s.day = dayOf(1885, 6, 1);
out.push(`a) FRA 1885, capo Gambetta (morto 1882): headMinister=${headMinister(w, 'FRA')?.name}, relazioni ${JSON.stringify(ministerEffects(w, 'FRA').relations)}, conf ${ministerEffects(w, 'FRA').confidence}`);
s.day = dayOf(1899, 6, 1);
out.push(`a2) GER 1899: capo ${politicsOf(w, 'GER')!.head}, headMinister=${headMinister(w, 'GER')?.name}, effetti ${JSON.stringify(ministerEffects(w, 'GER'))}`);
s.day = 0;
// b) la stabilità cambia le entrate o la leva?
for (const t of ['ITA', 'FRA', 'RUS']) {
  const n = s.nations[t];
  n.stability = 80; const b80 = budget(w, t);
  n.stability = 15; const b15 = budget(w, t);
  out.push(`b) ${t}: stabilità 80 → entrate ${b80.income}, leva ${b80.manpowerGain}, saldo ${b80.net}; stabilità 15 → entrate ${b15.income}, leva ${b15.manpowerGain}, saldo ${b15.net}`);
  n.stability = 60;
}
// c) portata degli effetti di governo per nazione
for (const t of ['ITA', 'FRA', 'GBR', 'GER', 'AUH', 'RUS', 'TUR', 'SPA', 'DEN', 'SER', 'USA']) {
  const g = govEffects(w, t), ps = politicsOf(w, t)!;
  out.push(`c) ${t} [${ps.regime}] conf ${ps.confidence} soglia-rischio ${crisisChance(ps).toFixed(3)} | income×${g.income.toFixed(3)} stab${g.stability >= 0 ? '+' : ''}${g.stability.toFixed(2)} exh×${g.exhaustion.toFixed(2)} upkeep×${g.upkeep.toFixed(3)} quality×${g.quality.toFixed(3)} rail+${g.rail.toFixed(3)} opzioni ${crisisOptions(ps).join('/')} default ${defaultOption(w, t, ps)}`);
}
// d) turno spagnolo: con 'managed' al governo, l'opposizione può vincere? (consenso ribaltato)
const spa = politicsOf(w, 'SPA')!;
spa.parties.find((p) => p.id === 'conservatori')!.pop = 40; spa.parties.find((p) => p.id === 'fusionisti')!.pop = 50;
holdElection(w, 'SPA', spa, []);
out.push(`d) SPA, consenso conservatori 40 / fusionisti 50, al voto: ${spa.parties.map((p) => `${p.id} ${p.seats}`).join(', ')}; governo ${spa.gov.join('+')} capo ${spa.head}`);
// e) Russia: quanto deve cadere la stabilità perché la fazione riformista rischi una crisi?
const rus = politicsOf(w, 'RUS')!;
for (const st of [60, 40, 20, 0]) { s.nations.RUS.stability = st; rus.confidence = confidence(w, 'RUS', rus); out.push(`e) RUS stabilità ${st}: fiducia ${rus.confidence}, rischio settimanale ${crisisChance(rus).toFixed(3)}`); }
// f) Svizzera e Stati Uniti trattati come regimi parlamentari con crisi di fiducia
for (const t of ['SWI', 'USA', 'MEX']) { const ps = politicsOf(w, t)!; out.push(`f) ${t}: regime ${ps.regime}, capo «${ps.head}», partiti ${ps.parties.map((p) => p.name).join(' / ')}, elezioni giorno ${ps.nextElection}, rischio a fiducia 45: ${crisisChance({ ...ps, confidence: 45 }).toFixed(3)}`); }
// g) gabinetti: dicasteri vuoti
for (const t of ['TUR', 'SPA', 'RUS']) out.push(`g) ${t}: ${JSON.stringify(cabinetOf(w, t)!.posts)}`);
// h) obiettivo di stabilità: peso della politica rispetto agli altri termini
for (const t of ['ITA', 'DEN']) { const ps = politicsOf(w, t)!; const c0 = ps.confidence; const a = stabilityTarget(w, t); ps.confidence = 0; const b = stabilityTarget(w, t); ps.confidence = 100; const c = stabilityTarget(w, t); ps.confidence = c0; out.push(`h) ${t}: obiettivo stabilità ${a.toFixed(1)}; con fiducia 0 → ${b.toFixed(1)}, con fiducia 100 → ${c.toFixed(1)}`); }
fs.writeFileSync('/tmp/claude-0/-home-claude/71d1d435-b3ef-5492-bb1b-33ac771cd107/scratchpad/corti/05-politica/sonda2.out', out.join('\n'));
console.log(out.join('\n'));
