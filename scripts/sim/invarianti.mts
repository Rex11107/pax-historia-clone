// Prova lunga delle invarianti: una partita di sole nazioni non giocanti, con alcune guerre accese apposta, e il
// controllo di src/engine/invariants.ts dopo ogni turno (con --fasi dopo ogni fase).
// Uso: npx tsx scripts/sim/invarianti.mts [turni=260] [seme=regnum] [--fasi] [--pace] [--caos]
// --caos: guerre a caso fra vicini ogni quattro turni e paci dure (annessioni, vassallaggi) imposte ogni dodici
import fs from 'node:fs';
import { newGame } from '../../src/engine/setup';
import { runTurn } from '../../src/engine/turn';
import { declareWar } from '../../src/engine/diplomacy';
import { checkInvariants } from '../../src/engine/invariants';
import { concludePeace, engineTerms, warScore } from '../../src/engine/peace';
import { rand } from '../../src/engine/world';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const turns = Number(args[0] ?? 260), seed = args[1] ?? 'regnum';
const perPhase = process.argv.includes('--fasi'), peace = process.argv.includes('--pace'), chaos = process.argv.includes('--caos');
const M = JSON.parse(fs.readFileSync(new URL('../../public/data/europe1881.json', import.meta.url), 'utf8'));
const w = newGame(M, 'SMR', seed);
// guerre fra grandi e piccoli, in Europa e fuori, a distanza di tempo: fanno nascere occupazioni, paci, annessioni
const WARS: [number, string, string][] = [[2, 'GER', 'FRA'], [2, 'RUS', 'TUR'], [30, 'ITA', 'AUH'], [60, 'GBR', 'TRA'], [60, 'FRA', 'TUN'], [90, 'JAP', 'COR'], [120, 'USA', 'MEX'], [150, 'SER', 'BUL'], [180, 'GBR', 'BRM'], [200, 'RUS', 'AFG']];
const seen = new Map<string, number>();
const count = new Map<string, number>();
const report = (where: string) => {
  for (const v of checkInvariants(w)) {
    const key = v.replace(/\d+/g, 'N');
    if (!seen.has(key)) console.log(`turno ${w.state.turn} [${where}] ${v}`);
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
};
report('inizio');
for (let i = 0; i < turns; i++) {
  if (!peace) for (const [t, a, b] of WARS) if (t === i && w.state.nations[a]?.alive && w.state.nations[b]?.alive) { const e = declareWar(w, a, b, 'simulazione'); if (e) console.log(`turno ${i}: ${a}→${b} non dichiarata: ${e}`); }
  if (chaos && i % 4 === 1) {
    // una nazione a caso (dal seme) dichiara guerra a un vicino; ogni tanto il vincitore annette il vinto
    const tags = Object.keys(w.state.nations).filter((t) => w.state.nations[t].alive && w.state.units.some((u) => u.nation === t));
    const a = tags[Math.floor(rand(seed, 'caos', i) * tags.length)];
    const near = [...new Set(w.map.provinces.filter((p) => w.state.owner[p.id] === a).flatMap((p) => w.map.adj[p.id].map((e) => w.state.owner[e.to])))].filter((t) => t && t !== a && w.state.nations[t]?.alive);
    if (a && near.length) declareWar(w, a, near[Math.floor(rand(seed, 'caos-b', i) * near.length)], 'caos');
    const war = w.state.wars[Math.floor(rand(seed, 'caos-w', i) * w.state.wars.length)];
    if (war && i % 12 === 1) {
      const sc = warScore(w, war);
      const win = sc.winner === 'def' ? war.defenders[0] : war.attackers[0], lose = sc.winner === 'def' ? war.attackers[0] : war.defenders[0];
      const kind = Math.floor(rand(seed, 'caos-k', i) * 3);
      concludePeace(w, war, kind === 0 && !w.profiles[lose]?.major ? [{ type: 'annex', from: lose, to: win }] : kind === 1 ? [{ type: 'vassal', from: lose, to: win, level: 'vassallo' }] : engineTerms(w, war), []);
    }
  }
  const rep = runTurn(w, perPhase ? (ph) => report(ph) : undefined);
  for (const e of rep.events) count.set(e.type, (count.get(e.type) ?? 0) + 1);
  report('fine turno');
}
const s = w.state;
const types = new Map<string, number>();
// gli eventi conservati sono gli ultimi 600: contati turno per turno qui sotto
for (const [k, n] of [...count].sort((x, y) => y[1] - x[1])) types.set(k, n);
console.log('eventi:', [...types].map(([k, n]) => `${k} ${n}`).join(', '));
console.log(`${turns} turni, ${[...seen.values()].reduce((a, b) => a + b, 0)} violazioni di ${seen.size} tipi; guerre in corso ${s.wars.length}, nazioni vive ${Object.values(s.nations).filter((n) => n.alive).length}/${Object.keys(s.nations).length}`);
process.exit(seen.size ? 1 : 0);
