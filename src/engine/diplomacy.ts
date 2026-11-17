import { aiMobilize } from './economy';
import { transfer } from './ledger';
import { geoKm } from './map';
import { endSubjection, followers, subjectOf, warBlock } from './vassals';
import { peaceAnswer, type Demand } from './peace';
import type { GameEvent, Tag, TreatyType, War } from './types';
import { al, allied, atWar, canEnter, changeOpinion, dal, di, emit, newId, opinion, shortName, the, The, treatyBetween, warsOf, type World } from './world';

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
  const blocked = warBlock(w, a, b);
  if (blocked) return blocked;
  endSubjection(w, a, b); // la guerra fra un signore e il suo soggetto scioglie il legame
  if (allied(s, a, b) && treatyBetween(s, a, b, 'alliance')) {
    // dichiarare guerra a un alleato rompe l'alleanza
    treatyBetween(s, a, b, 'alliance')!.violated = true;
  }
  const pact = treatyBetween(s, a, b, 'non_aggression');
  if (pact) pact.violated = true;
  // chi attacca lo Stato che ha garantito viola la garanzia subito, alla dichiarazione (corte 06, capo 8): prima la
  // garanzia restava in vigore fino al primo combattimento
  const guarantee = s.treaties.find((t) => !t.violated && t.type === 'guarantee' && t.a === a && t.b === b);
  if (guarantee) guarantee.violated = true;
  const broken = pact || guarantee;
  const defenders = [b];
  const callers: Tag[] = [];
  // il signore difende il suo soggetto (corte 06, giurato 2.1): il protettorato è prima di tutto protezione, il
  // vassallo è coperto dal signore. Il tributario solo se il signore è più forte di chi attacca: la Porta non
  // muoveva guerra per Tunisi contro la Francia. Prima si attaccavano gli Stati indiani senza combattere Londra
  const lord = subjectOf(w, b);
  // non quando chi attacca è a sua volta un soggetto dello stesso signore: il signore non combatte i suoi soggetti
  if (lord && lord.overlord !== a && subjectOf(w, a)?.overlord !== lord.overlord && s.nations[lord.overlord]?.alive && !atWar(s, lord.overlord, a) && !allied(s, lord.overlord, a)) {
    const men = (t: Tag) => s.units.reduce((x, u) => x + (u.nation === t ? u.strength : 0), 0);
    if (lord.level !== 'tributario' || men(lord.overlord) > men(a)) { defenders.push(lord.overlord); callers.push(lord.overlord); }
  }
  for (const t of s.treaties) {
    if (t.violated) continue;
    const other = t.a === b ? t.b : t.b === b ? t.a : null;
    if (!other || other === a || defenders.includes(other)) continue;
    if (t.type === 'alliance' || (t.type === 'guarantee' && t.b === b)) {
      if (atWar(s, other, a) || allied(s, other, a)) continue;
      defenders.push(other); callers.push(other);
    }
  }
  // vassalli e protettorati seguono il signore
  for (const d of [...defenders]) for (const f of followers(w, d)) if (f !== a && !defenders.includes(f) && !atWar(s, f, a)) { defenders.push(f); callers.push(f); }
  const attackers = [a];
  for (const f of followers(w, a)) if (f !== b && !defenders.includes(f) && !atWar(s, f, b)) attackers.push(f);
  // province già occupate fra le due parti (da un'altra guerra in corso): non le ha prese questa guerra
  const pre: number[] = [];
  for (let p = 0; p < s.owner.length; p++) {
    const o = s.owner[p], c = s.controller[p];
    if (o !== c && ((attackers.includes(o) && defenders.includes(c)) || (defenders.includes(o) && attackers.includes(c)))) pre.push(p);
  }
  const war: War = { id: newId(s, 'w'), name: `Guerra fra ${shortName(w, a)} e ${shortName(w, b)}`, attackers, defenders, startDay: s.day, casualties: {}, ...(pre.length ? { pre } : {}) };
  s.wars.push(war);
  changeOpinion(s, b, a, -50);
  for (const n of Object.keys(s.nations)) if (n !== a && n !== b) changeOpinion(s, n, a, broken ? -15 : -4);
  emit(w, { type: 'war_declared', nations: [a, ...defenders], text: `${The(w, a)} dichiara guerra ${al(w, b)}${reason ? ` (${reason})` : ''}.${callers.length ? ` In virtù dei trattati entrano in guerra: ${callers.map((c) => the(w, c)).join(', ')}.` : ''}${pact ? ' Il patto di non aggressione è stato violato.' : ''}${guarantee ? ` ${The(w, a)} viola la garanzia che aveva dato.` : ''}` }, sink);
  if (a === s.player || b === s.player || callers.includes(s.player)) {
    s.situations.push({ id: war.id, title: war.name, startDay: s.day, nations: [a, ...defenders], summary: `Guerra in corso: ${the(w, a)} contro ${defenders.map((d) => the(w, d)).join(', ')}.` });
  }
  for (const t of [a, ...defenders]) if (t !== s.player) aiMobilize(w, t);
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
    // al più ciò che ha in cassa più 300 milioni presi a prestito
    const amount = Math.min(terms.indemnity, s.nations[terms.payer].treasury + 300);
    transfer(w, terms.payer, recv, 'indennita', amount);
  }
  settleOccupations(w);
  for (const t of [a, b]) if (t !== s.player && !warsOf(s, t).length) s.nations[t].policies.mobilization = 'peace';
  const cededTxt = ceded.size ? ` ${The(w, terms.cedeTo!)} ottiene: ${describeTerritory(w, [...ceded])}.` : '';
  const indTxt = terms.indemnity ? ` Indennità di ${terms.indemnity} milioni.` : '';
  emit(w, { type: 'peace', nations: [a, b], text: `Pace fra ${the(w, a)} e ${the(w, b)}.${cededTxt}${indTxt}` }, sink);
  checkAlive(w, sink);
  return null;
}

/** Dopo una pace, una scomparsa o la fine di un legame: le occupazioni rimaste senza guerra finiscono e le unità
 *  rimaste dove non possono più stare tornano a casa. Una provincia tolta a un nemico che la occupava resta a
 *  chi l'ha presa finché combatte; quando non è più in guerra con nessuno torna al suo padrone. */
export function settleOccupations(w: World) {
  const s = w.state;
  const fighting = new Set<Tag>();
  for (const x of s.wars) for (const t of [...x.attackers, ...x.defenders]) fighting.add(t);
  for (let p = 0; p < s.owner.length; p++) {
    const o = s.owner[p], c = s.controller[p];
    if (o !== c && !atWar(s, o, c) && !fighting.has(c)) s.controller[p] = o;
  }
  relocateStranded(w);
}

/** Le unità rimaste in territorio dove non possono più stare tornano nella provincia propria più vicina. */
export function relocateStranded(w: World) {
  const s = w.state;
  for (const u of s.units) {
    if (canEnter(s, u.nation, u.location)) continue;
    const home = w.map.provinces.filter((p) => s.controller[p.id] === u.nation && !p.impassable);
    if (!home.length) continue;
    const here = w.map.provinces[u.location].lonlat;
    home.sort((p, q) => geoKm(p.lonlat, here) - geoKm(q.lonlat, here));
    u.location = home[0].id; u.move = null; u.orders = []; u.inBattle = false;
  }
}

/** Una nazione scompare: esce da tutto ciò che la nomina, in un punto solo (unità, guerre, trattati, legami di
 *  soggezione, contratti, cantieri, ricerche in comune, indennità). Prima restavano in giro fino alla pulizia
 *  settimanale di ciascun sottosistema, o per sempre (trattati, cantieri). */
function bury(w: World, tag: Tag) {
  const s = w.state;
  s.nations[tag].alive = false;
  s.units = s.units.filter((u) => u.nation !== tag);
  for (const x of s.wars) { x.attackers = x.attackers.filter((t) => t !== tag); x.defenders = x.defenders.filter((t) => t !== tag); }
  const ended = s.wars.filter((x) => !x.attackers.length || !x.defenders.length);
  s.wars = s.wars.filter((x) => !ended.includes(x));
  s.situations = s.situations.filter((x) => !ended.some((e) => e.id === x.id));
  if (s.pendingPeace) s.pendingPeace = s.pendingPeace.filter((x) => !ended.some((e) => e.id === x.war));
  s.treaties = s.treaties.filter((t) => t.a !== tag && t.b !== tag);
  if (s.subjects) s.subjects = s.subjects.filter((x) => x.subject !== tag && x.overlord !== tag);
  if (s.trades) s.trades = s.trades.filter((c) => c.seller !== tag && c.buyer !== tag);
  if (s.projects) s.projects = s.projects.filter((x) => x.nation !== tag);
  if (s.reparations) s.reparations = s.reparations.filter((x) => x.payer !== tag && x.receiver !== tag);
  if (s.research) s.research.projects = s.research.projects.filter((x) => !x.nations.includes(tag));
  // ciò che occupava torna ai padroni
  for (let p = 0; p < s.owner.length; p++) if (s.controller[p] === tag) s.controller[p] = s.owner[p];
}

export function checkAlive(w: World, sink?: GameEvent[]) {
  const s = w.state;
  let died = false;
  for (const n of Object.values(s.nations)) {
    if (!n.alive) continue;
    if (!s.owner.includes(n.tag)) {
      bury(w, n.tag); died = true;
      emit(w, { type: 'nation_annexed', nations: [n.tag], text: `${The(w, n.tag)} cessa di esistere.` }, sink);
    } else if (s.owner[n.capital] !== n.tag) {
      const own = s.owner.map((o, i) => (o === n.tag ? i : -1)).filter((i) => i >= 0);
      n.capital = own.sort((x, y) => w.map.provinces[y].pop - w.map.provinces[x].pop)[0];
    }
  }
  if (died) settleOccupations(w);
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
      for (const t of [from, to]) { const x = subjectOf(w, t); if (x?.level === 'protettorato' && x.overlord !== (t === from ? to : from)) return `${The(w, t)} è un protettorato: i trattati li firma ${the(w, x.overlord)}`; }
      if (treatyBetween(s, from, to, p.type)) return `esiste già un ${TREATY_LABEL[p.type]}`;
      if (p.type === 'alliance') return allianceConflict(w, from, to);
      return null;
    case 'peace': {
      if (!atWar(s, from, to)) return 'le due nazioni non sono in guerra';
      const occ = checkCession(w, from, to, p);
      if (occ) return occ;
      return peaceRefusal(w, from, to, p);
    }
    case 'cede_provinces':
      return checkCession(w, from, to, p);
    case 'subsidy': {
      const giver = p.giver ?? from;
      if (!p.amount || p.amount <= 0) return 'importo non valido';
      if (p.amount > 400) return 'sussidio troppo alto (massimo 400 milioni in un accordo)';
      if (s.nations[giver].treasury < p.amount) return `${The(w, giver)} non ha ${p.amount} milioni in cassa`;
      // la stima non si compra (corte 06, giurato 3.1): un sussidio per coppia ogni sei mesi
      const receiver = giver === from ? to : from;
      const last = (s.subsidies ?? []).filter((x) => x.giver === giver && x.receiver === receiver).reduce((m, x) => Math.max(m, x.day), -Infinity);
      if (s.day - last < SUBSIDY_GAP) return `${The(w, giver)} ha già versato un sussidio ${al(w, receiver)} da meno di sei mesi`;
      return null;
    }
    case 'join_war': {
      if (!p.against || !s.nations[p.against]) return 'nemico non specificato';
      const who = to; // chi entra in guerra
      if (atWar(s, who, p.against)) return 'è già in guerra con quella nazione';
      if (!atWar(s, from, p.against)) return 'chi chiede aiuto non è in guerra con quella nazione';
      if (p.against === who) return 'proposta incoerente';
      // gli stessi divieti di una dichiarazione (corte 06, capo 2): prima un vassallo entrava in guerra contro il
      // signore e un alleato contro l'alleato, le due situazioni che le invarianti vietano
      if (s.nations[who]?.alive === false) return 'nazione non più esistente';
      const blocked = warBlock(w, who, p.against);
      if (blocked) return blocked;
      if (allied(s, who, p.against)) return `${The(w, who)} è legato ${al(w, p.against)} da un'alleanza o da un legame di soggezione`;
      const sw = subjectOf(w, who), sa = subjectOf(w, p.against);
      if (sw?.overlord === p.against || sa?.overlord === who) return `${The(w, who)} e ${the(w, p.against)} sono signore e soggetto`;
      return null;
    }
    default:
      return `tipo di proposta sconosciuto: ${(p as Proposal).type}${prov(0) ? '' : ''}`;
  }
}

/** Giorni fra due sussidi della stessa nazione alla stessa nazione. */
export const SUBSIDY_GAP = 182;
/** Stima che i sussidi possono comprare in un anno, per coppia. */
export const SUBSIDY_OPINION_YEAR = 20;

/**
 * Alleanze incompatibili (corte 06, capo 7): non ci si allea con chi è alleato di un proprio rivale o è in guerra con
 * un proprio alleato. Si guarda in tutti e due i versi. Prima l'Italia firmava quattro alleanze con potenze rivali.
 */
export function allianceConflict(w: World, a: Tag, b: Tag): string | null {
  const s = w.state;
  const alliesOf = (t: Tag) => s.treaties.filter((x) => !x.violated && x.type === 'alliance' && (x.a === t || x.b === t)).map((x) => (x.a === t ? x.b : x.a));
  for (const [x, y] of [[a, b], [b, a]]) {
    const rivals = new Set(w.profiles[x]?.rivals ?? []);
    const enemyAlly = alliesOf(y).find((t) => rivals.has(t));
    if (enemyAlly) return `${The(w, y)} è alleato ${di(w, enemyAlly)}, rivale ${di(w, x)}`;
    const atWarWith = alliesOf(x).find((t) => atWar(s, y, t));
    if (atWarWith) return `${The(w, y)} è in guerra con ${the(w, atWarWith)}, alleato ${di(w, x)}`;
  }
  return null;
}

/**
 * La pace trattata a parole passa dagli stessi controlli della conferenza (corte 07, capo 1): cessioni e indennità
 * diventano richieste con un costo, e chi le riceve deve stare vincendo con punti a sufficienza; la pace bianca
 * la rifiuta chi vince nettamente. Prima bastava una stanchezza di 50 e il punteggio non contava.
 */
function peaceRefusal(w: World, from: Tag, to: Tag, p: Proposal): string | null {
  const s = w.state;
  const war = s.wars.find((x) => (x.attackers.includes(from) && x.defenders.includes(to)) || (x.attackers.includes(to) && x.defenders.includes(from)));
  if (!war) return 'le due nazioni non sono in guerra';
  const giver = p.giver ?? to;
  const receiver = giver === from ? to : from;
  const demands: Demand[] = [];
  if (p.provinces?.length) demands.push({ type: 'cede', from: giver, to: receiver, provinces: p.provinces });
  if (p.amount) demands.push({ type: 'indemnity', from: giver, to: receiver, amount: p.amount });
  const antiGore = s.options?.antiGore ?? true;
  const a = demands.length ? peaceAnswer(w, war, receiver, demands, 'engine', antiGore) : peaceAnswer(w, war, from, [], 'engine', antiGore);
  return a.ok ? null : a.reason;
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
    if (pv.impassable) return `${pv.name} è deserto: non si cede, passa da sé a chi controlla tutte le terre transitabili attorno`;
    if (s.owner[id] !== giver) return `${pv.name} non appartiene ${al(w, giver)}`;
    if (id === s.nations[giver].capital) return `${pv.name} è la capitale ${di(w, giver)}`;
  }
  // leva: senza occupazione militare o grande stanchezza di guerra nessuno cede territorio
  // per una cessione ampia basta occuparne i tre quarti: le province rimaste seguono il resto
  const occupied = list.filter((id) => s.controller[id] === receiver).length;
  const exhausted = s.nations[giver].warExhaustion >= 50 || s.nations[giver].stability < 20;
  const enough = occupied === list.length || (list.length >= 4 && occupied >= list.length * 0.75);
  if (atWar(s, from, to) && !enough && !exhausted) return `${The(w, giver)} non cede province che ${the(w, receiver)} non occupa (${occupied} su ${list.length}; stanchezza di guerra ${Math.round(s.nations[giver].warExhaustion)}/100)`;
  if (!atWar(s, from, to) && list.length > 3) return 'in tempo di pace si negoziano al massimo tre province alla volta';
  return null;
}

/** Esegue una proposta accettata (dopo checkProposal). */
export function applyProposal(w: World, from: Tag, to: Tag, p: Proposal, sink?: GameEvent[]) {
  const s = w.state;
  switch (p.type) {
    // le alleanze hanno una durata (corte 06, giurato 1.1): la Duplice e la Triplice erano di cinque anni
    case 'alliance': addTreaty(w, 'alliance', from, to, p.years ?? ALLIANCE_YEARS, sink); break;
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
      transfer(w, giver, receiver, 'sussidi', p.amount!);
      // al più 20 punti di stima l'anno da sussidi per coppia: oltre, il denaro resta denaro
      s.subsidies = (s.subsidies ?? []).filter((x) => s.day - x.day < 365);
      const bought = s.subsidies.filter((x) => x.giver === giver && x.receiver === receiver).reduce((a, x) => a + x.opinion, 0);
      const gain = Math.max(0, Math.min(20, p.amount! / 10, SUBSIDY_OPINION_YEAR - bought));
      changeOpinion(s, receiver, giver, gain);
      s.subsidies.push({ giver, receiver, day: s.day, opinion: gain });
      emit(w, { type: 'subsidy', nations: [giver, receiver], text: `${The(w, giver)} versa ${p.amount} milioni ${al(w, receiver)}.` }, sink);
      break;
    }
    case 'join_war': {
      const war = s.wars.find((x) => (x.attackers.includes(from) && x.defenders.includes(p.against!)) || (x.defenders.includes(from) && x.attackers.includes(p.against!)));
      if (war) {
        (war.attackers.includes(from) ? war.attackers : war.defenders).push(to);
        changeOpinion(s, p.against!, to, -40);
        emit(w, { type: 'war_joined', nations: [to, from, p.against!], text: `${The(w, to)} entra in guerra al fianco ${di(w, from)} contro ${the(w, p.against!)}.` }, sink);
        if (to !== s.player) aiMobilize(w, to);
      }
      break;
    }
  }
}

/** Durata in anni di un'alleanza nuova, se la proposta non la indica. */
export const ALLIANCE_YEARS = 5;

/** Scadenza dei trattati. */
export function expireTreaties(w: World, sink: GameEvent[]) {
  const s = w.state;
  s.treaties = s.treaties.filter((t) => {
    if (t.violated) return false;
    if (t.endDay !== null && t.endDay <= s.day) {
      // fra nazioni non giocanti un'alleanza si rinnova se nessuna delle due ha cambiato idea (stima non negativa):
      // con le scadenze nasce la politica dei rinnovi, e senza questa regola la Duplice finirebbe nel 1884. Le
      // alleanze firmate dopo non la rimettono in discussione (il controllo delle incompatibilità vale per le nuove)
      if (t.type === 'alliance' && t.a !== s.player && t.b !== s.player && opinion(s, t.a, t.b) >= 0 && opinion(s, t.b, t.a) >= 0 && !atWar(s, t.a, t.b)) {
        t.endDay = s.day + ALLIANCE_YEARS * 365;
        emit(w, { type: 'treaty_signed', nations: [t.a, t.b], text: `Rinnovata per ${ALLIANCE_YEARS} anni l'alleanza fra ${the(w, t.a)} e ${the(w, t.b)}.` }, sink);
        return true;
      }
      emit(w, { type: 'treaty_expired', nations: [t.a, t.b], text: `Scade ${t.type === 'alliance' || t.type === 'guarantee' ? 'la' : 'il'} ${TREATY_LABEL[t.type]} fra ${the(w, t.a)} e ${the(w, t.b)}.` }, sink);
      return false;
    }
    return true;
  });
}

/** Territorio in testo: elenco delle province (le prime dodici, poi il conteggio). */
export function describeTerritory(w: World, ids: number[]): string {
  const names = ids.map((id) => w.map.provinces[id]?.name ?? `#${id}`);
  return names.length > 12 ? `${names.slice(0, 12).join(', ')} e altre ${names.length - 12} province` : names.join(', ');
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
