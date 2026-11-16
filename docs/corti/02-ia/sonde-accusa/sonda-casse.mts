// Sonda 3 (corte IA): dove vanno i soldi delle nazioni non giocanti in pace. Per 104 turni, per alcune potenze:
// saldo medio del bilancio, spesa media in cantieri e ricerca, rimborsi, casse finali rispetto alla riserva voluta,
// uomini in armi rispetto all'esercito di pace del profilo, imposte. Uso: npx tsx <file> [turni]
import fs from 'node:fs';
import { newGame } from '/home/claude/pax-historia-clone/src/engine/setup';
import { runTurn } from '/home/claude/pax-historia-clone/src/engine/turn';
import { reserveOf } from '/home/claude/pax-historia-clone/src/engine/economy';

const N = Number(process.argv[2] ?? 104);
const M = JSON.parse(fs.readFileSync('/home/claude/pax-historia-clone/public/data/europe1881.json', 'utf8'));
const w = newGame(M, 'SMR'); const s = w.state;
const tags = ['GBR', 'USA', 'GER', 'RUS', 'FRA', 'ITA', 'AUH', 'JAP', 'SPA'].filter((t) => s.nations[t]);
const sum: Record<string, { net: number; cant: number; ric: number; rimb: number; col: number; arr: number }> = {};
for (const t of tags) sum[t] = { net: 0, cant: 0, ric: 0, rimb: 0, col: 0, arr: 0 };
const t0 = performance.now();
for (let i = 0; i < N; i++) {
  runTurn(w);
  for (const t of tags) {
    const n = s.nations[t]; const b = n.lastBudget!; const x = n.lastExtra ?? {};
    sum[t].net += b.net; sum[t].ric += b.research; sum[t].cant -= x.cantieri ?? 0; sum[t].rimb -= x.rimborso ?? 0; sum[t].col -= x.colonie ?? 0; sum[t].arr -= x.arruolamenti ?? 0;
  }
}
console.log(`${N} turni in ${((performance.now() - t0) / 1000).toFixed(1)} s`);
console.log('nazione  entrate  saldo/sett  cantieri/sett  ricerca/sett  rimborsi/sett  colonie/sett  arruol./sett  casse  riserva  debito  uomini/armyPeace  imposte  infrastr.  cantieri aperti/slot');
for (const t of tags) {
  const n = s.nations[t]; const x = sum[t]; const pr = w.profiles[t];
  const men = s.units.filter((u) => u.nation === t).reduce((a, u) => a + u.strength, 0);
  const open = (s.projects ?? []).filter((p) => p.nation === t).length;
  console.log(`${t.padEnd(6)} ${n.lastBudget!.income.toFixed(1).padStart(7)} ${(x.net / N).toFixed(1).padStart(10)} ${(x.cant / N).toFixed(2).padStart(13)} ${(x.ric / N).toFixed(2).padStart(12)} ${(x.rimb / N).toFixed(1).padStart(13)} ${(x.col / N).toFixed(2).padStart(12)} ${(x.arr / N).toFixed(2).padStart(12)}  ${n.treasury.toFixed(0).padStart(6)} ${reserveOf(w, t).toFixed(0).padStart(7)} ${n.debt.toFixed(0).padStart(7)}  ${Math.round(men / 1000)}k/${Math.round((pr.armyPeace ?? 0) / 1000)}k  ${n.policies.tax} ${n.policies.infrastructure}  ${open}`);
}
