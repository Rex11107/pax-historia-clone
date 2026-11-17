// Sonda 3 (accusa): opere e colonie. Peso coloniale ignorato da rendite, logistica e scelte dell'AI.
import fs from 'node:fs';
import { newGame } from '/home/claude/pax-historia-clone/src/engine/setup';
import { runTurn } from '/home/claude/pax-historia-clone/src/engine/turn';
import * as C from '/home/claude/pax-historia-clone/src/engine/construction';
import { colonialWeight } from '/home/claude/pax-historia-clone/src/engine/ethnic';

const M = JSON.parse(fs.readFileSync('/home/claude/pax-historia-clone/public/data/europe1881.json', 'utf8'));
const w = newGame(M, 'SMR', 'regnum');
const s = w.state;
runTurn(w);
for (const t of ['GBR', 'FRA', 'NED', 'SPA', 'POR']) {
  if (!s.nations[t]) continue;
  const own = w.map.provinces.filter((p) => s.owner[p.id] === t && s.controller[p.id] === t && !p.impassable).sort((a, c) => c.pop - a.pop);
  const top8 = own.slice(0, 8).map((p) => `${p.name}${colonialWeight(w, t, p.id) < 1 ? '*' : ''}`);
  let popAll = 0, popCol = 0;
  for (const p of own) { popAll += p.pop; if (colonialWeight(w, t, p.id) < 1) popCol += p.pop; }
  const L = C.logistics(w, t);
  console.log(t, 'prime 8 province per popolazione (* = colonia):', top8.join(', '));
  console.log(`   popolazione colonie ${(popCol / 1e6).toFixed(0)} M su ${(popAll / 1e6).toFixed(0)} M; logistica capacita ${L.capacity} (di cui 4×milioni di abitanti ≈ ${Math.round(4 * popAll / 1e6)}), uomini ${L.men}, rapporto ${L.ratio}, fattore ${L.factor}`);
  // rendita di un tessile 1 nella provincia coloniale piu popolosa contro la madrepatria piu popolosa
  const col = own.find((p) => colonialWeight(w, t, p.id) < 1), home = own.find((p) => colonialWeight(w, t, p.id) >= 1);
  if (col && home) console.log(`   tessile 1: ${col.name} (peso coloniale ${colonialWeight(w, t, col.id).toFixed(2)}) ${(0.1 + col.pop / 1e7).toFixed(2)} M/sett contro ${home.name} ${(0.1 + home.pop / 1e7).toFixed(2)} M/sett`);
}
