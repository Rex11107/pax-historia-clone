// Invarianti dello stato di gioco: ciò che deve essere vero alla fine di ogni turno, qualunque cosa sia successa.
//
// Non sono regole di gioco ma condizioni di salute: se una si rompe c'è un errore nel motore (un padrone che non
// esiste più, un'unità nel deserto, un'alleanza fra due nazioni in guerra…). Le usano i test
// (tests/invariants.test.ts) e la simulazione lunga (scripts/sim/invarianti.mts); il gioco non le chiama.
import type { Tag } from './types';
import { atWar, canEnter, NOBODY, type World } from './world';

const fin = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Elenco delle invarianti violate (vuoto = stato sano). */
export function checkInvariants(w: World): string[] {
  const s = w.state, map = w.map;
  const out: string[] = [];
  const bad = (msg: string) => { if (out.length < 200) out.push(msg); };
  const alive = (t: Tag) => !!s.nations[t]?.alive;
  const pname = (p: number) => map.provinces[p]?.name ?? `#${p}`;

  // --- province ---
  if (s.owner.length !== map.size || s.controller.length !== map.size) bad(`padroni: ${s.owner.length}/${s.controller.length} voci per ${map.size} province`);
  const owns = new Map<Tag, number>();
  const fighting = new Set<Tag>();
  for (const x of s.wars) for (const t of [...x.attackers, ...x.defenders]) fighting.add(t);
  for (let p = 0; p < map.size; p++) {
    const o = s.owner[p], c = s.controller[p];
    if (o !== NOBODY && !alive(o)) bad(`${pname(p)}: padrone ${o} inesistente o scomparso`);
    if (c !== NOBODY && !alive(c)) bad(`${pname(p)}: controllore ${c} inesistente o scomparso`);
    if (map.provinces[p].impassable && o !== c) bad(`${pname(p)}: deserto con padrone ${o || '-'} e controllore ${c || '-'}`);
    // senza guerra col padrone si tiene una provincia solo se la si è tolta a un nemico e si combatte ancora
    if (o !== c && c !== NOBODY && o !== NOBODY && !atWar(s, o, c) && !fighting.has(c)) bad(`${pname(p)}: occupata da ${c}, che non è in guerra con nessuno`);
    if (o === NOBODY && c !== NOBODY) bad(`${pname(p)}: terra di nessuno controllata da ${c}`);
    if (o !== NOBODY && c === NOBODY) bad(`${pname(p)}: di ${o} ma controllata da nessuno`);
    owns.set(o, (owns.get(o) ?? 0) + 1);
  }

  // --- nazioni ---
  for (const n of Object.values(s.nations)) {
    const t = n.tag;
    if (!w.profiles[t]) bad(`${t}: nazione senza profilo`);
    if (n.alive && !owns.get(t)) bad(`${t}: viva senza province`);
    if (!n.alive) continue;
    if (s.owner[n.capital] !== t) bad(`${t}: la capitale ${pname(n.capital)} è di ${s.owner[n.capital] || 'nessuno'}`);
    for (const k of ['treasury', 'debt', 'manpower'] as const) if (!fin(n[k]) || n[k] < 0) bad(`${t}: ${k} = ${n[k]}`);
    for (const k of ['stability', 'warExhaustion', 'rail'] as const) if (!fin(n[k]) || n[k] < 0 || n[k] > 100) bad(`${t}: ${k} = ${n[k]}`);
    for (const [o, v] of Object.entries(n.opinion)) if (!fin(v) || v < -100 || v > 100) bad(`${t}: stima verso ${o} = ${v}`);
    if (n.lastBudget) for (const [k, v] of Object.entries(n.lastBudget)) if (!fin(v)) bad(`${t}: bilancio.${k} = ${v}`);
  }

  // --- unità ---
  const ids = new Set<string>();
  for (const u of s.units) {
    if (ids.has(u.id)) bad(`unità ${u.id}: identificativo doppio`);
    ids.add(u.id);
    if (!alive(u.nation)) { bad(`unità ${u.id}: nazione ${u.nation} scomparsa`); continue; }
    if (!map.provinces[u.location]) { bad(`unità ${u.id}: provincia ${u.location} inesistente`); continue; }
    if (!map.passable(u.location)) bad(`unità ${u.id}: nel deserto (${pname(u.location)})`);
    if (!canEnter(s, u.nation, u.location)) bad(`unità ${u.id}: in ${pname(u.location)} di ${s.controller[u.location] || 'nessuno'}, dove non può stare`);
    if (!fin(u.strength) || u.strength <= 0 || u.strength > u.maxStrength) bad(`unità ${u.id}: forza ${u.strength} su ${u.maxStrength}`);
    for (const k of ['morale', 'supply', 'experience', 'entrench'] as const) if (!fin(u[k]) || u[k] < 0 || u[k] > 1) bad(`unità ${u.id}: ${k} = ${u[k]}`);
    if (u.move) {
      if (!fin(u.move.progress) || !fin(u.move.legDays)) bad(`unità ${u.id}: marcia con numeri non validi`);
      for (const p of u.move.path) if (!map.provinces[p]) bad(`unità ${u.id}: percorso per una provincia inesistente (${p})`);
    }
    for (const o of u.orders) if (o.target !== undefined && !map.provinces[o.target]) bad(`unità ${u.id}: ordine verso una provincia inesistente (${o.target})`);
  }

  // --- guerre, trattati, soggetti ---
  const warIds = new Set<string>();
  for (const x of s.wars) {
    if (warIds.has(x.id)) bad(`guerra ${x.id}: identificativo doppio`);
    warIds.add(x.id);
    if (!x.attackers.length || !x.defenders.length) bad(`${x.name}: un lato è vuoto`);
    for (const t of [...x.attackers, ...x.defenders]) if (!alive(t)) bad(`${x.name}: ${t} non esiste più`);
    for (const t of x.attackers) if (x.defenders.includes(t)) bad(`${x.name}: ${t} sta da tutte e due le parti`);
    if (new Set(x.attackers).size !== x.attackers.length || new Set(x.defenders).size !== x.defenders.length) bad(`${x.name}: una nazione compare due volte`);
    for (const [t, v] of Object.entries(x.casualties)) if (!fin(v) || v < 0) bad(`${x.name}: perdite di ${t} = ${v}`);
  }
  for (const t of s.treaties) {
    if (t.violated) continue;
    if (!alive(t.a) || !alive(t.b)) bad(`trattato ${t.type} ${t.a}-${t.b}: una parte non esiste più`);
    else if ((t.type === 'alliance' || t.type === 'non_aggression') && atWar(s, t.a, t.b)) bad(`trattato ${t.type} in vigore fra ${t.a} e ${t.b}, che sono in guerra`);
  }
  const lords = new Map<Tag, Tag>();
  for (const x of s.subjects ?? []) {
    if (!alive(x.subject) || !alive(x.overlord)) bad(`soggetto ${x.subject} di ${x.overlord}: una parte non esiste più`);
    if (x.subject === x.overlord) bad(`${x.subject} soggetto di sé stesso`);
    if (lords.has(x.subject)) bad(`${x.subject} ha due signori (${lords.get(x.subject)} e ${x.overlord})`);
    lords.set(x.subject, x.overlord);
    if (!fin(x.liberty) || x.liberty < 0 || x.liberty > 100) bad(`soggetto ${x.subject}: desiderio di indipendenza ${x.liberty}`);
    if (alive(x.subject) && alive(x.overlord) && atWar(s, x.subject, x.overlord)) bad(`${x.subject} è in guerra col suo signore ${x.overlord}`);
  }
  for (const [sub, lord] of lords) { let t = lord, n = 0; while (lords.has(t) && n++ < 10) t = lords.get(t)!; if (t === sub || n >= 10) bad(`catena di soggezione circolare da ${sub}`); }

  // --- contratti, cantieri, indennità, battaglie ---
  for (const c of s.trades ?? []) {
    if (!alive(c.seller) || !alive(c.buyer)) bad(`contratto ${c.id}: una parte non esiste più`);
    if (!fin(c.price) || c.price < 0 || !(c.qty >= 1)) bad(`contratto ${c.id}: prezzo ${c.price}, lotti ${c.qty}`);
  }
  for (const pr of s.projects ?? []) {
    if (!map.provinces[pr.province] || map.provinces[pr.province].impassable) bad(`cantiere ${pr.id}: provincia non valida`);
    if (!alive(pr.nation)) bad(`cantiere ${pr.id}: ${pr.nation} non esiste più`);
  }
  for (const r of s.reparations ?? []) if (!alive(r.payer) || !alive(r.receiver) || !(r.weeksLeft > 0) || !fin(r.perWeek)) bad(`indennità ${r.payer}→${r.receiver}: non valida`);
  for (const [k, b] of Object.entries(s.battles)) if (!map.provinces[b.province] || String(b.province) !== k) bad(`battaglia ${k}: provincia non valida`);
  for (const p of s.research?.projects ?? []) for (const t of p.nations) if (!alive(t)) bad(`ricerca ${p.tech}: ${t} non esiste più`);
  return out;
}
