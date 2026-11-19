// Conferenza di pace: punteggio di guerra, richieste con un costo, regole contro il border gore,
// scelte del motore (per le nazioni non giocanti e come suggerimento al giocatore), applicazione.

import { transfer } from './ledger';
import { claimOf, recordLoss } from './claims';
import { buildings, touchBuildings, type BuildingId } from './construction';
import { addTreaty, checkAlive, settleOccupations } from './diplomacy';
import { composition, ETHNICITIES, STATE_PEOPLES } from './ethnic';
import { RESOURCES, type ResourceId } from './resources';
import { stanceRefusal, subjectOf, setSubject, type SubjectLevel } from './vassals';
import type { GameEvent, NationState, Tag, War } from './types';
import { atWar, changeOpinion, clamp, di, emit, nationName, type World } from './world';
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
  // uomini in armi per nazione, contati una volta
  const menBy = new Map<Tag, number>();
  for (const u of s.units) menBy.set(u.nation, (menBy.get(u.nation) ?? 0) + u.strength);
  const menOf = (l: Tag[]) => l.reduce((a, t) => a + (menBy.get(t) ?? 0), 0);
  const mobilized = menOf(war.attackers) + menOf(war.defenders);
  // province già occupate quando la guerra è cominciata: le ha prese un'altra guerra (corte 07, giurato 3.3)
  const pre = new Set(war.pre ?? []);
  const side = (tags: Tag[], enemy: Tag[]) => {
    let occ = 0, tot = 0;
    const byNation: Record<Tag, number> = {};
    for (let p = 0; p < w.map.size; p++) {
      if (!enemy.includes(s.owner[p])) continue;
      const v = provinceValue(w, p);
      tot += v;
      if (tags.includes(s.controller[p]) && !pre.has(p)) { occ += v; byNation[s.controller[p]] = (byNation[s.controller[p]] ?? 0) + v; }
    }
    const lossesOwn = tags.reduce((a, t) => a + (war.casualties[t] ?? 0), 0);
    const lossesEnemy = enemy.reduce((a, t) => a + (war.casualties[t] ?? 0), 0);
    // le perdite si pesano sulla forza in campo (corte 07, capo 4): prima 1.000 morti contro 0 valevano 25 punti
    // come 300.000 contro 0. Una battaglia è decisiva quando le perdite arrivano a metà degli eserciti dei due lati
    const battle = 25 * (lossesEnemy - lossesOwn) / Math.max(lossesEnemy + lossesOwn + 1, 0.5 * mobilized);
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
    const men = (t: Tag) => (menBy.get(t) ?? 0) / 1000;
    const raw = tags.map((t) => (sc.byNation[t] ?? 0) + 0.3 * men(t) + 0.5 * (war.casualties[t] ?? 0) / 1000);
    const tot = raw.reduce((a, b) => a + b, 0) || 1;
    tags.forEach((t, i) => (share[t] = raw[i] / tot));
  }
  return { att, def, winner, points, share };
}

// --- richieste ---

export type Demand =
  | { type: 'cede'; from: Tag; to: Tag; provinces: number[] }
  // `by`: chi impone la liberazione (il vincitore); `to`: chi riceve le terre, fissato quando si chiede (corte 07,
  // capo 6: prima `to` era il vincitore e il destinatario si ricalcolava all'applicazione, senza le province)
  | { type: 'liberate'; from: Tag; eth: string; provinces: number[]; by: Tag; to: Tag }
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

/**
 * La provincia è occupata dal vincitore, o da un suo alleato in una guerra contro il padrone della provincia?
 * Prima bastava un alleato in una guerra qualsiasi, anche contro un altro nemico (corte 07, giurato 3.3).
 */
function occupiedBy(w: World, winner: Tag, p: number): boolean {
  const s = w.state;
  const c = s.controller[p], o = s.owner[p];
  if (!winner) return false;
  if (c === winner) return true;
  return s.wars.some((x) => (x.attackers.includes(winner) && x.attackers.includes(c) && x.defenders.includes(o)) || (x.defenders.includes(winner) && x.defenders.includes(c) && x.attackers.includes(o)));
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

export interface LiberationCheck { provinces: number[]; refusal: string | null; warnings: string[] }

/**
 * Le terre di una liberazione dentro le regole sui confini (corte 07, giurato 3.1): si tiene il pezzo che tocca lo
 * Stato che le riceve (o, per una nazione che nasce, il pezzo più grande) e il perdente non resta spezzato.
 * Prima i greci ottomani nascevano in nove pezzi e la Polonia staccava la Prussia orientale da Berlino.
 */
export function liberationCheck(w: World, from: Tag, to: Tag, provinces: number[], antiGore = true): LiberationCheck {
  const s = w.state;
  const warnings: string[] = [];
  const cap = s.nations[from]?.capital;
  const set = new Set(provinces.filter((p) => s.owner[p] === from && !w.map.provinces[p].impassable && p !== cap));
  if (!set.size) return { provinces: [], refusal: 'nessuna provincia con quella maggioranza', warnings };
  // pezzi connessi, in ordine di indice (deterministico)
  const comps: number[][] = [];
  const seen = new Set<number>();
  for (const start of [...set].sort((a, b) => a - b)) {
    if (seen.has(start)) continue;
    const c = [start]; seen.add(start);
    for (let i = 0; i < c.length; i++) for (const e of w.map.adj[c[i]]) if (set.has(e.to) && !seen.has(e.to)) { seen.add(e.to); c.push(e.to); }
    comps.push(c);
  }
  const value = (c: number[]) => c.reduce((a, p) => a + provinceValue(w, p), 0);
  let keep: number[][];
  if (s.nations[to]?.alive) {
    keep = comps.filter((c) => c.some((p) => w.map.adj[p].some((e) => s.owner[e.to] === to)));
    if (!keep.length) return { provinces: [], refusal: `${nationName(w, to)} non confina con queste terre`, warnings };
  } else keep = [comps.reduce((a, b) => (value(b) > value(a) ? b : a))];
  const kept = new Set(keep.flat());
  const dropped = set.size - kept.size;
  if (dropped) warnings.push(`escluse ${dropped === 1 ? 'una provincia staccata' : `${dropped} province staccate`} dal resto`);
  if (antiGore) {
    const before = connectedToCapital(w, from, new Set());
    const after = connectedToCapital(w, from, kept);
    const orphans = [...before].filter((p) => !after.has(p) && !kept.has(p));
    if (orphans.length) {
      const ov = orphans.reduce((a, p) => a + provinceValue(w, p), 0);
      if (ov <= 0.06 * nationValue(w, from) || orphans.length <= 3) { for (const p of orphans) kept.add(p); warnings.push(`incluse anche ${orphans.map((p) => w.map.provinces[p].name).join(', ')}, che resterebbero isolate`); }
      else return { provinces: [], refusal: `lascerebbe ${nationName(w, from)} spezzato in due: ${orphans.slice(0, 4).map((p) => w.map.provinces[p].name).join(', ')}${orphans.length > 4 ? '…' : ''} resterebbero staccate dalla capitale`, warnings };
    }
  }
  return { provinces: [...kept].sort((a, b) => a - b), refusal: null, warnings };
}

/** Richiesta di liberazione già dentro le regole sui confini, o null se non si può chiedere. */
export function liberationDemand(w: World, from: Tag, eth: string, by: Tag, antiGore = true): Extract<Demand, { type: 'liberate' }> | null {
  const ids = provincesOfPeople(w, from, eth);
  const to = liberationTarget(w, eth, from, ids);
  if (!to || to === from || to === by || STATE_PEOPLES[from]?.own.includes(eth)) return null;
  const chk = liberationCheck(w, from, to, ids, antiGore);
  return chk.refusal ? null : { type: 'liberate', from, eth, provinces: chk.provinces, by, to };
}

const income = (w: World, t: Tag) => Math.max(1, w.state.nations[t]?.lastBudget?.income ?? 10);

/** Costo in punti e controlli di una richiesta. */
export function demandCost(w: World, d: Demand, antiGore = true): { cost: number; refusal: string | null; warnings: string[] } {
  const s = w.state;
  const fromSize = nationValue(w, d.from);
  switch (d.type) {
    case 'cede': { const c = checkCession(w, d.from, d.to, d.provinces, antiGore); return { cost: c.cost, refusal: c.refusal, warnings: c.warnings }; }
    case 'liberate': {
      // un popolo dello Stato stesso non si «libera» (corte 07, giurato 2.1: i tedeschi della Germania all'Austria)
      if (STATE_PEOPLES[d.from]?.own.includes(d.eth)) return { cost: 0, refusal: `i ${ETHNICITIES[d.eth]?.label ?? d.eth} sono un popolo ${di(w, d.from)}: le loro terre si chiedono solo con una cessione`, warnings: [] };
      if (d.provinces.includes(s.nations[d.from].capital)) return { cost: 0, refusal: 'la capitale non si libera', warnings: [] };
      const target = liberationTarget(w, d.eth, d.from, d.provinces);
      if (!target) return { cost: 0, refusal: 'nessuno Stato confinante e nessuna nazione può nascere per questo popolo', warnings: [] };
      if (d.to !== target) return { cost: 0, refusal: `queste terre andrebbero a ${nationName(w, target)}, non a ${nationName(w, d.to)}`, warnings: [] };
      // terre date a sé stessi sono una cessione, e a metà prezzo sarebbero la mossa sempre migliore
      if (d.to === d.by) return { cost: 0, refusal: 'terre per noi stessi: serve una cessione, non una liberazione', warnings: [] };
      const chk = liberationCheck(w, d.from, d.to, d.provinces, antiGore);
      if (chk.refusal) return { cost: 0, refusal: chk.refusal, warnings: chk.warnings };
      if (chk.provinces.length !== d.provinces.length || chk.provinces.some((p) => !d.provinces.includes(p))) return { cost: 0, refusal: 'le province non rispettano le regole sui confini: va richiesta di nuovo', warnings: chk.warnings };
      const cost = d.provinces.reduce((a, p) => a + provinceValue(w, p) * (occupiedBy(w, d.by, p) ? 1 : 2), 0) / fromSize * 100 * 0.5;
      return { cost: Math.round(cost * 10) / 10, refusal: null, warnings: chk.warnings };
    }
    case 'vassal': {
      if (w.profiles[d.from]?.major) return { cost: 0, refusal: 'una grande potenza non diventa vassalla', warnings: [] };
      const stance = stanceRefusal(w, d.to, d.from);
      if (stance) return { cost: 0, refusal: `${nationName(w, d.from)} ${stance}`, warnings: [] };
      const border = w.map.provinces.some((p) => s.owner[p.id] === d.from && w.map.adj[p.id].some((e) => s.owner[e.to] === d.to));
      const colonial = seaPower(w, d.to) && (w.profiles[d.to]?.naval ?? 0) >= 40 && w.map.provinces.some((p) => s.owner[p.id] === d.from && p.coast);
      if (!border && !colonial) return { cost: 0, refusal: 'troppo lontano: serve un confine comune o una marina coloniale e una costa', warnings: [] };
      // solo fra disuguali (corte 07, capo 5): prima la Spagna poteva fare del Portogallo un vassallo e la Serbia
      // della Bulgaria, allo stesso prezzo di Tunisi. Il perdente deve avere meno di un quarto degli abitanti e meno
      // soldati del vincitore; più gli si avvicina negli abitanti più costa (fino a una volta e mezza)
      const popOf = (t: Tag) => s.owner.reduce((a, o, p) => a + (o === t ? w.map.provinces[p].pop : 0), 0);
      const menOf = (t: Tag) => s.units.reduce((a, u) => a + (u.nation === t ? u.strength : 0), 0);
      const ratio = popOf(d.from) / Math.max(1, popOf(d.to));
      if (ratio >= 0.25) return { cost: 0, refusal: `${nationName(w, d.from)} è troppo grande per diventare un soggetto: ha ${Math.round(ratio * 100)}% dei nostri abitanti`, warnings: [] };
      if (menOf(d.from) >= Math.max(1, menOf(d.to))) return { cost: 0, refusal: `${nationName(w, d.from)} ha ancora un esercito troppo forte per diventare un soggetto`, warnings: [] };
      const base = { tributario: 30, vassallo: 45, protettorato: 60 }[d.level];
      return { cost: Math.round(base * (1 + 2 * ratio) * 10) / 10, refusal: null, warnings: [] };
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
      const ok = [...peoples.keys()].sort().map((eth) => liberationDemand(w, from, eth, winner)).filter((d): d is Extract<Demand, { type: 'liberate' }> => {
        if (!d) return false;
        const ids = d.provinces;
        const occ = ids.reduce((a, p) => a + (occupiedBy(w, winner, p) ? provinceValue(w, p) : 0), 0) / Math.max(1, ids.reduce((a, p) => a + provinceValue(w, p), 0));
        const friendly = !s.nations[d.to]?.alive || (s.nations[d.to].opinion[winner] ?? 0) >= 0;
        return friendly && (occ >= 0.5 || down);
      }).sort((a, b) => b.provinces.length - a.provinces.length || (a.eth < b.eth ? -1 : 1));
      if (ok[0]) take(ok[0]);
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

/** Nascita di uno Stato liberato: amico di chi l'ha liberato (stima 60), con le casse e la leva dei suoi abitanti. */
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

/**
 * Guarnigione dello Stato appena nato (corte 07, capo 7): un corpo nella capitale, due uomini ogni mille abitanti
 * (fra 2.000 e un corpo d'armata pieno). Prima nasceva senza un soldato, preda del primo vicino.
 */
function garrison(w: World, tag: Tag) {
  const s = w.state;
  const n = s.nations[tag];
  const pop = s.owner.reduce((a, o, p) => a + (o === tag ? w.map.provinces[p].pop : 0), 0);
  const men = Math.round(clamp(pop * 0.002, 2000, 20000));
  s.units.push({
    id: `${tag}-g${++s.nextId}`, nation: tag, type: 'infantry', name: `Guardia nazionale ${w.profiles[tag]?.adjective ?? ''}`.trim(),
    strength: men, maxStrength: 20000, morale: 0.6, supply: 1, experience: 0, entrench: 0,
    location: n.capital, move: null, orders: [], inBattle: false, recovering: 0,
  });
}

export function applyDemand(w: World, d: Demand, sink: GameEvent[]) {
  const s = w.state;
  switch (d.type) {
    case 'cede': {
      // i resti piccoli che resterebbero staccati dalla capitale passano col resto: il costo li aveva già contati
      // (a metà prezzo). Prima il controllo senza `antiGore` non li calcolava e restavano exclavi del perdente
      const chk = checkCession(w, d.from, d.to, d.provinces, true);
      const ids = [...new Set([...d.provinces, ...chk.added])].filter((p) => s.owner[p] === d.from);
      for (const p of ids) { s.owner[p] = d.to; s.controller[p] = d.to; }
      recordLoss(w, d.from, ids);
      emit(w, { type: 'cession', nations: [d.from, d.to], text: `${nationName(w, d.from)} cede ${ids.length === 1 ? w.map.provinces[ids[0]].name : `${ids.length} province (${ids.slice(0, 3).map((p) => w.map.provinces[p].name).join(', ')}${ids.length > 3 ? '…' : ''})`} a ${nationName(w, d.to)}.` }, sink);
      break;
    }
    case 'liberate': {
      // il destinatario è quello fissato nella richiesta, controllato da demandCost con le stesse province
      const to = d.to;
      const ids = d.provinces.filter((p) => s.owner[p] === d.from);
      if (!ids.length) break;
      const born = !s.nations[to]?.alive;
      if (born) birth(w, to, ids, d.by);
      for (const p of ids) { s.owner[p] = to; s.controller[p] = to; }
      if (born) garrison(w, to);
      recordLoss(w, d.from, ids);
      changeOpinion(s, to, d.from, -40);
      emit(w, { type: 'liberation', nations: [d.from, to, d.by], text: `${nationName(w, to)} ${born ? 'nasce con' : 'ottiene'} le terre dei ${ETHNICITIES[d.eth]?.label ?? d.eth} di ${nationName(w, d.from)} (${ids.length} province).` }, sink);
      break;
    }
    case 'vassal': {
      setSubject(w, d.from, d.to, d.level, 60);
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
      transfer(w, d.from, d.to, 'indennita', now);
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
  settleOccupations(w);
  checkAlive(w, sink);
  for (const t of parts) if (t !== s.player && s.nations[t]?.alive && !s.wars.some((x) => x.attackers.includes(t) || x.defenders.includes(t))) s.nations[t].policies.mobilization = 'peace';
  emit(w, { type: 'peace', nations: parts, text: `Pace: finisce la ${war.name.charAt(0).toLowerCase()}${war.name.slice(1)}${demands.length ? '' : ', senza condizioni'}.` }, sink);
}

/**
 * Pace separata: alcune nazioni escono dalla guerra con le condizioni chieste a loro, gli altri continuano a
 * combattere. Le occupazioni fra chi esce e il nemico finiscono, salvo un'altra guerra fra loro.
 */
export function separatePeace(w: World, war: War, leaving: Tag[], demands: Demand[], sink: GameEvent[] = []) {
  const s = w.state;
  for (const d of demands) applyDemand(w, d, sink);
  const enemies = war.attackers.some((t) => leaving.includes(t)) ? war.defenders : war.attackers;
  war.attackers = war.attackers.filter((t) => !leaving.includes(t));
  war.defenders = war.defenders.filter((t) => !leaving.includes(t));
  for (let p = 0; p < s.owner.length; p++) {
    const o = s.owner[p], c = s.controller[p];
    if (o !== c && ((leaving.includes(o) && enemies.includes(c)) || (enemies.includes(o) && leaving.includes(c))) && !atWar(s, o, c)) s.controller[p] = o;
  }
  settleOccupations(w);
  checkAlive(w, sink);
  for (const t of leaving) if (t !== s.player && s.nations[t]?.alive && !s.wars.some((x) => x.attackers.includes(t) || x.defenders.includes(t))) s.nations[t].policies.mobilization = 'peace';
  emit(w, { type: 'peace', nations: [...leaving, ...enemies], text: `Pace separata: ${leaving.map((t) => nationName(w, t)).join(', ')} esce dalla ${war.name.charAt(0).toLowerCase()}${war.name.slice(1)}${demands.length ? '' : ', senza condizioni'}.` }, sink);
}

/**
 * Il giocatore che perde accetta (o subisce) le condizioni del vincitore. Se guida il suo lato finisce la guerra
 * intera; se è un alleato minore esce con una pace separata e la guerra fra gli altri prosegue (corte 07, capo 2).
 * I suoi vassalli che l'hanno seguito escono con lui.
 */
export function playerPeace(w: World, war: War, sink: GameEvent[] = []) {
  const s = w.state, me = s.player;
  const mySide = war.attackers.includes(me) ? war.attackers : war.defenders;
  const terms = engineTerms(w, war);
  if (mySide[0] === me) { concludePeace(w, war, terms, sink); return; }
  const leaving = [me, ...mySide.filter((t) => t !== me && subjectOf(w, t)?.overlord === me)];
  separatePeace(w, war, leaving, terms.filter((d) => leaving.includes(d.from)), sink);
}

/** Chi decide la pace: il motore, il giocatore nelle sue guerre, o il giocatore in tutte. */
export type PeaceMode = 'engine' | 'own' | 'all';

/**
 * Una pace bianca sta bene a chi sta vincendo? Sì se non vince nettamente (meno di 15 punti) o se è esausto.
 * Vale per ogni canale: conferenza, dialogo con le nazioni, Game Master (corte 07, capo 1).
 */
export function whitePeaceOk(w: World, war: War): { ok: boolean; reason: string } {
  const sc = warScore(w, war);
  if (!sc.winner || sc.points < 15) return { ok: true, reason: 'pace bianca accettata' };
  const leader = sc.winner === 'att' ? war.attackers[0] : war.defenders[0];
  if ((w.state.nations[leader]?.warExhaustion ?? 0) > 50) return { ok: true, reason: 'pace bianca accettata: il vincitore è esausto' };
  return { ok: false, reason: `${nationName(w, leader)} sta vincendo (${sc.points} punti) e rifiuta la pace bianca` };
}

/**
 * La proposta di pace è accettata? La modalità toglie solo il tetto dei punti (in "own"/"all" il giocatore impone
 * condizioni oltre la sua quota), mai il controllo di chi vince (corte 07, capo 10: prima in "own" anche un
 * perdente poteva dettare la pace, lo impediva solo l'interfaccia).
 */
export function peaceAnswer(w: World, war: War, proposer: Tag, demands: Demand[], mode: PeaceMode = 'engine', antiGore = true): { ok: boolean; reason: string } {
  const sc = warScore(w, war);
  const mySide = war.attackers.includes(proposer) ? 'att' : war.defenders.includes(proposer) ? 'def' : null;
  if (!mySide) return { ok: false, reason: `${nationName(w, proposer)} non combatte in questa guerra` };
  const t = totalCost(w, demands, antiGore);
  if (t.problems.length) return { ok: false, reason: t.problems[0] };
  if (!demands.length) {
    // pace bianca: chi la chiede sta vincendo, oppure il nemico non vince nettamente o è esausto
    if (sc.winner === mySide) return { ok: true, reason: 'pace bianca accettata' };
    return whitePeaceOk(w, war);
  }
  if (sc.winner !== mySide) return { ok: false, reason: 'non state vincendo: non potete dettare condizioni' };
  if (demands.some((d) => !(mySide === 'att' ? war.defenders : war.attackers).includes(d.from))) return { ok: false, reason: 'si chiede solo a chi è dall\'altra parte' };
  if (mode !== 'engine') return { ok: true, reason: 'imposta dal giocatore' };
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
