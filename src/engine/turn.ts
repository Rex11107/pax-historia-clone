import { aiEndOfTurn, aiPlan } from './ai';
import { resolveBattles } from './combat';
import { updateDeserts } from './desert';
import { expireTreaties } from './diplomacy';
import { weeklyEconomy } from './economy';
import { weeklyTrade } from './trade';
import { processUnit, unitPosition } from './orders';
import { updateSupply } from './supply';
import type { GameEvent, TurnReport } from './types';
import { invalidatePresence, type World } from './world';

export const DAYS_PER_TURN = 7;
const MAX_EVENTS = 600;

function snapshot(w: World): Record<string, [number, number]> {
  const f: Record<string, [number, number]> = {};
  for (const u of w.state.units) {
    const [x, y] = unitPosition(w, u);
    f[u.id] = [Math.round(x), Math.round(y)];
  }
  return f;
}

/** Esegue un turno: 7 giorni di simulazione deterministica + aggiornamento settimanale. */
export function runTurn(w: World): TurnReport {
  const s = w.state;
  const sink: GameEvent[] = [];
  const report: TurnReport = { turn: s.turn, fromDay: s.day, toDay: s.day + DAYS_PER_TURN, events: sink, frames: [snapshot(w)], orderErrors: [] };
  invalidatePresence(w);
  aiPlan(w);
  for (let d = 0; d < DAYS_PER_TURN; d++) {
    s.day++;
    invalidatePresence(w);
    const order = [...s.units].sort((a, b) => (a.id < b.id ? -1 : 1));
    for (const u of order) if (s.units.includes(u)) processUnit(w, u, sink);
    invalidatePresence(w);
    resolveBattles(w, sink);
    invalidatePresence(w);
    updateSupply(w, sink);
    report.frames.push(snapshot(w));
    if (d === 3) { invalidatePresence(w); aiPlan(w); }
  }
  weeklyTrade(w, sink);
  weeklyEconomy(w, sink);
  aiEndOfTurn(w, sink);
  expireTreaties(w, sink);
  updateDeserts(w, sink);
  s.turn++;
  if (s.events.length > MAX_EVENTS) s.events.splice(0, s.events.length - MAX_EVENTS);
  return report;
}
