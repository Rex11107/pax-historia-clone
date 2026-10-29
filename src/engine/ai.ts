import { concludePeace, engineTerms } from './peace';
import { aiFinances, recruit } from './economy';
import { moveCost, planPath } from './orders';
import type { GameEvent, Tag, Unit } from './types';
import { allied, emit, enemiesOf, NOBODY, rand, The, warsOf, type World } from './world';
import { RESOURCES } from './resources';

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
      // le province con carbone, ferro o petrolio valgono di più
      const resBonus = 1 + map.resources[p].reduce((x, r) => x + (RESOURCES[r].strategic ? RESOURCES[r].value * 3 : 0), 0);
      targets.push({ p, score: (liberation * capital * resBonus * (1 + Math.log10(map.provinces[p].pop + 10))) / (1 + defense / 20000) });
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

// --- espansione nelle terre di nessuno ---
// Le potenze coloniali mandano una spedizione alla volta (anche per mare, sbarcando dove vogliono); gli stati
// africani e arabi si allargano via terra sulle terre di nessuno confinanti. Una spedizione è un'unità che
// entra nella provincia e la annette; resta lì e dalla nuova base sceglie l'obiettivo seguente.
const COLONIAL = new Set(['GBR', 'FRA', 'POR', 'SPA', 'ITA', 'GER', 'BEL']);

function colonyValue(w: World, p: number): number {
  const pv = w.map.provinces[p];
  const res = w.map.resources[p].reduce((x, r) => x + (RESOURCES[r].strategic ? 1.5 : 0.5), 0);
  return (1 + Math.log10(pv.pop + 1000) / 2) * (1 + res) * (pv.coast ? 1.3 : 1);
}

export function aiColonize(w: World, sink: GameEvent[]) {
  const s = w.state;
  const nullius: number[] = [];
  for (let p = 0; p < w.map.size; p++) if (s.controller[p] === NOBODY && s.owner[p] === NOBODY && w.map.passable(p)) nullius.push(p);
  if (!nullius.length) return;
  const nullSet = new Set(nullius);
  for (const tag of Object.keys(s.nations)) {
    const pr = w.profiles[tag];
    if (tag === s.player || !s.nations[tag].alive || !pr || pr.micro || tag === 'NUL' || warsOf(s, tag).length) continue;
    const colonial = COLONIAL.has(tag);
    const units = s.units.filter((u) => u.nation === tag);
    if (!units.length) continue;
    // una spedizione alla volta
    if (units.some((u) => u.orders.some((o) => o.label === 'spedizione'))) continue;
    const mine = new Set<number>();
    for (let p = 0; p < w.map.size; p++) if (s.owner[p] === tag) mine.add(p);
    // obiettivi: terre di nessuno confinanti con le proprie; per le potenze coloniali anche le coste lontane
    const near = nullius.filter((p) => w.map.adj[p].some((e) => mine.has(e.to) && !e.strait));
    const far = colonial ? nullius.filter((p) => w.map.provinces[p].coast && !near.includes(p)) : [];
    if (!near.length && !far.length) continue;
    // ritmo: le potenze una spedizione ogni quattro mesi circa, gli stati locali più di rado (e solo con un esercito che possa uscire)
    if (rand(s.seed, 'colonia', tag, s.turn) > (colonial ? 0.06 : 0.012)) continue;
    const idle = units.filter((u) => !u.inBattle && !u.recovering && !u.orders.length && !u.move);
    if (!idle.length) continue;
    // chi parte: un'unità già oltremare (vicina alle terre di nessuno) o, se non c'è, la più piccola non nella capitale
    const cap = s.nations[tag].capital;
    const abroad = idle.filter((u) => w.map.adj[u.location].some((e) => nullSet.has(e.to)) || nullSet.has(u.location));
    const pool = abroad.length ? abroad : colonial ? idle.filter((u) => u.location !== cap || idle.length === 1) : idle.filter((u) => w.map.adj[u.location].some((e) => near.includes(e.to)));
    const unit = [...pool].sort((a, b) => a.strength - b.strength)[0];
    if (!unit) continue;
    // candidati: i migliori per valore e vicinanza in linea d'aria, poi il percorso vero per i primi
    const [ux, uy] = w.map.provinces[unit.location].c;
    const cand = [...near.map((p) => ({ p, k: 1 })), ...far.map((p) => ({ p, k: 0.6 }))]
      .map(({ p, k }) => { const [x, y] = w.map.provinces[p].c; return { p, sc: (colonyValue(w, p) * k) / (1 + Math.hypot(x - ux, y - uy) / 800) }; })
      .sort((a, b) => b.sc - a.sc).slice(0, 4);
    let best: { p: number; v: number } | null = null;
    for (const c of cand) {
      const plan = planPath(w, unit, c.p, false);
      if (!plan || plan.days > (colonial ? 70 : 30)) continue;
      const v = colonyValue(w, c.p) / (1 + plan.days / 20);
      if (!best || v > best.v) best = { p: c.p, v };
    }
    if (!best) continue;
    unit.orders = [{ type: 'move', target: best.p, status: 'pending', label: 'spedizione' }];
    // le potenze annunciano la partenza; l'occupazione è annunciata da capture()
    if (colonial) emit(w, { type: 'expedition', nations: [tag], province: best.p, text: `${The(w, tag)} manda una spedizione verso ${w.map.provinces[best.p].name}.` }, sink);
  }
}

/** Fine turno: arruolamenti e paci automatiche fra nazioni non giocanti. */
export function aiEndOfTurn(w: World, sink: GameEvent[]) {
  const s = w.state;
  for (const tag of Object.keys(s.nations)) {
    if (tag === s.player || !s.nations[tag].alive) continue;
    const n = s.nations[tag];
    aiFinances(w, tag);
    if (!warsOf(s, tag).length) continue;
    // arruolamento nella provincia più popolosa e sicura
    if (n.treasury > 30 && n.manpower > 20000) {
      const own = w.map.provinces.filter((p) => s.owner[p.id] === tag && s.controller[p.id] === tag).sort((a, b) => b.pop - a.pop);
      for (const p of own.slice(0, 5)) if (!recruit(w, tag, 'infantry', p.id, sink)) break;
    }
  }
  // paci fra AI: quando una parte è esausta (o la guerra dura da molto), il motore detta la pace
  // con il punteggio di guerra; in modalità "tutte" la detta il giocatore
  const mode = s.options?.peaceMode ?? 'engine';
  for (const war of [...s.wars]) {
    if ([...war.attackers, ...war.defenders].includes(s.player)) continue;
    const a = war.attackers[0], d = war.defenders[0];
    if (!a || !d || !s.wars.includes(war)) continue;
    const weA = s.nations[a].warExhaustion, weD = s.nations[d].warExhaustion;
    const long = s.day - war.startDay > 180;
    if (Math.max(weA, weD) < 55 && !(long && Math.max(weA, weD) > 35)) continue;
    if (mode === 'all') {
      s.pendingPeace ??= [];
      const pend = s.pendingPeace.find((x) => x.war === war.id);
      if (!pend) { s.pendingPeace.push({ war: war.id, since: s.day }); emit(w, { type: 'peace_pending', nations: [a, d], text: `${war.name}: le parti sono pronte alla pace. Detta tu le condizioni (Diplomazia → Conferenze di pace).` }, sink); continue; }
      if (s.day - pend.since < 14) continue; // due settimane per decidere, poi decide il motore
    }
    concludePeace(w, war, engineTerms(w, war), sink);
    if (s.pendingPeace) s.pendingPeace = s.pendingPeace.filter((x) => x.war !== war.id);
  }
}
