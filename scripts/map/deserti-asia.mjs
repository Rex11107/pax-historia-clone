// Deserti dell'Asia centrale (Cina, Mongolia) dalle ecoregioni RESOLVE 2017.
//
// Fonte: Dinerstein et al. 2017, "An Ecoregion-Based Approach to Protecting Half the Terrestrial Realm",
// Ecoregions 2017 © RESOLVE, CC BY 4.0. Shapefile a piena risoluzione dal repository
// BioHarmony-Foundation/BioRegionalApis (Git LFS).
//
// Le ecoregioni desertiche dei bacini (Taklamakan, Junggar, Qaidam, Alashan) comprendono anche la fascia
// di oasi ai loro piedi. Il deserto vero è il cuore: lo script
//   - restringe ogni ecoregione di E km dal bordo (le oasi stanno ai piedi dei monti);
//   - toglie un cerchio attorno alle oasi abitate nel 1881 e una fascia lungo le vie carovaniere storiche,
//     che restano transitabili (corridoio del Gansu, Hami–Anxi, Ejin Gol, fiume di Khotan, via meridionale
//     della seta, Korla–Lop Nor–Charkhlik, Gucheng–Kobdo, Fiume Giallo);
//   - divide l'Alashan lungo il confine della Mongolia esterna (a nord il Gobi) e i pezzi con più semi per
//     vicinanza (Badain Jaran / Tengger);
//   - smussa con un'apertura di R km e scarta i pezzi piccoli.
// Le steppe desertiche mongole (Gobi orientale, Valle dei Laghi, Grandi Laghi) restano transitabili:
// erano pascoli dei nomadi e la via del tè Kalgan–Urga le attraversava.
//
// Uso: node scripts/map/deserti-asia.mjs   (poi npm run map)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import * as turf from '@turf/turf';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const RAW = path.join(ROOT, 'data-raw/ecoregions');
const TMP = path.join(ROOT, 'data-raw/tmp');
const RITOCCHI = path.join(ROOT, 'scripts/map/ritocchi.geojson');
const URL_ECO = 'https://media.githubusercontent.com/media/BioHarmony-Foundation/BioRegionalApis/main/bioregions/data/Ecoregions2017';
const URL_ECO_RAW = 'https://raw.githubusercontent.com/BioHarmony-Foundation/BioRegionalApis/main/bioregions/data/Ecoregions2017';
const ECO = [808, 827, 835, 843]; // Alashan, Junggar, Qaidam, Taklimakan
const E = 40, R = 20, OASI = 35, MIN_PEZZO = 12000, MIN_RESTO = 15000;
const DESERTO = { Gobi: 'Gobi', Taklamakan: 'Taklamakan' };

// oasi e città abitate nel 1881 [lon, lat]
const OASI_1881 = [
  // Kashgaria
  [75.99, 39.47], [76.17, 38.93], [77.24, 38.42], [77.41, 37.89], [78.27, 37.62], [79.92, 37.11], [81.67, 36.85], [82.69, 37.07],
  [85.53, 38.14], [88.17, 39.02], [80.26, 41.17], [79.23, 41.21], [81.87, 41.79], [82.96, 41.72], [84.25, 41.77], [86.15, 41.76],
  [86.57, 42.06], [88.65, 42.79], [89.19, 42.95], [90.18, 42.86], [93.51, 42.83], [78.96, 39.79],
  // Dzungaria
  [87.62, 43.82], [87.3, 44.0], [86.2, 44.3], [84.9, 44.4], [82.9, 44.6], [89.6, 44.0], [87.98, 44.15], [89.18, 44.0], [93.0, 43.6],
  [82.98, 46.75], [88.1, 47.85], [87.5, 47.1],
  // Gansu, Ningxia, Alashan
  [94.66, 40.14], [95.77, 40.52], [97.04, 40.29], [98.29, 39.77], [98.49, 39.73], [99.82, 39.38], [100.45, 38.93], [101.08, 38.78],
  [101.97, 38.24], [102.64, 37.93], [103.08, 38.62], [102.9, 37.47], [105.19, 37.51], [106.27, 38.47], [105.67, 38.84], [106.38, 39.0],
  [101.07, 41.96], [98.9, 39.98],
  // Qaidam
  [98.09, 36.3], [96.47, 36.42], [97.6, 36.1],
];
// vie carovaniere [mezza larghezza km, tracciato]
const VIE = [
  [35, [[103.83, 36.06], [102.64, 37.93], [101.97, 38.24], [101.08, 38.78], [100.45, 38.93], [99.82, 39.38], [98.49, 39.73], [98.29, 39.77], [97.04, 40.29], [95.77, 40.52], [94.66, 40.14]]], // corridoio del Gansu
  [25, [[93.51, 42.83], [95.14, 41.8], [95.77, 40.52]]], // Hami–Anxi
  [25, [[98.9, 39.98], [99.6, 40.4], [100.3, 41.2], [101.07, 41.96], [101.5, 42.8]]], // Ejin Gol e la via verso la Mongolia
  [20, [[79.92, 37.11], [80.0, 38.3], [80.6, 39.5], [80.9, 40.5]]], // fiume di Khotan
  [30, [[105.19, 37.51], [106.27, 38.47], [106.38, 39.0], [107.0, 40.3], [107.4, 40.75], [109.84, 40.65]]], // Fiume Giallo
  [25, [[93.51, 42.83], [91.6, 42.9], [90.18, 42.86], [89.19, 42.95], [88.65, 42.79], [88.2, 42.2], [86.57, 42.06]]], // Hami–Turfan–Karashahr
  [20, [[79.92, 37.11], [81.67, 36.85], [82.69, 37.07], [85.53, 38.14], [88.17, 39.02]]], // via meridionale della seta
  [25, [[86.15, 41.76], [86.9, 41.0], [87.8, 40.5], [88.4, 39.9], [88.17, 39.02]]], // Korla–Lop Nor–Charkhlik
  [20, [[89.6, 44.0], [90.1, 45.0], [90.6, 45.9], [91.64, 48.0]]], // Gucheng–Kobdo
];
// valli che restano province transitabili: [nome, padrone, mezza larghezza km, tracciato, vie da cui si staccano (indici in VIE)]
const VALLI = [
  ['Ejin', 'CHI', 25, [[98.9, 39.98], [99.6, 40.4], [100.3, 41.2], [101.07, 41.96], [101.5, 42.8]], [0]], // Ejin Gol, oasi di Juyan
];
// semi: nome del deserto, punto, gruppo di deserti (DESERTO)
const SEMI = [
  ['Taklamakan', [83.0, 39.0], 'Taklamakan'],
  ['Taklamakan (ovest)', [78.0, 39.0], 'Taklamakan'],
  ['Deserto di Lop', [90.5, 40.2], 'Taklamakan'],
  ['Gurbantünggüt', [87.8, 45.3], 'Taklamakan'],
  ['Gobi dzungaro', [91.5, 44.6], 'Gobi'],
  ['Deserto del Qaidam', [93.5, 37.8], 'Taklamakan'],
  ['Gobi', [101.0, 43.3], 'Gobi'],
  ['Gobi', [106.8, 41.7], 'Gobi'], // la fascia della Mongolia Interna a nord del Fiume Giallo
  ['Gashun Gobi', [97.0, 41.3], 'Gobi'],
  ['Badain Jaran', [101.8, 40.4], 'Gobi'],
  ['Tengger', [104.3, 38.6], 'Gobi'],
];

const km2 = (f) => turf.area(f) / 1e6;
const parti = (g) => (!g ? [] : (g.geometry.type === 'Polygon' ? [g.geometry.coordinates] : g.geometry.coordinates).map((c) => turf.polygon(c)));
const arrotonda = (g) => JSON.parse(JSON.stringify(g, (k, v) => (typeof v === 'number' ? Math.round(v * 1e4) / 1e4 : v)));
const ms = (...args) => execFileSync(process.execPath, [path.join(ROOT, 'node_modules/mapshaper/bin/mapshaper'), ...args], { stdio: ['ignore', 'ignore', 'inherit'] });
const buf = (g, km) => g && turf.buffer(g, km, { units: 'kilometers', steps: 4 });
const meno = (a, b) => a && turf.difference(turf.featureCollection([a, b]));
const per = (a, b) => a && turf.intersect(turf.featureCollection([a, b]));

async function scarica() {
  fs.mkdirSync(RAW, { recursive: true });
  for (const [ext, base] of [['shp', URL_ECO], ['shx', URL_ECO_RAW], ['dbf', URL_ECO_RAW], ['prj', URL_ECO_RAW]]) {
    const f = path.join(RAW, `Ecoregions2017.${ext}`);
    if (fs.existsSync(f)) continue;
    const res = await fetch(`${base}.${ext}`);
    if (!res.ok) throw new Error(`Ecoregions2017 non raggiungibile (${res.status})`);
    fs.writeFileSync(f, Buffer.from(await res.arrayBuffer()));
  }
}

await scarica();
fs.mkdirSync(TMP, { recursive: true });
const fEco = path.join(TMP, 'eco_asia.geojson'), fMng = path.join(TMP, 'mongolia.geojson');
ms('-i', path.join(RAW, 'Ecoregions2017.shp'), '-filter', `${JSON.stringify(ECO)}.includes(ECO_ID)`, '-filter-fields', 'ECO_ID',
  '-simplify', 'interval=1500', 'keep-shapes', '-filter-islands', 'min-area=500km2', '-clean', '-o', 'format=geojson', 'precision=0.0001', fEco);
ms('-i', path.join(ROOT, 'data-raw/ne_admin1.geojson'), '-filter', 'adm0_a3==="MNG"', '-dissolve', '-o', 'format=geojson', 'geojson-type=FeatureCollection', 'precision=0.001', fMng);
const mongolia = JSON.parse(fs.readFileSync(fMng, 'utf8')).features[0];

const vie = turf.union(turf.featureCollection([
  ...OASI_1881.map((c) => turf.circle(c, OASI, { units: 'kilometers', steps: 24 })),
  ...VIE.map(([w, l]) => buf(turf.lineString(l), w)),
]));

// pezzi di deserto
let pezzi = [];
for (const f of JSON.parse(fs.readFileSync(fEco, 'utf8')).features) {
  let g = meno(buf(f, -E), vie);
  g = buf(buf(g, -R), R);
  g = meno(per(g, f), vie);
  // l'Alashan si divide lungo il confine della Mongolia esterna
  const tagli = f.properties.ECO_ID === 808 ? [per(g, mongolia), meno(g, mongolia)] : [g];
  for (const t of tagli) pezzi.push(...parti(t).filter((p) => km2(p) >= MIN_PEZZO));
}

// un nome per pezzo: i semi che ci cadono dentro; con più semi il pezzo si divide per vicinanza
const nuovi = [];
const dentro = (p, s) => turf.booleanPointInPolygon(turf.point(s[1]), p);
const vicino = (p) => SEMI.map((s) => [s, turf.distance(turf.pointOnFeature(p), turf.point(s[1]))]).sort((a, b) => a[1] - b[1])[0][0];
for (const p of pezzi) {
  let qui = SEMI.filter((s) => dentro(p, s));
  if (!qui.length) qui = [vicino(p)];
  if (qui.length === 1) { nuovi.push([qui[0], p]); continue; }
  const bb = turf.bbox(p);
  const celle = turf.voronoi(turf.featureCollection(qui.map((s) => turf.point(s[1], { s }))), { bbox: [bb[0] - 1, bb[1] - 1, bb[2] + 1, bb[3] + 1] });
  celle.features.forEach((c, i) => { for (const q of parti(per(p, c))) if (km2(q) >= MIN_PEZZO) nuovi.push([qui[i], q]); });
}
// un deserto per nome: il pezzo più grande; gli altri restano terra transitabile
// (i pezzi con lo stesso nome che si toccano, come il Gobi ai due lati del confine mongolo, si uniscono)
const perNome = new Map();
for (const [s, p] of nuovi) perNome.set(s[0], [s, perNome.has(s[0]) ? turf.union(turf.featureCollection([perNome.get(s[0])[1], p])) : p]);
for (const [n, [s, u]] of perNome) {
  const ps = parti(u).sort((a, b) => km2(b) - km2(a));
  for (const q of ps.slice(1)) console.log(`scartato un pezzo di ${n} (${Math.round(km2(q))} km², ${turf.pointOnFeature(q).geometry.coordinates.map((v) => v.toFixed(1))})`);
  perNome.set(n, [s, ps[0]]);
}
const feats = [...perNome.values()].map(([s, p]) => {
  console.log(`${s[0]}: ${Math.round(km2(p))} km²`);
  return { type: 'Feature', properties: { name: s[0], owner: '', deserto: s[2], oasi: false, minResto: MIN_RESTO, fonte: 'Ecoregions2017' }, geometry: arrotonda(p.geometry) };
});
// le valli che attraversano i deserti restano province: senza, la provincia generata che le contiene perde più
// dell'80% della terra e viene assorbita dal deserto più vicino, che si mangia la valle
for (const [name, owner, w, linea, tranne] of VALLI) {
  let g = buf(turf.lineString(linea), w);
  for (const t of tranne) g = meno(g, buf(turf.lineString(VIE[t][1]), VIE[t][0]));
  g = meno(g, mongolia);
  const p = parti(g).sort((a, b) => km2(b) - km2(a))[0];
  console.log(`${name} (valle): ${Math.round(km2(p))} km²`);
  feats.push({ type: 'Feature', properties: { name, owner, deserto: null, oasi: false, minResto: MIN_RESTO, fonte: 'Ecoregions2017' }, geometry: arrotonda(p.geometry) });
}

// sostituzione in ritocchi.geojson: i nuovi deserti prendono il posto dei vecchi poligoni del Gobi e del Taklamakan
const fc = JSON.parse(fs.readFileSync(RITOCCHI, 'utf8'));
const vecchio = (f) => f.geometry.type !== 'Point' && !f.properties.regione && (Object.values(DESERTO).includes(f.properties.deserto) || f.properties.fonte === 'Ecoregions2017'); // quelli con `regione` sono di deserti-mondo.mjs
const at = fc.features.findIndex(vecchio);
const resto = fc.features.filter((f) => !vecchio(f));
const i = at < 0 ? resto.length : fc.features.slice(0, at).filter((f) => !vecchio(f)).length;
fc.features = [...resto.slice(0, i), ...feats, ...resto.slice(i)];
fs.writeFileSync(RITOCCHI, JSON.stringify(fc).replace(/,\{"type":"Feature"/g, ',\n{"type":"Feature"'));
console.log(`ritocchi.geojson: ${feats.length} forme dell'Asia centrale (deserti e valli) da Ecoregions2017`);
