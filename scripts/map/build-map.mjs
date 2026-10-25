#!/usr/bin/env node
// Genera la mappa di gioco (province, proprietari 1881, adiacenze, coste, stretti)
// a partire da dataset open source. Ripetibile: `npm run map`.
//
// Fonti:
//  - Natural Earth 10m admin-1 (dominio pubblico) -> geometria delle province
//  - Natural Earth 10m populated places (dominio pubblico) -> peso demografico
//  - aourednik/historical-basemaps world_1880 (GPL-3.0) -> confini politici 1880
//
// Pipeline:
//  1. ritaglio sull'area di gioco, suddivisione delle province troppo grandi
//  2. sovrapposizione con i confini 1880 (mapshaper -union): ogni pezzo ha
//     provincia moderna + stato storico
//  3. raggruppamento: pezzi minuscoli assorbiti, province piccole accorpate
//  4. dissolve, semplificazione, proiezione LAEA Europa
//  5. tabella province: proprietario, popolazione, terreno, coste, vicini, stretti

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as turf from '@turf/turf';
import * as topojson from 'topojson-client';
import { HIST_TO_TAG, OVERRIDES, NATION_POP_1881, MOUNTAINS, HILLS, CHECKS, CORRECTION_POLYGONS } from './map-config.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const RAW = path.join(ROOT, 'data-raw');
const TMP = path.join(RAW, 'tmp');
const OUT = path.join(ROOT, 'public/data/europe1881.json');
const BBOX = [-11, 27, 50, 71];

const SOURCES = {
  'ne_admin1.geojson': 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson',
  'ne_places.geojson': 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_populated_places_simple.geojson',
  'world_1880.geojson': 'https://raw.githubusercontent.com/aourednik/historical-basemaps/master/geojson/world_1880.geojson',
};

const MICRO = new Set(['SMR', 'VAT', 'MCO', 'AND', 'LIE']);
const SPLIT_AREA = 22000;   // km2: sopra questa soglia una provincia viene divisa
const SPLIT_TARGET = 13000; // km2 per pezzo
const SLIVER = 350;         // km2: pezzi più piccoli vengono assorbiti
const MIN_AREA = 2600;      // km2: province più piccole vengono accorpate
const MAX_MERGE = 11000;    // km2: limite dell'accorpamento
const STRAIT_KM = 45;       // distanza massima per uno stretto attraversabile

const log = (...a) => console.log('[map]', ...a);
const cleanName = (n) => String(n || '?')
  .replace(/^(Provincia autonoma di|Provincia di|Città metropolitana di|Città Metropolitana di|Libero consorzio comunale di|Città metropolitana|Region of|Regione di|Département de|Département du) /i, '')
  .replace(/^(autonoma di|Regione) /i, '').replace(/^(Kreis|Landkreis) /, '').trim()
  .replace(/^./, (c) => c.toUpperCase());
const ms = (...args) => execFileSync(process.execPath, [path.join(ROOT, 'node_modules/mapshaper/bin/mapshaper'), ...args], { stdio: ['ignore', 'ignore', 'inherit'], maxBuffer: 1 << 30 });
const readJSON = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const km2 = (f) => turf.area(f) / 1e6;

async function download() {
  fs.mkdirSync(TMP, { recursive: true });
  for (const [name, url] of Object.entries(SOURCES)) {
    const dest = path.join(RAW, name);
    if (fs.existsSync(dest)) continue;
    log('scarico', url);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`download fallito ${url}: ${res.status}`);
    fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  }
}

// --- k-means deterministico (inizializzazione farthest-point) ---
function kmeans(pts, k) {
  const cents = [pts[0]];
  while (cents.length < k) {
    let best = null, bd = -1;
    for (const p of pts) {
      const d = Math.min(...cents.map((c) => (c[0] - p[0]) ** 2 + (c[1] - p[1]) ** 2));
      if (d > bd) { bd = d; best = p; }
    }
    cents.push(best);
  }
  for (let it = 0; it < 25; it++) {
    const sum = cents.map(() => [0, 0, 0]);
    for (const p of pts) {
      let bi = 0, bd = Infinity;
      cents.forEach((c, i) => { const d = (c[0] - p[0]) ** 2 + (c[1] - p[1]) ** 2; if (d < bd) { bd = d; bi = i; } });
      sum[bi][0] += p[0]; sum[bi][1] += p[1]; sum[bi][2]++;
    }
    sum.forEach((s, i) => { if (s[2]) cents[i] = [s[0] / s[2], s[1] / s[2]]; });
  }
  return cents;
}

function splitLarge(fc) {
  const out = [];
  let splitCount = 0;
  for (const f of fc.features) {
    const a = km2(f);
    const c = turf.centroid(f).geometry.coordinates;
    const desert = c[1] < 31.5 && c[0] > -12;
    if (a < SPLIT_AREA || desert) { out.push(f); continue; }
    const k = Math.min(8, Math.max(2, Math.round(a / SPLIT_TARGET)));
    const bb = turf.bbox(f);
    const step = Math.max((bb[2] - bb[0]), (bb[3] - bb[1])) / 40;
    const pts = [];
    for (let x = bb[0]; x <= bb[2]; x += step)
      for (let y = bb[1]; y <= bb[3]; y += step)
        if (turf.booleanPointInPolygon([x, y], f)) pts.push([x, y]);
    if (pts.length < k * 3) { out.push(f); continue; }
    const cents = kmeans(pts, k);
    const vor = turf.voronoi(turf.featureCollection(cents.map((c) => turf.point(c))), { bbox: [bb[0] - 1, bb[1] - 1, bb[2] + 1, bb[3] + 1] });
    let i = 0;
    for (const cell of vor.features) {
      if (!cell) continue;
      const piece = turf.intersect(turf.featureCollection([f, cell]));
      if (!piece) continue;
      piece.properties = { ...f.properties, pid: `${f.properties.pid}~${++i}` };
      out.push(piece);
    }
    splitCount++;
  }
  log(`suddivise ${splitCount} province grandi -> ${out.length} pezzi`);
  return turf.featureCollection(out);
}

// Proiezione azimutale equivalente di Lambert (centro 52N 10E), in km.
const LAT0 = (52 * Math.PI) / 180, LON0 = (10 * Math.PI) / 180, R = 6371;
function laea([lon, lat]) {
  const l = (lon * Math.PI) / 180, p = (lat * Math.PI) / 180;
  const k = Math.sqrt(2 / (1 + Math.sin(LAT0) * Math.sin(p) + Math.cos(LAT0) * Math.cos(p) * Math.cos(l - LON0)));
  return [R * k * Math.cos(p) * Math.sin(l - LON0), R * k * (Math.cos(LAT0) * Math.sin(p) - Math.sin(LAT0) * Math.cos(p) * Math.cos(l - LON0))];
}

function terrainOf(lon, lat, owner) {
  const near = (list, r) => list.some(([x, y]) => turf.distance([lon, lat], [x, y]) < r);
  if (near(MOUNTAINS, 75)) return 'mountain';
  if (lat < 31.5 && lon > -12) return 'desert';
  if (near(HILLS, 110)) return 'hills';
  if (lat > 58 && (owner === 'RUS' || owner === 'SWE')) return 'forest';
  return 'plain';
}

async function main() {
  await download();

  // 1. ritaglio + campi minimi
  log('ritaglio province');
  ms(path.join(RAW, 'ne_admin1.geojson'), '-clip', `bbox=${BBOX}`, '-each', 'pid=adm1_code, iso=iso_3166_2, pname=name_it || name_en || name, modern=adm0_a3',
    '-filter-fields', 'pid,iso,pname,modern', '-simplify', 'interval=800', 'keep-shapes', '-o', path.join(TMP, 'prov.geojson'));
  ms(path.join(RAW, 'world_1880.geojson'), '-clip', `bbox=${BBOX}`, '-each', 'hist=NAME', '-filter-fields', 'hist', '-o', path.join(TMP, 'hist.geojson'));

  const prov = splitLarge(readJSON(path.join(TMP, 'prov.geojson')));
  fs.writeFileSync(path.join(TMP, 'prov_split.geojson'), JSON.stringify(prov));

  // 2. sovrapposizione con i confini 1880
  log('sovrapposizione con i confini 1880');
  fs.writeFileSync(path.join(TMP, 'fix.geojson'), JSON.stringify(turf.featureCollection(CORRECTION_POLYGONS.map((c) => turf.polygon([c.ring], { fix: c.to })))));
  ms('-i', path.join(TMP, 'prov_split.geojson'), path.join(TMP, 'hist.geojson'), path.join(TMP, 'fix.geojson'), 'combine-files', '-union', 'target=prov_split,hist,fix',
    '-filter', 'pid != null', 'remove-empty', '-o', 'format=topojson', path.join(TMP, 'pieces.topo.json'));

  // 3. raggruppamento
  const topo = readJSON(path.join(TMP, 'pieces.topo.json'));
  const objName = Object.keys(topo.objects)[0];
  const geoms = topo.objects[objName].geometries.filter((g) => g.type && g.arcs && g.arcs.length);
  const feats = geoms.map((g) => topojson.feature(topo, g));
  const nbr = topojson.neighbors(geoms);
  const N = geoms.length;
  log(`${N} pezzi dopo la sovrapposizione`);
  const cent = feats.map((f) => turf.centroid(f).geometry.coordinates);
  const P = feats.map((f, i) => {
    const pr = f.properties;
    let owner = pr.hist ? HIST_TO_TAG[pr.hist] : null;
    if (pr.hist && owner === undefined) throw new Error(`stato storico senza tag: ${pr.hist}`);
    if (pr.fix && owner) owner = pr.fix;
    return { i, fix: pr.fix, pid: pr.pid, iso: pr.iso, name: cleanName(pr.pname), modern: pr.modern, owner, area: km2(f), feat: f };
  });
  const applyOverrides = (p) => {
    if (p.fix) { p.owner = p.fix; return; }
    for (const o of OVERRIDES) {
      if (o.modern && o.modern !== p.modern) continue;
      if (o.iso && !o.iso.includes(p.iso)) continue;
      if (o.notModern && o.notModern === p.modern) continue;
      if (o.from && o.from !== p.owner) continue;
      if (o.when && !o.when(cent[p.i])) continue;
      p.owner = o.to;
    }
  };
  P.forEach(applyOverrides);

  // pezzi senza stato storico: vicino più esteso, poi maggioranza dello stesso paese moderno, poi il più vicino
  const modernMajority = new Map();
  for (const p of P) if (p.owner) { const m = modernMajority.get(p.modern) || {}; m[p.owner] = (m[p.owner] || 0) + p.area; modernMajority.set(p.modern, m); }
  for (let pass = 0; pass < 6; pass++) {
    for (const p of P) {
      if (p.owner) continue;
      const cands = nbr[p.i].map((j) => P[j]).filter((q) => q.owner);
      if (cands.length) { p.owner = cands.sort((a, b) => b.area - a.area)[0].owner; continue; }
      if (pass < 4) continue;
      const mm = modernMajority.get(p.modern);
      if (mm) { p.owner = Object.entries(mm).sort((a, b) => b[1] - a[1])[0][0]; continue; }
      if (pass === 5) {
        let best = null, bd = Infinity;
        for (const q of P) if (q.owner) { const d = turf.distance(cent[p.i], cent[q.i]); if (d < bd) { bd = d; best = q; } }
        p.owner = bd < 150 ? best.owner : 'NUL';
      }
    }
    P.forEach((p) => { if (p.owner) applyOverrides(p); });
  }

  // union-find dei gruppi
  const parent = P.map((_, i) => i);
  const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const gArea = P.map((p) => p.area);
  const join = (a, b) => { a = find(a); b = find(b); if (a === b) return; parent[b] = a; gArea[a] += gArea[b]; };
  const groupNbrs = (g) => { const s = new Set(); P.forEach((p) => { if (find(p.i) === g) nbr[p.i].forEach((j) => s.add(find(j))); }); s.delete(g); return [...s]; };

  // stessi pid + stesso proprietario -> stesso gruppo (multi-parte)
  const byKey = new Map();
  for (const p of P) { const k = `${p.pid}|${p.owner}`; if (byKey.has(k)) join(byKey.get(k), p.i); else byKey.set(k, p.i); }
  // schegge
  for (const p of P) {
    if (gArea[find(p.i)] >= SLIVER) continue;
    const ns = nbr[p.i].map((j) => P[j]);
    const same = ns.filter((q) => q.owner === p.owner).sort((a, b) => b.area - a.area);
    if (same.length) join(same[0].i, p.i);
    else if (ns.length && gArea[find(p.i)] < 120) { const q = ns.sort((a, b) => b.area - a.area)[0]; join(q.i, p.i); }
  }
  // accorpamento delle province piccole (stesso stato storico, preferibilmente stesso paese moderno)
  let changed = true;
  while (changed) {
    changed = false;
    const roots = [...new Set(P.map((p) => find(p.i)))].sort((a, b) => gArea[a] - gArea[b]);
    for (const g of roots) {
      if (find(g) !== g || gArea[g] >= MIN_AREA) continue;
      const owner = P[g].owner;
      const cands = groupNbrs(g).filter((h) => P[h].owner === owner && gArea[h] + gArea[g] <= MAX_MERGE)
        .sort((a, b) => (P[b].modern === P[g].modern) - (P[a].modern === P[g].modern) || gArea[a] - gArea[b]);
      if (cands.length) { join(cands[0], g); changed = true; }
    }
  }

  // peso urbano di ogni pezzo: il nome della provincia accorpata è quello del pezzo più popoloso
  const placesAll = readJSON(path.join(RAW, 'ne_places.geojson')).features;
  for (const pl of placesAll) {
    const [x, y] = pl.geometry.coordinates;
    if (x < BBOX[0] || x > BBOX[2] || y < BBOX[1] || y > BBOX[3]) continue;
    for (const p of P) {
      const bb = p.bb || (p.bb = turf.bbox(p.feat));
      if (x < bb[0] || x > bb[2] || y < bb[1] || y > bb[3]) continue;
      if (turf.booleanPointInPolygon([x, y], p.feat)) { p.urban = (p.urban || 0) + (pl.properties.pop_max || 0); break; }
    }
  }
  const roots = [...new Set(P.map((p) => find(p.i)))];
  const gid = new Map(roots.map((r, k) => [r, k]));
  // nome del gruppo = pezzo più esteso; nomi duplicati numerati
  const gInfo = roots.map((r) => {
    const mem = P.filter((p) => find(p.i) === r).sort((a, b) => b.area - a.area);
    const byName = new Map();
    for (const m of mem) byName.set(m.name, (byName.get(m.name) || 0) + (MICRO.has(m.modern) ? 0 : (m.urban || 0) + m.area * 2));
    const name = [...byName.entries()].sort((a, b) => b[1] - a[1])[0][0];
    return { name, owner: mem[0].owner, modern: mem[0].modern, area: gArea[r] };
  });
  // verifica dei confini storici su località note
  let bad = 0;
  for (const [label, lon, lat, want] of CHECKS) {
    const hit = P.find((p) => { const bb = p.bb || (p.bb = turf.bbox(p.feat)); return lon >= bb[0] && lon <= bb[2] && lat >= bb[1] && lat <= bb[3] && turf.booleanPointInPolygon([lon, lat], p.feat); });
    const got = hit ? gInfo[gid.get(find(hit.i))].owner : 'mare?';
    if (got !== want) { bad++; log(`CONTROLLO FALLITO: ${label} è ${got}, atteso ${want}`); }
  }
  log(`controlli storici: ${CHECKS.length - bad}/${CHECKS.length} corretti`);
  if (bad && process.env.STRICT_MAP) process.exit(1);
  for (const p of P) p.feat.properties = { g: gid.get(find(p.i)) };
  fs.writeFileSync(path.join(TMP, 'grouped.geojson'), JSON.stringify(turf.featureCollection(P.map((p) => p.feat))));
  log(`${roots.length} province di gioco`);

  // 4. dissolve + semplificazione per la visualizzazione
  ms(path.join(TMP, 'grouped.geojson'), '-dissolve2', 'g', '-simplify', 'interval=3500', 'keep-shapes', '-filter-slivers', 'min-area=40km2',
    '-o', 'format=topojson', path.join(TMP, 'final.topo.json'));

  // 5. tabella delle province
  const ft = readJSON(path.join(TMP, 'final.topo.json'));
  const fobj = ft.objects[Object.keys(ft.objects)[0]];
  const fgeoms = fobj.geometries.filter((g) => g.type);
  const ffeats = fgeoms.map((g) => topojson.feature(ft, g));
  const fnbr = topojson.neighbors(fgeoms);
  const places = readJSON(path.join(RAW, 'ne_places.geojson')).features
    .filter((f) => { const [x, y] = f.geometry.coordinates; return x > BBOX[0] && x < BBOX[2] && y > BBOX[1] && y < BBOX[3]; });

  // decodifica archi (quantizzati) -> coordinate geografiche
  const tf = ft.transform;
  const arcs = ft.arcs.map((arc) => { let x = 0, y = 0; return arc.map(([dx, dy]) => { x += dx; y += dy; return tf ? [x * tf.scale[0] + tf.translate[0], y * tf.scale[1] + tf.translate[1]] : [dx, dy]; }); });
  // uso degli archi: quale provincia sta su ciascun lato
  const arcUse = arcs.map(() => []);
  const walkArcs = (g, cb) => { const rec = (a) => (typeof a === 'number' ? cb(a) : a.forEach(rec)); rec(g.arcs); };
  fgeoms.forEach((g, k) => walkArcs(g, (a) => arcUse[a < 0 ? ~a : a].push(k)));
  const onClip = (arc) => arc.every(([x, y]) => Math.abs(x - BBOX[0]) < 0.02 || Math.abs(x - BBOX[2]) < 0.02 || Math.abs(y - BBOX[1]) < 0.02 || Math.abs(y - BBOX[3]) < 0.02);

  const provinces = fgeoms.map((g, k) => {
    const info = gInfo[g.properties.g];
    const f = ffeats[k];
    let pt = turf.centerOfMass(f).geometry.coordinates;
    if (!turf.booleanPointInPolygon(pt, f)) {
      // centro della parte più estesa
      const polys = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates.map((c) => turf.polygon(c)) : [f];
      const big = polys.sort((a, b) => turf.area(b) - turf.area(a))[0];
      pt = turf.centerOfMass(big).geometry.coordinates;
      if (!turf.booleanPointInPolygon(pt, big)) pt = turf.pointOnFeature(big).geometry.coordinates;
    }
    let coastLen = 0;
    walkArcs(g, (a) => { const idx = a < 0 ? ~a : a; if (arcUse[idx].length === 1 && !onClip(arcs[idx])) coastLen += turf.length(turf.lineString(arcs[idx].length > 1 ? arcs[idx] : [arcs[idx][0], arcs[idx][0]])); });
    return { k, info, f, pt, coast: coastLen > 15, modernPop: 0 };
  });

  // popolazione: peso = popolazione moderna delle località (radice per smorzare le metropoli) + area
  for (const pl of places) {
    const c = pl.geometry.coordinates;
    for (const p of provinces) {
      const bb = p.bb || (p.bb = turf.bbox(p.f));
      if (c[0] < bb[0] || c[0] > bb[2] || c[1] < bb[1] || c[1] > bb[3]) continue;
      if (turf.booleanPointInPolygon(c, p.f)) { p.modernPop += Math.sqrt(pl.properties.pop_max || 0); break; }
    }
  }
  // pool = nazione + (paese moderno se ha una sotto-voce), altrimenti resto della nazione
  const poolOf = (p) => { const t = NATION_POP_1881[p.info.owner]; return t && t[p.info.modern] !== undefined ? `${p.info.owner}:${p.info.modern}` : `${p.info.owner}:*`; };
  const poolTotal = (key) => {
    const [o, m] = key.split(':'); const t = NATION_POP_1881[o]; if (!t) return null;
    if (m !== '*') return t[m];
    return t.total - Object.entries(t).filter(([k]) => k !== 'total').reduce((s, [, v]) => s + v, 0);
  };
  const byPool = new Map();
  for (const p of provinces) { const w = p.modernPop + p.info.area * 0.15; p.w = w; const k = poolOf(p); byPool.set(k, (byPool.get(k) || 0) + w); }
  for (const p of provinces) {
    const k = poolOf(p); const tot = poolTotal(k);
    p.pop = tot != null ? Math.round((tot * p.w) / byPool.get(k)) : Math.round(p.info.area * 2);
  }

  // stretti: coppie di province costiere non confinanti ma vicine (<STRAIT_KM)
  const coastPts = provinces.map((p) => {
    if (!p.coast) return [];
    const pts = [];
    walkArcs(fgeoms[p.k], (a) => { const idx = a < 0 ? ~a : a; if (arcUse[idx].length === 1) for (let i = 0; i < arcs[idx].length; i += 2) pts.push(arcs[idx][i]); });
    return pts;
  });
  const CELL = 0.5, grid = new Map();
  coastPts.forEach((pts, k) => pts.forEach((c) => { const key = `${Math.floor(c[0] / CELL)},${Math.floor(c[1] / CELL)}`; if (!grid.has(key)) grid.set(key, []); grid.get(key).push([k, c]); }));
  const straits = new Map();
  coastPts.forEach((pts, k) => {
    const adj = new Set(fnbr[k]);
    for (const c of pts) {
      const gx = Math.floor(c[0] / CELL), gy = Math.floor(c[1] / CELL);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        for (const [j, d] of grid.get(`${gx + dx},${gy + dy}`) || []) {
          if (j <= k || adj.has(j)) continue;
          const dist = turf.distance(c, d);
          const key = `${k},${j}`;
          if (dist < STRAIT_KM && (!straits.has(key) || straits.get(key) > dist)) straits.set(key, dist);
        }
      }
    }
  });
  // tieni solo gli stretti tra masse di terra non già collegate da un percorso terrestre breve
  const comp = new Array(provinces.length).fill(-1);
  let nc = 0;
  for (let s = 0; s < provinces.length; s++) {
    if (comp[s] >= 0) continue;
    const st = [s]; comp[s] = nc;
    while (st.length) { const x = st.pop(); for (const y of fnbr[x]) if (comp[y] < 0) { comp[y] = nc; st.push(y); } }
    nc++;
  }
  const hopDist = (a, b, max) => { // BFS terrestre limitata
    const seen = new Map([[a, 0]]); const q = [a];
    while (q.length) { const x = q.shift(); const d = seen.get(x); if (x === b) return d; if (d >= max) continue; for (const y of fnbr[x]) if (!seen.has(y)) { seen.set(y, d + 1); q.push(y); } }
    return Infinity;
  };
  const strList = [];
  for (const [key, dist] of straits) {
    const [a, b] = key.split(',').map(Number);
    if (comp[a] !== comp[b] || hopDist(a, b, 6) === Infinity) strList.push([a, b, Math.round(dist)]);
  }

  // output: geometria proiettata come anelli interi (km), condivisi tramite archi
  const parr = arcs.map((arc) => arc.map((c) => laea(c).map((v) => Math.round(v * 10) / 10)));
  const outArcs = parr.map((arc) => { const flat = []; let px = 0, py = 0; for (const [x, y] of arc) { const ix = Math.round(x * 10), iy = Math.round(y * 10); flat.push(ix - px, iy - py); px = ix; py = iy; } return flat; });
  const arcSides = arcUse.map((u) => (u.length === 2 ? [u[0], u[1]] : [u[0] ?? -1, -1]));

  const out = {
    version: 1,
    scenario: 'europe1881',
    projection: 'LAEA 52N 10E, km, archi delta-codificati in decimi di km',
    sources: ['Natural Earth (public domain)', 'aourednik/historical-basemaps world_1880 (GPL-3.0)'],
    arcs: outArcs,
    arcSides,
    provinces: provinces.map((p) => ({
      id: p.k,
      name: p.info.name,
      owner: p.info.owner,
      modern: p.info.modern,
      area: Math.round(p.info.area),
      pop: p.pop,
      terrain: terrainOf(p.pt[0], p.pt[1], p.info.owner),
      coast: p.coast,
      lonlat: p.pt.map((v) => Math.round(v * 1000) / 1000),
      c: laea(p.pt).map((v) => Math.round(v)),
      arcs: fgeoms[p.k].arcs,
      n: fnbr[p.k],
    })),
    straits: strList,
  };
  // nomi duplicati
  const seen = new Map();
  for (const p of out.provinces) { const n = seen.get(p.name) || 0; seen.set(p.name, n + 1); }
  const cnt = new Map();
  for (const p of out.provinces) if (seen.get(p.name) > 1) { const n = (cnt.get(p.name) || 0) + 1; cnt.set(p.name, n); p.name = `${p.name} ${['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][n - 1] || n}`; }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out));
  const owners = {};
  for (const p of out.provinces) owners[p.owner] = (owners[p.owner] || 0) + 1;
  log(`scritto ${OUT}: ${out.provinces.length} province, ${strList.length} stretti, ${(fs.statSync(OUT).size / 1024).toFixed(0)} KB`);
  log('province per nazione', JSON.stringify(owners));
}

main().catch((e) => { console.error(e); process.exit(1); });
