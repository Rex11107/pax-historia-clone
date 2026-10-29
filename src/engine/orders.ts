import { techEffects } from './research';
import { level } from './construction';
import { TERRAIN_SPEED, type Edge } from './map';
import type { Condition, GameEvent, Order, Unit, UnitType } from './types';
import { al, allied, atWar, canEnter, clamp, di, emit, hostilePresent, hostileUnitsAt, NOBODY, The, type World } from './world';

export const UNIT_STATS: Record<UnitType, { speed: number; attack: number; defense: number }> = {
  infantry: { speed: 22, attack: 1, defense: 1 },
  cavalry: { speed: 38, attack: 0.9, defense: 0.6 },
  artillery: { speed: 16, attack: 1.4, defense: 1.2 },
};

const STRAIT_DAYS = 2;

// --- trasporto per mare (sbarco) ---
// Una nazione imbarca truppe in una sua provincia costiera con un porto (o in qualsiasi sua costa se ha una
// grande marina) e le sbarca su qualsiasi costa in cui può entrare: terra di nessuno, territorio proprio o
// alleato, nemico in guerra. Così le potenze arrivano in Africa senza un porto vicino (Assab, il Camerun).
const SEA_KMDAY = 450; // piroscafi da trasporto, carico e scarico compresi
const SEA_BASE = 3;
const MIN_NAVAL = 10;

/** Si può imbarcare qui? */
export function canEmbark(w: World, tag: string, p: number): boolean {
  const pv = w.map.provinces[p];
  if (!pv.coast || w.state.controller[p] !== tag) return false;
  const naval = w.profiles[tag]?.naval ?? 0;
  if (naval < MIN_NAVAL) return false;
  return naval >= 30 || level(w, p, 'porto') >= 1;
}

/** Giorni di navigazione fra due province costiere (rotta stimata: 1,25 volte la linea d'aria). */
export function seaDays(w: World, a: number, b: number): number {
  const [x1, y1] = w.map.provinces[a].c, [x2, y2] = w.map.provinces[b].c;
  return Math.round((SEA_BASE + (Math.hypot(x2 - x1, y2 - y1) * 1.25) / SEA_KMDAY) * 10) / 10;
}

/** Percorso con un tratto per mare: terra fino al porto, nave, terra fino all'obiettivo. */
function seaPlan(w: World, u: Unit, target: number, attack: boolean): { path: number[]; days: number; sea: { from: number; to: number; days: number } } | null {
  const s = w.state;
  if ((w.profiles[u.nation]?.naval ?? 0) < MIN_NAVAL) return null;
  const cost = moveCost(w, u, attack, target);
  const dFrom = w.map.distancesFrom(u.location, cost, 40);
  const ports: number[] = [];
  for (let p = 0; p < w.map.size; p++) if (isFinite(dFrom[p]) && canEmbark(w, u.nation, p)) ports.push(p);
  if (!ports.length) return null;
  const dTo = w.map.distancesFrom(target, cost, 40);
  let best: { e: number; l: number; days: number; sea: number } | null = null;
  for (let l = 0; l < w.map.size; l++) {
    if (!isFinite(dTo[l]) || !w.map.provinces[l].coast || !w.map.passable(l) || !canEnter(s, u.nation, l)) continue;
    for (const e of ports) {
      if (e === l) continue;
      const sd = seaDays(w, e, l);
      const tot = dFrom[e] + sd + dTo[l];
      if (!best || tot < best.days) best = { e, l, days: tot, sea: sd };
    }
  }
  if (!best) return null;
  const a = best.e === u.location ? { path: [] as number[] } : w.map.shortestPath(u.location, best.e, cost);
  const b = best.l === target ? { path: [] as number[] } : w.map.shortestPath(best.l, target, cost);
  if (!a || !b) return null;
  return { path: [...a.path, best.l, ...b.path], days: Math.round(best.days * 10) / 10, sea: { from: best.e, to: best.l, days: best.sea } };
}
/** sulle piste carovaniere si marcia a meno della metà della velocità (acqua, foraggio, guide) */
const ROUTE_SPEED = 0.4;

/** Durata in giorni di una tappa da `from` lungo l'arco `e` per l'unità. */
export function legDays(w: World, u: Unit, from: number, e: Edge): number {
  const s = w.state;
  const dest = w.map.provinces[e.to];
  let speed = UNIT_STATS[u.type].speed * TERRAIN_SPEED[dest.terrain];
  if (u.supply < 0.3) speed *= 0.6; else if (u.supply < 0.6) speed *= 0.85;
  speed *= 0.7 + 0.3 * u.morale;
  // ferrovia: solo in territorio proprio o alleato non conteso
  const friendly = (p: number) => allied(s, u.nation, s.controller[p]) && !hostilePresent(w, u.nation, p);
  if (e.route) speed *= ROUTE_SPEED;
  else if (!e.strait && friendly(from) && friendly(e.to)) {
    // ferrovia della provincia (0-3), resa dalla qualità della rete nazionale (materiale rotabile)
    const lines = Math.min(level(w, from, 'ferrovia'), level(w, e.to, 'ferrovia'));
    const net = Math.min(s.nations[s.controller[from]]?.rail ?? 0, s.nations[s.controller[e.to]]?.rail ?? 0);
    if (lines) speed *= (1 + 1.6 * lines * (0.6 + 0.4 * net / 100)) * techEffects(w, u.nation).railSpeed;
  }
  return Math.max(0.5, e.km / speed + (e.strait ? STRAIT_DAYS : 0));
}

export function moveCost(w: World, u: Unit, attack: boolean, target = -1) {
  const s = w.state;
  return (from: number, e: Edge) => {
    if (!w.map.passable(e.to) || !canEnter(s, u.nation, e.to)) return Infinity;
    let c = legDays(w, u, from, e);
    if (hostilePresent(w, u.nation, e.to)) c = attack || e.to === target ? c * 3 : c * 8;
    return c;
  };
}

/** Percorso per un ordine di movimento. `attack` consente di attraversare province con nemici. */
export function planPath(w: World, u: Unit, target: number, attack: boolean): { path: number[]; days: number; sea?: { from: number; to: number; days: number } } | null {
  if (target < 0 || target >= w.map.size) return null;
  const res = w.map.shortestPath(u.location, target, moveCost(w, u, attack, target));
  const land = res ? { path: res.path, days: res.cost } : null;
  // per mare solo se la terra non basta o è molto più lenta
  if (land && land.days <= 15) return land;
  const sea = seaPlan(w, u, target, attack);
  if (sea && (!land || sea.days < land.days * 0.85)) return sea;
  return land;
}

export function evalCondition(w: World, u: Unit, c: Condition | undefined, order: Order): boolean {
  if (!c) return true;
  const s = w.state;
  switch (c.type) {
    case 'always': return true;
    case 'day_gte': return s.day - (order.activatedDay ?? s.day) >= c.value;
    case 'supply_gte': return u.supply >= c.value;
    case 'strength_gte': return u.strength / u.maxStrength >= c.value;
    case 'unit_at': { const o = s.units.find((x) => x.id === c.unit); return !!o && o.location === c.province && !o.move?.path.length; }
    case 'controlled_by': return s.controller[c.province] === c.nation;
    case 'no_enemy_at': return hostileUnitsAt(s, u.nation, c.province).length === 0;
    default: return false;
  }
}

/** Validazione obbligatoria di un ordine (anche e soprattutto per quelli generati dall'AI). */
export function validateOrder(w: World, u: Unit, o: Order): string | null {
  const types = ['move', 'attack', 'hold', 'entrench'];
  if (!types.includes(o.type)) return `tipo di ordine sconosciuto: ${o.type}`;
  if (o.type === 'move' || o.type === 'attack') {
    if (typeof o.target !== 'number' || !w.map.provinces[o.target]) return `provincia di destinazione inesistente: ${o.target}`;
    if (!planPath(w, u, o.target, o.type === 'attack')) return `${w.map.provinces[o.target].name} non è raggiungibile per ${u.name} (territorio neutrale o nessun collegamento)`;
  }
  for (const c of [o.precondition, o.until]) {
    if (!c) continue;
    const ok = ['always', 'day_gte', 'supply_gte', 'strength_gte', 'unit_at', 'controlled_by', 'no_enemy_at'].includes(c.type);
    if (!ok) return `condizione sconosciuta: ${(c as Condition).type}`;
    if ('province' in c && !w.map.provinces[c.province]) return `condizione su provincia inesistente: ${c.province}`;
    if (c.type === 'unit_at' && !w.state.units.some((x) => x.id === c.unit)) return `condizione su unità inesistente: ${c.unit}`;
  }
  return null;
}

/** Sostituisce o accoda ordini a un'unità; restituisce gli errori. */
export function assignOrders(w: World, unitId: string, orders: Order[], mode: 'replace' | 'append', nation?: string): string[] {
  const u = w.state.units.find((x) => x.id === unitId);
  if (!u) return [`unità inesistente: ${unitId}`];
  if (nation && u.nation !== nation) return [`${u.name} non appartiene a ${nation}`];
  const errors: string[] = [];
  const ok: Order[] = [];
  // la validazione del percorso parte dalla posizione attuale: va bene anche per ordini in sequenza
  for (const o of orders.slice(0, 8)) {
    const err = validateOrder(w, u, o);
    if (err) errors.push(err); else ok.push({ ...o, status: 'pending' });
  }
  if (mode === 'replace') { u.orders = ok; u.move = null; } else u.orders.push(...ok);
  return errors;
}

function startLeg(w: World, u: Unit) {
  if (!u.move || !u.move.path.length) return;
  const e = w.map.edge(u.location, u.move.path[0]);
  const sea = u.move.sea;
  if (sea && sea.from === u.location && sea.to === u.move.path[0]) { u.move.legDays = sea.days; u.move.progress = 0; return; }
  if (!e) { u.move = null; return; }
  u.move.legDays = legDays(w, u, u.location, e);
  u.move.progress = 0;
}

function capture(w: World, u: Unit, p: number, sink: GameEvent[]) {
  const s = w.state;
  const ctrl = s.controller[p];
  // terra di nessuno (un'oasi indipendente): chi ci entra la occupa e la annette
  if (ctrl === NOBODY) {
    s.owner[p] = u.nation; s.controller[p] = u.nation;
    emit(w, { type: 'province_captured', province: p, nations: [u.nation], text: `${The(w, u.nation)} occupa ${w.map.provinces[p].name}, terra di nessuno.` }, sink);
    return;
  }
  if (ctrl === u.nation || !atWar(s, u.nation, ctrl)) return;
  // una provincia liberata torna al proprietario di diritto se è amico
  const owner = s.owner[p];
  const newCtrl = owner !== ctrl && allied(s, u.nation, owner) ? owner : u.nation;
  s.controller[p] = newCtrl;
  emit(w, { type: 'province_captured', province: p, nations: [newCtrl, ctrl], text: `${w.map.provinces[p].name} passa sotto il controllo ${di(w, newCtrl)} (tolta ${al(w, ctrl)}).` }, sink);
}

/** Un giorno di esecuzione degli ordini per un'unità. */
export function processUnit(w: World, u: Unit, sink: GameEvent[]) {
  const s = w.state;
  if (u.recovering > 0) { u.recovering--; return; }
  if (u.inBattle) return;
  for (let guard = 0; guard < 6; guard++) {
    const o = u.orders[0];
    if (!o) { u.entrench = clamp(u.entrench + 0.03, 0, 1); return; }
    if (o.status !== 'active') {
      if (!evalCondition(w, u, o.precondition, o)) { u.entrench = clamp(u.entrench + 0.03, 0, 1); return; }
      o.status = 'active';
      o.activatedDay = s.day;
    }
    if (o.until && evalCondition(w, u, o.until, o)) { finish(u); continue; }

    if (o.type === 'hold' || o.type === 'entrench') {
      u.entrench = clamp(u.entrench + (o.type === 'entrench' ? 0.1 : 0.04), 0, 1);
      if (!o.until) return; // tiene la posizione a tempo indeterminato
      return;
    }

    // move / attack
    const target = o.target!;
    if (u.location === target && !u.move?.path.length) { u.move = null; finish(u); continue; }
    if (!u.move || !u.move.path.length || u.move.path[u.move.path.length - 1] !== target) {
      const plan = planPath(w, u, target, o.type === 'attack');
      if (!plan) {
        emit(w, { type: 'order_failed', nations: [u.nation], province: u.location, text: `${u.name}: ${w.map.provinces[target].name} non è più raggiungibile, ordine annullato.` }, sink);
        u.orders.shift(); u.move = null; continue;
      }
      u.move = { path: plan.path, progress: 0, legDays: 1, ...(plan.sea ? { sea: plan.sea } : {}) };
      if (plan.sea && u.nation === w.state.player) emit(w, { type: 'embark', nations: [u.nation], province: plan.sea.from, text: `${u.name} si imbarca a ${w.map.provinces[plan.sea.from].name} per ${w.map.provinces[plan.sea.to].name} (${Math.round(plan.sea.days)} giorni di mare).` }, sink);
      startLeg(w, u);
    }
    advance(w, u, o, sink);
    return;
  }
}

function finish(u: Unit) { u.orders.shift(); }

function advance(w: World, u: Unit, o: Order, sink: GameEvent[]) {
  const s = w.state;
  let budget = 1;
  while (budget > 0 && u.move && u.move.path.length) {
    const next = u.move.path[0];
    if (!w.map.passable(next) || !canEnter(s, u.nation, next)) { u.move = null; return; } // ricalcolo il giorno dopo
    const hostile = hostileUnitsAt(s, u.nation, next);
    if (hostile.length && o.type === 'move' && next !== o.target) {
      emit(w, { type: 'contact', nations: [u.nation, hostile[0].nation], province: next, text: `${u.name} incontra truppe nemiche a ${w.map.provinces[next].name} e si ferma in attesa di ordini.` }, sink);
      u.move = null; u.orders.shift(); return;
    }
    const need = u.move.legDays - u.move.progress;
    if (budget < need) { u.move.progress += budget; return; }
    budget -= need;
    u.from = u.location;
    u.location = next;
    u.move.path.shift();
    u.entrench = 0;
    if (hostile.length) { u.move.path = []; u.move = null; return; } // si combatte qui
    capture(w, u, next, sink);
    if (u.move.sea && u.move.sea.to === next) delete u.move.sea; // sbarcati
    if (u.move.path.length) startLeg(w, u); else u.move = null;
  }
}

/** Posizione disegnabile (km, y verso il basso) con interpolazione sulla tappa in corso. */
export function unitPosition(w: World, u: Unit): [number, number] {
  const a = w.map.provinces[u.location].c;
  if (!u.move || !u.move.path.length || u.move.progress <= 0) return [a[0], -a[1]];
  const b = w.map.provinces[u.move.path[0]].c;
  const t = clamp(u.move.progress / u.move.legDays, 0, 1);
  return [a[0] + (b[0] - a[0]) * t, -(a[1] + (b[1] - a[1]) * t)];
}
