// Deserti australiani da IBRA 7 (Interim Biogeographic Regionalisation for Australia, versione 7).
//
// Fonte: © Commonwealth of Australia (Department of Climate Change, Energy, the Environment and Water),
// IBRA7 regions, CC BY 4.0. Copia dello shapefile nel repository dell'Atlas of Living Australia
// (AtlasOfLivingAustralia/ala-labs, posts/data/IBRA7_regions).
//
// Le bioregioni desertiche di IBRA sono la definizione ufficiale dei deserti australiani. Lo script le
// trasforma nei poligoni di ritocchi.geojson (proprietà deserto: "Australia"), sostituendo quelli che
// c'erano:
//   - semplificazione a 1,5 km (sotto la risoluzione della mappa);
//   - apertura morfologica (buffer -R e poi +R): spariscono le dita sottili e i ponti stretti, il bordo
//     resta quello vero; il risultato non esce mai dal contorno IBRA;
//   - una striscia di COSTA km lungo il mare resta fuori (le coste dei deserti si percorrono: regola
//     "deserto" di check-map);
//   - i pezzi staccati piccoli si scartano; il Simpson-Strzelecki, che l'apertura divide in due, dà
//     due deserti.
//
// Uso: node scripts/map/deserti-australia.mjs   (poi npm run map)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import * as turf from '@turf/turf';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const RAW = path.join(ROOT, 'data-raw/ibra');
const TMP = path.join(ROOT, 'data-raw/tmp');
const RITOCCHI = path.join(ROOT, 'scripts/map/ritocchi.geojson');
const URL_IBRA = 'https://raw.githubusercontent.com/AtlasOfLivingAustralia/ala-labs/main/posts/data/IBRA7_regions/ibra7_regions';
const R = 25; // km, raggio dell'apertura
const COSTA = 30; // km di costa lasciati transitabili
const MIN_PEZZO = 5000; // km², pezzi staccati più piccoli scartati

// codice IBRA -> nome in gioco; minResto: sotto questa soglia il resto di una provincia mangiata dal
// deserto resta al deserto (vedi ritocchi.mjs)
const DESERTI = {
  GSD: { name: 'Gran Deserto Sabbioso', minResto: 15000 },
  LSD: { name: 'Piccolo Deserto Sabbioso', minResto: 15000 },
  GID: { name: 'Deserto di Gibson', minResto: 15000 },
  GVD: { name: 'Gran Deserto Vittoria', minResto: 15000 },
  TAN: { name: 'Deserto di Tanami', minResto: 15000 },
  SSD: [{ name: 'Deserto di Simpson', minResto: 15000 }, { name: 'Deserto di Strzelecki', minResto: 15000 }],
};

const km2 = (f) => turf.area(f) / 1e6;
const parti = (g) => (g.geometry.type === 'Polygon' ? [g.geometry.coordinates] : g.geometry.coordinates).map((c) => turf.polygon(c));
const arrotonda = (g) => JSON.parse(JSON.stringify(g, (k, v) => (typeof v === 'number' ? Math.round(v * 1e4) / 1e4 : v)));
const ms = (...args) => execFileSync(process.execPath, [path.join(ROOT, 'node_modules/mapshaper/bin/mapshaper'), ...args], { stdio: ['ignore', 'ignore', 'inherit'] });

async function scarica() {
  fs.mkdirSync(RAW, { recursive: true });
  for (const ext of ['shp', 'shx', 'dbf', 'prj']) {
    const f = path.join(RAW, `ibra7_regions.${ext}`);
    if (fs.existsSync(f)) continue;
    const res = await fetch(`${URL_IBRA}.${ext}`);
    if (!res.ok) throw new Error(`IBRA7 non raggiungibile (${res.status})`);
    fs.writeFileSync(f, Buffer.from(await res.arrayBuffer()));
  }
}

await scarica();
fs.mkdirSync(TMP, { recursive: true });
const fIbra = path.join(TMP, 'ibra_deserti.geojson'), fTerra = path.join(TMP, 'australia_terra.geojson');
ms('-i', path.join(RAW, 'ibra7_regions.shp'), '-filter', `${JSON.stringify(Object.keys(DESERTI))}.includes(REG_CODE_7)`, '-filter-fields', 'REG_CODE_7',
  '-simplify', 'interval=1500', 'keep-shapes', '-filter-islands', 'min-area=200km2', '-clean', '-o', 'format=geojson', 'precision=0.0001', fIbra);
ms('-i', path.join(ROOT, 'data-raw/ne_admin1.geojson'), '-filter', 'adm0_a3==="AUS"', '-dissolve', '-filter-islands', 'min-area=5000km2',
  '-o', 'format=geojson', 'geojson-type=FeatureCollection', 'precision=0.001', fTerra);

const terra = JSON.parse(fs.readFileSync(fTerra, 'utf8')).features[0];
const interno = turf.buffer(terra, -COSTA, { units: 'kilometers', steps: 4 });
const nuovi = [];
for (const f of JSON.parse(fs.readFileSync(fIbra, 'utf8')).features) {
  const code = f.properties.REG_CODE_7;
  let g = turf.buffer(turf.buffer(f, -R, { units: 'kilometers', steps: 4 }), R, { units: 'kilometers', steps: 4 });
  g = turf.intersect(turf.featureCollection([g, f]));
  g = turf.intersect(turf.featureCollection([g, interno]));
  const pezzi = parti(g).filter((p) => km2(p) >= MIN_PEZZO).sort((a, b) => turf.centroid(b).geometry.coordinates[1] - turf.centroid(a).geometry.coordinates[1]);
  const defs = Array.isArray(DESERTI[code]) ? DESERTI[code] : [DESERTI[code]];
  // un nome per pezzo (da nord a sud); se i nomi sono meno dei pezzi, i pezzi in più restano al deserto più grande
  const usati = defs.length === 1 ? [pezzi.length === 1 ? pezzi[0] : turf.multiPolygon(pezzi.sort((a, b) => km2(b) - km2(a)).slice(0, 1).map((p) => p.geometry.coordinates))] : pezzi.slice(0, defs.length);
  if (defs.length === 1 && pezzi.length > 1) console.log(`${code}: scartati ${pezzi.length - 1} pezzi staccati (${pezzi.slice(1).map((p) => Math.round(km2(p))).join(', ')} km²)`);
  usati.forEach((p, i) => {
    const d = defs[i];
    const geom = p.geometry.type === 'MultiPolygon' && p.geometry.coordinates.length === 1 ? { type: 'Polygon', coordinates: p.geometry.coordinates[0] } : p.geometry;
    nuovi.push({ type: 'Feature', properties: { name: d.name, owner: 'GBR', deserto: 'Australia', oasi: false, minResto: d.minResto, fonte: `IBRA7 ${code}` }, geometry: arrotonda(geom) });
    console.log(`${d.name}: ${Math.round(km2(p))} km² (IBRA ${code} ${Math.round(km2(f))} km²)`);
  });
}

// sostituzione in ritocchi.geojson: i nuovi deserti prendono il posto dei vecchi poligoni australiani
const fc = JSON.parse(fs.readFileSync(RITOCCHI, 'utf8'));
const vecchio = (f) => f.geometry.type !== 'Point' && f.properties.deserto === 'Australia';
const at = fc.features.findIndex(vecchio);
const resto = fc.features.filter((f) => !vecchio(f));
fc.features = [...resto.slice(0, at < 0 ? resto.length : at), ...nuovi, ...resto.slice(at < 0 ? resto.length : at)];
fs.writeFileSync(RITOCCHI, JSON.stringify(fc, null, 0).replace(/,\{"type":"Feature"/g, ',\n{"type":"Feature"'));
console.log(`ritocchi.geojson: ${nuovi.length} deserti australiani da IBRA7`);
