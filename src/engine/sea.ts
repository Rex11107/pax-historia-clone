// Rotte navali sul grafo delle zone di mare (dati da scripts/map/mari.mjs).
//
// Una nave va da porto a porto passando di zona in zona: New York–San Francisco gira intorno a Capo Horn
// finché il canale di Panama non apre (1914), Londra–Bombay passa per Suez. Un canale è chiuso a chi è in
// guerra con chi controlla la sua provincia (Suez in mano a un nemico obbliga a doppiare il Capo).
// Tutto deterministico: Dijkstra con un ordine di visita fisso; i risultati si tengono in memoria per porto
// di partenza e stato dei canali, perché lo stesso porto serve a molte unità nello stesso turno.
import { laea, nearX } from './map';
import type { MapData } from './types';
import { atWar, type World } from './world';

interface Graph {
  n: number;
  adj: { to: number; km: number; canal: number }[][];
  coast: Map<number, number[]>; // provincia → [zona, km, zona, km…]
  canalProvince: number[];
  cache: Map<string, { dist: Float64Array; prev: Int32Array }>;
}
const graphs = new WeakMap<MapData, Graph | null>();

function graph(w: World): Graph | null {
  const data = w.map.data;
  if (graphs.has(data)) return graphs.get(data)!;
  const sea = data.sea;
  if (!sea) { graphs.set(data, null); return null; }
  const n = sea.zones.length;
  const adj: Graph['adj'] = Array.from({ length: n }, () => []);
  for (let i = 0; i < sea.adj.length; i += 3) {
    const a = sea.adj[i], b = sea.adj[i + 1], km = sea.adj[i + 2];
    adj[a].push({ to: b, km, canal: -1 }); adj[b].push({ to: a, km, canal: -1 });
  }
  sea.canals.forEach((c, i) => { adj[c.a].push({ to: c.b, km: c.km, canal: i }); adj[c.b].push({ to: c.a, km: c.km, canal: i }); });
  const coast = new Map<number, number[]>();
  for (const row of sea.coast) coast.set(row[0], row.slice(1));
  const canalProvince = sea.canals.map((c) => w.map.locate(c.at[0], c.at[1]) ?? w.map.nearest(c.at[0], c.at[1]));
  const g: Graph = { n, adj, coast, canalProvince, cache: new Map() };
  graphs.set(data, g);
  return g;
}

/** Canali aperti per una nazione: costruiti e non in mano a un nemico. */
function canalKey(w: World, g: Graph, nation: string): string {
  const s = w.state;
  return w.map.data.sea!.canals.map((c, i) => (s.day >= c.opens && !atWar(s, nation, s.controller[g.canalProvince[i]]) ? '1' : '0')).join('');
}

/** Distanze in km dal porto `from` a tutte le zone (Dijkstra con un mucchio binario). */
function fromPort(w: World, g: Graph, nation: string, from: number) {
  const key = canalKey(w, g, nation);
  const ck = `${from}|${key}`;
  const hit = g.cache.get(ck);
  if (hit) return hit;
  const dist = new Float64Array(g.n).fill(Infinity), prev = new Int32Array(g.n).fill(-1);
  const heap: [number, number][] = [];
  const push = (d: number, z: number) => {
    heap.push([d, z]);
    let i = heap.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] < d || (heap[p][0] === d && heap[p][1] <= z)) break; [heap[i], heap[p]] = [heap[p], heap[i]]; i = p; }
  };
  const pop = () => {
    const top = heap[0], last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        const less = (a: number, b: number) => heap[a][0] < heap[b][0] || (heap[a][0] === heap[b][0] && heap[a][1] < heap[b][1]);
        if (l < heap.length && less(l, m)) m = l;
        if (r < heap.length && less(r, m)) m = r;
        if (m === i) break;
        [heap[i], heap[m]] = [heap[m], heap[i]]; i = m;
      }
    }
    return top;
  };
  const start = g.coast.get(from) ?? [];
  for (let i = 0; i < start.length; i += 2) if (start[i + 1] < dist[start[i]]) { dist[start[i]] = start[i + 1]; push(start[i + 1], start[i]); }
  while (heap.length) {
    const [d, z] = pop();
    if (d > dist[z]) continue;
    for (const e of g.adj[z]) {
      if (e.canal >= 0 && key[e.canal] !== '1') continue;
      const nd = d + e.km;
      if (nd < dist[e.to]) { dist[e.to] = nd; prev[e.to] = z; push(nd, e.to); }
    }
  }
  if (g.cache.size > 4000) g.cache.clear();
  const res = { dist, prev };
  g.cache.set(ck, res);
  return res;
}

/** C'è un grafo del mare in questa mappa? (le mappe vecchie usano la linea d'aria) */
export function hasSea(w: World): boolean { return !!graph(w); }

/** Rotta da una provincia costiera a un'altra per una nazione: km e zone attraversate, o null se il mare non le unisce. */
export function seaRoute(w: World, nation: string, a: number, b: number): { km: number; zones: number[] } | null {
  const g = graph(w);
  if (!g) return null;
  const { dist, prev } = fromPort(w, g, nation, a);
  const end = g.coast.get(b);
  if (!end) return null;
  let km = Infinity, last = -1;
  for (let i = 0; i < end.length; i += 2) { const d = dist[end[i]] + end[i + 1]; if (d < km) { km = d; last = end[i]; } }
  if (!isFinite(km)) return null;
  const zones: number[] = [];
  for (let z = last; z >= 0; z = prev[z]) zones.push(z);
  return { km: Math.round(km), zones: zones.reverse() };
}

/** Solo la distanza (per scegliere fra molti porti e approdi senza ricostruire le rotte). */
export function seaKm(w: World, nation: string, a: number, b: number): number {
  const g = graph(w);
  if (!g) return Infinity;
  const { dist } = fromPort(w, g, nation, a);
  const end = g.coast.get(b);
  if (!end) return Infinity;
  let km = Infinity;
  for (let i = 0; i < end.length; i += 2) km = Math.min(km, dist[end[i]] + end[i + 1]);
  return km;
}

/** Linea disegnabile della rotta (km, y verso il basso, senza salti alla cucitura del Pacifico). */
export function seaLine(w: World, a: number, b: number, zones: number[]): number[] {
  const sea = w.map.data.sea!;
  const pa = w.map.provinces[a].c, pb = w.map.provinces[b].c;
  const pts = [pa[0], -pa[1]];
  let x = pa[0];
  for (const z of zones) { const [zx, zy] = laea(sea.zones[z][0], sea.zones[z][1]); x = nearX(zx, x); pts.push(Math.round(x), -Math.round(zy)); }
  x = nearX(pb[0], x);
  pts.push(x, -pb[1]);
  return pts;
}

/** Passaggi notevoli di una rotta, per i messaggi: canali usati e i grandi capi doppiati. */
export function seaPassages(w: World, zones: number[]): string[] {
  const sea = w.map.data.sea!;
  const out: string[] = [];
  for (let i = 1; i < zones.length; i++) {
    const c = sea.canals.find((k) => (k.a === zones[i - 1] && k.b === zones[i]) || (k.b === zones[i - 1] && k.a === zones[i]));
    if (c && !out.includes(c.name)) out.push(c.name);
  }
  const at = zones.map((z) => sea.zones[z]);
  if (at.some(([lon, lat]) => lat < -50 && lon > -80 && lon < -60)) out.push('Capo Horn');
  if (at.some(([lon, lat]) => lat < -33 && lon > 12 && lon < 30)) out.push('Capo di Buona Speranza');
  return out;
}
