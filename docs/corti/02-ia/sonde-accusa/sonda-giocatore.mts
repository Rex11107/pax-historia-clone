// Sonda 2 (corte IA): (a) guerra Russia-Ottomani fra nazioni non giocanti, con il tempo vero della fase "piani"
// misurato dentro runTurn e le condizioni di pace; (b) il giocatore (Italia) dichiara guerra all'Austria-Ungheria
// e non fa NULLA: quanto avanza l'AI, se chiude mai la guerra, se accetta la pace bianca.
import fs from 'node:fs';
import { newGame } from '/home/claude/pax-historia-clone/src/engine/setup';
import { runTurn } from '/home/claude/pax-historia-clone/src/engine/turn';
import { declareWar } from '/home/claude/pax-historia-clone/src/engine/diplomacy';
import { peaceAnswer, warScore } from '/home/claude/pax-historia-clone/src/engine/peace';

const M = JSON.parse(fs.readFileSync('/home/claude/pax-historia-clone/public/data/europe1881.json', 'utf8'));
function timed(w: ReturnType<typeof newGame>) {
  let last = 0; const acc: Record<string, number> = {}; const all: any[] = [];
  const probe = (ph: string) => { const t = performance.now(); acc[ph] = (acc[ph] ?? 0) + t - last; last = t; };
  return { run: () => { last = performance.now(); all.push(...runTurn(w, probe).events); }, acc, all };
}
const occ = (w: ReturnType<typeof newGame>, att: string[], def: string[]) => w.state.owner.reduce((a, o, p) => a + (def.includes(o) && att.includes(w.state.controller[p]) ? 1 : 0), 0);

// (a)
{
  const w = newGame(M, 'SMR'); const s = w.state;
  declareWar(w, 'RUS', 'TUR', 'sonda');
  const war = s.wars.at(-1)!;
  console.log('(a) lati', war.attackers, war.defenders);
  const T = timed(w); const N = 22;
  let ev0 = s.events.length;
  for (let t = 0; t < N; t++) {
    T.run();
    if (t % 3 === 2 || !s.wars.includes(war)) {
      const alive = s.wars.includes(war);
      const frozen = s.units.filter((u) => u.nation === 'RUS' && u.orders.length === 1 && u.orders[0].type === 'entrench' && !u.orders[0].until && !u.move).length;
      console.log(`  T${t + 1}: RUS occupa ${occ(w, war.attackers, war.defenders)}, TUR occupa ${occ(w, war.defenders, war.attackers)}, RUS unità ferme-per-sempre ${frozen}/${s.units.filter((u) => u.nation === 'RUS').length}${alive ? `, punteggio ${warScore(w, war).att}-${warScore(w, war).def}, stanchezza ${s.nations.RUS.warExhaustion.toFixed(0)}/${s.nations.TUR.warExhaustion.toFixed(0)}` : ' GUERRA FINITA'}`);
      if (!alive) break;
    }
  }
  console.log('  piani ms/turno', (T.acc['piani'] / N).toFixed(1), '| ordini', (T.acc['ordini'] / N).toFixed(1), '| rifornimenti', (T.acc['rifornimenti'] / N).toFixed(1), '| ia', (T.acc['ia'] / N).toFixed(1));
  console.log('  eventi di pace:', T.all.filter((e) => ['peace', 'cession', 'indemnity', 'subject', 'liberation', 'trade', 'dismantle'].includes(e.type) && e.nations.some((n) => ['RUS', 'TUR'].includes(n))).map((e) => e.text));
}
// (b)
{
  const w = newGame(M, 'ITA'); const s = w.state;
  declareWar(w, 'ITA', 'AUH', 'sonda');
  const war = s.wars.at(-1)!;
  console.log('(b) lati', war.attackers, war.defenders);
  const T = timed(w); const N = 26;
  for (let t = 0; t < N; t++) {
    T.run();
    if (t % 4 === 3) {
      const foes = [...war.defenders];
      const inItaly = s.units.filter((u) => foes.includes(u.nation) && s.owner[u.location] === 'ITA').length;
      const foeUnits = s.units.filter((u) => foes.includes(u.nation)).length;
      const ra = T.all.filter((e) => e.type === 'unit_raised' && foes.includes(e.nations[0])).length;
      console.log(`  T${t + 1}: ${foes.join('+')} occupano ${occ(w, war.defenders, war.attackers)} province italiane; unità nemiche in Italia ${inItaly}/${foeUnits}; arruolate finora ${ra}; punteggio ${warScore(w, war).att}-${warScore(w, war).def}; stanchezza ITA ${s.nations.ITA.warExhaustion.toFixed(0)} AUH ${s.nations.AUH.warExhaustion.toFixed(0)}; pace bianca chiesta dall'Italia: ${JSON.stringify(peaceAnswer(w, war, 'ITA', []))}`);
    }
  }
  console.log('  guerra ancora in corso dopo', N, 'turni:', s.wars.includes(war), '| casse AUH', s.nations.AUH.treasury.toFixed(0), 'debito', s.nations.AUH.debt.toFixed(0));
  function recruitCount(st: typeof s, foes: string[]) { return st.events.filter((e) => e.type === 'unit_raised' && foes.includes(e.nations[0])).length; }
}
