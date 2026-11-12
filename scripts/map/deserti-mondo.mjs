// Deserti delle Americhe, dell'Asia sud-occidentale e dell'Africa australe dalle ecoregioni RESOLVE 2017.
//
// Fonte: Dinerstein et al. 2017, Ecoregions 2017 © RESOLVE, CC BY 4.0 (vedi deserti-asia.mjs per il download).
// Stesso metodo dei deserti di Cina e Mongolia: ogni ecoregione si restringe di E km dal bordo, perde un cerchio
// attorno alle località abitate nel 1881 e una fascia lungo le vie storiche (che restano transitabili), si smussa
// con un'apertura di R km; i pezzi prendono il nome dai semi. Qui in più:
//   - una fascia di costa resta fuori (le coste dei deserti si percorrono: regola "deserto" di check-map);
//   - `soloSemi`: tiene solo i pezzi che contengono un seme (l'ecoregione dell'Ustyurt copre tutta la steppa
//     kazaka, quella del Kalahari anche le terre tswana);
//   - ogni seme ha anche la regione desertica (`deserto`), che la mappa mostra come nome e scritta;
//   - `sostituisce`: i vecchi poligoni disegnati a mano di cui questi prendono il posto.
// Restano transitabili per scelta storica: Great Basin (ferrovia transcontinentale dal 1869, miniere del Nevada,
// insediamenti mormoni), Chihuahua (ranch e pascoli), deserto siriaco (terra tribale beduina con la pretesa
// ottomana, percorsa dalle carovane Damasco–Baghdad).
//
// Uso: node scripts/map/deserti-mondo.mjs   (poi npm run map)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import * as turf from '@turf/turf';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const RAW = path.join(ROOT, 'data-raw/ecoregions');
const TMP = path.join(ROOT, 'data-raw/tmp');
const RITOCCHI = path.join(ROOT, 'scripts/map/ritocchi.geojson');
const MIN_PEZZO = 8000, MIN_RESTO = 15000, OASI = 30;

const REGIONI = [
  {
    // solo l'Atacama vera (Tarapacá e Antofagasta): la costa peruviana è deserto, ma le sue valli (Lima, Pisco, Ica,
    // Arequipa, Trujillo) erano le terre più abitate del paese, e il Sechura di Piura non resta dopo la fascia di costa
    // minResto 3000: i resti delle province mangiate sono strisce di costa (Taltal, Cobija), che restano transitabili
    key: 'americhe-sud', paesi: ['CHL', 'PER', 'BOL', 'ARG'], costa: 45, R: 15, soloSemi: true, minResto: 3000, // 45 km: con 25 la costa amministrativa non coincide con quella della mappa e il deserto tocca il mare
    eco: { 598: 12 }, // Atacama: stretta fra la cordigliera della costa e le Ande
    oasi: [
      // Tacna, Arica, Tarapacá, Litorale boliviano, Atacama cilena
      [-70.31, -18.48], [-70.25, -18.01], [-70.21, -19.6], [-70.14, -20.21], [-69.78, -20.26], [-69.7, -20.4], [-69.68, -20.98], [-70.2, -22.09],
      [-70.27, -22.56], [-68.93, -22.46], [-68.65, -22.34], [-68.2, -22.91], [-70.4, -23.65], [-70.45, -23.1], [-69.05, -23.0], [-70.48, -25.4],
      [-70.62, -26.35], [-70.82, -27.07], [-70.33, -27.37], [-70.27, -27.48], [-70.76, -28.58], [-71.22, -28.47],
      // villaggi delle quebradas di Tarapacá (la battaglia del 1879) e l'oasi di Pica
      [-69.51, -19.92], [-69.77, -19.99], [-69.43, -19.31], [-69.73, -18.83], [-69.33, -20.49],
      // Perù: valli della costa
      [-80.63, -5.19], [-81.11, -5.09], [-80.82, -5.56], [-79.84, -6.77], [-79.9, -6.7], [-79.75, -5.98], [-70.93, -17.19], [-71.34, -17.64],
      [-75.73, -14.07], [-76.2, -13.71], [-74.94, -14.83],
    ],
    vie: [
      [20, [[-70.31, -18.48], [-70.25, -18.01]]], // ferrovia Arica–Tacna
      [25, [[-70.21, -19.6], [-69.95, -19.8], [-69.78, -20.26], [-69.7, -20.4], [-69.68, -20.98]]], // Pampa del Tamarugal, i nitrati
      [20, [[-70.14, -20.21], [-69.78, -20.26]]], // Iquique–Pozo Almonte
      [25, [[-70.4, -23.65], [-70.2, -23.6], [-69.05, -23.0], [-68.93, -22.46], [-68.2, -22.91]]], // Antofagasta–Caracoles–Calama–San Pedro
      [20, [[-70.27, -22.56], [-69.5, -22.5], [-68.93, -22.46]]], // Cobija–Calama, la via boliviana verso Potosí
      [20, [[-68.93, -22.46], [-68.4, -21.6], [-68.0, -21.2]]], // Calama–Ascotán verso l'altipiano
      [20, [[-70.82, -27.07], [-70.33, -27.37], [-70.1, -27.8]]], // ferrovia Caldera–Copiapó e la valle
      [20, [[-81.11, -5.09], [-80.63, -5.19], [-80.3, -5.9], [-79.84, -6.77]]], // Paita–Piura–Chiclayo, il camino real
    ],
    semi: [['Deserto di Atacama', [-69.6, -25.3], 'Atacama'], ['Deserto di Tarapacá', [-69.3, -21.5], 'Atacama']],
  },
  {
    // solo i pezzi con un seme: quello sulla costa di Hermosillo (capitale di Sonora) resta terra transitabile
    key: 'americhe-nord', paesi: ['USA', 'MEX'], costa: 45, R: 15, soloSemi: true, minResto: 3000, // i resti sulla costa del golfo restano transitabili // 45 km: alla foce del Colorado le piane di marea sono terra nei dati amministrativi
    eco: { 435: 25, 433: 20, 426: 12 }, // Sonora, Mojave, Bassa California
    oasi: [
      [-110.97, 32.22], [-114.62, 32.69], [-112.07, 33.45], [-111.39, 33.03], [-112.0, 33.1], [-112.72, 32.95], [-114.52, 33.6], [-114.6, 35.0],
      [-110.96, 29.07], [-110.9, 27.92], [-111.83, 30.71], [-112.15, 30.72], [-110.39, 29.43], [-110.96, 30.63], [-112.86, 31.86],
      [-117.29, 34.1], [-117.31, 34.07], [-116.88, 33.93], [-116.22, 33.72], [-116.86, 34.95], [-116.89, 34.86], [-113.58, 37.1], [-114.45, 37.93],
      [-115.14, 36.17], [-118.2, 36.8], [-118.4, 37.36], [-118.06, 36.6], [-117.8, 36.54],
      [-111.98, 26.89], [-112.9, 27.29], [-111.35, 26.01], [-115.72, 30.06], [-116.6, 31.87], [-116.3, 32.0],
    ],
    vie: [
      [25, [[-117.31, 34.07], [-116.88, 33.93], [-116.22, 33.72], [-115.5, 33.0], [-114.62, 32.69], [-113.6, 32.9], [-112.72, 32.95], [-112.0, 33.1], [-111.39, 33.03], [-110.97, 32.22]]], // Southern Pacific (1877-1880)
      [25, [[-114.62, 32.69], [-114.52, 33.6], [-114.35, 34.3], [-114.6, 35.0]]], // fiume Colorado, i battelli di Yuma
      [25, [[-117.29, 34.1], [-117.45, 34.3], [-117.0, 34.6], [-116.89, 34.86], [-116.2, 35.3], [-115.14, 36.17], [-114.4, 36.7], [-113.58, 37.1]]], // strada mormone (Old Spanish Trail)
      [25, [[-118.2, 34.6], [-118.0, 35.6], [-118.06, 36.6], [-118.4, 37.36]]], // valle dell'Owens
      [20, [[-110.96, 29.07], [-110.9, 27.92]]], // Hermosillo–Guaymas
      [20, [[-110.96, 29.07], [-110.96, 30.63], [-110.94, 31.33], [-110.97, 32.22]]], // camino real di Sonora
      [20, [[-111.83, 30.71], [-112.15, 30.72], [-112.86, 31.86]]], // Altar–Caborca–Sonoyta
      [25, [[-116.6, 31.87], [-115.72, 30.06], [-114.7, 29.3], [-113.5, 28.0], [-112.9, 27.29], [-111.98, 26.89], [-111.35, 26.01]]], // camino real della Bassa California
    ],
    semi: [['Papaguería', [-112.4, 31.9], 'Sonora'], ['Deserto del Colorado', [-115.3, 32.7], 'Sonora'], ['Gran Desierto', [-113.9, 32.0], 'Sonora'],
      ['Deserto del Mojave', [-116.0, 35.0], 'Mojave'], ['Valle della Morte', [-116.9, 36.4], 'Mojave'], ['Vizcaíno', [-113.9, 27.8], 'Bassa California']],
  },
  {
    // minResto 2000: il resto di Jaisalmer (la città con la strada di Jodhpur) resta una provincia, non va al Thar
    key: 'asia-ovest', paesi: ['IND', 'PAK', 'KAZ', 'UZB', 'TKM'], costa: 25, R: 15, soloSemi: true, minResto: 2000,
    eco: { 318: 30, 817: 20 }, // Thar; deserto settentrionale dell'Asia centrale (solo l'Ustyurt)
    oasi: [
      [70.91, 26.91], [73.31, 28.02], [73.02, 26.24], [71.39, 25.75], [72.36, 27.13], [71.92, 26.92], [69.74, 25.36], [71.68, 29.4], [68.76, 27.53],
      [68.86, 27.7], [68.37, 25.39], [74.97, 28.3], [73.73, 27.2], [75.72, 29.15], [75.03, 29.53], [74.03, 30.4], [69.8, 24.74], [72.24, 25.83], [71.26, 29.14],
      [58.9, 43.07], [59.45, 42.4], [60.36, 41.38], [59.78, 42.94], [50.27, 44.52], [52.97, 40.0],
    ],
    vie: [
      [25, [[70.36, 28.95], [68.86, 27.7], [67.87, 26.42], [68.37, 25.39], [67.92, 24.75]]], // Indo
      [25, [[74.61, 30.92], [74.03, 30.4], [71.68, 29.4], [70.36, 28.95]]], // Sutlej e Panjnad
      [20, [[73.02, 26.24], [72.24, 25.83], [71.39, 25.75], [69.74, 25.36], [68.37, 25.39]]], // Marwar–Sind
      [20, [[73.02, 26.24], [72.36, 27.13], [71.92, 26.92], [70.91, 26.91]]], // Jodhpur–Jaisalmer
      [20, [[73.31, 28.02], [73.73, 27.2], [73.02, 26.24]]], // Bikaner–Nagaur–Jodhpur
      [20, [[73.31, 28.02], [74.97, 28.3], [75.72, 29.15]]], // Bikaner–Churu–Hissar
    ],
    semi: [['Thar', [71.0, 26.6], 'Thar'], ['Cholistan', [71.8, 28.4], 'Thar'], ['Ustyurt', [56.0, 43.6], 'Ustyurt']],
  },
  {
    // solo il Namib: l'ecoregione del Kalahari (savana xerica) prende anche i pascoli herero del Damaraland e il
    // Griqualand Ovest con Kimberley; resta il Kalahari disegnato a mano e approvato (PR #17)
    key: 'africa-sud', paesi: ['NAM', 'ZAF', 'BWA', 'AGO'], costa: 25, R: 15, soloSemi: true,
    eco: { 103: 0 }, // Namib (stretto: solo la fascia di costa resta fuori)
    oasi: [
      [21.7, -21.7], [21.82, -23.97], [23.43, -27.45], [21.26, -28.45], [26.5, -23.0], [25.5, -24.4], [25.33, -24.98], [23.0, -20.37], [18.97, -22.45],
      [20.0, -26.75], [22.4, -26.05], [14.5, -22.95], [15.16, -26.65], [17.16, -26.5], [16.13, -22.35], [17.08, -23.32], [17.08, -22.57],
    ],
    vie: [
      [25, [[23.43, -27.45], [25.33, -24.98], [25.5, -24.4], [26.5, -23.0]]], // strada dei missionari Kuruman–Shoshong
      [20, [[26.5, -23.0], [25.4, -22.4], [24.0, -21.0], [23.0, -20.37]]], // Shoshong–lago Ngami
      [20, [[18.97, -22.45], [21.7, -21.7], [23.0, -20.37]]], // Gobabis–Ghanzi–Ngami, la via della sete
      [20, [[14.5, -22.95], [15.3, -22.9], [16.13, -22.35]]], // Baaiweg Walvis Bay–Otjimbingwe
      [20, [[15.16, -26.65], [16.27, -26.66], [17.16, -26.5]]], // Angra Pequena–Bethanien
    ],
    semi: [['Namib', [15.3, -24.5], 'Namib']],
  },
];

const km2 = (f) => turf.area(f) / 1e6;
const parti = (g) => (!g ? [] : (g.geometry.type === 'Polygon' ? [g.geometry.coordinates] : g.geometry.coordinates).map((c) => turf.polygon(c)));
const arrotonda = (g) => JSON.parse(JSON.stringify(g, (k, v) => (typeof v === 'number' ? Math.round(v * 1e4) / 1e4 : v)));
const ms = (...args) => execFileSync(process.execPath, [path.join(ROOT, 'node_modules/mapshaper/bin/mapshaper'), ...args], { stdio: ['ignore', 'ignore', 'inherit'] });
const buf = (g, km) => g && turf.buffer(g, km, { units: 'kilometers', steps: 4 });
const meno = (a, b) => a && b ? turf.difference(turf.featureCollection([a, b])) : a;
const per = (a, b) => a && b ? turf.intersect(turf.featureCollection([a, b])) : null;

if (!fs.existsSync(path.join(RAW, 'Ecoregions2017.shp'))) throw new Error('manca data-raw/ecoregions: lancia prima node scripts/map/deserti-asia.mjs');
fs.mkdirSync(TMP, { recursive: true });
const solo = process.argv[2]; // una regione sola, per le prove
const feats = [];
for (const reg of REGIONI.filter((r) => !solo || r.key === solo)) {
  const fEco = path.join(TMP, `eco_${reg.key}.geojson`), fTerra = path.join(TMP, `terra_${reg.key}.geojson`);
  ms('-i', path.join(RAW, 'Ecoregions2017.shp'), '-filter', `${JSON.stringify(Object.keys(reg.eco).map(Number))}.includes(ECO_ID)`, '-filter-fields', 'ECO_ID',
    '-simplify', 'interval=1500', 'keep-shapes', '-filter-islands', 'min-area=500km2', '-clean', '-o', 'format=geojson', 'precision=0.0001', fEco);
  // la terraferma solo attorno all'ecoregione: la fascia di costa su tutti gli Stati Uniti e il Messico esaurisce la memoria
  const bb = turf.bbox(JSON.parse(fs.readFileSync(fEco, 'utf8')));
  ms('-i', path.join(ROOT, 'data-raw/ne_admin1.geojson'), '-filter', `${JSON.stringify(reg.paesi)}.includes(adm0_a3)`, '-clip', `bbox=${[bb[0] - 3, bb[1] - 3, bb[2] + 3, bb[3] + 3].join(',')}`,
    '-dissolve', '-filter-islands', 'min-area=2000km2', '-o', 'format=geojson', 'geojson-type=FeatureCollection', 'precision=0.001', fTerra);
  const terra = JSON.parse(fs.readFileSync(fTerra, 'utf8')).features[0];
  const interno = buf(terra, -reg.costa);
  const vie = turf.union(turf.featureCollection([
    ...reg.oasi.map((c) => turf.circle(c, OASI, { units: 'kilometers', steps: 24 })),
    ...reg.vie.map(([w, l]) => buf(turf.lineString(l), w)),
  ]));
  const dentro = (p, s) => turf.booleanPointInPolygon(turf.point(s[1]), p);
  const pezzi = [];
  for (const f of JSON.parse(fs.readFileSync(fEco, 'utf8')).features) {
    const E = reg.eco[f.properties.ECO_ID];
    let g = meno(E ? buf(f, -E) : f, vie);
    g = buf(buf(g, -reg.R), reg.R);
    g = meno(per(per(g, f), interno), vie);
    for (const p of parti(g)) if (km2(p) >= MIN_PEZZO && (!reg.soloSemi || reg.semi.some((s) => dentro(p, s)))) pezzi.push(p);
  }
  // un nome per pezzo come in deserti-asia.mjs: i semi dentro, divisi per vicinanza; un deserto per nome
  const vicino = (p) => reg.semi.map((s) => [s, turf.distance(turf.pointOnFeature(p), turf.point(s[1]))]).sort((a, b) => a[1] - b[1])[0][0];
  const nuovi = [];
  for (const p of pezzi) {
    let qui = reg.semi.filter((s) => dentro(p, s));
    if (!qui.length) qui = [vicino(p)];
    if (qui.length === 1) { nuovi.push([qui[0], p]); continue; }
    const bb = turf.bbox(p);
    const celle = turf.voronoi(turf.featureCollection(qui.map((s) => turf.point(s[1]))), { bbox: [bb[0] - 1, bb[1] - 1, bb[2] + 1, bb[3] + 1] });
    celle.features.forEach((c, i) => { for (const q of parti(per(p, c))) if (km2(q) >= MIN_PEZZO) nuovi.push([qui[i], q]); });
  }
  const perNome = new Map();
  const regioneDi = new Map(reg.semi.map((s) => [s[0], s[2]]));
  for (const [s, p] of nuovi) perNome.set(s[0], perNome.has(s[0]) ? turf.union(turf.featureCollection([perNome.get(s[0]), p])) : p);
  for (const [n, u] of perNome) {
    const ps = parti(u).sort((a, b) => km2(b) - km2(a));
    for (const q of ps.slice(1)) console.log(`${reg.key}: scartato un pezzo di ${n} (${Math.round(km2(q))} km², ${turf.pointOnFeature(q).geometry.coordinates.map((v) => v.toFixed(1))})`);
    console.log(`${reg.key}: ${n} ${Math.round(km2(ps[0]))} km²`);
    feats.push({ type: 'Feature', properties: { name: n, owner: '', deserto: regioneDi.get(n), oasi: false, minResto: reg.minResto ?? MIN_RESTO, fonte: 'Ecoregions2017', regione: reg.key }, geometry: arrotonda(ps[0].geometry) });
  }
}

// sostituzione in ritocchi.geojson: i deserti di queste regioni (e i vecchi poligoni che sostituiscono) vanno subito
// prima dei deserti dell'Asia centrale, cioè prima delle forme "zona" che fissano le province vicine
const chiavi = new Set(REGIONI.filter((r) => !solo || r.key === solo).map((r) => r.key));
const sostituiti = new Set(REGIONI.filter((r) => chiavi.has(r.key)).flatMap((r) => r.sostituisce ?? []));
const fc = JSON.parse(fs.readFileSync(RITOCCHI, 'utf8'));
const vecchio = (f) => f.geometry.type !== 'Point' && (chiavi.has(f.properties.regione) || (!f.properties.fonte && sostituiti.has(f.properties.deserto)));
const resto = fc.features.filter((f) => !vecchio(f));
let at = resto.findIndex((f) => f.properties.fonte === 'Ecoregions2017');
if (at < 0) at = resto.length;
fc.features = [...resto.slice(0, at), ...feats, ...resto.slice(at)];
fs.writeFileSync(RITOCCHI, JSON.stringify(fc).replace(/,\{"type":"Feature"/g, ',\n{"type":"Feature"'));
console.log(`ritocchi.geojson: ${feats.length} deserti da Ecoregions2017 (${[...chiavi].join(', ')})`);
