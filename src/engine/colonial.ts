// Interessi coloniali: le potenze (e il giocatore) seguono idee storiche invece di prendere la terra di nessuno
// più comoda. Ogni interesse ha un peso, una finestra d'epoca, prerequisiti leggeri e più vie per ottenerlo:
// occupazione, trattato di protettorato, acquisto, subentro con assenso, guerra.
//
// Tre stadi: storico, rivendicazioni reali, ambizioni. Il terzo si apre solo con la decisione "maggiori
// richieste", che arriva dopo un cambio di governo (regimi parlamentari e costituzionali) o una crisi coloniale;
// l'alternativa è il consolidamento (stabilità, integrazione più rapida delle colonie).
//
// Le colonie conquistate si amministrano con tre politiche (culto, economia, rappresentanza): integrazione,
// resistenza (fino alla rivolta), entrate.
//
// Qui c'è anche la crisi egiziana: rivolta del Mahdi, occupazione britannica, ritiro dal Sudan e dalla costa.
// I possedimenti egiziani del Mar Rosso entrano in liquidazione: chi ha un interesse può chiedere di subentrare.

import { INTERESTS_1881, type ColonialPath, type InterestSeed } from '../scenario/colonial1881';
import { declareWar } from './diplomacy';
import { planPath } from './orders';
import { politicsOf } from './politics';
import { placeArmies } from './setup';
import type { GameEvent, NationState, Tag } from './types';
import { subjectOf, subjects } from './vassals';
import { al, atWar, changeOpinion, clamp, dateOf, di, emit, formatDate, NOBODY, rand, the, The, warsOf, type World } from './world';

export type { ColonialPath, InterestSeed };

export type Culto = 'tolleranza' | 'missioni' | 'assimilazione';
export type Economia = 'commercio' | 'concessioni' | 'investimenti';
export type Rappresentanza = 'governatore' | 'notabili' | 'consigli';
export interface ColonyAdmin { culto: Culto; economia: Economia; rappresentanza: Rappresentanza; integration: number; resistance: number }

export const POLICY_INFO = {
  culto: {
    tolleranza: ['Tolleranza', 'si rispettano fedi e capi religiosi: resistenza bassa, integrazione lenta'],
    missioni: ['Missioni', 'scuole e missioni: integrazione più rapida, qualche attrito'],
    assimilazione: ['Assimilazione', 'lingua e culto della metropoli: integrazione rapida, resistenza alta'],
  },
  economia: {
    commercio: ['Commercio', 'dazi e scambi: entrate modeste, nessun attrito'],
    concessioni: ['Concessioni', 'terre e miniere alle compagnie: entrate alte, resistenza alta'],
    investimenti: ['Investimenti', 'strade, pozzi, porti a spese dello Stato: costa, ma integra e calma'],
  },
  rappresentanza: {
    governatore: ['Governatore militare', 'ordine con la forza: resistenza più alta senza guarnigioni'],
    notabili: ['Capi locali', 'si governa attraverso sultani e capi: equilibrio'],
    consigli: ['Consigli elettivi', 'rappresentanza ai coloni e ai notabili: integra e calma, ma costa'],
  },
} as const;

export interface ColonialState {
  done: Record<string, number>;
  closed: Record<string, number>;
  /** chi l'ha chiuso (se lo perde, l'interesse si riapre) */
  closedBy?: Record<string, string>;
  /** decisione sullo stadio 3 */
  ambition: Record<Tag, { choice: 'richieste' | 'consolidamento'; day: number }>;
  /** decisione in attesa (giocatore) */
  pending: Record<Tag, { since: number; why: string }>;
  /** giorno in cui la nazione è pronta per lo stadio 3 */
  ready: Record<Tag, number>;
  /** tentativi falliti: `${nazione}|${chi}|${via}` -> giorno fino a cui non si riprova */
  cooldown: Record<string, number>;
  admin: Record<string, ColonyAdmin>;
  /** possedimenti egiziani in liquidazione */
  liquidating?: { provinces: number[]; until: number };
  egypt: { stage: number };
}

export type ColonialMode = 'storico' | 'libero';
const mode = (w: World): ColonialMode => w.state.options?.colonialMode ?? 'storico';
const year = (w: World) => dateOf(w.state.day).getUTCFullYear();
const COLONIAL_POWERS = new Set(INTERESTS_1881.map((x) => x.nation));
export const BY_ID = new Map(INTERESTS_1881.map((x) => [x.id, x]));
export const interestsOf = (tag: Tag) => INTERESTS_1881.filter((x) => x.nation === tag);
export const hasProgram = (tag: Tag) => COLONIAL_POWERS.has(tag);

// --- province degli interessi ---

const provCache = new WeakMap<object, Map<string, number[]>>();
export function interestProvinces(w: World, seed: InterestSeed): number[] {
  let m = provCache.get(w.map);
  if (!m) { m = new Map(); provCache.set(w.map, m); }
  let ids = m.get(seed.id);
  if (!ids) {
    const names = new Set(seed.names ?? []);
    const byName = (n: string) => names.has(n) || [...names].some((x) => n.startsWith(`${x} (`));
    ids = w.map.provinces.filter((p) => !p.impassable && ((seed.modern && seed.modern.includes(p.modern)) || byName(p.name))).map((p) => p.id);
    m.set(seed.id, ids);
  }
  return ids;
}

/**
 * La provincia è nostra, o di un nostro vassallo/protettorato la cui capitale sta nell'interesse
 * (il protettorato di Tunisi vale per "Tunisi", non per le terre lontane dello stesso bey).
 */
export function heldBy(w: World, tag: Tag, p: number, ids?: Set<number>): boolean {
  const o = w.state.owner[p];
  if (o === tag) return true;
  const x = o ? subjectOf(w, o) : undefined;
  if (!x || x.overlord !== tag || x.level === 'tributario') return false;
  return !ids || ids.has(w.state.nations[o].capital);
}

const idSets = new WeakMap<object, Map<string, Set<number>>>();
function idSet(w: World, seed: InterestSeed): Set<number> {
  let m = idSets.get(w.map);
  if (!m) { m = new Map(); idSets.set(w.map, m); }
  let x = m.get(seed.id);
  if (!x) { x = new Set(interestProvinces(w, seed)); m.set(seed.id, x); }
  return x;
}

export function progress(w: World, seed: InterestSeed): number {
  const ids = interestProvinces(w, seed);
  if (!ids.length) return 0;
  const set = idSet(w, seed);
  return ids.filter((p) => heldBy(w, seed.nation, p, set)).length / ids.length;
}

export function colonial(w: World): ColonialState {
  const s = w.state;
  if (!s.colonial) {
    s.colonial = { done: {}, closed: {}, ambition: {}, pending: {}, ready: {}, cooldown: {}, admin: {}, egypt: { stage: 0 } };
    for (const seed of INTERESTS_1881) if (s.nations[seed.nation] && progress(w, seed) >= 0.8) {
      s.colonial.done[seed.id] = -1;
      s.colonial.admin[seed.id] = { culto: 'tolleranza', economia: 'commercio', rappresentanza: 'notabili', integration: 20, resistance: 15 };
    }
  }
  return s.colonial;
}

// --- disponibilità ---

export interface InterestStatus { state: 'done' | 'closed' | 'available' | 'locked'; reasons: string[]; progress: number }

export function interestStatus(w: World, seed: InterestSeed): InterestStatus {
  const s = w.state, c = colonial(w);
  const pr = progress(w, seed);
  if (c.done[seed.id] !== undefined) return { state: 'done', reasons: [], progress: pr };
  if (c.closed[seed.id] !== undefined) return { state: 'closed', reasons: ['un\'altra potenza ha preso il territorio'], progress: pr };
  const reasons: string[] = [];
  if (!s.nations[seed.nation]?.alive) reasons.push('nazione scomparsa');
  if (seed.stage === 3 && c.ambition[seed.nation]?.choice !== 'richieste') reasons.push('serve la decisione «maggiori richieste» (dopo un cambio di governo o una crisi coloniale)');
  const free = mode(w) === 'libero';
  if (!free) {
    let earliest = seed.earliest;
    if (earliest && seed.early && c.done[seed.early.after] !== undefined && s.day - Math.max(0, c.done[seed.early.after]) >= seed.early.days) earliest = undefined;
    if (earliest && year(w) < earliest) {
      const e = seed.early ? BY_ID.get(seed.early.after) : null;
      reasons.push(`non prima del ${earliest}${e ? ` (o un anno dopo «${e.name}»)` : ''}`);
    }
    for (const r of seed.requires ?? []) if (c.done[r] === undefined) reasons.push(`prima: «${BY_ID.get(r)?.name ?? r}»`);
    if (seed.requiresAny && !seed.requiresAny.some((r) => c.done[r] !== undefined)) reasons.push(`prima uno fra: ${seed.requiresAny.map((r) => `«${BY_ID.get(r)?.name ?? r}»`).join(', ')}`);
    const earlyOk = !!seed.early && c.done[seed.early.after] !== undefined;
    if (seed.stage === 2 && !seed.open && !seed.requires && !seed.requiresAny && !earlyOk) {
      const st1 = interestsOf(seed.nation).filter((x) => x.stage === 1);
      const d = st1.filter((x) => c.done[x.id] !== undefined).length;
      if (st1.length && d < Math.ceil(st1.length / 2)) reasons.push(`completa almeno metà degli obiettivi storici (${d} su ${st1.length})`);
    }
  }
  return { state: reasons.length ? 'locked' : 'available', reasons, progress: pr };
}

export const available = (w: World, tag: Tag) => interestsOf(tag).filter((x) => interestStatus(w, x).state === 'available');

/** Rivendicazioni coloniali (pretese) sulle province: valgono nelle paci. */
let claimKey = '';
let claimMap = new Map<number, { nation: Tag; name: string }[]>();
export function colonialClaims(w: World, p: number): { nation: Tag; name: string }[] {
  const s = w.state;
  const c = colonial(w);
  const key = `${s.seed}:${s.day}:${Object.keys(c.done).length}:${Object.keys(c.closed).length}:${Object.keys(c.ambition).length}`;
  if (key !== claimKey) {
    claimKey = key; claimMap = new Map();
    for (const seed of INTERESTS_1881) {
      if (!s.nations[seed.nation]?.alive || interestStatus(w, seed).state !== 'available') continue;
      const set = idSet(w, seed);
      for (const q of interestProvinces(w, seed)) {
        // uno Stato che sta tutto nell'interesse si prende col protettorato (il Bardo), non a pezzi
        const o = s.owner[q];
        if (o && seed.paths.includes('protettorato') && s.nations[o] && set.has(s.nations[o].capital)) continue;
        claimMap.set(q, [...(claimMap.get(q) ?? []), { nation: seed.nation, name: seed.name }]);
      }
    }
  }
  return claimMap.get(p) ?? [];
}

// --- azioni ---

export type ColonialAction =
  | { path: 'occupazione'; interest: string; provinces: number[] }
  | { path: 'protettorato'; interest: string; target: Tag }
  | { path: 'acquisto'; interest: string; from: Tag; provinces: number[] }
  | { path: 'assenso'; interest: string; from: Tag; decider: Tag; provinces: number[] }
  | { path: 'guerra'; interest: string; against: Tag };

export interface Evaluation { ok: boolean; score: number; need: number; parts: [string, number][]; cost: number; refusal?: string }

const army = (w: World, t: Tag) => w.state.units.filter((u) => u.nation === t).reduce((a, u) => a + u.strength, 0);
const popOf = (w: World, ids: number[]) => ids.reduce((a, p) => a + w.map.provinces[p].pop, 0);
const name = (w: World, t: Tag) => (t === NOBODY ? 'terra di nessuno' : w.profiles[t]?.name ?? t);

/** Le azioni possibili per un interesse disponibile. */
export function actionsFor(w: World, seed: InterestSeed): ColonialAction[] {
  const s = w.state, tag = seed.nation;
  const set = idSet(w, seed);
  const ids = interestProvinces(w, seed).filter((p) => !heldBy(w, tag, p, set));
  const out: ColonialAction[] = [];
  const nul = ids.filter((p) => s.owner[p] === NOBODY);
  if (nul.length && seed.paths.includes('occupazione')) out.push({ path: 'occupazione', interest: seed.id, provinces: nul });
  const owners = new Map<Tag, number[]>();
  for (const p of ids) if (s.owner[p] !== NOBODY) owners.set(s.owner[p], [...(owners.get(s.owner[p]) ?? []), p]);
  const liq = new Set(colonial(w).liquidating?.provinces ?? []);
  for (const [o, ps] of owners) {
    if (!s.nations[o]?.alive || o === tag) continue;
    const major = !!w.profiles[o]?.major;
    const ov = subjectOf(w, o);
    // protettorato solo su uno Stato la cui capitale sta nell'interesse (non sui vicini che vi sconfinano)
    if (seed.paths.includes('protettorato') && !major && !w.profiles[o]?.micro && set.has(s.nations[o].capital) && subjectOf(w, o)?.overlord !== tag) out.push({ path: 'protettorato', interest: seed.id, target: o });
    if (seed.paths.includes('acquisto') && !major && !ps.some((p) => liq.has(p))) out.push({ path: 'acquisto', interest: seed.id, from: o, provinces: ps });
    if (seed.paths.includes('assenso') || ps.some((p) => liq.has(p))) {
      const decider = ov && ov.level !== 'tributario' ? ov.overlord : o;
      out.push({ path: 'assenso', interest: seed.id, from: o, decider, provinces: ps });
    }
    if (seed.paths.includes('guerra')) out.push({ path: 'guerra', interest: seed.id, against: o });
  }
  return out;
}

/** Presenza: proprie truppe o proprie terre vicine (due passi), oppure una flotta per le coste. */
function presence(w: World, tag: Tag, ids: number[]): number {
  const s = w.state;
  const mine: number[] = [];
  for (let p = 0; p < w.map.size; p++) if (s.owner[p] === tag) mine.push(p);
  for (const u of s.units) if (u.nation === tag) mine.push(u.location);
  const h = w.map.hops(mine, () => true, 2);
  if (ids.some((p) => h[p] >= 0)) return 15;
  const naval = w.profiles[tag]?.naval ?? 0;
  if (ids.some((p) => w.map.provinces[p].coast) && naval >= 30) return 5;
  if (ids.some((p) => w.map.provinces[p].coast) && naval >= 15) return 0;
  return -99;
}

function fearOf(w: World, target: Tag, besides: Tag): number {
  const s = w.state;
  const mine = army(w, target) || 500;
  let worst = 0;
  const nb = new Set<Tag>();
  for (let p = 0; p < w.map.size; p++) if (s.owner[p] === target) for (const e of w.map.adj[p]) { const o = s.owner[e.to]; if (o && o !== target && o !== besides) nb.add(o); }
  for (const r of w.profiles[target]?.rivals ?? []) if (s.nations[r]?.alive && r !== besides) nb.add(r);
  for (const o of nb) worst = Math.max(worst, army(w, o) / mine);
  return Math.round(clamp(Math.log2(Math.max(1, worst)) * 8, 0, 30));
}

const windowBonus = (w: World, seed: InterestSeed) => (mode(w) === 'storico' && seed.window && year(w) >= seed.window[0] && year(w) <= seed.window[1] ? 10 : 0);

export function priceOf(w: World, ids: number[]): number {
  return Math.max(8, Math.round(ids.reduce((a, p) => a + w.map.provinces[p].pop / 1e5 * 1.5 + w.map.provinces[p].area / 8000, 0)));
}

export function evaluate(w: World, a: ColonialAction): Evaluation {
  const s = w.state, seed = BY_ID.get(a.interest)!, tag = seed.nation, c = colonial(w);
  const parts: [string, number][] = [];
  const fail = (refusal: string): Evaluation => ({ ok: false, score: 0, need: 0, parts, cost: 0, refusal });
  if (interestStatus(w, seed).state !== 'available') return fail('interesse non disponibile');
  if (warsOf(s, tag).length && a.path !== 'guerra' && a.path !== 'occupazione') return fail('in guerra la diplomazia coloniale si ferma');
  const cd = (who: Tag) => c.cooldown[`${tag}|${who}|${a.path}`];
  switch (a.path) {
    case 'occupazione': return { ok: true, score: 0, need: 0, parts: [['muovi un esercito in una delle terre di nessuno indicate', 0]], cost: 0 };
    case 'guerra': {
      if (w.profiles[a.against]?.major) parts.push(['grande potenza', 0]);
      return { ok: true, score: 0, need: 0, parts: [['dichiara guerra dalla Diplomazia: queste province contano come rivendicazioni nella pace', 0]], cost: 0 };
    }
    case 'protettorato': {
      const t = a.target;
      if ((cd(t) ?? -1) > s.day) return fail(`ha rifiutato da poco: riprova dopo il ${formatDate(cd(t)!)}`);
      const ov = subjectOf(w, t);
      if (ov && ov.overlord !== tag && ov.level !== 'tributario') return fail(`${name(w, t)} dipende già da ${name(w, ov.overlord)}`);
      if (ov && ov.overlord !== tag) parts.push([`sovranità nominale ${di(w, ov.overlord)}`, -10]);
      if (ov && ov.overlord === tag) return fail('è già un nostro soggetto');
      if (atWar(s, tag, t)) return fail('siamo in guerra: si impone con la pace');
      const pres = presence(w, tag, interestProvinces(w, seed));
      if (pres < -50) return fail('nessuna presenza: servono truppe o terre a due passi, o una marina per le coste');
      parts.push(['presenza', pres]);
      parts.push(['stima verso di noi', Math.round((s.nations[t].opinion[tag] ?? 0) * 0.5)]);
      parts.push(['sovranità', -20]);
      if (warsOf(s, t).length) return fail(`${name(w, t)} è in guerra: non firma trattati`);
      const fear = fearOf(w, t, tag); if (fear) parts.push(['paura dei vicini', fear]);
      const big = army(w, t); if (big > 20000) parts.push(['un grande esercito', -Math.round(Math.min(45, big / 1500))]);
      parts.push(['orgoglio e coesione', -Math.round((w.profiles[t]?.cohesion ?? 50) * 0.35)]);
      parts.push(['doni e sussidi', 20]);
      const wb = windowBonus(w, seed); if (wb) parts.push(['il momento storico', wb]);
      const cost = Math.max(5, Math.round(popOf(w, w.map.provinces.filter((p) => s.owner[p.id] === t).map((p) => p.id)) / 1e5 * 2));
      const score = parts.reduce((x, [, v]) => x + v, 0);
      if (s.nations[tag].treasury < cost) return { ok: false, score, need: 30, parts, cost, refusal: `servono ${cost} milioni` };
      return { ok: score >= 30, score, need: 30, parts, cost };
    }
    case 'acquisto': {
      const o = a.from, ids = a.provinces;
      if ((cd(o) ?? -1) > s.day) return fail('ha rifiutato da poco');
      if (ids.includes(s.nations[o].capital)) return fail('nessuno vende la propria capitale');
      const all = w.map.provinces.filter((p) => s.owner[p.id] === o);
      const share = popOf(w, ids) / Math.max(1, popOf(w, all.map((p) => p.id)));
      if (share > 0.3) return fail(`è troppo: ${Math.round(share * 100)}% della popolazione ${di(w, o)}`);
      if (atWar(s, tag, o)) return fail('siamo in guerra');
      const cost = priceOf(w, ids);
      parts.push(['stima verso di noi', Math.round((s.nations[o].opinion[tag] ?? 0) * 0.5)]);
      if (s.nations[o].treasury < cost) parts.push(['casse vuote', 15]);
      if (s.nations[o].debt > s.nations[o].treasury * 3) parts.push(['debiti', 10]);
      parts.push(['coesione', -Math.round((w.profiles[o]?.cohesion ?? 50) * 0.25)]);
      parts.push(['terre di confine', share < 0.1 ? 15 : 5]);
      // il protettore di fatto (Londra per Zanzibar) deve tollerare
      const patron = subjectOf(w, o)?.overlord ?? (w.profiles[o]?.friends ?? []).find((f) => w.profiles[f]?.major && s.nations[f]?.alive && f !== tag);
      if (patron) { const op = s.nations[patron].opinion[tag] ?? 0; if (op < -10) return fail(`${name(w, patron)}, che protegge ${name(w, o)}, non lo permette`); parts.push([`${name(w, patron)} tollera`, Math.round(op * 0.2)]); }
      const wb = windowBonus(w, seed); if (wb) parts.push(['il momento storico', wb]);
      const score = parts.reduce((x, [, v]) => x + v, 0);
      if (s.nations[tag].treasury < cost) return { ok: false, score, need: 20, parts, cost, refusal: `servono ${cost} milioni` };
      return { ok: score >= 20, score, need: 20, parts, cost };
    }
    case 'assenso': {
      const o = a.from, d = a.decider, ids = a.provinces;
      if ((cd(d) ?? -1) > s.day) return fail('ha rifiutato da poco');
      if (atWar(s, tag, d) || atWar(s, tag, o)) return fail('siamo in guerra');
      const liq = new Set(c.liquidating?.provinces ?? []);
      const inLiq = ids.filter((p) => liq.has(p));
      if (inLiq.length) parts.push(['l\'Egitto si ritira', 40]);
      else if (d === o) parts.push([`${name(w, o)} non vuole cedere`, w.profiles[o]?.major ? -20 : -35]);
      parts.push([`stima ${d === o ? '' : `di ${name(w, d)} `}verso di noi`, Math.round((s.nations[d].opinion[tag] ?? 0) * 0.5)]);
      // Londra preferisce l'Italia alla Francia: un rivale del decisore interessato agli stessi territori
      const rivalsOfD = new Set(w.profiles[d]?.rivals ?? []);
      const competitor = INTERESTS_1881.some((x) => x.nation !== tag && rivalsOfD.has(x.nation) && interestStatus(w, x).state === 'available' && interestProvinces(w, x).some((p) => ids.includes(p)));
      if (competitor) parts.push(['meglio noi di un suo rivale', 15]);
      if (d !== o && s.nations[d].opinion[o] !== undefined) parts.push([`legame con ${name(w, o)}`, -Math.round(Math.max(0, s.nations[d].opinion[o] ?? 0) * 0.2)]);
      const cost = Math.round(priceOf(w, ids) * (inLiq.length ? 0.3 : 0.8));
      parts.push(['compenso', 10]);
      const wb = windowBonus(w, seed); if (wb) parts.push(['il momento storico', wb]);
      const score = parts.reduce((x, [, v]) => x + v, 0);
      if (s.nations[tag].treasury < cost) return { ok: false, score, need: 30, parts, cost, refusal: `servono ${cost} milioni` };
      return { ok: score >= 30, score, need: 30, parts, cost };
    }
  }
}

/** Esegue un'azione diplomatica coloniale (protettorato, acquisto, assenso). null = riuscita. */
export function execute(w: World, a: ColonialAction, sink: GameEvent[] = []): string | null {
  const s = w.state, seed = BY_ID.get(a.interest)!, tag = seed.nation, c = colonial(w);
  if (a.path === 'occupazione' || a.path === 'guerra') return 'questa via si percorre con l\'esercito';
  const ev = evaluate(w, a);
  if (ev.refusal && !ev.score) return ev.refusal;
  const who = a.path === 'protettorato' ? a.target : a.path === 'acquisto' ? a.from : a.decider;
  if (ev.refusal) return ev.refusal;
  if (!ev.ok) {
    c.cooldown[`${tag}|${who}|${a.path}`] = s.day + 26 * 7;
    changeOpinion(s, who, tag, -5);
    emit(w, { type: 'colonial', nations: [tag, who], text: `${name(w, who)} respinge ${a.path === 'protettorato' ? 'il trattato di protettorato' : a.path === 'acquisto' ? 'l\'offerta di acquisto' : 'la richiesta di subentro'} ${di(w, tag)} (${seed.name}).` }, sink);
    return `rifiutato (${ev.score} su ${ev.need})`;
  }
  s.nations[tag].treasury -= ev.cost;
  if (a.path === 'protettorato') {
    const old = subjectOf(w, a.target);
    if (old && old.overlord !== tag) { changeOpinion(s, old.overlord, tag, -20); emit(w, { type: 'colonial', nations: [old.overlord, a.target], text: `${The(w, old.overlord)} protesta: perde la sovranità nominale su ${name(w, a.target)}.` }, sink); }
    s.subjects = subjects(w).filter((x) => x.subject !== a.target);
    s.subjects.push({ subject: a.target, overlord: tag, level: 'protettorato', liberty: 45, since: s.day });
    s.nations[a.target].treasury += Math.round(ev.cost * 0.5);
    emit(w, { type: 'colonial', nations: [tag, a.target], text: `Trattato di protettorato: ${name(w, a.target)} si pone sotto la protezione ${di(w, tag)} (${seed.name}).` }, sink);
  } else {
    for (const p of a.provinces) { s.owner[p] = tag; s.controller[p] = tag; }
    for (const u of s.units) if (u.nation !== tag && a.provinces.includes(u.location)) relocate(w, u);
    if (a.path === 'acquisto') { s.nations[a.from].treasury += ev.cost; changeOpinion(s, a.from, tag, 5); }
    else { s.nations[a.decider].treasury += Math.round(ev.cost * 0.5); changeOpinion(s, a.from, tag, -15); changeOpinion(s, a.decider, tag, 5); }
    const liq = c.liquidating; if (liq) liq.provinces = liq.provinces.filter((p) => !a.provinces.includes(p));
    const list = a.provinces.map((p) => w.map.provinces[p].name);
    emit(w, { type: 'colonial', nations: [tag, a.from], text: a.path === 'acquisto'
      ? `${The(w, tag)} compra ${list.join(', ')} da ${name(w, a.from)} per ${ev.cost} milioni.`
      : `Con l'assenso ${di(w, a.decider)}, ${the(w, tag)} subentra ${al(w, a.from)} a ${list.join(', ')}.` }, sink);
  }
  checkCompletions(w, sink);
  return null;
}

/** Unità rimaste in una provincia ceduta: tornano nella capitale. */
function relocate(w: World, u: World['state']['units'][number]) {
  u.location = w.state.nations[u.nation].capital; u.move = null; u.orders = [];
}

// --- completamento, crisi, decisioni ---

export function checkCompletions(w: World, sink: GameEvent[]) {
  const s = w.state, c = colonial(w);
  // obiettivi perduti (una guerra persa, una rivolta): tornano aperti, e con loro le alternative che avevano chiuso
  for (const [id, day] of Object.entries(c.done)) {
    const seed = BY_ID.get(id);
    if (!seed || day < 0 || progress(w, seed) >= 0.4) continue;
    delete c.done[id]; delete c.admin[id];
    for (const [other, by] of Object.entries(c.closedBy ?? {})) if (by === id) { delete c.closed[other]; delete c.closedBy![other]; }
    emit(w, { type: 'colonial', nations: [seed.nation], text: `${The(w, seed.nation)} perde ${seed.name}: l'obiettivo coloniale torna aperto.` }, sink);
  }
  for (const seed of INTERESTS_1881) {
    if (c.done[seed.id] !== undefined || c.closed[seed.id] !== undefined || !s.nations[seed.nation]?.alive) continue;
    if (progress(w, seed) < 0.8) continue;
    c.done[seed.id] = s.day;
    c.admin[seed.id] ??= { culto: 'tolleranza', economia: seed.nation === s.player ? 'commercio' : 'concessioni', rappresentanza: 'notabili', integration: 0, resistance: 25 };
    emit(w, { type: 'colonial', nations: [seed.nation], text: `${The(w, seed.nation)} raggiunge un obiettivo coloniale: ${seed.name}.` }, sink);
    // alternative che si chiudono, e crisi per chi aveva mire sugli stessi territori
    const mine = new Set(interestProvinces(w, seed));
    for (const other of INTERESTS_1881) {
      if (other.nation === seed.nation || c.done[other.id] !== undefined || c.closed[other.id] !== undefined) continue;
      const clash = (other.excludes ?? []).includes(seed.id) || (seed.excludes ?? []).includes(other.id);
      const overlap = interestProvinces(w, other).filter((p) => mine.has(p)).length;
      if (clash) {
        c.closed[other.id] = s.day;
        (c.closedBy ??= {})[other.id] = seed.id;
        emit(w, { type: 'colonial', nations: [other.nation, seed.nation], text: `Sfuma «${other.name}» per ${the(w, other.nation)}: ${the(w, seed.nation)} ha preso ${seed.name}.` }, sink);
      }
      if ((clash || overlap >= 2) && s.nations[other.nation]?.alive) {
        changeOpinion(s, other.nation, seed.nation, -10);
        if (c.ready[other.nation] !== undefined && !c.ambition[other.nation] && !c.pending[other.nation]) c.pending[other.nation] = { since: s.day, why: `crisi coloniale: ${the(w, seed.nation)} prende ${seed.name}` };
      }
    }
  }
}

export function decideAmbition(w: World, tag: Tag, choice: 'richieste' | 'consolidamento', sink: GameEvent[] = []): string | null {
  const s = w.state, c = colonial(w);
  if (!c.pending[tag]) return 'nessuna decisione in attesa';
  delete c.pending[tag];
  c.ambition[tag] = { choice, day: s.day };
  const n = s.nations[tag];
  if (choice === 'richieste') {
    n.stability = clamp(n.stability - 2, 0, 100);
    for (const t of Object.keys(s.nations)) if (t !== tag && w.profiles[t]?.major) changeOpinion(s, t, tag, -4);
    emit(w, { type: 'colonial', nations: [tag], text: `${The(w, tag)} sceglie la via delle maggiori richieste: si aprono nuove ambizioni coloniali.` }, sink);
  } else {
    n.stability = clamp(n.stability + 3, 0, 100);
    emit(w, { type: 'colonial', nations: [tag], text: `${The(w, tag)} sceglie il consolidamento: le colonie prima di nuove imprese.` }, sink);
  }
  return null;
}

function weeklyDecisions(w: World, sink: GameEvent[]) {
  const s = w.state, c = colonial(w);
  for (const tag of COLONIAL_POWERS) {
    if (!s.nations[tag]?.alive) continue;
    const list = interestsOf(tag);
    const st1 = list.filter((x) => x.stage === 1), st2 = list.filter((x) => x.stage === 2);
    const d1 = st1.filter((x) => c.done[x.id] !== undefined || c.closed[x.id] !== undefined).length;
    if (c.ready[tag] === undefined && (st2.some((x) => c.done[x.id] !== undefined && c.done[x.id] >= 0) || (st1.length && d1 >= Math.ceil(st1.length * 0.66) && st1.some((x) => c.done[x.id] >= 0)))) c.ready[tag] = s.day;
    if (c.ready[tag] === undefined) continue;
    // il consolidamento si può rivedere dopo dieci anni, a un nuovo governo
    const amb = c.ambition[tag];
    const open = !amb || (amb.choice === 'consolidamento' && s.day - amb.day > 3650);
    if (open && !c.pending[tag]) {
      // un nuovo governo o elezioni (regimi parlamentari e costituzionali): il paese ridiscute la politica coloniale
      const ps = politicsOf(w, tag);
      const turning = sink.find((e) => (e.type === 'government' || e.type === 'election') && e.nations.includes(tag) && e.day >= s.day - 7);
      if (ps && ps.regime !== 'autocracy' && (ps.since > Math.max(c.ready[tag], amb?.day ?? -1) || turning)) c.pending[tag] = { since: s.day, why: turning?.type === 'election' ? 'dopo le elezioni' : `nuovo governo (${ps.head})` };
    }
    if (c.pending[tag] && tag !== s.player) {
      const r = rand(s.seed, 'ambizione', tag, s.day);
      decideAmbition(w, tag, s.nations[tag].stability >= 45 && r < 0.65 ? 'richieste' : 'consolidamento', sink);
    } else if (c.pending[tag] && tag === s.player && c.pending[tag].since === s.day) {
      emit(w, { type: 'colonial', nations: [tag], text: `Decisione coloniale (${c.pending[tag].why}): maggiori richieste o consolidamento? Governo → Colonie.` }, sink);
    }
  }
}

// --- amministrazione delle colonie ---

function weeklyAdmin(w: World, sink: GameEvent[]) {
  const s = w.state, c = colonial(w);
  for (const [id, ad] of Object.entries(c.admin)) {
    const seed = BY_ID.get(id);
    if (!seed || !s.nations[seed.nation]?.alive) continue;
    const tag = seed.nation;
    const own = interestProvinces(w, seed).filter((p) => s.owner[p] === tag);
    if (!own.length) continue;
    const cons = c.ambition[tag]?.choice === 'consolidamento' ? 1.5 : 1;
    // integrazione: decenni, non anni (da 0,05 a 0,32 punti a settimana)
    const gain = (0.05 + { tolleranza: 0, missioni: 0.06, assimilazione: 0.12 }[ad.culto] + { commercio: 0, concessioni: -0.02, investimenti: 0.07 }[ad.economia] + { governatore: 0, notabili: 0.03, consigli: 0.08 }[ad.rappresentanza]) * cons;
    const before = ad.integration;
    ad.integration = clamp(ad.integration + gain, 0, 100);
    if (before < 100 && ad.integration >= 100) emit(w, { type: 'colonial', nations: [tag], text: `${seed.name}: la colonia è integrata.` }, sink);
    const garrison = s.units.filter((u) => u.nation === tag && own.includes(u.location)).reduce((a, u) => a + u.strength, 0);
    const target = clamp(30 + { tolleranza: -5, missioni: 8, assimilazione: 25 }[ad.culto] + { commercio: 0, concessioni: 15, investimenti: -8 }[ad.economia]
      + { governatore: garrison ? 0 : 15, notabili: 0, consigli: -10 }[ad.rappresentanza] - ad.integration * 0.35 - Math.min(20, garrison / 2000), 0, 100);
    ad.resistance = Math.round((ad.resistance + (target - ad.resistance) * 0.1) * 10) / 10;
    // entrate e spese (milioni a settimana, sulla popolazione della colonia)
    const popM = popOf(w, own) / 1e6;
    const money = popM * ({ commercio: 0.08, concessioni: 0.22, investimenti: -0.15 }[ad.economia] + (ad.rappresentanza === 'consigli' ? -0.05 : 0));
    s.nations[tag].treasury += Math.round(money * 100) / 100;
    // rivolta: una provincia senza truppe torna terra di nessuno
    if (ad.resistance >= 70 && rand(s.seed, 'rivolta', id, s.day) < 0.04) {
      const free = own.filter((p) => !s.units.some((u) => u.nation === tag && u.location === p) && p !== s.nations[tag].capital);
      if (free.length) {
        const p = free[Math.floor(rand(s.seed, 'rivolta-p', id, s.day) * free.length)];
        s.owner[p] = NOBODY; s.controller[p] = NOBODY;
        ad.resistance -= 10;
        emit(w, { type: 'colonial', nations: [tag], province: p, text: `Rivolta a ${w.map.provinces[p].name} (${seed.name}): l'autorità ${di(w, tag)} crolla, serve una spedizione.` }, sink);
      }
    }
  }
}

export function setPolicy(w: World, id: string, key: 'culto' | 'economia' | 'rappresentanza', value: string): string | null {
  const ad = colonial(w).admin[id];
  if (!ad) return 'colonia non trovata';
  (ad as unknown as Record<string, string>)[key] = value;
  return null;
}

// --- IA ---

/** Le potenze con un programma perseguono i loro interessi; null se la nazione non ne ha. */
export function aiColonial(w: World, sink: GameEvent[]) {
  const s = w.state, c = colonial(w);
  for (const tag of COLONIAL_POWERS) {
    if (tag === s.player || !s.nations[tag]?.alive) continue;
    if (warsOf(s, tag).length) continue;
    const units = s.units.filter((u) => u.nation === tag);
    if (units.some((u) => u.orders.some((o) => o.label === 'spedizione'))) continue;
    const list = available(w, tag).filter((x) => actionsFor(w, x).length);
    if (!list.length) continue;
    const y = year(w);
    const score = (x: InterestSeed) => x.weight * (1 - progress(w, x)) * (!x.window || mode(w) === 'libero' ? 0.6 : y < x.window[0] ? 0.25 : y <= x.window[1] ? 2 : 0.8)
      * ((c.cooldown[`${tag}|${x.id}`] ?? -1) > s.day ? 0.1 : 1);
    // scelta pesata: non sempre lo stesso obiettivo
    const sc = list.map((x) => ({ x, v: score(x) })).sort((a, b) => b.v - a.v || a.x.id.localeCompare(b.x.id));
    const tot = sc.reduce((a, b) => a + b.v, 0);
    let r = rand(s.seed, 'scelta-coloniale', tag, s.turn) * tot;
    let best = sc[0].x;
    for (const e of sc) { r -= e.v; if (r <= 0) { best = e.x; break; } }
    const inWindow = !best.window || (y >= best.window[0] - 1);
    if (rand(s.seed, 'colonia', tag, s.turn) > (inWindow ? 0.08 : 0.02) * Math.min(1.5, 0.5 + best.weight)) continue;
    const acts = actionsFor(w, best);
    // prima la diplomazia (protettorato, acquisto, assenso) se ha buone possibilità, poi le spedizioni, la guerra per ultima
    const diplo = acts.filter((a) => a.path === 'protettorato' || a.path === 'acquisto' || a.path === 'assenso').map((a) => ({ a, ev: evaluate(w, a) })).filter((x) => x.ev.ok && s.nations[tag].treasury > x.ev.cost + 20);
    if (diplo.length && (c.cooldown[`${tag}|*`] ?? -1) <= s.day) {
      if (!execute(w, diplo.sort((p, q) => q.ev.score - q.ev.need - (p.ev.score - p.ev.need))[0].a, sink)) c.cooldown[`${tag}|*`] = s.day + 26 * 7; // un trattato ogni sei mesi circa
      continue;
    }
    const occ = acts.find((a) => a.path === 'occupazione');
    if (occ && occ.path === 'occupazione' && sendExpedition(w, tag, occ.provinces, sink)) continue;
    // guerra: solo contro uno Stato debole, senza protettori, che le nostre truppe possono raggiungere; una volta ogni cinque anni
    const war = acts.find((a) => a.path === 'guerra' && warOk(w, tag, a.against));
    if (war && war.path === 'guerra' && y >= (best.window?.[0] ?? 0) && rand(s.seed, 'guerra-coloniale', tag, s.turn) < 0.2) {
      c.cooldown[`${tag}|${war.against}|guerra`] = s.day + 5 * 365;
      declareWar(w, tag, war.against, `impresa coloniale: ${best.name}`, sink);
      continue;
    }
    c.cooldown[`${tag}|${best.id}`] = s.day + 52 * 7; // nessuna via percorribile: per un anno pesa poco
  }
}

function warOk(w: World, tag: Tag, t: Tag): boolean {
  const s = w.state, c = colonial(w);
  if (w.profiles[t]?.major || (subjectOf(w, t) && subjectOf(w, t)!.level !== 'tributario') || (c.cooldown[`${tag}|${t}|guerra`] ?? -1) > s.day) return false;
  if ((w.profiles[t]?.friends ?? []).some((f) => f !== tag && w.profiles[f]?.major && s.nations[f]?.alive)) return false;
  if (army(w, t) > army(w, tag) * 0.25) return false;
  // truppe nostre a tre passi dalle sue terre
  const theirs: number[] = [];
  for (let p = 0; p < w.map.size; p++) if (s.owner[p] === t) theirs.push(p);
  const h = w.map.hops(theirs, () => true, 3);
  return s.units.some((u) => u.nation === tag && h[u.location] >= 0);
}

/** Una spedizione verso la terra di nessuno più preziosa e vicina fra quelle indicate. */
export function sendExpedition(w: World, tag: Tag, targets: number[], sink: GameEvent[]): boolean {
  const s = w.state;
  const idle = s.units.filter((u) => u.nation === tag && !u.inBattle && !u.recovering && !u.orders.length && !u.move);
  if (!idle.length) return false;
  const tset = new Set(targets);
  const cap = s.nations[tag].capital;
  const abroad = idle.filter((u) => tset.has(u.location) || w.map.adj[u.location].some((e) => tset.has(e.to)) || s.owner[u.location] !== tag);
  const pool = abroad.length ? abroad : idle.filter((u) => u.location !== cap || idle.length === 1);
  const unit = [...pool].sort((a, b) => a.strength - b.strength)[0];
  if (!unit) return false;
  const [ux, uy] = w.map.provinces[unit.location].c;
  const val = (p: number) => { const pv = w.map.provinces[p]; return (1 + Math.log10(pv.pop + 1000) / 2) * (pv.coast ? 1.3 : 1); };
  const cand = targets.map((p) => { const [x, y] = w.map.provinces[p].c; return { p, sc: val(p) / (1 + Math.hypot(x - ux, y - uy) / 800) }; }).sort((a, b) => b.sc - a.sc).slice(0, 4);
  let best: { p: number; v: number } | null = null;
  for (const c of cand) {
    const plan = planPath(w, unit, c.p, false);
    if (!plan || plan.days > 80) continue;
    const v = val(c.p) / (1 + plan.days / 20);
    if (!best || v > best.v) best = { p: c.p, v };
  }
  if (!best) return false;
  unit.orders = [{ type: 'move', target: best.p, status: 'pending', label: 'spedizione' }];
  emit(w, { type: 'expedition', nations: [tag], province: best.p, text: `${The(w, tag)} manda una spedizione verso ${w.map.provinces[best.p].name}.` }, sink);
  return true;
}

// --- la crisi egiziana ---

const MAHDI_A = ['Kordofan', 'El Obeid', 'Monti Nuba', 'Talodi', 'Duem', 'Dara', 'Darà', 'El Fasher', 'Kebkabiya egiziana', 'Shakka', 'Bahr el-Ghazal', 'Dem Zubeir', 'Rumbek'];
const MAHDI_B = ['Sennar', 'Uad Medani', 'Fazogli', 'Gallabat', 'Berber', 'Tokar', 'Khartum (ovest)'];
const MAHDI_C = ['Khartum', 'Dongola', 'Taka', 'Cassala'];
const EQUATORIA = ['Equatoria', 'Lado', 'Bor', 'Rohl', 'Sobat', 'Fascioda'];
const LIQUIDATION = ['Massaua', 'Zula', 'Bogos', 'Sahel', 'Barca', 'Zeila', 'Berbera', 'Harar', 'Gildessa', 'Beni Shangul'];
const HARAR = ['Harar', 'Gildessa'];

function byNames(w: World, names: string[], owner?: Tag): number[] {
  const set = new Set(names);
  return w.map.provinces.filter((p) => (set.has(p.name) || names.some((n) => p.name.startsWith(`${n} (`))) && (owner === undefined || w.state.owner[p.id] === owner)).map((p) => p.id);
}

/** Una nazione nasce in partita (Stato mahdista, emirato di Harar). */
export function spawnNation(w: World, tag: Tag, provinces: number[], sink: GameEvent[], army = true) {
  const s = w.state, pr = w.profiles[tag];
  for (const p of provinces) {
    s.owner[p] = tag; s.controller[p] = tag;
    for (const u of s.units) if (u.location === p && u.nation !== tag) relocate(w, u);
  }
  if (!s.nations[tag]?.alive) {
    const pop = popOf(w, provinces);
    const capProv = w.map.locate(pr.capital[0], pr.capital[1]);
    const capital = capProv !== null && provinces.includes(capProv) ? capProv : [...provinces].sort((a, b) => w.map.provinces[b].pop - w.map.provinces[a].pop)[0];
    const n: NationState = {
      tag, treasury: Math.round((pop / 1e6) * 3), debt: 0, manpower: Math.round(pop * 0.005), stability: Math.round(pr.cohesion * 0.6 + 30), warExhaustion: 0, rail: 0,
      opinion: {}, policies: { tax: 'normal', mobilization: 'peace', infrastructure: 'normal', press: 'guided' }, capital, alive: true, turnLosses: 0,
    };
    s.nations[tag] = n;
    for (const t of Object.keys(s.nations)) if (t !== tag) { s.nations[t].opinion[tag] ??= 0; n.opinion[t] = 0; }
    for (const r of pr.rivals) if (s.nations[r]) { n.opinion[r] = -60; s.nations[r].opinion[tag] = -50; }
    if (army) placeArmies(w, tag);
  }
  void sink;
}

function transfer(w: World, ids: number[], to: Tag) {
  const s = w.state;
  for (const p of ids) {
    s.owner[p] = to; s.controller[p] = to;
    for (const u of s.units) if (u.location === p && u.nation !== to) relocate(w, u);
  }
}

function weeklyEgypt(w: World, sink: GameEvent[]) {
  const s = w.state, c = colonial(w), e = c.egypt;
  const egy = s.nations.EGY, player = s.player;
  if (!egy?.alive || !w.profiles.MAH) return;
  const j = (k: string) => Math.round(rand(s.seed, 'egitto', k) * 90) - 45;
  const at = (d: number, k: string) => s.day >= d + j(k);
  if (e.stage === 0 && at(175, 'mahdi')) {
    e.stage = 1;
    s.situations.push({ id: 'mahdi', title: 'La rivolta del Mahdi', startDay: s.day, nations: ['EGY', 'GBR', 'ETH'], summary: 'Sull\'isola di Aba, nel Nilo Bianco, Muhammad Ahmad si proclama Mahdi e chiama alla guerra santa contro il governo egiziano del Sudan, odiato per le tasse e i funzionari stranieri.' });
    emit(w, { type: 'colonial', nations: ['EGY'], text: 'Sudan: Muhammad Ahmad si proclama Mahdi e chiama alla rivolta contro il governo egiziano.' }, sink);
  }
  if (e.stage === 1 && at(555, 'urabi')) {
    e.stage = 2;
    if (s.nations.GBR?.alive && player !== 'GBR' && player !== 'EGY' && !warsOf(s, 'GBR').length && !warsOf(s, 'EGY').length) {
      s.subjects = subjects(w).filter((x) => x.subject !== 'EGY');
      s.subjects.push({ subject: 'EGY', overlord: 'GBR', level: 'vassallo', liberty: 55, since: s.day });
      changeOpinion(s, 'TUR', 'GBR', -15); changeOpinion(s, 'FRA', 'GBR', -10);
      emit(w, { type: 'colonial', nations: ['EGY', 'GBR'], text: 'Egitto: dopo la rivolta di Urabi e il bombardamento di Alessandria, Wolseley vince a Tel el-Kebir. L\'Egitto resta del chedivè, ma lo governano gli inglesi.' }, sink);
      checkCompletions(w, sink);
    }
  }
  if (e.stage === 2 && at(740, 'obeid')) {
    e.stage = 3;
    const ids = byNames(w, MAHDI_A, 'EGY');
    if (!ids.length) return;
    spawnNation(w, 'MAH', ids, sink);
    s.situations = s.situations.map((x) => x.id === 'mahdi' ? { ...x, summary: 'I mahdisti hanno preso El Obeid e distrutto l\'esercito di Hicks: il Kordofan e il Darfur sono perduti per l\'Egitto.' } : x);
    emit(w, { type: 'colonial', nations: ['EGY', 'MAH'], text: 'Sudan: i mahdisti prendono El Obeid; il Kordofan, il Darfur e il Bahr el-Ghazal passano al Mahdi.' }, sink);
    if (player === 'EGY') declareWar(w, 'MAH', 'EGY', 'guerra santa del Mahdi', sink);
  }
  if (player === 'EGY') return; // l'Egitto del giocatore combatte la sua guerra
  if (e.stage === 3 && at(1100, 'sennar')) {
    e.stage = 4;
    if (s.nations.MAH?.alive) { transfer(w, byNames(w, MAHDI_B, 'EGY'), 'MAH'); emit(w, { type: 'colonial', nations: ['EGY', 'MAH'], text: 'Sudan: Gordon torna a Khartum per evacuare le guarnigioni; Sennar, Berber e Tokar cadono in mano ai mahdisti.' }, sink); }
  }
  if (e.stage === 4 && at(1480, 'khartum')) {
    e.stage = 5;
    if (s.nations.MAH?.alive) transfer(w, byNames(w, MAHDI_C, 'EGY'), 'MAH');
    transfer(w, byNames(w, EQUATORIA, 'EGY'), NOBODY);
    const liq = byNames(w, LIQUIDATION, 'EGY');
    c.liquidating = { provinces: liq, until: s.day + 540 };
    s.situations = s.situations.map((x) => x.id === 'mahdi' ? { ...x, title: 'Il ritiro egiziano', summary: 'Khartum è caduta e Gordon è morto. L\'Egitto lascia il Sudan e non può più tenere la costa: Massaua, il Bogos, Zeila, Berbera e l\'Harar sono in liquidazione. Chi ha interessi nella regione può chiedere di subentrare.' } : x);
    emit(w, { type: 'colonial', nations: ['EGY', 'MAH', 'GBR', 'ITA', 'FRA'], text: 'Cade Khartum, muore Gordon. L\'Egitto si ritira dal Sudan; i suoi possedimenti del Mar Rosso e dell\'Harar sono in liquidazione: chi vuole subentrare deve chiederlo.' }, sink);
  }
  if (e.stage === 5 && c.liquidating && s.day >= c.liquidating.until) {
    e.stage = 6;
    const left = c.liquidating.provinces.filter((p) => s.owner[p] === 'EGY');
    const zb = byNames(w, ['Zeila', 'Berbera'], 'EGY').filter((p) => left.includes(p));
    if (zb.length && s.nations.GBR?.alive && player !== 'GBR') transfer(w, zb, 'GBR');
    const hr = byNames(w, HARAR, 'EGY').filter((p) => left.includes(p));
    if (hr.length && w.profiles.HAR) spawnNation(w, 'HAR', hr, sink);
    transfer(w, byNames(w, ['Beni Shangul'], 'EGY'), NOBODY);
    c.liquidating = undefined;
    emit(w, { type: 'colonial', nations: ['EGY', 'GBR'], text: `Fine della liquidazione egiziana: ${zb.length && player !== 'GBR' ? 'Zeila e Berbera agli inglesi, ' : ''}${hr.length ? 'l\'Harar torna emirato, ' : ''}il resto rimane all'Egitto.` }, sink);
    checkCompletions(w, sink);
  }
}

/** Fine settimana. */
export function weeklyColonial(w: World, sink: GameEvent[]) {
  colonial(w);
  weeklyEgypt(w, sink);
  checkCompletions(w, sink);
  weeklyDecisions(w, sink);
  weeklyAdmin(w, sink);
  aiColonial(w, sink);
}
