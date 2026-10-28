// Conferenza di pace: punteggio di guerra, richieste con un costo, regole contro il border gore,
// scelte del motore (per le nazioni non giocanti e come suggerimento al giocatore), applicazione.

import { claimOf, recordLoss } from './claims';
import { buildings, touchBuildings, type BuildingId } from './construction';
import { addTreaty, checkAlive, relocateStranded } from './diplomacy';
import { composition, ETHNICITIES, STATE_PEOPLES } from './ethnic';
import { RESOURCES, type ResourceId } from './resources';
import { subjectOf, subjects, type SubjectLevel } from './vassals';
import type { GameEvent, NationState, Tag, War } from './types';
import { changeOpinion, clamp, emit, nationName, type World } from './world';
import { contracts } from './trade';

// --- valore delle province e punteggio di guerra ---

/** Peso di una provincia in una pace: popolazione, risorse strategiche, opere, capitale. */
export function provinceValue(w: World, p: number): number {
  const pv = w.map.provinces[p];
  if (pv.impassable) return 0;
  const s = w.state;
  const strat = w.map.resources[p].filter((r) => RESOURCES[r].strategic).length;
  const lv = Object.values(buildings(w)[p]).reduce((a, b) => a + (b ?? 0), 0);
  const cap = Object.values(s.nations).some((n) => n.alive && n.capital === p) ? 10 : 0;
  return 1 + pv.pop / 250000 + 1.5 * strat + 0.3 * lv + cap;
}
export function nationValue(w: World, tag: Tag): number {
  let v = 0;
  for (let p = 0; p < w.map.size; p++) if (w.state.owner[p] === tag) v += provinceValue(w, p);
  return Math.max(1, v);
}

export interface WarScore {
  att: number; def: number;
  /** lato vincente e punti disponibili (differenza dei punteggi) */
  winner: 'att' | 'def' | null;
  points: number;
  /** contributo di ogni nazione al proprio lato (0-1) */
  share: Record<Tag, number>;
}

export function warScore(w: World, war: War): WarScore {
  const s = w.state;
  const side = (tags: Tag[], enemy: Tag[]) => {
    let occ = 0, tot = 0;
    const byNation: Record<Tag, number> = {};
    for (let p = 0; p < w.map.size; p++) {
      if (!enemy.includes(s.owner[p])) continue;
      const v = provinceValue(w, p);
      tot += v;
      if (tags.includes(s.controller[p])) { occ += v; byNation[s.controller[p]] = (byNation[s.controller[p]] ?? 0) + v; }
    }
    const lossesOwn = tags.reduce((a, t) => a + (war.casualties[t] ?? 0), 0);
    const lossesEnemy = enemy.reduce((a, t) => a + (war.casualties[t] ?? 0), 0);
    const battle = 25 * (lossesEnemy - lossesOwn) / (lossesEnemy + lossesOwn + 1);
    const ex = (l: Tag[]) => l.reduce((a, t) => a + (s.nations[t]?.warExhaustion ?? 0), 0) / Math.max(1, l.length);
    const capital = enemy[0] && s.controller[s.nations[enemy[0]].capital] && tags.includes(s.controller[s.nations[enemy[0]].capital]) ? 15 : 0;
    const score = clamp(80 * (occ / Math.max(1, tot)) + battle + 0.4 * (ex(enemy) - ex(tags)) + capital, 0, 100);
    return { score, byNation };
  };
  const A = side(war.attackers, war.defenders), D = side(war.defenders, war.attackers);
  const att = Math.round(A.score), def = Math.round(D.score);
  const winner = att > def + 2 ? 'att' : def > att + 2 ? 'def' : null;
  const points = Math.abs(att - def);
  const share: Record<Tag, number> = {};
  for (const [tags, sc] of [[war.attackers, A], [war.defenders, D]] as const) {
    const men = (t: Tag) => s.units.filter((u) => u.nation === t).reduce((a, u) => a + u.strength, 0) / 1000;
    const raw = tags.map((t) => (sc.byNation[t] ?? 0) + 0.3 * men(t) + 0.5 * (war.casualties[t] ?? 0) / 1000);
    const tot = raw.reduce((a, b) => a + b, 0) || 1;
    tags.forEach((t, i) => (share[t] = raw[i] / tot));
  }
  return { att, def, winner, points, share };
}

// --- richieste ---

export type Demand =
  | { type: 'cede'; from: Tag; to: Tag; provinces: number[] }
  | { type: 'liberate'; from: Tag; eth: string; provinces: number[]; to?: Tag }
  | { type: 'vassal'; from: Tag; to: Tag; level: SubjectLevel }
  | { type: 'annex'; from: Tag; to: Tag }
  | { type: 'indemnity'; from: Tag; to: Tag; amount: number }
  | { type: 'trade'; from: Tag; to: Tag; res: ResourceId; lots: number }
  | { type: 'dismantle'; from: Tag; to: Tag; levels: number }
  | { type: 'demilitarize'; from: Tag; to: Tag }
  | { type: 'alliances'; from: Tag; to: Tag };

export const DEMAND_LABEL: Record<Demand['type'], string> = {
  cede: 'cessione di territorio', liberate: 'liberazione di un popolo', vassal: 'vassallaggio', annex: 'annessione',
  indemnity: 'indennità di guerra', trade: 'concessione commerciale', dismantle: 'riparazioni industriali', demilitarize: 'smilitarizzazione del confine', alliances: 'rottura delle alleanze',
};

/** Popolo da liberare → nazione che lo riceve (Stato esistente che lo considera proprio, o nazione da far nascere). */
export function liberationTarget(w: World, eth: string, from: Tag, provinces?: number[]): Tag | null {
  const s = w.state;
  const touches = (tag: Tag) => !provinces || provinces.some((p) => w.map.adj[p].some((e) => s.owner[e.to] === tag));
  for (const [tag, sp] of Object.entries(STATE_PEOPLES)) if (tag !== from && sp.own.includes(eth) && s.nations[tag]?.alive && !w.profiles[tag]?.micro && touches(tag)) return tag;
  const rel = Object.values(w.profiles).find((p) => p.releasable === eth);
  return rel ? rel.tag : null;
}

const CLAIM_MULT = { nucleo: 0.6, storica: 0.85, pretesa: 1.2 } as const;

/** La provincia è occupata dal vincitore (o da un suo alleato in guerra)? */
function occupiedBy(w: World, winner: Tag, p: number): boolean {
  const s = w.state;
  const c = s.controller[p];
  if (!winner) return false;
  if (c === winner) return true;
  return s.wars.some((x) => (x.attackers.includes(winner) && x.attackers.includes(c)) || (x.defenders.includes(winner) && x.defenders.includes(c)));
}
/** Il perdente è crollato: capitale occupata dal lato vincitore. */
const collapsed = (w: World, winner: Tag, loser: Tag) => occupiedBy(w, winner, w.state.nations[loser]?.capital ?? -1);

/** Porto proprio e marina sufficiente: si può arrivare via mare. */
const seaPower = (w: World, t: Tag) => (w.profiles[t]?.naval ?? 0) >= 20 && w.map.provinces.some((p) => p.coast && w.state.owner[p.id] === t && (buildings(w)[p.id].porto ?? 0) >= 1);

/** Componenti del territorio di una nazione collegate alla capitale, con un insieme di province tolte. */
function connectedToCapital(w: World, tag: Tag, removed: Set<number>): Set<number> {
  const s = w.state;
  const cap = s.nations[tag]?.capital;
  const out = new Set<number>();
  if (cap === undefined || removed.has(cap) || s.owner[cap] !== tag) return out;
  const q = [cap];
  out.add(cap);
  while (q.length) {
    const u = q.pop()!;
    for (const e of w.map.adj[u]) if (!out.has(e.to) && !removed.has(e.to) && s.owner[e.to] === tag) { out.add(e.to); q.push(e.to); }
  }
  return out;
}

export interface CessionCheck { cost: number; refusal: string | null; warnings: string[]; added: number[] }

/**
 * Controlli su una cessione: raggiungibilità (via terra, o via mare con porto e marina), niente capitale,
 * niente exclavi lasciate al perdente (i resti piccoli si aggiungono da soli), niente corridoi.
 */
export function checkCession(w: World, from: Tag, to: Tag, provinces: number[], antiGore = true): CessionCheck {
  const s = w.state;
  const set = new Set(provinces.filter((p) => s.owner[p] === from && !w.map.provinces[p].impassable));
  const warnings: string[] = [];
  const added: number[] = [];
  if (!set.size) return { cost: 0, refusal: 'nessuna provincia valida', warnings, added };
  if (set.has(s.nations[from].capital)) return { cost: 0, refusal: `${w.map.provinces[s.nations[from].capital].name} è la capitale: si prende solo con l'annessione`, warnings, added };
  // raggiungibilità
  const reached = new Set<number>();
  const q: number[] = [];
  for (const p of set) if (w.map.adj[p].some((e) => s.owner[e.to] === to)) { reached.add(p); q.push(p); }
  while (q.length) { const u = q.pop()!; for (const e of w.map.adj[u]) if (set.has(e.to) && !reached.has(e.to)) { reached.add(e.to); q.push(e.to); } }
  const sea = seaPower(w, to);
  for (const p of set) {
    if (reached.has(p)) continue;
    const pv = w.map.provinces[p];
    if (pv.coast && sea) { reached.add(p); continue; }
    if (antiGore) return { cost: 0, refusal: `${pv.name} non è raggiungibile: non confina con noi${pv.coast ? ' e ci manca un porto o una marina' : ' e non tocca il mare'}`, warnings, added };
    warnings.push(`${pv.name} non è raggiungibile`);
  }
  // l'entroterra raggiunto via costa: le province interne collegate a una costa presa via mare
  // exclavi: ciò che resterebbe staccato dalla capitale del perdente
  if (antiGore) {
    const before = connectedToCapital(w, from, new Set());
    const after = connectedToCapital(w, from, set);
    const orphans = [...before].filter((p) => !after.has(p) && !set.has(p));
    if (orphans.length) {
      const ov = orphans.reduce((a, p) => a + provinceValue(w, p), 0);
      if (ov <= 0.06 * nationValue(w, from) || orphans.length <= 3) { for (const p of orphans) { set.add(p); added.push(p); } warnings.push(orphans.length === 1 ? `inclusa anche ${w.map.provinces[orphans[0]].name}, che resterebbe isolata` : `incluse anche ${orphans.map((p) => w.map.provinces[p].name).join(', ')}, che resterebbero isolate`); }
      else return { cost: 0, refusal: `lascerebbe ${nationName(w, from)} spezzato in due: ${orphans.slice(0, 4).map((p) => w.map.provinces[p].name).join(', ')}${orphans.length > 4 ? '…' : ''} resterebbero staccate dalla capitale`, warnings, added };
    }
  }
  // costo: peso delle province sul totale del perdente, ridotto dalle rivendicazioni
  const tot = nationValue(w, from);
  let cost = 0;
  for (const p of set) {
    const c = claimOf(w, to, p);
    // chiedere ciò che non si è occupato costa il doppio (salvo un perdente crollato)
    const occ = occupiedBy(w, to, p) || collapsed(w, to, from);
    cost += (provinceValue(w, p) / tot) * 100 * (c ? CLAIM_MULT[c.strength] : 1.8) * (added.includes(p) ? 0.5 : 1) * (occ ? 1 : 2);
  }
  // corridoi: il confine col perdente non deve allungarsi troppo
  if (antiGore) {
    const edges = (mine: (p: number) => boolean, theirs: (p: number) => boolean) => { let n = 0; for (let p = 0; p < w.map.size; p++) if (mine(p)) for (const e of w.map.adj[p]) if (theirs(e.to)) n++; return n; };
    const bBefore = edges((p) => s.owner[p] === to, (p) => s.owner[p] === from);
    const bAfter = edges((p) => s.owner[p] === to || set.has(p), (p) => s.owner[p] === from && !set.has(p));
    if (bBefore > 0 && bAfter > bBefore * 3 + 14) return { cost: 0, refusal: 'il nuovo confine sarebbe un corridoio: troppo lungo rispetto al territorio preso', warnings, added };
    if (bBefore > 0 && bAfter > bBefore * 2 + 8) { cost *= 1.5; warnings.push('confine molto più lungo: costo +50%'); }
  }
  return { cost: Math.round(cost * 10) / 10, refusal: null, warnings, added };
}

const income = (w: World, t: Tag) => Math.max(1, w.state.nations[t]?.lastBudget?.income ?? 10);

/** Costo in punti e controlli di una richiesta. */
export function demandCost(w: World, d: Demand, antiGore = true): { cost: number; refusal: string | null; warnings: string[] } {
  const s = w.state;
  const fromSize = nationValue(w, d.from);
  switch (d.type) {
    case 'cede': { const c = checkCession(w, d.from, d.to, d.provinces, antiGore); return { cost: c.cost, refusal: c.refusal, warnings: c.warnings }; }
    case 'liberate': {
      if (!liberationTarget(w, d.eth, d.from, d.provinces)) return { cost: 0, refusal: 'nessuno Stato confinante e nessuna nazione può nascere per questo popolo', warnings: [] };
      const cost = d.provinces.reduce((a, p) => a + provinceValue(w, p) * (occupiedBy(w, d.to ?? '', p) ? 1 : 2), 0) / fromSize * 100 * 0.5;
      if (d.provinces.includes(s.nations[d.from].capital)) return { cost: 0, refusal: 'la capitale non si libera', warnings: [] };
      return { cost: Math.round(cost * 10) / 10, refusal: d.provinces.length ? null : 'nessuna provincia con quella maggioranza', warnings: [] };
    }
    case 'vassal': {
      if (w.profiles[d.from]?.major) return { cost: 0, refusal: 'una grande potenza non diventa vassalla', warnings: [] };
      const border = w.map.provinces.some((p) => s.owner[p.id] === d.from && w.map.adj[p.id].some((e) => s.owner[e.to] === d.to));
      const colonial = seaPower(w, d.to) && (w.profiles[d.to]?.naval ?? 0) >= 40 && w.map.provinces.some((p) => s.owner[p.id] === d.from && p.coast);
      if (!border && !colonial) return { cost: 0, refusal: 'troppo lontano: serve un confine comune o una marina coloniale e una costa', warnings: [] };
      const base = { tributario: 30, vassallo: 45, protettorato: 60 }[d.level];
      return { cost: base, refusal: null, warnings: [] };
    }
    case 'annex': {
      const n = w.map.provinces.filter((p) => s.owner[p.id] === d.from).length;
      if (w.profiles[d.from]?.major || n > 8) return { cost: 0, refusal: 'si annettono solo stati piccoli (fino a 8 province, non grandi potenze)', warnings: [] };
      return { cost: 100, refusal: null, warnings: [] };
    }
    case 'indemnity': return { cost: Math.round((d.amount / (income(w, d.from) * 40)) * 1000) / 10, refusal: d.amount > 0 ? null : 'importo non valido', warnings: [] };
    case 'trade': return { cost: d.lots * 4, refusal: null, warnings: [] };
    case 'dismantle': return { cost: d.levels * 6, refusal: null, warnings: [] };
    case 'demilitarize': return { cost: 10, refusal: null, warnings: [] };
    case 'alliances': return { cost: s.treaties.some((t) => t.type === 'alliance' && (t.a === d.from || t.b === d.from)) ? 10 : 0, refusal: null, warnings: [] };
  }
}

export function totalCost(w: World, demands: Demand[], antiGore = true) {
  let cost = 0;
  const problems: string[] = [];
  for (const d of demands) { const c = demandCost(w, d, antiGore); cost += c.cost; if (c.refusal) problems.push(c.refusal); }
  return { cost: Math.round(cost * 10) / 10, problems };
}

/** Punti che spettano a una nazione vincitrice (quota del suo lato). */
export function budgetOf(w: World, war: War, tag: Tag): number {
  const sc = warScore(w, war);
  const sideOf = war.attackers.includes(tag) ? 'att' : 'def';
  if (sc.winner !== sideOf) return 0;
  return Math.round(sc.points * (sc.share[tag] ?? 0) * 10) / 10;
}

// --- scelte del motore ---

/** Le province del perdente in cui un popolo è maggioranza (almeno 40%). */
export function provincesOfPeople(w: World, from: Tag, eth: string): number[] {
  const s = w.state;
  return w.map.provinces.filter((p) => s.owner[p.id] === from && !p.impassable && p.id !== s.nations[from].capital && (() => { const top = composition(w, p.id).reduce((a, b) => (b.share > a.share ? b : a)); return top.eth === eth && top.share >= 40; })()).map((p) => p.id);
}

/**
 * Richieste che il motore sceglie per un vincitore, entro il suo budget. Ragioni reali: prima ciò che
 * rivendica ed è raggiungibile; vassallaggio se il perdente è uno stato minore accanto a un rivale (cuscinetto)
 * o controlla uno stretto; liberazione se indebolisce un rivale; altrimenti riparazioni.
 */
export function suggestDemands(w: World, war: War, winner: Tag, budget: number): Demand[] {
  const s = w.state;
  const enemies = war.attackers.includes(winner) ? war.defenders : war.attackers;
  const out: Demand[] = [];
  let left = budget;
  const used = new Set<number>();
  const take = (d: Demand) => {
    if (d.type === 'cede') { d = { ...d, provinces: d.provinces.filter((p) => !used.has(p)) }; if (!d.provinces.length) return true; }
    const c = demandCost(w, d);
    if (!c.refusal && c.cost <= left && c.cost > 0) {
      out.push(d); left -= c.cost;
      if (d.type === 'cede') { for (const p of d.provinces) used.add(p); for (const p of checkCession(w, d.from, d.to, d.provinces).added) used.add(p); }
      if (d.type === 'liberate') for (const p of d.provinces) used.add(p);
      return true;
    }
    return false;
  };
  const rivals = new Set(w.profiles[winner]?.rivals ?? []);
  // prima i nemici che abbiamo davvero battuto (territorio occupato); dagli alleati non toccati non si pretende nulla
  const beatenValue = (t: Tag) => w.map.provinces.reduce((a, p) => a + (s.owner[p.id] === t && occupiedBy(w, winner, p.id) ? provinceValue(w, p.id) : 0), 0);
  const leader = war.attackers.includes(winner) ? war.defenders[0] : war.attackers[0];
  for (const from of [...enemies].sort((a, b) => beatenValue(b) - beatenValue(a))) {
    if (!s.nations[from]?.alive) continue;
    if (from !== leader && beatenValue(from) === 0) continue;
    // 1. territori rivendicati, per blocchi coerenti (stessa regione storica), i più forti prima
    const down = collapsed(w, winner, from);
    const claimed = w.map.provinces.filter((p) => s.owner[p.id] === from && !p.impassable && claimOf(w, winner, p.id) && p.id !== s.nations[from].capital && (down || occupiedBy(w, winner, p.id)));
    const blocks = new Map<string, number[]>();
    for (const p of claimed) { const k = `${p.hist ?? p.hreg ?? p.name}`; blocks.set(k, [...(blocks.get(k) ?? []), p.id]); }
    const rank = (ids: number[]) => Math.max(...ids.map((p) => ({ nucleo: 3, storica: 2, pretesa: 1 }[claimOf(w, winner, p)!.strength])));
    for (const ids of [...blocks.values()].sort((a, b) => rank(b) - rank(a))) {
      if (!take({ type: 'cede', from, to: winner, provinces: ids })) {
        // il blocco intero costa troppo: le province di nucleo da sole
        const core = ids.filter((p) => claimOf(w, winner, p)!.strength === 'nucleo');
        if (core.length && core.length < ids.length) take({ type: 'cede', from, to: winner, provinces: core });
      }
    }
    // 2. vassallaggio: cuscinetto contro un rivale, o padrone di uno stretto
    const nextToRival = w.map.provinces.some((p) => s.owner[p.id] === from && w.map.adj[p.id].some((e) => rivals.has(s.owner[e.to])));
    const strait = w.map.provinces.some((p) => s.owner[p.id] === from && w.map.adj[p.id].some((e) => e.strait));
    // o stato minore crollato ai nostri confini (Tunisi 1881)
    const beaten = down && w.map.provinces.some((p) => s.owner[p.id] === from && w.map.adj[p.id].some((e) => s.owner[e.to] === winner));
    if (!w.profiles[from]?.major && subjectOf(w, from)?.overlord !== winner && (nextToRival || strait || beaten)) take({ type: 'vassal', from, to: winner, level: left >= 60 ? 'protettorato' : 'vassallo' });
    // 3. liberazione: se il perdente è un rivale o una grande potenza, liberare un popolo la indebolisce
    if (rivals.has(from) || w.profiles[from]?.major) {
      const peoples = new Map<string, number[]>();
      for (const p of w.map.provinces) if (s.owner[p.id] === from && !p.impassable) {
        const top = composition(w, p.id).reduce((a, b) => (b.share > a.share ? b : a));
        if (top.share >= 50 && !STATE_PEOPLES[from]?.own.includes(top.eth)) peoples.set(top.eth, [...(peoples.get(top.eth) ?? []), p.id]);
      }
      // solo popoli le cui terre sono per metà in mano nostra, verso uno Stato amico o una nazione nuova
      const ok = [...peoples.entries()].map(([eth]) => [eth, provincesOfPeople(w, from, eth)] as const).filter(([eth, ids]) => {
        const target = liberationTarget(w, eth, from, ids);
        if (!target || target === winner || target === from) return false;
        const occ = ids.reduce((a, p) => a + (occupiedBy(w, winner, p) ? provinceValue(w, p) : 0), 0) / Math.max(1, ids.reduce((a, p) => a + provinceValue(w, p), 0));
        const friendly = !s.nations[target]?.alive || (s.nations[target].opinion[winner] ?? 0) >= 0;
        return friendly && (occ >= 0.5 || down);
      }).sort((a, b) => b[1].length - a[1].length);
      if (ok[0]) take({ type: 'liberate', from, eth: ok[0][0], provinces: ok[0][1], to: winner });
    }
    // 4. riparazioni: commercio se il perdente ha ciò che ci manca, poi industria, poi denaro
    for (const r of ['carbone', 'ferro'] as ResourceId[]) {
      const has = w.map.provinces.some((p) => s.owner[p.id] === from && w.map.resources[p.id].includes(r));
      const mine = w.map.provinces.some((p) => s.owner[p.id] === winner && w.map.resources[p.id].includes(r));
      if (has && !mine) take({ type: 'trade', from, to: winner, res: r, lots: 2 });
    }
    if (left >= 25 && w.map.provinces.some((p) => s.owner[p.id] === from && (buildings(w)[p.id].bellica ?? 0) > 0)) take({ type: 'dismantle', from, to: winner, levels: 2 });
    if (left >= 2) { const amount = Math.round((left * 0.9 / 100) * income(w, from) * 40); if (amount >= 5) take({ type: 'indemnity', from, to: winner, amount }); }
  }
  return out;
}

// --- applicazione ---

function birth(w: World, tag: Tag, provinces: number[], liberator: Tag) {
  const s = w.state;
  const pr = w.profiles[tag];
  const pop = provinces.reduce((a, p) => a + w.map.provinces[p].pop, 0);
  const capProv = w.map.locate(pr.capital[0], pr.capital[1]);
  const capital = capProv !== null && provinces.includes(capProv) ? capProv : [...provinces].sort((a, b) => w.map.provinces[b].pop - w.map.provinces[a].pop)[0];
  const n: NationState = {
    tag, treasury: Math.round((pop / 1e6) * 2), debt: 0, manpower: Math.round(pop * 0.003), stability: 55, warExhaustion: 0, rail: pr.rail,
    opinion: { [liberator]: 60 }, policies: { tax: 'normal', mobilization: 'peace', infrastructure: 'normal', press: 'guided' }, capital, alive: true, turnLosses: 0,
  };
  s.nations[tag] = n;
  for (const t of Object.keys(s.nations)) if (t !== tag) s.nations[t].opinion[tag] ??= 0;
}

export function applyDemand(w: World, d: Demand, sink: GameEvent[]) {
  const s = w.state;
  switch (d.type) {
    case 'cede': {
      const chk = checkCession(w, d.from, d.to, d.provinces, false);
      const ids = [...new Set([...d.provinces, ...chk.added])].filter((p) => s.owner[p] === d.from);
      for (const p of ids) { s.owner[p] = d.to; s.controller[p] = d.to; }
      recordLoss(w, d.from, ids);
      emit(w, { type: 'cession', nations: [d.from, d.to], text: `${nationName(w, d.from)} cede ${ids.length === 1 ? w.map.provinces[ids[0]].name : `${ids.length} province (${ids.slice(0, 3).map((p) => w.map.provinces[p].name).join(', ')}${ids.length > 3 ? '…' : ''})`} a ${nationName(w, d.to)}.` }, sink);
      break;
    }
    case 'liberate': {
      const to = liberationTarget(w, d.eth, d.from)!;
      const ids = d.provinces.filter((p) => s.owner[p] === d.from);
      if (!s.nations[to]?.alive) birth(w, to, ids, s.player === d.from ? to : (Object.keys(s.nations).find((t) => s.nations[t].alive && t !== d.from) ?? to));
      for (const p of ids) { s.owner[p] = to; s.controller[p] = to; }
      recordLoss(w, d.from, ids);
      changeOpinion(s, to, d.from, -40);
      emit(w, { type: 'liberation', nations: [d.from, to], text: `${nationName(w, to)} ${s.nations[to].opinion ? 'ottiene' : 'nasce con'} le terre dei ${ETHNICITIES[d.eth]?.label ?? d.eth} di ${nationName(w, d.from)} (${ids.length} province).` }, sink);
      break;
    }
    case 'vassal': {
      s.subjects = subjects(w).filter((x) => x.subject !== d.from);
      s.subjects.push({ subject: d.from, overlord: d.to, level: d.level, liberty: 60, since: s.day });
      emit(w, { type: 'subject', nations: [d.from, d.to], text: `${nationName(w, d.from)} diventa ${d.level} di ${nationName(w, d.to)}.` }, sink);
      break;
    }
    case 'annex': {
      const ids = w.map.provinces.filter((p) => s.owner[p.id] === d.from).map((p) => p.id);
      for (const p of ids) { s.owner[p] = d.to; s.controller[p] = d.to; }
      s.units = s.units.filter((u) => u.nation !== d.from);
      emit(w, { type: 'annex', nations: [d.from, d.to], text: `${nationName(w, d.to)} annette ${nationName(w, d.from)}.` }, sink);
      break;
    }
    case 'indemnity': {
      // un quarto subito (se c'è in cassa), il resto in un anno a rate settimanali
      const now = Math.min(d.amount * 0.25, s.nations[d.from].treasury);
      s.nations[d.from].treasury -= now; s.nations[d.to].treasury += now;
      const rest = d.amount - now;
      (s.reparations ??= []).push({ payer: d.from, receiver: d.to, perWeek: Math.round((rest / 52) * 100) / 100, weeksLeft: 52 });
      emit(w, { type: 'indemnity', nations: [d.from, d.to], text: `${nationName(w, d.from)} pagherà ${Math.round(d.amount)} milioni di indennità a ${nationName(w, d.to)}.` }, sink);
      break;
    }
    case 'trade': {
      contracts(s).push({ id: `tr-pace-${s.nextId++}`, seller: d.from, buyer: d.to, res: d.res, qty: d.lots, price: 0, startDay: s.day, forced: true, until: s.day + 5 * 365 });
      addTreaty(w, 'trade', d.from, d.to, 10, sink);
      emit(w, { type: 'trade', nations: [d.from, d.to], text: `${nationName(w, d.from)} consegnerà gratis ${d.lots} lotti di ${RESOURCES[d.res].label} a settimana a ${nationName(w, d.to)} per cinque anni, e accetta un accordo commerciale.` }, sink);
      break;
    }
    case 'dismantle': {
      const b = buildings(w);
      let left = d.levels;
      for (const k of ['bellica', 'siderurgia'] as BuildingId[]) {
        const list = w.map.provinces.filter((p) => s.owner[p.id] === d.from && (b[p.id][k] ?? 0) > 0).sort((x, y) => (b[y.id][k] ?? 0) - (b[x.id][k] ?? 0));
        for (const p of list) while (left > 0 && (b[p.id][k] ?? 0) > 0) { b[p.id][k]! -= 1; left--; const cap = s.nations[d.to].capital; b[cap][k] = Math.min(3, (b[cap][k] ?? 0) + 1); }
      }
      touchBuildings();
      emit(w, { type: 'dismantle', nations: [d.from, d.to], text: `${nationName(w, d.from)} smonta ${d.levels - left} livelli di industria pesante: i macchinari vanno a ${nationName(w, d.to)}.` }, sink);
      break;
    }
    case 'demilitarize': {
      const b = buildings(w);
      const border = w.map.provinces.filter((p) => s.owner[p.id] === d.from && w.map.adj[p.id].some((e) => s.owner[e.to] === d.to)).map((p) => p.id);
      for (const p of border) delete b[p].fortezza;
      touchBuildings();
      (s.demilitarized ??= []).push({ nation: d.from, provinces: border, until: s.day + 10 * 365 });
      emit(w, { type: 'demilitarize', nations: [d.from, d.to], text: `${nationName(w, d.from)} smantella le fortezze di confine con ${nationName(w, d.to)} e non potrà ricostruirle per dieci anni.` }, sink);
      break;
    }
    case 'alliances': {
      for (const t of s.treaties) if (t.type === 'alliance' && (t.a === d.from || t.b === d.from) && t.a !== d.to && t.b !== d.to) t.violated = true;
      s.treaties = s.treaties.filter((t) => !t.violated);
      emit(w, { type: 'alliances', nations: [d.from, d.to], text: `${nationName(w, d.from)} rompe le sue alleanze.` }, sink);
      break;
    }
  }
}

/** Fine della guerra intera con le richieste di tutti i vincitori. */
export function concludePeace(w: World, war: War, demands: Demand[], sink: GameEvent[] = []) {
  const s = w.state;
  for (const d of demands) applyDemand(w, d, sink);
  s.wars = s.wars.filter((x) => x !== war);
  s.situations = s.situations.filter((x) => x.id !== war.id);
  // le occupazioni finiscono
  const parts = [...war.attackers, ...war.defenders];
  for (let p = 0; p < s.owner.length; p++) if (parts.includes(s.owner[p]) && s.owner[p] !== s.controller[p] && !s.wars.some((x) => (x.attackers.includes(s.owner[p]) && x.defenders.includes(s.controller[p])) || (x.defenders.includes(s.owner[p]) && x.attackers.includes(s.controller[p])))) s.controller[p] = s.owner[p];
  relocateStranded(w);
  checkAlive(w, sink);
  for (const t of parts) if (t !== s.player && s.nations[t]?.alive && !s.wars.some((x) => x.attackers.includes(t) || x.defenders.includes(t))) s.nations[t].policies.mobilization = 'peace';
  emit(w, { type: 'peace', nations: parts, text: `Pace: finisce la ${war.name.charAt(0).toLowerCase()}${war.name.slice(1)}${demands.length ? '' : ', senza condizioni'}.` }, sink);
}

/** Chi decide la pace: il motore, il giocatore nelle sue guerre, o il giocatore in tutte. */
export type PeaceMode = 'engine' | 'own' | 'all';

/** La proposta di pace del giocatore è accettata? (in modalità "own"/"all" il giocatore può imporla) */
export function peaceAnswer(w: World, war: War, proposer: Tag, demands: Demand[], mode: PeaceMode = 'engine', antiGore = true): { ok: boolean; reason: string } {
  const sc = warScore(w, war);
  const mySide = war.attackers.includes(proposer) ? 'att' : 'def';
  const t = totalCost(w, demands, antiGore);
  if (t.problems.length) return { ok: false, reason: t.problems[0] };
  if (mode !== 'engine') return { ok: true, reason: 'imposta dal giocatore' };
  if (!demands.length) {
    // pace bianca: il nemico accetta se non sta vincendo nettamente o è esausto
    const enemy = mySide === 'att' ? war.defenders[0] : war.attackers[0];
    if (sc.winner !== (mySide === 'att' ? 'def' : 'att') || sc.points < 15 || (w.state.nations[enemy]?.warExhaustion ?? 0) > 50) return { ok: true, reason: 'pace bianca accettata' };
    return { ok: false, reason: `il nemico sta vincendo (${sc.points} punti) e rifiuta la pace bianca` };
  }
  if (sc.winner !== mySide) return { ok: false, reason: 'non state vincendo: non potete dettare condizioni' };
  const budget = budgetOf(w, war, proposer);
  if (t.cost > budget) return { ok: false, reason: `le richieste valgono ${t.cost} punti, ve ne spettano ${budget}` };
  return { ok: true, reason: 'condizioni accettate' };
}

/** Rate settimanali delle indennità: positivo per chi incassa. */
export function reparationsOf(w: World, tag: Tag): number {
  let v = 0;
  for (const r of w.state.reparations ?? []) { if (r.receiver === tag) v += r.perWeek; if (r.payer === tag) v -= r.perWeek; }
  return Math.round(v * 100) / 100;
}
export function weeklyReparations(w: World) {
  const s = w.state;
  for (const r of s.reparations ?? []) r.weeksLeft--;
  s.reparations = (s.reparations ?? []).filter((r) => r.weeksLeft > 0 && s.nations[r.payer]?.alive && s.nations[r.receiver]?.alive);
  s.demilitarized = (s.demilitarized ?? []).filter((d) => d.until > s.day);
}

/** Le condizioni che il motore detta per conto di tutti i vincitori, in ordine di contributo. */
export function engineTerms(w: World, war: War): Demand[] {
  const sc = warScore(w, war);
  if (!sc.winner) return [];
  const winners = (sc.winner === 'att' ? war.attackers : war.defenders).filter((t) => w.state.nations[t]?.alive).sort((a, b) => (sc.share[b] ?? 0) - (sc.share[a] ?? 0));
  const out: Demand[] = [];
  for (const t of winners) out.push(...suggestDemands(w, war, t, budgetOf(w, war, t)).filter((d) => !out.some((o) => o.type === 'cede' && d.type === 'cede' && o.provinces.some((p) => d.provinces.includes(p)))));
  return out;
}
