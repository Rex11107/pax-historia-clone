import { GameMap } from './map';
import type { GameEvent, GameState, NationProfile, Tag, Treaty, Unit, War } from './types';

/** Proprietario/controllore delle terre di nessuno (deserto, oasi indipendenti). */
export const NOBODY: Tag = '';

/** Mappa statica + profili statici + stato mutabile. */
export interface World {
  map: GameMap;
  profiles: Record<Tag, NationProfile>;
  state: GameState;
  /** indice delle presenze per provincia, ricostruito una volta al giorno (solo per i costi di percorso) */
  _presence?: { day: number; idx: Set<Tag>[] };
}

export function presence(w: World): Set<Tag>[] {
  if (w._presence && w._presence.day === w.state.day) return w._presence.idx;
  const idx: Set<Tag>[] = Array.from({ length: w.map.size }, () => new Set());
  for (const u of w.state.units) idx[u.location].add(u.nation);
  w._presence = { day: w.state.day, idx };
  return idx;
}

export function invalidatePresence(w: World) { w._presence = undefined; }

/** Versione veloce (indice giornaliero) di "ci sono nemici in questa provincia?". */
export function hostilePresent(w: World, nation: Tag, province: number): boolean {
  for (const t of presence(w)[province]) if (t !== nation && atWar(w.state, nation, t)) return true;
  return false;
}

const START = Date.UTC(1881, 0, 1);
const MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

export function dateOf(day: number): Date { return new Date(START + day * 86400000); }
export function formatDate(day: number): string {
  const d = dateOf(day);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** RNG deterministico: stessa chiave, stesso numero (replay e test riproducibili). */
export function rand(...key: (string | number)[]): number {
  let h = 1779033703 ^ key.join(':').length;
  const s = key.join(':');
  for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
  let t = (h ^= h >>> 16) >>> 0;
  t += 0x6d2b79f5; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function nationName(w: World, tag: Tag) { return tag === NOBODY ? 'Terra di nessuno' : w.profiles[tag]?.name ?? tag; }

// Nomi brevi con articolo e preposizioni articolate: "l'Italia", "della Francia", "al Regno Unito".
const PREP: Record<string, Record<string, string>> = {
  di: { "l'": "dell'", 'la ': 'della ', 'il ': 'del ', 'i ': 'dei ', 'le ': 'delle ', '': 'di ' },
  a: { "l'": "all'", 'la ': 'alla ', 'il ': 'al ', 'i ': 'ai ', 'le ': 'alle ', '': 'a ' },
  da: { "l'": "dall'", 'la ': 'dalla ', 'il ': 'dal ', 'i ': 'dai ', 'le ': 'dalle ', '': 'da ' },
};
const sh = (w: World, tag: Tag): [string, string] => w.profiles[tag]?.short ?? ['', tag];
export const the = (w: World, tag: Tag) => sh(w, tag).join('');
export const The = (w: World, tag: Tag) => { const t = the(w, tag); return t.charAt(0).toUpperCase() + t.slice(1); };
export const di = (w: World, tag: Tag) => { const [a, n] = sh(w, tag); return PREP.di[a] + n; };
export const al = (w: World, tag: Tag) => { const [a, n] = sh(w, tag); return PREP.a[a] + n; };
export const dal = (w: World, tag: Tag) => { const [a, n] = sh(w, tag); return PREP.da[a] + n; };
export const shortName = (w: World, tag: Tag) => sh(w, tag)[1];

export function warsOf(s: GameState, tag: Tag): War[] {
  return s.wars.filter((x) => x.attackers.includes(tag) || x.defenders.includes(tag));
}

export function atWar(s: GameState, a: Tag, b: Tag): boolean {
  if (a === b) return false;
  return s.wars.some((x) => (x.attackers.includes(a) && x.defenders.includes(b)) || (x.attackers.includes(b) && x.defenders.includes(a)));
}

export function enemiesOf(s: GameState, a: Tag): Set<Tag> {
  const out = new Set<Tag>();
  for (const x of s.wars) {
    if (x.attackers.includes(a)) x.defenders.forEach((t) => out.add(t));
    if (x.defenders.includes(a)) x.attackers.forEach((t) => out.add(t));
  }
  return out;
}

export function treatyBetween(s: GameState, a: Tag, b: Tag, type?: Treaty['type']): Treaty | undefined {
  return s.treaties.find((t) => !t.violated && (type ? t.type === type : true) && ((t.a === a && t.b === b) || (t.a === b && t.b === a)));
}

export function allied(s: GameState, a: Tag, b: Tag) { return a === b || !!treatyBetween(s, a, b, 'alliance'); }

/** Una nazione può entrare in una provincia? (propria, alleata in guerra comune, nemica, accesso militare) */
export function canEnter(s: GameState, nation: Tag, province: number): boolean {
  const ctrl = s.controller[province];
  if (ctrl === nation) return true;
  if (ctrl === NOBODY) return true; // terra di nessuno: chi arriva la occupa
  if (atWar(s, nation, ctrl)) return true;
  if (allied(s, nation, ctrl)) return true;
  if (treatyBetween(s, ctrl, nation, 'military_access')) return true;
  // province nemiche occupate da un alleato
  return false;
}

export function unitsAt(s: GameState, province: number): Unit[] {
  return s.units.filter((u) => u.location === province && !u.move?.path.length);
}

export function hostileUnitsAt(s: GameState, nation: Tag, province: number): Unit[] {
  return s.units.filter((u) => u.location === province && atWar(s, nation, u.nation));
}

export function emit(w: World, e: Omit<GameEvent, 'day'>, sink?: GameEvent[]) {
  const ev = { day: w.state.day, ...e } as GameEvent;
  w.state.events.push(ev);
  sink?.push(ev);
  return ev;
}

export function newId(s: GameState, prefix: string) { return `${prefix}${++s.nextId}`; }

export function opinion(s: GameState, from: Tag, to: Tag): number {
  return s.nations[from]?.opinion[to] ?? 0;
}

export function changeOpinion(s: GameState, from: Tag, to: Tag, delta: number) {
  const n = s.nations[from];
  if (!n || from === to) return;
  n.opinion[to] = Math.max(-100, Math.min(100, Math.round((n.opinion[to] ?? 0) + delta)));
}

export function provincesOf(w: World, tag: Tag, by: 'owner' | 'controller' = 'owner'): number[] {
  const arr = by === 'owner' ? w.state.owner : w.state.controller;
  const out: number[] = [];
  for (let i = 0; i < arr.length; i++) if (arr[i] === tag) out.push(i);
  return out;
}

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
