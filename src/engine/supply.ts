import type { GameEvent, Tag } from './types';
import { allied, canEnter, clamp, emit, enemiesOf, presence, type World } from './world';

/** Livello di rifornimento (0-1) per ogni provincia, dal punto di vista di una nazione. */
export function supplyMap(w: World, tag: Tag, pres = presence(w)): Float32Array {
  const s = w.state;
  const n = w.map.size;
  const enemies = enemiesOf(s, tag);
  const alliedCache = new Map<Tag, boolean>();
  const isAllied = (t: Tag) => { let v = alliedCache.get(t); if (v === undefined) { v = allied(s, tag, t); alliedCache.set(t, v); } return v; };
  const contested = (p: number) => { for (const t of pres[p]) if (enemies.has(t)) return true; return false; };
  const friendly = (p: number) => w.map.passable(p) && isAllied(s.controller[p]) && !contested(p);
  const seeds: number[] = [];
  const cap = s.nations[tag].capital;
  if (s.controller[cap] === tag) seeds.push(cap);
  // rifornimento via mare: porti propri se la marina è adeguata
  if ((w.profiles[tag].naval ?? 0) >= 30) {
    for (let p = 0; p < n; p++) if (w.map.provinces[p].coast && s.controller[p] === tag && s.owner[p] === tag) seeds.push(p);
  }
  if (!seeds.length) for (let p = 0; p < n; p++) if (s.controller[p] === tag && s.owner[p] === tag) { seeds.push(p); break; }
  const core = w.map.hops(seeds, friendly, 200);
  const level = new Float32Array(n);
  const connected: number[] = [];
  for (let p = 0; p < n; p++) if (core[p] >= 0) { level[p] = 1 - Math.min(0.25, core[p] * 0.01); connected.push(p); }
  // fuori dal territorio amico il rifornimento cala a ogni provincia di distanza
  const out = w.map.hops(connected, (p) => w.map.passable(p) && canEnter(s, tag, p), 8);
  const reach = 0.12 + 0.08 * (1 - w.profiles[tag].industry / 100);
  for (let p = 0; p < n; p++) if (core[p] < 0 && out[p] > 0) level[p] = Math.max(0, 1 - reach * out[p] - 0.1);
  return level;
}

export function updateSupply(w: World, sink: GameEvent[]) {
  const s = w.state;
  const cache = new Map<Tag, Float32Array>();
  for (const u of s.units) {
    let m = cache.get(u.nation);
    if (!m) { m = supplyMap(w, u.nation); cache.set(u.nation, m); }
    const target = m[u.location];
    const before = u.supply;
    if (target > u.supply) u.supply = Math.min(target, u.supply + 0.25);
    else u.supply = Math.max(target, u.supply - (u.inBattle ? 0.06 : 0.04));
    if (before >= 0.25 && u.supply < 0.25) emit(w, { type: 'out_of_supply', nations: [u.nation], province: u.location, text: `${u.name} è senza rifornimenti a ${w.map.provinces[u.location].name}.` }, sink);
    // attrito
    if (u.supply < 0.25) {
      const loss = Math.round(u.strength * 0.012 * (1 - u.supply / 0.25 + 0.3));
      u.strength -= loss;
      u.morale = clamp(u.morale - 0.01, 0, 1);
      s.nations[u.nation].turnLosses += loss;
      const war = s.wars.find((x) => x.attackers.includes(u.nation) || x.defenders.includes(u.nation));
      if (war) war.casualties[u.nation] = (war.casualties[u.nation] ?? 0) + loss;
    }
    if (!u.inBattle && u.supply >= 0.5) {
      const cap = 0.65 + 0.25 * (w.profiles[u.nation].militaryQuality / 100);
      if (u.morale < cap) u.morale = Math.min(cap, u.morale + 0.02);
    }
    // rinforzi dalla riserva nazionale
    if (!u.inBattle && u.supply >= 0.6 && u.strength < u.maxStrength) {
      const nat = s.nations[u.nation];
      const add = Math.min(u.maxStrength - u.strength, Math.round(u.maxStrength * 0.015), nat.manpower);
      u.strength += add;
      nat.manpower -= add;
    }
  }
}
