import { reserveOf } from './economy';
import { maxLevel, siteLots, techEffects, unlockTech } from './research';
// Costruzione: opere per provincia (ferrovie, porti, fortezze, campi, industrie, arsenali, miniere),
// cantieri con costo e durata, industria effettiva e capacità logistica dell'esercito.

import { BUILDINGS_1881, type BuildingId } from '../scenario/buildings1881';
import { RESOURCES, type ResourceId } from './resources';
import type { GameEvent, Tag } from './types';
import { emit, newId, rand, type World } from './world';

export type { BuildingId };

export interface Project {
  id: string;
  nation: Tag;
  province: number;
  type: BuildingId;
  /** livello che si raggiunge a fine lavori */
  level: number;
  daysLeft: number;
  total: number;
  cost: number;
}

export interface BuildingInfo {
  label: string;
  icon: string;
  max: number;
  /** costo in milioni e durata in settimane del livello n (1..max) */
  cost: (lvl: number) => number;
  weeks: (lvl: number) => number;
  desc: string;
  industrial?: boolean;
}

export const BUILDINGS: Record<BuildingId, BuildingInfo> = {
  ferrovia: { label: 'ferrovia', icon: '🚂', max: 3, cost: (l) => 5 * l, weeks: (l) => 6 + 4 * l, desc: 'truppe più veloci fra province con ferrovia; più capienza logistica' },
  porto: { label: 'porto', icon: '⚓', max: 3, cost: (l) => 7 * l, weeks: (l) => 8 + 4 * l, desc: 'rifornimento via mare (con una marina adeguata), commercio: entrate e capienza logistica' },
  fortezza: { label: 'fortezza', icon: '🏰', max: 3, cost: (l) => 9 * l, weeks: (l) => 10 + 4 * l, desc: 'difesa +30% a livello per chi la tiene (metà contro l\'artiglieria)' },
  agricoltura: { label: 'bonifiche e campi', icon: '🌾', max: 3, cost: (l) => 4 * l, weeks: (l) => 6 + 2 * l, desc: 'entrate dalla terra, più leva e un lotto di raccolto in più' },
  tessile: { label: 'industria tessile', icon: '🧵', max: 3, cost: (l) => 7 * l, weeks: (l) => 8 + 3 * l, desc: 'entrate e industria; serve cotone, seta o bestiame (lana)', industrial: true },
  chimica: { label: 'industria chimica', icon: '⚗️', max: 3, cost: (l) => 9 * l, weeks: (l) => 10 + 3 * l, desc: 'entrate e industria; serve zolfo, sale o carbone', industrial: true },
  siderurgia: { label: 'siderurgia', icon: '🏭', max: 3, cost: (l) => 12 * l, weeks: (l) => 12 + 3 * l, desc: 'entrate e molta industria; servono carbone e ferro', industrial: true },
  bellica: { label: 'industria bellica', icon: '💣', max: 3, cost: (l) => 10 * l, weeks: (l) => 10 + 3 * l, desc: 'capacità logistica dell\'esercito, arruolamento e artiglieria meno cari; serve ferro', industrial: true },
  miniera: { label: 'miniera', icon: '⛏️', max: 3, cost: (l) => 6 * l, weeks: (l) => 8 + 3 * l, desc: 'un lotto in più a livello delle risorse minerarie della provincia' },
};

const MINERAL = new Set<ResourceId>(['carbone', 'ferro', 'metalli', 'zolfo', 'petrolio', 'sale']);
const INPUTS: Partial<Record<BuildingId, ResourceId[][]>> = {
  tessile: [['cotone', 'seta', 'bestiame']],
  chimica: [['zolfo', 'sale', 'carbone']],
  siderurgia: [['carbone'], ['ferro']],
  bellica: [['ferro']],
};

type Levels = Partial<Record<BuildingId, number>>;

/** Livelli delle opere in ogni provincia (seminati dal 1881 la prima volta). */
export function buildings(w: World): Levels[] {
  const s = w.state;
  if (s.buildings && s.buildings.length === w.map.size) return s.buildings;
  const out: Levels[] = w.map.provinces.map(() => ({}));
  // ferrovie: rete nazionale × densità della provincia
  for (const p of w.map.provinces) {
    if (p.impassable || !p.owner) continue;
    const pr = w.profiles[p.owner];
    if (!pr) continue;
    const dens = p.pop / Math.max(1, p.area);
    const f = Math.min(1.3, Math.max(0.25, dens / 80));
    const lvl = Math.round((pr.rail / 100) * 3 * f);
    if (lvl > 0) out[p.id].ferrovia = Math.min(3, lvl);
  }
  for (const [type, lvl, lon, lat] of BUILDINGS_1881) {
    let id = w.map.locate(lon, lat) ?? w.map.nearest(lon, lat);
    if (id === null || id < 0) continue;
    // porti fluviali (Brema, Stettino, Anversa, Galați): alla provincia costiera più vicina dello stesso stato
    if (type === 'porto' && !w.map.provinces[id].coast) {
      const own = w.map.provinces[id].owner;
      let best = -1, bd = Infinity;
      for (const q of w.map.provinces) if (q.coast && q.owner === own) { const d = Math.hypot((q.lonlat[0] - lon) * Math.cos((lat * Math.PI) / 180), q.lonlat[1] - lat); if (d < bd) { bd = d; best = q.id; } }
      if (best < 0 || bd > 1.5) continue;
      id = best;
    }
    out[id][type] = Math.max(out[id][type] ?? 0, lvl);
  }
  s.buildings = out;
  s.industryBase = {};
  for (const tag of Object.keys(s.nations)) s.industryBase[tag] = industryPoints(w, tag);
  return out;
}

export const level = (w: World, p: number, b: BuildingId) => buildings(w)[p]?.[b] ?? 0;

/** Una provincia lavora per la nazione che la possiede e la controlla. */
const works = (w: World, tag: Tag, p: number) => w.state.owner[p] === tag && w.state.controller[p] === tag;

// Cache per nazione, rinnovata quando cambia il giorno, un id (contratti, cantieri) o un'opera finita.
let version = 0;
export const touchBuildings = () => { version++; };
const memo = new WeakMap<object, { key: string; per: Map<Tag, { res?: Set<ResourceId>; points?: number; logistics?: ReturnType<typeof computeLogistics> }> }>();
function cache(w: World, tag: Tag) {
  const s = w.state;
  const key = `${s.day}:${s.nextId}:${version}:${(s.trades ?? []).length}`;
  let m = memo.get(s);
  if (!m || m.key !== key) { m = { key, per: new Map() }; memo.set(s, m); }
  let c = m.per.get(tag);
  if (!c) m.per.set(tag, (c = {}));
  return c;
}

/** Disponibilità di una materia prima (propria o importata). */
function hasInput(w: World, tag: Tag, r: ResourceId): boolean {
  const c = cache(w, tag);
  if (!c.res) {
    const s = w.state;
    c.res = new Set();
    for (let i = 0; i < w.map.size; i++) if (s.controller[i] === tag) for (const x of w.map.resources[i]) c.res.add(x);
    for (const t of s.trades ?? []) if (t.buyer === tag) c.res.add(t.res);
  }
  return c.res.has(r);
}

/** Efficienza di un'industria: 1 con le materie prime, 0,5 se ne manca una, 0,25 se mancano tutte. */
export function inputEfficiency(w: World, tag: Tag, b: BuildingId): number {
  const req = INPUTS[b];
  if (!req) return 1;
  const missing = req.filter((alts) => !alts.some((r) => hasInput(w, tag, r))).length;
  return missing === 0 ? 1 : missing === 1 ? 0.5 : 0.25;
}

/** Punti industriali (livelli pesati, con l'efficienza delle materie prime). */
export function industryPoints(w: World, tag: Tag): number {
  const c = cache(w, tag);
  if (c.points !== undefined && w.state.industryBase) return c.points;
  const b = buildings(w);
  let pts = 0;
  for (let p = 0; p < b.length; p++) {
    if (!works(w, tag, p)) continue;
    for (const k of ['tessile', 'chimica', 'siderurgia', 'bellica'] as BuildingId[]) {
      const l = b[p][k];
      if (l) pts += l * (k === 'siderurgia' ? 1.5 : 1) * inputEfficiency(w, tag, k);
    }
  }
  c.points = pts;
  return pts;
}

/** Industria effettiva: quella del 1881 più (o meno) ciò che si è costruito o perso, ±30. */
export function industryOf(w: World, tag: Tag): number {
  const base = w.profiles[tag]?.industry ?? 30;
  buildings(w);
  const start = w.state.industryBase?.[tag] ?? 0;
  // l'industrializzazione è lenta: ogni livello di industria vale mezzo punto, ogni innovazione la metà del suo valore
  const bonus = Math.max(-30, Math.min(30, (industryPoints(w, tag) - start) * 0.5 + techEffects(w, tag).industry * 0.5));
  return Math.max(0, Math.min(100, Math.round(base + bonus)));
}

/** Entrate settimanali delle opere civili (campi, industrie, porti). */
export function buildingIncome(w: World, tag: Tag): number {
  const b = buildings(w);
  const te = techEffects(w, tag);
  let inc = 0;
  for (let p = 0; p < b.length; p++) {
    if (!works(w, tag, p)) continue;
    const popM = w.map.provinces[p].pop / 1e6;
    const l = b[p];
    if (l.agricoltura) inc += l.agricoltura * (0.04 + popM * 0.05) * te.agri;
    if (l.tessile) inc += l.tessile * (0.1 + popM * 0.1) * inputEfficiency(w, tag, 'tessile') * te.industrialYield;
    if (l.chimica) inc += l.chimica * (0.12 + popM * 0.08) * inputEfficiency(w, tag, 'chimica') * te.industrialYield;
    if (l.siderurgia) inc += l.siderurgia * (0.15 + popM * 0.1) * inputEfficiency(w, tag, 'siderurgia') * te.industrialYield;
    if (l.porto) inc += l.porto * 0.08;
  }
  return Math.round(inc * 100) / 100;
}

/** Lotti in più di risorse dalle opere: miniere (risorse minerarie) e campi (raccolto). */
export function extraLots(w: World, p: number): ResourceId[] {
  const l = buildings(w)[p];
  const out: ResourceId[] = [];
  const res = w.map.resources[p];
  if (l.miniera) for (const r of res) if (MINERAL.has(r)) for (let i = 0; i < l.miniera; i++) out.push(r);
  if (l.agricoltura) { const crop = res.find((r) => !RESOURCES[r].strategic && !MINERAL.has(r)) ?? 'grano'; out.push(crop); }
  // giacimenti resi sfruttabili dalla ricerca (minette, Kiruna, Grozny, Kirkuk…), con le miniere
  for (const r of siteLots(w, p)) { out.push(r); for (let i = 0; i < (l.miniera ?? 0); i++) out.push(r); }
  return out;
}

/** Leva in più dalle bonifiche (contadini) e sconto sull'arruolamento dall'industria bellica. */
export function manpowerBonus(w: World, tag: Tag): number {
  const b = buildings(w);
  let x = 0;
  for (let p = 0; p < b.length; p++) if (works(w, tag, p) && b[p].agricoltura) x += b[p].agricoltura! * 0.01;
  return 1 + Math.min(0.15, x);
}
export function recruitDiscount(w: World, tag: Tag): number {
  const lv = totalLevel(w, tag, 'bellica') * inputEfficiency(w, tag, 'bellica');
  return 1 - Math.min(0.2, lv * 0.02);
}

export function totalLevel(w: World, tag: Tag, k: BuildingId): number {
  const b = buildings(w);
  let x = 0;
  for (let p = 0; p < b.length; p++) if (works(w, tag, p)) x += b[p][k] ?? 0;
  return x;
}

/**
 * Logistica dell'esercito: capacità (migliaia di uomini) da industria, industria bellica, risorse
 * strategiche (carbone, ferro, petrolio, metalli, anche importati), ferrovie, porti e popolazione,
 * confrontata con gli uomini in armi. Il rapporto dà il fattore logistico (0,75-1,15).
 */
export function logistics(w: World, tag: Tag) {
  const c = cache(w, tag);
  return (c.logistics ??= computeLogistics(w, tag));
}
function computeLogistics(w: World, tag: Tag) {
  const s = w.state;
  let lots = 0;
  for (let i = 0; i < w.map.size; i++) if (s.controller[i] === tag) {
    for (const r of [...w.map.resources[i], ...extraLots(w, i)]) if (r === 'carbone' || r === 'ferro' || r === 'petrolio' || r === 'metalli') lots++;
  }
  for (const c of s.trades ?? []) if (c.buyer === tag && ['carbone', 'ferro', 'petrolio', 'metalli'].includes(c.res)) lots += c.qty;
  for (const c of s.trades ?? []) if (c.seller === tag && ['carbone', 'ferro', 'petrolio', 'metalli'].includes(c.res)) lots -= c.qty;
  let popM = 0;
  for (let i = 0; i < w.map.size; i++) if (s.owner[i] === tag && s.controller[i] === tag) popM += w.map.provinces[i].pop / 1e6;
  const bell = totalLevel(w, tag, 'bellica') * inputEfficiency(w, tag, 'bellica');
  const rail = totalLevel(w, tag, 'ferrovia'), port = totalLevel(w, tag, 'porto');
  const capacity = Math.round(techEffects(w, tag).logistics * (industryOf(w, tag) + 15 * bell + 4 * Math.max(0, lots) + 4 * popM + 0.5 * rail + 1 * port));
  const men = s.units.filter((u) => u.nation === tag).reduce((a, u) => a + u.strength, 0) / 1000;
  const ratio = men > 0 ? capacity / men : 2;
  const factor = Math.max(0.75, Math.min(1.15, 0.75 + 0.25 * ratio));
  return { capacity, men: Math.round(men), ratio: Math.round(ratio * 100) / 100, factor: Math.round(factor * 100) / 100 };
}

/** Capienza di una provincia (migliaia di uomini) oltre la quale i rifornimenti non bastano. */
export function provinceCapacity(w: World, p: number): number {
  const l = buildings(w)[p];
  const pv = w.map.provinces[p];
  return Math.round(30 + 25 * (l.ferrovia ?? 0) + (pv.coast ? 15 * (l.porto ?? 0) : 0) + 10 * (l.fortezza ?? 0) + Math.min(40, (pv.pop / 1e6) * 20));
}

// --- cantieri ---

export function projects(w: World): Project[] { return (w.state.projects ??= []); }

/** Cantieri aperti in contemporanea: 1 + uno ogni 15 M di entrate settimanali, massimo 6. */
export function slots(w: World, tag: Tag): number {
  const inc = w.state.nations[tag]?.lastBudget?.income ?? 10;
  return Math.max(1, Math.min(6, 1 + Math.floor(inc / 15)));
}

/** Chi può costruire in una provincia: chi la possiede e controlla, o il suo signore (investimento in un vassallo). */
export function canBuildIn(w: World, tag: Tag, p: number): boolean {
  const s = w.state;
  if (s.controller[p] !== s.owner[p]) return false;
  if (s.owner[p] === tag) return true;
  return (s.subjects ?? []).some((x) => x.overlord === tag && x.subject === s.owner[p] && x.level !== 'tributario');
}

/** Si può costruire questo livello qui? Restituisce il motivo se no. */
export function buildRefusal(w: World, tag: Tag, p: number, b: BuildingId): string | null {
  const pv = w.map.provinces[p];
  const info = BUILDINGS[b];
  if (!pv || pv.impassable) return 'nel deserto non si costruisce';
  if (!canBuildIn(w, tag, p)) return 'si costruisce solo nelle proprie province non occupate (o in quelle di un vassallo)';
  const cur = level(w, p, b);
  const pending = projects(w).some((x) => x.province === p && x.type === b);
  if (pending) return 'c\'è già un cantiere';
  if (cur >= info.max) return 'livello massimo';
  if (cur + 1 > maxLevel(w, tag, b)) { const t = unlockTech(b, cur + 1); return `serve la ricerca "${t?.name ?? '?'}"`; }
  if (b === 'porto' && !pv.coast) return 'serve la costa';
  if (b === 'fortezza' && (w.state.demilitarized ?? []).some((d) => d.provinces.includes(p) && d.until > w.state.day)) return 'confine smilitarizzato dal trattato di pace';
  if (b === 'agricoltura' && (pv.terrain === 'mountain' || pv.terrain === 'desert')) return 'terreno inadatto';
  if (b === 'miniera' && ![...w.map.resources[p], ...siteLots(w, p)].some((r) => MINERAL.has(r))) return 'non ci sono risorse minerarie';
  if (projects(w).filter((x) => x.nation === tag).length >= slots(w, tag)) return `tutti i cantieri sono occupati (${slots(w, tag)})`;
  const cost = info.cost(cur + 1);
  if (w.state.nations[tag].treasury < cost) return `servono ${cost} M`;
  return null;
}

export function startProject(w: World, tag: Tag, p: number, b: BuildingId, sink?: GameEvent[]): string | null {
  const err = buildRefusal(w, tag, p, b);
  if (err) return err;
  const s = w.state;
  const lvl = level(w, p, b) + 1;
  const info = BUILDINGS[b];
  const cost = info.cost(lvl);
  s.nations[tag].treasury -= cost;
  const days = info.weeks(lvl) * 7;
  projects(w).push({ id: newId(s, 'c'), nation: tag, province: p, type: b, level: lvl, daysLeft: days, total: days, cost });
  const sub = (s.subjects ?? []).find((x) => x.overlord === tag && x.subject === s.owner[p]);
  if (sub) sub.invested = (sub.invested ?? 0) + cost;
  if (tag === s.player) emit(w, { type: 'construction', nations: [tag], province: p, text: `Aperto il cantiere: ${info.label} (livello ${lvl}) a ${w.map.provinces[p].name}, ${cost} M, ${info.weeks(lvl)} settimane.` }, sink);
  return null;
}

/** Annullare un cantiere restituisce metà della spesa. */
export function cancelProject(w: World, id: string): string | null {
  const list = projects(w);
  const i = list.findIndex((x) => x.id === id);
  if (i < 0) return 'cantiere inesistente';
  const pr = list[i];
  list.splice(i, 1);
  w.state.nations[pr.nation].treasury += pr.cost / 2;
  return null;
}

/** Fine settimana: avanzano i cantieri (fermi se la provincia è occupata), le nazioni non giocanti costruiscono. */
export function weeklyConstruction(w: World, sink: GameEvent[], days = 7) {
  const s = w.state;
  const b = buildings(w);
  for (const pr of [...projects(w)]) {
    if (s.controller[pr.province] !== s.owner[pr.province]) continue;
    pr.daysLeft -= days;
    if (pr.daysLeft > 0) continue;
    projects(w).splice(projects(w).indexOf(pr), 1);
    b[pr.province][pr.type] = Math.max(b[pr.province][pr.type] ?? 0, pr.level);
    touchBuildings();
    if (pr.nation === s.player || s.owner[pr.province] === s.player || w.profiles[pr.nation]?.major)
      emit(w, { type: 'construction_done', nations: [pr.nation], province: pr.province, text: `Completata: ${BUILDINGS[pr.type].label} (livello ${pr.level}) a ${w.map.provinces[pr.province].name}.` }, sink);
  }
  aiConstruction(w, sink);
}

/** Nazioni non giocanti: un cantiere alla volta, scelto fra fortezze di confine, logistica, industria e ferrovie. */
function aiConstruction(w: World, sink: GameEvent[]) {
  const s = w.state;
  for (const tag of Object.keys(s.nations)) {
    const n = s.nations[tag];
    if (tag === s.player || !n.alive || w.profiles[tag]?.micro || tag === 'NUL') continue;
    // chi ha le casse piene costruisce di più
    const rich = n.treasury > reserveOf(w, tag);
    if (n.treasury < 50 || projects(w).filter((x) => x.nation === tag).length >= Math.min(rich ? 4 : 2, slots(w, tag))) continue;
    if (rand(s.seed, 'cantiere', tag, s.day) > (rich ? 0.8 : 0.35)) continue;
    const own = w.map.provinces.filter((p) => s.owner[p.id] === tag && s.controller[p.id] === tag && !p.impassable).sort((a, c) => c.pop - a.pop);
    if (!own.length) continue;
    const rivals = new Set(w.profiles[tag].rivals);
    const tries: [number, BuildingId][] = [];
    const border = own.filter((p) => w.map.adj[p.id].some((e) => rivals.has(s.owner[e.to])));
    if (border.length) tries.push([border.sort((a, c) => c.pop - a.pop)[0].id, 'fortezza']);
    if (logistics(w, tag).ratio < 1) tries.push([own[0].id, 'bellica']);
    const ind = (['siderurgia', 'tessile', 'chimica'] as BuildingId[]).filter((k) => inputEfficiency(w, tag, k) === 1);
    if (ind.length && rand(s.seed, 'scelta-ind', tag, s.day) < 0.3) tries.push([own[Math.floor(rand(s.seed, 'ind', tag, s.day) * Math.min(4, own.length))].id, ind[Math.floor(rand(s.seed, 'tipo', tag, s.day) * ind.length)]]);
    const mine = own.find((p) => w.map.resources[p.id].some((r) => r === 'carbone' || r === 'ferro'));
    if (mine) tries.push([mine.id, 'miniera']);
    tries.push([own[Math.floor(rand(s.seed, 'fer', tag, s.day) * Math.min(8, own.length))].id, 'ferrovia']);
    if (own.length > 3) tries.push([own[Math.min(own.length - 1, 2 + Math.floor(rand(s.seed, 'agr', tag, s.day) * 6))].id, 'agricoltura']);
    const start = Math.floor(rand(s.seed, 'ordine', tag, s.day) * tries.length);
    for (let i = 0; i < tries.length; i++) {
      const [p, k] = tries[(start + i) % tries.length];
      const cost = BUILDINGS[k].cost(level(w, p, k) + 1);
      if (n.treasury - cost < 40) continue;
      if (!startProject(w, tag, p, k, sink)) break;
    }
  }
}

/** Manutenzione settimanale delle opere (milioni): fortezze e porti costano di più. */
export const UPKEEP: Record<BuildingId, number> = { ferrovia: 0.01, porto: 0.03, fortezza: 0.04, agricoltura: 0.005, tessile: 0.01, chimica: 0.01, siderurgia: 0.015, bellica: 0.02, miniera: 0.01 };
export function maintenanceOf(w: World, tag: Tag): number {
  const b = buildings(w);
  let m = 0;
  for (let p = 0; p < b.length; p++) if (w.state.owner[p] === tag) for (const [k, l] of Object.entries(b[p]) as [BuildingId, number][]) m += UPKEEP[k] * l;
  return Math.round(m * 100) / 100;
}
