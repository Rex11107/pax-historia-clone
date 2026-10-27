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

function power(w: World, u: Unit, defending: boolean, sideHasInfantry: boolean): number {
  const pr = w.profiles[u.nation];
  const st = UNIT_STATS[u.type];
  const terrain = w.map.provinces[u.location].terrain;
  let p = (u.strength / 1000) * (defending ? st.defense : st.attack);
  p *= 0.5 + 0.5 * u.morale;
  p *= 0.4 + 0.6 * u.supply;
  p *= (0.75 + 0.5 * (pr.militaryQuality / 100)) * govEffects(w, u.nation).quality;
  p *= 1 + 0.3 * u.experience;
  if (pr.doctrine === 'offensive' && !defending) p *= 1.1;
  if (pr.doctrine === 'defensive' && defending) p *= 1.1;
  if (u.type === 'cavalry' && (terrain === 'mountain' || terrain === 'forest' || terrain === 'marsh')) p *= 0.6;
  if (u.type === 'artillery' && !sideHasInfantry) p *= 0.6;
  if (defending) p *= TERRAIN_DEFENSE[terrain] * (1 + 0.5 * u.entrench);
  // attaccare dopo aver attraversato un fiume costa caro
  if (!defending && u.from !== undefined && w.map.river(u.from, u.location)) p *= RIVER_PENALTY;
  return p;
}

/** Risolve un giorno di combattimento in tutte le province contese. */
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
    [...att, ...def].forEach((u) => (u.inBattle = true));
    const infA = att.some((u) => u.type === 'infantry'), infD = def.some((u) => u.type === 'infantry');
    const pA = att.reduce((x, u) => x + power(w, u, false, infA), 0);
    const pD = def.reduce((x, u) => x + power(w, u, true, infD), 0);
    const noise = (k: string) => 0.85 + 0.3 * rand(s.seed, s.day, prov, k);
    const lossA = pD * LOSS_FACTOR * noise('a');
    const lossD = pA * LOSS_FACTOR * noise('d');
    applyLosses(w, att, lossA, b.losses);
    applyLosses(w, def, lossD, b.losses);
    // ritirate
    for (const u of [...att, ...def]) {
      if (u.strength <= 0 || u.morale < RETREAT_MORALE || u.strength < u.maxStrength * RETREAT_STRENGTH) retreat(w, u, sink);
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
    const winner = units.length ? units[0].nation : null;
    const lossTxt = Object.entries(b.losses).map(([t, l]) => `${shortN(w, t)} ${fmt(l)}`).join(', ');
    emit(w, {
      type: 'battle_ended', province: b.province, nations: [...b.sides[0], ...b.sides[1]],
      text: `Fine della battaglia di ${w.map.provinces[b.province].name} (${s.day - b.startDay + 1} giorni)${winner ? `: vittoria ${di(w, winner)}` : ''}. Perdite: ${lossTxt}.`,
      data: { losses: b.losses, winner },
    }, sink);
    units.forEach((u) => (u.inBattle = false));
    // l'attaccante vittorioso prende la provincia
    if (winner && b.sides[0].includes(winner) && atWar(s, winner, s.controller[b.province])) {
      const owner = s.owner[b.province];
      const prev = s.controller[b.province];
      s.controller[b.province] = owner !== prev && allied(s, winner, owner) ? owner : winner;
      emit(w, { type: 'province_captured', province: b.province, nations: [winner, prev], text: `${w.map.provinces[b.province].name} è occupata dalle truppe ${di(w, winner)}.` }, sink);
    }
    delete s.battles[key];
  }
}

function applyLosses(w: World, side: Unit[], total: number, ledger: Record<Tag, number>) {
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
    for (const war of s.wars) if (war.attackers.includes(u.nation) || war.defenders.includes(u.nation)) war.casualties[u.nation] = (war.casualties[u.nation] ?? 0) + l;
  }
}

function retreat(w: World, u: Unit, sink: GameEvent[]) {
  const s = w.state;
  const here = w.map.provinces[u.location];
  const options = w.map.adj[u.location]
    .map((e) => e.to)
    .filter((p) => w.map.passable(p) && allied(s, u.nation, s.controller[p]) && !s.units.some((o) => o.location === p && atWar(s, u.nation, o.nation)));
  if (u.strength < 500 || !options.length) {
    s.units.splice(s.units.indexOf(u), 1);
    emit(w, { type: 'unit_destroyed', province: u.location, nations: [u.nation], text: `${u.name} si arrende a ${here.name}.` }, sink);
    return;
  }
  // verso la capitale (la provincia più vicina ad essa)
  const cap = w.map.provinces[s.nations[u.nation].capital].c;
  const dest = options.sort((a, b) => dist(w.map.provinces[a].c, cap) - dist(w.map.provinces[b].c, cap))[0];
  u.location = dest;
  u.move = null;
  u.orders = [];
  u.inBattle = false;
  u.recovering = 3;
  u.entrench = 0;
  u.morale = Math.max(u.morale, 0.15);
  emit(w, { type: 'retreat', province: dest, nations: [u.nation], text: `${u.name} ripiega da ${here.name} su ${w.map.provinces[dest].name}.` }, sink);
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
const dist = (a: [number, number], b: [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const names = (w: World, tags: Tag[]) => tags.map((t) => the(w, t)).join(' e ');
export const fmt = (n: number) => Math.round(n).toLocaleString('it-IT');
