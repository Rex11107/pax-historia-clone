#!/usr/bin/env node
// Genera la mappa di gioco (province, proprietari 1881, adiacenze, coste, stretti)
// a partire da dataset open source. Ripetibile: `npm run map`.
//
// Fonti:
//  - Natural Earth 10m admin-1 (dominio pubblico) -> geometria delle province
//  - Natural Earth 10m populated places (dominio pubblico) -> peso demografico
//  - aourednik/historical-basemaps world_1880 (GPL-3.0) -> confini politici 1880
//  - HydroBASINS v1c (HydroSHEDS, Lehner & Grill 2013; uso libero con attribuzione) -> spartiacque
//  - HistoGIS (ACDH-CH, CC BY 4.0) -> distretti prussiani, bavaresi, badensi, cisleitani; Kronländer (scripts/map/historical.mjs)
//  - RISTAT, Kessler & Markevich (CC0) -> uezd e governatorati russi del 1897
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
import { buildHistoricalBase } from './historical.mjs';
import { OASES, CARAVAN_ROUTES } from './map-config.mjs';
import { HIST_TO_TAG, OVERRIDES, NATION_POP_1881, MOUNTAINS, HILLS, CHECKS, CORRECTION_POLYGONS, RENAMES, PROTECTED, POLISH_AREAS, ANACHRONISTIC } from './map-config.mjs';
import { regionOf } from './regions.mjs';
import { loadLock } from './lock.mjs';
import { AFRICA_MODERN, atomize, coastDistance, compactClusters, eastOfVar, inZone, prepareBasins8, topoMetrics } from './compact.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const RAW = path.join(ROOT, 'data-raw');
const TMP = path.join(RAW, 'tmp');
const OUT = path.join(ROOT, 'public/data/europe1881.json');
const LOCK_FILE = path.join(ROOT, 'scripts/map/lock/europe1881-v0.1.20.json');
// nazioni approvate dall'utente: riprendono la divisione della mappa di riferimento
const LOCK_OWNERS = new Set(['ITA', 'SMR', 'SWI', 'MCO', 'LIE', 'FRA', 'AUH', 'GER', 'DEN', 'NED', 'LUX', 'GBR', 'SPA', 'AND', 'SER', 'MNE', 'BUL', 'ROM', 'POR']);
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
const RU_MIN = 7000;        // km2: soglia di accorpamento degli uezd russi
const RU_MAX = 14000;       // km2: limite del loro accorpamento
const IT_COMP = { 'IT-RI': 'Umbria', 'IT-AO': 'Piemonte', 'IT-UD': 'Veneto', 'IT-PN': 'Veneto' };
const IT_REG = { Molise: 'Abruzzo', "Valle d'Aosta": 'Piemonte' };
// nazioni costitutive del Regno Unito (regioni di Natural Earth)
// densità 1881 (ab/km²): Italia ~100, Spagna ~33, Romania ~40, Serbia ~36, Bulgaria ~30, Grecia ~30, Rumelia ottomana ~25
// nei Balcani un po' più fitte di quanto direbbe la densità: è un teatro conteso e serve dettaglio
const SIZE_SCALE = { SPA: 1.7, ROM: 1.2, SER: 1.1, BUL: 1.2, GRE: 1.2, TUR: 1.25, POR: 1.0 };
const FREE_OWNERS = new Set(['SER', 'MNE', 'BUL', 'ROM', 'GRE', 'TUR', 'POR', 'MOR', 'TUN', 'EGY']);
// Nord Africa: dimensione dalla densità delle località (GeoNames) attorno all'atomo; deserto = province enormi
const AFRICA_BASE = { EGY: 0.9, TUN: 1.0, MOR: 1.5, FRA: 1.3, TUR: 1.5 };

const RIVER_MODERN = new Set(['SRB', 'MNE', 'BGR', 'ROU', 'GRC', 'ALB', 'MKD', 'KOS', 'TUR', 'PRT']);
// fiumi che fanno da confine naturale fra province (Balcani e Portogallo); il Danubio è già confine di stato
const CUT_RIVERS = new Set(['Morava', 'Maritsa', 'Evros', 'Olt', 'Haliacmon', 'Struma', 'Mesta', 'Tundža', 'Iskăr', 'Jiu', 'Argeș', 'Siret', 'Drin', 'Aspropotamo', 'Fiume Peneo',
  'Jantra', 'Timok', 'Ialomița', 'Ialomita', 'Vedea', 'Arda', 'Morava occidentale', 'Voiussa', 'Fiume Devoli', 'Kamchiya', 'Ergene', 'Buzău', 'Ogosta', 'Lim', 'Sitnica',
  'Tajo', 'Tagus', 'Duero', 'Guadiana', 'Mondego', 'Zêzere', 'Sado', 'Sorraia']);
// località di GeoNames (CC BY 4.0) con almeno 1.000 abitanti, lette una volta sola
let geoCache = null;
function geoCities() {
  if (geoCache) return geoCache;
  const p = path.join(RAW, 'geonames', 'cities500.json');
  geoCache = fs.existsSync(p) ? readJSON(p).map((c) => ({ name: c.name, lon: Number(c.lon), lat: Number(c.lat), pop: Number(c.pop) })).filter((c) => c.pop >= 1000) : [];
  return geoCache;
}
// canale di Suez dalle linee di Natural Earth
function suezCanal() {
  const p = path.join(TMP, 'rivers.geojson');
  if (!fs.existsSync(p)) return null;
  const lines = readJSON(p).features.filter((f) => f.properties.name === 'Suez Canal').flatMap((f) => (f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.coordinates));
  if (!lines.length) return null;
  // le due bocche fino al mare aperto (Port Tewfik e Porto Said), così il Sinai è davvero staccato
  lines.push([[32.5777, 30.0114], [32.567, 29.93], [32.56, 29.86]], [[32.3139, 31.2727], [32.32, 31.34]]);
  return lines;
}
const riverLines = (features) => features.filter((f) => CUT_RIVERS.has(f.properties.name) || (f.properties.name == null && f.properties.rank <= 7 && (() => { const c = turf.centroid(f).geometry.coordinates; return c[0] > 19 && c[0] < 30 && c[1] < 44.5; })()));
const ES_NATION = { 'Cataluña': 'ca', 'País Vasco': 'eu', 'Foral de Navarra': 'eu', Galicia: 'gl' };
const GB_NATION = { 'Highlands and Islands': 'sco', 'North Eastern': 'sco', Eastern: 'sco', 'South Western': 'sco', 'West Wales and the Valleys': 'cym', 'East Wales': 'cym', 'Northern Ireland': 'ni' };
const ZONE_MIN = 2800;      // km2: province compatte della zona italiana
const ZONE_TARGET = 4500;
const ZONE_MAX = 7500;
// città importanti nel 1881 assenti da Natural Earth (servono a dare il nome alle province)
const EXTRA_PLACES = [['Gorizia', 13.62, 45.94, 21000], ['Knin', 16.2, 44.04, 8000], ['Porto Said', 32.29, 31.25, 17000], ['Ismailia', 32.27, 30.59, 10000]];
const STRAIT_KM = 45;       // distanza massima per uno stretto attraversabile

const log = (...a) => console.log('[map]', ...a);
const EXONYM = { Barcelona: 'Barcellona', Sevilla: 'Siviglia', Zaragoza: 'Saragozza', 'Cádiz': 'Cadice', 'Córdoba': 'Cordova', Valencia: 'Valenza',
  'Palma': 'Palma di Maiorca', Bucharest: 'Bucarest', Sofia: 'Sofia', Athens: 'Atene', Belgrade: 'Belgrado', Thessaloniki: 'Salonicco', London: 'Londra', Edinburgh: 'Edimburgo', Dublin: 'Dublino', Berlin: 'Berlino', 'København': 'Copenaghen', Stuttgart: 'Stoccarda', Mainz: 'Magonza', Regensburg: 'Ratisbona', 'Lübeck': 'Lubecca', Bremen: 'Brema', Magdeburg: 'Magdeburgo',
  'The Hague': "L'Aia", Aachen: 'Aquisgrana', Trier: 'Treviri', Koblenz: 'Coblenza', Freiburg: 'Friburgo in Brisgovia', Mulhouse: 'Mülhausen', Metz: 'Metz', Colmar: 'Colmar',
  Rome: 'Roma', Naples: 'Napoli', Turin: 'Torino', Milan: 'Milano', Venice: 'Venezia', Florence: 'Firenze', Genoa: 'Genova', 'Reggio di Calabria': 'Reggio Calabria',
  Rijeka: 'Fiume', Zadar: 'Zara', Split: 'Spalato', 'Šibenik': 'Sebenico', Dubrovnik: 'Ragusa di Dalmazia', Pula: 'Pola', Ljubljana: 'Lubiana', Zagreb: 'Zagabria', Maribor: 'Marburgo',
  Nice: 'Nizza', Toulon: 'Tolone', 'Aix-en-Provence': 'Aix', Bern: 'Berna', Lausanne: 'Losanna', Luzern: 'Lucerna', 'Saint Gallen': 'San Gallo', Chur: 'Coira', Fribourg: 'Friburgo',
  Valletta: 'La Valletta', Bastia: 'Bastia', Ajaccio: 'Aiaccio', Annecy: 'Annecy', Grenoble: 'Grenoble', 'Zürich': 'Zurigo', Munich: 'Monaco di Baviera', Cologne: 'Colonia', Nuremberg: 'Norimberga', 'Nürnberg': 'Norimberga', Augsburg: 'Augusta', Hanover: 'Hannover', Brunswick: 'Brunswick',
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
    // il Flevoland è terra strappata al mare dopo il 1940: nel 1881 era Zuiderzee
    '-filter', "iso !== 'NL-FL'", '-filter-fields', 'pid,iso,pname,modern,reg', '-simplify', 'interval=800', 'keep-shapes', '-o', path.join(TMP, 'prov.geojson'));
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
  // unità amministrative d'epoca (HistoGIS, RISTAT) al posto di quelle moderne dove disponibili
  const basePath = buildHistoricalBase({ ms, RAW, TMP, BBOX, provPath: path.join(TMP, 'prov.geojson'), places: placesAll0, exo, log }) || path.join(TMP, 'prov.geojson');
  const prov = hydroOk
    ? splitByBasins(readJSON(basePath), { ms, TMP, basinsPath: prepareBasins({ ms, RAW, TMP, BBOX }), places: placesAll0, splitArea: SPLIT_AREA, target: FACE_TARGET, minPiece: FACE_MIN, exo, log })
    : splitByRivers(readJSON(basePath), placesAll0);
  // orientamento degli anelli coerente (i pezzi nati da unioni/differenze di turf possono averlo invertito)
  for (const f of prov.features) turf.rewind(f, { mutate: true });
  fs.writeFileSync(path.join(TMP, 'prov_split_raw.geojson'), JSON.stringify(prov));
  ms(path.join(TMP, 'prov_split_raw.geojson'), '-clean', '-o', path.join(TMP, 'prov_split.geojson'));
  // canale di Suez (aperto nel 1869): una fascia d'acqua separa l'Africa dal Sinai; si attraversa come uno stretto
  const canal = suezCanal();
  if (canal) {
    const cp = path.join(TMP, 'canal.geojson');
    fs.writeFileSync(cp, JSON.stringify(turf.featureCollection([turf.buffer(turf.multiLineString(canal), 1.2, { units: 'kilometers', steps: 4 })])));
    ms(path.join(TMP, 'prov_split.geojson'), '-erase', cp, '-explode', '-o', 'force', path.join(TMP, 'prov_split.geojson'));
    log('canale di Suez tagliato');
  }
  // zona italiana: atomi piccoli (unità amministrative x bacini di livello 8) da raggruppare in province compatte
  const b8 = prepareBasins8({ ms, RAW, TMP });
  if (b8) {
    // riva sinistra del Reno (corso reale da Natural Earth, Sciaffusa -> foce), per tagliare gli atomi lungo il fiume
    const rivFe = readJSON(path.join(TMP, 'rivers.geojson')).features;
    const lineOf = (name, start) => { for (const f of rivFe) { if (f.properties.name !== name) continue; for (const l of f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.coordinates) if (Math.abs(l[0][0] - start[0]) < 0.01 && Math.abs(l[0][1] - start[1]) < 0.01) return l; } return null; };
    const up = lineOf('Rhein', [8.881114, 47.656358]), down = lineOf('Rhine', [8.229991, 48.965399]);
    const cuts = [];
    if (up && down) {
      const line = [...up, ...down.slice(1)];
      const end = line[line.length - 1];
      cuts.push(turf.polygon([[...line, [3.5, end[1]], [3.5, 47.3], [line[0][0], 47.3], line[0]]], { cutSide: 1 }));
    }
    // valle e delta del Nilo: gli atomi si fermano dove finisce la terra coltivata (lì vive quasi tutto l'Egitto)
    const nile = rivFe.filter((f) => ['Nile', 'Nilo', 'Rosetta Branch', 'Damietta Branch'].includes(f.properties.name));
    if (nile.length) {
      let valley = turf.polygon([[[31.25, 30.1], [30.05, 31.35], [31.0, 31.6], [31.9, 31.55], [32.15, 31.2], [31.25, 30.1]]]); // delta
      for (const f of nile) valley = turf.union(turf.featureCollection([valley, turf.buffer(f, 25, { units: 'kilometers', steps: 3 })])) || valley;
      valley = turf.union(turf.featureCollection([valley, turf.circle([30.75, 29.35], 28, { units: 'kilometers', steps: 16 })])) || valley; // Fayyum
      cuts.push({ ...valley, properties: { nile: 1 }, big: true });
    }
    // Nord Africa: fascia costiera di 30 km (le coste del deserto restano transitabili) e cerchi delle oasi
    {
      const nileCut = cuts.find((c) => c.properties.nile);
      const minus = (a, b) => (b ? turf.difference(turf.featureCollection([a, b])) : a);
      const afPath = path.join(TMP, 'africa_land.geojson');
      ms(path.join(TMP, 'prov.geojson'), '-filter', `${JSON.stringify([...AFRICA_MODERN])}.includes(modern)`, '-dissolve', '-simplify', 'interval=3000', 'keep-shapes', '-o', afPath);
      const segs = [];
      const afj = readJSON(afPath);
      for (const g of afj.features ? afj.features.map((f) => f.geometry) : afj.geometries ?? [afj]) for (const poly of g.type === 'Polygon' ? [g.coordinates] : g.coordinates) for (const ring of poly) {
        let cur = [];
        // fuori: il bordo della mappa (27° N, 11° O) e il confine di terra del Sinai con la Palestina
        // e le coste del golfo di Suez e del Mar Rosso, deserte nel 1881
        const keep = ([x, y]) => y > 27.1 && x > -10.95 && !(x > 34.15 && y > 29.45) && !(x > 32.2 && y < 29.9);
        for (const c of ring) { if (keep(c)) cur.push(c); else { if (cur.length > 1) segs.push(cur); cur = []; } }
        if (cur.length > 1) segs.push(cur);
      }
      let all = nileCut || null;
      let band = segs.length ? turf.buffer(turf.multiLineString(segs), 30, { units: 'kilometers', steps: 3 }) : null;
      if (band) {
        band = minus(band, nileCut);
        if (band) cuts.push({ ...band, properties: { band: 1 }, big: true });
        if (band) all = all ? turf.union(turf.featureCollection([all, band])) : band;
      }
      // Libia ottomana: oltre alla costa, l'entroterra che il governo di Tripoli e di Bengasi teneva davvero
      // (Gebel Nefusa e Garian, Tarhuna e Beni Ulid, il Gebel Achdar e il retroterra di Derna e Tobruch):
      // 110 km dal mare, ma non nel fondo della Sirte, deserto fino alla costa
      {
        const lyPath = path.join(TMP, 'libya_land.geojson');
        ms(path.join(TMP, 'prov.geojson'), '-filter', "modern == 'LBY'", '-dissolve', '-simplify', 'interval=3000', 'keep-shapes', '-o', lyPath);
        const lyj = readJSON(lyPath);
        const lyGeom = lyj.features ? lyj.features[0].geometry : lyj.geometries ? lyj.geometries[0] : lyj;
        const ly = turf.feature(lyGeom);
        const lsegs = segs.map((sg) => sg.filter(([x, y]) => x > 9.5 && x < 25.3 && y > 30)).filter((sg) => sg.length > 1);
        let inner = lsegs.length ? turf.buffer(turf.multiLineString(lsegs), 110, { units: 'kilometers', steps: 3 }) : null;
        if (inner) inner = turf.intersect(turf.featureCollection([inner, ly]));
        if (inner) inner = minus(inner, turf.bboxPolygon([16.3, 27, 19.9, 30.85]));
        if (inner) { cuts.push({ ...inner, properties: { inner: 1 }, big: true }); all = all ? turf.union(turf.featureCollection([all, inner])) : inner; }
      }

      for (const o of OASES) {
        let c = turf.circle(o.at, o.r, { units: 'kilometers', steps: 24 });
        c = minus(c, all);
        if (c) cuts.push({ ...c, properties: { oasis: o.name } });
      }
      log(`deserto: fascia costiera e ${OASES.length} oasi`);
    }
    // poligoni lunghi e concavi (valle del Nilo, fascia costiera) a tasselli di 1°: interi confondono l'unione
    // di mapshaper, che ne riempie l'interno (mezzo Sahara diventava "costa")
    for (const big of cuts.filter((c) => c.big)) {
      cuts.splice(cuts.indexOf(big), 1);
      const bb = turf.bbox(big);
      for (let x = Math.floor(bb[0]); x < bb[2]; x++) for (let y = Math.floor(bb[1]); y < bb[3]; y++) {
        const part = turf.intersect(turf.featureCollection([big, turf.bboxPolygon([x, y, x + 1, y + 1])]));
        if (part) cuts.push({ ...part, properties: big.properties });
      }
    }
    let cutPath = null;
    if (cuts.length) { cutPath = path.join(TMP, 'cut.geojson'); fs.writeFileSync(cutPath, JSON.stringify(turf.featureCollection(cuts))); }
    // fiumi maggiori dei Balcani e del Portogallo: diventano confini naturali (fascia di 0,5 km)
    const riverPath = path.join(TMP, 'strips.geojson');
    const strips = riverLines(rivFe).map((f) => turf.buffer(f, 0.25, { units: 'kilometers', steps: 2 })).filter(Boolean).map((f) => ({ ...f, properties: { riv: 1 } }));
    fs.writeFileSync(riverPath, JSON.stringify(turf.featureCollection(strips)));
    const atoms = atomize(readJSON(path.join(TMP, 'prov_split.geojson')), { ms, TMP, basinsPath: b8, log, cutPath, riverPath, riverModern: RIVER_MODERN, modernLayer: readJSON(path.join(TMP, 'prov.geojson')).features });
    fs.writeFileSync(path.join(TMP, 'prov_split.geojson'), JSON.stringify(atoms));
  }

  // 2. sovrapposizione con i confini 1880
  log('sovrapposizione con i confini 1880');
  fs.writeFileSync(path.join(TMP, 'fix.geojson'), JSON.stringify(turf.featureCollection(CORRECTION_POLYGONS.map((c) => turf.polygon([c.ring], { fix: c.to })))));
  const withFix = CORRECTION_POLYGONS.length > 0;
  ms('-i', path.join(TMP, 'prov_split.geojson'), path.join(TMP, 'hist.geojson'), ...(withFix ? [path.join(TMP, 'fix.geojson')] : []), 'combine-files', 'snap', 'snap-interval=0.0005', '-union', withFix ? 'target=prov_split,hist,fix' : 'target=prov_split,hist',
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
  const inBB = ([x, y], b) => x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3];
  const P = feats.map((f, i) => {
    const pr = f.properties;
    let owner = pr.hist ? HIST_TO_TAG[pr.hist] : null;
    if (pr.hist && owner === undefined) throw new Error(`stato storico senza tag: ${pr.hist}`);
    if (pr.fix && owner) owner = pr.fix;
    if (!pr.fix && pr.own) owner = pr.own; // unità d'epoca: il proprietario è certo
    // il poligono dello Schleswig di HistoGIS sconfina su Fionia: Fionia e le isole a est del Piccolo Belt sono danesi
    if (owner === 'GER' && pr.modern === 'DNK') { const [x, y] = turf.centroid(f).geometry.coordinates; if (x > 9.72 && y > 55.12) { owner = 'DEN'; pr.own = 'DEN'; } }
    // microstati e possedimenti minuscoli: proprietario fisso, gruppo proprio
    const base = String(pr.pid).split('~')[0];
    const prot = PROTECTED.find((x) => x.match && ((x.match.modern && x.match.modern === pr.modern) || (x.match.pid && x.match.pid === base) || (x.match.reg && x.match.reg === pr.reg && (!x.match.bbox || inBB(turf.centroid(f).geometry.coordinates, x.match.bbox)))));
    if (prot) owner = prot.owner;
    return { i, lang: pr.lang ?? null, fix: prot?.owner || pr.fix || pr.own || null, prot: prot?.id ?? null, hist: !!pr.own, pid: pr.pid, iso: pr.iso, reg: pr.reg, nreg: pr.nreg ?? pr.reg, name: prot ? prot.name : cleanName(pr.pname), modern: pr.modern, owner, area: km2(f), feat: f };
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
  const join = (a, b) => { a = find(a); b = find(b); if (a === b || P[a].prot !== P[b].prot) return; parent[b] = a; gArea[a] += gArea[b]; };
  const groupNbrs = (g) => { const s = new Set(); P.forEach((p) => { if (find(p.i) === g) nbr[p.i].forEach((j) => s.add(find(j))); }); s.delete(g); return [...s]; };

  // zona italiana: province ricostruite più avanti per compattezza
  for (const p of P) p.zone = inZone(p);
  // stessi pid + stesso proprietario -> stesso gruppo (multi-parte); fuori zona gli atomi tornano interi
  const byKey = new Map();
  for (const p of P) { if (p.zone) continue; const k = `${String(p.pid).replace(/~a\d+/, '')}|${p.owner}`; if (byKey.has(k)) join(byKey.get(k), p.i); else byKey.set(k, p.i); }
  // schegge
  for (const p of P) {
    if (p.zone || gArea[find(p.i)] >= SLIVER) continue;
    const ns = nbr[p.i].map((j) => P[j]).filter((q) => !q.zone);
    const same = ns.filter((q) => q.owner === p.owner).sort((a, b) => b.area - a.area);
    if (same.length) join(same[0].i, p.i);
    // frammenti di confine fra dataset diversi: vanno al vicino più esteso anche se di altro stato
    else if (ns.length && (gArea[find(p.i)] < 120 || (!p.hist && String(p.pid).includes('~h')))) { const q = ns.sort((a, b) => b.area - a.area)[0]; join(q.i, p.i); }
  }
  // accorpamento delle province piccole: solo con vicini dello stesso stato storico E della stessa
  // regione culturale (regione amministrativa moderna; in Svizzera la lingua), così una futura cessione
  // segue linee credibili (il Ticino resta italiano di lingua, la Romandia francese).
  // Italia: compartimenti statistici del 1881 (Rieti in Umbria, Molise con gli Abruzzi, Aosta col Piemonte)
  const itComp = (p) => IT_COMP[p.iso] || IT_REG[p.reg] || p.reg;
  const mkey = (p) => (p.modern === 'CHE' ? `CHE|${CH_LANG[p.iso] || 'de'}` : p.modern === 'ITA' && !String(p.reg || '').startsWith('H:') ? `ITA|${itComp(p)}` : `${p.modern}|${p.reg || ''}`);
  // gli uezd russi sono piccoli: si accorpano dentro il governatorato fino a dimensioni da provincia di gioco
  const minOf = (g, base) => (P[g].owner === 'RUS' && String(P[g].reg || '').startsWith('H:') ? Math.max(base, RU_MIN) : base);
  for (const [limit0, sameKey] of [[MIN_AREA, true], [900, false]]) {
    let changed = true;
    while (changed) {
      changed = false;
      const roots = [...new Set(P.map((p) => find(p.i)))].sort((a, b) => gArea[a] - gArea[b]);
      for (const g of roots) {
        const limit = sameKey ? minOf(g, limit0) : limit0;
        if (find(g) !== g || gArea[g] >= limit || P[g].zone) continue;
        const owner = P[g].owner;
        const cap = gArea[g] < 1500 ? Infinity : limit > MIN_AREA ? RU_MAX : MAX_MERGE; // le province minuscole si uniscono comunque
        const cands = groupNbrs(g).filter((h) => !P[h].zone && P[h].owner === owner && gArea[h] + gArea[g] <= cap && (sameKey ? mkey(P[h]) === mkey(P[g]) : P[h].modern === P[g].modern))
          .sort((a, b) => gArea[a] - gArea[b]);
        if (cands.length) { join(cands[0], g); changed = true; }
      }
    }
  }

  // zona italiana: province compatte dagli atomi
  {
    const zoneIdx = P.filter((p) => p.zone).map((p) => p.i);
    if (zoneIdx.length) {
      // vicinanza ai fiumi maggiori (griglia di punti ogni ~1 km)
      const RC = 0.05, rgrid = new Map();
      for (const f of riverLines(readJSON(path.join(TMP, 'rivers.geojson')).features)) for (const line of f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.coordinates) {
        for (let k = 1; k < line.length; k++) {
          const [a, b] = [line[k - 1], line[k]]; const n = Math.max(1, Math.ceil(turf.distance(a, b)));
          for (let t = 0; t <= n; t++) { const pt = [a[0] + ((b[0] - a[0]) * t) / n, a[1] + ((b[1] - a[1]) * t) / n]; const key = `${Math.floor(pt[0] / RC)},${Math.floor(pt[1] / RC)}`; if (!rgrid.has(key)) rgrid.set(key, []); rgrid.get(key).push(pt); }
        }
      }
      const riverNear = (x, y) => { const gx = Math.floor(x / RC), gy = Math.floor(y / RC); for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (const pt of rgrid.get(`${gx + dx},${gy + dy}`) || []) if (turf.distance([x, y], pt) < 1.2) return true; return false; };
      const metrics = topoMetrics(topo, geoms, riverNear);
      // aree linguistiche (approssimate) che una rivendicazione dell'epoca separerebbe
      const SK_HU = [[17.0, 48.0], [17.8, 48.2], [18.3, 48.12], [18.8, 48.12], [19.4, 48.22], [20.0, 48.35], [20.6, 48.52], [21.3, 48.42], [22.6, 48.42]];
      const southOf = ([lon, lat], line) => { for (let i = 1; i < line.length; i++) if (lon <= line[i][0] || i === line.length - 1) { const [x0, y0] = line[i - 1], [x1, y1] = line[i]; return lat < y0 + ((Math.max(x0, Math.min(lon, x1)) - x0) / (x1 - x0)) * (y1 - y0); } return false; };
      const lang = (p) => p.modern === 'CHE' ? CH_LANG[p.iso] || 'de'
        : p.iso === 'IT-BZ' ? 'de'
        : p.lang ? p.lang
        : p.modern === 'SVK' && southOf(cent[p.i], SK_HU) ? 'hu' // fascia magiara della Slovacchia meridionale
        : ['RO-HR', 'RO-CV'].includes(p.iso) ? 'hu' // terra dei Siculi
        : p.modern === 'GBR' ? GB_NATION[p.reg] || '' // Scozia, Galles, Irlanda del Nord: nazioni distinte
        : p.owner === 'SPA' && p.modern === 'ESP' ? ES_NATION[p.reg] || '' // Catalogna, Paesi Baschi e Navarra, Galizia
        : p.owner === 'GER' && POLISH_AREAS.some((ring) => turf.booleanPointInPolygon(cent[p.i], turf.polygon([ring]))) ? 'pl' // Polonia prussiana
        : p.modern === 'HUN' && p.owner === 'AUH' ? 'hu'
        : '';
      const coastKm = coastDistance(topo, geoms);
      // linee che contano per le rivendicazioni dell'epoca, anche se producono province piccole:
      // la città di Trieste, la contea di Nizza, la costa dalmata (minoranze italiane) separata dall'interno croato
      const claim = (p) => {
        const reg = String(p.reg || '');
        if (reg === 'H:Triest mit Gebiet') return 'trieste';
        if (p.prot === 'FIU') return 'fiume';
        // Rumelia ottomana: le province seguono i vilayet e le aree contese (Tessaglia, Epiro, Macedonia, Kosovo, Rumelia orientale…)
        if (p.owner === 'TUR') return `ott:${regionOf({ modern: p.modern, iso: p.iso, reg: p.reg, regModern: p.nreg, name: p.name, owner: p.owner }, cent[p.i]) || p.modern}`; // il poligono del corpus separatum di HistoGIS ha parti spurie in Slavonia
        if (p.owner === 'FRA' && p.iso === 'FR-06') return eastOfVar(cent[p.i]) ? 'nizza' : '';
        if (reg === 'H:Königreich Dalmatien') return coastKm(cent[p.i]) < 14 ? 'costa' : 'interno';
        return '';
      };
      for (const i of zoneIdx) { P[i].claim = claim(P[i]); P[i].langKey = lang(P[i]); }
      // il Reno come confine: le province tedesche non lo scavalcano (riva sinistra e riva destra)
      const rhine = (p) => (p.owner === 'GER' ? (p.feat.properties.rhineW ? 'sx' : 'dx') : '');
      for (const i of zoneIdx) P[i].rhine = rhine(P[i]);
      // nazioni approvate: stessa divisione della mappa di riferimento (scripts/map/lock)
      const lock = process.env.MAP_LOCK === '0' ? null : loadLock(LOCK_FILE);
      const lockable = (p) => LOCK_OWNERS.has(p.owner) && !AFRICA_MODERN.has(p.modern);
      const lockOf = new Map();
      if (lock) {
        for (const i of zoneIdx) {
          const p = P[i];
          if (!lockable(p) || p.prot || ['trieste', 'fiume'].includes(p.claim)) continue; // microstati e città libere seguono le loro regole
          const bb = turf.bbox(p.feat), votes = new Map();
          const pts = [turf.pointOnFeature(p.feat).geometry.coordinates];
          for (let a = 1; a < 5; a++) for (let b = 1; b < 5; b++) { const q = [bb[0] + ((bb[2] - bb[0]) * a) / 5, bb[1] + ((bb[3] - bb[1]) * b) / 5]; if (turf.booleanPointInPolygon(q, p.feat)) pts.push(q); }
          for (const q of pts) { const pr = lock.locate(q, p.owner); if (pr) votes.set(pr.id, (votes.get(pr.id) || 0) + 1); }
          const best = [...votes.entries()].sort((x, y) => y[1] - x[1])[0];
          if (best) lockOf.set(i, best[0]);
        }
        // atomi senza corrispondenza (coste ritoccate): al vicino bloccato dello stesso stato
        for (let pass = 0; pass < 6; pass++) for (const i of zoneIdx) {
          if (!lockable(P[i]) || lockOf.has(i) || P[i].prot || ['trieste', 'fiume'].includes(P[i].claim)) continue;
          const c = new Map();
          for (const j of nbr[i]) if (lockOf.has(j) && P[j].owner === P[i].owner) c.set(lockOf.get(j), (c.get(lockOf.get(j)) || 0) + 1);
          const best = [...c.entries()].sort((x, y) => y[1] - x[1])[0];
          if (best) lockOf.set(i, best[0]);
        }
        // isolette cancellate dalla semplificazione della mappa di riferimento: alla provincia bloccata più vicina
        const lockedList = [...lockOf.keys()];
        for (const i of zoneIdx) {
          if (!lockable(P[i]) || lockOf.has(i) || P[i].prot || ['trieste', 'fiume'].includes(P[i].claim)) continue;
          let best = null, bd = 80;
          for (const j of lockedList) if (P[j].owner === P[i].owner && P[j].claim === P[i].claim && P[j].langKey === P[i].langKey && (P[j].feat.properties.rhineW || 0) === (P[i].feat.properties.rhineW || 0)) { const d = turf.distance(cent[i], cent[j]); if (d < bd) { bd = d; best = j; } }
          if (best != null) lockOf.set(i, lockOf.get(best));
        }
        const lg = new Map();
        for (const [i, id] of lockOf) { if (!lg.has(id)) lg.set(id, []); lg.get(id).push(i); }
        // una provincia bloccata rimasta piccola (le ha tolto territorio una correzione storica, come il Sangiaccato
        // a Valjevo) si unisce alla provincia bloccata vicina dello stesso stato con il confine più lungo
        const lost = new Map();
        for (const i of zoneIdx) {
          if (lockOf.has(i)) continue;
          const pr = lock.locate(cent[i]);
          if (pr && pr.owner !== P[i].owner && LOCK_OWNERS.has(pr.owner)) lost.set(pr.id, (lost.get(pr.id) || 0) + P[i].area);
        }
        for (const [id, list] of [...lg]) {
          const area = list.reduce((t, i) => t + P[i].area, 0);
          if (area >= 1500 || !lg.has(id) || (lost.get(id) || 0) < area) continue;
          const touch = new Map();
          for (const i of list) for (const j of nbr[i]) { const o = lockOf.get(j); if (o !== undefined && o !== id && P[j].owner === P[i].owner) touch.set(o, (touch.get(o) || 0) + 1); }
          const host = [...touch.entries()].sort((x, y) => y[1] - x[1])[0];
          if (!host) continue;
          for (const i of list) lockOf.set(i, host[0]);
          lg.get(host[0]).push(...list);
          lg.delete(id);
          log(`provincia bloccata ${lock.byId.get(id).name} (${Math.round(area)} km² rimasti) unita a ${lock.byId.get(host[0]).name}`);
        }
        for (const [id, list] of lg) { for (const i of list.slice(1)) join(list[0], i); for (const i of list) P[i].lockName = lock.byId.get(id).name; }
        log(`province bloccate: ${lg.size} dalla mappa approvata (${lockOf.size} atomi)`);
      }
      const freeIdx = zoneIdx.filter((i) => !lockOf.has(i));
      // Nord Africa: densità di località moderne entro 30 km (abitanti per km², solo indicativa)
      // Eubea: isola a sé, non una striscia con la costa della Locride (la parte del poligono di Natural Earth che contiene Calcide est)
      const euboea = (() => { const h = readJSON(path.join(RAW, 'ne_admin1.geojson')).features.find((f) => f.properties.iso_3166_2 === 'GR-H'); if (!h) return null; const parts = h.geometry.type === 'MultiPolygon' ? h.geometry.coordinates.map((c) => turf.polygon(c)) : [turf.polygon(h.geometry.coordinates)]; return parts.find((q) => turf.booleanPointInPolygon([23.9, 38.55], q)) || null; })();
      const isle = (p) => (euboea && (p.owner === 'GRE' || p.modern === 'GRC') && turf.booleanPointInPolygon(turf.pointOnFeature(p.feat), euboea) ? 'eubea' : '');
      const dens = new Map(), densCap = new Map();
      {
        const CELL = 0.5, grid = new Map();
        for (const c of geoCities()) { const k = `${Math.floor(c.lon / CELL)},${Math.floor(c.lat / CELL)}`; if (!grid.has(k)) grid.set(k, []); grid.get(k).push(c); }
        for (const i of freeIdx) {
          if (!AFRICA_MODERN.has(P[i].modern)) continue;
          const [x, y] = cent[i]; let sum = 0;
          for (let gx = Math.floor(x / CELL) - 1; gx <= Math.floor(x / CELL) + 1; gx++) for (let gy = Math.floor(y / CELL) - 1; gy <= Math.floor(y / CELL) + 1; gy++)
            for (const c of grid.get(`${gx},${gy}`) || []) if (turf.distance([x, y], [c.lon, c.lat]) < 30) sum += c.pop;
          dens.set(i, sum / (Math.PI * 900));
          // nel deserto le città moderne (petrolio, campi profughi) gonfiano la densità: ognuna conta al massimo 20.000 abitanti
          let capped = 0;
          for (let gx = Math.floor(x / CELL) - 1; gx <= Math.floor(x / CELL) + 1; gx++) for (let gy = Math.floor(y / CELL) - 1; gy <= Math.floor(y / CELL) + 1; gy++)
            for (const c of grid.get(`${gx},${gy}`) || []) if (turf.distance([x, y], [c.lon, c.lat]) < 30) capped += Math.min(c.pop, 20000);
          densCap.set(i, capped / (Math.PI * 900));
        }
      }
      // zona arida: i poligoni dei deserti di Natural Earth (Sahara, Deserto Libico, Occidentale, Orientale, erg e hamada)
      const arid = readJSON(path.join(TMP, 'phys.geojson')).features.filter((f) => f.properties.cls === 'Desert' && !['SYRIAN DESERT', 'An Nafud Desert', 'Negev Desert'].includes(f.properties.name)).map((f) => ({ f, bb: turf.bbox(f) }));
      // il Sinai interno e la hamada del Guir (fra Béchar e il Tafilalt) non hanno un poligono di Natural Earth
      arid.push({ f: turf.polygon([[[32.4, 31.0], [34.25, 31.3], [34.9, 29.5], [34.3, 27.7], [32.6, 29.9], [32.4, 31.0]]]), bb: [32.4, 27.7, 34.9, 31.3] });
      arid.push({ f: turf.bboxPolygon([-3.6, 30.5, -1.0, 32.2]), bb: [-3.6, 30.5, -1.0, 32.2] });
      const inArid = ([x, y]) => arid.some((q) => x >= q.bb[0] && x <= q.bb[2] && y >= q.bb[1] && y <= q.bb[3] && turf.booleanPointInPolygon([x, y], q.f));
      // classi del Nord Africa: valle del Nilo, terre abitate, coste del deserto (transitabili), oasi (transitabili),
      // deserto (intransitabile, terra di nessuno all'inizio: lo assegna il motore in base alle province che lo circondano)
      const desertRegion = (p) => {
        const [x, y] = cent[p.i];
        if (p.modern === 'EGY') return ['EG-SIN', 'EG-JS'].includes(p.iso) || (x > 32.35 && y > 29.85) ? 'Sinai' : x > 31.0 ? 'Deserto Arabico' : 'Deserto Libico';
        if (p.modern === 'LBY' && x >= 19) return 'Deserto Libico';
        return 'Sahara';
      };
      for (const i of freeIdx) {
        const p = P[i];
        if (!AFRICA_MODERN.has(p.modern)) continue;
        const pr = p.feat.properties, d = dens.get(i) ?? 99;
        if (pr.nile) p.acls = 'nilo';
        else if (pr.oasis) { p.acls = `oasi:${pr.oasis}`; p.oasis = pr.oasis; p.owner = OASES.find((o) => o.name === pr.oasis)?.owner ?? ''; }
        // deserto vero solo nella zona arida; fuori (Rif, Atlante, Tell) anche le terre spopolate restano normali
        else if (!inArid(cent[i]) || (densCap.get(i) ?? 0) >= 15) p.acls = 'P';
        else if (pr.band || pr.inner) p.acls = 'costa';
        else { p.desert = desertRegion(p); p.acls = `D:${p.desert}`; p.owner = ''; }
      }
      { const h = {}; for (const i of freeIdx) { const p = P[i]; if (!p.acls) continue; const k = p.acls.startsWith('oasi') ? 'oasi' : p.acls; h[k] = (h[k] || 0) + Math.round(p.area); } log('classi Nord Africa (km²)', JSON.stringify(h)); }
      const africaScale = (p) => {
        if (p.acls === 'nilo') return 0.9;
        if (p.oasis) return 1;
        if (p.desert) return 24;
        if (p.acls === 'costa') return 4;
        const d = dens.get(p.i) ?? 99, b = AFRICA_BASE[p.owner] ?? 2;
        return d >= 80 ? b : d >= 20 ? b * 1.5 : b * 2.5;
      };
      // il deserto segue i confini moderni (le forme saranno quelle degli stati di domani)
      // l'Altopiano Libico (Marmarica) resta un deserto a sé, a sud delle terre di Derna e Tobruch
      const plateau = readJSON(path.join(TMP, 'phys.geojson')).features.find((f) => f.properties.name === 'Libyan Plateau');
      const onPlateau = (p) => !!plateau && turf.booleanPointInPolygon(cent[p.i], plateau);
      const akey = (p) => (p.acls === 'costa' ? 'P' : p.desert ? `${p.acls}:${p.modern}${onPlateau(p) ? ':altopiano' : ''}` : p.acls);
      if (dens.size) { const h = {}; for (const [i, d] of dens) { const k = `${P[i].owner}:${d >= 80 ? 'a' : d >= 20 ? 'b' : d >= 5 ? 'c' : 'e'}`; h[k] = (h[k] || 0) + Math.round(P[i].area); } log('densità Nord Africa (km² per classe)', JSON.stringify(h)); }
      const groups = compactClusters(freeIdx, P, metrics, {
        // la contea di Gorizia resta unita anche a cavallo del confine italo-sloveno di oggi
        // Balcani e Portogallo: niente linee rigide (né confini moderni né vilayet), solo preferenze
        // Grecia moderna e Kosovo: linee rigide anche dentro l'Impero ottomano (aree di rivendicazione greca e serba/albanese)
        key: (p) => AFRICA_MODERN.has(p.modern) ? `${p.owner}|${p.owner && !FREE_OWNERS.has(p.owner) ? p.modern : ''}|${p.prot || ''}|${akey(p)}` : `${p.owner}|${p.reg === 'H:Gefürstete Grafschaft Görz und Gradisca' ? 'GOR' : FREE_OWNERS.has(p.owner) ? (p.owner === 'TUR' && ['GRC', 'KOS', 'ALB'].includes(p.modern) ? p.modern : '') : p.modern}|${lang(p)}|${p.prot || ''}|${FREE_OWNERS.has(p.owner) ? '' : claim(p)}|${p.rhine}|${isle(p)}|${p.modern === 'EGY' && p.feat.properties.nile ? 'nilo' : ''}`,
        soft2: (p) => (AFRICA_MODERN.has(p.modern) ? p.acls : FREE_OWNERS.has(p.owner) ? p.modern : ''),
        riverOwners: FREE_OWNERS,
        aspectStrip: (p) => !!p.desert,
        looseKey: (p) => `${p.owner}|${lang(p)}|${p.prot || ''}|${['costa', 'interno'].includes(claim(p)) ? 'dalmazia' : claim(p)}|${p.rhine}`,
        soft: (p) => AFRICA_MODERN.has(p.modern) ? p.acls : regionOf({ modern: p.modern, iso: p.iso, reg: p.reg, regModern: p.nreg, name: p.name, owner: p.owner }, cent[p.i]) || p.modern,
        min: ZONE_MIN, target: ZONE_TARGET, max: ZONE_MAX, log,
        keepSmall: (p) => !!p.prot || ['trieste', 'fiume'].includes(claim(p)),
        // controllo delle strisce più severo dove non c'è già una mappa approvata
        stripOwners: new Set(['GBR', 'GER', 'DEN', 'NED', 'SPA', 'SER', 'MNE', 'BUL', 'ROM', 'GRE', 'TUR', 'POR', 'MOR', 'TUN', 'EGY', 'FRA']),
        // terre poco popolate, province più grandi (radice del rapporto di densità con l'Italia del 1881)
        // il Kosovo in tre province (Priştine, İpek, Prizren) invece di una sola
        sizeScale: (p) => (AFRICA_MODERN.has(p.modern) ? africaScale(p) : p.owner === 'TUR' && p.modern === 'KOS' ? 0.8 : p.owner === 'TUR' && p.modern === 'ALB' ? 0.9 : SIZE_SCALE[p.owner] ?? 1),
      });
      // schegge abitate isolate nel deserto (un villaggio moderno, un pezzo di costa del Mar Rosso): diventano deserto
      {
        const gOf = new Map();
        groups.forEach((g, k) => g.forEach((i) => gOf.set(i, k)));
        let turned = 0;
        groups.forEach((g, k) => {
          const p0 = P[g[0]];
          if (!AFRICA_MODERN.has(p0.modern) || !['P', 'costa'].includes(p0.acls)) return;
          const area = g.reduce((t, i) => t + P[i].area, 0);
          if (area >= 4000) return;
          const nb = new Map();
          for (const i of g) for (const j of nbr[i]) { const h = gOf.get(j); if (h !== undefined && h !== k) nb.set(h, (nb.get(h) || 0) + 1); }
          if ([...nb.keys()].some((h) => !P[groups[h][0]].desert && !P[groups[h][0]].oasis && P[groups[h][0]].owner === p0.owner)) return;
          const d = [...nb.entries()].filter(([h]) => P[groups[h][0]].desert).sort((a, b) => b[1] - a[1])[0];
          if (!d) return;
          const host = P[groups[d[0]][0]];
          for (const i of g) { P[i].owner = ''; P[i].desert = host.desert; P[i].acls = host.acls; }
          groups[d[0]].push(...g); g.length = 0; turned++;
        });
        if (turned) log(`${turned} schegge abitate isolate nel deserto unite al deserto`);
        // ritagli di deserto lungo i confini moderni o il bordo della mappa (sotto 12.000 km²): al deserto vicino
        // con il confine più lungo, se possibile dello stesso paese di oggi
        let scraps = 0;
        for (let pass = 0; pass < 3; pass++) groups.forEach((g, k) => {
          if (!g.length || !P[g[0]].desert) return;
          const area = g.reduce((t, i) => t + P[i].area, 0);
          if (area >= 12000) return;
          const gOf2 = new Map(); groups.forEach((h, kk) => h.forEach((i) => gOf2.set(i, kk)));
          const nb = new Map();
          for (const i of g) for (const j of nbr[i]) { const h = gOf2.get(j); if (h !== undefined && h !== k && P[groups[h][0]].desert) nb.set(h, (nb.get(h) || 0) + 1); }
          const same = [...nb.entries()].filter(([h]) => P[groups[h][0]].modern === P[g[0]].modern);
          const best = (same.length ? same : [...nb.entries()]).sort((a, b) => b[1] - a[1])[0];
          if (!best) return;
          groups[best[0]].push(...g); g.length = 0; scraps++;
        });
        if (scraps) log(`${scraps} ritagli di deserto uniti al deserto vicino`);
      }
      for (const g of groups) for (const i of g.slice(1)) join(g[0], i);
      // un'isola con chiave propria (Eubea) resta una provincia sola anche se lunga
      const isles = new Map();
      for (const i of freeIdx) { const k = isle(P[i]) || (P[i].oasis ? `oasi:${P[i].oasis}` : ''); if (!k) continue; if (isles.has(k)) join(isles.get(k), i); else isles.set(k, i); }
    }
  }

  // isole piccole senza vicini: si uniscono alla provincia più vicina dello stesso stato (entro 60 km),
  // altrimenti sparirebbero nella semplificazione
  {
    const ar = new Map();
    for (const p of P) { const r = find(p.i); ar.set(r, gArea[r]); }
    const smallRoots = [...ar.keys()].filter((r) => gArea[r] < 600).sort((a, b) => gArea[a] - gArea[b]);
    let isl = 0;
    for (const r0 of smallRoots) {
      const r = find(r0);
      if (gArea[r] >= 600 || P[r].prot || P[r].lockName) continue;
      // zona compatta: i frammenti con vicini di terra vanno al vicino con la stessa rivendicazione
      // (Trieste, Fiume e i microstati restano a sé); solo le isole vere si uniscono a distanza
      if (P[r].zone) {
        if (P[r].claim === 'trieste' || P[r].claim === 'fiume') continue;
        const touch = new Map();
        for (const p of P) if (find(p.i) === r) for (const j of nbr[p.i]) { const g = find(j); if (g !== r) touch.set(g, (touch.get(g) || 0) + 1); }
        if (touch.size) {
          if (gArea[r] >= 500) continue;
          const ok = (g) => P[g].owner === P[r].owner && !P[g].prot && (!P[r].claim || P[g].claim === P[r].claim) && (!P[r].langKey || P[g].langKey === P[r].langKey) && (P[g].rhine || '') === (P[r].rhine || '') && P[g].acls === P[r].acls;
          const t = [...touch.entries()].filter(([g]) => ok(g)).sort((a, b) => b[1] - a[1] || gArea[b[0]] - gArea[a[0]])[0];
          if (t) { join(t[0], r); isl++; continue; }
          // isola linguistica senza vicini della stessa lingua (Kuhländchen in Moravia): va al vicino
          // di terra dello stesso stato, mai un'exclave lontana
          const t2 = [...touch.entries()].filter(([g]) => P[g].owner === P[r].owner && P[g].acls === P[r].acls && !P[g].prot && gArea[g] >= gArea[r] && (P[g].rhine || '') === (P[r].rhine || '')).sort((a, b) => b[1] - a[1])[0];
          if (t2) { join(t2[0], r); isl++; continue; }
          // tocca solo schegge: si comporta come un'isola
        }
      }
      const mine = P.filter((p) => find(p.i) === r);
      let best = null, bd = 60;
      for (const q of P) {
        if (q.owner !== P[r].owner || find(q.i) === r || gArea[find(q.i)] < gArea[r] || P[find(q.i)].prot || P[find(q.i)].lockName) continue;
        if (P[r].zone && P[r].claim && P[find(q.i)].claim !== P[r].claim) continue;
        if (P[r].zone && P[r].langKey && P[find(q.i)].langKey !== P[r].langKey) continue;
        if (P[r].zone && (P[find(q.i)].rhine || '') !== (P[r].rhine || '')) continue;
        if (P[r].zone && P[find(q.i)].acls !== P[r].acls) continue;
        if (P[r].zone && gArea[r] >= 150 && P[find(q.i)].modern !== P[r].modern) continue; // l'isola di Man resta a sé
        for (const m of mine) { const d = turf.distance(cent[m.i], cent[q.i]); if (d < bd) { bd = d; best = q; } }
      }
      if (best) { join(best.i, r); isl++; }
    }
    log(`${isl} isole o frammenti uniti alla provincia vicina`);
  }

  // peso urbano di ogni pezzo: il nome della provincia accorpata è quello del pezzo più popoloso
  const placesAll = [...readJSON(path.join(RAW, 'ne_places.geojson')).features, ...EXTRA_PLACES.map(([name, lon, lat, pop]) => turf.point([lon, lat], { name, pop_max: pop }))];
  for (const pl of placesAll) {
    const [x, y] = pl.geometry.coordinates;
    if (x < BBOX[0] || x > BBOX[2] || y < BBOX[1] || y > BBOX[3]) continue;
    for (const p of P) {
      const bb = p.bb || (p.bb = turf.bbox(p.feat));
      if (x < bb[0] || x > bb[2] || y < bb[1] || y > bb[3]) continue;
      if (turf.booleanPointInPolygon([x, y], p.feat)) {
        const pop = pl.properties.pop_max || 0;
        p.urban = (p.urban || 0) + pop;
        if (pop > (p.topPop || 0)) { p.topPop = pop; p.topTown = pl.properties.name; }
        break;
      }
    }
  }
  // città minori (GeoNames, CC BY 4.0) per dare un nome alle province della zona compatta senza grandi città
  const geoPath = path.join(RAW, 'geonames', 'cities500.json');
  if (fs.existsSync(geoPath)) {
    const zoneP = P.filter((p) => p.zone);
    const CELL = 0.5, grid = new Map();
    for (const p of zoneP) {
      const bb = p.bb || (p.bb = turf.bbox(p.feat));
      for (let x = Math.floor(bb[0] / CELL); x <= Math.floor(bb[2] / CELL); x++) for (let y = Math.floor(bb[1] / CELL); y <= Math.floor(bb[3] / CELL); y++) {
        const k = `${x},${y}`; if (!grid.has(k)) grid.set(k, []); grid.get(k).push(p);
      }
    }
    for (const c of geoCities()) {
      const { pop, lon, lat } = c;
      if (pop < 1000 || ANACHRONISTIC.has(c.name)) continue;
      for (const p of grid.get(`${Math.floor(lon / CELL)},${Math.floor(lat / CELL)}`) || []) {
        const bb = p.bb;
        if (lon < bb[0] || lon > bb[2] || lat < bb[1] || lat > bb[3] || !turf.booleanPointInPolygon([lon, lat], p.feat)) continue;
        (p.geo ??= []).push([c.name, pop]);
        break;
      }
    }
  }
  const roots = [...new Set(P.map((p) => find(p.i)))];
  const gid = new Map(roots.map((r, k) => [r, k]));
  // province del deserto: nome della forma del terreno di Natural Earth che ne copre la parte maggiore
  const DESERT_NAMES = { 'Grand Erg Oriental': 'Grande Erg Orientale', 'Grand Erg Occidental': 'Grande Erg Occidentale', 'Plat. du Tademaït': 'Tademait',
    'Hamada de Tinrhert': 'Hamada di Tinrhert', '‘Erg Chech': 'Erg Chech', '‘Erg Iguidi': 'Erg Iguidi', 'Hamada du Drâa': 'Hamada del Draa',
    'Sarïr Kalanshiyu ar Ramli al Kabi': 'Sarir Calanscio', 'Libyan Plateau': 'Altopiano Libico', 'Jabal as Sawdä’': 'Gebel es-Soda', 'Al Harüj al Aswad': 'Harugi',
    'Eastern Desert': 'Deserto Orientale', 'WESTERN DESERT': 'Deserto Occidentale', 'Tassili-n-Ajjer': 'Tassili', 'Negev Desert': 'Negev', 'ATLAS SAHARIEN': 'Atlante sahariano',
    'Anti Atlas': 'Antiatlante', 'HAUT ATLAS': 'Alto Atlante', 'Al Jabal al Akhdar': 'Gebel Achdar' };
  const physFeat = readJSON(path.join(TMP, 'phys.geojson')).features.filter((f) => DESERT_NAMES[f.properties.name]).map((f) => ({ f, bb: turf.bbox(f), name: DESERT_NAMES[f.properties.name] }));
  const desertName = (mem) => {
    const by = new Map();
    for (const m of mem) {
      const [x, y] = cent[m.i];
      const hit = physFeat.find((q) => x >= q.bb[0] && x <= q.bb[2] && y >= q.bb[1] && y <= q.bb[3] && turf.booleanPointInPolygon([x, y], q.f));
      const n = hit ? hit.name : null;
      if (!n) continue;
      by.set(n, (by.get(n) || 0) + m.area);
    }
    const top = [...by.entries()].sort((a, b) => b[1] - a[1])[0];
    const tot = mem.reduce((t, m) => t + m.area, 0);
    if (top && top[1] > tot * 0.35) return top[0];
    // senza una forma del terreno prevalente: "Deserto di" + l'oasi più vicina
    const c = turf.centroid(turf.featureCollection(mem.map((m) => turf.point(cent[m.i])))).geometry.coordinates;
    const o = OASES.slice().sort((a, b) => turf.distance(c, a.at) - turf.distance(c, b.at))[0];
    return `Deserto di ${o.name}`;
  };
  // nome del gruppo = pezzo più esteso; nomi duplicati numerati
  const gInfo = roots.map((r) => {
    const mem = P.filter((p) => find(p.i) === r).sort((a, b) => b.area - a.area);
    const byName = new Map();
    // nomi d'epoca preferiti, ma solo se le unità d'epoca sono la parte maggiore della provincia
    const histArea = mem.reduce((t, m) => t + (m.hist ? m.area : 0), 0);
    const anyHist = histArea >= 0.5 * mem.reduce((t, m) => t + m.area, 0);
    for (const m of mem) if (!anyHist || m.hist) byName.set(m.name, (byName.get(m.name) || 0) + (MICRO.has(m.modern) ? 0 : (m.urban || 0) + m.area * 2));
    let name = [...byName.entries()].sort((a, b) => b[1] - a[1])[0][0];
    // zona italiana: la provincia prende il nome della sua città principale; senza città, il nome
    // amministrativo più esteso che non sia già il nome di un'altra provincia
    let byNameList = null, byTown = false;
    const lockName = mem.find((m) => m.lockName)?.lockName || null;
    const desert = mem[0].desert || null, oasis = mem.find((m) => m.oasis)?.oasis || null;
    if (lockName) name = lockName;
    else if (oasis) name = oasis;
    else if (desert) name = desertName(mem);
    else if (mem[0].zone && !P[r].prot) {
      const t = mem.filter((m) => m.topTown).sort((a, b) => b.topPop - a.topPop)[0];
      if (t && t.topPop >= 8000 && !PROTECTED.some((x) => x.name === exo(t.topTown)) && !ANACHRONISTIC.has(t.topTown)) { name = exo(t.topTown); byTown = true; }
      else {
        // prima i nomi d'epoca (distretti, Regierungsbezirke), poi le città minori, infine i nomi amministrativi moderni
        const w = (list) => { const m = new Map(); for (const x of list) m.set(x.name, (m.get(x.name) || 0) + (x.urban || 0) + x.area * 2); return [...m.entries()].sort((a, b) => b[1] - a[1]).map((e) => e[0]); };
        const towns = mem.flatMap((m) => m.geo || []).sort((a, b) => b[1] - a[1]).map((x) => exo(x[0]));
        // dove le suddivisioni moderne sono fini (province italiane, dipartimenti francesi) il loro nome viene prima delle città minori
        const fine = ['ITA', 'FRA', 'ESP', 'PRT', 'IRL'].includes(mem[0].modern);
        byNameList = fine ? [...w(mem.filter((m) => m.hist)), ...w(mem.filter((m) => !m.hist)), ...towns] : [...w(mem.filter((m) => m.hist)), ...towns, ...w(mem.filter((m) => !m.hist))];
      }
    }
    // regione storica: quella che copre la maggior parte dell'area del gruppo
    const prot = PROTECTED.find((x) => x.id === P[r].prot);
    const regArea = new Map();
    for (const m of mem) {
      let rg = prot ? prot.region || prot.name
        : m.modern === 'CHE' ? { fr: 'Romandia', it: 'Ticino' }[CH_LANG[m.iso]] || 'Svizzera tedesca'
        : m.modern === 'DEU' && !m.hist ? '@self'
        : regionOf({ modern: m.modern, iso: m.iso, reg: m.reg, regModern: m.nreg, name: m.name, owner: m.owner }, cent[m.i]);
      rg = rg ?? '@nb';
      regArea.set(rg, (regArea.get(rg) || 0) + m.area);
    }
    const region = [...regArea.entries()].sort((a, b) => b[1] - a[1])[0][0];
    return { name, owner: mem[0].owner, modern: mem[0].modern, area: gArea[r], region, prot: prot || null, byNameList, byTown, lockName, desert, oasis };
  });
  {
    // confronto senza accenti e caratteri invisibili: "Málaga" e "Malaga" sono lo stesso nome
    const nn = (x) => String(x).replace(/[\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/g, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    for (const g of gInfo) g.name = String(g.name).replace(/[\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/g, '').trim();
    const townNames = new Set(gInfo.filter((g) => !g.byNameList).map((g) => nn(g.name)));
    for (const g of gInfo) if (g.lockName) townNames.add(nn(g.lockName));
    // le più estese scelgono per prime, così due province non prendono lo stesso nome amministrativo
    for (const g of gInfo.filter((x) => x.byNameList).sort((a, b) => b.area - a.area)) {
      const n = g.byNameList.map((x) => String(x).replace(/[\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/g, '').trim()).find((x) => !townNames.has(nn(x)));
      if (n) { g.name = n; townNames.add(nn(n)); }
    }
  }
  // regioni ancora indecise: quella del vicino dello stesso stato con più confine in comune
  {
    const gNb = new Map();
    for (const p of P) for (const j of nbr[p.i]) {
      const a = gid.get(find(p.i)), b = gid.get(find(j));
      if (a === b) continue;
      if (!gNb.has(a)) gNb.set(a, new Map());
      gNb.get(a).set(b, (gNb.get(a).get(b) || 0) + 1);
    }
    for (let pass = 0; pass < 5; pass++) for (const [k, gi] of gInfo.entries()) {
      if (gi.region !== '@nb') continue;
      const c = [...(gNb.get(k) || new Map()).entries()].filter(([b]) => gInfo[b].owner === gi.owner && !gInfo[b].region.startsWith('@')).sort((x, y) => y[1] - x[1])[0];
      if (c) gi.region = gInfo[c[0]].region;
    }
    // isole e frammenti senza vicini utili: regione della provincia più vicina dello stesso stato (fuori dalla Germania)
    const gCent = new Map();
    for (const p of P) { const g = gid.get(find(p.i)); if (!gCent.has(g)) gCent.set(g, cent[p.i]); }
    for (const [k, gi] of gInfo.entries()) {
      if (gi.region !== '@nb') continue;
      let best = null, bd = 400;
      for (const [b, gb] of gInfo.entries()) if (b !== k && gb.owner === gi.owner && !gb.region.startsWith('@')) { const d = turf.distance(gCent.get(k), gCent.get(b)); if (d < bd) { bd = d; best = gb; } }
      if (best) gi.region = best.region;
    }
    for (const gi of gInfo) if (gi.region.startsWith('@')) gi.region = null; // = nome della provincia, deciso dopo i RENAMES
    gInfo.gNb = gNb;
  }
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
  // Nord Africa: peso dalle località di GeoNames (anche i villaggi, la popolazione del 1881 era soprattutto rurale);
  // nel deserto la superficie non porta abitanti
  {
    const af = provinces.filter((p) => AFRICA_MODERN.has(p.info.modern));
    for (const p of af) p.gsum = 0;
    for (const c of geoCities()) {
      if (c.lat > 37.6 || c.lon > 35.5) continue;
      for (const p of af) {
        const bb = p.bb || (p.bb = turf.bbox(p.f));
        if (c.lon < bb[0] || c.lon > bb[2] || c.lat < bb[1] || c.lat > bb[3]) continue;
        if (turf.booleanPointInPolygon([c.lon, c.lat], p.f)) { p.gsum += Math.sqrt(c.pop); break; }
      }
    }
  }
  for (const p of provinces) {
    let w;
    if (p.gsum != null) { const a = Math.max(1, p.info.area); w = p.gsum + a * 0.15 * Math.min(1, Math.max(0.02, (p.gsum / a) * 5)); }
    else w = p.modernPop + p.info.area * 0.15;
    p.w = w; const k = poolOf(p); byPool.set(k, (byPool.get(k) || 0) + w); }
  for (const p of provinces) {
    const k = poolOf(p); const tot = poolTotal(k);
    p.pop = tot != null ? Math.round((tot * p.w) / byPool.get(k)) : Math.round(p.info.area * 2);
    // deserto: nomadi sparsi; oasi: stima del 1881
    if (p.info.desert) p.pop = Math.round(p.info.area * 0.02);
    if (p.info.oasis) p.pop = OASES.find((o) => o.name === p.info.oasis)?.pop ?? p.pop;
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
    p.terrain = p.info.desert || p.info.oasis ? 'desert'
      : cnt.mtn / n >= 0.45 ? 'mountain'
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
  // linee (canali) con la stessa codifica degli archi
  const flatArc = (line) => { const flat = []; let px = 0, py = 0; for (const c of line) { const [x, y] = laea(c); const ix = Math.round(x * 10), iy = Math.round(y * 10); flat.push(ix - px, iy - py); px = ix; py = iy; } return flat; };
  const outArcs = parr.map((arc) => { const flat = []; let px = 0, py = 0; for (const [x, y] of arc) { const ix = Math.round(x * 10), iy = Math.round(y * 10); flat.push(ix - px, iy - py); px = ix; py = iy; } return flat; });
  const arcSides = arcUse.map((u) => (u.length === 2 ? [u[0], u[1]] : [u[0] ?? -1, -1]));

  // territori protetti: quelli cancellati dalla semplificazione diventano province-simbolo
  const gToK = new Map(fgeoms.map((g, k) => [g.properties.g, k]));
  const tiny = new Set();
  for (const pr of PROTECTED) {
    const gi = gInfo.findIndex((x) => x.prot?.id === pr.id);
    let k = gi >= 0 ? gToK.get(gi) : undefined;
    if (k !== undefined) { if (gInfo[gi].area < 300) tiny.add(k); continue; }
    k = provinces.length;
    let pt = pr.point, nb = [];
    if (gi >= 0) {
      const mem = P.filter((q) => gid.get(find(q.i)) === gi);
      pt = turf.centroid(turf.featureCollection(mem.map((q) => q.feat))).geometry.coordinates;
      nb = [...(gInfo.gNb.get(gi) || new Map()).keys()].map((b) => gToK.get(b)).filter((x) => x !== undefined);
    }
    if (!pt) continue;
    const info = gi >= 0 ? gInfo[gi] : { name: pr.name, owner: pr.owner, modern: pr.id, area: 1, region: pr.region || pr.name, prot: pr };
    provinces.push({ k, info, pt, coast: pr.coast, terrain: pr.terrain, pop: pr.pop, synthetic: true });
    fnbr[k] = nb;
    for (const j of nb) if (!fnbr[j].includes(k)) fnbr[j].push(k);
    if (!nb.length) {
      // isola: stretto verso la provincia costiera più vicina di un altro territorio
      let best = null, bd = Infinity;
      for (const q of provinces) if (q.k !== k && q.coast && !q.synthetic) { const d = turf.distance(pt, q.pt); if (d < bd) { bd = d; best = q; } }
      if (best) strList.push([k, best.k, Math.round(bd)]);
    }
    tiny.add(k);
  }
  for (const pr of PROTECTED) { const p = provinces.find((q) => q.info.prot?.id === pr.id); if (p) { p.pop = pr.pop; p.terrain = pr.terrain; p.coast = pr.coast; } }
  // anche le altre province minuscole (Trieste) hanno il sigillo, per poterle toccare
  for (const p of provinces) if (!p.synthetic && p.info.area < 150) tiny.add(p.k);

  // piste carovaniere: dalla provincia transitabile che contiene (o è più vicina a) un capo a quella dell'altro
  const passableAt = (pt) => {
    const inside = provinces.find((p) => !p.info.desert && !p.synthetic && p.f && turf.booleanPointInPolygon(pt, p.f));
    if (inside) return inside;
    let best = null, bd = 60;
    for (const p of provinces) {
      if (p.info.desert || p.synthetic || !p.f) continue;
      const bb = p.bb || (p.bb = turf.bbox(p.f));
      if (pt[0] < bb[0] - 1 || pt[0] > bb[2] + 1 || pt[1] < bb[1] - 1 || pt[1] > bb[3] + 1) continue;
      const d = turf.pointToPolygonDistance(turf.point(pt), p.f, { units: 'kilometers' });
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  };
  const routes = [];
  for (const [from, to, line] of CARAVAN_ROUTES) {
    const a = passableAt(line[0]), b = passableAt(line[line.length - 1]);
    if (!a || !b || a.k === b.k) { log(`pista ${from} – ${to}: capi non trovati`); continue; }
    routes.push({ a: a.k, b: b.k, name: `${from} – ${to}`, km: Math.round(turf.length(turf.lineString(line))), pts: flatArc(line) });
  }
  log(`${routes.length} piste carovaniere`);
  const out = {
    version: 1,
    scenario: 'europe1881',
    projection: 'LAEA 52N 10E, km, archi delta-codificati in decimi di km',
    sources: ['Natural Earth (public domain)', 'aourednik/historical-basemaps world_1880 (GPL-3.0)', 'HydroBASINS (Lehner & Grill 2013)',
      'HistoGIS, ACDH-CH, Austrian Academy of Sciences (CC BY 4.0)', 'Kessler & Markevich, RISTAT Russian Empire 1897 maps (CC0)'],
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
      arcs: p.synthetic ? [] : fgeoms[p.k].arcs,
      n: fnbr[p.k],
      _town: !!p.info.byTown,
      _lock: p.info.lockName,
      ...(p.info.desert ? { impassable: true, region: p.info.desert } : {}),
      ...(p.info.oasis ? { oasis: true } : {}),
      ...(tiny.has(p.k) ? { tiny: true } : {}),
      _region: p.info.region,
    })),
    straits: strList,
    canals: canal ? canal.map((line) => ({ name: 'Canale di Suez', pts: flatArc(line) })) : [],
    routes,
    rivers: riverEdges,
  };
  // nomi d'epoca al posto dei nomi moderni
  const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const p of out.provinces) for (const [from, to, owner] of RENAMES) {
    if (owner && p.owner !== owner) continue;
    p.name = p.name.replace(new RegExp(`(^|[\\s(])${esc(from)}(?=$|[\\s)])`, 'u'), `$1${to}`);
  }
  // le province bloccate tengono il nome della mappa approvata
  for (const p of out.provinces) if (p._lock) p.name = p._lock;
  // nomi duplicati
  const seen = new Map();
  for (const p of out.provinces) { const n = seen.get(p.name) || 0; seen.set(p.name, n + 1); }
  const cnt = new Map();
  // nomi uguali: prima la nazione (Lussemburgo belga), poi la posizione rispetto agli omonimi, solo infine un numero
  const ADJ = { BEL: 'belga', LUX: '', GER: 'tedesca', DEN: 'danese', FRA: 'francese', AUH: 'austriaca', RUS: 'russa', TUR: 'ottomana', ITA: 'italiana', SWE: 'svedese', ROM: 'romena', SER: 'serba', BUL: 'bulgara', ARA: 'araba', PER: 'persiana', MOR: 'marocchina', NED: 'olandese', GBR: 'britannica', GRE: 'greca', SPA: 'spagnola', POR: 'portoghese', SWI: 'svizzera', EGY: 'egiziana', TUN: 'tunisina', MNE: 'montenegrina' };
  const groupsByName = new Map();
  for (const p of out.provinces) { if (seen.get(p.name) > 1) { if (!groupsByName.has(p.name)) groupsByName.set(p.name, []); groupsByName.get(p.name).push(p); } }
  for (const [name, list] of groupsByName) {
    // chi ha davvero la città nel suo territorio tiene il nome; le altre prendono la direzione rispetto a lei
    // una provincia bloccata tiene il suo nome; altrimenti chi ha davvero la città
    const locked = list.filter((p) => p._lock);
    const town = locked.length ? locked : list.filter((p) => p._town);
    if (town.length === 1 && (locked.length || new Set(list.map((p) => p.owner)).size === 1)) {
      const [cx, cy] = town[0].lonlat;
      for (const p of list) {
        if (p === town[0]) continue;
        const dx = (p.lonlat[0] - cx) * Math.cos((cy * Math.PI) / 180), dy = p.lonlat[1] - cy;
        p.name = `${name} (${Math.abs(dy) > Math.abs(dx) ? (dy > 0 ? 'nord' : 'sud') : dx > 0 ? 'est' : 'ovest'})`;
      }
      continue;
    }
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

  for (const p of out.provinces) { delete p._region; delete p._town; delete p._lock; }
  log(`${tiny.size} province-simbolo (${[...tiny].map((k) => out.provinces[k].name).join(', ')})`);

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out));
  const owners = {};
  for (const p of out.provinces) owners[p.owner] = (owners[p.owner] || 0) + 1;
  log(`scritto ${OUT}: ${out.provinces.length} province, ${strList.length} stretti, ${(fs.statSync(OUT).size / 1024).toFixed(0)} KB`);
  log('province per nazione', JSON.stringify(owners));
}

main().catch((e) => { console.error(e); process.exit(1); });
