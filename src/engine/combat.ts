import { geoKm } from './map';
import { research, techEffects } from './research';
import { level, provinceCapacity } from './construction';
import { govEffects } from './politics';
import { TERRAIN_DEFENSE } from './map';
import { UNIT_STATS } from './orders';
import type { GameEvent, Tag, Unit } from './types';
import { allied, atWar, clamp, di, emit, rand, the, The, treatyBetween, type World } from './world';

// Costanti di bilanciamento: un corpo da 20.000 uomini contro uno uguale in pianura
// perde circa l'1% al giorno; trincee e colline possono quasi raddoppiare la difesa.
export const LOSS_FACTOR = 11;
export const RETREAT_MORALE = 0.25;
export const RIVER_PENALTY = 0.75;
export const RETREAT_STRENGTH = 0.3;

function power(w: World, u: Unit, defending: boolean, sideHasInfantry: boolean, enemyArtillery = false, enemyBreak = 0, artEff = 1): number {
  const pr = w.profiles[u.nation];
  const st = UNIT_STATS[u.type];
  const terrain = w.map.provinces[u.location].terrain;
  const base = defending ? st.defense : st.attack;
  // il vantaggio dell'artiglieria vale fino a un cannoniere ogni due fanti (corte 01, capo 12): oltre, i pezzi in più
  // non hanno bersagli né protezione e valgono come fanteria
  let p = (u.strength / 1000) * (u.type === 'artillery' ? 1 + (base - 1) * artEff : base);
  p *= 0.5 + 0.5 * u.morale;
  p *= 0.4 + 0.6 * u.supply;
  p *= (0.75 + 0.5 * (pr.militaryQuality / 100)) * govEffects(w, u.nation).quality;
  p *= 1 + 0.3 * u.experience;
  if (pr.doctrine === 'offensive' && !defending) p *= 1.1;
  if (pr.doctrine === 'defensive' && defending) p *= 1.1;
  if (u.type === 'cavalry' && (terrain === 'mountain' || terrain === 'forest' || terrain === 'marsh')) p *= 0.6;
  if (u.type === 'artillery' && !sideHasInfantry) p *= 0.6;
  if (defending) p *= TERRAIN_DEFENSE[terrain] * (1 + 0.5 * u.entrench);
  // fortezza: vale per chi tiene la provincia; l'artiglieria nemica ne dimezza l'effetto
  if (defending && allied(w.state, u.nation, w.state.controller[u.location])) { const f = level(w, u.location, 'fortezza'); if (f) p *= 1 + 0.3 * f * (enemyArtillery ? 0.5 : 1) * (1 - (techEffects(w, u.nation).fortArmor ? 0 : enemyBreak)); }
  // attaccare dopo aver attraversato un fiume costa caro
  if (!defending && u.from !== undefined && w.map.river(u.from, u.location)) p *= RIVER_PENALTY;
  return p;
}

/** Stima della forza per il piano dell'IA, con la stessa formula del combattimento (corte 02, capo 2): chi attacca
 *  è messo nella provincia bersaglio (terreno), chi difende resta dov'è (terreno, trinceramento, fortezza). */
export function attackPower(w: World, u: Unit, at: number): number { return power(w, { ...u, location: at, from: undefined }, false, true); }
export function defensePower(w: World, u: Unit): number { return power(w, u, true, true); }

/** Risolve un giorno di combattimento in tutte le province contese. */
/** Armi da fuoco che contano nel divario (corte 01, capo 6), col peso di ciascuna sul fuoco di un esercito. */
export const FIRE_TECH: Record<string, number> = { retrocarica: 0.35, ripetizione: 0.2, mitragliatrice: 0.3, cannoni_acciaio: 0.15, tiro_rapido: 0.15, senza_fumo: 0.1 };
export function firepower(w: World, tag: Tag): number {
  let f = 1;
  for (const id of research(w).known[tag] ?? []) f += FIRE_TECH[id] ?? 0;
  return f;
}
function sideFire(w: World, side: Unit[]): number {
  let m = 0, f = 0;
  for (const u of side) { m += u.strength; f += u.strength * firepower(w, u.nation); }
  return m > 0 ? f / m : 1;
}

export function resolveBattles(w: World, sink: GameEvent[]) {
  const s = w.state;
  const byProv = new Map<number, Unit[]>();
  for (const u of s.units) {
    if (u.move && u.move.progress > 0) { u.inBattle = false; continue; } // in marcia sull'arco
    let l = byProv.get(u.location);
    if (!l) byProv.set(u.location, (l = []));
    l.push(u);
  }
  const active = new Set<number>();
  for (const [prov, units] of byProv) {
    const nations = [...new Set(units.map((u) => u.nation))];
    if (nations.length < 2) { units.forEach((u) => (u.inBattle = false)); continue; }
    // difensori = chi è amico di chi controlla la provincia; attaccanti = i suoi nemici
    const ctrl = s.controller[prov];
    const defTags = nations.filter((t) => allied(s, t, ctrl) || (!atWar(s, t, ctrl) && !nations.some((o) => o !== t && allied(s, o, ctrl))));
    const attTags = nations.filter((t) => !defTags.includes(t) && defTags.some((d) => atWar(s, t, d)));
    if (!attTags.length || !defTags.some((d) => attTags.some((a) => atWar(s, a, d)))) { units.forEach((u) => (u.inBattle = false)); continue; }
    const att = units.filter((u) => attTags.includes(u.nation));
    const def = units.filter((u) => defTags.includes(u.nation) && attTags.some((a) => atWar(s, a, u.nation)));
    if (!att.length || !def.length) continue;
    active.add(prov);
    const key = String(prov);
    if (!s.battles[key]) {
      s.battles[key] = { province: prov, startDay: s.day, losses: {}, sides: [[...new Set(att.map((u) => u.nation))], [...new Set(def.map((u) => u.nation))]] };
      emit(w, { type: 'battle_started', province: prov, nations: [...attTags, ...defTags], text: `Battaglia di ${w.map.provinces[prov].name}: truppe di ${names(w, attTags)} contro ${names(w, defTags)}.` }, sink);
      for (const a of attTags) for (const d of defTags) checkViolation(w, a, d, sink);
    }
    const b = s.battles[key];
    b.start ??= {};
    for (const u of [...att, ...def]) { u.inBattle = true; b.start[u.id] ??= u.strength; }
    const infA = att.some((u) => u.type === 'infantry'), infD = def.some((u) => u.type === 'infantry');
    // fronte di combattimento (corte 01, capo 13): in una provincia combattono al più tanti uomini quanti ne regge,
    // il doppio della sua capienza e mai meno di 40.000; gli altri aspettano in seconda linea. Prima 300.000 uomini
    // ammassati in una valle combattevano tutti insieme
    const width = Math.max(40000, provinceCapacity(w, prov) * 2000);
    const menA = att.reduce((x, u) => x + u.strength, 0), menD = def.reduce((x, u) => x + u.strength, 0);
    const pA = att.reduce((x, u) => x + power(w, u, false, infA, false, 0, artEfficiency(att)), 0) * Math.min(1, width / Math.max(1, menA));
    const artA = att.some((u) => u.type === 'artillery');
    // granate ad alto esplosivo degli attaccanti contro forti in muratura
    const brk = artA ? Math.max(0, ...att.map((u) => techEffects(w, u.nation).fortBreak)) : 0;
    const pD = def.reduce((x, u) => x + power(w, u, true, infD, artA, brk, artEfficiency(def)), 0) * Math.min(1, width / Math.max(1, menD));
    const noise = (k: string) => 0.85 + 0.3 * rand(s.seed, s.day, prov, k);
    // divario di fuoco (corte 01, capo 6): chi ha retrocarica, ripetizione e mitragliatrici infligge di più e subisce
    // di meno; fra eserciti della stessa generazione non cambia nulla
    const fA = sideFire(w, att), fD = sideFire(w, def);
    const lossA = pD * LOSS_FACTOR * noise('a') * (fD / fA);
    const lossD = pA * LOSS_FACTOR * noise('d') * (fA / fD);
    applyLosses(w, att, [...new Set(def.map((u) => u.nation))], lossA, b.losses);
    applyLosses(w, def, [...new Set(att.map((u) => u.nation))], lossD, b.losses);
    // ritirate: sotto il 30% dell'organico, ma un'unità entrata in battaglia già sotto quella soglia (una leva
    // arruolata a un quarto) regge finché non ha perso metà di ciò che aveva. Prima ogni leva ripiegava al primo colpo
    const cavA = att.reduce((x, u) => x + (u.type === 'cavalry' ? u.strength : 0), 0), cavD = def.reduce((x, u) => x + (u.type === 'cavalry' ? u.strength : 0), 0);
    for (const u of [...att, ...def]) {
      const floor = Math.min(u.maxStrength * RETREAT_STRENGTH, (b.start[u.id] ?? u.strength) * 0.5);
      if (u.strength <= 0 || u.morale < RETREAT_MORALE || u.strength < floor) retreat(w, u, sink, att.includes(u) ? cavD : cavA);
    }
  }
  // battaglie concluse
  for (const [key, b] of Object.entries(s.battles)) {
    if (active.has(b.province)) {
      const units = (byProv.get(b.province) ?? []).filter((u) => s.units.includes(u));
      const attLeft = units.some((u) => b.sides[0].includes(u.nation));
      const defLeft = units.some((u) => b.sides[1].includes(u.nation));
      if (attLeft && defLeft) continue;
    }
    const units = s.units.filter((u) => u.location === b.province);
    // vince chi dei due schieramenti è rimasto sul campo (non un terzo che passava di lì)
    const winner = units.find((u) => b.sides[0].includes(u.nation) || b.sides[1].includes(u.nation))?.nation ?? null;
    const lossTxt = Object.entries(b.losses).map(([t, l]) => `${shortN(w, t)} ${fmt(l)}`).join(', ');
    emit(w, {
      type: 'battle_ended', province: b.province, nations: [...b.sides[0], ...b.sides[1]],
      text: `Fine della battaglia di ${w.map.provinces[b.province].name} (${s.day - b.startDay + 1} giorni)${winner ? `: vittoria ${di(w, winner)}` : ''}. Perdite: ${lossTxt}.`,
      data: { losses: b.losses, winner },
    }, sink);
    units.forEach((u) => (u.inBattle = false));
    // l'attaccante vittorioso resta sul campo e prende la provincia dopo la sosta, la fortezza dopo l'assedio
    // (orders.ts, besiege): prima la prendeva subito, e una vittoria davanti a una fortezza valeva la fortezza
    delete s.battles[key];
  }
}

function applyLosses(w: World, side: Unit[], enemies: Tag[], total: number, ledger: Record<Tag, number>) {
  const s = w.state;
  const str = side.reduce((x, u) => x + u.strength, 0) || 1;
  for (const u of side) {
    const l = Math.min(u.strength, Math.round((total * u.strength) / str));
    u.strength -= l;
    u.morale = clamp(u.morale - (l / Math.max(1, u.strength + l)) * 3 - 0.015, 0, 1);
    u.experience = clamp(u.experience + 0.004, 0, 1);
    u.entrench = clamp(u.entrench - 0.02, 0, 1);
    ledger[u.nation] = (ledger[u.nation] ?? 0) + l;
    s.nations[u.nation].turnLosses += l;
    // le perdite contano nella guerra che si combatte qui: quella contro un nemico presente nella provincia
    // (una nazione in due guerre non le vede raddoppiate nel punteggio di entrambe)
    const here = s.wars.find((x) => enemies.some((e) => (x.attackers.includes(u.nation) && x.defenders.includes(e)) || (x.defenders.includes(u.nation) && x.attackers.includes(e))));
    if (here) here.casualties[u.nation] = (here.casualties[u.nation] ?? 0) + l;
  }
}

/** Quota del vantaggio dell'artiglieria che resta a uno schieramento: piena fino a un artigliere ogni due fanti. */
function artEfficiency(side: Unit[]): number {
  let inf = 0, art = 0;
  for (const u of side) { if (u.type === 'artillery') art += u.strength; else if (u.type === 'infantry') inf += u.strength; }
  return art > 0 ? Math.min(1, (inf * 0.5) / art) : 1;
}

/** Inseguimento (corte 01, capo 12): la cavalleria nemica colpisce chi ripiega, fino a un decimo dei suoi uomini. */
export const PURSUIT_LOSS = 0.1;

function retreat(w: World, u: Unit, sink: GameEvent[], pursuers = 0) {
  const s = w.state;
  const here = w.map.provinces[u.location];
  if (pursuers > 0 && u.strength > 0) {
    const l = Math.round(u.strength * PURSUIT_LOSS * Math.min(1, pursuers / u.strength));
    u.strength -= l;
    s.nations[u.nation].turnLosses += l;
  }
  // si ripiega per terra: non attraverso uno stretto né lungo una pista del deserto (una ritirata da Dover non
  // finisce a Calais, una da un'oasi non attraversa il Sahara in un giorno)
  const options = w.map.adj[u.location]
    .filter((e) => !e.strait && !e.route)
    .map((e) => e.to)
    .filter((p) => w.map.passable(p) && allied(s, u.nation, s.controller[p]) && !s.units.some((o) => o.location === p && atWar(s, u.nation, o.nation)));
  if (u.strength < 500 || !options.length) {
    s.units.splice(s.units.indexOf(u), 1);
    emit(w, { type: 'unit_destroyed', province: u.location, nations: [u.nation], text: `${u.name} si arrende a ${here.name}.` }, sink);
    return;
  }
  // verso la capitale (la provincia più vicina ad essa)
  const cap = w.map.provinces[s.nations[u.nation].capital].lonlat;
  const dest = options.sort((a, b) => geoKm(w.map.provinces[a].lonlat, cap) - geoKm(w.map.provinces[b].lonlat, cap) || a - b)[0];
  u.location = dest;
  u.move = null;
  u.orders = [];
  u.inBattle = false;
  u.recovering = 3;
  u.entrench = 0;
  u.morale = Math.max(u.morale, 0.15);
  emit(w, { type: 'retreat', province: dest, nations: [u.nation], text: `${u.name} ripiega da ${here.name} su ${w.map.provinces[dest].name}.` }, sink);
}

/**
 * Ritirata ordinata dalla battaglia (corte 01, capo 9): un'unità in battaglia con un ordine di movimento si sgancia
 * verso la provincia amica vicina più prossima alla meta, pagando l'inseguimento della cavalleria nemica e un po' di
 * morale. Prima una battaglia non si poteva abbandonare: si restava fino alla rotta.
 */
export function disengage(w: World, u: Unit, sink: GameEvent[]): boolean {
  const s = w.state;
  const o = u.orders[0];
  if (!u.inBattle || !o || o.type !== 'move' || o.target === undefined || o.target === u.location) return false;
  const goal = w.map.provinces[o.target].lonlat;
  const options = w.map.adj[u.location].filter((e) => !e.strait && !e.route).map((e) => e.to)
    .filter((p) => w.map.passable(p) && allied(s, u.nation, s.controller[p]) && !s.units.some((x) => x.location === p && atWar(s, u.nation, x.nation)))
    .sort((a, b) => geoKm(w.map.provinces[a].lonlat, goal) - geoKm(w.map.provinces[b].lonlat, goal) || a - b);
  if (!options.length) return false;
  const pursuers = s.units.reduce((x, e) => x + (e.location === u.location && e.type === 'cavalry' && atWar(s, u.nation, e.nation) ? e.strength : 0), 0);
  const here = w.map.provinces[u.location].name;
  const l = Math.round(u.strength * PURSUIT_LOSS * Math.min(1, pursuers / Math.max(1, u.strength)));
  u.strength -= l;
  s.nations[u.nation].turnLosses += l;
  u.morale = clamp(u.morale - 0.05, 0, 1);
  u.from = u.location;
  u.location = options[0];
  u.move = null;
  u.inBattle = false;
  u.recovering = 1;
  u.entrench = 0;
  if (u.location === o.target) u.orders.shift();
  emit(w, { type: 'retreat', province: u.location, nations: [u.nation], text: `${u.name} si sgancia da ${here} su ${w.map.provinces[u.location].name}${l ? ` (${l} uomini persi nell'inseguimento)` : ''}.` }, sink);
  return true;
}

/** Attaccare chi ha con noi un patto di non aggressione o un'alleanza è una violazione. */
function checkViolation(w: World, a: Tag, d: Tag, sink: GameEvent[]) {
  const s = w.state;
  for (const type of ['non_aggression', 'alliance', 'guarantee'] as const) {
    const t = treatyBetween(s, a, d, type);
    if (!t) continue;
    t.violated = true;
    emit(w, { type: 'treaty_violated', nations: [a, d], text: `${The(w, a)} viola il trattato (${({ non_aggression: 'non aggressione', alliance: 'alleanza', guarantee: 'garanzia' } as Record<string, string>)[type]}) con ${the(w, d)}.` }, sink);
    for (const n of Object.keys(s.nations)) if (n !== a) s.nations[n].opinion[a] = Math.max(-100, (s.nations[n].opinion[a] ?? 0) - (n === d ? 40 : 12));
  }
}

const shortN = (w: World, t: Tag) => w.profiles[t].short[1];
const names = (w: World, tags: Tag[]) => tags.map((t) => the(w, t)).join(' e ');
export const fmt = (n: number) => Math.round(n).toLocaleString('it-IT');
