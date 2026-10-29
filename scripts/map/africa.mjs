// Estensione della mappa: Africa e penisola arabica fuori dal rettangolo europeo.
// Fase 1 — province storiche e regni: atomi = suddivisioni moderne (Natural Earth admin-1) ∩ stati del 1880
// (world_1880) ∩ oasi e valli; le unità troppo grandi divise per k-medie; poi accorpamento dentro lo stesso
// stato d'epoca e paese moderno fino a una dimensione che dipende dalla densità del 1880.
// Le province europee non vengono toccate: i pezzi africani si cuciono a quelle sul 27° parallelo.
import fs from 'node:fs';
import path from 'node:path';
import * as turf from '@turf/turf';
import * as topojson from 'topojson-client';
import { AF_DETAIL_MODERN, AF_DETAIL_REGIONS, AF_DESERT_NAMES, AF_ARID, AF_CLIP, AF_EXCLUDE, AF_HIST, AF_LAKES, AF_NULL_REGION, AF_OASES, AF_OVERRIDES, AF_POP, AF_REGION, AF_SIZE, AF_TOWNS, AF_VALLEYS, AF_ANACHRONISTIC } from './africa-config.mjs';

const readJSON = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const km2 = (f) => turf.area(f) / 1e6;
const DESERT_T = 260000;

// nomi delle forme del terreno per le province del deserto
const LANDFORM_IT = { 'NUBIAN DESERT': 'Deserto nubiano', 'LIBYAN DESERT': 'Deserto libico', 'RUB’ AL KHALI': 'Rub al-Khali', 'Ténéré': 'Teneré', 'Erg du Ténéré': 'Teneré', 'Tanezrouft': 'Tanezruft',
  'Grand Erg de Bilma': 'Erg di Bilma', 'Majâbat al Koubrâ': 'Mreyé', 'Tassili-n-Ajjer': 'Tassili', 'Ahaggar': 'Hoggar', 'Tibesti Mts.': 'Tibesti', 'Aïr Mts.': 'Aïr', 'Adrar des Ifoghas': 'Adrar degli Ifoghas',
  'Eastern Desert': 'Deserto orientale', 'WESTERN DESERT': 'Deserto occidentale', 'Ad Dahna': 'Dahna', 'Sarïr Kalanshiyu ar Ramli al Kabi': 'Sarir Calanscio', 'Ramlat as Sab‘atayn': 'Ramlat as-Sabatayn',
  'Erg Chech': 'Erg Chech', '‘Erg Chech': 'Erg Chech', 'Erg Iguidi': 'Erg Iguidi', '‘Erg Iguidi': 'Erg Iguidi', 'Hamada du Draa': 'Hamada del Draa', 'Djourab': 'Giurab', 'Erg du Djourab': 'Giurab',
  'Sahara al Hijarah': 'Hammada', 'Bayyudah Desert': 'Deserto di Bayuda', 'Hamadat Tinghert': 'Hamada di Tinrhert', 'Massif de l\'Ennedi': 'Ennedi' };

const cleanName = (n) => String(n || '?').replace(/^(Région|Region|Province|Provincia|Governatorato) (de |du |di |del |della |of |)/i, '').replace(/ (Region|Province|State)$/i, '').trim();

/**
 * Costruisce i pezzi africani già raggruppati.
 * @returns {{ pieces: object[], infos: object[] }} pieces: feature con properties.g (indice locale in infos)
 */
export function buildAfrica({ ms, RAW, TMP, BBOX, log, geoCities }) {
  const D = path.join(TMP, 'af');
  fs.mkdirSync(D, { recursive: true });
  const P = (n) => path.join(D, n);
  const erase = `bbox=${BBOX.join(',')}`;
  const excl = JSON.stringify(AF_EXCLUDE);

  // 1. livelli: suddivisioni moderne, stati d'epoca, laghi
  fs.writeFileSync(P('lakes.geojson'), JSON.stringify(turf.featureCollection(readJSON(path.join(RAW, 'ne_10m_lakes.geojson')).features.filter((f) => AF_LAKES.includes(f.properties.name)).map((f) => ({ ...f, properties: {} })))));
  ms(path.join(RAW, 'ne_admin1.geojson'), '-filter', `!${excl}.includes(adm0_a3) && !(adm0_a3 == 'FRA' && iso_3166_2 == 'FR-GF')`, '-clip', `bbox=${AF_CLIP.join(',')}`, '-erase', erase,
    '-each', 'pid=adm1_code, iso=iso_3166_2, pname=name_it || name_en || name, modern=adm0_a3', '-filter-fields', 'pid,iso,pname,modern',
    '-simplify', 'interval=800', 'keep-shapes', '-erase', P('lakes.geojson'), '-filter', 'this.area > 2e6', '-o', P('adm.geojson'));
  ms(path.join(RAW, 'world_1880.geojson'), '-clip', `bbox=${AF_CLIP.join(',')}`, '-erase', erase, '-each', 'hist=NAME', '-filter-fields', 'hist', '-o', P('hist.geojson'));

  // oasi (cerchi) e valli fluviali (fasce lungo il fiume), tassellate a 1° per non confondere l'unione
  const rivers = readJSON(path.join(RAW, 'ne_10m_rivers_lake_centerlines.geojson')).features;
  const cuts = [];
  let valleyAll = null;
  for (const v of AF_VALLEYS) {
    for (const f of rivers) {
      const nm = f.properties.name_en || f.properties.name;
      if (!v.names.includes(nm)) continue;
      const lines = (f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.coordinates).map((l) => l.filter(([, y]) => y >= v.minLat && y <= v.maxLat)).filter((l) => l.length > 1);
      for (const l of lines) {
        const b = turf.buffer(turf.lineString(l), v.km, { units: 'kilometers', steps: 3 });
        valleyAll = valleyAll ? turf.union(turf.featureCollection([valleyAll, b])) : b;
      }
    }
  }
  const tile = (big, props) => {
    const bb = turf.bbox(big);
    for (let x = Math.floor(bb[0]); x < bb[2]; x++) for (let y = Math.floor(bb[1]); y < bb[3]; y++) {
      const part = turf.intersect(turf.featureCollection([big, turf.bboxPolygon([x, y, x + 1, y + 1])]));
      if (part) cuts.push({ ...part, properties: props });
    }
  };
  if (valleyAll) tile(valleyAll, { valley: 1 });
  for (const o of AF_OASES) {
    let c = turf.circle(o.at, o.r, { units: 'kilometers', steps: 24 });
    if (valleyAll) c = turf.difference(turf.featureCollection([c, valleyAll])) || null;
    if (c) cuts.push({ ...c, properties: { oasis: o.name } });
  }
  fs.writeFileSync(P('cuts.geojson'), JSON.stringify(turf.featureCollection(cuts)));
  // zona di dettaglio: bacini di HydroBASINS livello 6 dentro i paesi della fase in corso
  const detailSet = new Set(AF_DETAIL_MODERN);
  ms(P('adm.geojson'), '-filter', `${JSON.stringify(AF_DETAIL_MODERN)}.includes(modern)`, '-dissolve', '-o', P('detail_land.geojson'));
  ms(path.join(RAW, 'hydro', 'hybas_af_lev06_v1c.shp'), '-clip', P('detail_land.geojson'), '-each', 'bas=HYBAS_ID', '-filter-fields', 'bas', '-o', P('basins.geojson'));
  ms('-i', P('adm.geojson'), P('hist.geojson'), P('cuts.geojson'), P('basins.geojson'), 'combine-files', 'snap', 'snap-interval=0.0005', '-union', 'target=adm,hist,cuts,basins',
    '-filter', 'pid != null', 'remove-empty', '-explode', '-o', P('u.geojson'));

  // 2. proprietari
  const u = readJSON(P('u.geojson')).features.filter((f) => f.geometry);
  const inBox = ([x, y], b) => x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3];
  let A = u.map((f) => {
    const pr = f.properties;
    const hist = pr.hist ?? 'null';
    if (AF_HIST[hist] === undefined) throw new Error(`stato africano senza tag: ${hist}`);
    return { f, pid: pr.pid, iso: pr.iso, pname: pr.pname, modern: pr.modern, hist, owner: AF_HIST[hist], oasis: pr.oasis || null, valley: !!pr.valley, area: km2(f), c: turf.centroid(f).geometry.coordinates, detail: detailSet.has(pr.modern) };
  }).filter((a) => a.area > 0.5);
  for (const a of A) for (const o of AF_OVERRIDES) {
    if (o.modern && o.modern !== a.modern) continue;
    if (o.iso && !o.iso.includes(a.iso)) continue;
    if (o.from !== undefined && o.from !== a.owner) continue;
    if (o.box && !inBox(a.c, o.box)) continue;
    a.owner = o.to;
  }
  // schegge di confine: il dataset 1880 e le suddivisioni moderne non combaciano al metro
  const byPid = new Map();
  for (const a of A) { const m = byPid.get(a.pid) || { tot: 0, own: {} }; m.tot += a.area; m.own[a.owner] = (m.own[a.owner] || 0) + a.area; byPid.set(a.pid, m); }
  let sl = 0;
  for (const a of A) {
    if (a.oasis) continue;
    const m = byPid.get(a.pid);
    const top = Object.entries(m.own).sort((x, y) => y[1] - x[1])[0];
    if (top[0] !== a.owner && (m.own[a.owner] / m.tot < 0.2 && a.area < 4000)) { a.owner = top[0]; sl++; }
  }
  for (const a of A) if (a.oasis) { const o = AF_OASES.find((x) => x.name === a.oasis); if (o.owner !== undefined && o.owner !== null) a.owner = o.owner; }
  log(`Africa: ${A.length} atomi, ${sl} schegge riassegnate`);

  // densità del 1880 per paese moderno -> dimensione bersaglio delle province
  const modArea = new Map();
  for (const a of A) modArea.set(a.modern, (modArea.get(a.modern) || 0) + a.area);
  const EXTRA = { EGY: 1_300_000, SDN: 5_600_000, SDS: 1_600_000, ERI: 400_000, SOL: 300_000, SAU: 1_400_000, YEM: 2_400_000, QAT: 20_000, LBY: 60_000 };
  const dens = (m) => ((AF_POP[m] || 0) + (EXTRA[m] || 0)) / Math.max(1, modArea.get(m) || 1);
  const targetOf = (a) => Math.min(200000, Math.max(22000, 56000 * Math.sqrt(20 / Math.max(0.05, dens(a.modern))))) * (AF_SIZE[a.modern] ?? 1);

  // 3. divisione delle unità grandi: k-medie su una griglia di punti interni, celle di Voronoi
  const split = [];
  for (const a of A) {
    const T = targetOf(a);
    const k = a.oasis ? 1 : a.detail ? Math.round(a.area / Math.max(T, 60000)) : Math.round(a.area / T);
    if (k < 2) { split.push(a); continue; }
    const bb = turf.bbox(a.f);
    const step = Math.sqrt(a.area / (k * 60)) / 111;
    const pts = [];
    for (let x = bb[0] + step / 2; x < bb[2]; x += step) for (let y = bb[1] + step / 2; y < bb[3]; y += step) if (turf.booleanPointInPolygon([x, y], a.f)) pts.push([x * Math.cos((y * Math.PI) / 180), y, x]);
    if (pts.length < k * 3) { split.push(a); continue; }
    // centri iniziali: il punto più lontano dai già scelti (deterministico)
    const cs = [pts[0]];
    while (cs.length < k) { let best = null, bd = -1; for (const p of pts) { const d = Math.min(...cs.map((c) => (c[0] - p[0]) ** 2 + (c[1] - p[1]) ** 2)); if (d > bd) { bd = d; best = p; } } cs.push(best); }
    let C = cs.map((c) => [c[0], c[1]]);
    for (let it = 0; it < 25; it++) {
      const sum = C.map(() => [0, 0, 0]);
      for (const p of pts) { let bi = 0, bd = Infinity; C.forEach((c, i) => { const d = (c[0] - p[0]) ** 2 + (c[1] - p[1]) ** 2; if (d < bd) { bd = d; bi = i; } }); sum[bi][0] += p[0]; sum[bi][1] += p[1]; sum[bi][2]++; }
      C = C.map((c, i) => (sum[i][2] ? [sum[i][0] / sum[i][2], sum[i][1] / sum[i][2]] : c));
    }
    const seeds = turf.featureCollection(C.map(([x, y]) => turf.point([x / Math.cos((y * Math.PI) / 180), y])));
    const vor = turf.voronoi(seeds, { bbox: [bb[0] - 1, bb[1] - 1, bb[2] + 1, bb[3] + 1] });
    let n = 0;
    for (const cell of vor.features) {
      if (!cell) continue;
      const part = turf.intersect(turf.featureCollection([a.f, cell]));
      if (!part) continue;
      for (const poly of part.geometry.type === 'Polygon' ? [part.geometry.coordinates] : part.geometry.coordinates) {
        const f = turf.polygon(poly);
        const ar = km2(f);
        if (ar < 0.5) continue;
        split.push({ ...a, f, area: ar, c: turf.centroid(f).geometry.coordinates, sub: n++ });
      }
    }
  }
  A = split;
  A.forEach((a, i) => { a.i = i; a.f = { type: 'Feature', geometry: a.f.geometry, properties: { i } }; });
  fs.writeFileSync(P('atoms.geojson'), JSON.stringify(turf.featureCollection(A.map((a) => a.f))));
  ms('-i', P('atoms.geojson'), 'snap', 'snap-interval=0.00002', '-o', 'format=topojson', P('atoms.topo.json'));
  const topo = readJSON(P('atoms.topo.json'));
  const geoms = topo.objects[Object.keys(topo.objects)[0]].geometries;
  // archi: lunghezza e chi li usa
  const tf = topo.transform;
  const arcs = topo.arcs.map((arc) => { let x = 0, y = 0; return arc.map(([dx, dy]) => { if (tf) { x += dx; y += dy; return [x * tf.scale[0] + tf.translate[0], y * tf.scale[1] + tf.translate[1]]; } return [dx, dy]; }); });
  const alen = arcs.map((arc) => (arc.length > 1 ? turf.length(turf.lineString(arc)) : 0));
  const use = arcs.map(() => []);
  const walk = (g, cb) => { const rec = (x) => (typeof x === 'number' ? cb(x) : x.forEach(rec)); if (g.arcs) rec(g.arcs); };
  geoms.forEach((g) => walk(g, (a) => use[a < 0 ? ~a : a].push(g.properties.i)));
  const shared = A.map(() => new Map()), perim = A.map(() => 0);
  use.forEach((us, ai) => {
    for (const i of us) perim[i] += alen[ai];
    if (us.length === 2 && us[0] !== us[1]) { const [x, y] = us; shared[x].set(y, (shared[x].get(y) || 0) + alen[ai]); shared[y].set(x, (shared[y].get(x) || 0) + alen[ai]); }
  });
  log(`Africa: ${A.length} atomi dopo la divisione`);

  // 4. deserto: dentro i grandi deserti di Natural Earth e quasi senza località (GeoNames)
  const arid = readJSON(path.join(RAW, 'ne_10m_geography_regions_polys.geojson')).features.filter((f) => f.properties.FEATURECLA === 'Desert' && [...AF_ARID.sahara, ...AF_ARID.sparse].includes(f.properties.NAME)).map((f) => ({ f, bb: turf.bbox(f), name: f.properties.NAME }));
  const landforms = readJSON(path.join(RAW, 'ne_10m_geography_regions_polys.geojson')).features.filter((f) => LANDFORM_IT[f.properties.NAME]).map((f) => ({ f, bb: turf.bbox(f), name: LANDFORM_IT[f.properties.NAME] }));
  const cities = geoCities();
  const CELL = 1, grid = new Map();
  for (const a of A) { const bb = turf.bbox(a.f); a.bb = bb; for (let x = Math.floor(bb[0]); x <= Math.floor(bb[2]); x++) for (let y = Math.floor(bb[1]); y <= Math.floor(bb[3]); y++) { const k = `${x},${y}`; if (!grid.has(k)) grid.set(k, []); grid.get(k).push(a); } }
  for (const a of A) { a.places = 0; a.gsum = 0; a.geo = []; }
  const locate = (lon, lat) => { for (const a of grid.get(`${Math.floor(lon / CELL)},${Math.floor(lat / CELL)}`) || []) { const bb = a.bb; if (lon < bb[0] || lon > bb[2] || lat < bb[1] || lat > bb[3]) continue; if (turf.booleanPointInPolygon([lon, lat], a.f)) return a; } return null; };
  for (const c of cities) {
    const a = locate(c.lon, c.lat);
    if (!a) continue;
    a.places++; a.gsum += Math.sqrt(Math.min(c.pop, 30000));
    if (!AF_ANACHRONISTIC.has(c.name)) a.geo.push([c.name, c.pop]);
  }
  // margine meridionale del Sahara vero (isoieta di ~150 mm): più a sud c'è il Sahel, abitato e transitabile
  const sahel = (lon) => (lon < -12 ? 18.5 : lon < -5 ? 17.5 : lon < 5 ? 17.0 : lon < 12 ? 17.5 : lon < 16 ? 16.5 : lon < 24 ? 16.0 : lon < 30 ? 15.5 : lon < 34 ? 16.0 : 18.0);
  const hit = (set, c) => arid.some((q) => set.includes(q.name) && inBox(c, q.bb) && turf.booleanPointInPolygon(c, q.f));
  for (const a of A) {
    const per10k = (a.places / Math.max(1, a.area)) * 10000;
    let d = false;
    if (!a.oasis && !a.valley && per10k < 2.5) {
      if (hit(AF_ARID.sahara, a.c) && a.c[1] > sahel(a.c[0])) d = true;
      else if (hit(AF_ARID.sparse, a.c) && per10k < 1.2) d = true; // Rub al-Khali, deserti egiziani: dove i dati sono fitti
    }
    a.desert = d;
    if (a.desert) a.owner = '';
  }
  log(`Africa: ${A.filter((a) => a.desert).length} atomi di deserto`);

  // regioni storiche della zona di dettaglio: il centro più vicino fra quelli ammessi per il paese moderno
  const REG = AF_DETAIL_REGIONS.map(([name, lon, lat, mods, T, owner]) => ({ name, at: [lon, lat], mods, T, owner }));
  for (const a of A) {
    if (!a.detail) continue;
    let best = null, bd = Infinity;
    for (const r of REG) { if (!r.mods.includes(a.modern)) continue; const d = turf.distance(a.c, r.at); if (d < bd) { bd = d; best = r; } }
    a.region = best;
    // il padrone della regione storica vale per tutte le sue terre abitate (niente schegge di confine del dataset)
    if (best && best.owner !== undefined && !a.desert && !a.oasis ) a.owner = best.owner;
  }

  // 5. accorpamento: stesso stato d'epoca, stessa classe, stesso paese moderno (nella zona di dettaglio: stessa regione), forma compatta
  const clsOf = (a) => (a.oasis ? `O:${a.oasis}` : a.desert ? 'D' : 'L');
  const keyOf = (a) => (a.oasis ? `O:${a.oasis}|${a.owner}` : a.region && !a.desert ? `${a.owner}|L|R:${a.region.name}` : `${a.owner}|${clsOf(a)}|${a.modern}`);
  const parent = A.map((_, i) => i);
  const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  const cl = new Map();
  for (const a of A) cl.set(a.i, { ids: [a.i], A: a.area, Pm: perim[a.i], nb: new Map(shared[a.i]), key: keyOf(a), T: a.desert ? DESERT_T : a.region ? a.region.T : targetOf(a), owner: a.owner, cls: clsOf(a), modern: a.modern, reg: a.region && !a.desert ? a.region.name : null, bb: a.bb.slice() });
  const span = (bb) => turf.distance([bb[0], bb[1]], [bb[2], bb[3]]);
  const ubb = (a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
  const merge = (a, b) => { // b dentro a
    const X = cl.get(a), Y = cl.get(b);
    const l = X.nb.get(b) || 0;
    X.Pm += Y.Pm - 2 * l; X.A += Y.A; X.ids.push(...Y.ids); X.bb = ubb(X.bb, Y.bb);
    for (const i of Y.ids) parent[i] = a;
    X.nb.delete(b);
    for (const [c, len] of Y.nb) { if (c === a) continue; X.nb.set(c, (X.nb.get(c) || 0) + len); const C = cl.get(c); C.nb.set(a, (C.nb.get(a) || 0) + len); C.nb.delete(b); }
    cl.delete(b);
  };
  const pp = (Ar, Pm) => (Pm > 0 ? (4 * Math.PI * Ar) / (Pm * Pm) : 0);
  const pass = (minF, maxF, ok, scoreOf) => {
    const stuck = new Set();
    for (let guard = 0; guard < 200000; guard++) {
      let s = null;
      for (const [id, c] of cl) if (!stuck.has(id) && c.A < c.T * minF && (s === null || c.A < cl.get(s).A)) s = id;
      if (s === null) break;
      const S = cl.get(s);
      let best = null, bs = -Infinity;
      for (const [o, l] of S.nb) {
        const O = cl.get(o);
        if (!ok(S, O) || O.A + S.A > Math.max(S.T, O.T) * maxF) continue;
        if (span(ubb(S.bb, O.bb)) > 520 * Math.sqrt(Math.max(S.T, O.T) / 60000)) continue;
        const sc = scoreOf(S, O, l);
        if (sc > bs) { bs = sc; best = o; }
      }
      if (best === null) { stuck.add(s); continue; }
      merge(best, s);
    }
  };
  const compact = (S, O, l) => pp(S.A + O.A, S.Pm + O.Pm - 2 * l) * (1 + 0.3 * Math.max(0, 1 - O.A / O.T));
  pass(0.62, 1.45, (S, O) => S.key === O.key, compact);
  // resti piccoli: stesso stato e stessa classe anche oltre il confine moderno, poi stesso stato
  pass(0.3, 1.8, (S, O) => S.owner === O.owner && S.cls === O.cls && S.cls !== 'D' && !S.cls.startsWith('O:') && (S.reg === O.reg || (!S.reg && !O.reg)), (S, O, l) => l / Math.sqrt(O.A));
  pass(0.12, 2.2, (S, O) => S.owner === O.owner && !S.cls.startsWith('O:') && !O.cls.startsWith('O:') && (S.cls === 'D') === (O.cls === 'D'), (S, O, l) => l / Math.sqrt(O.A));
  // isolette senza vicini: alla provincia più vicina dello stesso stato e paese moderno (Capo Verde, Seychelles, Comore)
  const cent = (c) => turf.centroid(turf.featureCollection(c.ids.map((i) => turf.point(A[i].c)))).geometry.coordinates;
  for (const [id, c] of [...cl]) {
    if (!cl.has(id) || c.nb.size || c.A > c.T * 0.3) continue;
    const cc = cent(c);
    let best = null, bd = 420;
    for (const [o, O] of cl) { if (o === id || O.owner !== c.owner || O.modern !== c.modern || O.cls !== c.cls) continue; const d = turf.distance(cc, cent(O)); if (d < bd) { bd = d; best = o; } }
    if (best !== null && cl.get(best).A >= c.A) merge(best, id);
    else if (best !== null) merge(id, best);
  }
  // isolotti e schegge minuscole (lagune, scogli del Mar Rosso, isole di Mozambico): alla provincia più vicina
  for (const [id, c] of [...cl]) {
    if (!cl.has(id) || c.A > Math.max(120, c.T * 0.04) || c.cls.startsWith('O:')) continue;
    const cc = cent(c);
    // stesso padrone; solo gli scogli davvero minuscoli possono finire a un altro
    let best = null, bd = 200;
    for (const [o, O] of cl) {
      if (o === id || O.A <= c.A || (O.owner !== c.owner && c.A > 60)) continue;
      const d = turf.distance(cc, cent(O)) * (O.owner === c.owner ? 0.6 : 1);
      if (d < bd) { bd = d; best = o; }
    }
    if (best !== null) merge(best, id);
  }
  log(`Africa: ${cl.size} province`);

  // 6. informazioni di provincia
  const townsIn = (ids) => {
    const set = new Set(ids);
    const out = [];
    for (const [name, lon, lat, w] of AF_TOWNS) { const a = townAtom(name, lon, lat); if (a && set.has(a.i)) out.push([name, w]); }
    return out.sort((x, y) => y[1] - x[1]);
  };
  // città sulla costa o su un'isoletta semplificata via: l'atomo più vicino entro 25 km
  const townCache = new Map();
  const townAtom = (name, lon, lat) => {
    if (townCache.has(name)) return townCache.get(name);
    let a = locate(lon, lat);
    if (!a) {
      let bd = 25;
      for (const b of A) {
        const bb = b.bb;
        if (lon < bb[0] - 0.3 || lon > bb[2] + 0.3 || lat < bb[1] - 0.3 || lat > bb[3] + 0.3) continue;
        const d = turf.pointToPolygonDistance(turf.point([lon, lat]), b.f, { units: 'kilometers' });
        if (d < bd) { bd = d; a = b; }
      }
    }
    townCache.set(name, a);
    return a;
  };
  const infos = [];
  const groupOf = new Map();
  for (const [id, c] of cl) {
    const mem = c.ids.map((i) => A[i]).sort((x, y) => y.area - x.area);
    const top = (fn) => { const m = new Map(); for (const a of mem) { const v = fn(a); if (v) m.set(v, (m.get(v) || 0) + a.area); } return [...m.entries()].sort((x, y) => y[1] - x[1])[0]?.[0] || ''; };
    const histName = top((a) => (a.hist === 'null' ? '' : a.hist));
    const owner = c.owner, modern = top((a) => a.modern), iso = top((a) => a.iso);
    // regione del deserto: gli stessi nomi del Nord Africa già in mappa, così le scritte si uniscono
    const cx = cent(c)[0];
    const desert = c.cls !== 'D' ? null
      : ['SAU', 'YEM', 'OMN', 'ARE', 'QAT'].includes(modern) ? 'Rub al-Khali'
      : modern === 'EGY' ? (cx < 31.3 ? 'Deserto Libico' : 'Deserto Arabico')
      : modern === 'SDN' ? (cx < 30 ? 'Deserto Libico' : 'Deserto nubiano')
      : modern === 'LBY' ? 'Deserto Libico' : 'Sahara';
    const oasis = c.cls.startsWith('O:') ? c.cls.slice(2) : null;
    let name;
    const towns = townsIn(c.ids);
    if (oasis) name = oasis;
    else if (desert) {
      const by = new Map();
      for (const a of mem) { const hit = landforms.find((q) => inBox(a.c, q.bb) && turf.booleanPointInPolygon(a.c, q.f)); if (hit) by.set(hit.name, (by.get(hit.name) || 0) + a.area); }
      const t = [...by.entries()].sort((x, y) => y[1] - x[1])[0];
      if (t && t[1] > c.A * 0.35) name = t[0];
      else {
        const cc = cent(c);
        const near = AF_DESERT_NAMES.map((t) => [t[0], [t[1], t[2]]]).sort((x, y) => turf.distance(cc, x[1]) - turf.distance(cc, y[1]))[0];
        name = near[0];
      }
    } else if (towns.length) name = towns[0][0];
    else if (c.reg) name = c.reg; // zona di dettaglio senza località storiche: il nome della regione (poi nord, sud…)
    else {
      const g = mem.flatMap((a) => a.geo).sort((x, y) => y[1] - x[1])[0];
      name = g && g[1] >= 3000 ? g[0] : cleanName(mem[0].pname);
    }
    const region = c.reg || (histName ? AF_REGION[histName] || histName : AF_NULL_REGION[modern] || modern);
    groupOf.set(id, infos.length);
    infos.push({ name, owner, modern, area: c.A, region, prot: null, byNameList: towns.length > 1 ? towns.map((t) => t[0]) : null, byTown: !!towns.length, lockName: null, desert, oasis, iso, hreg: histName, lang: '', af: true, reg: c.reg, gsum: mem.reduce((s, a) => s + a.gsum, 0) });
  }
  // zona di dettaglio: una regione con una sola provincia (dello stesso padrone) prende il nome della regione
  {
    const byReg = new Map();
    for (const g of infos) if (g.reg) byReg.set(g.reg, [...(byReg.get(g.reg) || []), g]);
    for (const [reg, list] of byReg) if (list.length === 1) { list[0].name = reg; list[0].byTown = true; list[0].byNameList = null; }
  }
  // nomi doppi: la provincia più estesa tiene il nome, le altre passano alla località seguente
  {
    const used = new Set();
    for (const g of [...infos].sort((a, b) => (b.byTown ? 1 : 0) - (a.byTown ? 1 : 0) || b.area - a.area)) {
      if (!used.has(g.name)) { used.add(g.name); continue; }
      const alt = (g.byNameList || []).find((n) => !used.has(n));
      if (alt) g.name = alt;
      used.add(g.name);
    }
  }
  const pieces = A.map((a) => ({ type: 'Feature', geometry: a.f.geometry, properties: { g: groupOf.get(find(a.i)) } }));
  return { pieces, infos };
}
