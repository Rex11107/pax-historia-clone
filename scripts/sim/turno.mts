// Mappa del turno, misurata: fa girare N turni con le sole nazioni non giocanti (il giocatore è San Marino,
// che non fa nulla) e per ogni fase registra quali parti dello stato cambiano, quanto denaro si muove e
// quanto tempo costa. Serve a scrivere e a tenere vera la tabella "Ordine del turno" di docs/SPEC.md.
// Uso: npx tsx scripts/sim/turno.mts [turni=52] [giocatore=SMR]
import fs from 'node:fs';
import { newGame } from '../../src/engine/setup';
import { runTurn } from '../../src/engine/turn';
import type { GameState } from '../../src/engine/types';

const turns = Number(process.argv[2] ?? 52), player = process.argv[3] ?? 'SMR';
const M = JSON.parse(fs.readFileSync(new URL('../../public/data/europe1881.json', import.meta.url), 'utf8'));
const w = newGame(M, player);
const s = w.state;

// impronta di ogni parte dello stato (chiavi di primo livello, e per le nazioni campo per campo)
const NATION_FIELDS = ['treasury', 'debt', 'manpower', 'stability', 'warExhaustion', 'rail', 'opinion', 'policies', 'capital', 'alive', 'turnLosses', 'lastBudget'];
function prints(st: GameState): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of Object.keys(st) as (keyof GameState)[]) {
    if (k === 'nations' || k === 'events' || k === 'day' || k === 'turn') continue;
    out[k] = JSON.stringify(st[k]);
  }
  for (const f of NATION_FIELDS) out[`nations.${f}`] = JSON.stringify(Object.values(st.nations).map((n) => (n as unknown as Record<string, unknown>)[f]));
  return out;
}
const money = () => Object.values(s.nations).reduce((a, n) => a + n.treasury - n.debt, 0);

const writes = new Map<string, Map<string, number>>(); // fase → parte → volte
const cash = new Map<string, number>(), time = new Map<string, number>();
let before = prints(s), m0 = money(), t0 = performance.now();
const probe = (phase: string) => {
  const t1 = performance.now();
  time.set(phase, (time.get(phase) ?? 0) + t1 - t0);
  const after = prints(s);
  let wr = writes.get(phase);
  if (!wr) writes.set(phase, (wr = new Map()));
  for (const k of Object.keys(after)) if (after[k] !== before[k]) wr.set(k, (wr.get(k) ?? 0) + 1);
  const m1 = money();
  cash.set(phase, (cash.get(phase) ?? 0) + m1 - m0);
  before = after; m0 = m1; t0 = performance.now();
};
const start = performance.now();
for (let i = 0; i < turns; i++) runTurn(w, probe);
const total = performance.now() - start;

console.log(`${turns} turni, giocatore ${player}: ${(total / turns).toFixed(0)} ms a turno (di cui la misura stessa pesa molto)`);
console.log('fase            ms/turno   Δ ricchezza netta (M)   scrive');
for (const [phase, wr] of writes) {
  const parts = [...wr].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}${n < turns ? `(${n})` : ''}`).join(', ');
  console.log(`${phase.padEnd(14)} ${(time.get(phase)! / turns).toFixed(1).padStart(8)}   ${cash.get(phase)!.toFixed(1).padStart(12)}          ${parts || '—'}`);
}
