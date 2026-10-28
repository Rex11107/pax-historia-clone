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
export const majority = (w: World, p: number) => composition(w, p).reduce((a, b) => (b.share > a.share ? b : a)).eth;
export const ethLabel = (id: string) => ETHNICITIES[id]?.label ?? id;

/** Quanto un popolo è "estraneo" per uno Stato: 0 proprio, 0,5 regionale, 1 altrimenti. */
export function foreignness(tag: Tag, eth: string): number {
  const sp = STATE_PEOPLES[tag];
  if (!sp) return 1;
  if (sp.own.includes(eth)) return 0;
  if (sp.regional?.includes(eth)) return 0.5;
  return 1;
}

/** Quota della popolazione di uno Stato che appartiene ad altri popoli (0-1). */
export function foreignShare(w: World, tag: Tag): number {
  const s = w.state;
  let tot = 0, foreign = 0;
  for (const p of w.map.provinces) {
    if (s.owner[p.id] !== tag) continue;
    tot += p.pop;
    for (const c of composition(w, p.id)) foreign += p.pop * (c.share / 100) * foreignness(tag, c.eth);
  }
  return tot ? foreign / tot : 0;
}

/** Effetto sulla stabilità obiettivo: conquistare popoli altrui la abbassa (fino a −8), perderli la rialza (fino a +3). */
export function ethnicStability(w: World, tag: Tag): number {
  const s = w.state;
  s.ethnicBase ??= {};
  if (s.ethnicBase[tag] === undefined) s.ethnicBase[tag] = foreignShare(w, tag);
  const d = foreignShare(w, tag) - s.ethnicBase[tag];
  return Math.max(-8, Math.min(3, -d * 40));
}

/** Breve descrizione per l'interfaccia e il modello. */
export function compositionText(w: World, p: number): string {
  return composition(w, p).filter((c) => c.share >= 3).map((c) => `${ethLabel(c.eth)} ${c.share}%`).join(', ');
}
