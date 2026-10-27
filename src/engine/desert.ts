import type { GameEvent, Tag } from './types';
import { emit, NOBODY, the, type World } from './world';

// Il deserto non si conquista con le truppe (non ci si entra): appartiene a chi controlla tutte le terre
// transitabili che lo circondano (oasi, coste, terre abitate confinanti). Se attorno ci sono più padroni,
// o terre di nessuno, il deserto resta conteso: terra di nessuno.

/** Padrone che il deserto `p` dovrebbe avere adesso. */
export function desertOwner(w: World, p: number): Tag {
  const s = w.state;
  let only: Tag | null = null;
  for (const e of w.map.adj[p]) {
    if (e.strait || e.route || !w.map.passable(e.to)) continue;
    const c = s.controller[e.to];
    if (c === NOBODY) return NOBODY;
    if (only === null) only = c;
    else if (only !== c) return NOBODY;
  }
  return only ?? NOBODY;
}

/** Ricalcola i padroni del deserto; con `sink` annuncia i cambi (una notizia per nazione). */
export function updateDeserts(w: World, sink?: GameEvent[]) {
  const s = w.state;
  const gained = new Map<Tag, string[]>(), lost = new Map<Tag, string[]>();
  for (const pv of w.map.provinces) {
    if (!pv.impassable) continue;
    const next = desertOwner(w, pv.id), prev = s.owner[pv.id];
    if (next === prev && s.controller[pv.id] === next) continue;
    s.owner[pv.id] = next;
    s.controller[pv.id] = next;
    if (next !== NOBODY) gained.set(next, [...(gained.get(next) ?? []), pv.name]);
    if (prev !== NOBODY && prev !== next) lost.set(prev, [...(lost.get(prev) ?? []), pv.name]);
  }
  if (!sink) return;
  for (const [tag, names] of gained) emit(w, { type: 'province_captured', nations: [tag], text: `Controllando tutte le terre attorno, ${the(w, tag)} estende la sua autorità sul deserto: ${names.join(', ')}.` }, sink);
  for (const [tag, names] of lost) if (!gained.has(tag)) emit(w, { type: 'province_captured', nations: [tag], text: `Il deserto torna terra di nessuno: ${names.join(', ')} (${the(w, tag)} non controlla più tutte le terre attorno).` }, sink);
}
