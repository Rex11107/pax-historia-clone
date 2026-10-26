import type { MapData, ProvinceData, Terrain } from './types';

export interface Edge {
  to: number;
  km: number;
  strait: boolean;
}

export const TERRAIN_SPEED: Record<Terrain, number> = { plain: 1, hills: 0.8, forest: 0.75, marsh: 0.6, desert: 0.7, mountain: 0.5 };
export const TERRAIN_DEFENSE: Record<Terrain, number> = { plain: 1, hills: 1.3, forest: 1.2, marsh: 1.3, desert: 1.1, mountain: 1.6 };
export const TERRAIN_NAME: Record<Terrain, string> = { plain: 'pianura', hills: 'colline', forest: 'foreste', marsh: 'paludi', desert: 'deserto', mountain: 'montagna' };

/** Grafo delle province: adiacenze terrestri + stretti. */
export class GameMap {
  readonly provinces: ProvinceData[];
  readonly adj: Edge[][];
  readonly data: MapData;
  private riverEdges = new Map<string, string>();

  constructor(data: MapData) {
    this.data = data;
    this.provinces = data.provinces;
    this.adj = this.provinces.map(() => []);
    const dist = (a: number, b: number) => {
      const [x1, y1] = this.provinces[a].c, [x2, y2] = this.provinces[b].c;
      return Math.hypot(x1 - x2, y1 - y2);
    };
    for (const p of this.provinces) for (const q of p.n) if (q !== p.id) this.adj[p.id].push({ to: q, km: dist(p.id, q), strait: false });
    for (const [a, b, name] of data.rivers ?? []) { this.riverEdges.set(`${a},${b}`, name); this.riverEdges.set(`${b},${a}`, name); }
    for (const [a, b] of data.straits) {
      if (!this.adj[a].some((e) => e.to === b)) this.adj[a].push({ to: b, km: dist(a, b), strait: true });
      if (!this.adj[b].some((e) => e.to === a)) this.adj[b].push({ to: a, km: dist(a, b), strait: true });
    }
  }

  get size() { return this.provinces.length; }

  /** regioni storiche: nome e province che contengono */
  get regions(): { name: string }[] { return this.data.regions ?? []; }
  private regionIndex: number[][] | null = null;
  regionProvinces(r: number): number[] {
    if (!this.regionIndex) {
      this.regionIndex = this.regions.map(() => []);
      for (const p of this.provinces) if (p.r !== undefined && this.regionIndex[p.r]) this.regionIndex[p.r].push(p.id);
    }
    return this.regionIndex[r] ?? [];
  }
  regionName(id: number): string | null {
    const r = this.provinces[id]?.r;
    return r !== undefined ? this.regions[r]?.name ?? null : null;
  }

  /** nome del fiume che separa due province adiacenti, se c'è */
  river(a: number, b: number): string | undefined { return this.riverEdges.get(`${a},${b}`); }

  riversOf(a: number): { to: number; name: string }[] {
    return this.adj[a].filter((e) => !e.strait && this.river(a, e.to)).map((e) => ({ to: e.to, name: this.river(a, e.to)! }));
  }

  edge(a: number, b: number): Edge | undefined { return this.adj[a].find((e) => e.to === b); }

  isAdjacent(a: number, b: number) { return !!this.edge(a, b); }

  /** Provincia il cui centro è più vicino a lon/lat (con preferenza per un proprietario). */
  nearest(lon: number, lat: number, owner?: string): number {
    let best = -1, bd = Infinity;
    for (const p of this.provinces) {
      if (owner && p.owner !== owner) continue;
      const d = (p.lonlat[0] - lon) ** 2 * Math.cos((lat * Math.PI) / 180) ** 2 + (p.lonlat[1] - lat) ** 2;
      if (d < bd) { bd = d; best = p.id; }
    }
    return best;
  }

  /**
   * Dijkstra generico. `cost(from, edge)` restituisce il costo dell'arco o Infinity se vietato.
   * Restituisce il percorso (escluso l'inizio) o null.
   */
  shortestPath(start: number, goal: number, cost: (from: number, e: Edge) => number): { path: number[]; cost: number } | null {
    if (start === goal) return { path: [], cost: 0 };
    const n = this.size;
    const d = new Float64Array(n).fill(Infinity);
    const prev = new Int32Array(n).fill(-1);
    const heap = new MinHeap();
    d[start] = 0;
    heap.push(0, start);
    while (heap.size) {
      const [du, u] = heap.pop();
      if (du > d[u]) continue;
      if (u === goal) break;
      for (const e of this.adj[u]) {
        const c = cost(u, e);
        if (!isFinite(c)) continue;
        const nd = du + c;
        if (nd < d[e.to]) { d[e.to] = nd; prev[e.to] = u; heap.push(nd, e.to); }
      }
    }
    if (!isFinite(d[goal])) return null;
    const path: number[] = [];
    for (let v = goal; v !== start; v = prev[v]) path.push(v);
    return { path: path.reverse(), cost: d[goal] };
  }

  /** Dijkstra da una sorgente verso tutte le province (costi in giorni). */
  distancesFrom(start: number, cost: (from: number, e: Edge) => number, limit = Infinity): Float64Array {
    const d = new Float64Array(this.size).fill(Infinity);
    const heap = new MinHeap();
    d[start] = 0;
    heap.push(0, start);
    while (heap.size) {
      const [du, u] = heap.pop();
      if (du > d[u] || du > limit) continue;
      for (const e of this.adj[u]) {
        const c = cost(u, e);
        if (!isFinite(c)) continue;
        const nd = du + c;
        if (nd < d[e.to]) { d[e.to] = nd; heap.push(nd, e.to); }
      }
    }
    return d;
  }

  /** Distanza in salti (BFS) da un insieme di sorgenti, limitata a `passable`. */
  hops(sources: number[], passable: (p: number) => boolean, maxHops = 30): Int16Array {
    const out = new Int16Array(this.size).fill(-1);
    const q: number[] = [];
    for (const s of sources) { out[s] = 0; q.push(s); }
    for (let i = 0; i < q.length; i++) {
      const u = q[i];
      if (out[u] >= maxHops) continue;
      for (const e of this.adj[u]) {
        if (out[e.to] >= 0 || !passable(e.to)) continue;
        out[e.to] = out[u] + 1;
        q.push(e.to);
      }
    }
    return out;
  }
}

class MinHeap {
  private k: number[] = [];
  private v: number[] = [];
  get size() { return this.k.length; }
  push(key: number, val: number) {
    const k = this.k, v = this.v;
    k.push(key); v.push(val);
    let i = k.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (k[p] <= k[i]) break;
      [k[p], k[i]] = [k[i], k[p]]; [v[p], v[i]] = [v[i], v[p]];
      i = p;
    }
  }
  pop(): [number, number] {
    const k = this.k, v = this.v;
    const top: [number, number] = [k[0], v[0]];
    const lk = k.pop()!, lv = v.pop()!;
    if (k.length) {
      k[0] = lk; v[0] = lv;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < k.length && k[l] < k[m]) m = l;
        if (r < k.length && k[r] < k[m]) m = r;
        if (m === i) break;
        [k[m], k[i]] = [k[i], k[m]]; [v[m], v[i]] = [v[i], v[m]];
        i = m;
      }
    }
    return top;
  }
}

/** Decodifica gli archi delta-codificati in coordinate km (y verso il basso per il disegno). */
export function decodeArcs(data: MapData): Float32Array[] {
  return data.arcs.map((flat) => {
    const out = new Float32Array(flat.length);
    let x = 0, y = 0;
    for (let i = 0; i < flat.length; i += 2) {
      x += flat[i]; y += flat[i + 1];
      out[i] = x / 10; out[i + 1] = -y / 10;
    }
    return out;
  });
}

/** Anelli di una provincia come liste di punti [x0,y0,x1,y1,...]. */
export function provinceRings(p: ProvinceData, arcs: Float32Array[]): number[][] {
  if (!p.arcs.length) return [];
  const polys = (typeof (p.arcs as number[][])[0][0] === 'number' ? [p.arcs] : p.arcs) as number[][][];
  const rings: number[][] = [];
  for (const poly of polys) {
    for (const ring of poly) {
      const pts: number[] = [];
      for (const a of ring) {
        const arc = arcs[a < 0 ? ~a : a];
        const n = arc.length / 2;
        for (let i = 0; i < n; i++) {
          const j = a < 0 ? n - 1 - i : i;
          if (pts.length && i === 0) continue;
          pts.push(arc[2 * j], arc[2 * j + 1]);
        }
      }
      rings.push(pts);
    }
  }
  return rings;
}
