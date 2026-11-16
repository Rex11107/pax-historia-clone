// Sonda 1 (corte IA): una guerra fra Stati con le sole nazioni non giocanti.
// Misura per turno: unità ferme per sempre ("al fronte" + trinceramento senza scadenza), unità in attacco,
// unità oziose, province nemiche occupate, tempo dei piani. Uso: npx tsx <questo file> [turni] [A] [B]
import fs from 'node:fs';
import { newGame } from '/home/claude/pax-historia-clone/src/engine/setup';
import { runTurn } from '/home/claude/pax-historia-clone/src/engine/turn';
import { declareWar } from '/home/claude/pax-historia-clone/src/engine/diplomacy';
import { warScore } from '/home/claude/pax-historia-clone/src/engine/peace';
import { aiPlan } from '/home/claude/pax-historia-clone/src/engine/ai';

const turns = Number(process.argv[2] ?? 20), A = process.argv[3] ?? 'GER', B = process.argv[4] ?? 'FRA';
const M = JSON.parse(fs.readFileSync('/home/claude/pax-historia-clone/public/data/europe1881.json', 'utf8'));
const w = newGame(M, 'SMR');
const s = w.state;
console.log('dichiarazione:', declareWar(w, A, B, 'sonda') ?? 'ok', 'lati', JSON.stringify(s.wars.at(-1)));
const war = s.wars.at(-1)!;
let planMs = 0, planCalls = 0, planMax = 0;
const probe = (ph: string) => { if (ph === 'piani') planCalls++; };
// cronometro dei piani: rifacciamo il conto chiamando aiPlan su una copia? No: misuriamo il turno e, a parte,
// una chiamata di aiPlan su uno stato clonato a ogni turno (senza toccare la partita).
const occ = (att: string[], def: string[]) => s.owner.reduce((a, o, p) => a + (def.includes(o) && att.includes(s.controller[p]) ? 1 : 0), 0);
for (let t = 0; t < turns; t++) {
  // misura di aiPlan su un clone dello stato
  const clone = { ...w, state: structuredClone(s), _presence: undefined };
  const t0 = performance.now(); aiPlan(clone); const dt = performance.now() - t0;
  planMs += dt; planMax = Math.max(planMax, dt);
  const t1 = performance.now();
  runTurn(w, probe);
  const turnMs = performance.now() - t1;
  const row: string[] = [];
  for (const tag of [A, B]) {
    const us = s.units.filter((u) => u.nation === tag);
    const frozen = us.filter((u) => u.orders.length === 1 && u.orders[0].type === 'entrench' && !u.orders[0].until && !u.move).length;
    const walking = us.filter((u) => u.orders.some((o) => o.type === 'move' && o.label === 'al fronte')).length;
    const attack = us.filter((u) => u.orders.some((o) => o.type === 'attack')).length;
    const idle = us.filter((u) => !u.orders.length).length;
    const men = us.reduce((a, u) => a + u.strength, 0);
    row.push(`${tag}: ${us.length} unità ${Math.round(men / 1000)}k, ferme-per-sempre ${frozen}, in marcia-al-fronte ${walking}, attacco ${attack}, senza ordini ${idle}`);
  }
  const alive = s.wars.includes(war);
  const sc = alive ? warScore(w, war) : null;
  console.log(`T${t + 1} ${turnMs.toFixed(0)}ms aiPlan(clone) ${dt.toFixed(1)}ms | ${row.join(' | ')} | occupate da ${A}: ${occ(war.attackers, war.defenders)}, da ${B}: ${occ(war.defenders, war.attackers)} | battaglie ${Object.keys(s.battles).length}${sc ? ` | punteggio ${sc.att}-${sc.def}` : ' | GUERRA FINITA'}`);
}
console.log(`aiPlan medio ${(planMs / turns).toFixed(1)} ms, massimo ${planMax.toFixed(1)} ms; chiamate per turno ${(planCalls / turns).toFixed(1)}`);
const lastPeace = s.events.filter((e) => e.type === 'peace' || e.type === 'cession').slice(-3).map((e) => e.text);
console.log('ultime paci/cessioni:', lastPeace);
