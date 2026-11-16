// Sonda 1 della giuria, corte 05 (politica): verifiche puntuali sul motore, senza simulazione lunga.
// Uso: npx tsx docs/corti/05-politica/sonde/giuria1-puntuale.mts
import fs from 'node:fs';
import { newGame } from '../../../../src/engine/setup';
import { budget, stabilityTarget } from '../../../../src/engine/economy';
import * as P from '../../../../src/engine/politics';
import { headMinister, ministerEffects } from '../../../../src/engine/ministers';
import { foreignShare, ethnicStability, colonialWeight } from '../../../../src/engine/ethnic';
import { dayOf } from '../../../../src/scenario/politics1881';

const M = JSON.parse(fs.readFileSync(new URL('../../../../public/data/europe1881.json', import.meta.url), 'utf8'));
const fresh = () => newGame(M, 'SMR', 'giuria05');
const r1 = (v: number) => Math.round(v * 100) / 100;

// capo 1: la stabilità nel bilancio
{
  const w = fresh();
  for (const t of ['ITA', 'RUS']) {
    const out: string[] = [];
    for (const st of [80, 15]) { w.state.nations[t].stability = st; const b = budget(w, t); out.push(`stab ${st}: entrate ${r1(b.income)}, leva ${b.manpowerGain}, saldo ${r1(b.net)}`); }
    console.log(`1. ${t}: ${out.join(' | ')}`);
  }
}

// capo 3: fiducia di un'autocrazia a stabilità 0; esito di una crisi in una monarchia costituzionale
{
  const w = fresh();
  for (const t of ['RUS', 'TUR']) {
    const ps = P.politicsOf(w, t)!;
    const c = [100, 50, 0].map((st) => { w.state.nations[t].stability = st; return P.confidence(w, t, ps); });
    console.log(`3. ${t}: fiducia con stabilità 100/50/0 = ${c.join('/')} (soglia ${P.THRESHOLD.autocracy}, rischio sotto ${P.THRESHOLD.autocracy + 5})`);
  }
  for (const t of ['SWE', 'SER', 'DEN', 'AUH', 'BUL', 'GER']) {
    const ps = P.politicsOf(w, t)!;
    const before = `${ps.head} (${ps.gov.join('+')})`;
    const steps: string[] = [];
    for (let k = 0; k < 4; k++) {
      ps.crisis = { day: w.state.day, options: P.crisisOptions(ps) };
      ps.confidence = 10;
      const opt = P.defaultOption(w, t, ps);
      P.resolveCrisis(w, t, opt);
      steps.push(opt);
      if (opt === 'dissolve') { w.state.day = ps.nextElection!; P.holdElection(w, t, ps, []); }
      ps.decreeUntil = undefined;
    }
    console.log(`3. ${t} (crown ${ps.crown}, fixedHead ${!!ps.fixedHead}): quattro crisi a fiducia 10 → scelte ${steps.join(', ')}; governo prima ${before}, dopo ${ps.head} (${ps.gov.join('+')})`);
  }
}

// capo 4: le elezioni spagnole "fatte" e il consenso che diventa seggi
{
  const w = fresh();
  const ps = P.politicsOf(w, 'SPA')!;
  const show = () => ps.parties.map((p) => `${p.id} ${p.seats}/${p.pop}`).join(', ');
  const start = show();
  const gov = ps.gov[0];
  const other = ps.parties.find((p) => p.id !== gov)!;
  ps.parties.forEach((p) => { p.pop = p.id === gov ? 40 : p.id === other.id ? 50 : 10 / (ps.parties.length - 2 || 1); });
  w.state.day = 200;
  P.holdElection(w, 'SPA', ps, []);
  console.log(`4. Spagna (governo ${gov}, managed ${ps.managed}): all'inizio seggi/consenso ${start}; con consenso 40 al governo e 50 a ${other.id} il voto dà ${show()}`);
}

// capo 2: un capo morto continua a contare
{
  const w = fresh();
  const ps = P.politicsOf(w, 'FRA')!;
  ps.head = 'Léon Gambetta';
  w.state.day = dayOf(1885, 6, 1);
  const h = headMinister(w, 'FRA');
  console.log(`2. Francia, giugno 1885, capo Gambetta: scheda trovata ${h?.name ?? 'no'} (anni ${h?.years.join('-')}); fiducia dai ministri ${ministerEffects(w, 'FRA').confidence}`);
  const g = P.politicsOf(w, 'GER')!;
  w.state.day = dayOf(1899, 6, 1);
  console.log(`2. Germania, giugno 1899: capo ${g.head}; scheda ${headMinister(w, 'GER')?.name ?? 'no'} anni ${headMinister(w, 'GER')?.years.join('-')}; fiducia dai ministri ${ministerEffects(w, 'GER').confidence}`);
}

// capo 5: ripiego generico
{
  const w = fresh();
  const rows: string[] = [];
  const dates = new Map<number, number>();
  for (const t of Object.keys(w.state.nations)) {
    const ps = P.politicsOf(w, t);
    if (!ps || ['ITA', 'FRA', 'GBR', 'GER', 'AUH', 'RUS', 'TUR', 'SPA', 'POR', 'BEL', 'NED', 'DEN', 'SWE', 'SWI', 'GRE', 'ROM', 'SER', 'BUL', 'EGY', 'TUN'].includes(t)) continue;
    if (ps.regime === 'parliamentary') { rows.push(t); if (ps.nextElection !== null) dates.set(ps.nextElection, (dates.get(ps.nextElection) ?? 0) + 1); }
  }
  const usa = P.politicsOf(w, 'USA')!;
  console.log(`5. nazioni col ripiego parlamentare: ${rows.length} (${rows.slice(0, 20).join(',')}…); date del primo voto: ${[...dates].map(([d, n]) => `giorno ${d}: ${n}`).join(', ')}`);
  console.log(`5. Stati Uniti: regime ${usa.regime}, capo «${usa.head}», partiti ${usa.parties.map((p) => `${p.name} (${p.leaders[0]})`).join(' / ')}, rischio di crisi a fiducia 45: ${r1(P.crisisChance({ ...usa, confidence: 45 }))}`);
}

// capo 7: peso etnico delle colonie
{
  const w = fresh(); const s = w.state;
  for (const t of ['BEL', 'GBR', 'FRA', 'AUH']) {
    console.log(`7. ${t}: quota estranea iniziale ${r1(foreignShare(w, t))}, effetto stabilità ${r1(ethnicStability(w, t))}`);
  }
  // il Belgio prende 20 province africane abitate
  const afr = w.map.provinces.filter((p) => p.id >= (M.euCount ?? 1375) && !p.impassable && p.lonlat[1] < 5 && p.lonlat[1] > -12 && p.lonlat[0] > 12 && p.lonlat[0] < 30 && s.owner[p.id] !== 'BEL').sort((a, b) => b.pop - a.pop).slice(0, 20);
  const pop = afr.reduce((a, p) => a + p.pop, 0);
  for (const p of afr) s.owner[p.id] = 'BEL';
  console.log(`7. Belgio + 20 province del bacino del Congo (${Math.round(pop / 1e5) / 10} M ab., peso fiscale ${colonialWeight(w, 'BEL', afr[0].id)}): quota estranea ${r1(foreignShare(w, 'BEL'))}, effetto stabilità ${r1(ethnicStability(w, 'BEL'))}, stabilità obiettivo ${r1(stabilityTarget(w, 'BEL'))}`);
}

// capo 13: i due rami identici di crisisOptions
{
  const w = fresh();
  console.log(`13. opzioni di crisi Italia (Corona): ${P.crisisOptions(P.politicsOf(w, 'ITA')!).join(',')}; Francia (repubblica): ${P.crisisOptions(P.politicsOf(w, 'FRA')!).join(',')}`);
}
