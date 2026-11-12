// Registro dei movimenti di cassa fuori dal bilancio settimanale.
//
// Le casse di una nazione cambiano in due soli modi: il saldo del bilancio (economy.ts, fase "economia") e i
// movimenti straordinari che passano da qui: cantieri, arruolamenti, trattati coloniali, sussidi, la prima rata
// di un'indennità, rimborsi e nuovi prestiti. Ogni movimento resta scritto nella settimana in corso
// (`NationState.extra`), così il giocatore vede dove sono finiti i soldi e un test può controllare che
//   casse a fine turno = casse a inizio turno + saldo del bilancio + movimenti straordinari.
// Nessun altro punto del motore scrive `treasury` o `debt` (tests/ledger.test.ts lo controlla sui sorgenti).
import type { Tag } from './types';
import type { World } from './world';

export type EntryKind = 'cantieri' | 'arruolamenti' | 'colonie' | 'sussidi' | 'indennita' | 'rimborso' | 'prestito';

export const ENTRY_LABEL: Record<EntryKind, string> = {
  cantieri: 'Cantieri',
  arruolamenti: 'Arruolamenti',
  colonie: 'Trattati e acquisti coloniali',
  sussidi: 'Sussidi',
  indennita: 'Indennità di guerra (versamento immediato)',
  rimborso: 'Rimborso del debito',
  prestito: 'Nuovo debito',
};

/** Un prestito costa subito il 10% in più di quanto rende (commissioni e sconto d'emissione). */
export const LOAN_MARKUP = 1.1;

const r2 = (v: number) => Math.round(v * 100) / 100;

function record(w: World, tag: Tag, kind: EntryKind, amount: number) {
  const n = w.state.nations[tag];
  const e = (n.extra ??= {});
  e[kind] = r2((e[kind] ?? 0) + amount);
}

/** Entrata (amount > 0) o uscita (amount < 0) straordinaria. Se le casse non bastano, la differenza diventa debito. */
export function post(w: World, tag: Tag, kind: EntryKind, amount: number) {
  const n = w.state.nations[tag];
  if (!n || !amount) return;
  n.treasury += amount;
  record(w, tag, kind, amount);
  cover(w, tag);
}

/** Denaro che passa da una nazione a un'altra: quello che esce da una entra nell'altra. */
export function transfer(w: World, from: Tag, to: Tag, kind: EntryKind, amount: number) {
  if (!(amount > 0)) return;
  post(w, from, kind, -amount);
  post(w, to, kind, amount);
}

/** Casse sotto zero: lo Stato si indebita per la differenza (e le casse tornano a zero). Restituisce quanto. */
export function cover(w: World, tag: Tag): number {
  const n = w.state.nations[tag];
  if (!n || n.treasury >= 0) return 0;
  const need = -n.treasury;
  n.debt += need * LOAN_MARKUP;
  n.treasury = 0;
  record(w, tag, 'prestito', need);
  return need;
}

/** Rimborso volontario del debito con le casse. */
export function repay(w: World, tag: Tag, amount: number): number {
  const n = w.state.nations[tag];
  const pay = Math.max(0, Math.min(amount, n.debt, n.treasury));
  if (!pay) return 0;
  n.treasury -= pay; n.debt -= pay;
  record(w, tag, 'rimborso', -pay);
  return pay;
}

/** Il saldo del bilancio entra in cassa (solo la fase dell'economia). Restituisce il nuovo debito, se c'è stato. */
export function applyBudget(w: World, tag: Tag, net: number): number {
  w.state.nations[tag].treasury += net;
  return cover(w, tag);
}

/** Fine turno: i movimenti della settimana passano a `lastExtra` e si riparte da zero. */
export function closeWeek(w: World) {
  for (const n of Object.values(w.state.nations)) {
    if (n.extra && Object.keys(n.extra).length) n.lastExtra = n.extra; else delete n.lastExtra;
    delete n.extra;
  }
}
