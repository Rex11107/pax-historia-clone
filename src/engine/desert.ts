import type { GameEvent, Tag } from './types';
import { emit, NOBODY, the, type World } from './world';

// Il deserto non si conquista con le truppe (non ci si entra): appartiene a chi controlla tutte le terre
// transitabili che lo circondano (oasi, coste, terre abitate confinanti). Se attorno ci sono più padroni,
// o terre di nessuno, il deserto resta conteso: terra di nessuno.
//
// Sicurezza contro il "border gore": contano solo le terre dello stesso paese di oggi del deserto. Un deserto
// algerino non passa agli Ottomani solo perché tocca Gadames, oasi libica. Un deserto interno senza terre
// transitabili del suo paese attorno segue i deserti confinanti dello stesso paese, se hanno tutti un solo padrone.

/** Padrone che il deserto `p` dovrebbe avere adesso (con i padroni attuali degli altri deserti). */
export function desertOwner(w: World, p: number): Tag {
  const s = w.state;
  const pv = w.map.provinces[p];
  const sameCountry = (q: number) => !pv.modern || w.map.provinces[q].modern === pv.modern;
  let only: Tag | null = null, land = 0;
  for (const e of w.map.adj[p]) {
    if (e.strait || e.route || !w.map.passable(e.to) || !sameCountry(e.to)) continue;
    land++;
    const c = s.controller[e.to];
    if (c === NOBODY) return NOBODY;
    if (only === null) only = c;
    else if (only !== c) return NOBODY;
  }
  if (land) return only ?? NOBODY;
  // nessuna terra transitabile del suo paese attorno: segue i deserti vicini dello stesso paese
  for (const e of w.map.adj[p]) {
    if (e.strait || e.route || w.map.passable(e.to) || !sameCountry(e.to)) continue;
    const c = s.owner[e.to];
    if (c === NOBODY) return NOBODY;
    if (only === null) only = c;
    else if (only !== c) return NOBODY;
  }
  return only ?? NOBODY;
}

/** Ricalcola i padroni del deserto; con `sink` annuncia i cambi (una notizia per nazione). */
export function updateDeserts(w: World, sink?: GameEvent[]) {
  const s = w.state;
  const before = new Map<number, Tag>();
  for (const pv of w.map.provinces) if (pv.impassable) before.set(pv.id, s.owner[pv.id]);
  // più passate: i deserti interni seguono quelli di confine
  for (let pass = 0; pass < 4; pass++) {
    let changed = false;
    for (const pv of w.map.provinces) {
      if (!pv.impassable) continue;
      const next = desertOwner(w, pv.id);
      if (next !== s.owner[pv.id] || s.controller[pv.id] !== next) { s.owner[pv.id] = next; s.controller[pv.id] = next; changed = true; }
    }
    if (!changed) break;
  }
  if (!sink) return;
  const gained = new Map<Tag, string[]>(), lost = new Map<Tag, string[]>();
  for (const [id, prev] of before) {
    const next = s.owner[id];
    if (next === prev) continue;
    const name = w.map.provinces[id].name;
    if (next !== NOBODY) gained.set(next, [...(gained.get(next) ?? []), name]);
    if (prev !== NOBODY) lost.set(prev, [...(lost.get(prev) ?? []), name]);
  }
  for (const [tag, names] of gained) emit(w, { type: 'province_captured', nations: [tag], text: `Controllando tutte le terre attorno, ${the(w, tag)} estende la sua autorità sul deserto: ${names.join(', ')}.` }, sink);
  for (const [tag, names] of lost) if (!gained.has(tag)) emit(w, { type: 'province_captured', nations: [tag], text: `Il deserto torna terra di nessuno: ${names.join(', ')} (${the(w, tag)} non controlla più tutte le terre attorno).` }, sink);
}
