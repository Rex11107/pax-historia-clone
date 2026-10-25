// Game Master: traduce le direttive in ordini e racconta il turno.
// Tutto ciò che restituisce passa dalla validazione del codice prima di toccare lo stato.

import { addTreaty, declareWar, makePeace } from '../engine/diplomacy';
import { recruit, setPolicy } from '../engine/economy';
import { assignOrders } from '../engine/orders';
import type { Condition, GameEvent, Order, Policies, Tag, TreatyType, TurnReport, UnitType } from '../engine/types';
import { atWar, changeOpinion, emit, formatDate, nationName, opinion, treatyBetween, warsOf, type World } from '../engine/world';
import { chatJSON, type ChatMsg, type LLMConfig } from './client';
import { nationsBlock, provinceIndex, resolveNation, resolveProvince, worldDigest } from './context';
import { GM_RULES, NARRATE_TASK, TRANSLATE_TASK } from './prompts';

export interface TranslateResult { applied: string[]; errors: string[]; notes: string }

const asArr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const asObj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

function stableContext(w: World): ChatMsg {
  return { role: 'user', content: `NAZIONI (profili statici):\n${nationsBlock(w)}` };
}

export function parseCondition(w: World, raw: unknown): Condition | undefined {
  const c = asObj(raw);
  if (!c.type) return undefined;
  const prov = (v: unknown) => resolveProvince(w, v) ?? -1;
  switch (c.type) {
    case 'always': return { type: 'always' };
    case 'day_gte': return { type: 'day_gte', value: Math.max(0, Math.min(90, Number(c.value) || 0)) };
    case 'supply_gte': return { type: 'supply_gte', value: Math.max(0, Math.min(1, Number(c.value) || 0)) };
    case 'strength_gte': return { type: 'strength_gte', value: Math.max(0, Math.min(1, Number(c.value) || 0)) };
    case 'unit_at': return { type: 'unit_at', unit: String(c.unit), province: prov(c.province) };
    case 'controlled_by': return { type: 'controlled_by', province: prov(c.province), nation: String(c.nation).toUpperCase() };
    case 'no_enemy_at': return { type: 'no_enemy_at', province: prov(c.province) };
    default: return { type: String(c.type) } as unknown as Condition; // la validazione lo scarterà
  }
}

export function parseOrder(w: World, raw: unknown): Order {
  const o = asObj(raw);
  const out: Order = { type: String(o.type) as Order['type'] };
  if (o.target !== undefined) out.target = resolveProvince(w, o.target) ?? -1;
  const pre = parseCondition(w, o.precondition);
  const until = parseCondition(w, o.until);
  if (pre) out.precondition = pre;
  if (until) out.until = until;
  if (typeof o.label === 'string') out.label = o.label.slice(0, 60);
  return out;
}

/** Applica il JSON di traduzione (anche usato dai test con risposte finte). */
export function applyTranslation(w: World, json: Record<string, unknown>, sink: GameEvent[]): TranslateResult {
  const s = w.state;
  const me = s.player;
  const applied: string[] = [];
  const errors: string[] = [];
  for (const raw of asArr(json.orders).slice(0, 60)) {
    const b = asObj(raw);
    const unit = s.units.find((u) => u.id === b.unit && u.nation === me);
    if (!unit) { errors.push(`unità sconosciuta o non nostra: ${String(b.unit)}`); continue; }
    const orders = asArr(b.orders).map((o) => parseOrder(w, o));
    const errs = assignOrders(w, unit.id, orders, b.mode === 'append' ? 'append' : 'replace', me);
    errors.push(...errs.map((e) => `${unit.name}: ${e}`));
    if (orders.length > errs.length) applied.push(`${unit.name}: ${orders.length - errs.length} ordini`);
  }
  const pol = asObj(json.policies);
  for (const key of ['tax', 'mobilization', 'infrastructure', 'press'] as const) {
    if (pol[key] === undefined) continue;
    const err = setPolicy(w, me, key, String(pol[key]) as Policies[typeof key]);
    if (err) errors.push(err); else applied.push(`politica ${key}: ${String(pol[key])}`);
  }
  for (const raw of asArr(json.recruit).slice(0, 4)) {
    const r = asObj(raw);
    const prov = resolveProvince(w, r.province);
    if (prov === null) { errors.push(`arruolamento: provincia sconosciuta ${String(r.province)}`); continue; }
    const err = recruit(w, me, String(r.type) as UnitType, prov, sink);
    if (err) errors.push(`arruolamento a ${w.map.provinces[prov].name}: ${err}`); else applied.push(`arruolamento a ${w.map.provinces[prov].name}`);
  }
  for (const raw of asArr(json.declare_war).slice(0, 1)) {
    const d = asObj(raw);
    const target = resolveNation(w, d.target);
    if (!target) { errors.push(`dichiarazione di guerra: nazione sconosciuta ${String(d.target)}`); continue; }
    const err = declareWar(w, me, target, String(d.reason ?? '').slice(0, 120), sink);
    if (err) errors.push(`guerra a ${nationName(w, target)}: ${err}`); else applied.push(`guerra a ${nationName(w, target)}`);
  }
  return { applied, errors, notes: typeof json.notes === 'string' ? json.notes : '' };
}

export async function translate(cfg: LLMConfig, w: World, directive: string, sink: GameEvent[], signal?: AbortSignal): Promise<TranslateResult> {
  const messages: ChatMsg[] = [
    { role: 'system', content: `${GM_RULES}\n\n${TRANSLATE_TASK}` },
    stableContext(w),
    { role: 'user', content: `STATO ATTUALE:\n${worldDigest(w)}\n\nPROVINCE (id nome [controllo; terreno]):\n${provinceIndex(w)}\n\nDIRETTIVE DEL GIOCATORE PER QUESTO TURNO:\n"""${directive.slice(0, 2000)}"""` },
  ];
  const json = await chatJSON(cfg, messages, { temperature: 0.2, maxTokens: 1500, signal });
  return applyTranslation(w, json, sink);
}

const NOISY = new Set(['contact', 'unit_raised']);

export function eventsForPrompt(w: World, events: GameEvent[]): string {
  const me = w.state.player;
  const relevant = events.filter((e) => !NOISY.has(e.type) || e.nations.includes(me));
  const lines = relevant.slice(0, 60).map((e) => `${formatDate(e.day)}: ${e.text}`);
  const raised = events.filter((e) => e.type === 'unit_raised' && !e.nations.includes(me)).length;
  if (raised) lines.push(`(${raised} nuove unità arruolate da nazioni straniere)`);
  return lines.join('\n') || 'Nessun evento militare o diplomatico di rilievo.';
}

export interface NarrateResult { narrative: string; summary: string; worldApplied: string[]; worldRejected: string[] }

/** Applica le azioni "mondo" proposte dal GM con i limiti del codice. */
export function applyWorldActions(w: World, json: Record<string, unknown>, sink: GameEvent[]): { applied: string[]; rejected: string[] } {
  const s = w.state;
  const me = s.player;
  const applied: string[] = [];
  const rejected: string[] = [];
  let wars = 0;
  for (const raw of asArr(json.world).slice(0, 3)) {
    const a = asObj(raw);
    const A = resolveNation(w, a.a ?? a.from), B = resolveNation(w, a.b ?? a.to);
    if (!A || !B || A === B || !s.nations[A].alive || !s.nations[B].alive) { rejected.push(`azione con nazioni non valide: ${JSON.stringify(a).slice(0, 80)}`); continue; }
    if (a.type === 'declare_war') {
      if (A === me) { rejected.push('il GM non può dichiarare guerra al posto del giocatore'); continue; }
      if (wars >= 1) { rejected.push('più di una dichiarazione di guerra nello stesso turno'); continue; }
      const op = opinion(s, A, B);
      const pa = w.profiles[A], pb = w.profiles[B];
      const situation = s.situations.some((x) => x.nations.includes(A) && x.nations.includes(B));
      const motive = op <= -40 || (pa.rivals.includes(B) && op <= -20) || (situation && pa.major && !pb.major && op <= 10);
      if (!motive) { rejected.push(`${pa.name} non ha motivo di attaccare ${pb.name} (giudizio ${op})`); continue; }
      if (warsOf(s, A).length >= 2) { rejected.push(`${pa.name} è già impegnata in troppe guerre`); continue; }
      if (B === me && op > -50) { rejected.push(`${pa.name} non è abbastanza ostile al giocatore`); continue; }
      const err = declareWar(w, A, B, String(a.reason ?? '').slice(0, 120), sink);
      if (err) rejected.push(err); else { wars++; applied.push(`${A} dichiara guerra a ${B}`); }
    } else if (a.type === 'peace') {
      if (A === me || B === me) { rejected.push('la pace col giocatore si negozia in diplomazia'); continue; }
      const war = s.wars.find((x) => (x.attackers.includes(A) && x.defenders.includes(B)) || (x.attackers.includes(B) && x.defenders.includes(A)));
      if (!war) { rejected.push(`${A} e ${B} non sono in guerra`); continue; }
      if (s.day - war.startDay < 28) { rejected.push('guerra troppo recente per una pace'); continue; }
      makePeace(w, A, B, {}, sink); applied.push(`pace ${A}-${B}`);
    } else if (a.type === 'treaty') {
      const t = String(a.treaty) as TreatyType;
      if (!['alliance', 'non_aggression', 'trade', 'guarantee'].includes(t)) { rejected.push(`trattato sconosciuto ${t}`); continue; }
      if (A === me || B === me) { rejected.push('i trattati col giocatore si negoziano in diplomazia'); continue; }
      if (atWar(s, A, B) || treatyBetween(s, A, B, t)) { rejected.push(`trattato ${t} ${A}-${B} incoerente`); continue; }
      if (opinion(s, A, B) < 15 || opinion(s, B, A) < 15) { rejected.push(`${A} e ${B} non si fidano abbastanza per un trattato`); continue; }
      addTreaty(w, t, A, B, t === 'alliance' || t === 'guarantee' ? null : 10, sink); applied.push(`trattato ${t} ${A}-${B}`);
    } else if (a.type === 'opinion') {
      const d = Math.max(-15, Math.min(15, Math.round(Number(a.delta) || 0)));
      if (!d) continue;
      changeOpinion(s, A, B, d);
      applied.push(`opinione ${A}→${B} ${d > 0 ? '+' : ''}${d}`);
      if (B === me && Math.abs(d) >= 8) emit(w, { type: 'opinion', nations: [A, B], text: `Cambia l'atteggiamento di ${nationName(w, A)} verso di noi${a.reason ? `: ${String(a.reason).slice(0, 100)}` : ''}.` }, sink);
    } else rejected.push(`azione sconosciuta ${String(a.type)}`);
  }
  // situazioni
  const sit = asObj(json.situations);
  for (const raw of asArr(sit.open).slice(0, 2)) {
    const o = asObj(raw);
    const id = String(o.id ?? '').replace(/[^a-z0-9_]/gi, '').slice(0, 30);
    if (!id || s.situations.some((x) => x.id === id) || s.situations.length >= 8) continue;
    const nations = asArr(o.nations).map((t) => resolveNation(w, t)).filter((t): t is Tag => !!t);
    s.situations.push({ id, title: String(o.title ?? id).slice(0, 60), summary: String(o.summary ?? '').slice(0, 300), startDay: s.day, nations });
  }
  const close = new Set(asArr(sit.close).map(String));
  s.situations = s.situations.filter((x) => !close.has(x.id) || s.wars.some((war) => war.id === x.id));
  return { applied, rejected };
}

export async function narrate(cfg: LLMConfig, w: World, report: TurnReport, sink: GameEvent[], signal?: AbortSignal): Promise<NarrateResult> {
  const s = w.state;
  const wantChronicle = s.turn % 6 === 0 || !s.chronicle;
  const memory = s.memory.slice(-6).map((m) => `Turno ${m.turn}: ${m.text}`).join('\n');
  const messages: ChatMsg[] = [
    { role: 'system', content: `${GM_RULES}\n\n${NARRATE_TASK}` },
    stableContext(w),
    {
      role: 'user',
      content: `CRONACA DELLA PARTITA FINORA:\n${s.chronicle || '(inizio partita)'}\n\nULTIMI TURNI:\n${memory || '(nessuno)'}\n\nSTATO ATTUALE:\n${worldDigest(w)}\n\nEVENTI DI QUESTO TURNO (dal ${formatDate(report.fromDay)} al ${formatDate(report.toDay)}):\n${eventsForPrompt(w, report.events)}\n\n${wantChronicle ? 'Aggiorna anche "chronicle".' : 'Non serve "chronicle".'}`,
    },
  ];
  const json = await chatJSON(cfg, messages, { temperature: 0.8, maxTokens: 1400, signal });
  const { applied, rejected } = applyWorldActions(w, json, sink);
  const summary = typeof json.summary === 'string' ? json.summary.slice(0, 400) : '';
  if (wantChronicle && typeof json.chronicle === 'string') s.chronicle = json.chronicle.slice(0, 1500);
  return { narrative: typeof json.narrative === 'string' ? json.narrative : fallbackNarrative(w, report), summary, worldApplied: applied, worldRejected: rejected };
}

/** Dispaccio senza AI (nessuna chiave o errore di rete): elenco ordinato dei fatti. */
export function fallbackNarrative(w: World, report: TurnReport): string {
  const me = w.state.player;
  const mine = report.events.filter((e) => e.nations.includes(me) && e.type !== 'contact');
  const other = report.events.filter((e) => !e.nations.includes(me) && ['war_declared', 'peace', 'treaty_signed', 'battle_ended', 'nation_annexed'].includes(e.type));
  const list = [...mine, ...other].slice(0, 12).map((e) => `• ${e.text}`);
  return list.length ? list.join('\n') : 'Settimana tranquilla: nessun evento di rilievo.';
}

export function memorySummaryFallback(w: World, report: TurnReport): string {
  return report.events.filter((e) => ['war_declared', 'peace', 'battle_ended', 'province_captured', 'treaty_signed', 'treaty_violated'].includes(e.type)).slice(0, 5).map((e) => e.text).join(' ').slice(0, 400) || `Turno ${report.turn} senza fatti rilevanti.`;
}

export function recordMemory(w: World, turn: number, text: string) {
  w.state.memory.push({ turn, text });
  if (w.state.memory.length > 40) w.state.memory.splice(0, w.state.memory.length - 40);
}
