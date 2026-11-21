// Politica interna: partiti o fazioni, governo, fiducia, elezioni e crisi. Tutto nel motore.
//
// Niente regole rigide: sotto la soglia di fiducia del suo regime un governo non cade di colpo,
// ma ogni settimana rischia una crisi, con probabilità che cresce quanto più la fiducia è bassa.
// Nella crisi il giocatore sceglie la via d'uscita (elezioni anticipate, nuovo governo, decreto,
// epurazione…); le nazioni non giocanti e il giocatore che non sceglie seguono il motore.

import { dayOf, genericPolitics, LEADER_YEARS, POLITICAL_EVENTS, POLITICS, type Program, type Regime } from '../scenario/politics1881';
import { MINISTERS } from '../scenario/ministers1881';
import { ministerEffects, reshuffleCabinet } from './ministers';
import { techEffects } from './research';
import { UNREST } from './economy';
import type { GameEvent, Tag } from './types';
import { clamp, dateOf, emit, formatDate, rand, warsOf, type World } from './world';

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
  /** ultima via d'uscita scelta in una crisi: dopo un decreto la Corona cede (corte 05, capo 3) */
  lastOption?: CrisisOption;
  crisis?: { day: number; options: CrisisOption[] };
  since: number;
}

export const REGIME_LABEL: Record<Regime, string> = { parliamentary: 'parlamentare', constitutional: 'monarchia costituzionale (il governo risponde alla Corona)', autocracy: 'autocrazia (fazioni di corte)', presidential: 'repubblica presidenziale (mandato fisso)' };
/** sotto questa fiducia il governo rischia la crisi (il presidente non ne ha: il mandato è fisso) */
export const THRESHOLD: Record<Regime, number> = { parliamentary: 50, constitutional: 35, autocracy: 30, presidential: 0 };

const yearOf = (w: World) => dateOf(w.state.day).getUTCFullYear();

/**
 * Un capo può guidare il governo quest'anno? (corte 05, capo 2: prima Gambetta, morto nel 1882, governava nel 1885 e
 * Bismarck nel 1899). Gli anni vengono dalla scheda del ministro o da `LEADER_YEARS`; un nome senza anni si considera
 * attivo per dieci anni, fino al 1890. I nomi che cominciano in minuscolo sono cariche o gruppi («lo Şeyhülislam»,
 * «i notabili»): non muoiono.
 */
export function leaderActive(w: World, tag: Tag, name: string): boolean {
  if (!name || name[0] === name[0].toLowerCase()) return true;
  const y = yearOf(w);
  const sheet = MINISTERS.find((x) => x.nation === tag && x.name === name);
  const years = sheet?.years ?? LEADER_YEARS[`${tag}:${name}`] ?? [1881, 1890];
  return y >= years[0] && y <= years[1];
}

/**
 * Chi guida il governo: per la Corona che sceglie il capo (`fixedHead`) un capo con scheda e senza partito o del
 * governo; altrimenti il primo capo attivo del partito che guida la maggioranza, poi un capo con scheda di quel
 * partito, infine «un notabile» del partito. `after`: si comincia dal capo dopo questo (rimpasto).
 */
function pickHead(w: World, tag: Tag, ps: PoliticsState, gov: string[], after?: string): string {
  const y = yearOf(w);
  const sheets = MINISTERS.filter((x) => x.nation === tag && x.portfolios.includes('capo') && y >= x.years[0] && y <= x.years[1]);
  if (ps.fixedHead) return sheets.find((x) => !x.party || gov.includes(x.party))?.name ?? 'un uomo della Corona';
  const lead = ps.parties.find((p) => p.id === gov[0])!;
  const active = lead.leaders.filter((n) => leaderActive(w, tag, n));
  if (active.length) {
    const i = after ? active.indexOf(after) : -1;
    return active[(i + 1) % active.length];
  }
  return sheets.find((x) => x.party === lead.id)?.name ?? `un notabile del partito (${lead.name})`;
}

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
  // le nazioni senza dati propri votano in date sfalsate (corte 05, capo 5): prima 17 nazioni votavano tutte il
  // 1° giugno 1883
  const spread = !POLITICS[tag] && seed.election ? Math.floor(rand(s.seed, 'prima elezione', tag) * (seed.term ?? 4) * 365) : 0;
  const ps: PoliticsState = {
    regime: seed.regime,
    parties: seed.parties.map((x) => ({ id: x.id, name: x.name, program: x.program, axis: x.axis, leaders: [...x.leaders], seats: x.share, pop: x.share })),
    gov: [...seed.gov], head: seed.head, fixedHead: seed.fixedHead, crown: seed.crown, managed: seed.managed, majoritarian: seed.majoritarian, term: seed.term,
    nextElection: seed.regime !== 'autocracy' && seed.election ? Math.max(7, dayOf(...seed.election) + spread) : null,
    confidence: 0, honeymoon: 0, calmUntil: 0, since: 0,
  };
  s.politics[tag] = ps;
  ps.confidence = confidence(w, tag, ps);
  return ps;
}

const share = (ps: PoliticsState, ids: string[], k: 'seats' | 'pop') => ps.parties.filter((p) => ids.includes(p.id)).reduce((a, p) => a + p[k], 0);

/** Effetti combinati del programma di governo. */
export function govEffects(w: World, tag: Tag) {
  const ps = politicsOf(w, tag);
  const out = { income: 1, stability: 0, exhaustion: 1, upkeep: 1, rail: 0, manpower: 1, interest: 1, quality: 1 };
  if (!ps) return out;
  const me = ministerEffects(w, tag);
  out.income *= me.income; out.stability += me.stability; out.exhaustion *= me.exhaustion; out.upkeep *= me.upkeep; out.rail += me.rail;
  out.manpower *= me.manpower; out.interest *= me.interest; out.quality *= me.quality;
  const te = techEffects(w, tag);
  out.income *= te.income; out.stability += te.stability; out.exhaustion *= te.exhaustion; out.upkeep *= te.upkeep; out.manpower *= te.manpower; out.quality *= te.quality;
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
  // con le elezioni «fatte» (encasillado, rotativismo) conta la Camera più del paese (fase C: altrimenti il governo
  // spagnolo, con il 70% dei seggi e il 40% del consenso, era sempre in crisi e il turno girava ogni anno)
  const opinion = (POLITICS[tag]?.managed ?? 0) >= 20 ? 0.3 : 0.7;
  let c = seats + (pop - seats) * opinion + policyMood(w, tag, ps) + ps.honeymoon + ministerEffects(w, tag).confidence;
  // a corte conta l'ordine nel paese: con peso 0,5 una Russia a stabilità 0 perde 25 punti e la crisi diventa
  // possibile (corte 05, capo 3: con 0,2 la Russia a stabilità 0 restava sopra la soglia e non aveva mai crisi)
  if (ps.regime === 'autocracy') c += (n.stability - 50) * 0.5;
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
  void lead;
  // solo capi vivi e in attività (corte 05, capo 2); in un rimpasto si passa al capo successivo
  const head = ps.fixedHead && leaderActive(w, tag, ps.head) ? ps.head : pickHead(w, tag, ps, gov, same && !ps.fixedHead && ps.regime !== 'presidential' ? ps.head : undefined);
  // stessa maggioranza e stesso capo: un rimpasto, non un nuovo governo (prima il conteggio dei governi li contava)
  if (same && head === ps.head) {
    ps.honeymoon = Math.max(ps.honeymoon, 4); ps.since = s.day;
    reshuffleCabinet(w, tag);
    ps.confidence = confidence(w, tag, ps);
    emit(w, { type: 'crisis_end', nations: [tag], text: `${w.profiles[tag].name}: ${why}; rimpasto, il governo ${head} resta.` }, sink);
    return;
  }
  ps.gov = gov; ps.head = head; ps.honeymoon = 8; ps.since = s.day;
  reshuffleCabinet(w, tag);
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
  // il consenso si avvicina ai seggi di un quarto, non li copia (corte 05, capo 4): prima i seggi «fatti» dal governo
  // (encasillado, prefetti) diventavano il consenso del paese, e il voto successivo li ingrandiva ancora
  // con il rinnovo di metà Camera (Paesi Bassi, Belgio) i seggi si muovono solo per metà verso il risultato (fase C,
  // corte 05: con la legislatura di due anni ogni voto rifaceva la Camera da capo e i governi cadevano ogni due anni)
  const half = POLITICS[tag]?.halfRenewal;
  ps.parties.forEach((p, i) => { const v = (adj[i] / tot) * 100; p.seats = Math.round((half ? (p.seats + v) / 2 : v) * 10) / 10; p.pop = Math.round((p.pop + (p.seats - p.pop) * 0.25) * 10) / 10; });
  // il mandato presidenziale ha una scadenza fissa: si conta dalla data prevista, non dal giorno del voto
  ps.nextElection = ps.regime === 'presidential' && ps.nextElection !== null ? ps.nextElection + Math.round((ps.term ?? 4) * 365.25) : s.day + Math.round((ps.term ?? 4) * 365);
  ps.calmUntil = s.day + 8 * 7;
  delete ps.crisis;
  const res = [...ps.parties].sort((a, b) => b.seats - a.seats).map((p) => `${p.name} ${p.seats.toFixed(0)}%`).join(', ');
  emit(w, { type: 'election', nations: [tag], text: `Elezioni ${tag === s.player ? 'nel nostro paese' : `in ${w.profiles[tag].name}`}: ${res}.` }, sink);
  if (ps.regime === 'parliamentary') {
    const largest = [...ps.parties].sort((a, b) => b.seats - a.seats)[0];
    const gov = share(ps, ps.gov, 'seats') > 50 && ps.gov.includes(largest.id) ? ps.gov : bestCoalition(ps);
    const same = gov.length === ps.gov.length && gov.every((g) => ps.gov.includes(g));
    if (!same) setGov(w, tag, ps, gov, sink, 'il voto cambia la maggioranza');
    else { ps.honeymoon = 6; ps.confidence = confidence(w, tag, ps); }
  } else if (ps.regime === 'presidential') {
    // si elegge il presidente: il partito più votato governa, col suo primo capo in attività
    const winner = [...ps.parties].sort((a, b) => b.seats - a.seats || (a.id < b.id ? -1 : 1))[0];
    const head = pickHead(w, tag, ps, [winner.id]);
    if (ps.gov[0] !== winner.id || head !== ps.head) setGov(w, tag, ps, [winner.id], sink, 'eletto un nuovo presidente');
    else { ps.honeymoon = 6; ps.confidence = confidence(w, tag, ps); }
  } else ps.confidence = confidence(w, tag, ps);
}

/** Opzioni di uscita da una crisi secondo il regime. */
export function crisisOptions(ps: PoliticsState): CrisisOption[] {
  if (ps.regime === 'autocracy') return ['concede', 'purge', 'resist'];
  if (ps.regime === 'constitutional') return ps.fixedHead ? ['dissolve', 'decree', 'resist'] : ['dissolve', 'concede', 'decree', 'resist'];
  if (ps.regime === 'presidential') return ['resist'];
  // una Corona parlamentare può anche nominare il governo che la Camera vuole (corte 05, capo 13: prima il ramo era
  // morto e le opzioni dell'Italia erano identiche a quelle della Francia)
  return ps.crown ? ['reshuffle', 'dissolve', 'concede', 'resist'] : ['reshuffle', 'dissolve', 'resist'];
}

/** Scelta del motore (nazioni non giocanti, o giocatore che non decide). */
export function defaultOption(w: World, tag: Tag, ps: PoliticsState): CrisisOption {
  if (ps.regime === 'autocracy') {
    const strongest = [...ps.parties].sort((a, b) => b.seats - a.seats)[0];
    return ps.gov.includes(strongest.id) || share(ps, ps.gov, 'seats') > strongest.seats * 0.6 ? 'purge' : 'concede';
  }
  // se ha appena votato, sciogliere di nuovo non serve: decreto (o, senza Corona, nuovo governo)
  const votedRecently = ps.nextElection !== null && ps.term !== undefined && ps.nextElection - w.state.day > (ps.term - 1) * 365;
  if (ps.regime === 'presidential') return 'resist';
  // dopo un decreto la Corona non ne firma un altro: cede alla Camera, o (se sceglie lei il capo) scioglie
  // (corte 05, capo 3: prima quattro crisi di fila davano quattro decreti e il governo non cambiava mai)
  if (ps.regime === 'constitutional' && ps.lastOption === 'decree') return ps.fixedHead ? 'dissolve' : 'concede';
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
  delete ps.crisis;
  ps.calmUntil = s.day + 6 * 7;
  ps.lastOption = opt;
  const name = w.profiles[tag].name;
  switch (opt) {
    case 'reshuffle': n.stability = clamp(n.stability - 1, 0, 100); setGov(w, tag, ps, bestCoalition(ps), sink, 'crisi di governo, nuova maggioranza dalla stessa Camera'); break;
    case 'dissolve': n.stability = clamp(n.stability - 2, 0, 100); ps.nextElection = s.day + 28; ps.calmUntil = s.day + 35; emit(w, { type: 'crisis_end', nations: [tag], text: `${name}: Camere sciolte, elezioni anticipate il ${formatDate(s.day + 28)}.` }, sink); break;
    case 'resist': n.stability = clamp(n.stability - 4, 0, 100); ps.calmUntil = s.day + 3 * 7; ps.honeymoon += 3; emit(w, { type: 'crisis_end', nations: [tag], text: `${name}: il governo ${ps.head} resta in carica nonostante la crisi.` }, sink); break;
    case 'decree': n.stability = clamp(n.stability - 6, 0, 100); ps.decreeUntil = s.day + 26 * 7; ps.calmUntil = s.day + 26 * 7; emit(w, { type: 'crisis_end', nations: [tag], text: `${name}: la Corona governa per decreto, scavalcando il parlamento.` }, sink); break;
    case 'concede': {
      n.stability = clamp(n.stability + 1, 0, 100);
      const gov = ps.regime === 'autocracy' ? [[...ps.parties].sort((a, b) => b.seats - a.seats)[0].id] : bestCoalition(ps);
      // la Corona nomina il capo della maggioranza; il campo si tocca solo se c'è (un campo assente rimesso a
      // `undefined` cambierebbe l'ordine delle chiavi fra la partita e il suo salvataggio)
      const fixed = ps.fixedHead;
      if (fixed) ps.fixedHead = false;
      setGov(w, tag, ps, gov, sink, ps.regime === 'autocracy' ? 'il sovrano cambia linea' : 'la Corona nomina un governo gradito alla Camera');
      if (fixed) ps.fixedHead = fixed;
      break;
    }
    case 'purge': {
      n.stability = clamp(n.stability - 5, 0, 100);
      const rival = ps.parties.filter((p) => !ps.gov.includes(p.id)).sort((a, b) => b.seats - a.seats)[0];
      const mine = ps.parties.find((p) => p.id === ps.gov[0])!;
      if (rival) { const d = Math.min(12, rival.seats - 2); rival.seats -= d; rival.pop = Math.max(0.5, rival.pop - d); mine.seats += d; mine.pop += d; }
      ps.honeymoon = 5;
      emit(w, { type: 'crisis_end', nations: [tag], text: `${name}: epurazione a corte${rival ? `, colpiti i ${rival.name.toLowerCase()}` : ''}.` }, sink);
      break;
    }
  }
  ps.confidence = confidence(w, tag, ps);
  return null;
}

/** Probabilità settimanale di crisi: zero sopra soglia, poi cresce dolcemente. */
export function crisisChance(ps: PoliticsState): number {
  if (ps.regime === 'presidential') return 0;
  // rischio piccolo già 5 punti sopra la soglia, poi cresce: nessun crollo automatico
  const gap = THRESHOLD[ps.regime] + 5 - ps.confidence;
  if (gap <= 0) return 0;
  return Math.min(0.6, 0.25 * Math.pow(gap / 25, 1.5));
}

/**
 * Crisi di gabinetto (fase C, corte 05): nei regimi parlamentari con `cabinetYears` i gabinetti cadono anche con la
 * maggioranza, per fazioni e logoramento, in media dopo quel numero di anni (non prima di tre mesi). Si cambia capo
 * nella stessa maggioranza (il trasformismo italiano: Depretis, Crispi, Giolitti), oppure, col turno, la Corona chiama
 * l'opposizione dinastica, che fa le sue elezioni (Cánovas e Sagasta).
 */
function cabinetCrisis(w: World, tag: Tag, ps: PoliticsState, sink: GameEvent[]) {
  const s = w.state, seed = POLITICS[tag];
  if (!seed?.cabinetYears || ps.regime !== 'parliamentary' || ps.crisis || s.day < ps.calmUntil || ps.decreeUntil) return;
  if (s.day - ps.since < 91 || rand(s.seed, 'gabinetto', tag, s.day) >= 1 / (seed.cabinetYears * 52)) return;
  const name = w.profiles[tag].name;
  if (seed.turno) {
    const partner = [...ps.parties].filter((p) => !ps.gov.includes(p.id) && !EXTREME.has(p.program) && p.program !== 'tradizionalista')
      .sort((a, b) => b.seats - a.seats || (a.id < b.id ? -1 : 1))[0];
    if (partner) {
      emit(w, { type: 'crisis_open', nations: [tag], text: `${name}: il governo ${ps.head} si dimette; la Corona chiama l'opposizione (turno).` }, sink);
      setGov(w, tag, ps, [partner.id], sink, 'il turno porta al governo l\'opposizione dinastica');
      holdElection(w, tag, ps, sink);
      return;
    }
  }
  const head = pickHead(w, tag, ps, ps.gov, ps.head);
  if (head === ps.head) return;
  emit(w, { type: 'crisis_open', nations: [tag], text: `${name}: crisi di gabinetto, il governo ${ps.head} si dimette pur avendo la maggioranza.` }, sink);
  setGov(w, tag, ps, ps.gov, sink, 'crisi di gabinetto');
}

/**
 * Una pace pesa sul governo (fase C, corte 05, giurato 3.2: Ferry cadde per Lang Son, Crispi per Adua): chi cede
 * province, paga o si sottomette perde fiducia, chi guadagna ne prende un po'; una guerra d'aggressione finita senza
 * nulla è un fallimento del governo che l'ha voluta.
 */
export function peaceVerdict(w: World, demands: { from: Tag; to: Tag }[], attackers: Tag[], parts: Tag[]) {
  for (const t of parts) {
    const ps = politicsOf(w, t);
    if (!ps) continue;
    const lost = demands.some((d) => d.from === t), won = demands.some((d) => d.to === t);
    const delta = lost ? -PEACE_BLAME : won ? PEACE_CREDIT : attackers[0] === t && !demands.length ? -PEACE_BLAME / 2 : 0;
    ps.honeymoon = clamp(ps.honeymoon + delta, -12, 12);
    ps.confidence = confidence(w, t, ps);
  }
}
export const PEACE_BLAME = 8, PEACE_CREDIT = 4;

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
    // il capo morto o ritirato lascia il posto (corte 05, capo 2), senza crisi: il governo resta, cambia chi lo guida
    if (!leaderActive(w, tag, ps.head)) {
      const old = ps.head;
      ps.head = pickHead(w, tag, ps, ps.gov);
      if (ps.head !== old) {
        reshuffleCabinet(w, tag);
        ps.honeymoon = Math.max(ps.honeymoon, 4);
        emit(w, { type: 'government', nations: [tag], text: `${w.profiles[tag].name}: ${old} lascia la guida del governo; gli succede ${ps.head}.` }, sink);
      }
    }
    // fatti datati (l'assassinio di Alessandro II): solo per le nazioni non giocanti
    if (tag !== s.player) for (const e of POLITICAL_EVENTS) {
      const d = dayOf(...e.date);
      if (e.tag !== tag || d > s.day || d <= s.day - 7 || !e.gov.every((g) => ps.parties.some((p) => p.id === g))) continue;
      emit(w, { type: 'crisis_open', nations: [tag], text: `${w.profiles[tag].name}: ${e.text}` }, sink);
      setGov(w, tag, ps, e.gov, sink, 'cambia la linea del governo');
      delete ps.crisis;
    }
    cabinetCrisis(w, tag, ps, sink);
    ps.honeymoon = ps.honeymoon > 0 ? ps.honeymoon - 1 : Math.min(0, ps.honeymoon + 1);
    if (ps.decreeUntil && s.day >= ps.decreeUntil) delete ps.decreeUntil;
    if (ps.nextElection !== null && s.day >= ps.nextElection) holdElection(w, tag, ps, sink);
    ps.confidence = confidence(w, tag, ps);
    if (ps.crisis || s.day < ps.calmUntil || ps.decreeUntil) continue;
    // disordini (stabilità sotto 30): il rischio di crisi raddoppia (corte 05, capo 1)
    const p = crisisChance(ps) * (s.nations[tag].stability < UNREST ? 2 : 1) * (POLITICS[tag]?.crisisScale ?? 1);
    if (p > 0 && rand(s.seed, 'crisi', tag, s.day) < p) {
      ps.crisis = { day: s.day, options: crisisOptions(ps) };
      const what = ps.regime === 'autocracy' ? 'crisi a corte: il governo perde il favore' : ps.regime === 'constitutional' ? 'il parlamento blocca il governo' : 'il governo perde la maggioranza';
      // `crisis_open` all'apertura, `crisis_end` agli esiti (corte 05, capo 8: prima un solo tipo per tutti e il
      // rapporto contava due crisi per ciascuna)
      emit(w, { type: 'crisis_open', nations: [tag], text: `${w.profiles[tag].name}: ${what} (fiducia ${Math.round(ps.confidence)}).` }, sink);
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
  if (ps.regime === 'presidential') return 'il mandato presidenziale è fisso: si vota alla scadenza';
  if (ps.nextElection - s.day <= 28) return 'le elezioni sono già vicine';
  if (ps.term !== undefined && ps.nextElection - s.day > (ps.term - 0.5) * 365) return 'si è votato da meno di sei mesi';
  s.nations[tag].stability = clamp(s.nations[tag].stability - 2, 0, 100);
  ps.nextElection = s.day + 28;
  delete ps.crisis;
  ps.calmUntil = s.day + 35;
  emit(w, { type: 'election_called', nations: [tag], text: `${w.profiles[tag].name}: il governo scioglie le Camere, si vota il ${formatDate(ps.nextElection)}.` }, sink);
  return null;
}
