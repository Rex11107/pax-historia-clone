import { geoKm } from './map';
import { concludePeace, engineTerms, playerPeace, warScore } from './peace';
import { aiFinances, aiMobilize, budget, loanRoom, recruit, takeLoan } from './economy';
import { moveCost, planPath } from './orders';
import { attackPower, defensePower } from './combat';
import { supplyMap } from './supply';
import { provinceCapacity } from './construction';
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

function planNation(w: World, tag: Tag, enemies: Set<Tag>) {
  const s = w.state;
  const map = w.map;
  const isEnemy = (t: Tag) => enemies.has(t);
  const ally = new Map<Tag, boolean>();
  const isAlly = (t: Tag) => { let a = ally.get(t); if (a === undefined) { a = allied(s, tag, t); ally.set(t, a); } return a; };
  const friendlyCtrl = (p: number) => isAlly(s.controller[p]);
  // forza nemica e amica per provincia, calcolate una volta per piano (corte 02, capo 9): prima ogni bersaglio e ogni
  // punto del fronte scorreva tutte le unità del mondo. Somme nello stesso ordine delle unità: risultati identici
  const foeAt = new Float64Array(map.size), ownAt = new Float64Array(map.size);
  for (const u of s.units) {
    if (isEnemy(u.nation)) foeAt[u.location] += u.strength;
    if (isAlly(u.nation)) ownAt[u.location] += u.strength;
  }
  const capitals = new Set<number>();
  for (const n of Object.values(s.nations)) if (isEnemy(n.tag)) capitals.add(n.capital);
  // fronte: province amiche adiacenti a province controllate dal nemico
  const front: number[] = [];
  const targets: { p: number; score: number }[] = [];
  // solo le province nemiche e le loro vicine possono essere fronte o bersaglio: prima si scorreva tutta la mappa
  // chiedendo l'alleanza di ogni controllore, per ognuna delle trenta nazioni che seguono il Regno Unito in guerra
  const near = new Set<number>();
  for (let p = 0; p < map.size; p++) if (isEnemy(s.controller[p])) { near.add(p); for (const e of map.adj[p]) near.add(e.to); }
  for (const p of [...near].sort((a, b) => a - b)) {
    if (friendlyCtrl(p)) {
      if (map.adj[p].some((e) => !e.strait && isEnemy(s.controller[e.to]))) front.push(p);
    } else if (isEnemy(s.controller[p])) {
      const touches = map.adj[p].some((e) => friendlyCtrl(e.to));
      if (!touches) continue;
      const defense = foeAt[p];
      const liberation = s.owner[p] === tag || allied(s, tag, s.owner[p]) ? 3 : 1;
      const capital = capitals.has(p) ? 2 : 1;
      // le province con carbone, ferro o petrolio valgono di più
      const resBonus = 1 + map.resources[p].reduce((x, r) => x + (RESOURCES[r].strategic ? RESOURCES[r].value * 3 : 0), 0);
      // la popolazione conta per quanto renderebbe: una provincia di un popolo estraneo fuori d'Europa vale l'8%
      targets.push({ p, score: (liberation * capital * resBonus * (1 + Math.log10(map.provinces[p].pop * colonialWeight(w, tag, p) + 10))) / (1 + defense / 20000) });
    }
  }
  const frontSet = new Set(front);
  // in ordine di sigla: il piano non dipende dall'ordine delle unità in memoria (salvataggi, ricaricamenti)
  const idle = s.units.filter((u) => u.nation === tag && !u.inBattle && !u.recovering && !u.orders.length).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  if (!idle.length) return;
  const stuck: Unit[] = []; // unità pronte che per terra non arrivano né a un obiettivo né al fronte
  const used = new Set<Unit>();
  const sup = targets.length || idle.some(worn) ? supplyMap(w, tag) : null;

  // 1. guarnigioni (corte 02, capo 6): la capitale non resta mai vuota e sul confine con un rivale in pace resta un
  //    corpo. Al più un quarto dell'esercito; solo per chi ha almeno quattro unità
  const mine = s.units.filter((u) => u.nation === tag);
  const army = mine.reduce((a, u) => a + u.strength, 0);
  if (mine.length >= 4) {
    let kept = 0;
    const keep = (u: Unit, move?: number) => {
      if (kept + u.strength > army * 0.25) return;
      used.add(u); kept += u.strength;
      u.orders = move === undefined ? [{ type: 'entrench', status: 'pending', until: { type: 'day_gte', value: 7 }, label: 'guarnigione' }]
        : [{ type: 'move', target: move, status: 'pending', label: 'guarnigione' }, { type: 'entrench', status: 'pending', until: { type: 'day_gte', value: 7 } }];
    };
    const cap = s.nations[tag].capital;
    if (s.controller[cap] === tag && !frontSet.has(cap) && !foeAt[cap]) {
      const there = mine.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)).filter((u) => u.location === cap || u.orders.some((o) => o.target === cap && o.label === 'guarnigione'));
      if (!there.length) {
        // la più piccola unità ferma che arriva in capitale entro venti giorni
        const back = idle.filter((u) => !worn(u)).map((u) => ({ u, d: map.distancesFrom(u.location, moveCost(w, u, false), 20)[cap] }))
          .filter((x) => isFinite(x.d)).sort((a, b) => a.u.strength - b.u.strength || a.d - b.d || (a.u.id < b.u.id ? -1 : 1))[0];
        if (back) keep(back.u, back.u.location === cap ? undefined : cap);
      } else for (const u of there) if (idle.includes(u) && !used.has(u)) { keep(u); break; }
    }
    // confini coi rivali che non sono in guerra con noi
    const rivals = (w.profiles[tag]?.rivals ?? []).filter((r) => s.nations[r]?.alive && !isEnemy(r) && w.profiles[r]?.major);
    for (const r of rivals) {
      const guard = idle.filter((u) => !used.has(u) && !worn(u) && s.controller[u.location] === tag && map.adj[u.location].some((e) => s.owner[e.to] === r))
        .sort((a, b) => b.strength - a.strength || (a.id < b.id ? -1 : 1))[0];
      if (guard) keep(guard);
    }
  }

  // 2. ritirata (corte 02, capo 2): chi è logoro torna dove arrivano i rifornimenti; prima restava nel territorio
  //    nemico a "riorganizzarsi" senza mai riprendersi
  for (const u of idle) {
    if (used.has(u) || !worn(u)) continue;
    used.add(u);
    // un posto dove i rifornimenti arrivano e la provincia regge tanti uomini (troppi in una valle andina muoiono di fame)
    const fits = (p: number) => !!sup && sup[p] >= 0.6 && friendlyCtrl(p) && !foeAt[p] && provinceCapacity(w, p) * 1000 >= u.strength + (p === u.location ? ownAt[p] - u.strength : ownAt[p]);
    if (!sup || (u.supply >= 0.35 && fits(u.location))) { u.orders = [{ type: 'entrench', status: 'pending', until: { type: 'day_gte', value: 7 }, label: 'riordino' }]; continue; }
    const d = map.distancesFrom(u.location, moveCost(w, u, false), 45);
    let best = -1;
    for (let p = 0; p < map.size; p++) if (p !== u.location && d[p] <= 30 && fits(p) && (best < 0 || d[p] < d[best])) best = p;
    // tagliati fuori: verso la provincia amica meglio rifornita entro 45 giorni, purché migliore di dove si è
    if (best < 0) for (let p = 0; p < map.size; p++) if (p !== u.location && isFinite(d[p]) && friendlyCtrl(p) && !foeAt[p] && sup[p] >= sup[u.location] + 0.2 && (best < 0 || sup[p] > sup[best] || (sup[p] === sup[best] && d[p] < d[best]))) best = p;
    if (best >= 0) ownAt[best] += u.strength;
    u.orders = best >= 0
      ? [{ type: 'move', target: best, status: 'pending', label: 'ritirata' }, { type: 'entrench', status: 'pending', until: { type: 'day_gte', value: 7 } }]
      : [{ type: 'entrench', status: 'pending', until: { type: 'day_gte', value: 7 }, label: 'riordino' }];
  }

  // 3. attacco per gruppi (corte 02, capo 2): un bersaglio si attacca quando la forza stimata con la formula del
  //    combattimento (terreno, trinceramento, fortezza, morale, rifornimento) supera di metà la difesa. Le unità già
  //    a contatto attaccano insieme; se non bastano, le altre si concentrano accanto al bersaglio, non arrivano alla
  //    spicciolata. I bersagli lontani dai rifornimenti valgono meno (il Cile sull'altopiano peruviano)
  const defPow = new Map<number, number>();
  for (const u of [...s.units].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))) if (isEnemy(u.nation) && near.has(u.location)) defPow.set(u.location, (defPow.get(u.location) ?? 0) + defensePower(w, u));
  for (const x of targets) x.score *= 0.3 + 0.7 * (sup ? sup[x.p] : 1);
  const order = [...targets].sort((a, b) => b.score - a.score || a.p - b.p);
  const deficit = new Map<number, number>();
  for (const x of order) {
    const need = 1.5 * (defPow.get(x.p) ?? 0);
    const local = idle.filter((u) => !used.has(u) && map.adj[x.p].some((e) => e.to === u.location && !e.strait) && friendlyCtrl(u.location))
      .map((u) => ({ u, pw: attackPower(w, u, x.p) })).sort((a, b) => b.pw - a.pw || (a.u.id < b.u.id ? -1 : 1));
    const total = local.reduce((a, l) => a + l.pw, 0);
    if (need > 0 && total < need) { deficit.set(x.p, need - total); continue; }
    if (!local.length) { if (need === 0) deficit.set(x.p, 0); continue; }
    let got = 0;
    for (const l of local) {
      if (got >= need && got > 0) break;
      l.u.orders = [{ type: 'attack', target: x.p, status: 'pending', label: 'offensiva' }];
      used.add(l.u); got += l.pw;
    }
  }
  for (const u of idle) {
    if (used.has(u)) continue;
    const dist = map.distancesFrom(u.location, moveCost(w, u, true), 45);
    // un bersaglio indifeso si prende direttamente; uno difeso si raggiunge da una provincia amica accanto
    const cand = order
      .filter((x) => deficit.has(x.p) && isFinite(dist[x.p]) && dist[x.p] <= 40)
      // la provincia deve reggere l'unità: oltre la sua capienza il rifornimento cala (supply.ts)
      .map((x) => ({ x, value: x.score * Math.min(1, provinceCapacity(w, x.p) * 1000 / u.strength) / (1 + dist[x.p] / 10) }))
      .sort((a, b) => b.value - a.value || a.x.p - b.x.p)[0];
    if (cand) {
      const t = cand.x.p, left = deficit.get(t)!;
      used.add(u);
      if (left === 0 && !(defPow.get(t) ?? 0)) {
        u.orders = [{ type: 'attack', target: t, status: 'pending', label: 'offensiva' }];
        deficit.delete(t);
        continue;
      }
      const stage = map.adj[t].filter((e) => !e.strait && friendlyCtrl(e.to) && isFinite(dist[e.to])).sort((a, b) => dist[a.to] - dist[b.to] || a.to - b.to)[0];
      if (stage) {
        u.orders = u.location === stage.to
          ? [{ type: 'entrench', status: 'pending', until: { type: 'day_gte', value: 3 }, label: 'concentramento' }]
          : [{ type: 'move', target: stage.to, status: 'pending', label: 'concentramento' }, { type: 'entrench', status: 'pending', until: { type: 'day_gte', value: 3 } }];
        const rest = left - attackPower(w, u, t);
        if (rest <= 0) deficit.delete(t); else deficit.set(t, rest);
        continue;
      }
      used.delete(u);
    }
    // altrimenti rinforza il punto del fronte più scoperto
    if (frontSet.has(u.location)) { u.orders = [{ type: 'entrench', status: 'pending', until: { type: 'day_gte', value: 7 } }]; used.add(u); continue; }
    if (!front.length) { stuck.push(u); continue; }
    const best = front
      .map((p) => {
        const threat = map.adj[p].reduce((x, e) => x + foeAt[e.to], 0);
        return { p, need: threat - ownAt[p] };
      })
      .sort((a, b) => b.need - a.need || a.p - b.p)
      .slice(0, 8)
      .map((x) => ({ ...x, days: dist[x.p] }))
      .filter((x) => x.days < 45)
      .sort((a, b) => b.need / (1 + b.days / 15) - a.need / (1 + a.days / 15) || a.p - b.p)[0];
    if (best) {
      u.orders = [{ type: 'move', target: best.p, status: 'pending', label: 'al fronte' }, { type: 'entrench', status: 'pending', until: { type: 'day_gte', value: 7 } }];
      ownAt[best.p] += u.strength;
      used.add(u);
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
/** Logora: sotto il 45% della forza o senza rifornimenti. */
const worn = (u: Unit) => u.strength < u.maxStrength * 0.45 || u.supply < 0.35;
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

/** Anni di entrate di debito oltre i quali chi si difende non arruola più a credito. */
export const WAR_DEBT_YEARS = 4;

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

/**
 * Reazione alla concentrazione ai confini (corte 02, nota del giocatore di exploit): in pace, se truppe straniere non
 * alleate ammassate nelle province confinanti (o entrate con un diritto di passaggio) superano metà del nostro
 * esercito, si passa alla mobilitazione parziale e lo si dice; quando se ne vanno si torna al piede di pace.
 */
export function borderAlert(w: World, tag: Tag, sink: GameEvent[], threats = borderThreats(w)) {
  const s = w.state, n = s.nations[tag];
  if (!n?.alive || w.profiles[tag]?.micro) return;
  const mine = threats.armies.get(tag) ?? 0;
  // una concentrazione, non la guarnigione di pace: più di 30.000 uomini, metà del nostro esercito e almeno il 40% del loro
  const [who, men] = [...(threats.near.get(tag) ?? [])].filter(([t, m]) => m > 30000 && m > mine * 0.5 && m >= (threats.armies.get(t) ?? 0) * 0.4 && !allied(s, tag, t))
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0] ?? ['', 0];
  const threat = men > 0;
  if (threat && n.policies.mobilization === 'peace') {
    n.policies.mobilization = 'partial';
    emit(w, { type: 'mobilization', nations: [tag, who], text: `${The(w, tag)} richiama i riservisti: ${Math.round(men / 1000)} mila uomini ${di(w, who)} sono ammassati ai suoi confini.` }, sink);
  } else if (!threat && n.policies.mobilization === 'partial') n.policies.mobilization = 'peace';
}

/** Per ogni nazione, gli uomini stranieri sulle sue terre o nelle province confinanti (esclusa la guarnigione
 *  della propria capitale), una sola passata sulle unità per tutto il mondo. */
export function borderThreats(w: World) {
  const s = w.state;
  const near = new Map<Tag, Map<Tag, number>>(), armies = new Map<Tag, number>();
  for (const u of s.units) {
    armies.set(u.nation, (armies.get(u.nation) ?? 0) + u.strength);
    if (u.location === s.nations[u.nation]?.capital) continue;
    const seen = new Set<Tag>([s.owner[u.location]]);
    for (const e of w.map.adj[u.location]) seen.add(s.owner[e.to]);
    for (const t of seen) {
      if (t === u.nation || !s.nations[t]) continue;
      let m = near.get(t); if (!m) near.set(t, (m = new Map()));
      m.set(u.nation, (m.get(u.nation) ?? 0) + u.strength);
    }
  }
  return { near, armies };
}

export function aiEndOfTurn(w: World, sink: GameEvent[]) {
  const s = w.state;
  const threats = borderThreats(w);
  for (const tag of Object.keys(s.nations)) {
    if (tag === s.player || !s.nations[tag].alive) continue;
    const n = s.nations[tag];
    aiFinances(w, tag);
    if (!warsOf(s, tag).length) { borderAlert(w, tag, sink, threats); continue; }
    aiMobilize(w, tag); // la mobilitazione segue la guerra: sale se il nemico entra in casa, scende se si riduce
    // arruolamento nella provincia più popolosa e sicura, ma solo se serve: finché l'esercito non supera di metà
    // quello dei nemici (del doppio se il nemico è in casa). Prima chi era in guerra arruolava ogni settimana, anche contro
    // un nemico cento volte più piccolo, fino alla bancarotta
    const foes = enemiesOf(s, tag);
    // forze del teatro (corte 02, capo 8): contano i nemici a tre passi dalle nostre terre, non tutti gli uomini del
    // mondo (la Francia in guerra con Tunisi non arruola contro l'esercito della Porta in Anatolia)
    const own: number[] = [];
    for (let p = 0; p < w.map.size; p++) if (s.owner[p] === tag || s.controller[p] === tag) own.push(p);
    const theater = w.map.hops(own, () => true, 3);
    let mine = 0, theirs = 0;
    for (const u of s.units) { if (u.nation === tag) mine += u.strength; else if (foes.has(u.nation) && theater[u.location] >= 0) theirs += u.strength; }
    const invaded = s.owner.some((o, p) => o === tag && foes.has(s.controller[p]));
    // in guerra difensiva si arruola anche a debito, fino a quattro anni di entrate: le guerre del secolo si pagavano
    // con i prestiti, e prima l'AI smetteva di arruolare proprio quando il debito saliva
    const defending = s.wars.some((x) => x.defenders.includes(tag));
    const income = Math.max(0, n.lastBudget?.income ?? budget(w, tag).income);
    const credit = defending && n.debt < WAR_DEBT_YEARS * 52 * income;
    if (mine < theirs * (invaded ? 3 : 1.5) && (n.treasury > 30 || credit) && n.manpower > 20000) {
      if (n.treasury <= 30 && credit) takeLoan(w, tag, Math.min(loanRoom(w, tag), Math.max(10, Math.round(income * 4))));
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
