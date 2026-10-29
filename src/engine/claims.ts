// Rivendicazioni: di nucleo (maggioranza del proprio popolo sotto un altro Stato), storiche e pretese
// dell'epoca, e quelle nate in partita (province perse in una pace: storiche per vent'anni, poi pretese).

import { CLAIMS_1881, type ClaimStrength } from '../scenario/claims1881';
import { ETHNICITIES, STATE_PEOPLES } from '../scenario/ethnic1881';
import { colonialClaims } from './colonial';
import { composition, foreignness } from './ethnic';
import type { ProvinceData, Tag } from './types';
import { dateOf, type World } from './world';

export type { ClaimStrength };
export interface Claim { nation: Tag; strength: ClaimStrength; reason: string }
export interface LostClaim { nation: Tag; province: number; since: number }

export const CLAIM_LABEL: Record<ClaimStrength, string> = { nucleo: 'di nucleo', storica: 'storica', pretesa: 'pretesa' };
const RANK: Record<ClaimStrength, number> = { nucleo: 3, storica: 2, pretesa: 1 };

function matches(m: { iso?: string[]; owner?: Tag[]; modern?: string[]; lang?: string[]; name?: string[] }, p: ProvinceData): boolean {
  if (m.owner && !m.owner.includes(p.owner)) return false;
  if (m.modern && !m.modern.includes(p.modern)) return false;
  if (m.lang && !m.lang.includes(p.lang ?? '')) return false;
  if (m.name && !m.name.includes(p.name)) return false;
  if (m.iso && !m.iso.some((x) => (x.endsWith('*') ? (p.iso ?? '').startsWith(x.slice(0, -1)) : p.iso === x))) return false;
  return true;
}

/** Distanza (in province, fino a 4) dal territorio di una nazione: il nucleo vale solo per terre vicine. */
const nearCache = new Map<string, Int16Array>();
function near(w: World, tag: Tag): Int16Array {
  const s = w.state;
  const key = `${tag}:${s.day}:${s.nextId}`;
  let h = nearCache.get(key);
  if (!h) {
    if (nearCache.size > 200) nearCache.clear();
    const own: number[] = [];
    for (let i = 0; i < w.map.size; i++) if (s.owner[i] === tag) own.push(i);
    h = w.map.hops(own, () => true, 4);
    nearCache.set(key, h);
  }
  return h;
}

const staticCache = new WeakMap<object, Claim[][]>();
/** Rivendicazioni storiche del 1881 per provincia (statiche). */
function historical(w: World): Claim[][] {
  let t = staticCache.get(w.map);
  if (t) return t;
  t = w.map.provinces.map((p) => p.impassable ? [] : CLAIMS_1881.filter(([, , m]) => matches(m, p)).map(([nation, strength, , reason]) => ({ nation, strength, reason })));
  staticCache.set(w.map, t);
  return t;
}

/** Tutte le rivendicazioni su una provincia (una per nazione, la più forte), esclusa quella del padrone. */
export function claimsOn(w: World, p: number): Claim[] {
  const s = w.state;
  const owner = s.owner[p];
  const out = new Map<Tag, Claim>();
  const add = (c: Claim) => {
    if (c.nation === owner || !s.nations[c.nation]?.alive) return;
    const cur = out.get(c.nation);
    if (!cur || RANK[c.strength] > RANK[cur.strength]) out.set(c.nation, c);
  };
  // nucleo: il popolo più numeroso (almeno 40%) è "proprio" di uno Stato e non del padrone attuale
  if (!w.map.provinces[p].impassable) {
    const top = composition(w, p).reduce((a, b) => (b.share > a.share ? b : a));
    // tutti gli Stati per cui quel popolo è "proprio" (Serbia e Montenegro per i serbi)
    if (top.share >= 40 && (!owner || foreignness(owner, top.eth) > 0))
      for (const [st, sp] of Object.entries(STATE_PEOPLES)) if (sp.own.includes(top.eth) && !w.profiles[st]?.micro && near(w, st)[p] >= 0) add({ nation: st, strength: 'nucleo', reason: `maggioranza ${ETHNICITIES[top.eth].label} (${top.share}%)` });
  }
  for (const c of historical(w)[p]) add(c);
  if (!w.map.provinces[p].impassable) for (const c of colonialClaims(w, p)) add({ nation: c.nation, strength: 'pretesa', reason: `interesse coloniale: ${c.name}` });
  const y = dateOf(s.day).getUTCFullYear();
  for (const l of s.lostClaims ?? []) if (l.province === p) {
    const age = y - dateOf(l.since).getUTCFullYear();
    add({ nation: l.nation, strength: age < 20 ? 'storica' : 'pretesa', reason: `persa nel ${dateOf(l.since).getUTCFullYear()}` });
  }
  return [...out.values()].sort((a, b) => RANK[b.strength] - RANK[a.strength]);
}

export const claimOf = (w: World, nation: Tag, p: number) => claimsOn(w, p).find((c) => c.nation === nation) ?? null;

/** Dopo una cessione il vecchio padrone conserva una rivendicazione (revanscismo). */
export function recordLoss(w: World, loser: Tag, provinces: number[]) {
  const s = w.state;
  s.lostClaims ??= [];
  for (const p of provinces) if (!s.lostClaims.some((l) => l.nation === loser && l.province === p)) s.lostClaims.push({ nation: loser, province: p, since: s.day });
  // chi riconquista toglie la propria rivendicazione
  s.lostClaims = s.lostClaims.filter((l) => s.owner[l.province] !== l.nation);
}

export function claimsText(w: World, p: number): string {
  return claimsOn(w, p).map((c) => `${w.profiles[c.nation]?.short[1] ?? c.nation} (${CLAIM_LABEL[c.strength]}: ${c.reason})`).join('; ');
}
