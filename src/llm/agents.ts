// Agenti-nazione: conversazione libera con ogni governo.
// L'agente non scrive mai lo stato: restituisce un intento; il codice valida ed esegue.

import { applyProposal, checkProposal, describeProposal, type Proposal } from '../engine/diplomacy';
import type { ChatMessage, GameEvent, Tag } from '../engine/types';
import { atWar, changeOpinion, nationName, opinion, type World } from '../engine/world';
import { chatJSON, type ChatMsg, type LLMConfig } from './client';
import { bilateralView, resolveNation, resolveProvince } from './context';
import { nationSystemPrompt } from './prompts';

/** I numeri del profilo diventano regole di comportamento esplicite (più affidabili dei numeri). */
export function behavioralRules(w: World, tag: Tag): string[] {
  const s = w.state;
  const p = w.profiles[tag];
  const n = s.nations[tag];
  const me = s.player;
  const r: string[] = [];
  if (p.finance < 20 || n.treasury < 15) r.push('Sei in BANCAROTTA di fatto: non puoi promettere sussidi, prestiti o campagne costose. Cerchi denaro, non lo offri.');
  else if (p.finance >= 75) r.push('Le tue finanze sono solide: puoi permetterti generosità calcolata, ma la fai pesare.');
  if (p.cohesion < 40) r.push('Il tuo stato è fragile al suo interno: una guerra lunga ti spaccherebbe. TEMI qualunque potenza possa sobillare le tue minoranze.');
  if (n.warExhaustion >= 50) r.push(`Il paese è STANCO DI GUERRA (${Math.round(n.warExhaustion)}/100): sei disposto a una pace anche dolorosa pur di finirla.`);
  if (n.stability < 30) r.push('Disordini interni: il governo è debole e non può permettersi umiliazioni pubbliche.');
  if (p.militaryQuality >= 80 && p.industry >= 70) r.push('Negozi dalla posizione di chi non ha bisogno di questo accordo: sei cortese, mai supplice.');
  if (p.naval >= 90) r.push('Domini il mare: sulle questioni marittime e coloniali non arretri.');
  if (p.doctrine === 'defensive') r.push('Le proposte di offensiva congiunta ti trovano scettico.');
  if (!p.major) r.push('Sei una potenza minore: cerchi la protezione delle grandi potenze ed eviti di sfidarle apertamente.');
  const op = opinion(s, tag, me);
  if (op <= -50) r.push(`Diffidi profondamente del tuo interlocutore (giudizio ${op}): nessuna alleanza, al massimo intese minime.`);
  else if (op <= -15) r.push(`Il tuo giudizio sul tuo interlocutore è negativo (${op}): chiedi garanzie concrete.`);
  else if (op >= 50) r.push(`Hai un giudizio molto favorevole sul tuo interlocutore (${op}): sei incline a intese strette.`);
  if (atWar(s, tag, me)) r.push('SEI IN GUERRA con il tuo interlocutore: discuti solo di armistizio, pace, condizioni o resa. Non cedi ciò che il nemico non ha conquistato, a meno che tu non sia esausto.');
  if (p.rivals.includes(me)) r.push('Il tuo interlocutore è un tuo rivale storico.');
  if (p.friends.includes(me)) r.push('Il tuo interlocutore è tradizionalmente amico.');
  const menMine = s.units.filter((u) => u.nation === tag).reduce((x, u) => x + u.strength, 0);
  const menThem = s.units.filter((u) => u.nation === me).reduce((x, u) => x + u.strength, 0);
  if (menThem > menMine * 2.5) r.push('Il loro esercito è molto più forte del tuo: eviti provocazioni dirette.');
  if (menMine > menThem * 2.5) r.push('Il tuo esercito è molto più forte del loro: non ti fai intimidire.');
  return r;
}

/** Controllo di plausibilità: certe cose un governo non le firma, qualunque cosa dica il modello. */
export function plausibility(w: World, tag: Tag, p: Proposal): string | null {
  const s = w.state;
  const me = s.player;
  const op = opinion(s, tag, me);
  const pr = w.profiles[tag];
  switch (p.type) {
    case 'alliance': if (op < -10) return `${pr.name} non si allea con chi giudica ostile (${op})`; break;
    case 'guarantee': if (op < 0 && (p.giver ?? tag) === tag) return `${pr.name} non garantisce chi non stima`; break;
    case 'join_war': if (op < 25 && !(p.against && pr.rivals.includes(p.against))) return `${pr.name} non entra in guerra per un governo che non stima abbastanza`; break;
    case 'subsidy': if ((p.giver ?? me) === tag && (op < 35 || (p.amount ?? 0) > s.nations[tag].treasury * 0.3)) return `${pr.name} non concede un sussidio simile`; break;
    case 'cede_provinces': if ((p.giver ?? tag) === tag && !atWar(s, tag, me)) return `${pr.name} non cede territorio in tempo di pace senza una contropartita enorme`; break;
  }
  return null;
}

export function parseProposal(w: World, raw: unknown, tag: Tag): Proposal | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const types = ['alliance', 'non_aggression', 'trade', 'military_access', 'guarantee', 'peace', 'subsidy', 'cede_provinces', 'join_war'];
  if (!types.includes(String(o.type))) return null;
  const p: Proposal = { type: o.type as Proposal['type'] };
  const giver = resolveNation(w, o.giver);
  if (giver && (giver === tag || giver === w.state.player)) p.giver = giver;
  if (Array.isArray(o.provinces)) p.provinces = o.provinces.map((x) => resolveProvince(w, x)).filter((x): x is number => x !== null).slice(0, 8);
  if (o.amount != null && isFinite(Number(o.amount))) p.amount = Math.max(0, Math.round(Number(o.amount)));
  if (o.years != null && isFinite(Number(o.years))) p.years = Math.max(1, Math.min(30, Math.round(Number(o.years))));
  const against = resolveNation(w, o.against);
  if (against) p.against = against;
  return p;
}

export interface TalkResult {
  reply: string;
  intent: string;
  proposal: Proposal | null;
  /** testo dell'accordo eseguito, se la nazione ha accettato e il codice ha convalidato */
  applied?: string;
  /** motivo del veto del codice */
  veto?: string;
}

const HISTORY = 14;

export async function talk(cfg: LLMConfig, w: World, tag: Tag, text: string, offer: Proposal | null, sink: GameEvent[], signal?: AbortSignal): Promise<TalkResult> {
  const s = w.state;
  const me = s.player;
  const chat = (s.chats[tag] ??= []);
  const history: ChatMsg[] = chat.slice(-HISTORY).map((m) => ({ role: m.role === 'player' ? 'user' : 'assistant', content: m.role === 'player' ? m.text : JSON.stringify({ reply: m.text, intent: m.intent ?? 'none' }) }));
  const offerTxt = offer ? `\n\nPROPOSTA FORMALE SUL TAVOLO (dal giocatore): ${describeProposal(w, me, tag, offer)} — JSON: ${JSON.stringify(offer)}` : '';
  const rules = behavioralRules(w, tag);
  const messages: ChatMsg[] = [
    { role: 'system', content: nationSystemPrompt(w.profiles[tag]) },
    ...history,
    { role: 'user', content: `[SITUAZIONE ATTUALE — riservata]\n${bilateralView(w, tag)}\n\nREGOLE DI COMPORTAMENTO IN VIGORE:\n${rules.map((r) => `- ${r}`).join('\n') || '- nessuna particolare'}\n\n[MESSAGGIO DEL GOVERNO DI ${nationName(w, me).toUpperCase()}]\n${text.slice(0, 1500)}${offerTxt}` },
  ];
  const model = cfg.diplomacyModel || cfg.model;
  const json = await chatJSON(cfg, messages, { model, temperature: 0.85, maxTokens: 700, signal });
  const reply = typeof json.reply === 'string' && json.reply.trim() ? json.reply.trim() : '…';
  const intent = ['none', 'accept', 'reject', 'counter', 'propose'].includes(String(json.intent)) ? String(json.intent) : 'none';
  let proposal = parseProposal(w, json.proposal, tag);
  if (intent === 'accept' && !proposal && offer) proposal = offer;
  const delta = Math.max(-10, Math.min(10, Math.round(Number(json.opinion_delta) || 0)));
  changeOpinion(s, tag, me, delta);

  const result: TalkResult = { reply, intent, proposal };
  chat.push({ role: 'player', text: text + (offer ? ` [Proposta: ${describeProposal(w, me, tag, offer)}]` : ''), day: s.day });
  if (intent === 'accept' && proposal) {
    const err = checkProposal(w, me, tag, proposal) ?? plausibility(w, tag, proposal);
    if (err) result.veto = err;
    else { applyProposal(w, me, tag, proposal, sink); result.applied = describeProposal(w, me, tag, proposal); }
  } else if ((intent === 'counter' || intent === 'propose') && proposal) {
    const err = checkProposal(w, me, tag, proposal);
    if (err) { result.veto = err; result.proposal = null; }
  } else result.proposal = intent === 'reject' || intent === 'none' ? null : proposal;
  const msg: ChatMessage = { role: 'nation', text: reply, day: s.day, intent };
  chat.push(msg);
  if (chat.length > 80) chat.splice(0, chat.length - 80);
  return result;
}

/** Il giocatore accetta una proposta messa sul tavolo dalla nazione. */
export function acceptOffer(w: World, tag: Tag, p: Proposal, sink: GameEvent[]): string | null {
  const s = w.state;
  const err = checkProposal(w, s.player, tag, p) ?? plausibility(w, tag, p);
  if (err) return err;
  applyProposal(w, s.player, tag, p, sink);
  (s.chats[tag] ??= []).push({ role: 'player', text: `[Accettiamo la vostra proposta: ${describeProposal(w, s.player, tag, p)}]`, day: s.day });
  return null;
}
