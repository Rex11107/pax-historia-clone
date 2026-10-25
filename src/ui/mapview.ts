// Mappa su canvas: province come Path2D, confini disegnati per arco (spessi dove cambia il
// proprietario), occupazioni tratteggiate, unità come pedine. Disegno solo quando serve.

import { decodeArcs, provinceRings } from '../engine/map';
import { unitPosition } from '../engine/orders';
import type { Unit } from '../engine/types';
import type { World } from '../engine/world';

export const INK = '#1f2a33';
const SEA = '#c4d3d4';
const SEA_DEEP = '#b5c7c9';
const BRASS = '#b08d3c';
const WAX = '#8e2430';

interface Camera { x: number; y: number; scale: number } // centro in km, pixel per km

export interface MapCallbacks {
  onProvince(id: number | null): void;
  onUnit(u: Unit): void;
}

export class MapView {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private world: World;
  private paths: Path2D[] = [];
  private bboxes: Float32Array;
  private arcPaths: Path2D[] = [];
  private coast = new Path2D();
  private national = new Path2D();
  private internal = new Path2D();
  private hatches = new Map<string, CanvasPattern>();
  private hit: CanvasRenderingContext2D;
  private dirty = true;
  cam: Camera = { x: 300, y: 900, scale: 0.25 };
  selectedProvince: number | null = null;
  selectedUnit: string | null = null;
  previewPath: number[] | null = null;
  /** posizioni animate (durante il riepilogo del turno) */
  override: Record<string, [number, number]> | null = null;
  highlight: Set<number> | null = null;
  private labels: { text: string; x: number; y: number; size: number }[] = [];
  private dpr = 1;

  constructor(canvas: HTMLCanvasElement, world: World, private cb: MapCallbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.world = world;
    this.hit = document.createElement('canvas').getContext('2d')!;
    const arcs = decodeArcs(world.map.data);
    this.bboxes = new Float32Array(world.map.size * 4);
    world.map.provinces.forEach((p, i) => {
      const path = new Path2D();
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const ring of provinceRings(p, arcs)) {
        for (let j = 0; j < ring.length; j += 2) {
          const x = ring[j], y = ring[j + 1];
          if (j === 0) path.moveTo(x, y); else path.lineTo(x, y);
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
        path.closePath();
      }
      this.paths.push(path);
      this.bboxes.set([x0, y0, x1, y1], i * 4);
    });
    this.arcPaths = arcs.map((a) => {
      const p = new Path2D();
      for (let i = 0; i < a.length; i += 2) if (i === 0) p.moveTo(a[i], a[i + 1]); else p.lineTo(a[i], a[i + 1]);
      return p;
    });
    world.map.data.arcSides.forEach(([a, b], i) => { if (b < 0) this.coast.addPath(this.arcPaths[i]); });
    this.refreshPolitical();
    this.bindInput();
    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
    const cap = world.map.provinces[world.state.nations[world.state.player].capital].c;
    this.cam = { x: cap[0], y: -cap[1] - 150, scale: 0.42 };
    const loop = () => { if (this.dirty) { this.dirty = false; this.draw(); } requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }

  setWorld(w: World) { this.world = w; this.refreshPolitical(); }
  invalidate() { this.dirty = true; }

  /** Ricalcola confini nazionali ed etichette dopo un cambio di proprietà. */
  refreshPolitical() {
    const s = this.world.state;
    this.national = new Path2D();
    this.internal = new Path2D();
    this.world.map.data.arcSides.forEach(([a, b], i) => {
      if (b < 0) return;
      if (s.owner[a] !== s.owner[b]) this.national.addPath(this.arcPaths[i]);
      else this.internal.addPath(this.arcPaths[i]);
    });
    // etichette: provincia di ogni nazione più vicina al baricentro dei suoi territori
    const acc = new Map<string, { x: number; y: number; w: number; area: number; ids: number[] }>();
    for (const p of this.world.map.provinces) {
      const o = s.owner[p.id];
      const e = acc.get(o) ?? { x: 0, y: 0, w: 0, area: 0, ids: [] };
      e.x += p.c[0] * p.area; e.y += -p.c[1] * p.area; e.w += p.area; e.area += p.area; e.ids.push(p.id);
      acc.set(o, e);
    }
    this.labels = [];
    for (const [tag, e] of acc) {
      if (tag === 'NUL') continue;
      const cx = e.x / e.w, cy = e.y / e.w;
      let best = e.ids[0], bd = Infinity;
      for (const id of e.ids) { const c = this.world.map.provinces[id].c; const d = (c[0] - cx) ** 2 + (-c[1] - cy) ** 2; if (d < bd) { bd = d; best = id; } }
      const c = this.world.map.provinces[best].c;
      const pr = this.world.profiles[tag];
      const short = pr.name.replace(/^(Regno|Impero|Repubblica|Principato|Confederazione|Granducato|Sultanato|Chedivato|Beilicato|Regni Uniti) (d'|di |del |dei |delle |)/, '').replace(/^(\w)/, (m) => m.toUpperCase());
      this.labels.push({ text: short, x: c[0], y: -c[1], size: Math.min(90, Math.max(14, Math.sqrt(e.area) / 9)) });
    }
    this.dirty = true;
  }

  private resize() {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    const r = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.max(1, Math.round(r.width * this.dpr));
    this.canvas.height = Math.max(1, Math.round(r.height * this.dpr));
    this.dirty = true;
  }

  private hatch(color: string): CanvasPattern {
    let p = this.hatches.get(color);
    if (p) return p;
    const c = document.createElement('canvas');
    c.width = c.height = 10;
    const g = c.getContext('2d')!;
    g.strokeStyle = color; g.lineWidth = 3.2;
    g.beginPath(); g.moveTo(-2, 12); g.lineTo(12, -2); g.moveTo(8, 12); g.lineTo(12, 8); g.moveTo(-2, 2); g.lineTo(2, -2); g.stroke();
    p = this.ctx.createPattern(c, 'repeat')!;
    this.hatches.set(color, p);
    return p;
  }

  private worldToScreen(x: number, y: number): [number, number] {
    const W = this.canvas.width / this.dpr, H = this.canvas.height / this.dpr;
    return [(x - this.cam.x) * this.cam.scale + W / 2, (y - this.cam.y) * this.cam.scale + H / 2];
  }
  private screenToWorld(sx: number, sy: number): [number, number] {
    const W = this.canvas.width / this.dpr, H = this.canvas.height / this.dpr;
    return [(sx - W / 2) / this.cam.scale + this.cam.x, (sy - H / 2) / this.cam.scale + this.cam.y];
  }

  centerOn(provinceId: number, scale?: number) {
    const c = this.world.map.provinces[provinceId].c;
    this.cam.x = c[0]; this.cam.y = -c[1];
    if (scale) this.cam.scale = scale;
    this.dirty = true;
  }

  /** Inquadra due province nella parte alta dello schermo (sopra il pannello, su telefono). */
  focusBetween(a: number, b: number) {
    const pa = this.world.map.provinces[a].c, pb = this.world.map.provinces[b].c;
    const W = this.canvas.width / this.dpr, H = this.canvas.height / this.dpr;
    const mobile = window.innerWidth < 900;
    const usableH = mobile ? H * 0.38 : H * 0.8;
    const span = Math.max(Math.abs(pa[0] - pb[0]) / (W * 0.8), Math.abs(pa[1] - pb[1]) / usableH, 1 / 1.2);
    this.cam.scale = Math.min(this.cam.scale, 1 / span);
    this.cam.x = (pa[0] + pb[0]) / 2;
    const midY = -(pa[1] + pb[1]) / 2;
    // il punto medio va al centro dell'area visibile
    const targetScreenY = mobile ? H * 0.22 : H / 2;
    this.cam.y = midY - (targetScreenY - H / 2) / this.cam.scale;
    this.dirty = true;
  }

  unitScreenPos(u: Unit): [number, number] {
    const p = this.override?.[u.id] ?? unitPosition(this.world, u);
    return this.worldToScreen(p[0], p[1]);
  }

  private draw() {
    const ctx = this.ctx;
    const s = this.world.state;
    const prof = this.world.profiles;
    const W = this.canvas.width / this.dpr, H = this.canvas.height / this.dpr;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    // mare con leggera vignettatura
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.2, W / 2, H / 2, Math.max(W, H) * 0.8);
    g.addColorStop(0, SEA); g.addColorStop(1, SEA_DEEP);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    const k = this.cam.scale;
    ctx.setTransform(this.dpr * k, 0, 0, this.dpr * k, this.dpr * (W / 2 - this.cam.x * k), this.dpr * (H / 2 - this.cam.y * k));
    const [vx0, vy0] = this.screenToWorld(0, 0), [vx1, vy1] = this.screenToWorld(W, H);
    const visible = (i: number) => !(this.bboxes[i * 4 + 2] < vx0 || this.bboxes[i * 4] > vx1 || this.bboxes[i * 4 + 3] < vy0 || this.bboxes[i * 4 + 1] > vy1);

    // costa: alone d'acqua bassa
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 7 / k;
    ctx.lineJoin = 'round';
    ctx.stroke(this.coast);

    for (let i = 0; i < this.paths.length; i++) {
      if (!visible(i)) continue;
      const owner = s.owner[i], ctrl = s.controller[i];
      ctx.fillStyle = prof[owner]?.color ?? '#aaa';
      ctx.fill(this.paths[i]);
      if (ctrl !== owner) {
        const pat = this.hatch(prof[ctrl]?.color ?? '#000');
        pat.setTransform(new DOMMatrix([1 / k, 0, 0, 1 / k, 0, 0]));
        ctx.fillStyle = pat;
        ctx.fill(this.paths[i]);
      }
      if (this.highlight?.has(i)) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fill(this.paths[i]); }
    }
    // velatura carta: le terre del giocatore restano piene, le altre leggermente schiarite
    ctx.fillStyle = 'rgba(238,240,234,0.18)';
    for (let i = 0; i < this.paths.length; i++) if (visible(i) && s.owner[i] !== s.player) ctx.fill(this.paths[i]);

    if (k > 0.35) {
      ctx.strokeStyle = 'rgba(31,42,51,0.28)';
      ctx.lineWidth = 0.7 / k;
      ctx.stroke(this.internal);
    }
    ctx.strokeStyle = 'rgba(31,42,51,0.55)';
    ctx.lineWidth = 0.9 / k;
    ctx.stroke(this.coast);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.1 / k;
    ctx.stroke(this.national);

    if (this.selectedProvince !== null) {
      ctx.strokeStyle = BRASS;
      ctx.lineWidth = 3 / k;
      ctx.stroke(this.paths[this.selectedProvince]);
    }

    // percorso in anteprima
    if (this.previewPath?.length && this.selectedUnit) {
      const u = s.units.find((x) => x.id === this.selectedUnit);
      if (u) {
        const pts = [u.location, ...this.previewPath].map((id) => this.world.map.provinces[id].c);
        ctx.strokeStyle = WAX;
        ctx.lineWidth = 3 / k;
        ctx.setLineDash([8 / k, 6 / k]);
        ctx.beginPath();
        pts.forEach((c, i) => (i ? ctx.lineTo(c[0], -c[1]) : ctx.moveTo(c[0], -c[1])));
        ctx.stroke();
        ctx.setLineDash([]);
        const end = pts[pts.length - 1];
        ctx.fillStyle = WAX;
        ctx.beginPath(); ctx.arc(end[0], -end[1], 6 / k, 0, Math.PI * 2); ctx.fill();
      }
    }
    // percorsi in corso delle unità del giocatore
    ctx.strokeStyle = 'rgba(31,42,51,0.55)';
    ctx.lineWidth = 1.6 / k;
    ctx.setLineDash([4 / k, 4 / k]);
    for (const u of s.units) {
      if (u.nation !== s.player || !u.move?.path.length || this.override) continue;
      const [ux, uy] = unitPosition(this.world, u);
      ctx.beginPath(); ctx.moveTo(ux, uy);
      for (const id of u.move.path) { const c = this.world.map.provinces[id].c; ctx.lineTo(c[0], -c[1]); }
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // etichette: nazioni da lontano, province da vicino
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (k < 0.75) {
      for (const l of this.labels) {
        const size = l.size * k * 2.2;
        if (size < 9) continue;
        const [x, y] = this.worldToScreen(l.x, l.y);
        ctx.font = `italic 600 ${Math.min(30, size)}px Alegreya, Georgia, serif`;
        (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${Math.min(6, size / 5)}px`;
        ctx.fillStyle = 'rgba(31,42,51,0.62)';
        ctx.fillText(l.text, x, y);
      }
      (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = '0px';
    } else {
      ctx.font = '500 11px "Alegreya Sans", sans-serif';
      ctx.fillStyle = 'rgba(31,42,51,0.75)';
      for (const p of this.world.map.provinces) {
        if (!visible(p.id) || (k < 1.1 && p.area < 4000)) continue;
        const [x, y] = this.worldToScreen(p.c[0], -p.c[1]);
        ctx.fillText(p.name, x, y + 16);
      }
    }

    // pedine
    const stacks = new Map<number, Unit[]>();
    for (const u of s.units) {
      const key = this.override ? -1 : u.location;
      if (key >= 0 && !u.move?.progress) { const l = stacks.get(key) ?? []; l.push(u); stacks.set(key, l); }
    }
    const offset = (u: Unit) => { const l = stacks.get(u.location); if (!l || this.override || u.move?.progress) return 0; return l.indexOf(u); };
    const showAll = k > 0.3;
    for (const u of s.units) {
      if (!showAll && u.nation !== s.player) continue;
      const [x, y] = this.unitScreenPos(u);
      if (x < -30 || y < -30 || x > W + 30 || y > H + 30) continue;
      const i = offset(u);
      this.drawCounter(u, x + i * 5, y - i * 5);
    }
  }

  private drawCounter(u: Unit, x: number, y: number) {
    const ctx = this.ctx;
    const s = this.world.state;
    const mine = u.nation === s.player;
    const w = mine ? 26 : 20, h = mine ? 18 : 14;
    ctx.fillStyle = this.world.profiles[u.nation].color;
    ctx.strokeStyle = this.selectedUnit === u.id ? BRASS : INK;
    ctx.lineWidth = this.selectedUnit === u.id ? 3 : 1.3;
    ctx.beginPath(); ctx.rect(x - w / 2, y - h / 2, w, h); ctx.fill(); ctx.stroke();
    // simbolo d'arma
    ctx.strokeStyle = INK; ctx.lineWidth = 1.2;
    const ix = x - w / 2 + 3, iy = y - h / 2 + 3, iw = w - 6, ih = h - 6;
    ctx.beginPath();
    if (u.type === 'infantry') { ctx.moveTo(ix, iy); ctx.lineTo(ix + iw, iy + ih); ctx.moveTo(ix + iw, iy); ctx.lineTo(ix, iy + ih); }
    else if (u.type === 'cavalry') { ctx.moveTo(ix, iy + ih); ctx.lineTo(ix + iw, iy); }
    ctx.stroke();
    if (u.type === 'artillery') { ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fill(); }
    if (u.inBattle) { ctx.fillStyle = WAX; ctx.beginPath(); ctx.arc(x + w / 2, y - h / 2, 4, 0, Math.PI * 2); ctx.fill(); }
    if (u.supply < 0.3) { ctx.fillStyle = '#e0b040'; ctx.beginPath(); ctx.arc(x - w / 2, y - h / 2, 3.5, 0, Math.PI * 2); ctx.fill(); }
    if (mine || this.cam.scale > 0.8) {
      ctx.font = '700 10px "Alegreya Sans", sans-serif';
      ctx.fillStyle = INK;
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(u.strength / 1000)}k`, x, y + h / 2 + 8);
    }
  }

  // --- input: trascinamento, pizzico, rotella, tocco ---
  private bindInput() {
    const c = this.canvas;
    const pts = new Map<number, { x: number; y: number }>();
    let moved = 0;
    let pinch: { d: number; scale: number } | null = null;
    c.addEventListener('pointerdown', (e) => { c.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), scale: this.cam.scale }; } });
    c.addEventListener('pointermove', (e) => {
      const p = pts.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      if (pts.size === 2 && pinch) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        this.zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, (pinch.scale * d) / pinch.d / this.cam.scale);
        moved += 10;
      } else if (pts.size === 1) {
        this.cam.x -= dx / this.cam.scale; this.cam.y -= dy / this.cam.scale;
        moved += Math.abs(dx) + Math.abs(dy);
        this.dirty = true;
      }
    });
    const up = (e: PointerEvent) => {
      const wasTap = pts.size === 1 && moved < 8;
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = null;
      if (wasTap) this.tap(e.clientX, e.clientY);
    };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', (e) => { pts.delete(e.pointerId); pinch = null; });
    c.addEventListener('wheel', (e) => { e.preventDefault(); this.zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
  }

  zoomAt(cx: number, cy: number, f: number) {
    const r = this.canvas.getBoundingClientRect();
    const sx = cx - r.left, sy = cy - r.top;
    const [wx, wy] = this.screenToWorld(sx, sy);
    this.cam.scale = Math.max(0.08, Math.min(4, this.cam.scale * f));
    const [nx, ny] = this.screenToWorld(sx, sy);
    this.cam.x += wx - nx; this.cam.y += wy - ny;
    this.dirty = true;
  }

  private tap(cx: number, cy: number) {
    const r = this.canvas.getBoundingClientRect();
    const sx = cx - r.left, sy = cy - r.top;
    // prima le pedine (bersaglio generoso per le dita)
    const s = this.world.state;
    let best: Unit | null = null, bd = 20;
    for (const u of s.units) {
      if (this.cam.scale <= 0.3 && u.nation !== s.player) continue;
      const [x, y] = this.unitScreenPos(u);
      const d = Math.hypot(x - sx, y - sy);
      if (d < bd || (d === bd && u.nation === s.player)) { bd = d; best = u; }
    }
    if (best && !this.previewPick) { this.cb.onUnit(best); return; }
    const [wx, wy] = this.screenToWorld(sx, sy);
    for (let i = 0; i < this.paths.length; i++) {
      if (wx < this.bboxes[i * 4] || wx > this.bboxes[i * 4 + 2] || wy < this.bboxes[i * 4 + 1] || wy > this.bboxes[i * 4 + 3]) continue;
      if (this.hit.isPointInPath(this.paths[i], wx, wy)) { this.cb.onProvince(i); return; }
    }
    this.cb.onProvince(null);
  }

  /** durante la scelta di una destinazione i tocchi vanno alle province */
  previewPick = false;
}
