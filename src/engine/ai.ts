import { recruit } from './economy';
import { makePeace } from './diplomacy';
import { moveCost } from './orders';
import type { GameEvent, Tag, Unit } from './types';
import { allied, enemiesOf, warsOf, type World } from './world';

// Riflessi deterministici delle nazioni non giocanti (zero chiamate AI):
// difendono, liberano le province occupate, attaccano dove hanno superiorità locale,
// arruolano se in guerra e firmano la pace quando sono esauste.
// Le decisioni "politiche" (dichiarare guerra, alleanze) restano al Game Master.

export function aiPlan(w: World) {
  const s = w.state;
  const nations = new Set(s.units.map((u) => u.nation));
  for (const tag of nations) {
    if (tag === s.player) continue;
    const enemies = enemiesOf(s, tag);
    if (!enemies.size) continue;
    planNation(w, tag, enemies);
  }
}

function strengthAt(w: World, p: number, pred: (u: Unit) => boolean) {
  let x = 0;
  for (const u of w.state.units) if (u.location === p && pred(u)) x += u.strength;
  return x;
}

function planNation(w: World, tag: Tag, enemies: Set<Tag>) {
  const s = w.state;
  const map = w.map;
  const isEnemy = (t: Tag) => enemies.has(t);
  const friendlyCtrl = (p: number) => allied(s, tag, s.controller[p]);
  // fronte: province amiche adiacenti a province controllate dal nemico
  const front: number[] = [];
  const targets: { p: number; score: number }[] = [];
  for (let p = 0; p < map.size; p++) {
    if (friendlyCtrl(p)) {
      if (map.adj[p].some((e) => !e.strait && isEnemy(s.controller[e.to]))) front.push(p);
    } else if (isEnemy(s.controller[p])) {
      const touches = map.adj[p].some((e) => friendlyCtrl(e.to));
      if (!touches) continue;
      const defense = strengthAt(w, p, (u) => isEnemy(u.nation));
      const liberation = s.owner[p] === tag || allied(s, tag, s.owner[p]) ? 3 : 1;
      const capital = Object.values(s.nations).some((n) => n.capital === p && isEnemy(n.tag)) ? 2 : 1;
      targets.push({ p, score: (liberation * capital * (1 + Math.log10(map.provinces[p].pop + 10))) / (1 + defense / 20000) });
    }
  }
  const idle = s.units.filter((u) => u.nation === tag && !u.inBattle && !u.recovering && !u.orders.length);
  if (!idle.length) return;
  const assigned = new Map<number, number>(); // provincia -> uomini già mandati
  for (const u of idle) {
    if (u.strength < u.maxStrength * 0.45 || u.supply < 0.35) continue; // si riorganizza
    const dist = map.distancesFrom(u.location, moveCost(w, u, true), 60);
    // attacco se c'è superiorità locale
    const cand = targets
      .map((t) => {
        const plan = { days: dist[t.p] };
        if (!isFinite(plan.days) || plan.days > 40) return null;
        const defense = strengthAt(w, t.p, (x) => isEnemy(x.nation));
        const ours = u.strength + (assigned.get(t.p) ?? 0);
        const ratio = ours / Math.max(1, defense);
        return { t, plan, ratio, value: t.score * Math.min(2, ratio) / (1 + plan.days / 10) };
      })
      .filter((x): x is NonNullable<typeof x> => !!x && (x.ratio >= 1.3 || strengthAt(w, x.t.p, (y) => isEnemy(y.nation)) === 0))
      .sort((a, b) => b.value - a.value)[0];
    if (cand) {
      u.orders = [{ type: 'attack', target: cand.t.p, status: 'pending', label: 'offensiva' }];
      assigned.set(cand.t.p, (assigned.get(cand.t.p) ?? 0) + u.strength);
      continue;
    }
    // altrimenti rinforza il punto del fronte più scoperto
    if (!front.length || front.includes(u.location)) { u.orders = [{ type: 'entrench', status: 'pending', until: { type: 'day_gte', value: 7 } }]; continue; }
    const best = front
      .map((p) => {
        const threat = map.adj[p].reduce((x, e) => x + strengthAt(w, e.to, (y) => isEnemy(y.nation)), 0);
        const mine = strengthAt(w, p, (y) => allied(s, tag, y.nation)) + (assigned.get(p) ?? 0);
        return { p, need: threat - mine };
      })
      .sort((a, b) => b.need - a.need)
      .slice(0, 8)
      .map((x) => ({ ...x, days: dist[x.p] }))
      .filter((x) => x.days < 45)
      .sort((a, b) => b.need / (1 + b.days / 15) - a.need / (1 + a.days / 15))[0];
    if (best) {
      u.orders = [{ type: 'move', target: best.p, status: 'pending', label: 'al fronte' }, { type: 'entrench', status: 'pending' }];
      assigned.set(best.p, (assigned.get(best.p) ?? 0) + u.strength);
    }
  }
}

/** Fine turno: arruolamenti e paci automatiche fra nazioni non giocanti. */
export function aiEndOfTurn(w: World, sink: GameEvent[]) {
  const s = w.state;
  for (const tag of Object.keys(s.nations)) {
    if (tag === s.player || !s.nations[tag].alive) continue;
    const n = s.nations[tag];
    if (!warsOf(s, tag).length) continue;
    // arruolamento nella provincia più popolosa e sicura
    if (n.treasury > 30 && n.manpower > 20000) {
      const own = w.map.provinces.filter((p) => s.owner[p.id] === tag && s.controller[p.id] === tag).sort((a, b) => b.pop - a.pop);
      for (const p of own.slice(0, 5)) if (!recruit(w, tag, 'infantry', p.id, sink)) break;
    }
  }
  // paci fra AI: chi è esausto cede ciò che il nemico occupa
  for (const war of [...s.wars]) {
    if ([...war.attackers, ...war.defenders].includes(s.player)) continue;
    const a = war.attackers[0], d = war.defenders[0];
    if (!a || !d || !s.wars.includes(war)) continue;
    const weA = s.nations[a].warExhaustion, weD = s.nations[d].warExhaustion;
    const long = s.day - war.startDay > 180;
    if (Math.max(weA, weD) < 55 && !(long && Math.max(weA, weD) > 35)) continue;
    const loser = weA >= weD ? a : d;
    const winner = loser === a ? d : a;
    const occupied = w.map.provinces.filter((p) => s.owner[p.id] === loser && s.controller[p.id] === winner && p.id !== s.nations[loser].capital).map((p) => p.id).slice(0, 3);
    makePeace(w, a, d, { cedeTo: winner, provinces: occupied }, sink);
  }
}
