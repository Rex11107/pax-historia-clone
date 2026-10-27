// Ministri: Esteri, Guerra, Finanze, Interno (più il capo del governo, che viene dalla politica).
// Si scelgono solo fra i personaggi storici dei partiti al governo o senza partito, vivi e attivi
// in quell'anno. Quando il governo cambia, chi non ha più la maggioranza lascia il posto (lo
// rimpiazza il motore); le nazioni non giocanti seguono il motore.

import { CABINET_1881, MINISTERS, type MinisterEffects, type MinisterSeed, type Portfolio } from '../scenario/ministers1881';
import { politicsOf } from './politics';
import type { GameEvent, Tag } from './types';
import { changeOpinion, clamp, dateOf, emit, opinion, type World } from './world';

export type Office = Exclude<Portfolio, 'capo'>;
export const OFFICES: Office[] = ['esteri', 'guerra', 'finanze', 'interno'];
export const OFFICE_LABEL: Record<Office, string> = { esteri: 'Esteri', guerra: 'Guerra', finanze: 'Finanze', interno: 'Interno' };

export interface CabinetState {
  posts: Partial<Record<Office, string>>;
  /** giorno dell'ultima nomina per dicastero */
  since: Partial<Record<Office, number>>;
  /** frazioni di opinione accumulate dalla politica estera dei ministri */
  acc: Partial<Record<Tag, number>>;
}

const BY_ID = new Map(MINISTERS.map((x) => [x.id, x]));
export const minister = (id: string | undefined) => (id ? BY_ID.get(id) : undefined);
export const hasMinisters = (tag: Tag) => MINISTERS.some((x) => x.nation === tag);

const year = (w: World) => dateOf(w.state.day).getUTCFullYear();

/** Può servire ora, in questo dicastero, con questo governo? */
export function eligible(w: World, tag: Tag, x: MinisterSeed, office: Portfolio): boolean {
  const y = year(w);
  if (x.nation !== tag || !x.portfolios.includes(office) || y < x.years[0] || y > x.years[1]) return false;
  const ps = politicsOf(w, tag);
  return !x.party || !ps || ps.gov.includes(x.party);
}

export function candidates(w: World, tag: Tag, office: Office): MinisterSeed[] {
  return MINISTERS.filter((x) => eligible(w, tag, x, office));
}

/** Gabinetto di una nazione (creato la prima volta dal gabinetto storico del 1881). */
export function cabinetOf(w: World, tag: Tag): CabinetState | null {
  if (!hasMinisters(tag)) return null;
  const s = w.state;
  s.cabinets ??= {};
  if (!s.cabinets[tag]) {
    const c: CabinetState = { posts: { ...(CABINET_1881[tag] ?? {}) }, since: {}, acc: {} };
    s.cabinets[tag] = c;
    for (const o of OFFICES) if (!c.posts[o] || !eligible(w, tag, minister(c.posts[o])!, o)) c.posts[o] = candidates(w, tag, o)[0]?.id;
  }
  return s.cabinets[tag];
}

/** Il capo del governo, se è un personaggio con scheda. */
export function headMinister(w: World, tag: Tag): MinisterSeed | undefined {
  const ps = politicsOf(w, tag);
  return ps ? MINISTERS.find((x) => x.nation === tag && x.name === ps.head && x.portfolios.includes('capo')) : undefined;
}

/** Effetti combinati di capo e ministri (una persona con due incarichi conta una volta). */
export function ministerEffects(w: World, tag: Tag): Required<Omit<MinisterEffects, 'relations'>> & { relations: Partial<Record<Tag, number>> } {
  const out = { income: 1, upkeep: 1, exhaustion: 1, manpower: 1, interest: 1, quality: 1, stability: 0, rail: 0, confidence: 0, relations: {} as Partial<Record<Tag, number>> };
  const c = cabinetOf(w, tag);
  if (!c) return out;
  const ids = new Set<string>(Object.values(c.posts).filter((x): x is string => !!x));
  const head = headMinister(w, tag);
  if (head) ids.add(head.id);
  for (const id of ids) {
    const e = minister(id)?.effects;
    if (!e) continue;
    for (const k of ['income', 'upkeep', 'exhaustion', 'manpower', 'interest', 'quality'] as const) if (e[k]) out[k] *= e[k]!;
    for (const k of ['stability', 'rail', 'confidence'] as const) if (e[k]) out[k] += e[k]!;
    for (const [t, v] of Object.entries(e.relations ?? {})) out.relations[t] = (out.relations[t] ?? 0) + v!;
  }
  return out;
}

/** Nomina del giocatore. Cambiare un ministro costa un po' di stabilità; licenziare un uomo di partito irrita la maggioranza. */
export function appoint(w: World, tag: Tag, office: Office, id: string, sink: GameEvent[] = []): string | null {
  const s = w.state;
  const c = cabinetOf(w, tag);
  if (!c) return 'per questa nazione non ci sono ministri storici';
  const x = minister(id);
  if (!x || !eligible(w, tag, x, office)) return 'non può essere nominato con questo governo o in questo anno';
  if (c.posts[office] === id) return 'è già in carica';
  const last = c.since[office] ?? -999;
  if (s.day - last < 28) return 'il dicastero è cambiato da meno di quattro settimane';
  const old = minister(c.posts[office]);
  c.posts[office] = id;
  c.since[office] = s.day;
  const n = s.nations[tag];
  n.stability = clamp(n.stability - 1, 0, 100);
  const ps = politicsOf(w, tag);
  if (ps && old?.party && ps.gov.includes(old.party)) ps.honeymoon -= 2;
  emit(w, { type: 'minister', nations: [tag], text: `${w.profiles[tag].name}: ${x.name} nuovo ministro ${office === 'guerra' ? 'della Guerra' : office === 'esteri' ? 'degli Esteri' : office === 'finanze' ? 'delle Finanze' : 'dell\'Interno'}${old ? ` al posto di ${old.name}` : ''}.` }, sink);
  return null;
}

/** Fine settimana: rimpiazzi (governo cambiato, morti, ritiri) e politica estera dei ministri. */
export function weeklyMinisters(w: World, sink: GameEvent[]) {
  const s = w.state;
  for (const tag of Object.keys(s.nations)) {
    if (!s.nations[tag].alive) continue;
    const c = cabinetOf(w, tag);
    if (!c) continue;
    for (const o of OFFICES) {
      const cur = minister(c.posts[o]);
      if (cur && eligible(w, tag, cur, o)) continue;
      const next = candidates(w, tag, o).find((x) => x.id !== cur?.id);
      c.posts[o] = next?.id;
      c.since[o] = s.day;
      if (next && (tag === s.player || w.profiles[tag].major)) emit(w, { type: 'minister', nations: [tag], text: `${w.profiles[tag].name}: ${cur ? `${cur.name} lascia il ministero; ` : ''}${next.name} ${o === 'guerra' ? 'alla Guerra' : o === 'esteri' ? 'agli Esteri' : o === 'finanze' ? 'alle Finanze' : 'all\'Interno'}.` }, sink);
    }
    // gli Esteri (e il capo) spostano lentamente l'opinione degli altri verso di noi, entro ±60
    for (const [t, v] of Object.entries(ministerEffects(w, tag).relations) as [Tag, number][]) {
      if (!s.nations[t]?.alive || !v) continue;
      const op = opinion(s, t, tag);
      if ((v > 0 && op >= 60) || (v < 0 && op <= -60)) continue;
      c.acc[t] = (c.acc[t] ?? 0) + v;
      const d = Math.trunc(c.acc[t]!);
      if (d) { changeOpinion(s, t, tag, d); c.acc[t]! -= d; }
    }
  }
}

/**
 * Nuovo governo nelle nazioni non giocanti: il nuovo capo forma il suo gabinetto, preferendo gli uomini
 * del proprio partito. Il giocatore tiene i ministri ancora nominabili e sceglie lui gli altri cambi.
 */
export function reshuffleCabinet(w: World, tag: Tag) {
  const c = cabinetOf(w, tag);
  const ps = politicsOf(w, tag);
  if (!c || !ps) return;
  const lead = ps.gov[0];
  for (const o of OFFICES) {
    const cur = minister(c.posts[o]);
    const curOk = cur && eligible(w, tag, cur, o);
    if (tag === w.state.player && curOk) continue;
    const list = candidates(w, tag, o);
    // l'Interno spesso lo teneva il capo del governo stesso (Depretis, Crispi, Loris-Melikov, Taaffe)
    const headSelf = o === 'interno' ? list.find((x) => x.name === ps.head) : undefined;
    const pick = headSelf ?? list.find((x) => x.party === lead && x.name !== ps.head) ?? (curOk ? cur : list.find((x) => x.name !== ps.head) ?? list[0]);
    if (pick && pick.id !== c.posts[o]) { c.posts[o] = pick.id; c.since[o] = w.state.day; }
  }
}

/** Effetti in parole, per l'interfaccia e il modello. */
export function describeEffects(w: World, e: MinisterEffects): string {
  const pct = (v: number) => `${v > 1 ? '+' : '−'}${Math.round(Math.abs(v - 1) * 100)}%`;
  const sg = (v: number) => `${v > 0 ? '+' : '−'}${Math.abs(v)}`;
  const out: string[] = [];
  if (e.income) out.push(`entrate ${pct(e.income)}`);
  if (e.interest) out.push(`interessi ${pct(e.interest)}`);
  if (e.upkeep) out.push(`costo dell'esercito ${pct(e.upkeep)}`);
  if (e.quality) out.push(`qualità militare ${pct(e.quality)}`);
  if (e.manpower) out.push(`leva ${pct(e.manpower)}`);
  if (e.exhaustion) out.push(`stanchezza di guerra ${pct(e.exhaustion)}`);
  if (e.stability) out.push(`stabilità ${sg(e.stability)}`);
  if (e.confidence) out.push(`fiducia ${sg(e.confidence)}`);
  if (e.rail) out.push('ferrovie più rapide');
  for (const [t, v] of Object.entries(e.relations ?? {})) if (v) out.push(`${w.profiles[t]?.short[1] ?? t} ${v > 0 ? 'più' : 'meno'} amichevole`);
  return out.join(', ') || 'nessun effetto particolare';
}

export function cabinetSummary(w: World, tag: Tag): string {
  const c = cabinetOf(w, tag);
  if (!c) return '';
  return OFFICES.map((o) => `${OFFICE_LABEL[o]} ${minister(c.posts[o])?.name ?? 'funzionario'}`).join(', ');
}
