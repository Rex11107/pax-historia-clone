import { techEffects } from './research';
import type { GameEvent, Tag, Unit } from './types';
import { cacheVersion, industryOf, level, logistics, provinceCapacity } from './construction';
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
  // rifornimento via mare: una grande marina rifornisce ogni costa propria (anche le colonie oltremare),
  // una marina media i porti, senza marina servono porti grandi (livello 2+)
  const naval = w.profiles[tag].naval ?? 0;
  const need = naval >= 30 ? 0 : naval >= 15 ? 1 : 2;
  // anche i porti occupati, con una marina almeno media: il Cile del 1880-83 riforniva per mare da Pisagua, Iquique e
  // Arica l'esercito che occupava Tarapacá e Lima; prima i porti presi al nemico non rifornivano nessuno
  for (let p = 0; p < n; p++) if (w.map.provinces[p].coast && s.controller[p] === tag && (s.owner[p] === tag || naval >= 15) && level(w, p, 'porto') >= need) seeds.push(p);
  if (!seeds.length) for (let p = 0; p < n; p++) if (s.controller[p] === tag && s.owner[p] === tag) { seeds.push(p); break; }
  const core = w.map.hops(seeds, friendly, 200);
  const lv = new Float32Array(n);
  const connected: number[] = [];
  const L = logistics(w, tag).factor;
  for (let p = 0; p < n; p++) if (core[p] >= 0) { lv[p] = Math.min(1, (1 - Math.min(0.25, core[p] * 0.01 / L)) * Math.min(1, L + 0.1)); connected.push(p); }
  // fuori dal territorio amico il rifornimento cala a ogni provincia di distanza
  const out = w.map.hops(connected, (p) => w.map.passable(p) && canEnter(s, tag, p), 8);
  const reach = (0.12 + 0.08 * (1 - industryOf(w, tag) / 100)) / L;
  for (let p = 0; p < n; p++) if (core[p] < 0 && out[p] > 0) lv[p] = Math.max(0, 1 - reach * out[p] - 0.1);
  return lv;
}

// in pace la mappa dei rifornimenti cambia solo con i confini e le opere: si ricalcola una volta a turno
const peaceCache = new WeakMap<object, { key: string; maps: Map<Tag, Float32Array> }>();

/** Perdite giornaliere per malattia di un'unità in campagna ai tropici (0 se non ci sono). */
export const TROPICAL_SICKNESS = 0.0015;
export function tropicalSickness(w: World, u: Unit): number {
  const s = w.state, pv = w.map.provinces[u.location];
  if (Math.abs(pv.lonlat[1]) > 20 || pv.terrain === 'mountain' || pv.terrain === 'desert' || s.owner[u.location] === u.nation) return 0;
  const home = w.map.provinces[s.nations[u.nation]?.capital ?? u.location];
  if (Math.abs(home.lonlat[1]) <= 23.5) return 0; // chi è nato ai tropici non si ammala più degli altri
  return TROPICAL_SICKNESS * techEffects(w, u.nation).attrition;
}

const warCache = new WeakMap<object, Map<Tag, { key: string; map: Float32Array }>>();

export function updateSupply(w: World, sink: GameEvent[]) {
  const s = w.state;
  const cache = new Map<Tag, Float32Array>();
  const key = `${s.turn}:${s.wars.length}:${cacheVersion()}`;
  let pc = peaceCache.get(s);
  if (!pc || pc.key !== key) { pc = { key, maps: new Map() }; peaceCache.set(s, pc); }
  const atPeace = (t: Tag) => !s.wars.some((x) => x.attackers.includes(t) || x.defenders.includes(t));
  // troppi uomini in una provincia: la capienza (ferrovie, porti, fortezze, città) non basta
  const crowd = new Map<string, number>();
  for (const u of s.units) crowd.set(`${u.nation}:${u.location}`, (crowd.get(`${u.nation}:${u.location}`) ?? 0) + u.strength);
  for (const u of s.units) {
    let m = cache.get(u.nation);
    if (!m) {
      if (atPeace(u.nation)) { m = pc.maps.get(u.nation); if (!m) { m = supplyMap(w, u.nation); pc.maps.set(u.nation, m); } }
      else {
        // in guerra la mappa cambia solo se cambia un controllore o un'opera (cacheVersion), la logistica o se un nemico entra o
        // esce da una provincia: prima si ricalcolava ogni giorno per ogni belligerante, anche per i trenta Stati
        // indiani al seguito del Regno Unito in una guerra in Africa (corte 02, capo 9). Stesso risultato
        const foes = enemiesOf(s, u.nation);
        const at: number[] = [];
        for (const x of s.units) if (foes.has(x.nation)) at.push(x.location);
        const wkey = `${key}:${logistics(w, u.nation).factor}:${industryOf(w, u.nation)}:${at.sort((a, b) => a - b).join(',')}`;
        const hit = warCache.get(s)?.get(u.nation);
        if (hit && hit.key === wkey) m = hit.map;
        else {
          m = supplyMap(w, u.nation);
          let wc = warCache.get(s); if (!wc) { wc = new Map(); warCache.set(s, wc); }
          wc.set(u.nation, { key: wkey, map: m });
        }
      }
      cache.set(u.nation, m);
    }
    const men = (crowd.get(`${u.nation}:${u.location}`) ?? 0) / 1000;
    const capK = provinceCapacity(w, u.location);
    const target = m[u.location] * (men > capK ? Math.max(0.5, capK / men) : 1);
    const before = u.supply;
    if (target > u.supply) u.supply = Math.min(target, u.supply + 0.25);
    else u.supply = Math.max(target, u.supply - (u.inBattle ? 0.06 : 0.04));
    if (before >= 0.25 && u.supply < 0.25) emit(w, { type: 'out_of_supply', nations: [u.nation], province: u.location, text: `${u.name} è senza rifornimenti a ${w.map.provinces[u.location].name}.` }, sink);
    // attrito
    if (u.supply < 0.25) {
      const loss = Math.round(u.strength * 0.012 * (1 - u.supply / 0.25 + 0.3) * techEffects(w, u.nation).attrition);
      u.strength -= loss;
      u.morale = clamp(u.morale - 0.01, 0, 1);
      s.nations[u.nation].turnLosses += loss;
      const war = s.wars.find((x) => x.attackers.includes(u.nation) || x.defenders.includes(u.nation));
      if (war) war.casualties[u.nation] = (war.casualties[u.nation] ?? 0) + loss;
    }
    // malattia nelle campagne tropicali (corte 01, capo 4): le truppe di una nazione temperata fuori dalle proprie
    // terre, tra i tropici e sotto i 1.500 metri, perdono lo 0,15% al giorno di febbri (Madagascar 1895: seimila morti
    // di malattia su quindicimila, venti caduti in combattimento). Chinino e medicina tropicale la riducono
    const sick = tropicalSickness(w, u);
    if (sick > 0) {
      const loss = Math.round(u.strength * sick);
      u.strength -= loss;
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
      const add = Math.min(u.maxStrength - u.strength, Math.round(u.maxStrength * 0.015 * logistics(w, u.nation).factor), nat.manpower);
      u.strength += add;
      nat.manpower -= add;
    }
  }
}
