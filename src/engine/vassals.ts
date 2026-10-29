// Stati soggetti: tributari, vassalli e protettorati, con il desiderio di indipendenza.
//
// Tributario: paga un tributo, per il resto è libero (Egitto, Bulgaria, Tunisi verso la Porta).
// Vassallo: paga di più, segue il signore in guerra, non dichiara guerre da solo.
// Protettorato: il signore tiene la politica estera (niente trattati propri), le truppe del signore
// passano liberamente; dopo due anni con desiderio di indipendenza basso si può annettere.
//
// Il desiderio di indipendenza (0-100) va ogni settimana verso un obiettivo: base del livello,
// forza relativa del soggetto, debolezza del signore (guerre, stanchezza, instabilità), sostegno
// straniero, meno la stima verso il signore, i commerci con lui, gli investimenti e le sue truppe.

import { declareWar, makePeace } from './diplomacy';
import type { GameEvent, Tag } from './types';
import { atWar, changeOpinion, clamp, emit, nationName, opinion, rand, warsOf, type World } from './world';

export type SubjectLevel = 'tributario' | 'vassallo' | 'protettorato';
export const LEVELS: SubjectLevel[] = ['tributario', 'vassallo', 'protettorato'];
export const LEVEL_INFO: Record<SubjectLevel, { label: string; tribute: number; base: number; desc: string }> = {
  tributario: { label: 'tributario', tribute: 0.05, base: 50, desc: 'paga il 5% delle entrate; per il resto è libero' },
  vassallo: { label: 'vassallo', tribute: 0.1, base: 40, desc: 'paga il 10%, segue il signore in guerra, non dichiara guerre da solo' },
  protettorato: { label: 'protettorato', tribute: 0.08, base: 30, desc: 'paga l\'8%; il signore tiene la politica estera e vi muove le truppe; annettibile dopo due anni' },
};

export interface Subject {
  subject: Tag;
  overlord: Tag;
  level: SubjectLevel;
  /** desiderio di indipendenza 0-100 */
  liberty: number;
  since: number;
  /** milioni investiti dal signore in opere nel soggetto */
  invested?: number;
}

const INITIAL: Subject[] = [
  { subject: 'EGY', overlord: 'TUR', level: 'tributario', liberty: 70, since: -3650 },
  { subject: 'TUN', overlord: 'TUR', level: 'tributario', liberty: 60, since: -3650 },
  { subject: 'BUL', overlord: 'TUR', level: 'tributario', liberty: 78, since: -900 },
  // Africa e Arabia
  { subject: 'TRU', overlord: 'GBR', level: 'protettorato', liberty: 60, since: -10000 }, // tregua perpetua del 1853
  { subject: 'BHR', overlord: 'GBR', level: 'protettorato', liberty: 65, since: -400 }, // trattato del 1880
  { subject: 'ZUL', overlord: 'GBR', level: 'tributario', liberty: 50, since: -500 }, // assetto di Wolseley dopo il 1879
  { subject: 'DMG', overlord: 'BOR', level: 'tributario', liberty: 70, since: -10000 },
  { subject: 'KGO', overlord: 'POR', level: 'tributario', liberty: 80, since: -8000 },
];

export function subjects(w: World): Subject[] {
  const s = w.state;
  if (!s.subjects) s.subjects = INITIAL.filter((x) => s.nations[x.subject] && s.nations[x.overlord]).map((x) => ({ ...x }));
  return s.subjects;
}
export const subjectOf = (w: World, tag: Tag) => subjects(w).find((x) => x.subject === tag);
export const subjectsOf = (w: World, tag: Tag) => subjects(w).filter((x) => x.overlord === tag);
export const isProtectorate = (w: World, tag: Tag) => subjectOf(w, tag)?.level === 'protettorato';

const army = (w: World, t: Tag) => w.state.units.filter((u) => u.nation === t).reduce((a, u) => a + u.strength, 0);

/** Obiettivo del desiderio di indipendenza, con le voci (per l'interfaccia). */
export function libertyTarget(w: World, x: Subject): { target: number; parts: [string, number][] } {
  const s = w.state;
  const parts: [string, number][] = [];
  parts.push([`base (${x.level})`, LEVEL_INFO[x.level].base]);
  const power = Math.min(1.5, army(w, x.subject) / Math.max(1, army(w, x.overlord)));
  parts.push(['forza relativa', Math.round(power * 30)]);
  const ov = s.nations[x.overlord];
  const weak = ov.warExhaustion * 0.3 + Math.max(0, 50 - ov.stability) * 0.3 + (warsOf(s, x.overlord).length ? 5 : 0);
  if (weak) parts.push(['debolezza del signore', Math.round(weak)]);
  parts.push(['stima verso il signore', Math.round(-opinion(s, x.subject, x.overlord) * 0.15)]);
  let sponsor = 0;
  for (const t of Object.keys(s.nations)) if (t !== x.overlord && t !== x.subject && w.profiles[t]?.major) sponsor = Math.max(sponsor, (opinion(s, t, x.subject) - 30) * 0.2);
  if (sponsor > 0) parts.push(['sostegno straniero', Math.round(sponsor)]);
  const trade = (s.trades ?? []).filter((c) => (c.buyer === x.subject && c.seller === x.overlord) || (c.seller === x.subject && c.buyer === x.overlord)).length;
  if (trade) parts.push(['commerci col signore', -trade * 3]);
  if (x.invested) parts.push(['investimenti del signore', -Math.round(Math.min(20, x.invested * 0.5))]);
  const garrison = s.units.filter((u) => u.nation === x.overlord && s.owner[u.location] === x.subject).reduce((a, u) => a + u.strength, 0);
  if (garrison) parts.push(['truppe del signore', -Math.round(Math.min(15, garrison / 5000))]);
  const target = clamp(parts.reduce((a, [, v]) => a + v, 0), 0, 100);
  return { target, parts };
}

/** Tributo settimanale (milioni): positivo per il signore, negativo per il soggetto. */
export function tributeOf(w: World, tag: Tag): number {
  const s = w.state;
  let t = 0;
  for (const x of subjects(w)) {
    const inc = Math.max(0, s.nations[x.subject]?.lastBudget?.income ?? 0);
    const due = inc * LEVEL_INFO[x.level].tribute * (x.liberty >= 75 ? 0 : 1); // sopra 75 il tributo non arriva più
    if (x.overlord === tag) t += due;
    if (x.subject === tag) t -= due;
  }
  return Math.round(t * 100) / 100;
}

/** Il soggetto può dichiarare guerra? (null = sì) */
export function warBlock(w: World, a: Tag, b: Tag): string | null {
  const x = subjectOf(w, a);
  if (!x || x.level === 'tributario' || b === x.overlord) return null;
  if (x.level === 'protettorato') return `${nationName(w, a)} è un protettorato: la politica estera la decide ${nationName(w, x.overlord)}`;
  return atWar(w.state, x.overlord, b) ? null : `un vassallo dichiara guerra solo insieme al suo signore`;
}

/** Soggetti che entrano in guerra col signore (vassalli e protettorati, se non vogliono già andarsene). */
export function followers(w: World, overlord: Tag): Tag[] {
  return subjectsOf(w, overlord).filter((x) => x.level !== 'tributario' && x.liberty < 60).map((x) => x.subject);
}

// --- azioni ---

export function tighten(w: World, overlord: Tag, sub: Tag, sink: GameEvent[] = []): string | null {
  const x = subjectOf(w, sub);
  if (!x || x.overlord !== overlord) return 'non è un nostro soggetto';
  const i = LEVELS.indexOf(x.level);
  if (i >= LEVELS.length - 1) return 'è già un protettorato';
  if (x.liberty >= 25) return `desiderio di indipendenza troppo alto (${Math.round(x.liberty)}, serve sotto 25)`;
  x.level = LEVELS[i + 1]; x.liberty = clamp(x.liberty + 15, 0, 100); x.since = w.state.day;
  changeOpinion(w.state, sub, overlord, -10);
  emit(w, { type: 'subject', nations: [overlord, sub], text: `${nationName(w, sub)} diventa ${x.level} ${di(w, overlord)}.` }, sink);
  return null;
}

export function loosen(w: World, overlord: Tag, sub: Tag, sink: GameEvent[] = []): string | null {
  const s = w.state;
  const x = subjectOf(w, sub);
  if (!x || x.overlord !== overlord) return 'non è un nostro soggetto';
  const i = LEVELS.indexOf(x.level);
  changeOpinion(s, sub, overlord, 10);
  if (i === 0) {
    s.subjects = subjects(w).filter((y) => y !== x);
    changeOpinion(s, sub, overlord, 15);
    emit(w, { type: 'subject', nations: [overlord, sub], text: `${nationName(w, overlord)} riconosce la piena indipendenza ${di(w, sub)}.` }, sink);
    return null;
  }
  x.level = LEVELS[i - 1]; x.liberty = clamp(x.liberty - 20, 0, 100);
  emit(w, { type: 'subject', nations: [overlord, sub], text: `${nationName(w, overlord)} allenta la presa: ${nationName(w, sub)} ora è ${x.level}.` }, sink);
  return null;
}

export function annexRefusal(w: World, overlord: Tag, sub: Tag): string | null {
  const x = subjectOf(w, sub);
  if (!x || x.overlord !== overlord) return 'non è un nostro soggetto';
  if (x.level !== 'protettorato') return 'si annette solo un protettorato';
  if (x.liberty >= 20) return `desiderio di indipendenza troppo alto (${Math.round(x.liberty)}, serve sotto 20)`;
  if (w.state.day - x.since < 730) return 'serve almeno due anni di protettorato';
  if (w.profiles[sub]?.major) return 'una grande potenza non si annette';
  return null;
}

export function annex(w: World, overlord: Tag, sub: Tag, sink: GameEvent[] = []): string | null {
  const err = annexRefusal(w, overlord, sub);
  if (err) return err;
  const s = w.state;
  for (let p = 0; p < s.owner.length; p++) if (s.owner[p] === sub) { s.owner[p] = overlord; s.controller[p] = overlord; }
  s.units = s.units.filter((u) => u.nation !== sub);
  s.nations[sub].alive = false;
  s.subjects = subjects(w).filter((y) => y.subject !== sub && y.overlord !== sub);
  for (const t of Object.keys(s.nations)) if (t !== overlord && t !== sub && w.profiles[t]?.major) changeOpinion(s, t, overlord, -6);
  emit(w, { type: 'subject', nations: [overlord, sub], text: `${nationName(w, overlord)} annette ${nationName(w, sub)}.` }, sink);
  return null;
}

/**
 * Dichiarazione d'indipendenza (desiderio ≥ 75). Se il signore è debole o impegnato altrove la accetta;
 * altrimenti è guerra.
 */
export function declareIndependence(w: World, sub: Tag, sink: GameEvent[] = []): string | null {
  const s = w.state;
  const x = subjectOf(w, sub);
  if (!x) return 'non è uno stato soggetto';
  if (x.liberty < 75) return `il paese non è pronto (desiderio di indipendenza ${Math.round(x.liberty)}, serve 75)`;
  const ov = x.overlord;
  s.subjects = subjects(w).filter((y) => y !== x);
  const busy = warsOf(s, ov).length > 0 && s.nations[ov].warExhaustion > 40;
  const weak = army(w, ov) < army(w, sub) * 1.5;
  changeOpinion(s, ov, sub, -30);
  if (busy || weak) {
    emit(w, { type: 'subject', nations: [ov, sub], text: `${nationName(w, sub)} proclama l'indipendenza; ${nationName(w, ov)}, ${busy ? 'impegnato altrove' : 'troppo debole'}, la accetta.` }, sink);
    return null;
  }
  emit(w, { type: 'subject', nations: [ov, sub], text: `${nationName(w, sub)} proclama l'indipendenza: ${nationName(w, ov)} non la riconosce.` }, sink);
  return declareWar(w, sub, ov, 'guerra d\'indipendenza', sink);
}

/** In guerra, occupata la capitale di uno stato minore: pace con protettorato (come il Bardo, 1881). */
export function protectorateRefusal(w: World, overlord: Tag, target: Tag): string | null {
  const s = w.state;
  if (!atWar(s, overlord, target)) return 'serve essere in guerra';
  if (w.profiles[target]?.major) return 'una grande potenza non diventa un protettorato';
  if (s.controller[s.nations[target].capital] !== overlord) return 'bisogna occuparne la capitale';
  if (subjectOf(w, overlord)) return 'uno stato soggetto non impone protettorati';
  return null;
}

export function imposeProtectorate(w: World, overlord: Tag, target: Tag, sink: GameEvent[] = []): string | null {
  const err = protectorateRefusal(w, overlord, target);
  if (err) return err;
  const s = w.state;
  const old = subjectOf(w, target);
  makePeace(w, overlord, target, {}, sink);
  if (old && old.overlord !== overlord) { changeOpinion(s, old.overlord, overlord, -20); emit(w, { type: 'subject', nations: [old.overlord, target], text: `${nationName(w, old.overlord)} perde ogni sovranità su ${nationName(w, target)}.` }, sink); }
  s.subjects = subjects(w).filter((y) => y.subject !== target);
  s.subjects.push({ subject: target, overlord, level: 'protettorato', liberty: 55, since: s.day });
  for (const t of Object.keys(s.nations)) if (t !== overlord && t !== target && w.profiles[t]?.major) changeOpinion(s, t, overlord, -3);
  emit(w, { type: 'subject', nations: [overlord, target], text: `Trattato di pace: ${nationName(w, target)} diventa protettorato ${di(w, overlord)}.` }, sink);
  return null;
}

const di = (w: World, t: Tag) => `di ${nationName(w, t)}`;

/** Fine settimana: desiderio di indipendenza, scelte delle nazioni non giocanti. */
export function weeklySubjects(w: World, sink: GameEvent[]) {
  const s = w.state;
  for (const x of [...subjects(w)]) {
    if (!s.nations[x.subject]?.alive || !s.nations[x.overlord]?.alive) { s.subjects = subjects(w).filter((y) => y !== x); continue; }
    const { target } = libertyTarget(w, x);
    const before = x.liberty;
    x.liberty = Math.round((x.liberty + (target - x.liberty) * 0.08) * 10) / 10;
    if (before < 75 && x.liberty >= 75 && (x.subject === s.player || x.overlord === s.player)) emit(w, { type: 'subject', nations: [x.overlord, x.subject], text: `${nationName(w, x.subject)} non versa più il tributo: il desiderio di indipendenza è alto.` }, sink);
    const r = rand(s.seed, 'vassallo', x.subject, s.day);
    if (x.subject !== s.player && x.liberty >= 80 && r < 0.06) { declareIndependence(w, x.subject, sink); continue; }
    if (x.overlord !== s.player) {
      if (x.level === 'protettorato' && !annexRefusal(w, x.overlord, x.subject) && r > 0.97 && s.day - x.since > 5 * 365) annex(w, x.overlord, x.subject, sink);
      else if (x.liberty < 20 && r > 0.95) tighten(w, x.overlord, x.subject, sink);
    }
  }
}
