import { geoKm } from './map';
import { concludePeace, engineTerms, playerPeace, warScore } from './peace';
import { aiFinances, aiMobilize, recruit } from './economy';
import { moveCost, planPath } from './orders';
import type { GameEvent, Tag, Unit, War } from './types';
import { allied, clamp, di, emit, enemiesOf, nationName, NOBODY, rand, The, warsOf, type World } from './world';
import { RESOURCES } from './resources';
import { hasProgram } from './colonial';
import { colonialWeight } from './ethnic';

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
      // la popolazione conta per quanto renderebbe: una provincia di un popolo estraneo fuori d'Europa vale l'8%
      targets.push({ p, score: (liberation * capital * resBonus * (1 + Math.log10(map.provinces[p].pop * colonialWeight(w, tag, p) + 10))) / (1 + defense / 20000) });
    }
  }
  const idle = s.units.filter((u) => u.nation === tag && !u.inBattle && !u.recovering && !u.orders.length);
  if (!idle.length) return;
  const assigned = new Map<number, number>(); // provincia -> uomini già mandati
  const stuck: Unit[] = []; // unità pronte che per terra non arrivano né a un obiettivo né al fronte
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
      .sort((a, b) => b.value - a.value || a.t.p - b.t.p)[0];
    if (cand) {
      u.orders = [{ type: 'attack', target: cand.t.p, status: 'pending', label: 'offensiva' }];
      assigned.set(cand.t.p, (assigned.get(cand.t.p) ?? 0) + u.strength);
      continue;
    }
    // altrimenti rinforza il punto del fronte più scoperto
    if (front.includes(u.location)) { u.orders = [{ type: 'entrench', status: 'pending', until: { type: 'day_gte', value: 7 } }]; continue; }
    if (!front.length) { stuck.push(u); continue; }
    const best = front
      .map((p) => {
        const threat = map.adj[p].reduce((x, e) => x + strengthAt(w, e.to, (y) => isEnemy(y.nation)), 0);
        const mine = strengthAt(w, p, (y) => allied(s, tag, y.nation)) + (assigned.get(p) ?? 0);
        return { p, need: threat - mine };
      })
      .sort((a, b) => b.need - a.need || a.p - b.p)
      .slice(0, 8)
      .map((x) => ({ ...x, days: dist[x.p] }))
      .filter((x) => x.days < 45)
      .sort((a, b) => b.need / (1 + b.days / 15) - a.need / (1 + a.days / 15) || a.p - b.p)[0];
    if (best) {
      u.orders = [{ type: 'move', target: best.p, status: 'pending', label: 'al fronte' }, { type: 'entrench', status: 'pending', until: { type: 'day_gte', value: 7 } }];
      assigned.set(best.p, (assigned.get(best.p) ?? 0) + u.strength);
    } else stuck.push(u);
  }
  overseas(w, tag, enemies, targets, stuck);
}

/** Rinforzi per mare. Per terra una potenza non raggiunge una guerra oltremare: la Francia teneva 470.000 uomini
 *  fermi in patria mentre 8.000 tunisini razziavano l'Algeria. Finché le forze già impegnate non superano di
 *  metà quelle del nemico (e almeno un corpo), fino a tre unità ferme per volta partono per nave verso gli
 *  obiettivi migliori o, se non c'è ancora un fronte, verso le coste nemiche più vicine. */
function overseas(w: World, tag: Tag, enemies: Set<Tag>, targets: { p: number; score: number }[], stuck: Unit[]) {
  const s = w.state, map = w.map;
  if (!stuck.length || (w.profiles[tag]?.naval ?? 0) <= 0) { for (const u of stuck) hold(u); return; }
  let enemyMen = 0, engaged = 0;
  for (const u of s.units) {
    if (enemies.has(u.nation)) enemyMen += u.strength;
    else if (u.nation === tag && !stuck.includes(u) && (u.orders.some((o) => o.type !== 'entrench' && o.type !== 'hold') || enemies.has(s.owner[u.location]))) engaged += u.strength;
  }
  const need = Math.max(15000, enemyMen * 1.5);
  let sent = 0;
  for (const u of stuck) {
    if (engaged >= need || sent >= 3) { hold(u); continue; }
    const here = map.provinces[u.location].lonlat;
    const pool = targets.length ? targets.map((t) => t.p) : map.provinces.filter((x) => x.coast && !x.impassable && enemies.has(s.controller[x.id])).map((x) => x.id);
    const cand = pool.map((p) => ({ p, km: geoKm(map.provinces[p].lonlat, here) })).sort((a, b) => a.km - b.km || a.p - b.p).slice(0, 3);
    let best: { p: number; days: number } | null = null;
    for (const c of cand) {
      const plan = planPath(w, u, c.p, true);
      if (plan && plan.days <= 75 && (!best || plan.days < best.days)) best = { p: c.p, days: plan.days };
    }
    if (!best) { hold(u); continue; }
    u.orders = [{ type: 'attack', target: best.p, status: 'pending', label: 'oltremare' }];
    engaged += u.strength; sent++;
  }
}
const hold = (u: Unit) => { u.orders = [{ type: 'entrench', status: 'pending', until: { type: 'day_gte', value: 7 } }]; };

// --- espansione nelle terre di nessuno degli stati locali ---
// Le potenze coloniali seguono i loro interessi (colonial.ts). Gli stati africani e arabi si allargano di rado,
// via terra, sulle terre di nessuno confinanti dello stesso paese di oggi (niente salti oltre i confini naturali).

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
    if (tag === s.player || !s.nations[tag].alive || !pr || pr.micro || tag === 'NUL' || warsOf(s, tag).length || hasProgram(tag)) continue;
    const colonial = false;
    const units = s.units.filter((u) => u.nation === tag);
    if (!units.length) continue;
    // una spedizione alla volta
    if (units.some((u) => u.orders.some((o) => o.label === 'spedizione'))) continue;
    const mine = new Set<number>();
    for (let p = 0; p < w.map.size; p++) if (s.owner[p] === tag) mine.add(p);
    // obiettivi: terre di nessuno confinanti con le proprie; per le potenze coloniali anche le coste lontane
    const mods = new Set([...mine].map((p) => w.map.provinces[p].modern));
    const near = nullius.filter((p) => mods.has(w.map.provinces[p].modern) && w.map.adj[p].some((e) => mine.has(e.to) && !e.strait));
    const far = colonial ? nullius.filter((p) => w.map.provinces[p].coast && !near.includes(p)) : [];
    if (!near.length && !far.length) continue;
    // ritmo: le potenze una spedizione ogni quattro mesi circa, gli stati locali più di rado (e solo con un esercito che possa uscire)
    if (rand(s.seed, 'colonia', tag, s.turn) > (colonial ? 0.06 : 0.006)) continue;
    const idle = units.filter((u) => !u.inBattle && !u.recovering && !u.orders.length && !u.move);
    if (!idle.length) continue;
    // chi parte: un'unità già oltremare (vicina alle terre di nessuno) o, se non c'è, la più piccola non nella capitale
    const cap = s.nations[tag].capital;
    const abroad = idle.filter((u) => w.map.adj[u.location].some((e) => nullSet.has(e.to)) || nullSet.has(u.location));
    const pool = abroad.length ? abroad : colonial ? idle.filter((u) => u.location !== cap || idle.length === 1) : idle.filter((u) => w.map.adj[u.location].some((e) => near.includes(e.to)));
    const unit = [...pool].sort((a, b) => a.strength - b.strength || a.id.localeCompare(b.id))[0];
    if (!unit) continue;
    // candidati: i migliori per valore e vicinanza in linea d'aria, poi il percorso vero per i primi
    const here = w.map.provinces[unit.location].lonlat;
    const cand = [...near.map((p) => ({ p, k: 1 })), ...far.map((p) => ({ p, k: 0.6 }))]
      .map(({ p, k }) => { return { p, sc: (colonyValue(w, p) * k) / (1 + geoKm(w.map.provinces[p].lonlat, here) / 800) }; })
      .sort((a, b) => b.sc - a.sc || a.p - b.p).slice(0, 4);
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
/**
 * La guerra è matura per la pace? Stanchezza (55, o 35 dopo sei mesi), guerra decisa sul campo dopo due mesi, o
 * guerra che dura da un anno e mezzo. Prima una guerra senza scontri non finiva mai.
 */
function peaceDue(w: World, war: War): boolean {
  const s = w.state;
  const weA = s.nations[war.attackers[0]].warExhaustion, weD = s.nations[war.defenders[0]].warExhaustion;
  // età contata dall'inizio della partita: la Guerra del Pacifico (aperta nel 1879, startDay negativo) non si
  // chiude d'ufficio nella prima settimana del 1881
  const age = s.day - Math.max(war.startDay, 0);
  const long = age > 180;
  // un'ancora storica tiene aperta la guerra (corte 00, passo 2): prima si chiude solo se chi perde è sfinito, o se
  // chi vince è allo stremo. Il Cile del 1881-83 era stanco ma non cedette: la stanchezza del vincitore conta meno
  if (war.resistance !== undefined && s.day < war.resistance) {
    const win = warScore(w, war).winner;
    const loser = win === 'att' ? weD : win === 'def' ? weA : Math.max(weA, weD);
    return loser >= 70 || Math.max(weA, weD) >= 95;
  }
  const decided = age > 60 && warScore(w, war).points >= 50;
  return Math.max(weA, weD) >= 55 || (long && Math.max(weA, weD) > 35) || decided || age > 540;
}

/** Settimane fra l'offerta di pace al giocatore e la pressione, e fra la pressione e la pace imposta. */
export const PEACE_OFFER_WEEKS = 4, PEACE_PRESSURE_WEEKS = 4;

/**
 * Guerre del giocatore (corte 07, capo 2): prima il motore le saltava tutte, e il giocatore battuto restava in guerra
 * per sempre senza perdere nulla. Ora, con le stesse soglie delle guerre fra nazioni non giocanti, se vince il nemico:
 * 1. offre le sue condizioni (il giocatore le vede e le accetta da Diplomazia → Conferenze di pace);
 * 2. dopo quattro settimane senza risposta il rifiuto pesa: stanchezza +2 e stabilità −1 a settimana;
 * 3. dopo altre quattro la pace è imposta con le condizioni del momento.
 * Se vince il giocatore non cambia nulla: è lui a dettare la pace. Vale in ogni modalità della pace: le modalità
 * "own" e "all" danno al giocatore il diritto di dettare condizioni da vincitore, non di non perdere mai.
 */
function playerWar(w: World, war: War, sink: GameEvent[]) {
  const s = w.state, me = s.player, n = s.nations[me];
  const sc = warScore(w, war);
  const enemySide = war.attackers.includes(me) ? 'def' : 'att';
  if (sc.winner !== enemySide || !peaceDue(w, war)) { delete war.offer; return; }
  const victor = enemySide === 'att' ? war.attackers[0] : war.defenders[0];
  if (!war.offer) {
    war.offer = { since: s.day };
    const mine = engineTerms(w, war).filter((d) => d.from === me).length;
    emit(w, { type: 'peace_offer', nations: [me, victor], text: `${nationName(w, victor)} offre la pace alle sue condizioni${mine ? ` (${mine} richieste a noi)` : ''}: si leggono in Diplomazia → Conferenze di pace. Rifiutarle per più di ${PEACE_OFFER_WEEKS} settimane costerà stanchezza e stabilità, e dopo ${PEACE_OFFER_WEEKS + PEACE_PRESSURE_WEEKS} la pace sarà imposta.` }, sink);
    return;
  }
  const weeks = Math.floor((s.day - war.offer.since) / 7);
  if (weeks >= PEACE_OFFER_WEEKS + PEACE_PRESSURE_WEEKS) {
    emit(w, { type: 'peace_imposed', nations: [me, victor], text: `${nationName(w, victor)} impone la pace: il paese non regge altri mesi di una guerra perduta.` }, sink);
    playerPeace(w, war, sink);
    return;
  }
  if (weeks >= PEACE_OFFER_WEEKS) {
    n.warExhaustion = clamp(n.warExhaustion + 2, 0, 100);
    n.stability = clamp(n.stability - 1, 0, 100);
    if (weeks === PEACE_OFFER_WEEKS) emit(w, { type: 'unrest', nations: [me], text: `Il rifiuto della pace offerta ${di(w, victor)} pesa sul paese: scioperi, diserzioni, giornali contro il governo.` }, sink);
  }
}

export function aiEndOfTurn(w: World, sink: GameEvent[]) {
  const s = w.state;
  for (const tag of Object.keys(s.nations)) {
    if (tag === s.player || !s.nations[tag].alive) continue;
    const n = s.nations[tag];
    aiFinances(w, tag);
    if (!warsOf(s, tag).length) continue;
    aiMobilize(w, tag); // la mobilitazione segue la guerra: sale se il nemico entra in casa, scende se si riduce
    // arruolamento nella provincia più popolosa e sicura, ma solo se serve: finché l'esercito non supera di metà
    // quello dei nemici (del doppio se il nemico è in casa). Prima chi era in guerra arruolava ogni settimana, anche contro
    // un nemico cento volte più piccolo, fino alla bancarotta
    const foes = enemiesOf(s, tag);
    let mine = 0, theirs = 0;
    for (const u of s.units) { if (u.nation === tag) mine += u.strength; else if (foes.has(u.nation)) theirs += u.strength; }
    const invaded = s.owner.some((o, p) => o === tag && foes.has(s.controller[p]));
    if (mine < theirs * (invaded ? 3 : 1.5) && n.treasury > 30 && n.manpower > 20000) {
      // si arruola dove la leva rende davvero: la popolazione pesata col peso coloniale, come nelle leve del bilancio
      const wpop = (p: { id: number; pop: number }) => p.pop * colonialWeight(w, tag, p.id);
      const own = w.map.provinces.filter((p) => s.owner[p.id] === tag && s.controller[p.id] === tag).sort((a, b) => wpop(b) - wpop(a) || a.id - b.id);
      for (const p of own.slice(0, 5)) if (!recruit(w, tag, 'infantry', p.id, sink)) break;
    }
  }
  // paci fra AI: quando una parte è esausta (o la guerra dura da molto), il motore detta la pace
  // con il punteggio di guerra; in modalità "tutte" la detta il giocatore
  const mode = s.options?.peaceMode ?? 'engine';
  for (const war of [...s.wars]) {
    const a = war.attackers[0], d = war.defenders[0];
    if (!a || !d || !s.wars.includes(war)) continue;
    if ([...war.attackers, ...war.defenders].includes(s.player)) { playerWar(w, war, sink); continue; }
    if (!peaceDue(w, war)) continue;
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
