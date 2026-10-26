// Costruzione del contesto per il modello: compatto, in testo, con id espliciti
// così che il modello possa riferirsi a province e unità senza inventarle.

import { TREATY_LABEL } from '../engine/diplomacy';
import { POLICY_EFFECTS } from '../engine/economy';
import { TERRAIN_NAME } from '../engine/map';
import type { Tag } from '../engine/types';
import { atWar, enemiesOf, formatDate, nationName, opinion, warsOf, type World } from '../engine/world';

const k = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(Math.round(n)));

export function normalize(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Risolve un riferimento a provincia (id o nome) preferendo quelle vicine al giocatore. */
export function resolveProvince(w: World, ref: unknown): number | null {
  if (typeof ref === 'number' && w.map.provinces[ref]) return ref;
  if (typeof ref === 'string' && /^\d+$/.test(ref.trim())) { const n = Number(ref); return w.map.provinces[n] ? n : null; }
  if (typeof ref !== 'string' || !ref.trim()) return null;
  const q = normalize(ref.replace(/\(\s*\d+\s*\)/, ''));
  const idm = ref.match(/\((\d+)\)|#(\d+)/);
  if (idm) { const n = Number(idm[1] ?? idm[2]); if (w.map.provinces[n]) return n; }
  const s = w.state;
  const score = (id: number) => (s.controller[id] === s.player ? 0 : s.owner[id] === s.player ? 1 : 2);
  const exact = w.map.provinces.filter((p) => normalize(p.name) === q);
  if (exact.length) return exact.sort((a, b) => score(a.id) - score(b.id))[0].id;
  const starts = w.map.provinces.filter((p) => normalize(p.name).startsWith(q) || q.startsWith(normalize(p.name)));
  if (starts.length) return starts.sort((a, b) => score(a.id) - score(b.id))[0].id;
  const contains = w.map.provinces.filter((p) => normalize(p.name).includes(q));
  return contains.length ? contains.sort((a, b) => score(a.id) - score(b.id))[0].id : null;
}

/** Risolve il nome di una regione storica ("Galizia", "la Boemia"); null se non è una regione. */
export function resolveRegion(w: World, ref: unknown): number | null {
  if (typeof ref !== 'string' || !ref.trim()) return null;
  const q = normalize(ref).replace(/^(la|il|lo|l|le|i|gli) /, '').replace(/^regione (di |della |del |dell )?/, '');
  const regs = w.map.regions;
  let i = regs.findIndex((r) => normalize(r.name) === q);
  if (i < 0) i = regs.findIndex((r) => normalize(r.name).split(' ')[0] === q && q.length >= 4);
  return i >= 0 ? i : null;
}

/** Province di una regione possedute da una nazione (o tutte, se la nazione non è indicata). */
export function regionHoldings(w: World, r: number, owner?: Tag): number[] {
  return w.map.regionProvinces(r).filter((id) => !owner || w.state.owner[id] === owner);
}

/** Riassunto per regioni dei territori di una nazione: "Galizia 21 (3 occupate)". */
export function regionSummary(w: World, tag: Tag, occupier?: Tag): string {
  const s = w.state;
  const count = new Map<number, { n: number; occ: number }>();
  for (const p of w.map.provinces) {
    if (s.owner[p.id] !== tag || p.r === undefined) continue;
    const c = count.get(p.r) ?? { n: 0, occ: 0 };
    c.n++;
    if (occupier && s.controller[p.id] === occupier) c.occ++;
    count.set(p.r, c);
  }
  return [...count.entries()].sort((a, b) => b[1].n - a[1].n)
    .map(([r, c]) => `${w.map.regions[r].name} ${c.n}${c.occ ? ` (${c.occ} occupate)` : ''}`).join(', ');
}

export function resolveNation(w: World, ref: unknown): Tag | null {
  if (typeof ref !== 'string') return null;
  const t = ref.trim().toUpperCase();
  if (w.state.nations[t]) return t;
  const q = normalize(ref);
  for (const p of Object.values(w.profiles)) if (normalize(p.name).includes(q) || normalize(p.adjective).startsWith(q.slice(0, 5))) return p.tag;
  return null;
}

const pname = (w: World, id: number) => `${w.map.provinces[id].name} (${id})`;

/** Profili statici di tutte le nazioni: blocco stabile, cacheabile. */
export function nationsBlock(w: World): string {
  return Object.values(w.profiles)
    .filter((p) => w.state.nations[p.tag])
    .map((p) => `${p.tag} ${p.name} — ${p.government}; ${p.leader}. Industria ${p.industry}, qualità militare ${p.militaryQuality}, coesione ${p.cohesion}, finanze ${p.finance}, marina ${p.naval}. Obiettivi: ${p.goals.join('; ')}. Linee rosse: ${p.redLines.join('; ') || '—'}.`)
    .join('\n');
}

/** Stato del mondo dal punto di vista del giocatore (blocco volatile). */
export function worldDigest(w: World): string {
  const s = w.state;
  const me = s.player;
  const n = s.nations[me];
  const pol = n.policies;
  const lines: string[] = [];
  lines.push(`DATA: ${formatDate(s.day)} (turno ${s.turn}). Nazione del giocatore: ${nationName(w, me)} [${me}].`);
  const b = n.lastBudget;
  lines.push(`INTERNO: tesoro ${Math.round(n.treasury)} M, debito ${Math.round(n.debt)} M${b ? `, saldo settimanale ${b.net >= 0 ? '+' : ''}${b.net.toFixed(1)} M` : ''}, riserva ${k(n.manpower)} uomini, stabilità ${Math.round(n.stability)}/100, stanchezza di guerra ${Math.round(n.warExhaustion)}/100, ferrovie ${Math.round(n.rail)}/100.`);
  lines.push(`POLITICHE: ${POLICY_EFFECTS.tax[pol.tax].label}; ${POLICY_EFFECTS.mobilization[pol.mobilization].label}; ${POLICY_EFFECTS.infrastructure[pol.infrastructure].label}; ${POLICY_EFFECTS.press[pol.press].label}.`);
  const wars = s.wars;
  lines.push(`GUERRE IN CORSO: ${wars.length ? wars.map((x) => `${x.name} [${x.attackers.join(',')} vs ${x.defenders.join(',')}] dal ${formatDate(x.startDay)}`).join('; ') : 'nessuna'}.`);
  const tr = s.treaties.filter((t) => t.a === me || t.b === me);
  lines.push(`TRATTATI DEL GIOCATORE: ${tr.length ? tr.map((t) => `${TREATY_LABEL[t.type]} con ${t.a === me ? t.b : t.a}`).join('; ') : 'nessuno'}.`);
  lines.push(`ALTRI TRATTATI: ${s.treaties.filter((t) => t.a !== me && t.b !== me).map((t) => `${TREATY_LABEL[t.type]} ${t.a}-${t.b}`).join('; ') || 'nessuno'}.`);
  lines.push(`SITUAZIONI APERTE: ${s.situations.length ? s.situations.map((x) => `[${x.id}] ${x.title}: ${x.summary}`).join(' | ') : 'nessuna'}.`);
  // rapporti con le grandi potenze e i vicini
  const neighbours = new Set<Tag>();
  w.map.provinces.forEach((p) => { if (s.owner[p.id] === me) w.map.adj[p.id].forEach((e) => neighbours.add(s.owner[e.to])); });
  neighbours.delete(me);
  const rel = Object.values(w.profiles).filter((p) => s.nations[p.tag]?.alive && p.tag !== me && (p.major || neighbours.has(p.tag) || atWar(s, me, p.tag)));
  lines.push('RAPPORTI (opinione loro→noi / noi→loro, esercito):');
  for (const p of rel) {
    const men = s.units.filter((u) => u.nation === p.tag).reduce((x, u) => x + u.strength, 0);
    lines.push(`- ${p.tag} ${p.name}: ${opinion(s, p.tag, me)} / ${opinion(s, me, p.tag)}, ${k(men)} uomini${atWar(s, me, p.tag) ? ', IN GUERRA CON NOI' : ''}${warsOf(s, p.tag).length && !atWar(s, me, p.tag) ? ', in guerra altrove' : ''}, stanchezza ${Math.round(s.nations[p.tag].warExhaustion)}.`);
  }
  // unità del giocatore
  lines.push('UNITÀ DEL GIOCATORE (id: nome, tipo, forza/organico, morale, rifornimento, posizione, ordini):');
  for (const u of s.units.filter((x) => x.nation === me)) {
    const ord = u.orders.length ? u.orders.map((o) => `${o.type}${o.target != null ? '→' + w.map.provinces[o.target].name : ''}`).join(', ') : 'nessuno';
    lines.push(`- ${u.id}: ${u.name}, ${u.type}, ${k(u.strength)}/${k(u.maxStrength)}, morale ${Math.round(u.morale * 100)}%, rif. ${Math.round(u.supply * 100)}%, a ${pname(w, u.location)}${u.move?.path.length ? ` in marcia verso ${w.map.provinces[u.move.path[u.move.path.length - 1]].name}` : ''}${u.inBattle ? ' IN BATTAGLIA' : ''}; ordini: ${ord}`);
  }
  // forze nemiche vicine
  const enemies = enemiesOf(s, me);
  if (enemies.size) {
    lines.push('FORZE NEMICHE ENTRO DUE PROVINCE DAI NOSTRI TERRITORI:');
    const near = new Set<number>();
    w.map.provinces.forEach((p) => { if (s.controller[p.id] === me) { near.add(p.id); w.map.adj[p.id].forEach((e) => { near.add(e.to); w.map.adj[e.to].forEach((f) => near.add(f.to)); }); } });
    const byProv = new Map<number, number>();
    for (const u of s.units) if (enemies.has(u.nation) && near.has(u.location)) byProv.set(u.location, (byProv.get(u.location) ?? 0) + u.strength);
    for (const [p, men] of [...byProv].sort((a, b) => b[1] - a[1]).slice(0, 25)) lines.push(`- ${pname(w, p)}: ${k(men)} uomini (${s.controller[p]})`);
    const occ = w.map.provinces.filter((p) => s.owner[p.id] === me && s.controller[p.id] !== me);
    if (occ.length) lines.push(`NOSTRE PROVINCE OCCUPATE: ${occ.map((p) => `${pname(w, p.id)} da ${s.controller[p.id]}`).join(', ')}`);
    const ours = w.map.provinces.filter((p) => s.controller[p.id] === me && s.owner[p.id] !== me);
    if (ours.length) lines.push(`PROVINCE NEMICHE CHE OCCUPIAMO: ${ours.map((p) => pname(w, p.id)).join(', ')}`);
  }
  return lines.join('\n');
}

/** Elenco province utili per tradurre ordini: proprie, confinanti, vicino alle unità. */
export function provinceIndex(w: World): string {
  const s = w.state;
  const me = s.player;
  const ids = new Set<number>();
  w.map.provinces.forEach((p) => {
    if (s.owner[p.id] === me || s.controller[p.id] === me) { ids.add(p.id); w.map.adj[p.id].forEach((e) => ids.add(e.to)); }
  });
  for (const u of s.units.filter((x) => x.nation === me)) w.map.adj[u.location].forEach((e) => w.map.adj[e.to].forEach((f) => ids.add(f.to)));
  return [...ids].sort((a, b) => a - b).map((id) => {
    const p = w.map.provinces[id];
    return `${id} ${p.name} [${s.controller[id]}${s.owner[id] !== s.controller[id] ? `, di ${s.owner[id]}` : ''}; ${TERRAIN_NAME[p.terrain]}${p.coast ? ', costa' : ''}]`;
  }).join('\n');
}

/** Vista bilaterale per un agente-nazione: cosa sa del giocatore e di sé. */
export function bilateralView(w: World, tag: Tag): string {
  const s = w.state;
  const me = s.player;
  const n = s.nations[tag];
  const men = (t: Tag) => s.units.filter((u) => u.nation === t).reduce((x, u) => x + u.strength, 0);
  const treaties = s.treaties.filter((t) => (t.a === tag && t.b === me) || (t.b === tag && t.a === me));
  const theirTreaties = s.treaties.filter((t) => (t.a === tag || t.b === tag) && !treaties.includes(t));
  const lines = [
    `DATA: ${formatDate(s.day)}.`,
    `LA TUA SITUAZIONE: tesoro ${Math.round(n.treasury)} M, debito ${Math.round(n.debt)} M, esercito ${k(men(tag))} uomini, stabilità ${Math.round(n.stability)}/100, stanchezza di guerra ${Math.round(n.warExhaustion)}/100.`,
    `IL TUO GIUDIZIO SU ${nationName(w, me).toUpperCase()}: ${opinion(s, tag, me)}/100 (loro verso di te: ${opinion(s, me, tag)}). Esercito ${k(men(me))} uomini.`,
    `TRATTATI FRA VOI: ${treaties.length ? treaties.map((t) => TREATY_LABEL[t.type]).join(', ') : 'nessuno'}.`,
    `I TUOI ALTRI TRATTATI: ${theirTreaties.length ? theirTreaties.map((t) => `${TREATY_LABEL[t.type]} con ${nationName(w, t.a === tag ? t.b : t.a)}`).join('; ') : 'nessuno'}.`,
    `GUERRE: ${warsOf(s, tag).map((x) => x.name).join('; ') || 'nessuna'}${atWar(s, tag, me) ? ' — SEI IN GUERRA CON IL TUO INTERLOCUTORE' : ''}.`,
  ];
  if (atWar(s, tag, me)) {
    const lost = w.map.provinces.filter((p) => s.owner[p.id] === tag && s.controller[p.id] === me);
    const taken = w.map.provinces.filter((p) => s.owner[p.id] === me && s.controller[p.id] === tag);
    lines.push(`TUE PROVINCE OCCUPATE DA LORO: ${lost.map((p) => `${p.name} (${p.id})`).join(', ') || 'nessuna'}.`);
    lines.push(`LORO PROVINCE CHE OCCUPI: ${taken.map((p) => `${p.name} (${p.id})`).join(', ') || 'nessuna'}.`);
  }
  lines.push(`TUE REGIONI (province per regione): ${regionSummary(w, tag, atWar(s, tag, me) ? me : undefined)}.`);
  lines.push(`REGIONI ${nationName(w, me).toUpperCase()}: ${regionSummary(w, me, atWar(s, tag, me) ? tag : undefined)}.`);
  const border = w.map.provinces.filter((p) => s.owner[p.id] === tag && w.map.adj[p.id].some((e) => s.owner[e.to] === me));
  if (border.length) lines.push(`PROVINCE DI CONFINE CON LORO (tue): ${border.slice(0, 15).map((p) => `${p.name} (${p.id})`).join(', ')}.`);
  const recent = s.events.filter((e) => e.nations.includes(tag) && e.nations.includes(me)).slice(-8);
  if (recent.length) lines.push(`FATTI RECENTI FRA VOI: ${recent.map((e) => `${formatDate(e.day)}: ${e.text}`).join(' ')}`);
  const sit = s.situations.filter((x) => x.nations.includes(tag));
  if (sit.length) lines.push(`QUESTIONI APERTE CHE TI RIGUARDANO: ${sit.map((x) => `${x.title}: ${x.summary}`).join(' | ')}`);
  return lines.join('\n');
}
