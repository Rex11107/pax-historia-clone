// Zone di mare e rotte navali (come le regioni navali di HOI4).
//
// Prima le navi andavano in linea retta da porto a porto, anche sopra i continenti: New York–San Francisco
// tagliava l'America in due settimane e il canale di Panama non serviva a niente. Qui il mare diventa un grafo:
//   1. raster del mare a 25 km sulla stessa proiezione della mappa (Miller, cucitura a 168° O), continuo in
//      orizzontale: l'ultima colonna confina con la prima, così il Pacifico si attraversa;
//   2. il mare aperto è diviso in zone di ~600 km, il mare vicino alle coste in zone di ~300 km, ciascuna
//      spezzata dove una penisola la attraversa (una zona non salta la terra);
//   3. zone vicine collegate con la distanza vera (sulla sfera) fra i loro punti di riferimento;
//   4. gli stretti più stretti della griglia (Bosforo, Dardanelli, Sund, Gibilterra, Messina…) sono collegamenti
//      espliciti; i canali (Suez dal 1869, Kiel dal 1895, Panama dal 1914) sono collegamenti con una data
//      d'apertura e una provincia: chi la controlla in guerra li chiude al nemico (src/engine/sea.ts);
//   5. ogni provincia costiera conosce le zone su cui si affaccia.
// Le terre sono quelle delle province stesse, quindi coste e porti coincidono con la mappa del gioco.
// Non cambia forme, nomi né padroni: aggiunge `sea` al file della mappa.
// Uso: node scripts/map/mari.mjs [file] (default public/data/europe1881.json); build-map.mjs lo chiama alla fine.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const R = 6371;
const WRAP = 2 * Math.PI * R;
const SEAM = (R * -168 * Math.PI) / 180;
const CS = 25; // km per cella (a questa scala lo Stretto di Dover resta aperto, Gibilterra no: vedi STRETTI)
const TILE = 16; // celle per zona costiera (~400 km); il mare aperto unisce 2×2 riquadri (~800 km)
const OPEN = 16; // celle dalla costa oltre le quali il mare è aperto

// Stretti che la griglia chiude: due punti di mare, uno per lato.
const STRETTI = [
  ['Bosforo', [29.12, 41.28], [28.98, 40.98]],
  ['Dardanelli', [27.0, 40.55], [26.05, 40.0]],
  ['Stretto di Kerč', [36.65, 45.45], [36.45, 45.05]],
  ['Stretto di Gibilterra', [-4.9, 36.05], [-6.3, 35.95]],
  ['Sund', [12.65, 56.15], [12.85, 55.45]],
  ['Grande Belt', [10.95, 55.85], [11.0, 55.1]],
  ['Passo di Calais', [1.75, 51.2], [1.2, 50.75]],
  ['Stretto di Messina', [15.6, 38.35], [15.6, 37.95]],
  ['Bab el-Mandeb', [43.15, 12.9], [43.7, 12.35]],
  ['Stretto di Hormuz', [56.2, 26.75], [56.85, 26.15]],
  ['Stretto di Singapore', [103.3, 1.35], [104.35, 1.3]],
  ['Stretto di Shimonoseki', [130.8, 34.05], [131.05, 33.9]],
  ['Stretto di Bering', [-169.0, 66.2], [-169.7, 65.3]],
  ['Stretto di Magellano', [-68.5, -52.5], [-74.6, -52.7]],
];
// Canali: apertura (data storica) e punto del canale (la provincia che lo contiene lo controlla).
const CANALI = [
  ['Canale di Suez', [32.35, 31.45], [32.6, 29.85], '1869-11-17', [32.33, 30.6]],
  ['Canale di Kiel', [10.25, 54.5], [8.9, 53.95], '1895-06-20', [9.7, 54.2]],
  ['Canale di Panama', [-79.9, 9.45], [-79.5, 8.8], '1914-08-15', [-79.7, 9.1]],
];
const START = Date.UTC(1881, 0, 1);

const file = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, 'public/data/europe1881.json');
const M = JSON.parse(fs.readFileSync(file, 'utf8'));

// --- proiezione (stessa di src/engine/map.ts) ---
const proj = (lon0, lat) => {
  const lon = lon0 < -168 ? lon0 + 360 : lon0;
  const p = (Math.max(-85, Math.min(85, lat)) * Math.PI) / 180;
  return [(R * lon * Math.PI) / 180, R * 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * p))];
};
const unproj = (x, y) => {
  let lon = (x / R) * (180 / Math.PI);
  if (lon > 180) lon -= 360;
  const lat = ((Math.atan(Math.exp(y / (1.25 * R))) - Math.PI / 4) / 0.4) * (180 / Math.PI);
  return [lon, lat];
};
const gc = (a, b) => {
  const r = Math.PI / 180, dLat = (b[1] - a[1]) * r, dLon = (b[0] - a[0]) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
};

// --- archi (y verso nord, come le coordinate della proiezione) ---
const arcs = M.arcs.map((flat) => {
  const out = new Float64Array(flat.length);
  let x = 0, y = 0;
  for (let i = 0; i < flat.length; i += 2) { x += flat[i]; y += flat[i + 1]; out[i] = x / 10; out[i + 1] = y / 10; }
  return out;
});
const rings = (p) => {
  if (!p.arcs.length) return [];
  const polys = typeof p.arcs[0][0] === 'number' ? [p.arcs] : p.arcs;
  const out = [];
  for (const poly of polys) for (const ring of poly) {
    const pts = [];
    for (const a of ring) {
      const arc = arcs[a < 0 ? ~a : a], n = arc.length / 2;
      for (let i = 0; i < n; i++) { const j = a < 0 ? n - 1 - i : i; if (pts.length && i === 0) continue; pts.push(arc[2 * j], arc[2 * j + 1]); }
    }
    out.push(pts);
  }
  return out;
};

// --- raster ---
let ymin = Infinity, ymax = -Infinity;
for (const a of arcs) for (let i = 1; i < a.length; i += 2) { ymin = Math.min(ymin, a[i]); ymax = Math.max(ymax, a[i]); }
ymin -= 400; ymax += 400;
const COLS = Math.round(WRAP / CS), CW = WRAP / COLS;
const ROWS = Math.ceil((ymax - ymin) / CS);
const cx = (c) => SEAM + (c + 0.5) * CW, cy = (r) => ymin + (r + 0.5) * CS;
const land = new Uint8Array(COLS * ROWS);
for (const p of M.provinces) {
  const rs = rings(p);
  if (!rs.length) continue;
  let y0 = Infinity, y1 = -Infinity;
  for (const r of rs) for (let i = 1; i < r.length; i += 2) { y0 = Math.min(y0, r[i]); y1 = Math.max(y1, r[i]); }
  const r0 = Math.max(0, Math.floor((y0 - ymin) / CS)), r1 = Math.min(ROWS - 1, Math.floor((y1 - ymin) / CS));
  for (let row = r0; row <= r1; row++) {
    const y = cy(row), xs = [];
    for (const r of rs) {
      const n = r.length / 2;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n, ax = r[2 * i], ay = r[2 * i + 1], bx = r[2 * j], by = r[2 * j + 1];
        if ((ay <= y) !== (by <= y)) xs.push(ax + ((y - ay) / (by - ay)) * (bx - ax));
      }
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const c0 = Math.max(0, Math.ceil((xs[i] - SEAM) / CW - 0.5)), c1 = Math.min(COLS - 1, Math.floor((xs[i + 1] - SEAM) / CW - 0.5));
      for (let c = c0; c <= c1; c++) land[row * COLS + c] = 1;
    }
  }
}
const idx = (c, r) => r * COLS + (((c % COLS) + COLS) % COLS);
const N8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const neigh = (i, f) => {
  const r = Math.floor(i / COLS), c = i % COLS;
  for (const [dc, dr] of N8) { const rr = r + dr; if (rr < 0 || rr >= ROWS) continue; f(idx(c + dc, rr)); }
};

// distanza dalla costa (in celle) per distinguere il mare aperto
const dist = new Int32Array(COLS * ROWS).fill(-1);
let q = [];
for (let i = 0; i < land.length; i++) if (land[i]) { dist[i] = 0; q.push(i); }
while (q.length) { const nq = []; for (const i of q) neigh(i, (j) => { if (dist[j] < 0) { dist[j] = dist[i] + 1; nq.push(j); } }); q = nq; }

// --- zone ---
const zone = new Int32Array(COLS * ROWS).fill(-1);
let nz = 0;
const TC = Math.ceil(COLS / TILE), TR = Math.ceil(ROWS / TILE);
const tileOf = (i) => [Math.floor((i % COLS) / TILE), Math.floor(Math.floor(i / COLS) / TILE)];
// mare aperto: blocchi di 2×2 riquadri senza terra vicina diventano una zona sola
const bigTile = new Int32Array(TC * TR).fill(-1);
for (let tr = 0; tr + 1 < TR; tr += 2) for (let tc = 0; tc + 1 < TC; tc += 2) {
  let ok = true;
  for (let r = tr * TILE; ok && r < Math.min(ROWS, (tr + 2) * TILE); r++) for (let c = tc * TILE; c < Math.min(COLS, (tc + 2) * TILE); c++) if (dist[r * COLS + c] < OPEN) { ok = false; break; }
  if (ok) { const z = nz++; for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) bigTile[(tr + b) * TC + tc + a] = z; }
}
for (let i = 0; i < land.length; i++) {
  if (land[i] || zone[i] >= 0) continue;
  const [tc, tr] = tileOf(i);
  const big = bigTile[tr * TC + tc];
  if (big >= 0) { zone[i] = big; continue; }
  // componente connessa del mare dentro il riquadro: una penisola divide la zona
  const z = nz++;
  zone[i] = z;
  const st = [i];
  while (st.length) {
    const k = st.pop();
    neigh(k, (j) => { if (!land[j] && zone[j] < 0) { const [a, b] = tileOf(j); if (a === tc && b === tr) { zone[j] = z; st.push(j); } } });
  }
}
// zone minuscole (meno di 4 celle): passano alla zona vicina con cui confinano di più
const cells = Array.from({ length: nz }, () => []);
for (let i = 0; i < zone.length; i++) if (zone[i] >= 0) cells[zone[i]].push(i);
const size = new Int32Array(nz);
for (let z = 0; z < nz; z++) size[z] = cells[z].length;
for (let pass = 0; pass < 3; pass++) {
  for (let z = 0; z < nz; z++) {
    if (!size[z] || size[z] >= 4) continue;
    const cnt = new Map();
    for (const i of cells[z]) neigh(i, (j) => { const y = zone[j]; if (y >= 0 && y !== z && size[y] >= 4) cnt.set(y, (cnt.get(y) ?? 0) + 1); });
    if (!cnt.size) continue;
    const to = [...cnt].sort((a, b) => b[1] - a[1])[0][0];
    // tutta la zona minuscola va a quella vicina
    for (const k of cells[z]) { zone[k] = to; cells[to].push(k); }
    size[to] += size[z]; size[z] = 0; cells[z] = [];
  }
}
// rinumera (le zone rimaste senza celle o laghetti isolati spariscono)
const remap = new Int32Array(nz).fill(-1);
let NZ = 0;
for (let z = 0; z < nz; z++) if (size[z] >= 4) remap[z] = NZ++;
for (let i = 0; i < zone.length; i++) if (zone[i] >= 0) zone[i] = remap[zone[i]];

// punto di riferimento: la cella della zona più vicina alla media (x senza cucitura: i riquadri non la attraversano)
const sx = new Float64Array(NZ), sy = new Float64Array(NZ), sn = new Int32Array(NZ);
for (let i = 0; i < zone.length; i++) { const z = zone[i]; if (z < 0) continue; sx[z] += i % COLS; sy[z] += Math.floor(i / COLS); sn[z]++; }
const best = new Float64Array(NZ).fill(Infinity), rep = new Int32Array(NZ);
for (let i = 0; i < zone.length; i++) {
  const z = zone[i]; if (z < 0) continue;
  const d = (i % COLS - sx[z] / sn[z]) ** 2 + (Math.floor(i / COLS) - sy[z] / sn[z]) ** 2 - dist[i] * 0.5; // un po' verso il largo
  if (d < best[z]) { best[z] = d; rep[z] = i; }
}
const zll = [...rep].map((i) => unproj(cx(i % COLS), cy(Math.floor(i / COLS))).map((v) => Math.round(v * 100) / 100));

// ghiaccio: nel 1881 il passaggio a nord-ovest e quello a nord-est non si navigano (il primo lo traversa
// Amundsen nel 1906, il secondo Nordenskiöld nel 1879 con un'impresa di due stagioni). Restano aperti il mare
// di Norvegia e il Barents meridionale, scaldati dalla Corrente del Golfo (Arcangelo, Hammerfest)
const ice = zll.map(([lon, lat]) => lat > 72 || lat < -62 || (lat > 66 && (lon < -30 || lon > 60)));

// adiacenze
const adj = new Map();
const link = (a, b, km) => { if (a === b || ice[a] || ice[b]) return; const k = a < b ? `${a},${b}` : `${b},${a}`; if (!adj.has(k)) adj.set(k, km ?? Math.round(gc(zll[a], zll[b]))); };
for (let i = 0; i < zone.length; i++) { const z = zone[i]; if (z < 0) continue; neigh(i, (j) => { if (zone[j] >= 0 && zone[j] !== z) link(z, zone[j]); }); }

// zona del mare più vicina a un punto lon/lat (spirale fino a 10 celle)
const zoneAt = (lon, lat) => {
  const [x, y] = proj(lon, lat);
  const c0 = Math.floor((x - SEAM) / CW), r0 = Math.floor((y - ymin) / CS);
  for (let rad = 0; rad <= 10; rad++) {
    let found = -1, bd = Infinity;
    for (let dr = -rad; dr <= rad; dr++) for (let dc = -rad; dc <= rad; dc++) {
      if (Math.max(Math.abs(dr), Math.abs(dc)) !== rad) continue;
      const r = r0 + dr; if (r < 0 || r >= ROWS) continue;
      const i = idx(c0 + dc, r);
      if (zone[i] >= 0 && dr * dr + dc * dc < bd) { bd = dr * dr + dc * dc; found = zone[i]; }
    }
    if (found >= 0) return found;
  }
  return -1;
};
const straits = [];
for (const [name, a, b] of STRETTI) {
  const za = zoneAt(...a), zb = zoneAt(...b);
  if (za < 0 || zb < 0) throw new Error(`stretto ${name}: punto non in mare (${za}, ${zb})`);
  if (za !== zb) { link(za, zb, Math.round(gc(a, b) + gc(zll[za], a) + gc(b, zll[zb]))); straits.push(name); }
}
const canals = CANALI.map(([name, a, b, opens, at]) => {
  const za = zoneAt(...a), zb = zoneAt(...b);
  if (za < 0 || zb < 0 || za === zb) throw new Error(`canale ${name}: estremi non validi (${za}, ${zb})`);
  return { name, a: za, b: zb, km: Math.round(gc(a, b) + gc(zll[za], a) + gc(b, zll[zb])), opens: Math.round((Date.parse(opens) - START) / 86400000), at };
});

// coste: ogni provincia costiera e le zone su cui si affaccia (dai punti dei suoi archi di costa)
const coast = [];
const coastArcs = new Map();
M.arcSides.forEach(([a, b], i) => { if (b < 0) { if (!coastArcs.has(a)) coastArcs.set(a, []); coastArcs.get(a).push(i); } });
let senza = 0;
for (const p of M.provinces) {
  if (!p.coast) continue;
  const zs = new Set();
  for (const ai of coastArcs.get(p.id) ?? []) {
    const a = arcs[ai];
    const step = Math.max(2, Math.floor(a.length / 40) * 2);
    for (let i = 0; i < a.length; i += step) {
      const c0 = Math.floor((a[i] - SEAM) / CW), r0 = Math.floor((a[i + 1] - ymin) / CS);
      for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) { const r = r0 + dr; if (r < 0 || r >= ROWS) continue; const z = zone[idx(c0 + dc, r)]; if (z >= 0) zs.add(z); }
    }
  }
  if (!zs.size) { const z = zoneAt(...p.lonlat); if (z >= 0) zs.add(z); }
  if (!zs.size) { senza++; continue; }
  const row = [p.id];
  for (const z of zs) if (!ice[z]) row.push(z, Math.round(gc(p.lonlat, zll[z])));
  if (row.length === 1) { senza++; continue; } // solo mari ghiacciati
  coast.push(row);
}

M.sea = {
  nota: 'zone di mare generate da scripts/map/mari.mjs: rappresentante [lon, lat], adiacenze [a, b, km], coste [provincia, zona, km, …], canali con giorno d\'apertura dal 1° gennaio 1881',
  zones: zll,
  adj: [...adj].flatMap(([k, km]) => [...k.split(',').map(Number), km]),
  canals,
  coast,
};
fs.writeFileSync(file, JSON.stringify(M));
console.log(`[mari] griglia ${COLS}×${ROWS} da ${CS} km, ${NZ} zone (${ice.filter(Boolean).length} di ghiaccio), ${adj.size} collegamenti, stretti ${straits.length}/${STRETTI.length}, ${canals.length} canali, ${coast.length} province costiere (${senza} senza mare)`);
