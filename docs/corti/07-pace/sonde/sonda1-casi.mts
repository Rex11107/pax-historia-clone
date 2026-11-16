// Sonda 1 della corte 07 (pace): casi costruiti a mano sullo stato iniziale, senza far girare turni.
// Uso: npx tsx docs/corti/07-pace/sonde/sonda1-casi.mts
import fs from 'node:fs';
import { newGame } from '../../../../src/engine/setup';
import * as P from '../../../../src/engine/peace';
import { checkProposal, declareWar } from '../../../../src/engine/diplomacy';
import { ETHNICITIES } from '../../../../src/engine/ethnic';
import type { GameEvent } from '../../../../src/engine/types';

const M = JSON.parse(fs.readFileSync(new URL('../../../../public/data/europe1881.json', import.meta.url), 'utf8'));
const EU = M.euCount ?? 1375;
const fresh = () => newGame(M, 'SMR', 'corte07');
const r1 = (v: number) => Math.round(v * 10) / 10;

// A. diluizione coloniale: occupare tutta la madrepatria
{
  const w = fresh(); const s = w.state;
  declareWar(w, 'FRA', 'GBR', 'sonda');
  const war = s.wars.at(-1)!;
  const isles = w.map.provinces.filter((p) => s.owner[p.id] === 'GBR' && p.id < EU);
  for (const p of isles) s.controller[p.id] = 'FRA';
  const totGBR = P.nationValue(w, 'GBR');
  const islesV = isles.reduce((a, p) => a + P.provinceValue(w, p.id), 0);
  const sc = P.warScore(w, war);
  console.log(`A. FRA occupa tutte le ${isles.length} province europee del Regno Unito (capitale compresa: ${isles.some((p) => p.id === s.nations.GBR.capital)}): quota di valore ${r1(100 * islesV / totGBR)}%, punteggio att ${sc.att} def ${sc.def}, vincitore ${sc.winner}, punti ${sc.points}`);
  const w2 = fresh(); const s2 = w2.state;
  declareWar(w2, 'GER', 'FRA', 'sonda');
  const war2 = s2.wars.at(-1)!;
  const metro = w2.map.provinces.filter((p) => s2.owner[p.id] === 'FRA' && p.id < EU);
  for (const p of metro) s2.controller[p.id] = 'GER';
  const sc2 = P.warScore(w2, war2);
  console.log(`A. GER occupa tutta la Francia europea (${metro.length} province): quota ${r1(100 * metro.reduce((a, p) => a + P.provinceValue(w2, p.id), 0) / P.nationValue(w2, 'FRA'))}%, punteggio ${sc2.att}-${sc2.def}, punti ${sc2.points}`);
}

// B. peso della base fissa 1 per provincia (province vuote)
{
  const w = fresh(); const s = w.state;
  for (const t of ['RUS', 'GBR', 'TUR', 'FRA', 'GER']) {
    const own = w.map.provinces.filter((p) => s.owner[p.id] === t && !p.impassable);
    const tot = P.nationValue(w, t);
    const empty = own.filter((p) => p.pop < 50000);
    const popTot = own.reduce((a, p) => a + p.pop, 0);
    console.log(`B. ${t}: ${own.length} province, ${empty.length} sotto 50.000 abitanti = ${r1(100 * empty.reduce((a, p) => a + P.provinceValue(w, p.id), 0) / tot)}% del valore di guerra e ${r1(100 * empty.reduce((a, p) => a + p.pop, 0) / popTot)}% della popolazione`);
  }
}

// C. quota dei vincitori: un alleato grande e fermo
{
  const w = fresh(); const s = w.state;
  declareWar(w, 'FRA', 'GER', 'sonda');
  const war = s.wars.at(-1)!;
  if (!war.attackers.includes('RUS')) war.attackers.push('RUS');
  const west = w.map.provinces.filter((p) => s.owner[p.id] === 'GER' && p.lonlat[0] < 8.5);
  for (const p of west) s.controller[p.id] = 'FRA';
  war.casualties.FRA = 30000; war.casualties.GER = 60000;
  const sc = P.warScore(w, war);
  console.log(`C. FRA occupa ${west.length} province tedesche a ovest di 8,5°E e combatte; RUS non muove un uomo. Punti ${sc.points}; quote: FRA ${r1(100 * sc.share.FRA)}%, RUS ${r1(100 * sc.share.RUS)}%; bilancio FRA ${P.budgetOf(w, war, 'FRA')}, RUS ${P.budgetOf(w, war, 'RUS')}`);
}

// D. bersaglio della liberazione: costo calcolato con le province, applicazione senza
{
  const w = fresh(); const s = w.state;
  const diff: string[] = [];
  for (const from of Object.keys(s.nations).filter((t) => s.nations[t].alive)) {
    const eths = new Set<string>();
    for (const p of w.map.provinces) if (s.owner[p.id] === from) for (const e of Object.keys(ETHNICITIES)) eths.add(e);
    for (const eth of Object.keys(ETHNICITIES)) {
      const ids = P.provincesOfPeople(w, from, eth);
      if (!ids.length) continue;
      const a = P.liberationTarget(w, eth, from, ids), b = P.liberationTarget(w, eth, from);
      if (a !== b) diff.push(`${eth} di ${from}: conferenza → ${a}, applicazione → ${b}`);
    }
  }
  console.log(`D. casi in cui il destinatario mostrato e quello applicato differiscono: ${diff.length}`);
  for (const d of diff.slice(0, 12)) console.log('   ' + d);
}

// E. nascita di una nazione: chi è il "liberatore" e il testo dell'evento
{
  const w = fresh(); const s = w.state;
  declareWar(w, 'RUS', 'TUR', 'sonda');
  const war = s.wars.at(-1)!;
  const alb = P.provincesOfPeople(w, 'TUR', 'albanesi');
  const sink: GameEvent[] = [];
  P.concludePeace(w, war, [{ type: 'liberate', from: 'TUR', eth: 'albanesi', provinces: alb, to: 'RUS' }], sink);
  const op = s.nations.ALB.opinion;
  const fav = Object.entries(op).filter(([, v]) => v === 60).map(([k]) => k);
  console.log(`E. ALB nasce (liberatore RUS): stima 60 verso ${fav.join(',')}; stima verso RUS ${op.RUS}; testo: «${sink.find((e) => e.type === 'liberation')?.text}»`);
  const w2 = fresh(); const s2 = w2.state;
  declareWar(w2, 'GRE', 'TUR', 'sonda');
  const al2 = P.provincesOfPeople(w2, 'TUR', 'albanesi');
  P.concludePeace(w2, s2.wars.at(-1)!, [{ type: 'liberate', from: 'TUR', eth: 'albanesi', provinces: al2, to: 'GRE' }]);
  console.log(`E. stessa liberazione dettata dalla Grecia: stima 60 verso ${Object.entries(s2.nations.ALB.opinion).filter(([, v]) => v === 60).map(([k]) => k).join(',')}, verso GRE ${s2.nations.ALB.opinion.GRE}; prima chiave di state.nations: ${Object.keys(s2.nations)[0]}`);
  console.log(`   ALB: unità ${s.units.filter((u) => u.nation === 'ALB').length}, casse ${s.nations.ALB.treasury}, uomini ${s.nations.ALB.manpower}`);
}

// F. la seconda via della pace: proposta 'peace' di diplomazia.ts (dialogo e agenti LLM)
{
  const w = fresh(); const s = w.state;
  declareWar(w, 'RUS', 'TUR', 'sonda');
  s.nations.TUR.warExhaustion = 55;
  // 30 province ottomane NON occupate, sparse, la più lontana possibile dalla Russia: Hegiaz, Mesopotamia, Libia...
  const far = w.map.provinces.filter((p) => s.owner[p.id] === 'TUR' && !p.impassable && p.id !== s.nations.TUR.capital).sort((a, b) => a.lonlat[1] - b.lonlat[1]).slice(0, 30).map((p) => p.id);
  const err = checkProposal(w, 'RUS', 'TUR', { type: 'peace', giver: 'TUR', provinces: far, amount: 5000 });
  const war = s.wars.at(-1)!;
  const sc = P.warScore(w, war);
  const viaConf = P.checkCession(w, 'TUR', 'RUS', far);
  console.log(`F. RUS chiede a TUR (stanchezza 55, nessuna provincia occupata, punteggio ${sc.att}-${sc.def}) 30 province del sud (${far.slice(0, 3).map((p) => w.map.provinces[p].name).join(', ')}…) + 5000 M: veto di diplomacy.checkProposal = ${err === null ? 'NESSUNO' : err}; conferenza: costo ${viaConf.cost}, rifiuto «${viaConf.refusal}»`);
}

// G. costo di una provincia secondo la grandezza del perdente
{
  const w = fresh(); const s = w.state;
  const pick = (t: string) => { const l = w.map.provinces.filter((p) => s.owner[p.id] === t && p.id !== s.nations[t].capital && !p.impassable).sort((a, b) => b.pop - a.pop); return l[Math.min(3, l.length - 1)]; };
  for (const [from, to] of [['RUS', 'TUR'], ['GBR', 'FRA'], ['SER', 'BUL'], ['MNE', 'TUR']]) {
    const p = pick(from);
    console.log(`G. una provincia (${p.name}, ${Math.round(p.pop / 1000)} mila ab.) di ${from}: ${r1(P.provinceValue(w, p.id) / P.nationValue(w, from) * 100 * 1.8)} punti senza rivendicazione e occupata`);
  }
}

// H. due vincitori, un solo perdente: vassallaggi doppi
{
  const w = fresh(); const s = w.state;
  declareWar(w, 'AUH', 'MNE', 'sonda');
  const war = s.wars.at(-1)!;
  if (!war.attackers.includes('TUR')) war.attackers.push('TUR');
  const mne = w.map.provinces.filter((p) => s.owner[p.id] === 'MNE');
  mne.forEach((p, i) => (s.controller[p.id] = i % 2 ? 'TUR' : 'AUH'));
  s.controller[s.nations.MNE.capital] = 'AUH';
  war.casualties.MNE = 8000;
  const terms = P.engineTerms(w, war);
  console.log(`H. AUH+TUR contro MNE (tutto occupato): condizioni ${terms.map((d) => `${d.type}${d.type === 'vassal' ? ':' + d.to + ':' + d.level : ''}`).join(', ')}`);
  const vas = terms.filter((d) => d.type === 'vassal');
  if (vas.length > 1) { P.concludePeace(w, war, terms); console.log(`   dopo la pace il signore del Montenegro è ${(s.subjects ?? []).find((x) => x.subject === 'MNE')?.overlord}: l'altro ha speso punti per nulla`); }
}

// I. modalità "il giocatore nelle sue guerre": pace bianca accettata anche quando si perde
{
  const w = fresh(); const s = w.state;
  declareWar(w, 'SER', 'AUH', 'sonda');
  const war = s.wars.at(-1)!;
  for (const p of w.map.provinces) if (s.owner[p.id] === 'SER') s.controller[p.id] = 'AUH';
  const sc = P.warScore(w, war);
  console.log(`I. SER tutta occupata (punteggio ${sc.att}-${sc.def}): pace bianca chiesta da SER in 'engine' → ${P.peaceAnswer(w, war, 'SER', [], 'engine').ok}; in 'own' → ${P.peaceAnswer(w, war, 'SER', [], 'own').ok}; e in 'own' SER impone 30 punti di indennità a chi vince → ${P.peaceAnswer(w, war, 'SER', [{ type: 'indemnity', from: 'AUH', to: 'SER', amount: 500 }], 'own').ok}`);
}

// J. annessione: costo fisso 100 e bilancio massimo
{
  const w = fresh(); const s = w.state;
  declareWar(w, 'AUH', 'MNE', 'sonda');
  const war = s.wars.at(-1)!;
  for (const p of w.map.provinces) if (s.owner[p.id] === 'MNE') s.controller[p.id] = 'AUH';
  war.casualties.MNE = 8000; war.casualties.AUH = 1000;
  s.nations.MNE.warExhaustion = 80;
  const sc = P.warScore(w, war);
  console.log(`J. MNE interamente occupato, perdite 8:1, stanchezza 80: punteggio ${sc.att}-${sc.def}, punti ${sc.points}, annessione costa ${P.demandCost(w, { type: 'annex', from: 'MNE', to: 'AUH' }).cost}, protettorato ${P.demandCost(w, { type: 'vassal', from: 'MNE', to: 'AUH', level: 'protettorato' }).cost}`);
}
