import type { GameEvent, Tag, TreatyType } from './types';
import { al, allied, atWar, changeOpinion, dal, di, emit, newId, shortName, the, The, treatyBetween, warsOf, type World } from './world';

export const TREATY_LABEL: Record<TreatyType, string> = {
  alliance: 'alleanza difensiva',
  non_aggression: 'patto di non aggressione',
  trade: 'accordo commerciale',
  military_access: 'accesso militare',
  guarantee: 'garanzia di indipendenza',
};

/** Proposte che un accordo diplomatico può contenere. Tutto il resto è solo conversazione. */
export interface Proposal {
  type: TreatyType | 'peace' | 'subsidy' | 'cede_provinces' | 'join_war';
  /** chi cede/paga (per peace, cede_provinces, subsidy) */
  giver?: Tag;
  provinces?: number[];
  amount?: number;
  years?: number;
  /** per join_war: contro chi */
  against?: Tag;
}

export function declareWar(w: World, a: Tag, b: Tag, reason: string, sink?: GameEvent[]): string | null {
  const s = w.state;
  if (a === b || !s.nations[a] || !s.nations[b]) return 'nazioni non valide';
  if (!s.nations[a].alive || !s.nations[b].alive) return 'nazione non più esistente';
  if (atWar(s, a, b)) return 'già in guerra';
  if (allied(s, a, b) && treatyBetween(s, a, b, 'alliance')) {
    // dichiarare guerra a un alleato rompe l'alleanza
    treatyBetween(s, a, b, 'alliance')!.violated = true;
  }
  const pact = treatyBetween(s, a, b, 'non_aggression');
  if (pact) pact.violated = true;
  const defenders = [b];
  const callers: Tag[] = [];
  for (const t of s.treaties) {
    if (t.violated) continue;
    const other = t.a === b ? t.b : t.b === b ? t.a : null;
    if (!other || other === a || defenders.includes(other)) continue;
    if (t.type === 'alliance' || (t.type === 'guarantee' && t.b === b)) {
      if (atWar(s, other, a) || allied(s, other, a)) continue;
      defenders.push(other); callers.push(other);
    }
  }
  const war = { id: newId(s, 'w'), name: `Guerra fra ${shortName(w, a)} e ${shortName(w, b)}`, attackers: [a], defenders, startDay: s.day, casualties: {} };
  s.wars.push(war);
  changeOpinion(s, b, a, -50);
  for (const n of Object.keys(s.nations)) if (n !== a && n !== b) changeOpinion(s, n, a, pact ? -15 : -4);
  emit(w, { type: 'war_declared', nations: [a, ...defenders], text: `${The(w, a)} dichiara guerra ${al(w, b)}${reason ? ` (${reason})` : ''}.${callers.length ? ` In virtù dei trattati entrano in guerra: ${callers.map((c) => the(w, c)).join(', ')}.` : ''}${pact ? ' Il patto di non aggressione è stato violato.' : ''}` }, sink);
  if (a === s.player || b === s.player || callers.includes(s.player)) {
    s.situations.push({ id: war.id, title: war.name, startDay: s.day, nations: [a, ...defenders], summary: `Guerra in corso: ${the(w, a)} contro ${defenders.map((d) => the(w, d)).join(', ')}.` });
  }
  for (const t of [a, ...defenders]) if (t !== s.player) s.nations[t].policies.mobilization = 'full';
  return null;
}

/** Pace fra due nazioni in guerra; cessioni e indennità sono già validate dal chiamante. */
export function makePeace(w: World, a: Tag, b: Tag, terms: { cedeTo?: Tag; provinces?: number[]; indemnity?: number; payer?: Tag } = {}, sink?: GameEvent[]): string | null {
  const s = w.state;
  const wars = s.wars.filter((x) => (x.attackers.includes(a) && x.defenders.includes(b)) || (x.attackers.includes(b) && x.defenders.includes(a)));
  if (!wars.length) return 'non sono in guerra';
  for (const war of wars) {
    const leaders = [war.attackers[0], war.defenders[0]];
    if (leaders.includes(a) && leaders.includes(b)) s.wars.splice(s.wars.indexOf(war), 1);
    else {
      // pace separata: esce chi non è capofila
      const leaving = leaders.includes(a) ? b : a;
      war.attackers = war.attackers.filter((t) => t !== leaving);
      war.defenders = war.defenders.filter((t) => t !== leaving);
    }
    s.situations = s.situations.filter((x) => x.id !== war.id || s.wars.includes(war));
  }
  const ceded = new Set(terms.provinces ?? []);
  for (let p = 0; p < s.owner.length; p++) {
    if (ceded.has(p) && terms.cedeTo) { s.owner[p] = terms.cedeTo; s.controller[p] = terms.cedeTo; continue; }
    // le occupazioni fra le due parti finiscono
    const pair = [a, b];
    if (pair.includes(s.owner[p]) && pair.includes(s.controller[p]) && s.owner[p] !== s.controller[p] && !atWar(s, s.owner[p], s.controller[p])) s.controller[p] = s.owner[p];
  }
  if (terms.indemnity && terms.payer) {
    const recv = terms.payer === a ? b : a;
    const amount = Math.min(terms.indemnity, s.nations[terms.payer].treasury + 300);
    s.nations[terms.payer].treasury -= amount;
    if (s.nations[terms.payer].treasury < 0) { s.nations[terms.payer].debt -= s.nations[terms.payer].treasury; s.nations[terms.payer].treasury = 0; }
    s.nations[recv].treasury += amount;
  }
  relocateStranded(w);
  for (const t of [a, b]) if (t !== s.player && !warsOf(s, t).length) s.nations[t].policies.mobilization = 'peace';
  const cededTxt = ceded.size ? ` ${The(w, terms.cedeTo!)} ottiene: ${describeTerritory(w, [...ceded])}.` : '';
  const indTxt = terms.indemnity ? ` Indennità di ${terms.indemnity} milioni.` : '';
  emit(w, { type: 'peace', nations: [a, b], text: `Pace fra ${the(w, a)} e ${the(w, b)}.${cededTxt}${indTxt}` }, sink);
  checkAlive(w, sink);
  return null;
}

/** Le unità rimaste in territorio dove non possono più stare tornano nella provincia propria più vicina. */
export function relocateStranded(w: World) {
  const s = w.state;
  for (const u of s.units) {
    const ctrl = s.controller[u.location];
    if (ctrl === u.nation || allied(s, u.nation, ctrl) || atWar(s, u.nation, ctrl) || treatyBetween(s, u.nation, ctrl, 'military_access')) continue;
    const home = w.map.provinces.filter((p) => s.controller[p.id] === u.nation);
    if (!home.length) continue;
    const here = w.map.provinces[u.location].c;
    home.sort((p, q) => Math.hypot(p.c[0] - here[0], p.c[1] - here[1]) - Math.hypot(q.c[0] - here[0], q.c[1] - here[1]));
    u.location = home[0].id; u.move = null; u.orders = []; u.inBattle = false;
  }
}

function checkAlive(w: World, sink?: GameEvent[]) {
  const s = w.state;
  for (const n of Object.values(s.nations)) {
    if (!n.alive) continue;
    if (!s.owner.includes(n.tag)) {
      n.alive = false;
      s.units = s.units.filter((u) => u.nation !== n.tag);
      s.wars.forEach((x) => { x.attackers = x.attackers.filter((t) => t !== n.tag); x.defenders = x.defenders.filter((t) => t !== n.tag); });
      s.wars = s.wars.filter((x) => x.attackers.length && x.defenders.length);
      emit(w, { type: 'nation_annexed', nations: [n.tag], text: `${The(w, n.tag)} cessa di esistere.` }, sink);
    } else if (s.owner[n.capital] !== n.tag) {
      const own = s.owner.map((o, i) => (o === n.tag ? i : -1)).filter((i) => i >= 0);
      n.capital = own.sort((x, y) => w.map.provinces[y].pop - w.map.provinces[x].pop)[0];
    }
  }
}

export function addTreaty(w: World, type: TreatyType, a: Tag, b: Tag, years: number | null, sink?: GameEvent[]) {
  const s = w.state;
  const existing = treatyBetween(s, a, b, type);
  if (existing) existing.endDay = years ? s.day + years * 365 : null;
  else s.treaties.push({ id: newId(s, 't'), type, a, b, startDay: s.day, endDay: years ? s.day + Math.round(years * 365) : null });
  changeOpinion(s, a, b, 8); changeOpinion(s, b, a, 8);
  emit(w, { type: 'treaty_signed', nations: [a, b], text: `${type === 'alliance' || type === 'guarantee' ? 'Firmata una' : 'Firmato un'} ${TREATY_LABEL[type]} fra ${the(w, a)} e ${the(w, b)}${years ? ` per ${years} anni` : ''}.` }, sink);
}

/**
 * Veto meccanico: la proposta è eseguibile nello stato attuale?
 * `from` è chi propone, `to` chi accetta. Restituisce un errore leggibile o null.
 */
export function checkProposal(w: World, from: Tag, to: Tag, p: Proposal): string | null {
  const s = w.state;
  const prov = (id: number) => w.map.provinces[id];
  switch (p.type) {
    case 'alliance':
    case 'non_aggression':
    case 'trade':
    case 'military_access':
    case 'guarantee':
      if (atWar(s, from, to)) return 'le due nazioni sono in guerra: prima serve la pace';
      if (treatyBetween(s, from, to, p.type)) return `esiste già un ${TREATY_LABEL[p.type]}`;
      return null;
    case 'peace': {
      if (!atWar(s, from, to)) return 'le due nazioni non sono in guerra';
      return checkCession(w, from, to, p);
    }
    case 'cede_provinces':
      return checkCession(w, from, to, p);
    case 'subsidy': {
      const giver = p.giver ?? from;
      if (!p.amount || p.amount <= 0) return 'importo non valido';
      if (p.amount > 400) return 'sussidio troppo alto (massimo 400 milioni in un accordo)';
      if (s.nations[giver].treasury < p.amount) return `${The(w, giver)} non ha ${p.amount} milioni in cassa`;
      return null;
    }
    case 'join_war': {
      if (!p.against || !s.nations[p.against]) return 'nemico non specificato';
      const who = to; // chi entra in guerra
      if (atWar(s, who, p.against)) return 'è già in guerra con quella nazione';
      if (!atWar(s, from, p.against)) return 'chi chiede aiuto non è in guerra con quella nazione';
      if (p.against === who) return 'proposta incoerente';
      return null;
    }
    default:
      return `tipo di proposta sconosciuto: ${(p as Proposal).type}${prov(0) ? '' : ''}`;
  }
}

function checkCession(w: World, from: Tag, to: Tag, p: Proposal): string | null {
  const s = w.state;
  const list = p.provinces ?? [];
  if (!list.length) return null;
  const giver = p.giver ?? to;
  const receiver = giver === from ? to : from;
  if (list.length > 30) return 'troppe province in un solo trattato (massimo 30)';
  for (const id of list) {
    const pv = w.map.provinces[id];
    if (!pv) return `provincia inesistente: ${id}`;
    if (s.owner[id] !== giver) return `${pv.name} non appartiene ${al(w, giver)}`;
    if (id === s.nations[giver].capital) return `${pv.name} è la capitale ${di(w, giver)}`;
  }
  // leva: senza occupazione militare o grande stanchezza di guerra nessuno cede territorio
  // per una regione intera basta occuparne i tre quarti: le province rimaste seguono il resto
  const occupied = list.filter((id) => s.controller[id] === receiver).length;
  const exhausted = s.nations[giver].warExhaustion >= 50 || s.nations[giver].stability < 20;
  const enough = occupied === list.length || (list.length >= 4 && occupied >= list.length * 0.75);
  if (atWar(s, from, to) && !enough && !exhausted) return `${The(w, giver)} non cede province che ${the(w, receiver)} non occupa (${occupied} su ${list.length}; stanchezza di guerra ${Math.round(s.nations[giver].warExhaustion)}/100)`;
  if (!atWar(s, from, to)) {
    const regs = new Set(list.map((id) => w.map.provinces[id].r));
    if (regs.size > 1 || list.length > 4) return 'in tempo di pace si negozia al massimo una piccola regione (fino a 4 province) alla volta';
  }
  return null;
}

/** Esegue una proposta accettata (dopo checkProposal). */
export function applyProposal(w: World, from: Tag, to: Tag, p: Proposal, sink?: GameEvent[]) {
  const s = w.state;
  switch (p.type) {
    case 'alliance': addTreaty(w, 'alliance', from, to, null, sink); break;
    case 'non_aggression': addTreaty(w, 'non_aggression', from, to, p.years ?? 10, sink); break;
    case 'trade': addTreaty(w, 'trade', from, to, p.years ?? 5, sink); break;
    case 'military_access': addTreaty(w, 'military_access', from, to, p.years ?? 2, sink); break;
    case 'guarantee': addTreaty(w, 'guarantee', from, to, null, sink); break;
    case 'peace': {
      const giver = p.giver ?? to;
      const receiver = giver === from ? to : from;
      makePeace(w, from, to, { cedeTo: receiver, provinces: p.provinces, indemnity: p.amount, payer: p.amount ? giver : undefined }, sink);
      break;
    }
    case 'cede_provinces': {
      const giver = p.giver ?? to;
      const receiver = giver === from ? to : from;
      for (const id of p.provinces ?? []) { s.owner[id] = receiver; s.controller[id] = receiver; }
      relocateStranded(w);
      emit(w, { type: 'cession', nations: [giver, receiver], text: `${The(w, giver)} cede ${al(w, receiver)}: ${describeTerritory(w, p.provinces ?? [])}.` }, sink);
      break;
    }
    case 'subsidy': {
      const giver = p.giver ?? from;
      const receiver = giver === from ? to : from;
      s.nations[giver].treasury -= p.amount!;
      s.nations[receiver].treasury += p.amount!;
      changeOpinion(s, receiver, giver, Math.min(20, p.amount! / 10));
      emit(w, { type: 'subsidy', nations: [giver, receiver], text: `${The(w, giver)} versa ${p.amount} milioni ${al(w, receiver)}.` }, sink);
      break;
    }
    case 'join_war': {
      const war = s.wars.find((x) => (x.attackers.includes(from) && x.defenders.includes(p.against!)) || (x.defenders.includes(from) && x.attackers.includes(p.against!)));
      if (war) {
        (war.attackers.includes(from) ? war.attackers : war.defenders).push(to);
        changeOpinion(s, p.against!, to, -40);
        emit(w, { type: 'war_joined', nations: [to, from, p.against!], text: `${The(w, to)} entra in guerra al fianco ${di(w, from)} contro ${the(w, p.against!)}.` }, sink);
        if (to !== s.player) s.nations[to].policies.mobilization = 'full';
      }
      break;
    }
  }
}

/** Scadenza dei trattati. */
export function expireTreaties(w: World, sink: GameEvent[]) {
  const s = w.state;
  s.treaties = s.treaties.filter((t) => {
    if (t.violated) return false;
    if (t.endDay !== null && t.endDay <= s.day) {
      emit(w, { type: 'treaty_expired', nations: [t.a, t.b], text: `Scade ${t.type === 'alliance' || t.type === 'guarantee' ? 'la' : 'il'} ${TREATY_LABEL[t.type]} fra ${the(w, t.a)} e ${the(w, t.b)}.` }, sink);
      return false;
    }
    return true;
  });
}

/**
 * Territorio in testo: le regioni cedute per intero si nominano come regione ("la Galizia (21 province)"),
 * il resto provincia per provincia.
 */
export function describeTerritory(w: World, ids: number[]): string {
  const set = new Set(ids);
  const parts: string[] = [];
  const done = new Set<number>();
  for (const id of ids) {
    const r = w.map.provinces[id]?.r;
    if (r === undefined || done.has(r)) continue;
    const all = w.map.regionProvinces(r);
    if (all.length > 1 && all.every((x) => set.has(x))) { parts.push(`${w.map.regions[r].name} (${all.length} province)`); all.forEach((x) => set.delete(x)); done.add(r); }
  }
  for (const id of ids) if (set.has(id)) parts.push(w.map.provinces[id]?.name ?? `#${id}`);
  return parts.join(', ');
}

/** Proposta in testo leggibile (UI e prompt). */
export function describeProposal(w: World, from: Tag, to: Tag, p: Proposal): string {
  const pv = (ids?: number[]) => describeTerritory(w, ids ?? []);
  switch (p.type) {
    case 'peace': return `pace${p.provinces?.length ? ` con cessione di ${pv(p.provinces)} da parte ${di(w, p.giver ?? to)}` : ' bianca'}${p.amount ? ` e indennità di ${p.amount} M` : ''}`;
    case 'cede_provinces': return `cessione di ${pv(p.provinces)} da parte ${di(w, p.giver ?? to)}`;
    case 'subsidy': return `sussidio di ${p.amount} M pagato ${dal(w, p.giver ?? from)}`;
    case 'join_war': return `entrata in guerra contro ${the(w, p.against ?? '')}`;
    default: return `${TREATY_LABEL[p.type]}${p.years ? ` (${p.years} anni)` : ''}`;
  }
}
