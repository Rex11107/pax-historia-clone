// Ricerca: albero 1880-1914, progetti con costo settimanale e risorse, scienziati storici,
// collaborazione scientifica fra due nazioni. Tutto nel motore.

import { CATEGORIES, SCIENTISTS, TECHS, type Category, type Scientist, type Tech, type TechEffects } from '../scenario/research1881';
import type { BuildingId } from '../scenario/buildings1881';
import type { ResourceId } from './resources';
import type { GameEvent, Tag } from './types';
import { atWar, changeOpinion, dateOf, emit, nationName, newId, opinion, rand, treatyBetween, type World } from './world';

export { CATEGORIES, SCIENTISTS, TECHS };
export type { Category, Scientist, Tech };

export interface ResearchProject {
  id: string;
  tech: string;
  /** una nazione, o due in collaborazione */
  nations: Tag[];
  scientists: Partial<Record<Tag, string>>;
  /** settimane-equivalenti completate */
  progress: number;
  total: number;
  startDay: number;
}

export interface ResearchState {
  known: Record<Tag, string[]>;
  /** quante conoscenze aveva ogni nazione nel 1881 (i loro effetti sono già nei profili d'epoca) */
  start: Record<Tag, number>;
  projects: ResearchProject[];
}

const BY_ID = new Map(TECHS.map((x) => [x.id, x]));
export const tech = (id: string) => BY_ID.get(id);
const SCI = new Map(SCIENTISTS.map((x) => [x.id, x]));
export const scientist = (id: string | undefined) => (id ? SCI.get(id) : undefined);

const yearOf = (w: World) => dateOf(w.state.day).getUTCFullYear() + dateOf(w.state.day).getUTCMonth() / 12;
const industry = (w: World, t: Tag) => w.profiles[t]?.industry ?? 20;

/** Stato della ricerca (al primo uso: ogni nazione conosce ciò che il suo livello industriale del 1881 giustifica). */
export function research(w: World): ResearchState {
  const s = w.state;
  if (s.research) return s.research;
  const known: Record<Tag, string[]> = {};
  for (const tag of Object.keys(s.nations)) {
    if (w.profiles[tag]?.micro || tag === 'NUL') { known[tag] = []; continue; }
    const ind = industry(w, tag);
    const k = new Set<string>();
    // in ordine di data, così i prerequisiti vengono prima
    for (const x of [...TECHS].sort((a, b) => a.year - b.year)) if (x.start !== undefined && ind >= x.start && x.prereq.every((p) => k.has(p))) k.add(x.id);
    known[tag] = [...k];
  }
  s.research = { known, projects: [], start: Object.fromEntries(Object.entries(known).map(([t, l]) => [t, l.length])) };
  return s.research;
}

export const knows = (w: World, tag: Tag, id: string) => (research(w).known[tag] ?? []).includes(id);
export const projectsOf = (w: World, tag: Tag) => research(w).projects.filter((p) => p.nations.includes(tag));

/** Ricerche contemporanee: 1, 2 dall'industria 35, 3 dall'industria 75. */
export const researchSlots = (w: World, tag: Tag) => 1 + (industry(w, tag) >= 35 ? 1 : 0) + (industry(w, tag) >= 75 ? 1 : 0);

/** Anni di anticipo sulla data storica (0 se è già il suo tempo). */
export const yearsAhead = (w: World, x: Tech) => Math.max(0, Math.ceil(x.year - yearOf(w)));
/** Durata in settimane, con il 30% in più per anno d'anticipo. */
export const weeksFor = (w: World, x: Tech) => Math.round(x.weeks * (1 + 0.3 * yearsAhead(w, x)));

/** Costo settimanale per una nazione (i paesi piccoli pagano meno, ma vanno anche più piano). */
export function weeklyCost(w: World, tag: Tag, x: Tech, sci?: Scientist): number {
  const inc = w.state.nations[tag]?.lastBudget?.income ?? 20;
  return Math.round(x.cost * (0.3 + 0.7 * Math.min(1, inc / 40)) * (1 + (sci?.cost ?? 0)) * 100) / 100;
}

/** Una risorsa è disponibile (propria, anche dai giacimenti scoperti, o importata)? */
function hasRes(w: World, tag: Tag, r: ResourceId): boolean {
  const s = w.state;
  for (let i = 0; i < w.map.size; i++) if (s.controller[i] === tag && (w.map.resources[i].includes(r) || siteLots(w, i).includes(r))) return true;
  return (s.trades ?? []).some((c) => c.buyer === tag && c.res === r);
}

export function missingInputs(w: World, nations: Tag[], x: Tech): ResourceId[] {
  return (x.consumes ?? []).filter((r) => !nations.some((t) => hasRes(w, t, r)));
}

/** Perché non si può avviare (null = si può). */
export function researchRefusal(w: World, tag: Tag, id: string, ignoreSlots = false): string | null {
  const x = tech(id);
  if (!x) return 'ricerca sconosciuta';
  if (knows(w, tag, id)) return 'già conosciuta';
  if (research(w).projects.some((p) => p.tech === id && p.nations.includes(tag))) return 'già in corso';
  const miss = x.prereq.filter((p) => !knows(w, tag, p));
  if (miss.length) return `serve prima: ${miss.map((p) => tech(p)!.name).join(', ')}`;
  if (x.minIndustry && industry(w, tag) < x.minIndustry) return `serve un'industria di almeno ${x.minIndustry}`;
  if (!ignoreSlots && projectsOf(w, tag).length >= researchSlots(w, tag)) return `tutte le ricerche sono occupate (${researchSlots(w, tag)})`;
  return null;
}

/** Scienziati disponibili per una ricerca: della nazione, attivi quell'anno, del campo giusto, liberi. */
export function scientistsFor(w: World, tag: Tag, x: Tech, except?: string): Scientist[] {
  const y = dateOf(w.state.day).getUTCFullYear();
  const busy = new Set(research(w).projects.filter((p) => p.id !== except).flatMap((p) => Object.values(p.scientists)));
  return SCIENTISTS.filter((s) => s.nation === tag && s.lines.includes(x.line) && y >= s.years[0] && y <= s.years[1] && !busy.has(s.id)).sort((a, b) => b.speed - a.speed);
}

/** Velocità settimanale di un progetto (settimane-equivalenti per settimana). */
export function speedOf(w: World, p: ResearchProject): number {
  const x = tech(p.tech)!;
  const base = Math.max(...p.nations.map((t) => 0.6 + industry(w, t) / 125));
  let v = base * (p.nations.length > 1 ? 1.3 : 1);
  for (const id of Object.values(p.scientists)) v += scientist(id)?.speed ?? 0;
  const miss = missingInputs(w, p.nations, x).length;
  v *= Math.max(0.25, 1 - 0.5 * miss);
  if (p.nations.some((t) => (w.state.nations[t]?.stability ?? 50) < 30)) v *= 0.8;
  return Math.round(v * 100) / 100;
}

/** Spesa settimanale di una nazione per la ricerca (in collaborazione divisa in proporzione alle entrate). */
export function researchCost(w: World, tag: Tag): number {
  let c = 0;
  for (const p of projectsOf(w, tag)) {
    const x = tech(p.tech)!;
    const full = Math.max(...p.nations.map((t) => weeklyCost(w, t, x, scientist(p.scientists[t]))));
    if (p.nations.length === 1) { c += weeklyCost(w, tag, x, scientist(p.scientists[tag])); continue; }
    const inc = (t: Tag) => Math.max(1, w.state.nations[t]?.lastBudget?.income ?? 10);
    const tot = p.nations.reduce((a, t) => a + inc(t), 0);
    c += full * (inc(tag) / tot);
  }
  return Math.round(c * 100) / 100;
}

export function startResearch(w: World, tag: Tag, id: string, sci?: string, sink?: GameEvent[]): string | null {
  const err = researchRefusal(w, tag, id);
  if (err) return err;
  const x = tech(id)!;
  if (sci && !scientistsFor(w, tag, x).some((s) => s.id === sci)) return 'scienziato non disponibile';
  const s = w.state;
  research(w).projects.push({ id: newId(s, 'r'), tech: id, nations: [tag], scientists: sci ? { [tag]: sci } : {}, progress: 0, total: weeksFor(w, x), startDay: s.day });
  if (tag === s.player) emit(w, { type: 'research', nations: [tag], text: `Avviata la ricerca: ${x.name}${sci ? ` (con ${scientist(sci)!.name})` : ''}.` }, sink);
  return null;
}

export function cancelResearch(w: World, projectId: string, by: Tag): string | null {
  const r = research(w);
  const i = r.projects.findIndex((p) => p.id === projectId);
  if (i < 0) return 'ricerca inesistente';
  const p = r.projects[i];
  if (!p.nations.includes(by)) return 'non è una nostra ricerca';
  r.projects.splice(i, 1);
  // rompere una collaborazione irrita il partner
  for (const t of p.nations) if (t !== by) changeOpinion(w.state, t, by, -5);
  return null;
}

// --- collaborazione ---

const RIVALS = (w: World, a: Tag, b: Tag) => w.profiles[a]?.rivals.includes(b) || w.profiles[b]?.rivals.includes(a);
const CAT_EASE: Record<Category, number> = { medicina: 30, agricoltura: 25, industria: 12, energia: 12, trasporti: 12, militare: -25 };

/** Valutazione del motore: il partner accetta di collaborare su questa ricerca? Restituisce punteggio e motivo. */
export function collabScore(w: World, from: Tag, to: Tag, id: string): { score: number; reasons: string[]; refusal: string | null } {
  const s = w.state;
  const x = tech(id);
  const reasons: string[] = [];
  if (!x) return { score: -999, reasons, refusal: 'ricerca sconosciuta' };
  if (from === to || !s.nations[to]?.alive || w.profiles[to]?.micro) return { score: -999, reasons, refusal: 'partner non valido' };
  if (atWar(s, from, to)) return { score: -999, reasons, refusal: 'siete in guerra' };
  const own = researchRefusal(w, from, id);
  if (own) return { score: -999, reasons, refusal: own };
  if (knows(w, to, id)) return { score: -999, reasons, refusal: `${nationName(w, to)} la conosce già` };
  if (projectsOf(w, to).length >= researchSlots(w, to)) return { score: -999, reasons, refusal: `${nationName(w, to)} non ha ricerche libere` };
  if (x.prereq.some((p) => !knows(w, to, p))) return { score: -999, reasons, refusal: `${nationName(w, to)} non ha i prerequisiti` };
  let score = CAT_EASE[x.cat]; reasons.push(`${x.cat} ${score >= 0 ? '+' : ''}${score}`);
  const op = Math.round(opinion(s, to, from) * 0.5); score += op; reasons.push(`stima ${op >= 0 ? '+' : ''}${op}`);
  if (treatyBetween(s, from, to, 'alliance')) { score += 25; reasons.push('alleanza +25'); }
  if (treatyBetween(s, from, to, 'trade')) { score += 8; reasons.push('accordo commerciale +8'); }
  if (RIVALS(w, from, to)) { score -= 40; reasons.push('rivalità −40'); }
  if (x.cat === 'militare' && !treatyBetween(s, from, to, 'alliance')) { score -= 15; reasons.push('segreto militare senza alleanza −15'); }
  const gain = industry(w, from) - industry(w, to);
  if (gain > 10) { score += 10; reasons.push('ne impareranno molto +10'); }
  const ok = score >= 20;
  return { score, reasons, refusal: ok ? null : `il governo ${di(w, to)} rifiuta (${reasons.join(', ')}; serve almeno 20)` };
}
const di = (w: World, t: Tag) => `di ${nationName(w, t)}`;

/** Patto di collaborazione su un solo elemento: uno scienziato a testa, costi divisi, entrambi lo ottengono. */
export function proposeCollab(w: World, from: Tag, to: Tag, id: string, mySci?: string, sink?: GameEvent[]): string | null {
  const ev = collabScore(w, from, to, id);
  if (ev.refusal) return ev.refusal;
  const x = tech(id)!;
  if (mySci && !scientistsFor(w, from, x).some((s) => s.id === mySci)) return 'scienziato non disponibile';
  const theirs = scientistsFor(w, to, x)[0];
  const s = w.state;
  const sci: Partial<Record<Tag, string>> = {};
  if (mySci) sci[from] = mySci;
  if (theirs) sci[to] = theirs.id;
  research(w).projects.push({ id: newId(s, 'r'), tech: id, nations: [from, to], scientists: sci, progress: 0, total: weeksFor(w, x), startDay: s.day });
  changeOpinion(s, from, to, 2); changeOpinion(s, to, from, 2);
  emit(w, { type: 'research', nations: [from, to], text: `Patto di collaborazione scientifica fra ${nationName(w, from)} e ${nationName(w, to)}: ${x.name}${Object.keys(sci).length ? ` (${Object.values(sci).map((i) => scientist(i)!.name).join(' e ')})` : ''}.` }, sink);
  return null;
}

// --- effetti ---

const effCache = new Map<string, { key: string; eff: Required<Omit<TechEffects, 'fortArmor'>> & { fortArmor: boolean } }>();
/** Effetti combinati delle ricerche conosciute. */
export function techEffects(w: World, tag: Tag) {
  const r = research(w);
  // solo ciò che si è ricercato dopo il 1881: il resto è già nei profili (industria, qualità militare…)
  const list = (r.known[tag] ?? []).slice(r.start?.[tag] ?? 0);
  const key = `${w.state.seed}:${list.length}:${list[list.length - 1] ?? ''}`;
  const c = effCache.get(tag);
  if (c && c.key === key) return c.eff;
  const e = { income: 1, quality: 1, exhaustion: 1, manpower: 1, logistics: 1, railSpeed: 1, agri: 1, industrialYield: 1, attrition: 1, oilValue: 1, upkeep: 1, stability: 0, industry: 0, coalRelief: 0, fortBreak: 0, fortArmor: false };
  for (const id of list) {
    const x = tech(id)?.effects;
    if (!x) continue;
    for (const k of ['income', 'quality', 'exhaustion', 'manpower', 'logistics', 'railSpeed', 'agri', 'industrialYield', 'attrition', 'oilValue', 'upkeep'] as const) if (x[k]) e[k] *= x[k]!;
    for (const k of ['stability', 'industry', 'coalRelief', 'fortBreak'] as const) if (x[k]) e[k] += x[k]!;
    if (x.fortArmor) e.fortArmor = true;
  }
  e.coalRelief = Math.min(1, e.coalRelief);
  effCache.set(tag, { key, eff: e });
  return e;
}

/** Livello massimo costruibile di un'opera: il primo è libero, gli altri li sblocca la ricerca. */
export function maxLevel(w: World, tag: Tag, b: BuildingId): number {
  let m = 1;
  for (const id of research(w).known[tag] ?? []) for (const [k, l] of tech(id)?.unlocks ?? []) if (k === b) m = Math.max(m, l);
  return m;
}
/** La ricerca che sblocca un certo livello. */
export const unlockTech = (b: BuildingId, lvl: number) => TECHS.find((x) => x.unlocks?.some(([k, l]) => k === b && l === lvl));

/** Giacimenti scoperti dalla ricerca: valgono per chi controlla la provincia e conosce la tecnica. */
let siteMap: Map<number, [ResourceId, string][]> | null = null;
let siteMapFor: unknown = null;
export function siteLots(w: World, p: number): ResourceId[] {
  if (!siteMap || siteMapFor !== w.map) {
    siteMap = new Map();
    siteMapFor = w.map;
    for (const x of TECHS) for (const [r, lon, lat] of x.sites ?? []) {
      const id = w.map.locate(lon, lat);
      if (id === null || w.map.provinces[id].impassable) continue;
      const l = siteMap.get(id) ?? [];
      l.push([r, x.id]);
      siteMap.set(id, l);
    }
  }
  const l = siteMap.get(p);
  if (!l) return [];
  const ctrl = w.state.controller[p];
  return l.filter(([r, id]) => knows(w, ctrl, id) && !w.map.resources[p].includes(r)).map(([r]) => r);
}

// --- fine settimana ---

export function weeklyResearch(w: World, sink: GameEvent[]) {
  const s = w.state;
  const r = research(w);
  for (const p of [...r.projects]) {
    if (p.nations.some((t) => !s.nations[t]?.alive) || (p.nations.length > 1 && atWar(s, p.nations[0], p.nations[1]))) {
      r.projects.splice(r.projects.indexOf(p), 1);
      continue;
    }
    p.progress += speedOf(w, p);
    if (p.progress < p.total) continue;
    r.projects.splice(r.projects.indexOf(p), 1);
    const x = tech(p.tech)!;
    for (const t of p.nations) if (!knows(w, t, x.id)) (r.known[t] ??= []).push(x.id);
    if (p.nations.length > 1) { changeOpinion(s, p.nations[0], p.nations[1], 3); changeOpinion(s, p.nations[1], p.nations[0], 3); }
    if (p.nations.includes(s.player) || p.nations.some((t) => w.profiles[t]?.major))
      emit(w, { type: 'research_done', nations: p.nations, text: `${p.nations.map((t) => nationName(w, t)).join(' e ')}: completata la ricerca "${x.name}".` }, sink);
  }
  aiResearch(w, sink);
}

/** Le nazioni non giocanti riempiono le ricerche libere: prima ciò che è già del suo tempo, secondo le loro priorità. */
function aiResearch(w: World, sink: GameEvent[]) {
  const s = w.state;
  for (const tag of Object.keys(s.nations)) {
    const n = s.nations[tag];
    if (tag === s.player || !n.alive || w.profiles[tag]?.micro || tag === 'NUL') continue;
    if (projectsOf(w, tag).length >= researchSlots(w, tag) || n.treasury < 15) continue;
    if (rand(s.seed, 'ricerca', tag, s.day) > 0.5) continue;
    const pr = w.profiles[tag];
    const mil = pr.doctrine === 'offensive' || pr.militaryQuality >= 70 || pr.rivals.length >= 2;
    const weight: Record<Category, number> = { militare: mil ? 1.4 : 1, industria: pr.industry < 50 ? 1.3 : 1.1, energia: 1, trasporti: 1.1, agricoltura: pr.industry < 30 ? 1.2 : 0.8, medicina: 0.9 };
    const options = TECHS.filter((x) => !researchRefusal(w, tag, x.id)).map((x) => ({ x, v: weight[x.cat] / (1 + 0.6 * yearsAhead(w, x)) / (x.weeks / 30) * (missingInputs(w, [tag], x).length ? 0.5 : 1) * (0.8 + 0.4 * rand(s.seed, x.id, tag, s.day)) }));
    if (!options.length) continue;
    options.sort((a, b) => b.v - a.v);
    const pick = options[0].x;
    startResearch(w, tag, pick.id, scientistsFor(w, tag, pick)[0]?.id, sink);
  }
}

export function researchSummary(w: World, tag: Tag): string {
  const pr = projectsOf(w, tag).map((p) => `${tech(p.tech)!.name} ${Math.round((p.progress / p.total) * 100)}%${p.nations.length > 1 ? ` con ${p.nations.find((t) => t !== tag)}` : ''}`);
  return `${(research(w).known[tag] ?? []).length} conoscenze; in corso: ${pr.join(', ') || 'nessuna'}`;
}

/** Effetti di una ricerca in parole. */
export function describeTech(x: Tech): string {
  const e = x.effects;
  const pct = (v: number) => `${v > 1 ? '+' : '−'}${Math.round(Math.abs(v - 1) * 100)}%`;
  const out: string[] = [];
  if (e.income) out.push(`entrate ${pct(e.income)}`);
  if (e.industry) out.push(`industria +${e.industry}`);
  if (e.industrialYield) out.push(`rendita delle industrie ${pct(e.industrialYield)}`);
  if (e.agri) out.push(`rendita dei campi ${pct(e.agri)}`);
  if (e.quality) out.push(`qualità militare ${pct(e.quality)}`);
  if (e.logistics) out.push(`capacità logistica ${pct(e.logistics)}`);
  if (e.railSpeed) out.push(`treni ${pct(e.railSpeed)} più veloci`);
  if (e.manpower) out.push(`leva ${pct(e.manpower)}`);
  if (e.exhaustion) out.push(`stanchezza di guerra ${pct(e.exhaustion)}`);
  if (e.attrition) out.push(`perdite per malattie e logoramento ${pct(e.attrition)}`);
  if (e.oilValue) out.push(`valore del petrolio ${pct(e.oilValue)}`);
  if (e.stability) out.push(`stabilità +${e.stability}`);
  if (e.coalRelief) out.push(`il malus "senza carbone" si riduce del ${Math.round(e.coalRelief * 100)}% (servono montagne)`);
  if (e.fortBreak) out.push(`le fortezze nemiche in muratura valgono il ${Math.round(e.fortBreak * 100)}% in meno contro la nostra artiglieria`);
  if (e.fortArmor) out.push('le nostre fortezze resistono agli alti esplosivi');
  for (const [b, l] of x.unlocks ?? []) out.push(`sblocca ${b} livello ${l}`);
  if (x.sites?.length) out.push(`rende sfruttabili: ${x.sites.map((s) => `${s[0]} di ${s[3]}`).join(', ')}`);
  return out.join('; ') || 'nessun effetto diretto: apre la strada ad altre ricerche';
}
