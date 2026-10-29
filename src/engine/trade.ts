import { techEffects } from './research';
// Commercio delle risorse: contratti fra due nazioni, gestiti interamente dal motore.
//
// Un contratto vende ogni settimana `qty` lotti di una risorsa (un lotto = la produzione
// di una provincia). Il venditore rinuncia al valore di quei lotti e incassa il prezzo;
// il compratore paga e ne ottiene il valore, di più se la risorsa gli manca del tutto.
// Il prezzo parte dal valore per il venditore (+25% di margine); senza accordo commerciale
// fra i due paesi dazi e intermediari aggiungono il 30%. Ogni settimana il contratto
// migliora un poco le relazioni, in proporzione al peso che ha per l'economia di ciascuno.

import { addTreaty, checkProposal } from './diplomacy';
import { extraLots, industryOf } from './construction';
import { nationResources, RESOURCES, resourceValue, type ResourceId } from './resources';
import type { GameEvent, GameState, Tag } from './types';
import { atWar, changeOpinion, emit, nationName, newId, opinion, treatyBetween, type World } from './world';

export interface TradeContract {
  id: string;
  seller: Tag;
  buyer: Tag;
  res: ResourceId;
  /** lotti alla settimana */
  qty: number;
  /** prezzo totale settimanale in milioni (fissato alla firma) */
  price: number;
  startDay: number;
  /** frazioni di opinione accumulate [verso il venditore, verso il compratore] */
  bond?: [number, number];
  /** imposto da un trattato di pace: gratuito, non si disdice */
  forced?: boolean;
  /** scadenza (giorno) */
  until?: number;
}

export const MARGIN = 1.25;
export const TARIFF = 1.3;
export const MAX_LOTS = 5;
/** oltre questa opinione il commercio non migliora più i rapporti */
export const TRADE_OPINION_CAP = 50;

const LUXURY = new Set<ResourceId>(['vino', 'seta', 'tabacco', 'cotone', 'olio', 'sale', 'diamanti', 'avorio', 'caffe', 'spezie', 'zucchero', 'perle', 'gomma', 'palma']);
export const tradeWeight = (r: ResourceId) => (RESOURCES[r].strategic ? 1 : LUXURY.has(r) ? 0.7 : 0.5);

export function contracts(s: GameState): TradeContract[] { return (s.trades ??= []); }

export function contractsOf(s: GameState, tag: Tag) { return contracts(s).filter((c) => c.seller === tag || c.buyer === tag); }

const industry = (w: World, t: Tag) => industryOf(w, t);

/** Lotti propri (province controllate) di una risorsa. */
function ownLots(w: World, tag: Tag) {
  const s = w.state;
  return nationResources(w.map, w.map.resources, s.controller, s.owner, tag, industry(w, tag), (i) => extraLots(w, i));
}

function flows(s: GameState, tag: Tag) {
  const imports: Partial<Record<ResourceId, number>> = {}, exports: Partial<Record<ResourceId, number>> = {};
  let pay = 0, earn = 0;
  for (const c of contracts(s)) {
    if (c.buyer === tag) { imports[c.res] = (imports[c.res] ?? 0) + c.qty; pay += c.price; }
    if (c.seller === tag) { exports[c.res] = (exports[c.res] ?? 0) + c.qty; earn += c.price; }
  }
  return { imports, exports, pay, earn };
}

/** Moltiplicatore del valore di un lotto importato: vale di più se in patria manca. */
export const scarcity = (own: number) => (own <= 0 ? 1.8 : own < 3 ? 1.3 : 1);

/**
 * Risorse effettive di una nazione, commercio compreso: rendita (meno i lotti esportati,
 * più quelli importati), risorse strategiche mancanti, pagamenti e incassi.
 */
export function effectiveResources(w: World, tag: Tag) {
  const r = ownLots(w, tag);
  const f = flows(w.state, tag);
  const ind = industry(w, tag);
  let income = r.income;
  for (const [res, q] of Object.entries(f.exports) as [ResourceId, number][]) income -= resourceValue(res, ind) * Math.min(q, r.count[res] ?? 0);
  for (const [res, q] of Object.entries(f.imports) as [ResourceId, number][]) income += resourceValue(res, ind) * q * scarcity(r.count[res] ?? 0);
  const oil = techEffects(w, tag).oilValue;
  if (oil !== 1) income += resourceValue('petrolio', ind) * (r.count.petrolio ?? 0) * (oil - 1);
  const missing = (['carbone', 'ferro'] as ResourceId[]).filter((x) => !r.count[x] && !f.imports[x]);
  return { count: r.count, income: Math.round(income * 100) / 100, missing, ...f };
}

/** Lotti che il venditore può ancora vendere (le risorse strategiche: ne tiene almeno uno). */
export function freeLots(w: World, seller: Tag, res: ResourceId): number {
  const own = ownLots(w, seller).count[res] ?? 0;
  const sold = flows(w.state, seller).exports[res] ?? 0;
  return Math.max(0, own - sold - (RESOURCES[res].strategic ? 1 : 0));
}

export interface Quote {
  seller: Tag;
  buyer: Tag;
  res: ResourceId;
  qty: number;
  perLot: number;
  total: number;
  treaty: boolean;
  /** valore settimanale per il compratore */
  buyerValue: number;
  free: number;
  /** motivo del rifiuto, se il motore non firmerebbe */
  refusal: string | null;
}

/** Preventivo: prezzo, valore per il compratore e se le due parti firmerebbero. */
export function quote(w: World, seller: Tag, buyer: Tag, res: ResourceId, qty = 1): Quote {
  const s = w.state;
  const treaty = !!treatyBetween(s, seller, buyer, 'trade');
  const perLot = Math.round(resourceValue(res, industry(w, seller)) * MARGIN * (treaty ? 1 : TARIFF) * 1000) / 1000;
  const total = Math.round(perLot * qty * 100) / 100;
  const ownB = ownLots(w, buyer).count[res] ?? 0;
  const buyerValue = Math.round(resourceValue(res, industry(w, buyer)) * qty * scarcity(ownB) * 100) / 100;
  const free = freeLots(w, seller, res);
  const q: Quote = { seller, buyer, res, qty, perLot, total, treaty, buyerValue, free, refusal: null };
  const player = s.player;
  const other = seller === player ? buyer : seller; // la parte che decide col motore
  const asks = other === seller ? 'vendere' : 'comprare';
  if (seller === buyer) q.refusal = 'stessa nazione';
  else if (!s.nations[seller]?.alive || !s.nations[buyer]?.alive) q.refusal = 'nazione scomparsa';
  else if (w.profiles[seller]?.micro || w.profiles[buyer]?.micro) q.refusal = 'i microstati non commerciano risorse';
  else if (atWar(s, seller, buyer)) q.refusal = 'siete in guerra';
  else if (qty < 1 || qty > MAX_LOTS) q.refusal = `da 1 a ${MAX_LOTS} lotti`;
  else if (free < qty) q.refusal = free ? `ne restano in vendita solo ${free} lotti` : 'non ne ha da vendere';
  else if (contracts(s).some((c) => c.seller === seller && c.buyer === buyer && c.res === res)) q.refusal = 'c\'è già un contratto per questa risorsa';
  else if (opinion(s, other, other === seller ? buyer : seller) < (treaty ? -50 : -25)) q.refusal = `il governo non vuole ${asks} a chi disprezza`;
  else if (other === buyer && buyerValue < total * 0.8 && !(RESOURCES[res].strategic && ownB === 0)) q.refusal = 'a quel prezzo non conviene loro: ne hanno già abbastanza';
  else if (other === buyer && (s.nations[buyer].lastBudget?.net ?? 1) - total < -2) q.refusal = 'non possono permetterselo';
  return q;
}

/** Firma un contratto (il motore ha già detto sì nel preventivo). */
export function signTrade(w: World, seller: Tag, buyer: Tag, res: ResourceId, qty: number, sink?: GameEvent[]): string | null {
  const q = quote(w, seller, buyer, res, qty);
  if (q.refusal) return q.refusal;
  const s = w.state;
  contracts(s).push({ id: newId(s, 'tr'), seller, buyer, res, qty, price: q.total, startDay: s.day, bond: [0, 0] });
  changeOpinion(s, seller, buyer, 1 + tradeWeight(res) * 2);
  changeOpinion(s, buyer, seller, 1 + tradeWeight(res) * 2);
  emit(w, { type: 'trade', nations: [seller, buyer], text: `${nationName(w, seller)} vende ${qty} ${qty === 1 ? 'lotto' : 'lotti'} di ${RESOURCES[res].label} a settimana a ${nationName(w, buyer)} per ${q.total.toFixed(2)} M.` }, sink);
  return null;
}

/** Disdetta: chi rompe perde un po' di stima presso l'altro. */
export function cancelTrade(w: World, id: string, by: Tag, sink?: GameEvent[], reason?: string): string | null {
  const s = w.state;
  const list = contracts(s);
  const i = list.findIndex((c) => c.id === id);
  if (i < 0) return 'contratto inesistente';
  const c = list[i];
  if (by !== c.seller && by !== c.buyer) return 'non è un contratto nostro';
  list.splice(i, 1);
  const other = by === c.seller ? c.buyer : c.seller;
  if (!reason) changeOpinion(s, other, by, -3 * tradeWeight(c.res) - 1);
  emit(w, { type: 'trade_end', nations: [c.seller, c.buyer], text: `Finisce la fornitura di ${RESOURCES[c.res].label} da ${nationName(w, c.seller)} a ${nationName(w, c.buyer)}${reason ? `: ${reason}` : ''}.` }, sink);
  return null;
}

/**
 * Guadagno settimanale di opinione di `from` verso il partner: dipende dal tipo di risorsa,
 * dalla quantità e da quanto pesa il contratto sull'economia di `from` (i piccoli ci tengono di più).
 */
export function bondRate(w: World, c: TradeContract, from: Tag): number {
  const inc = Math.max(1, w.state.nations[from]?.lastBudget?.income ?? 10);
  const dependence = Math.min(1.5, Math.max(0.2, (c.price / inc) * 10));
  return 0.5 * tradeWeight(c.res) * Math.sqrt(c.qty) * dependence;
}

/** Fine settimana: contratti saltati, relazioni, commercio fra nazioni non giocanti. */
export function weeklyTrade(w: World, sink: GameEvent[]) {
  const s = w.state;
  for (const c of [...contracts(s)]) {
    if (!s.nations[c.seller]?.alive || !s.nations[c.buyer]?.alive) { cancelTrade(w, c.id, c.seller, sink, 'una delle parti non esiste più'); continue; }
    if (atWar(s, c.seller, c.buyer)) { cancelTrade(w, c.id, c.seller, sink, 'la guerra interrompe i traffici'); continue; }
    if (c.until !== undefined && s.day >= c.until) { cancelTrade(w, c.id, c.seller, sink, 'scade la concessione del trattato di pace'); continue; }
    const own = ownLots(w, c.seller).count[c.res] ?? 0;
    const sold = contracts(s).filter((x) => x.seller === c.seller && x.res === c.res).reduce((a, x) => a + x.qty, 0);
    if (sold > own) {
      const cut = Math.min(c.qty, sold - own);
      if (cut >= c.qty) { cancelTrade(w, c.id, c.seller, sink, 'il venditore ha perso le province che la producevano'); continue; }
      c.price = Math.round((c.price * (c.qty - cut)) / c.qty * 100) / 100;
      c.qty -= cut;
    }
    // le nazioni non giocanti disdicono se i rapporti crollano
    for (const [me, other] of [[c.seller, c.buyer], [c.buyer, c.seller]] as [Tag, Tag][]) {
      if (!c.forced && me !== s.player && opinion(s, me, other) < -40 && contracts(s).includes(c)) cancelTrade(w, c.id, me, sink, `${nationName(w, me)} rompe per l'ostilità`);
    }
    if (!contracts(s).includes(c)) continue;
    c.bond ??= [0, 0];
    const sides: [Tag, Tag, 0 | 1][] = [[c.buyer, c.seller, 0], [c.seller, c.buyer, 1]];
    for (const [from, to, k] of sides) {
      if (opinion(s, from, to) >= TRADE_OPINION_CAP) continue;
      c.bond[k] += bondRate(w, c, from);
      if (c.bond[k] >= 1) { const d = Math.floor(c.bond[k]); changeOpinion(s, from, to, d); c.bond[k] -= d; }
    }
  }
  aiTrade(w, sink);
}

/** Le nazioni non giocanti senza carbone o ferro se li procurano da chi ne ha (mai dal giocatore senza consenso). */
function aiTrade(w: World, sink: GameEvent[]) {
  const s = w.state;
  const tags = Object.keys(s.nations).filter((t) => t !== s.player && s.nations[t].alive && !w.profiles[t]?.micro && w.profiles[t]);
  for (const buyer of tags) {
    if (industry(w, buyer) < 25 || s.nations[buyer].treasury < 10) continue;
    const eff = effectiveResources(w, buyer);
    const want = eff.missing[0];
    if (!want) continue;
    const offers = tags.filter((t) => t !== buyer).map((t) => quote(w, t, buyer, want, 1)).filter((q) => !q.refusal && opinion(s, q.seller, buyer) >= 0 && opinion(s, buyer, q.seller) >= -10);
    if (!offers.length) continue;
    offers.sort((a, b) => a.total - b.total || opinion(s, b.seller, buyer) - opinion(s, a.seller, buyer));
    signTrade(w, offers[0].seller, buyer, want, 1, sink);
  }
}

/**
 * Accordo commerciale (5 anni) chiesto direttamente dal pannello Commercio, deciso dal motore:
 * serve una stima di almeno 15 (5 se si commercia già insieme; 35 per un rivale storico).
 */
export function tradeTreatyRefusal(w: World, from: Tag, to: Tag): string | null {
  const s = w.state;
  const err = checkProposal(w, from, to, { type: 'trade' });
  if (err) return err;
  if (w.profiles[to]?.micro) return 'i microstati non firmano accordi commerciali';
  const op = opinion(s, to, from);
  const partners = contracts(s).some((c) => (c.seller === from && c.buyer === to) || (c.seller === to && c.buyer === from));
  const need = w.profiles[to]?.rivals.includes(from) ? 35 : partners ? 5 : 15;
  return op >= need ? null : `stima troppo bassa (${op}, ne serve almeno ${need}${partners ? '' : '; commerciare insieme la fa crescere e abbassa la soglia a 5'})`;
}

export function proposeTradeTreaty(w: World, from: Tag, to: Tag, sink?: GameEvent[]): string | null {
  const err = tradeTreatyRefusal(w, from, to);
  if (err) return err;
  addTreaty(w, 'trade', from, to, 5, sink);
  return null;
}
