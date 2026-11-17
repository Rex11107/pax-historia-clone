// Sonda 1 della giuria, corte 06 (diplomazia): riverifiche e casi aggiunti dai giurati.
// Uso: npx tsx docs/corti/06-diplomazia/sonde/giuria1-verifiche.mts
import fs from 'node:fs';
import { newGame } from '../../../../src/engine/setup';
import { applyProposal, checkProposal, declareWar } from '../../../../src/engine/diplomacy';
import { plausibility } from '../../../../src/llm/agents';
import { loosen, tighten, subjectOf } from '../../../../src/engine/vassals';
import { claimsOn } from '../../../../src/engine/claims';

const M = JSON.parse(fs.readFileSync(new URL('../../../../public/data/europe1881.json', import.meta.url), 'utf8'));
const fresh = (player = 'SMR') => newGame(M, player, 'giuria06');

// 1. attaccare un soggetto: il signore lo difende?
for (const [a, b] of [['FRA', 'HYD'], ['ITA', 'CAM'], ['GBR', 'BUK'], ['ITA', 'TUN'], ['RUS', 'BUL'], ['RUS', 'AFG']]) {
  const w = fresh(); const s = w.state;
  const lord = subjectOf(w, b);
  const err = declareWar(w, a, b, 'giuria');
  const war = s.wars.at(-1);
  console.log(`1. ${a} attacca ${b} (${lord ? `${lord.level} di ${lord.overlord}` : 'indipendente'}): ${err ?? `difensori ${war!.defenders.join(',')}`}`);
}

// 2. allentare e stringere a ripetizione nello stesso giorno (giocatore = Regno Unito, Hyderabad)
{
  const w = fresh('GBR'); const s = w.state;
  const x = subjectOf(w, 'HYD')!;
  x.liberty = 24;
  const op0 = s.nations.HYD.opinion.GBR ?? 0;
  const trail: string[] = [];
  for (let i = 0; i < 6; i++) {
    const e1 = loosen(w, 'GBR', 'HYD'); const e2 = tighten(w, 'GBR', 'HYD');
    trail.push(`${subjectOf(w, 'HYD')?.level}/${subjectOf(w, 'HYD')?.liberty}${e1 || e2 ? ` (${e1 ?? e2})` : ''}`);
  }
  console.log(`2. allenta+stringi ×6 su Hyderabad, desiderio 24: ${trail.join(' → ')}; stima HYD→GBR ${op0} → ${s.nations.HYD.opinion.GBR}`);
}

// 3. comprare la stima con i sussidi donati (giocatore = Regno Unito, verso la Russia)
{
  const w = fresh('GBR'); const s = w.state;
  const op0 = s.nations.RUS.opinion.GBR ?? 0;
  let n = 0;
  for (let i = 0; i < 6; i++) {
    const p = { type: 'subsidy' as const, giver: 'GBR', amount: 50 };
    const v = checkProposal(w, 'GBR', 'RUS', p) ?? plausibility(w, 'RUS', p);
    if (!v) { applyProposal(w, 'GBR', 'RUS', p); n++; }
  }
  const al = checkProposal(w, 'GBR', 'RUS', { type: 'alliance' }) ?? plausibility(w, 'RUS', { type: 'alliance' });
  console.log(`3. sei sussidi da 50 M alla Russia lo stesso giorno: firmati ${n}; stima RUS→GBR ${op0} → ${s.nations.RUS.opinion.GBR}; ora l'alleanza: ${al ?? 'nessun veto'}`);
}

// 4. la rivendicazione danese sullo Schleswig: quali province prende l'iso DE-SH
{
  const w = fresh(); const s = w.state;
  const sh = w.map.provinces.filter((p) => p.iso === 'DE-SH');
  console.log(`4. province con iso DE-SH: ${sh.map((p) => `${p.name} (${s.owner[p.id]}, ${Math.round(p.pop / 1000)} mila)`).join(', ')}`);
  const dk = sh.filter((p) => claimsOn(w, p.id).some((c) => c.nation === 'DEN'));
  console.log(`   rivendicate dalla Danimarca: ${dk.map((p) => p.name).join(', ')}`);
}

// 5. durata delle alleanze: iniziali e nuove
{
  const w = fresh('ITA'); const s = w.state;
  applyProposal(w, 'ITA', 'GER', { type: 'alliance', years: 5 });
  console.log(`5. alleanze iniziali con scadenza: ${s.treaties.filter((t) => t.type === 'alliance').map((t) => `${t.a}-${t.b} fine ${t.endDay}`).join(', ')}; alleanza ITA-GER chiesta per 5 anni → fine ${s.treaties.find((t) => t.a === 'ITA' && t.b === 'GER')?.endDay}`);
}
