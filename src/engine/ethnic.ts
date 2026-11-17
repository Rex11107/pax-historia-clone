// Etnie delle province: composizione dalle regole d'epoca, maggioranze, quota di popolazione "estranea"
// per ogni Stato e suo effetto sulla stabilità (solo rispetto al 1881: le conquiste di popoli altrui pesano).

import { ETHNICITIES, RULES, STATE_PEOPLES, type Match } from '../scenario/ethnic1881';
import type { ProvinceData, Tag } from './types';
import type { World } from './world';

export { ETHNICITIES, STATE_PEOPLES };
export type Composition = { eth: string; share: number }[];

const parse = (s: string): Composition => s.split(',').map((x) => x.trim()).filter(Boolean).map((x) => { const i = x.lastIndexOf(' '); return { eth: x.slice(0, i).trim(), share: Number(x.slice(i + 1)) }; });
const PARSED = RULES.map(([m, c, est]) => ({ m, c: parse(c), est: !!est }));

function matches(m: Match, p: ProvinceData): boolean {
  if (m.owner && !m.owner.includes(p.owner)) return false;
  if (m.modern && !m.modern.includes(p.modern)) return false;
  if (m.lang && !m.lang.includes(p.lang ?? '')) return false;
  if (m.name && !m.name.includes(p.name)) return false;
  if (m.iso && !m.iso.some((x) => (x.endsWith('*') ? (p.iso ?? '').startsWith(x.slice(0, -1)) : p.iso === x))) return false;
  return true;
}

const cache = new WeakMap<object, { comp: Composition; estimate: boolean; rule: number }[]>();
/** Composizione etnica di ogni provincia (con l'indice della regola usata, -1 = nessuna). */
export function ethnicTable(w: World) {
  let t = cache.get(w.map);
  if (t) return t;
  t = w.map.provinces.map((p) => {
    if (p.impassable) return { comp: [{ eth: p.modern === 'EGY' ? 'egiziani' : ['MAR', 'DZA', 'TUN', 'LBY'].includes(p.modern) ? 'berberi' : 'arabi', share: 100 }], estimate: true, rule: -2 };
    const i = PARSED.findIndex((r) => matches(r.m, p));
    return i >= 0 ? { comp: PARSED[i].c, estimate: PARSED[i].est, rule: i } : { comp: [{ eth: 'altri', share: 100 }], estimate: true, rule: -1 };
  });
  cache.set(w.map, t);
  return t;
}

export const composition = (w: World, p: number) => ethnicTable(w)[p].comp;
// la maggioranza si chiede molto spesso (il peso coloniale entra in bilancio, risorse, opere e scelte dell'IA): una
// tabella per mappa invece di rifare la riduzione a ogni chiamata
const majCache = new WeakMap<object, string[]>();
export const majority = (w: World, p: number) => {
  let m = majCache.get(w.map);
  if (!m) { m = ethnicTable(w).map((x) => x.comp.reduce((a, b) => (b.share > a.share ? b : a)).eth); majCache.set(w.map, m); }
  return m[p];
};
export const ethLabel = (id: string) => ETHNICITIES[id]?.label ?? id;

/** Quanto un popolo è "estraneo" per uno Stato: 0 proprio, 0,5 regionale, 1 altrimenti. */
export function foreignness(tag: Tag, eth: string): number {
  const sp = STATE_PEOPLES[tag];
  if (!sp) return 1;
  if (sp.own.includes(eth)) return 0;
  if (sp.regional?.includes(eth)) return 0.5;
  return 1;
}

/**
 * Peso della popolazione di una provincia per le casse e le leve del padrone: fuori dall'Europa (dopo `euCount`)
 * una provincia abitata in maggioranza da un popolo estraneo è una colonia, con un bilancio e un esercito suoi
 * (l'India britannica aveva entrate proprie): conta per l'8%.
 */
export function colonialWeight(w: World, tag: Tag, p: number): number {
  if (p < (w.map.data.euCount ?? Infinity)) return 1;
  return foreignness(tag, majority(w, p)) >= 1 ? 0.08 : 1;
}

/** Quota della popolazione di uno Stato che appartiene ad altri popoli (0-1). */
export function foreignShare(w: World, tag: Tag, own?: number[]): number {
  const s = w.state;
  let tot = 0, foreign = 0;
  // `own` (province della nazione in ordine di indice) evita di scorrere tutta la mappa per ogni nazione
  for (const p of own ? own.map((i) => w.map.provinces[i]) : w.map.provinces) {
    if (s.owner[p.id] !== tag) continue;
    // le colonie pesano sulla stabilità come sul bilancio (corte 05, capo 7): l'8% fuori dall'Europa. Prima il Belgio
    // che prendeva il Congo perdeva 8 punti di stabilità per otto milioni di sudditi che non votavano né pagavano a Bruxelles
    const pop = p.pop * colonialWeight(w, tag, p.id);
    tot += pop;
    for (const c of composition(w, p.id)) foreign += pop * (c.share / 100) * foreignness(tag, c.eth);
  }
  return tot ? foreign / tot : 0;
}

/** Effetto sulla stabilità obiettivo: conquistare popoli altrui la abbassa (fino a −8), perderli la rialza (fino a +3). */
export function ethnicStability(w: World, tag: Tag, own?: number[]): number {
  const s = w.state;
  s.ethnicBase ??= {};
  if (s.ethnicBase[tag] === undefined) s.ethnicBase[tag] = foreignShare(w, tag, own);
  const d = foreignShare(w, tag, own) - s.ethnicBase[tag];
  return Math.max(-8, Math.min(3, -d * 40));
}

/** Breve descrizione per l'interfaccia e il modello. */
export function compositionText(w: World, p: number): string {
  return composition(w, p).filter((c) => c.share >= 3).map((c) => `${ethLabel(c.eth)} ${c.share}%`).join(', ');
}
