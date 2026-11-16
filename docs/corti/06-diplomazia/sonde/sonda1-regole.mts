// Sonda 1 della corte 06 (diplomazia): regole delle proposte, chiamata degli alleati, garanzie, soggetti del 1881.
// Nessun turno completo: solo funzioni del motore sullo stato iniziale (e la fase dei soggetti da sola).
// Uso: npx tsx docs/corti/06-diplomazia/sonde/sonda1-regole.mts
import fs from 'node:fs';
import { newGame } from '../../../../src/engine/setup';
import { applyProposal, checkProposal, declareWar } from '../../../../src/engine/diplomacy';
import { plausibility } from '../../../../src/llm/agents';
import { subjectOf, subjects, libertyTarget, weeklySubjects } from '../../../../src/engine/vassals';
import { allied, atWar, treatyBetween } from '../../../../src/engine/world';
import type { GameEvent } from '../../../../src/engine/types';

const M = JSON.parse(fs.readFileSync(new URL('../../../../public/data/europe1881.json', import.meta.url), 'utf8'));
const fresh = (player = 'SMR', seed = 'corte06') => newGame(M, player, seed);
const army = (w: ReturnType<typeof fresh>, t: string) => w.state.units.filter((u) => u.nation === t).reduce((a, u) => a + u.strength, 0);
const veto = (w: ReturnType<typeof fresh>, from: string, to: string, p: Parameters<typeof checkProposal>[3]) => checkProposal(w, from, to, p) ?? plausibility(w, to, p) ?? 'nessun veto';

// A. chi entra in guerra in virtù dei trattati
{
  for (const [a, b] of [['ITA', 'AUH'], ['FRA', 'GER'], ['RUS', 'GER'], ['GER', 'BEL'], ['RUS', 'TUR'], ['FRA', 'GBR']]) {
    const w = fresh(); const s = w.state;
    const before = s.nations.SMR.opinion[a] ?? 0;
    declareWar(w, a, b, 'sonda');
    const war = s.wars.at(-1)!;
    const g = treatyBetween(s, a, b, 'guarantee');
    console.log(`A. ${a} attacca ${b}: difensori ${war.defenders.slice(0, 8).join(',')}${war.defenders.length > 8 ? `… (${war.defenders.length})` : ''}; attaccanti ${war.attackers.join(',')}; garanzia ${a}-${b} ancora valida: ${g ? 'sì' : 'no/assente'}; stima di un terzo verso ${a}: ${before} → ${s.nations.SMR.opinion[a] ?? 0}`);
  }
}

// B. il giocatore (Italia) e le proposte: alleanze incompatibili, sussidi ripetuti, entrata in guerra contro il proprio alleato
{
  const w = fresh('ITA'); const s = w.state;
  const out: string[] = [];
  for (const t of ['FRA', 'GER', 'RUS', 'GBR']) {
    const v = veto(w, 'ITA', t, { type: 'alliance' });
    out.push(`${t}: ${v}`);
    if (v === 'nessun veto') applyProposal(w, 'ITA', t, { type: 'alliance' });
  }
  console.log(`B. Italia chiede alleanze (stime iniziali FRA→ITA ${-10}, GER→ITA 0): ${out.join(' | ')}`);
  console.log(`   alleanze italiane ora: ${s.treaties.filter((t) => t.type === 'alliance' && (t.a === 'ITA' || t.b === 'ITA')).map((t) => (t.a === 'ITA' ? t.b : t.a)).join(', ')}`);
  // garanzie dalle grandi potenze
  const g = ['GBR', 'RUS', 'AUH', 'TUR'].map((t) => `${t}: ${veto(w, 'ITA', t, { type: 'guarantee', giver: t })}`);
  console.log(`   garanzie chieste dall'Italia: ${g.join(' | ')}`);
  // sussidi ripetuti da una nazione che ci stima
  s.nations.GBR.opinion.ITA = 40;
  let got = 0, n = 0;
  for (let i = 0; i < 10; i++) { const p = { type: 'subsidy' as const, giver: 'GBR', amount: 100 }; if (veto(w, 'ITA', 'GBR', p) === 'nessun veto') { applyProposal(w, 'ITA', 'GBR', p); got += 100; n++; } }
  console.log(`   sussidi dal Regno Unito (stima 40, casse ${Math.round(s.nations.GBR.treasury)} M dopo): ${n} accordi di fila nello stesso giorno, ${got} M`);
}

// C. entrata in guerra contro il proprio alleato o contro il proprio signore
{
  const w = fresh('RUS'); const s = w.state;
  declareWar(w, 'RUS', 'TUR', 'sonda');
  s.nations.GER.opinion.RUS = 30; s.nations.BUK.opinion.RUS = 30;
  // la Germania è alleata dell'Austria; proviamo a farla entrare contro... prima un caso pulito: RUS in guerra con AUH
  const w2 = fresh('RUS'); const s2 = w2.state;
  declareWar(w2, 'RUS', 'AUH', 'sonda');
  const war2 = s2.wars.at(-1)!;
  // la Germania è già entrata come alleata dell'Austria? se no, chiediamole di combattere CONTRO l'Austria
  const gerSide = war2.defenders.includes('GER') ? 'già difensore' : 'fuori';
  console.log(`C. RUS attacca AUH: la Germania è ${gerSide}`);
  // caso protettorato: Bukhara (protettorato russo) invitata dalla Persia a combattere contro la Russia
  const w3 = fresh('PER'); const s3 = w3.state;
  declareWar(w3, 'PER', 'RUS', 'sonda');
  const w3war = s3.wars.at(-1)!;
  s3.nations.BUK.opinion.PER = 40;
  w3war.defenders = w3war.defenders.filter((t) => t !== 'BUK');
  const p = { type: 'join_war' as const, against: 'RUS' };
  const v = veto(w3, 'PER', 'BUK', p);
  if (v === 'nessun veto') applyProposal(w3, 'PER', 'BUK', p);
  console.log(`C. Bukhara, protettorato russo, invitata dalla Persia contro la Russia: ${v}; dopo: in guerra con RUS ${atWar(s3, 'BUK', 'RUS')}, ancora soggetta a ${subjectOf(w3, 'BUK')?.overlord ?? 'nessuno'} (${subjectOf(w3, 'BUK')?.level ?? '-'}), "alleata" della Russia per allied(): ${allied(s3, 'BUK', 'RUS')}`);
  // caso alleanza: Italia (giocatore) alleata della Germania chiede alla Germania di entrare contro l'Austria
  const w4 = fresh('ITA'); const s4 = w4.state;
  declareWar(w4, 'ITA', 'MNE', 'sonda'); // una guerra qualsiasi per avere un nemico
  s4.wars.at(-1)!.defenders.push('AUH'); // l'Austria entra contro l'Italia (forzato dalla sonda)
  s4.nations.GER.opinion.ITA = 40;
  const p4 = { type: 'join_war' as const, against: 'AUH' };
  const v4 = veto(w4, 'ITA', 'GER', p4);
  if (v4 === 'nessun veto') applyProposal(w4, 'ITA', 'GER', p4);
  console.log(`C. la Germania invitata contro l'Austria, sua alleata: ${v4}; dopo: in guerra ${atWar(s4, 'GER', 'AUH')}, alleanza ancora valida ${!!treatyBetween(s4, 'GER', 'AUH', 'alliance')}, allied() ${allied(s4, 'GER', 'AUH')}`);
}

// D. soggetti iniziali: desiderio, obiettivo, chi accetterebbe l'indipendenza
{
  const w = fresh(); const s = w.state;
  const rows = subjects(w).map((x) => ({ x, t: libertyTarget(w, x).target, weak: army(w, x.overlord) < army(w, x.subject) * 1.5 }));
  const hi = rows.filter((r) => r.x.liberty >= 80);
  console.log(`D. ${rows.length} legami iniziali; con desiderio ≥ 80 (possono proclamare l'indipendenza dalla prima settimana): ${hi.map((r) => `${r.x.subject}/${r.x.overlord} ${r.x.liberty}→obiettivo ${r.t}${r.weak ? ' (il signore cederebbe)' : ''}`).join('; ')}`);
  const lo = rows.filter((r) => r.t < 20);
  console.log(`   obiettivo sotto 20 (annessione possibile dopo cinque anni se protettorato): ${lo.map((r) => `${r.x.subject}/${r.x.overlord} ${r.t}`).join('; ') || 'nessuno'}`);
}

// E. la sola fase dei soggetti, 40 semi, 30 settimane: proclamazioni d'indipendenza
{
  const tally = new Map<string, number>();
  let wars = 0;
  for (let k = 0; k < 40; k++) {
    const w = fresh('SMR', `seme${k}`); const s = w.state;
    for (let i = 0; i < 30; i++) {
      s.day += 7;
      const ev: GameEvent[] = [];
      weeklySubjects(w, ev);
      for (const e of ev) if (/proclama l'indipendenza/.test(e.text)) { const key = e.nations.join('>'); tally.set(key, (tally.get(key) ?? 0) + 1); if (/non la riconosce/.test(e.text)) wars++; }
    }
  }
  console.log(`E. 40 semi × 30 settimane (solo la fase dei soggetti): proclamazioni ${[...tally].map(([k, v]) => `${k}: ${v}`).join(', ') || 'nessuna'}; di cui finite in guerra ${wars}`);
}
