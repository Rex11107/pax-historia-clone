import { aiColonize, aiEndOfTurn, aiPlan } from './ai';
import { resolveBattles } from './combat';
import { updateDeserts } from './desert';
import { expireTreaties } from './diplomacy';
import { weeklyEconomy } from './economy';
import { weeklyTrade } from './trade';
import { weeklyPolitics } from './politics';
import { weeklyMinisters } from './ministers';
import { touchBuildings, weeklyConstruction } from './construction';
import { weeklySubjects } from './vassals';
import { weeklyResearch } from './research';
import { weeklyReparations } from './peace';
import { weeklyColonial } from './colonial';
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

/** Fasi di fine settimana, nell'ordine in cui girano. L'ordine è una regola di gioco (docs/SPEC.md, "Ordine del
 *  turno"): ogni fase legge lo stato lasciato dalle precedenti. */
export const WEEKLY_PHASES: [string, (w: World, sink: GameEvent[]) => void][] = [
  ['commercio', weeklyTrade],
  ['economia', weeklyEconomy],
  ['riparazioni', (w) => weeklyReparations(w)],
  ['politica', weeklyPolitics],
  ['ministri', weeklyMinisters],
  ['costruzione', weeklyConstruction],
  ['soggetti', weeklySubjects],
  ['ricerca', weeklyResearch],
  ['ia', aiEndOfTurn],
  ['colonie', weeklyColonial],
  ['espansione', aiColonize],
  ['trattati', expireTreaties],
  ['deserti', updateDeserts],
];

/** Le cache del motore (province controllate, industria, logistica, rifornimenti in pace) valgono finché non
 *  cambia un padrone o un controllore: dopo ogni fase si confronta con l'ultima copia e, se serve, si azzerano.
 *  Così il risultato non dipende da cosa è stato calcolato prima (un'altra schermata, un salvataggio ricaricato). */
function ownershipWatch(w: World) {
  const s = w.state;
  let owner = [...s.owner], ctrl = [...s.controller];
  touchBuildings(); // il giocatore può aver cambiato qualcosa fra un turno e l'altro
  return () => {
    let same = owner.length === s.owner.length;
    for (let i = 0; same && i < owner.length; i++) if (owner[i] !== s.owner[i] || ctrl[i] !== s.controller[i]) same = false;
    if (same) return;
    owner = [...s.owner]; ctrl = [...s.controller];
    touchBuildings();
  };
}

/** Esegue un turno: 7 giorni di simulazione deterministica + aggiornamento settimanale.
 *  `probe` (solo strumenti e test) è chiamato dopo ogni fase col suo nome. */
export function runTurn(w: World, probe?: (phase: string) => void): TurnReport {
  const s = w.state;
  const sink: GameEvent[] = [];
  const report: TurnReport = { turn: s.turn, fromDay: s.day, toDay: s.day + DAYS_PER_TURN, events: sink, frames: [snapshot(w)], orderErrors: [] };
  const sync = ownershipWatch(w);
  invalidatePresence(w);
  aiPlan(w);
  probe?.('piani');
  for (let d = 0; d < DAYS_PER_TURN; d++) {
    s.day++;
    invalidatePresence(w);
    const order = [...s.units].sort((a, b) => (a.id < b.id ? -1 : 1));
    for (const u of order) if (s.units.includes(u)) processUnit(w, u, sink);
    sync();
    probe?.('ordini');
    invalidatePresence(w);
    resolveBattles(w, sink);
    sync();
    probe?.('battaglie');
    invalidatePresence(w);
    updateSupply(w, sink);
    probe?.('rifornimenti');
    report.frames.push(snapshot(w));
    if (d === 3) { invalidatePresence(w); aiPlan(w); probe?.('piani'); }
  }
  for (const [name, phase] of WEEKLY_PHASES) { phase(w, sink); sync(); probe?.(name); }
  s.turn++;
  if (s.events.length > MAX_EVENTS) s.events.splice(0, s.events.length - MAX_EVENTS);
  return report;
}
