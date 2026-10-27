// Politica interna: partiti o fazioni, governo, fiducia, elezioni e crisi. Tutto nel motore.
//
// Niente regole rigide: sotto la soglia di fiducia del suo regime un governo non cade di colpo,
// ma ogni settimana rischia una crisi, con probabilità che cresce quanto più la fiducia è bassa.
// Nella crisi il giocatore sceglie la via d'uscita (elezioni anticipate, nuovo governo, decreto,
// epurazione…); le nazioni non giocanti e il giocatore che non sceglie seguono il motore.

import { dayOf, genericPolitics, POLITICS, type Program, type Regime } from '../scenario/politics1881';
import type { GameEvent, Tag } from './types';
import { clamp, emit, formatDate, rand, warsOf, type World } from './world';

export interface Party {
  id: string;
  name: string;
  program: Program;
  axis: number;
  leaders: string[];
  /** seggi (o peso a corte) all'ultima elezione, % */
  seats: number;
  /** consenso attuale nel paese, % */
  pop: number;
}

export type CrisisOption = 'reshuffle' | 'dissolve' | 'resist' | 'decree' | 'concede' | 'purge';

export interface PoliticsState {
  regime: Regime;
  parties: Party[];
  gov: string[];
  head: string;
  fixedHead?: boolean;
  crown?: boolean;
  managed?: number;
  majoritarian?: boolean;
  term?: number;
  nextElection: number | null;
  /** fiducia nel governo 0-100 */
  confidence: number;
  /** slancio di un governo nuovo, cala di uno a settimana */
  honeymoon: number;
  /** niente nuove crisi prima di questo giorno */
  calmUntil: number;
  /** governo per decreto fino a questo giorno */
  decreeUntil?: number;
  crisis?: { day: number; options: CrisisOption[] };
  since: number;
}

export const REGIME_LABEL: Record<Regime, string> = { parliamentary: 'parlamentare', constitutional: 'monarchia costituzionale (il governo risponde alla Corona)', autocracy: 'autocrazia (fazioni di corte)' };
/** sotto questa fiducia il governo rischia la crisi */
export const THRESHOLD: Record<Regime, number> = { parliamentary: 50, constitutional: 35, autocracy: 30 };

export const OPTION_LABEL: Record<CrisisOption, [string, string]> = {
  reshuffle: ['Nuovo governo dalla stessa Camera', 'si forma la maggioranza possibile con i seggi attuali; stabilità −1'],
  dissolve: ['Elezioni anticipate', 'si vota fra quattro settimane; stabilità −2'],
  resist: ['Restare in carica', 'il governo tira avanti; stabilità −4, la crisi può tornare presto'],
  decree: ['Governare per decreto', 'la Corona scavalca il parlamento per sei mesi; stabilità −6, cresce l\'opposizione'],
  concede: ['Cedere: governo della maggioranza', 'la Corona nomina un governo gradito alla Camera (o alla fazione più forte); stabilità +1'],
  purge: ['Epurare gli avversari', 'la fazione al potere si rafforza; stabilità −5'],
};

/** Effetti dei programmi dei partiti al governo (pesati sulla loro quota nella maggioranza). */
export const PROGRAM_EFFECTS: Record<Program, { income?: number; stability?: number; exhaustion?: number; upkeep?: number; rail?: number; label: string }> = {
  liberale: { income: 1.03, rail: 0.02, label: 'libero scambio e conti in ordine: entrate +3%, ferrovie più rapide' },
  conservatore: { stability: 2, upkeep: 0.97, label: 'ordine e prudenza: stabilità +2, esercito −3% di costi' },
  clericale: { stability: 3, income: 0.98, label: 'pace religiosa: stabilità +3, entrate −2%' },
  radicale: { stability: -1, exhaustion: 1.15, income: 1.02, label: 'riforme sociali: entrate +2%, stabilità −1, la guerra pesa di più (+15%)' },
  socialista: { stability: -2, exhaustion: 1.3, label: 'stabilità −2, la guerra pesa molto di più' },
  nazionalista: { exhaustion: 0.85, upkeep: 1.05, label: 'spirito nazionale: stanchezza di guerra −15%, esercito +5% di costi' },
  minoranze: { stability: -1, label: 'autonomie: stabilità −1' },
  agrario: { income: 0.98, stability: 1, label: 'campagne tutelate: stabilità +1, entrate −2%' },
  corte: { stability: 1, label: 'continuità: stabilità +1' },
  riformista: { rail: 0.04, stability: -1, income: 1.02, label: 'modernizzazione: ferrovie più rapide, entrate +2%, stabilità −1' },
  reazionario: { stability: 3, income: 0.97, exhaustion: 0.9, label: 'pugno di ferro: stabilità +3, entrate −3%, stanchezza −10%' },
  panslavista: { exhaustion: 0.85, upkeep: 1.05, label: 'missione slava: stanchezza di guerra −15%, esercito +5% di costi' },
  tradizionalista: { stability: 2, income: 0.97, label: 'tradizione: stabilità +2, entrate −3%' },
};

const EXTREME = new Set<Program>(['radicale', 'socialista', 'minoranze']);
const HAWK = new Set<Program>(['nazionalista', 'panslavista', 'reazionario']);
const DOVE = new Set<Program>(['radicale', 'socialista', 'liberale', 'agrario']);
const LIBERAL_PRESS = new Set<Program>(['liberale', 'radicale', 'socialista', 'riformista']);
const ORDER_PRESS = new Set<Program>(['conservatore', 'reazionario', 'corte', 'clericale', 'tradizionalista']);

/** Stato politico di una nazione (creato dai dati d'epoca la prima volta, anche nei salvataggi vecchi). */
export function politicsOf(w: World, tag: Tag): PoliticsState | null {
  const s = w.state;
  const pr = w.profiles[tag];
  if (!pr || pr.micro || tag === 'NUL') return null;
  s.politics ??= {};
  if (s.politics[tag]) return s.politics[tag];
  const seed = POLITICS[tag] ?? genericPolitics(pr.government, pr.leader.split(';')[0]);
  const ps: PoliticsState = {
    regime: seed.regime,
    parties: seed.parties.map((x) => ({ id: x.id, name: x.name, program: x.program, axis: x.axis, leaders: [...x.leaders], seats: x.share, pop: x.share })),
    gov: [...seed.gov], head: seed.head, fixedHead: seed.fixedHead, crown: seed.crown, managed: seed.managed, majoritarian: seed.majoritarian, term: seed.term,
    nextElection: seed.regime !== 'autocracy' && seed.election ? Math.max(7, dayOf(...seed.election)) : null,
    confidence: 0, honeymoon: 0, calmUntil: 0, since: 0,
  };
  ps.confidence = confidence(w, tag, ps);
  s.politics[tag] = ps;
  return ps;
}

const share = (ps: PoliticsState, ids: string[], k: 'seats' | 'pop') => ps.parties.filter((p) => ids.includes(p.id)).reduce((a, p) => a + p[k], 0);

/** Effetti combinati del programma di governo. */
export function govEffects(w: World, tag: Tag) {
  const ps = politicsOf(w, tag);
  const out = { income: 1, stability: 0, exhaustion: 1, upkeep: 1, rail: 0 };
  if (!ps) return out;
  const gov = ps.parties.filter((p) => ps.gov.includes(p.id));
  const tot = gov.reduce((a, p) => a + Math.max(1, p.seats), 0) || 1;
  for (const p of gov) {
    const e = PROGRAM_EFFECTS[p.program], k = Math.max(1, p.seats) / tot;
    out.income += ((e.income ?? 1) - 1) * k; out.stability += (e.stability ?? 0) * k; out.exhaustion += ((e.exhaustion ?? 1) - 1) * k; out.upkeep += ((e.upkeep ?? 1) - 1) * k; out.rail += (e.rail ?? 0) * k;
  }
  // fiducia: un governo forte rafforza lo Stato, uno debole lo logora
  out.stability += clamp((ps.confidence - THRESHOLD[ps.regime]) * 0.12, -6, 4);
  return out;
}

/** Quanto la linea politica attuale piace ai partiti di governo (stampa, imposte, mobilitazione). */
function policyMood(w: World, tag: Tag, ps: PoliticsState): number {
  const pol = w.state.nations[tag].policies;
  let m = 0;
  for (const p of ps.parties.filter((x) => ps.gov.includes(x.id))) {
    const k = p.seats / Math.max(1, share(ps, ps.gov, 'seats'));
    if (pol.press === 'censored') m += (LIBERAL_PRESS.has(p.program) ? -6 : ORDER_PRESS.has(p.program) ? 2 : 0) * k;
    if (pol.press === 'free') m += (LIBERAL_PRESS.has(p.program) ? 2 : ORDER_PRESS.has(p.program) ? -3 : 0) * k;
    if (pol.mobilization === 'full' && !warsOf(w.state, tag).length) m += (HAWK.has(p.program) ? 2 : DOVE.has(p.program) ? -5 : -2) * k;
    if (pol.infrastructure === 'heavy') m += (p.program === 'liberale' || p.program === 'riformista' ? 2 : 0) * k;
  }
  if (pol.tax === 'high') m -= 3;
  return m;
}

/** Fiducia: peso della maggioranza in parlamento (o a corte), corretto dall'umore del paese. */
export function confidence(w: World, tag: Tag, ps: PoliticsState): number {
  const seats = share(ps, ps.gov, 'seats'), pop = share(ps, ps.gov, 'pop');
  const n = w.state.nations[tag];
  let c = seats + (pop - seats) * 0.7 + policyMood(w, tag, ps) + ps.honeymoon;
  if (ps.regime === 'autocracy') c += (n.stability - 50) * 0.2; // a corte conta l'ordine nel paese
  return clamp(Math.round(c * 10) / 10, 0, 100);
}

/** Consenso: ogni settimana i partiti si muovono verso un obiettivo che dipende dallo stato del paese. */
function drift(w: World, tag: Tag, ps: PoliticsState) {
  const s = w.state, n = s.nations[tag];
  const war = warsOf(s, tag).length > 0;
  const deficit = (n.lastBudget?.net ?? 0) < 0;
  const censored = n.policies.press === 'censored';
  const target = ps.parties.map((p) => {
    let t = p.seats;
    if (ps.gov.includes(p.id)) {
      t -= n.warExhaustion * 0.25 + Math.max(0, 50 - n.stability) * 0.2 + (deficit ? 3 : 0) + (n.policies.tax === 'high' ? 3 : n.policies.tax === 'low' ? -2 : 0);
      t += ps.honeymoon * 0.3;
      t -= Math.min(10, ((s.day - ps.since) / 365) * 3); // logoramento del potere
    }
    t += (rand(s.seed, 'umore', tag, p.id, Math.floor(s.day / 91)) - 0.5) * 8; // umori del paese, cambiano ogni stagione
    if (EXTREME.has(p.program)) t += Math.max(0, 50 - n.stability) * 0.15;
    if (war && HAWK.has(p.program)) t += n.warExhaustion < 30 ? 3 : -n.warExhaustion * 0.05;
    if (war && DOVE.has(p.program) && !ps.gov.includes(p.id)) t += n.warExhaustion * 0.1;
    if (ps.decreeUntil && s.day < ps.decreeUntil && !ps.gov.includes(p.id)) t += 4;
    return Math.max(0.5, t);
  });
  const tt = target.reduce((a, b) => a + b, 0);
  const speed = censored ? 0.07 : 0.15;
  ps.parties.forEach((p, i) => { p.pop += ((target[i] / tt) * 100 - p.pop) * speed; });
  const tot = ps.parties.reduce((a, p) => a + p.pop, 0);
  ps.parties.forEach((p) => { p.pop = Math.round((p.pop / tot) * 1000) / 10; });
}

/** La coalizione più compatta che supera la metà dei seggi, partendo dal partito più grande. */
export function bestCoalition(ps: PoliticsState, k: 'seats' | 'pop' = 'seats'): string[] {
  const parties = [...ps.parties].sort((a, b) => b[k] - a[k]);
  const lead = parties[0];
  const gov = [lead.id];
  let tot = lead[k];
  const rest = parties.slice(1).filter((p) => p.program !== 'socialista').sort((a, b) => Math.abs(a.axis - lead.axis) - Math.abs(b.axis - lead.axis));
  for (const p of rest) { if (tot > 50) break; gov.push(p.id); tot += p[k]; }
  return tot > 50 ? gov : [lead.id];
}

function setGov(w: World, tag: Tag, ps: PoliticsState, gov: string[], sink: GameEvent[], why: string) {
  const s = w.state;
  const lead = ps.parties.find((p) => p.id === gov[0])!;
  const same = gov.length === ps.gov.length && gov.every((g) => ps.gov.includes(g));
  let head = ps.head;
  if (!ps.fixedHead) {
    if (same) { const i = lead.leaders.indexOf(ps.head); head = lead.leaders[(i + 1) % lead.leaders.length]; }
    else head = lead.leaders[0];
  }
  ps.gov = gov; ps.head = head; ps.honeymoon = 8; ps.since = s.day;
  ps.confidence = confidence(w, tag, ps);
  const names = gov.map((g) => ps.parties.find((p) => p.id === g)!.name).join(', ');
  emit(w, { type: 'government', nations: [tag], text: `${w.profiles[tag].name}: ${why}. Nuovo governo ${head}${ps.fixedHead ? '' : ` (${names})`}.` }, sink);
}

/** Elezioni: i seggi seguono il consenso, con premio al primo partito nei sistemi uninominali e ai governi che "fanno" le elezioni. */
export function holdElection(w: World, tag: Tag, ps: PoliticsState, sink: GameEvent[]) {
  const s = w.state;
  const raw = ps.parties.map((p) => p.pop + (ps.gov.includes(p.id) ? ps.managed ?? 0 : 0) + (rand(s.seed, 'elez', tag, s.day, p.id) - 0.5) * 4);
  const top = Math.max(...raw);
  const adj = raw.map((v) => Math.max(0.5, ps.majoritarian ? (v === top ? v * 1.15 : v * 0.95) : v));
  const tot = adj.reduce((a, b) => a + b, 0);
  ps.parties.forEach((p, i) => { p.seats = Math.round((adj[i] / tot) * 1000) / 10; p.pop = p.seats; });
  ps.nextElection = s.day + Math.round((ps.term ?? 4) * 365);
  ps.calmUntil = s.day + 8 * 7;
  ps.crisis = undefined;
  const res = [...ps.parties].sort((a, b) => b.seats - a.seats).map((p) => `${p.name} ${p.seats.toFixed(0)}%`).join(', ');
  emit(w, { type: 'election', nations: [tag], text: `Elezioni ${tag === s.player ? 'nel nostro paese' : `in ${w.profiles[tag].name}`}: ${res}.` }, sink);
  if (ps.regime === 'parliamentary') {
    const largest = [...ps.parties].sort((a, b) => b.seats - a.seats)[0];
    const gov = share(ps, ps.gov, 'seats') > 50 && ps.gov.includes(largest.id) ? ps.gov : bestCoalition(ps);
    const same = gov.length === ps.gov.length && gov.every((g) => ps.gov.includes(g));
    if (!same) setGov(w, tag, ps, gov, sink, 'il voto cambia la maggioranza');
    else { ps.honeymoon = 6; ps.confidence = confidence(w, tag, ps); }
  } else ps.confidence = confidence(w, tag, ps);
}

/** Opzioni di uscita da una crisi secondo il regime. */
export function crisisOptions(ps: PoliticsState): CrisisOption[] {
  if (ps.regime === 'autocracy') return ['concede', 'purge', 'resist'];
  if (ps.regime === 'constitutional') return ps.fixedHead ? ['dissolve', 'decree', 'resist'] : ['dissolve', 'concede', 'decree', 'resist'];
  return ps.crown ? ['reshuffle', 'dissolve', 'resist'] : ['reshuffle', 'dissolve', 'resist'];
}

/** Scelta del motore (nazioni non giocanti, o giocatore che non decide). */
export function defaultOption(w: World, tag: Tag, ps: PoliticsState): CrisisOption {
  if (ps.regime === 'autocracy') {
    const strongest = [...ps.parties].sort((a, b) => b.seats - a.seats)[0];
    return ps.gov.includes(strongest.id) || share(ps, ps.gov, 'seats') > strongest.seats * 0.6 ? 'purge' : 'concede';
  }
  // se ha appena votato, sciogliere di nuovo non serve: decreto (o, senza Corona, nuovo governo)
  const votedRecently = ps.nextElection !== null && ps.term !== undefined && ps.nextElection - w.state.day > (ps.term - 1) * 365;
  if (ps.regime === 'constitutional') return (ps.confidence < 25 || votedRecently) && ps.crown ? 'decree' : votedRecently && !ps.fixedHead ? 'concede' : 'dissolve';
  const alt = bestCoalition(ps);
  return share(ps, alt, 'seats') > 50 || votedRecently ? 'reshuffle' : 'dissolve';
}

/** Applica la scelta per uscire dalla crisi. */
export function resolveCrisis(w: World, tag: Tag, opt: CrisisOption, sink: GameEvent[] = []): string | null {
  const s = w.state, n = s.nations[tag];
  const ps = politicsOf(w, tag);
  if (!ps?.crisis) return 'non c\'è nessuna crisi di governo';
  if (!ps.crisis.options.includes(opt)) return 'scelta non possibile in questo regime';
  ps.crisis = undefined;
  ps.calmUntil = s.day + 6 * 7;
  const name = w.profiles[tag].name;
  switch (opt) {
    case 'reshuffle': n.stability = clamp(n.stability - 1, 0, 100); setGov(w, tag, ps, bestCoalition(ps), sink, 'crisi di governo, nuova maggioranza dalla stessa Camera'); break;
    case 'dissolve': n.stability = clamp(n.stability - 2, 0, 100); ps.nextElection = s.day + 28; ps.calmUntil = s.day + 35; emit(w, { type: 'crisis', nations: [tag], text: `${name}: Camere sciolte, elezioni anticipate il ${formatDate(s.day + 28)}.` }, sink); break;
    case 'resist': n.stability = clamp(n.stability - 4, 0, 100); ps.calmUntil = s.day + 3 * 7; ps.honeymoon += 3; emit(w, { type: 'crisis', nations: [tag], text: `${name}: il governo ${ps.head} resta in carica nonostante la crisi.` }, sink); break;
    case 'decree': n.stability = clamp(n.stability - 6, 0, 100); ps.decreeUntil = s.day + 26 * 7; ps.calmUntil = s.day + 26 * 7; emit(w, { type: 'crisis', nations: [tag], text: `${name}: la Corona governa per decreto, scavalcando il parlamento.` }, sink); break;
    case 'concede': {
      n.stability = clamp(n.stability + 1, 0, 100);
      const gov = ps.regime === 'autocracy' ? [[...ps.parties].sort((a, b) => b.seats - a.seats)[0].id] : bestCoalition(ps);
      const fixed = ps.fixedHead; ps.fixedHead = false;
      setGov(w, tag, ps, gov, sink, ps.regime === 'autocracy' ? 'il sovrano cambia linea' : 'la Corona nomina un governo gradito alla Camera');
      ps.fixedHead = fixed;
      break;
    }
    case 'purge': {
      n.stability = clamp(n.stability - 5, 0, 100);
      const rival = ps.parties.filter((p) => !ps.gov.includes(p.id)).sort((a, b) => b.seats - a.seats)[0];
      const mine = ps.parties.find((p) => p.id === ps.gov[0])!;
      if (rival) { const d = Math.min(12, rival.seats - 2); rival.seats -= d; rival.pop = Math.max(0.5, rival.pop - d); mine.seats += d; mine.pop += d; }
      ps.honeymoon = 5;
      emit(w, { type: 'crisis', nations: [tag], text: `${name}: epurazione a corte${rival ? `, colpiti i ${rival.name.toLowerCase()}` : ''}.` }, sink);
      break;
    }
  }
  ps.confidence = confidence(w, tag, ps);
  return null;
}

/** Probabilità settimanale di crisi: zero sopra soglia, poi cresce dolcemente. */
export function crisisChance(ps: PoliticsState): number {
  // rischio piccolo già 5 punti sopra la soglia, poi cresce: nessun crollo automatico
  const gap = THRESHOLD[ps.regime] + 5 - ps.confidence;
  if (gap <= 0) return 0;
  return Math.min(0.6, 0.25 * Math.pow(gap / 25, 1.5));
}

/** Fine settimana per tutte le nazioni. */
export function weeklyPolitics(w: World, sink: GameEvent[]) {
  const s = w.state;
  for (const tag of Object.keys(s.nations)) {
    if (!s.nations[tag].alive) continue;
    const ps = politicsOf(w, tag);
    if (!ps) continue;
    // crisi lasciata aperta dal giocatore: decide il motore
    if (ps.crisis && (tag !== s.player || s.day - ps.crisis.day >= 7)) resolveCrisis(w, tag, defaultOption(w, tag, ps), sink);
    drift(w, tag, ps);
    ps.honeymoon = Math.max(0, ps.honeymoon - 1);
    if (ps.decreeUntil && s.day >= ps.decreeUntil) ps.decreeUntil = undefined;
    if (ps.nextElection !== null && s.day >= ps.nextElection) holdElection(w, tag, ps, sink);
    ps.confidence = confidence(w, tag, ps);
    if (ps.crisis || s.day < ps.calmUntil || ps.decreeUntil) continue;
    const p = crisisChance(ps);
    if (p > 0 && rand(s.seed, 'crisi', tag, s.day) < p) {
      ps.crisis = { day: s.day, options: crisisOptions(ps) };
      const what = ps.regime === 'autocracy' ? 'crisi a corte: il governo perde il favore' : ps.regime === 'constitutional' ? 'il parlamento blocca il governo' : 'il governo perde la maggioranza';
      emit(w, { type: 'crisis', nations: [tag], text: `${w.profiles[tag].name}: ${what} (fiducia ${Math.round(ps.confidence)}).` }, sink);
    }
  }
}

/** Riepilogo leggibile (interfaccia e modello). */
export function politicsSummary(w: World, tag: Tag): string {
  const ps = politicsOf(w, tag);
  if (!ps) return 'nessuna vita politica';
  const gov = ps.gov.map((g) => ps.parties.find((p) => p.id === g)!.name).join(' + ');
  return `${REGIME_LABEL[ps.regime]}; governo ${ps.head} (${gov}), fiducia ${Math.round(ps.confidence)}/100 (soglia ${THRESHOLD[ps.regime]})${ps.crisis ? ', CRISI DI GOVERNO IN CORSO' : ''}${ps.decreeUntil ? ', si governa per decreto' : ''}${ps.nextElection !== null ? `; elezioni il ${formatDate(ps.nextElection)}` : ''}`;
}

/** Elezioni anticipate per scelta del governo (non in autocrazia, non a ridosso di un voto). */
export function callElection(w: World, tag: Tag, sink: GameEvent[] = []): string | null {
  const s = w.state;
  const ps = politicsOf(w, tag);
  if (!ps || ps.regime === 'autocracy' || ps.nextElection === null) return 'in questo regime non si vota';
  if (ps.nextElection - s.day <= 28) return 'le elezioni sono già vicine';
  if (ps.term !== undefined && ps.nextElection - s.day > (ps.term - 0.5) * 365) return 'si è votato da meno di sei mesi';
  s.nations[tag].stability = clamp(s.nations[tag].stability - 2, 0, 100);
  ps.nextElection = s.day + 28;
  ps.crisis = undefined;
  ps.calmUntil = s.day + 35;
  emit(w, { type: 'crisis', nations: [tag], text: `${w.profiles[tag].name}: il governo scioglie le Camere, si vota il ${formatDate(ps.nextElection)}.` }, sink);
  return null;
}
