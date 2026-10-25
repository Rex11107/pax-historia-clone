#!/usr/bin/env node
// Genera la mappa di gioco (province, proprietari 1881, adiacenze, coste, stretti)
// a partire da dataset open source. Ripetibile: `npm run map`.
//
// Fonti:
//  - Natural Earth 10m admin-1 (dominio pubblico) -> geometria delle province
//  - Natural Earth 10m populated places (dominio pubblico) -> peso demografico
//  - aourednik/historical-basemaps world_1880 (GPL-3.0) -> confini politici 1880
//  - HydroBASINS v1c (HydroSHEDS, Lehner & Grill 2013; uso libero con attribuzione) -> spartiacque
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
import { prepareBasins, splitByBasins } from './basins.mjs';
import { HIST_TO_TAG, OVERRIDES, NATION_POP_1881, MOUNTAINS, HILLS, CHECKS, CORRECTION_POLYGONS, RENAMES } from './map-config.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const RAW = path.join(ROOT, 'data-raw');
const TMP = path.join(RAW, 'tmp');
const OUT = path.join(ROOT, 'public/data/europe1881.json');
const BBOX = [-11, 27, 50, 71];

const NE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/';
const SOURCES = {
  'ne_10m_rivers_lake_centerlines.geojson': NE + 'ne_10m_rivers_lake_centerlines.geojson',
  'ne_10m_rivers_europe.geojson': NE + 'ne_10m_rivers_europe.geojson',
  'ne_10m_lakes.geojson': NE + 'ne_10m_lakes.geojson',
  'ne_10m_geography_regions_polys.geojson': NE + 'ne_10m_geography_regions_polys.geojson',
  'ne_admin1.geojson': 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson',
  'ne_places.geojson': 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_populated_places_simple.geojson',
  'world_1880.geojson': 'https://raw.githubusercontent.com/aourednik/historical-basemaps/master/geojson/world_1880.geojson',
};

const CH_LANG = { 'CH-GE': 'fr', 'CH-VD': 'fr', 'CH-NE': 'fr', 'CH-JU': 'fr', 'CH-FR': 'fr', 'CH-VS': 'fr', 'CH-TI': 'it' };
const MICRO = new Set(['SMR', 'VAT', 'MCO', 'AND', 'LIE']);
const SPLIT_AREA = 22000;   // km2: sopra questa soglia una provincia viene divisa
const SLIVER = 350;         // km2: pezzi più piccoli vengono assorbiti
const MIN_AREA = 2600;      // km2: province più piccole vengono accorpate
const MAX_MERGE = 11000;    // km2: limite dell'accorpamento
const STRAIT_KM = 45;       // distanza massima per uno stretto attraversabile

const log = (...a) => console.log('[map]', ...a);
const EXONYM = { Munich: 'Monaco di Baviera', Cologne: 'Colonia', Nuremberg: 'Norimberga', 'Nürnberg': 'Norimberga', Augsburg: 'Augusta', Hanover: 'Hannover', Brunswick: 'Brunswick',
  Moscow: 'Mosca', 'St. Petersburg': 'San Pietroburgo', Warsaw: 'Varsavia', Prague: 'Praga', Archangel: 'Arcangelo', Vienna: 'Vienna', Belgrade: 'Belgrado', Bucharest: 'Bucarest',
  Kiev: 'Kiev', Kyiv: 'Kiev', Odessa: 'Odessa', Athens: 'Atene', Constantinople: 'Costantinopoli', Istanbul: 'Costantinopoli', Lisbon: 'Lisbona', Seville: 'Siviglia', Saragossa: 'Saragozza',
  Marseille: 'Marsiglia', Lyon: 'Lione', Geneva: 'Ginevra', Zurich: 'Zurigo', Basel: 'Basilea', Strasbourg: 'Strasburgo', Frankfurt: 'Francoforte', Dresden: 'Dresda', Leipzig: 'Lipsia',
  Breslau: 'Breslavia', 'Wrocław': 'Breslavia', Danzig: 'Danzica', 'Gdańsk': 'Danzica', Cracow: 'Cracovia', 'Kraków': 'Cracovia', Lviv: 'Leopoli', Vilnius: 'Vilnius', Riga: 'Riga',
  Algiers: 'Algeri', Tunis: 'Tunisi', Tripoli: 'Tripoli', Cairo: 'Il Cairo', Alexandria: 'Alessandria', Damascus: 'Damasco', Aleppo: 'Aleppo', Baghdad: 'Baghdad', Jerusalem: 'Gerusalemme',
  Izmir: 'Smirne', Bursa: 'Brussa', Edirne: 'Adrianopoli', Thessaloniki: 'Salonicco', Copenhagen: 'Copenaghen', Stockholm: 'Stoccolma', Gothenburg: 'Göteborg', Hamburg: 'Amburgo' };
const exo = (n) => EXONYM[n] || n;
const cleanName = (n) => String(n || '?')
  .replace(/^(Provincia autonoma di|Provincia di|Città metropolitana di|Città Metropolitana di|Libero consorzio comunale di|Città metropolitana|Region of|Regione di|Département de|Département du) /i, '')
  .replace(/^(autonoma di|Regione) /i, '').replace(/^(Kreis|Landkreis) /, '')
  .replace(/^(Voivodato (della|del|di|dei) |Repubblica autonoma (di|della|del) |Repubblica (dei|di|della|del) |Cantone? (dei |di |del |)|Contea di |Distretto di |Oblast' di )/i, '')
  .replace(/^(Della|Delle|Dei|Del) /, '').replace(/^(Dell'|D')/, '').trim()
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
  // HydroBASINS livello 7 (HydroSHEDS, uso libero con attribuzione): Europa/Medio Oriente e Africa
  const hydro = path.join(RAW, 'hydro');
  fs.mkdirSync(hydro, { recursive: true });
  for (const r of ['eu', 'af']) {
    if (fs.existsSync(path.join(hydro, `hybas_${r}_lev07_v1c.shp`))) continue;
    const url = `https://data.hydrosheds.org/file/HydroBASINS/standard/hybas_${r}_lev07_v1c.zip`;
    log('scarico', url);
    const res = await fetch(url);
    if (!res.ok) { log(`HydroBASINS non raggiungibile (${res.status}): uso i fiumi di Natural Earth`); continue; }
    const zip = path.join(hydro, `hybas_${r}_lev07.zip`);
    fs.writeFileSync(zip, Buffer.from(await res.arrayBuffer()));
    execFileSync('unzip', ['-oq', zip, '-d', hydro]);
  }
}

// --- divisione delle province grandi lungo i fiumi ---
// Le province moderne oltre SPLIT_AREA vengono tagliate dai fiumi che le attraversano da parte a parte
// (mapshaper -polygons sulle linee di confine + fiumi). I pezzi troppo piccoli vengono poi riuniti
// togliendo per primi i confini lungo i fiumi minori: restano i grandi fiumi come confini naturali.
const FACE_MIN = 6000;     // km2
const FACE_TARGET = 14000; // km2

function riverIndex(rivers) {
  const CELL = 0.25, grid = new Map();
  for (const f of rivers.features) {
    const rank = f.properties.rank;
    const lines = f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const line of lines) for (const [x, y] of line) {
      const k = `${Math.floor(x / CELL)},${Math.floor(y / CELL)}`;
      if (!grid.has(k)) grid.set(k, []);
      grid.get(k).push([x, y, rank, f.properties.name]);
    }
  }
  // fiume più vicino a un punto (entro ~4 km): [rango, nome] oppure null
  return (x, y) => {
    let best = null, bd = 0.04 * 0.04;
    const gx = Math.floor(x / CELL), gy = Math.floor(y / CELL);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const p of grid.get(`${gx + dx},${gy + dy}`) || []) {
      const d = (p[0] - x) ** 2 + ((p[1] - y) * 1) ** 2;
      if (d < bd) { bd = d; best = p; }
    }
    return best ? [best[2], best[3]] : null;
  };
}

function splitByRivers(fc, places) {
  const big = [], keep = [];
  for (const f of fc.features) {
    const a = km2(f);
    const c = turf.centroid(f).geometry.coordinates;
    const desert = c[1] < 31.5 && c[0] > -12;
    (a > SPLIT_AREA && !desert ? big : keep).push(f);
  }
  fs.writeFileSync(path.join(TMP, 'big.geojson'), JSON.stringify(turf.featureCollection(big)));
  ms('-i', path.join(TMP, 'big.geojson'), path.join(TMP, 'rivers.geojson'), path.join(TMP, 'phys.geojson'), 'combine-files',
    '-filter', "cls == 'Range/mtn'", 'target=phys', '-lines', 'target=phys', '-clip', 'target=phys', 'big',
    '-lines', 'target=big', '+', 'name=outline', '-clip', 'target=rivers', 'big', '-merge-layers', 'target=outline,rivers,phys', 'force', 'name=cut',
    '-polygons', 'gap-tolerance=0.02', '-o', 'format=topojson', path.join(TMP, 'faces.topo.json'));
  const topo = readJSON(path.join(TMP, 'faces.topo.json'));
  const geoms = topo.objects[Object.keys(topo.objects)[0]].geometries.filter((g) => g.type && g.arcs?.length);
  const faces = geoms.map((g) => topojson.feature(topo, g));
  const nearRiver = riverIndex(readJSON(path.join(TMP, 'rivers.geojson')));
  const bboxes = big.map((f) => turf.bbox(f));
  // a quale provincia appartiene ogni faccia
  const owner = faces.map((f) => {
    const pt = turf.pointOnFeature(f).geometry.coordinates;
    for (let i = 0; i < big.length; i++) {
      const b = bboxes[i];
      if (pt[0] < b[0] || pt[0] > b[2] || pt[1] < b[1] || pt[1] > b[3]) continue;
      if (turf.booleanPointInPolygon(pt, big[i])) return i;
    }
    return -1;
  });
  const area = faces.map(km2);
  // archi condivisi fra facce: lunghezza e fiume che li segue
  const tf = topo.transform;
  const arcs = topo.arcs.map((arc) => { let x = 0, y = 0; return arc.map(([dx, dy]) => { x += dx; y += dy; return tf ? [x * tf.scale[0] + tf.translate[0], y * tf.scale[1] + tf.translate[1]] : [dx, dy]; }); });
  const arcFaces = arcs.map(() => []);
  geoms.forEach((g, k) => { const rec = (a) => (typeof a === 'number' ? arcFaces[a < 0 ? ~a : a].push(k) : a.forEach(rec)); rec(g.arcs); });
  const border = new Map(); // "i,j" -> {len, weight}
  arcFaces.forEach((fs2, ai) => {
    if (fs2.length !== 2 || owner[fs2[0]] !== owner[fs2[1]] || owner[fs2[0]] < 0) return;
    const [i, j] = fs2[0] < fs2[1] ? fs2 : [fs2[1], fs2[0]];
    const a = arcs[ai];
    const len = a.length > 1 ? turf.length(turf.lineString(a)) : 0;
    const mid = a[Math.floor(a.length / 2)];
    const r = nearRiver(mid[0], mid[1]);
    // peso del confine: i grandi fiumi (rango basso) valgono molto, i ruscelli quasi nulla
    const keepW = r ? (r[0] <= 5 ? 6 : r[0] <= 7 ? 3 : r[0] <= 10 ? 1.5 : 1) : 1;
    const e = border.get(`${i},${j}`) || { len: 0, keep: 0 };
    e.len += len; e.keep += len * keepW;
    border.set(`${i},${j}`, e);
  });
  // unione: ogni provincia arriva a pezzi >= FACE_MIN e circa area/FACE_TARGET pezzi
  const parent = faces.map((_, i) => i);
  const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const gArea = [...area];
  const nb = new Map();
  for (const [k, e] of border) { const [i, j] = k.split(',').map(Number); (nb.get(i) || nb.set(i, []).get(i)).push([j, e]); (nb.get(j) || nb.set(j, []).get(j)).push([i, e]); }
  for (let pi = 0; pi < big.length; pi++) {
    const members = faces.map((_, i) => i).filter((i) => owner[i] === pi);
    const total = members.reduce((s2, i) => s2 + area[i], 0);
    const want = Math.max(1, Math.round(total / FACE_TARGET));
    for (;;) {
      const roots = [...new Set(members.map(find))];
      roots.sort((a, b) => gArea[a] - gArea[b]);
      const small = roots[0];
      if (roots.length <= 1 || (gArea[small] >= FACE_MIN && roots.length <= want)) break;
      // vicini del gruppo più piccolo: preferisci togliere confini "deboli" e non creare pezzi enormi
      const cand = new Map();
      for (const i of members) if (find(i) === small) for (const [j, e] of nb.get(i) || []) {
        const r = find(j); if (r === small) continue;
        const c = cand.get(r) || { len: 0, keep: 0 }; c.len += e.len; c.keep += e.keep; cand.set(r, c);
      }
      if (!cand.size) { // isola interna: si unisce al pezzo più grande della provincia
        const target = roots[roots.length - 1]; if (target === small) break;
        parent[small] = target; gArea[target] += gArea[small]; continue;
      }
      const best = [...cand.entries()].map(([r, c]) => ({ r, score: c.len / (c.keep / c.len) / (1 + Math.max(0, gArea[r] + gArea[small] - FACE_TARGET * 1.8) / FACE_TARGET) }))
        .sort((a, b) => b.score - a.score)[0].r;
      parent[small] = best; gArea[best] += gArea[small];
    }
  }
  const out = [...keep];
  let made = 0;
  for (let pi = 0; pi < big.length; pi++) {
    const members = faces.map((_, i) => i).filter((i) => owner[i] === pi);
    const groups = new Map();
    for (const i of members) { const r = find(i); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(i); }
    if (groups.size <= 1) { out.push(big[pi]); continue; }
    const base = big[pi].properties;
    const pc = turf.centroid(big[pi]).geometry.coordinates;
    let k = 0;
    const pieces = fillGaps(big[pi], [...groups.values()].map((ids) => turf.feature(topojson.merge(topo, ids.map((i) => geoms[i])), {})));
    for (const f of pieces) {
      // nome: la città più popolosa del pezzo, altrimenti la direzione
      let town = null, tp = -1;
      const bb = turf.bbox(f);
      for (const pl of places) {
        const [x, y] = pl.geometry.coordinates;
        if (x < bb[0] || x > bb[2] || y < bb[1] || y > bb[3]) continue;
        const pop = pl.properties.pop_max || 0;
        if (pop > tp && turf.booleanPointInPolygon([x, y], f)) { tp = pop; town = pl.properties.name; }
      }
      const c = turf.centroid(f).geometry.coordinates;
      const dir = Math.abs(c[1] - pc[1]) > Math.abs(c[0] - pc[0]) * Math.cos((pc[1] * Math.PI) / 180) ? (c[1] > pc[1] ? 'nord' : 'sud') : (c[0] > pc[0] ? 'est' : 'ovest');
      f.properties = { ...base, pid: `${base.pid}~${++k}`, pname: town && tp > 15000 ? exo(town) : `${base.pname} (${dir})` };
      out.push(f); made++;
    }
  }
  log(`${big.length} province grandi tagliate lungo i fiumi in ${made} parti`);
  // seconda passata sui pezzi ancora troppo grandi
  const rivers = readJSON(path.join(TMP, 'rivers.geojson'));
  const final = [];
  let basins = 0;
  for (const f of out) {
    const a = km2(f);
    const c = turf.centroid(f).geometry.coordinates;
    if (a <= 24000 || (c[1] < 31.5 && c[0] > -12) || c[1] > 61) { final.push(f); continue; }
    const parts = basinSplit(f, rivers, places);
    if (parts.length <= 1) { final.push(f); continue; }
    basins++;
    const pc = c;
    parts.forEach((g, k) => {
      let town = null, tp = -1;
      const bb = turf.bbox(g);
      for (const pl of places) {
        const [x, y] = pl.geometry.coordinates;
        if (x < bb[0] || x > bb[2] || y < bb[1] || y > bb[3]) continue;
        const pop = pl.properties.pop_max || 0;
        if (pop > tp && turf.booleanPointInPolygon([x, y], g)) { tp = pop; town = pl.properties.name; }
      }
      const gc = turf.centroid(g).geometry.coordinates;
      const dir = Math.abs(gc[1] - pc[1]) > Math.abs(gc[0] - pc[0]) * Math.cos((pc[1] * Math.PI) / 180) ? (gc[1] > pc[1] ? 'nord' : 'sud') : (gc[0] > pc[0] ? 'est' : 'ovest');
      const baseName = String(f.properties.pname).replace(/ \((nord|sud|est|ovest)\)$/, '');
      g.properties = { ...f.properties, pid: `${f.properties.pid}b${k + 1}`, pname: town && tp > 15000 ? exo(town) : `${baseName} (${dir})` };
      final.push(g);
    });
  }
  log(`${basins} pezzi ancora grandi divisi per bacini fluviali (${gapFailures} riparazioni di copertura non riuscite)`);
  return turf.featureCollection(final);
}


// Copertura completa: ciò che di una provincia non è finito in nessun pezzo va al pezzo più vicino.
function fillGaps(original, parts) {
  if (parts.length < 2) return parts;
  try { return fillGapsUnsafe(original, parts); }
  catch (e) { gapFailures++; return parts; }
}
let gapFailures = 0;
function fillGapsUnsafe(original, parts) {
  let covered = parts[0];
  for (const p of parts.slice(1)) covered = turf.union(turf.featureCollection([covered, p])) || covered;
  const rest = turf.difference(turf.featureCollection([original, covered]));
  if (!rest) return parts;
  const polys = rest.geometry.type === 'Polygon' ? [rest.geometry.coordinates] : rest.geometry.coordinates;
  const cents = parts.map((p) => turf.centroid(p).geometry.coordinates);
  for (const poly of polys) {
    const piece = turf.polygon(poly);
    if (turf.area(piece) < 1e5) continue; // < 0,1 km2: rumore numerico
    const c = turf.centroid(piece).geometry.coordinates;
    // pezzo che tocca (o è più vicino a) questo avanzo
    let best = 0, bd = Infinity;
    parts.forEach((p, i) => { const d = turf.booleanIntersects(piece, p) ? -1 : (cents[i][0] - c[0]) ** 2 + (cents[i][1] - c[1]) ** 2; if (d < bd) { bd = d; best = i; } });
    const merged = turf.union(turf.featureCollection([parts[best], piece]));
    if (merged) { merged.properties = parts[best].properties; parts[best] = merged; }
  }
  return parts;
}

// --- seconda passata: province ancora troppo grandi divise per bacini fluviali ---
// Ogni punto di una griglia di ~5 km viene assegnato al fiume più vicino; i bacini adiacenti
// vengono riuniti fino alla dimensione voluta. I confini che ne risultano corrono sugli spartiacque.
function basinSplit(f, rivers, places) {
  const a = km2(f);
  const want = Math.max(2, Math.round(a / FACE_TARGET));
  const bb = turf.bbox(f);
  const lat0 = (bb[1] + bb[3]) / 2;
  const dy = 0.05, dx = 0.05 / Math.cos((lat0 * Math.PI) / 180);
  // indice dei vertici dei fiumi che toccano la provincia (con margine)
  const CELL = 0.3, grid = new Map();
  rivers.features.forEach((rf, ri) => {
    const lines = rf.geometry.type === 'LineString' ? [rf.geometry.coordinates] : rf.geometry.coordinates;
    for (const line of lines) for (const [x, y] of line) {
      if (x < bb[0] - 1 || x > bb[2] + 1 || y < bb[1] - 1 || y > bb[3] + 1) continue;
      const k = `${Math.floor(x / CELL)},${Math.floor(y / CELL)}`;
      if (!grid.has(k)) grid.set(k, []);
      grid.get(k).push([x, y, ri]);
    }
  });
  const label = (x, y) => {
    let best = -1, bd = Infinity;
    const gx = Math.floor(x / CELL), gy = Math.floor(y / CELL);
    for (let r = 1; r <= 4 && best < 0; r++)
      for (let ix = -r; ix <= r; ix++) for (let iy = -r; iy <= r; iy++) for (const p of grid.get(`${gx + ix},${gy + iy}`) || []) {
        const d = ((p[0] - x) * Math.cos((y * Math.PI) / 180)) ** 2 + (p[1] - y) ** 2;
        if (d < bd) { bd = d; best = p[2]; }
      }
    return best;
  };
  const cells = [];
  const idx = new Map();
  for (let x = bb[0]; x < bb[2]; x += dx) for (let y = bb[1]; y < bb[3]; y += dy) {
    const c = [x + dx / 2, y + dy / 2];
    const inside = [c, [x, y], [x + dx, y], [x, y + dy], [x + dx, y + dy]].some((q) => turf.booleanPointInPolygon(q, f));
    if (!inside) continue;
    const i = cells.length;
    cells.push({ x, y, lab: label(c[0], c[1]) });
    idx.set(`${Math.round((x - bb[0]) / dx)},${Math.round((y - bb[1]) / dy)}`, i);
  }
  if (cells.length < want * 10) return [f];
  const cellArea = a / cells.length;
  // bacini = componenti connesse di celle con la stessa etichetta
  const comp = new Int32Array(cells.length).fill(-1);
  const comps = [];
  const nbOf = (i) => { const c = cells[i]; const cx = Math.round((c.x - bb[0]) / dx), cy = Math.round((c.y - bb[1]) / dy); return [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([ox, oy]) => idx.get(`${cx + ox},${cy + oy}`)).filter((j) => j !== undefined); };
  for (let i = 0; i < cells.length; i++) {
    if (comp[i] >= 0) continue;
    const id = comps.length, st = [i]; comp[i] = id; let n = 0;
    while (st.length) { const u = st.pop(); n++; for (const v of nbOf(u)) if (comp[v] < 0 && cells[v].lab === cells[i].lab) { comp[v] = id; st.push(v); } }
    comps.push(n);
  }
  // contatti fra bacini
  const contact = new Map();
  for (let i = 0; i < cells.length; i++) for (const j of nbOf(i)) if (comp[i] < comp[j]) { const k = `${comp[i]},${comp[j]}`; contact.set(k, (contact.get(k) || 0) + 1); }
  const parent = comps.map((_, i) => i);
  const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const size = [...comps];
  for (;;) {
    const roots = [...new Set(comps.map((_, i) => find(i)))].sort((x, y) => size[x] - size[y]);
    const small = roots[0];
    if (roots.length <= want && size[small] * cellArea >= FACE_MIN) break;
    if (roots.length <= 1) break;
    const cand = new Map();
    for (const [k, n] of contact) { const [p, q] = k.split(',').map(Number); const rp = find(p), rq = find(q); if (rp === rq) continue; if (rp === small) cand.set(rq, (cand.get(rq) || 0) + n); else if (rq === small) cand.set(rp, (cand.get(rp) || 0) + n); }
    if (!cand.size) { // isola o enclave: va col bacino più vicino
      const cen = (r) => { let x = 0, y = 0, n = 0; for (let i = 0; i < cells.length; i++) if (find(comp[i]) === r) { x += cells[i].x; y += cells[i].y; n++; } return [x / n, y / n]; };
      const cs = cen(small);
      const other = roots.filter((r) => r !== small).map((r) => { const c = cen(r); return [r, (c[0] - cs[0]) ** 2 + (c[1] - cs[1]) ** 2]; }).sort((x, y) => x[1] - y[1])[0][0];
      parent[small] = other; size[other] += size[small]; continue;
    }
    const target = [...cand.entries()].sort((x, y) => y[1] / (1 + size[y[0]] / 400) - x[1] / (1 + size[x[0]] / 400))[0][0];
    parent[small] = target; size[target] += size[small];
  }
  const squares = cells.map((c, i) => turf.polygon([[[c.x, c.y], [c.x + dx, c.y], [c.x + dx, c.y + dy], [c.x, c.y + dy], [c.x, c.y]]], { grp: find(comp[i]) }));
  const tmpIn = path.join(TMP, 'basin_cells.geojson'), tmpClip = path.join(TMP, 'basin_clip.geojson'), tmpOut = path.join(TMP, 'basin_out.geojson');
  fs.writeFileSync(tmpIn, JSON.stringify(turf.featureCollection(squares)));
  fs.writeFileSync(tmpClip, JSON.stringify(turf.featureCollection([f])));
  ms(tmpIn, '-dissolve', 'grp', '-simplify', 'interval=4000', '-clip', tmpClip, '-o', tmpOut);
  const parts = readJSON(tmpOut).features.filter((g) => g.geometry).map((g) => { g.properties = { ...f.properties }; return g; });
  return fillGaps(f, parts);
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
  ms(path.join(RAW, 'ne_admin1.geojson'), '-clip', `bbox=${BBOX}`, '-each', 'pid=adm1_code, iso=iso_3166_2, pname=name_it || name_en || name, modern=adm0_a3, reg=region',
    '-filter-fields', 'pid,iso,pname,modern,reg', '-simplify', 'interval=800', 'keep-shapes', '-o', path.join(TMP, 'prov.geojson'));
  ms(path.join(RAW, 'world_1880.geojson'), '-clip', `bbox=${BBOX}`, '-each', 'hist=NAME', '-filter-fields', 'hist', '-o', path.join(TMP, 'hist.geojson'));

  // fiumi: grandi fiumi di Natural Earth + rete europea dettagliata
  ms('-i', path.join(RAW, 'ne_10m_rivers_lake_centerlines.geojson'), path.join(RAW, 'ne_10m_rivers_europe.geojson'), 'combine-files', '-merge-layers', 'force', 'name=rivers',
    '-filter', "scalerank <= 12 && featurecla != 'Lake Centerline (Intermittent)'", '-each', 'rank=scalerank, name=name_it || name_en || name', '-filter-fields', 'name,rank',
    '-clip', `bbox=${BBOX}`, '-o', path.join(TMP, 'rivers.geojson'));
  ms(path.join(RAW, 'ne_10m_geography_regions_polys.geojson'), '-filter', "['Range/mtn','Plateau','Desert','Wetlands','Foothills'].includes(FEATURECLA)",
    '-each', 'cls=FEATURECLA, name=NAME', '-filter-fields', 'cls,name', '-clip', `bbox=${BBOX}`, '-o', path.join(TMP, 'phys.geojson'));
  ms(path.join(TMP, 'phys.geojson'), '-filter', "cls == 'Range/mtn' || cls == 'Plateau'", '-simplify', 'interval=4000', 'keep-shapes', '-o', path.join(TMP, 'phys_draw.geojson'));
  ms(path.join(TMP, 'rivers.geojson'), '-filter', 'rank <= 10', '-simplify', 'interval=2500', '-o', path.join(TMP, 'rivers_draw.geojson'));
  ms(path.join(RAW, 'ne_10m_lakes.geojson'), '-clip', `bbox=${BBOX}`, '-filter', 'scalerank <= 7', '-each', 'name=name_it || name_en || name', '-filter-fields', 'name',
    '-simplify', 'interval=2000', 'keep-shapes', '-o', path.join(TMP, 'lakes.geojson'));
  const placesAll0 = readJSON(path.join(RAW, 'ne_places.geojson')).features;
  // province grandi: spartiacque di HydroBASINS se disponibile, altrimenti fiumi di Natural Earth
  const hydroOk = fs.existsSync(path.join(RAW, 'hydro', 'hybas_eu_lev07_v1c.shp'));
  const prov = hydroOk
    ? splitByBasins(readJSON(path.join(TMP, 'prov.geojson')), { ms, TMP, basinsPath: prepareBasins({ ms, RAW, TMP, BBOX }), places: placesAll0, splitArea: SPLIT_AREA, target: FACE_TARGET, minPiece: FACE_MIN, exo, log })
    : splitByRivers(readJSON(path.join(TMP, 'prov.geojson')), placesAll0);
  // orientamento degli anelli coerente (i pezzi nati da unioni/differenze di turf possono averlo invertito)
  for (const f of prov.features) turf.rewind(f, { mutate: true });
  fs.writeFileSync(path.join(TMP, 'prov_split_raw.geojson'), JSON.stringify(prov));
  ms(path.join(TMP, 'prov_split_raw.geojson'), '-clean', '-o', path.join(TMP, 'prov_split.geojson'));

  // 2. sovrapposizione con i confini 1880
  log('sovrapposizione con i confini 1880');
  fs.writeFileSync(path.join(TMP, 'fix.geojson'), JSON.stringify(turf.featureCollection(CORRECTION_POLYGONS.map((c) => turf.polygon([c.ring], { fix: c.to })))));
  ms('-i', path.join(TMP, 'prov_split.geojson'), path.join(TMP, 'hist.geojson'), path.join(TMP, 'fix.geojson'), 'combine-files', 'snap', 'snap-interval=0.0005', '-union', 'target=prov_split,hist,fix',
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
    return { i, fix: pr.fix, pid: pr.pid, iso: pr.iso, reg: pr.reg, name: cleanName(pr.pname), modern: pr.modern, owner, area: km2(f), feat: f };
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
  // Schegge di confine: il dataset 1880 e le province moderne non combaciano mai al metro.
  // Un pezzo piccolo di una provincia moderna prende il proprietario prevalente di quella provincia.
  const byPid = new Map();
  for (const p of P) { const base = String(p.pid).split('~')[0]; p.base = base; const m = byPid.get(base) || { tot: 0, own: {} }; m.tot += p.area; if (p.owner) m.own[p.owner] = (m.own[p.owner] || 0) + p.area; byPid.set(base, m); }
  let slivers = 0;
  for (const p of P) {
    if (p.fix) continue;
    const m = byPid.get(p.base);
    const top = Object.entries(m.own).sort((a, b) => b[1] - a[1])[0];
    if (!top || top[0] === p.owner) continue;
    const share = (m.own[p.owner] || 0) / m.tot;
    if (!p.owner || (share < 0.2 && p.area < 2500)) { p.owner = top[0]; slivers++; }
  }
  log(`${slivers} schegge di confine riassegnate al proprietario prevalente`);
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
  // accorpamento delle province piccole: solo con vicini dello stesso stato storico E della stessa
  // regione culturale (regione amministrativa moderna; in Svizzera la lingua), così una futura cessione
  // segue linee credibili (il Ticino resta italiano di lingua, la Romandia francese).
  const mkey = (p) => (p.modern === 'CHE' ? `CHE|${CH_LANG[p.iso] || 'de'}` : `${p.modern}|${p.reg || ''}`);
  for (const [limit, sameKey] of [[MIN_AREA, true], [900, false]]) {
    let changed = true;
    while (changed) {
      changed = false;
      const roots = [...new Set(P.map((p) => find(p.i)))].sort((a, b) => gArea[a] - gArea[b]);
      for (const g of roots) {
        if (find(g) !== g || gArea[g] >= limit) continue;
        const owner = P[g].owner;
        const cap = gArea[g] < 1500 ? Infinity : MAX_MERGE; // le province minuscole si uniscono comunque
        const cands = groupNbrs(g).filter((h) => P[h].owner === owner && gArea[h] + gArea[g] <= cap && (sameKey ? mkey(P[h]) === mkey(P[g]) : P[h].modern === P[g].modern))
          .sort((a, b) => gArea[a] - gArea[b]);
        if (cands.length) { join(cands[0], g); changed = true; }
      }
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
    if (got !== want) { bad++; log(`CONTROLLO FALLITO: ${label} è ${got}, atteso ${want}`, hit ? JSON.stringify({ pid: hit.pid, modern: hit.modern, name: hit.name, area: Math.round(hit.area), own: hit.owner }) : ''); }
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

  // terreno dai poligoni di Natural Earth (catene montuose, altopiani, deserti, paludi)
  const physAll = readJSON(path.join(TMP, 'phys.geojson')).features;
  const physBB = physAll.map((f) => turf.bbox(f));
  for (const p of provinces) {
    const bb = p.bb || (p.bb = turf.bbox(p.f));
    const hits = physAll.map((f, i) => ({ f, i })).filter(({ i }) => !(physBB[i][2] < bb[0] || physBB[i][0] > bb[2] || physBB[i][3] < bb[1] || physBB[i][1] > bb[3]));
    const cnt = { mtn: 0, plat: 0, des: 0, wet: 0, n: 0 };
    const N = 7;
    for (let ix = 0; ix < N; ix++) for (let iy = 0; iy < N; iy++) {
      const pt = [bb[0] + ((ix + 0.5) / N) * (bb[2] - bb[0]), bb[1] + ((iy + 0.5) / N) * (bb[3] - bb[1])];
      if (!turf.booleanPointInPolygon(pt, p.f)) continue;
      cnt.n++;
      const cls = new Set(hits.filter(({ f }) => turf.booleanPointInPolygon(pt, f)).map(({ f }) => f.properties.cls));
      if (cls.has('Range/mtn')) cnt.mtn++; else if (cls.has('Plateau') || cls.has('Foothills')) cnt.plat++;
      if (cls.has('Desert')) cnt.des++;
      if (cls.has('Wetlands')) cnt.wet++;
    }
    const n = Math.max(1, cnt.n), [lon, lat] = p.pt;
    p.terrain = cnt.mtn / n >= 0.45 ? 'mountain'
      : cnt.des / n >= 0.5 || (lat < 31.5 && lon > -12) ? 'desert'
      : cnt.wet / n >= 0.3 ? 'marsh'
      : cnt.mtn / n >= 0.15 || cnt.plat / n >= 0.5 ? 'hills'
      : lat > 58 && (p.info.owner === 'RUS' || p.info.owner === 'SWE') ? 'forest'
      : terrainOf(lon, lat, p.info.owner); // ripiego: elenco di punti di montagna/collina
  }

  // confini lungo i fiumi: chi attacca attraverso un fiume è svantaggiato
  const riversGeo = readJSON(path.join(TMP, 'rivers.geojson'));
  riversGeo.features = riversGeo.features.filter((f) => f.properties.rank <= 10);
  const nearRiver = riverIndex(riversGeo);
  const edgeLen = new Map(), edgeRiver = new Map();
  arcUse.forEach((u, ai) => {
    if (u.length !== 2) return;
    const [a, b] = u[0] < u[1] ? u : [u[1], u[0]];
    const arc = arcs[ai];
    const key = `${a},${b}`;
    for (let i = 1; i < arc.length; i++) {
      const seg = Math.hypot((arc[i][0] - arc[i - 1][0]) * Math.cos((arc[i][1] * Math.PI) / 180), arc[i][1] - arc[i - 1][1]);
      edgeLen.set(key, (edgeLen.get(key) || 0) + seg);
      const r = nearRiver((arc[i][0] + arc[i - 1][0]) / 2, (arc[i][1] + arc[i - 1][1]) / 2);
      if (r) { const m = edgeRiver.get(key) || {}; m[r[1] || '?'] = (m[r[1] || '?'] || 0) + seg; edgeRiver.set(key, m); }
    }
  });
  const riverEdges = [];
  for (const [key, m] of edgeRiver) {
    const [name, len] = Object.entries(m).sort((x, y) => y[1] - x[1])[0];
    if (len / edgeLen.get(key) >= 0.4 && name !== '?' && name !== 'null') { const [a, b] = key.split(',').map(Number); riverEdges.push([a, b, name]); }
  }
  log(`${riverEdges.length} confini lungo fiumi`);

  // livello fisico per la mappa: rilievi, fiumi, laghi (proiettati e semplificati)
  const flatProj = (coords) => { const flat = []; let px = 0, py = 0; for (const c of coords) { const [x, y] = laea(c); const ix = Math.round(x), iy = Math.round(-y); flat.push(ix - px, iy - py); px = ix; py = iy; } return flat; };
  const ringsOf = (g) => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates).flatMap((poly) => poly.map(flatProj));
  const physOut = {
    version: 1,
    note: 'Natural Earth (dominio pubblico). Coordinate LAEA in km, y verso il basso, delta-codificate.',
    relief: readJSON(path.join(TMP, 'phys_draw.geojson')).features.map((f) => ({ name: f.properties.name, cls: f.properties.cls, rings: ringsOf(f.geometry) })),
    rivers: readJSON(path.join(TMP, 'rivers_draw.geojson')).features.flatMap((f) => (f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.coordinates).map((line) => ({ name: f.properties.name, rank: f.properties.rank, pts: flatProj(line) }))),
    lakes: readJSON(path.join(TMP, 'lakes.geojson')).features.map((f) => ({ name: f.properties.name, rings: ringsOf(f.geometry) })),
  };
  fs.writeFileSync(OUT.replace('europe1881.json', 'physical1881.json'), JSON.stringify(physOut));

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
      terrain: p.terrain,
      coast: p.coast,
      lonlat: p.pt.map((v) => Math.round(v * 1000) / 1000),
      c: laea(p.pt).map((v) => Math.round(v)),
      arcs: fgeoms[p.k].arcs,
      n: fnbr[p.k],
    })),
    straits: strList,
    rivers: riverEdges,
  };
  // nomi d'epoca al posto dei nomi moderni
  const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const p of out.provinces) for (const [from, to, owner] of RENAMES) {
    if (owner && p.owner !== owner) continue;
    p.name = p.name.replace(new RegExp(`(^|[\\s(])${esc(from)}(?=$|[\\s)])`, 'u'), `$1${to}`);
  }
  // nomi duplicati
  const seen = new Map();
  for (const p of out.provinces) { const n = seen.get(p.name) || 0; seen.set(p.name, n + 1); }
  const cnt = new Map();
  // nomi uguali: prima la nazione (Lussemburgo belga), poi la posizione rispetto agli omonimi, solo infine un numero
  const ADJ = { BEL: 'belga', LUX: '', GER: 'tedesca', DEN: 'danese', FRA: 'francese', AUH: 'austriaca', RUS: 'russa', TUR: 'ottomana', ITA: 'italiana', SWE: 'svedese', ROM: 'romena', SER: 'serba', BUL: 'bulgara', ARA: 'araba', PER: 'persiana', MOR: 'marocchina', NED: 'olandese', GBR: 'britannica', GRE: 'greca', SPA: 'spagnola', POR: 'portoghese', SWI: 'svizzera', EGY: 'egiziana', TUN: 'tunisina', MNE: 'montenegrina' };
  const groupsByName = new Map();
  for (const p of out.provinces) { if (seen.get(p.name) > 1) { if (!groupsByName.has(p.name)) groupsByName.set(p.name, []); groupsByName.get(p.name).push(p); } }
  for (const [name, list] of groupsByName) {
    const owners = new Set(list.map((p) => p.owner));
    if (owners.size === list.length) { for (const p of list) if (ADJ[p.owner]) p.name = `${name} ${ADJ[p.owner]}`; continue; }
    const cx = list.reduce((s2, p) => s2 + p.lonlat[0], 0) / list.length, cy = list.reduce((s2, p) => s2 + p.lonlat[1], 0) / list.length;
    const base = name.replace(/ \((nord|sud|est|ovest|centro)\)$/, '');
    for (const p of list) {
      const dx = (p.lonlat[0] - cx) * Math.cos((cy * Math.PI) / 180), dy = p.lonlat[1] - cy;
      const dir = Math.hypot(dx, dy) < 0.15 ? 'centro' : Math.abs(dy) > Math.abs(dx) ? (dy > 0 ? 'nord' : 'sud') : dx > 0 ? 'est' : 'ovest';
      p.name = `${base} (${dir})`;
    }
  }
  const seen2 = new Map();
  for (const p of out.provinces) seen2.set(p.name, (seen2.get(p.name) || 0) + 1);
  for (const p of out.provinces) if (seen2.get(p.name) > 1) { const n = (cnt.get(p.name) || 0) + 1; cnt.set(p.name, n); p.name = `${p.name} ${['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][n - 1] || n}`; }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out));
  const owners = {};
  for (const p of out.provinces) owners[p.owner] = (owners[p.owner] || 0) + 1;
  log(`scritto ${OUT}: ${out.provinces.length} province, ${strList.length} stretti, ${(fs.statSync(OUT).size / 1024).toFixed(0)} KB`);
  log('province per nazione', JSON.stringify(owners));
}

main().catch((e) => { console.error(e); process.exit(1); });
