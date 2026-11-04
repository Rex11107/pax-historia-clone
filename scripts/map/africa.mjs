// Estensione della mappa: Africa e penisola arabica fuori dal rettangolo europeo.
// Fase 1 — province storiche e regni: atomi = suddivisioni moderne (Natural Earth admin-1) ∩ stati del 1880
// (world_1880) ∩ oasi e valli; le unità troppo grandi divise per k-medie; poi accorpamento dentro lo stesso
// stato d'epoca e paese moderno fino a una dimensione che dipende dalla densità del 1880.
// Le province europee non vengono toccate: i pezzi africani si cuciono a quelle sul 27° parallelo.
import fs from 'node:fs';
import path from 'node:path';
import * as turf from '@turf/turf';
import * as topojson from 'topojson-client';
import { AF_ARAL, AF_FREED_EXTRA, AF_FREED_FIX, AF_DISTRICT_REGIONS, AF_FAR_KEEP, AF_DETAIL_MODERN, AF_DETAIL_REGIONS, AF_DETAIL_SCALE, AF_STEPPE, AF_ENCLAVES, AF_FINE, AF_DESERT_NAMES, AF_ARID, AF_CLIP, AF_EXCLUDE, AF_HIST, AF_LAKES, AF_NULL_REGION, AF_OASES, AF_OVERRIDES, AF_POP, AF_REGION, AF_SIZE, AF_TOWNS, AF_VALLEYS, AF_ANACHRONISTIC } from './africa-config.mjs';

const readJSON = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const km2 = (f) => turf.area(f) / 1e6;
const DESERT_T = 260000;

// nomi delle forme del terreno per le province del deserto
const LANDFORM_IT = { 'NUBIAN DESERT': 'Deserto nubiano', 'LIBYAN DESERT': 'Deserto libico', 'RUB’ AL KHALI': 'Rub al-Khali', 'Ténéré': 'Teneré', 'Erg du Ténéré': 'Teneré', 'Tanezrouft': 'Tanezruft',
  'Grand Erg de Bilma': 'Erg di Bilma', 'Majâbat al Koubrâ': 'Mreyé', 'Tassili-n-Ajjer': 'Tassili', 'Ahaggar': 'Hoggar', 'Tibesti Mts.': 'Tibesti', 'Aïr Mts.': 'Aïr', 'Adrar des Ifoghas': 'Adrar degli Ifoghas',
  'Eastern Desert': 'Deserto orientale', 'WESTERN DESERT': 'Deserto occidentale', 'Ad Dahna': 'Dahna', 'Sarïr Kalanshiyu ar Ramli al Kabi': 'Sarir Calanscio', 'Ramlat as Sab‘atayn': 'Ramlat as-Sabatayn',
  'Erg Chech': 'Erg Chech', '‘Erg Chech': 'Erg Chech', 'Erg Iguidi': 'Erg Iguidi', '‘Erg Iguidi': 'Erg Iguidi', 'Hamada du Draa': 'Hamada del Draa', 'Djourab': 'Giurab', 'Erg du Djourab': 'Giurab',
  'Sahara al Hijarah': 'Hammada', 'Bayyudah Desert': 'Deserto di Bayuda', 'Hamadat Tinghert': 'Hamada di Tinrhert', 'Massif de l\'Ennedi': 'Ennedi',
  'GARAGUM DESERT': 'Karakum', 'QIZILQUM DESERT': 'Kyzylkum', 'BETPAQDALA DESERT': 'Betpak-Dala', 'Kavir Desert': 'Dasht-e Kavir', 'LUT DESERT': 'Dasht-e Lut', 'Margo Desert': 'Dasht-i Margo', 'Rigestan': 'Registan', 'Ustyurt Plateau': 'Ustyurt' };

const cleanName = (n) => String(n || '?').replace(/^(Région|Region|Province|Provincia|Governatorato) (de |du |di |del |della |of |)/i, '').replace(/ (Region|Province|State)$/i, '').trim();

/**
 * Costruisce i pezzi africani già raggruppati.
 * @returns {{ pieces: object[], infos: object[] }} pieces: feature con properties.g (indice locale in infos)
 */
export function buildAfrica({ ms, RAW, TMP, BBOX, log, geoCities, freed = null }) {
  const D = path.join(TMP, 'af');
  const OASES_ALL = [...AF_OASES, ...(freed?.oases ?? []).filter((o) => !AF_OASES.some((x) => x.name === o.name))];
  fs.mkdirSync(D, { recursive: true });
  const P = (n) => path.join(D, n);
  // le province europee lungo il vecchio bordo (27° N, 11° O, 50° E) si rifanno qui, senza linee rette:
  // si cancella solo la parte d'Europa che resta
  let erase = `bbox=${BBOX.join(',')}`;
  if (freed) {
    ms('-rectangle', `bbox=${BBOX.join(',')}`, '-erase', freed.file, '-o', P('eu_keep.geojson'));
    erase = P('eu_keep.geojson');
  }
  const excl = JSON.stringify(AF_EXCLUDE);

  // 1. livelli: suddivisioni moderne, stati d'epoca, laghi
  fs.writeFileSync(P('lakes.geojson'), JSON.stringify(turf.featureCollection([...readJSON(path.join(RAW, 'ne_10m_lakes.geojson')).features.filter((f) => AF_LAKES.includes(f.properties.name)).map((f) => ({ ...f, properties: {} })), turf.polygon([AF_ARAL])])));
  // oltre il vecchio riquadro (est dell'88° meridiano, nord del 56° parallelo) entrano solo i paesi della fase in corso
  ms(path.join(RAW, 'ne_admin1.geojson'), '-filter', `(!${excl}.includes(adm0_a3) || ${JSON.stringify([...new Set((freed?.regions ?? []).map((r) => r.modern))])}.includes(adm0_a3)) && !(adm0_a3 == 'FRA' && iso_3166_2 == 'FR-GF') && ((this.centroidX <= 88 && this.centroidY <= 56) || ${JSON.stringify(AF_FAR_KEEP)}.includes(adm0_a3))`, '-clip', `bbox=${AF_CLIP.join(',')}`,
    '-each', 'pid=adm1_code, iso=iso_3166_2, pname=name_it || name_en || name, modern=adm0_a3', '-filter-fields', 'pid,iso,pname,modern',
    // il taglio dell'Europa dopo la semplificazione: il bordo resta identico a quello delle province europee
    '-simplify', 'interval=800', 'keep-shapes', '-erase', erase, '-erase', P('lakes.geojson'), '-filter', 'this.area > 2e6', '-o', P('adm.geojson'));
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
  for (const o of OASES_ALL) {
    let c = turf.circle(o.at, o.r, { units: 'kilometers', steps: 24 });
    if (valleyAll) c = turf.difference(turf.featureCollection([c, valleyAll])) || null;
    if (c) cuts.push({ ...c, properties: { oasis: o.name } });
  }
  // piccoli possedimenti costieri (la baia di Assab): un ritaglio che diventa una regione a sé
  for (const e of AF_ENCLAVES) cuts.push({ ...turf.circle(e.at, e.r, { units: 'kilometers', steps: 32 }), properties: { enclave: e.name } });
  // Arabia 1881: fasce costiere tenute davvero dagli Ottomani (Hegiaz lungo il Mar Rosso, al-Hasa sul Golfo) e
  // dall'Egitto (Midian, fino al 1892); l'interno è dei Rashidi, dei Sauditi o delle tribù. Le fasce sono una
  // distanza dalla costa: il loro bordo segue la costa, non una linea dritta (carte di Letts 1883, Bartholomew 1871)
  ms(path.join(RAW, 'ne_admin1.geojson'), '-filter', "adm0_a3 == 'SAU'", '-dissolve', '-o', 'geojson-type=FeatureCollection', P('sau_land.geojson'));
  const sauLand = readJSON(P('sau_land.geojson')).features[0];
  const sauRings = (sauLand.geometry.type === 'Polygon' ? [sauLand.geometry.coordinates] : sauLand.geometry.coordinates).map((pl) => pl[0]);
  const coastBand = (keep, km) => {
    let all = null;
    for (const ring of sauRings) {
      let run = [];
      const flush = () => { if (run.length > 1) { const b = turf.buffer(turf.lineString(run), km, { units: 'kilometers', steps: 6 }); all = all ? turf.union(turf.featureCollection([all, b])) : b; } run = []; };
      for (const c of ring) { if (keep(c)) run.push(c); else flush(); }
      flush();
    }
    return all ? turf.intersect(turf.featureCollection([all, sauLand])) : null;
  };
  // il golfo di Aqaba (costa saudita fino a 29,36° N) conta per il Midian e per l'Hegiaz; l'Asir (fino al confine
  // yemenita) è una fascia sua, così la costa ottomana non si interrompe fra Taif e lo Yemen
  const gulfAqaba = ([x, y]) => x < 35.2 && y < 29.36;
  const midian = coastBand(([x, y]) => x < 37.2 && y > 26.15 && (y < 28.3 || gulfAqaba([x, y])), 40);
  let hejaz = coastBand(([x, y]) => x < 43.3 && y > 20.2 && (y < 28.4 || gulfAqaba([x, y])), 170);
  const asir = coastBand(([x, y]) => x < 43.3 && y > 16.35 && y <= 20.2, 120);
  if (hejaz && midian) hejaz = turf.difference(turf.featureCollection([hejaz, midian]));
  const hasa = coastBand(([x, y]) => x > 47.8 && y > 24.3 && y < 28.4 && !(x > 50.7 && y < 24.9), 110);
  const ARZ = [['midian', midian], ['hejaz', hejaz], ['asir', asir], ['hasa', hasa]].filter(([, g]) => g).map(([zone, g]) => ({ zone, g, bb: turf.bbox(g) }));
  // le fasce si tagliano lungo gli spartiacque (non a tasselli di 1°, che lascerebbero linee dritte): vedi sotto
  fs.writeFileSync(P('arz.geojson'), JSON.stringify(turf.featureCollection(ARZ.map((z) => ({ ...z.g, properties: { arz: z.zone } })))));
  fs.writeFileSync(P('cuts.geojson'), JSON.stringify(turf.featureCollection(cuts)));
  // zona di dettaglio: bacini di HydroBASINS livello 6 dentro i paesi della fase in corso
  const detailSet = new Set(AF_DETAIL_MODERN);
  const REG = AF_DETAIL_REGIONS.map(([name, lon, lat, mods, T, owner]) => ({ name, at: [lon, lat], mods, T: T * (AF_DETAIL_SCALE[mods[0]] ?? 1), owner }));
  // regioni delle province europee liberate: una per provincia, col suo nome, padrone e dimensione; se una regione
  // esterna ha lo stesso nome (uezd a cavallo del 50° meridiano) diventano una sola
  // fascia araba di una regione: le regioni ottomane ed egiziane in Arabia (a nord dell'Asir) stanno solo nelle fasce
  const regZone = (r) => {
    if (!(r.mods ?? []).includes('SAU') && r.modern !== 'SAU') return null;
    if (r.owner === 'EGY') return 'midian';
    if (r.owner === 'TUR' && r.at[1] < 20.3) return 'asir';
    if (r.owner === 'TUR' && r.at[1] >= 20.3 && r.at[1] < 28.8) return r.at[0] < 45 ? 'hejaz' : 'hasa';
    return null;
  };
  const FREED_REG = [];
  for (const fr of [...(freed?.regions ?? []), ...(freed ? AF_FREED_EXTRA.map(([name, lon, lat, modern, T, owner]) => ({ name, at: [lon, lat], modern, T, owner, desert: false, region: null })) : [])]) {
    if (fr.oasis) continue; // un'oasi liberata torna come cerchio d'oasi, non come regione
    const fix = AF_FREED_FIX[fr.name];
    if (fix) Object.assign(fr, fix);
    const same = REG.find((r) => r.name === fr.name && r.mods.includes(fr.modern));
    if (same) { same.desert = fr.desert; same.euRegion = fr.region; same.modern = fr.modern; FREED_REG.push(same); continue; }
    if (REG.some((r) => r.name === fr.name)) fr.name = `${fr.name} `; // nome già usato altrove: distinto solo internamente
    const r = { name: fr.name, at: fr.at, mods: [fr.modern], modern: fr.modern, T: fr.T, owner: fr.owner, desert: fr.desert, euRegion: fr.region };
    REG.push(r); FREED_REG.push(r);
  }
  // bacini anche nei paesi interi delle province europee rifatte: altrimenti il loro bordo taglierebbe gli atomi
  const detailMods = [...new Set([...AF_DETAIL_MODERN, ...(freed?.regions ?? []).map((r) => r.modern)])];
  ms(P('adm.geojson'), '-filter', `${JSON.stringify(detailMods)}.includes(modern)`, '-dissolve', '-o', P('detail_land.geojson'));
  const freedGeo = freed ? readJSON(freed.file).features.filter((f) => f.geometry).map((f) => ({ f, bb: turf.bbox(f) })) : [];
  const inFreed = (c) => freedGeo.some((q) => c[0] >= q.bb[0] && c[0] <= q.bb[2] && c[1] >= q.bb[1] && c[1] <= q.bb[3] && turf.booleanPointInPolygon(c, q.f));
  // bacini di HydroBASINS livello 6: Africa, Europa e Medio Oriente (Arabia, Persia), Asia (Turkestan, Afghanistan)
  const hyb = ['af', 'eu', 'as', 'si', 'au'].map((r) => path.join(RAW, 'hydro', `hybas_${r}_lev06_v1c.shp`)).filter((f) => fs.existsSync(f));
  ms('-i', ...hyb, 'combine-files', '-merge-layers', 'force', '-clip', P('detail_land.geojson'), '-each', 'bas=HYBAS_ID', '-filter-fields', 'bas', '-o', P('basins.geojson'));
  if (ARZ.length) {
    // fasce arabe divise dai bacini: pezzi piccoli che l'unione taglia bene, con i soli bordi della fascia come linee nuove
    ms(P('basins.geojson'), '-clip', P('arz.geojson'), '-explode', '-filter-fields', 'bas', '-o', 'geojson-type=FeatureCollection', P('arz_pieces.geojson'));
    const pieces = readJSON(P('arz_pieces.geojson')).features.filter((f) => f.geometry).map((f) => ({ ...f, properties: { arz: 1 } }));
    const cj = readJSON(P('cuts.geojson'));
    cj.features.push(...pieces);
    fs.writeFileSync(P('cuts.geojson'), JSON.stringify(cj));
  }
  // India: distretti del censimento 2011 (DataMeet, CC BY 4.0) per gli stati principeschi e i possedimenti europei
  const distSrc = path.join(RAW, 'datameet', 'dist.json');
  const distCentroid = new Map();
  const distFeats = [];
  const distAt = (f) => {
    if (!distFeats.length) return null;
    let pt; try { pt = turf.pointOnFeature(f).geometry.coordinates; } catch { return null; }
    for (const d of distFeats) if (pt[0] >= d.bb[0] && pt[0] <= d.bb[2] && pt[1] >= d.bb[1] && pt[1] <= d.bb[3] && turf.booleanPointInPolygon(pt, d.f)) return d.dist;
    return null;
  };
  // nelle terre rifatte attorno all'Arabia i confini moderni (Arabia saudita, Iraq, Giordania, Kuwait: linee rette del
  // 1913-1965) e quelli del dataset d'epoca non tagliano gli atomi: restano spartiacque, coste e fasce; il paese moderno
  // di ogni atomo si ricava poi dal suo centro
  const MIX = ['SAU', 'IRQ', 'JOR'].filter((m) => (freed?.regions ?? []).some((r) => r.modern === m));
  let admOrig = [];
  if (MIX.length) {
    fs.copyFileSync(P('adm.geojson'), P('adm_orig.geojson'));
    ms(P('adm_orig.geojson'), '-filter', `${JSON.stringify(MIX)}.includes(modern)`, '-dissolve', '-each', "pid='MIX', iso='', pname='', modern='MIX'", '-o', 'geojson-type=FeatureCollection', P('adm_mix.geojson'));
    const orig = readJSON(P('adm_orig.geojson'));
    admOrig = orig.features.filter((f) => MIX.includes(f.properties.modern)).map((f) => ({ f, bb: turf.bbox(f) }));
    fs.writeFileSync(P('adm.geojson'), JSON.stringify(turf.featureCollection([...orig.features.filter((f) => !MIX.includes(f.properties.modern)), ...readJSON(P('adm_mix.geojson')).features])));
    ms(P('hist.geojson'), '-erase', P('adm_mix.geojson'), '-o', 'geojson-type=FeatureCollection', P('hist2.geojson'));
    fs.copyFileSync(P('hist2.geojson'), P('hist.geojson'));
  }
  const origAt = (c) => {
    let best = null, bd = Infinity;
    for (const q of admOrig) {
      if (c[0] >= q.bb[0] && c[0] <= q.bb[2] && c[1] >= q.bb[1] && c[1] <= q.bb[3] && turf.booleanPointInPolygon(c, q.f)) return q.f.properties;
      const d = Math.hypot((q.bb[0] + q.bb[2]) / 2 - c[0], (q.bb[1] + q.bb[3]) / 2 - c[1]); if (d < bd) { bd = d; best = q.f.properties; }
    }
    return best;
  };
  const layers = [P('adm.geojson'), P('hist.geojson'), P('cuts.geojson'), P('basins.geojson')];
  if (fs.existsSync(distSrc)) {
    const dj = readJSON(distSrc);
    for (const f of dj.features) { f.properties = { dist: `${f.properties.ST_NM}|${f.properties.DISTRICT}` }; distCentroid.set(f.properties.dist, turf.centroid(f).geometry.coordinates); }
    fs.writeFileSync(P('dist_src.geojson'), JSON.stringify(dj));
    ms(P('dist_src.geojson'), '-simplify', 'interval=500', 'keep-shapes', '-o', P('dist.geojson'));
    layers.push(P('dist.geojson'));
    // i tagli dell'unione seguono i distretti, ma i suoi attributi a volte finiscono sul pezzo accanto: il distretto
    // di ogni atomo si ricava da un suo punto interno
    for (const f of readJSON(P('dist.geojson')).features) distFeats.push({ f, bb: turf.bbox(f), dist: f.properties.dist });
  }
  // l'unione con quattro livelli e l'aggancio dei vertici sbaglia gli attributi quando c'è anche quello dei distretti
  // (mezzo Bangladesh etichettato come India): i distretti si uniscono dopo, solo sugli atomi indiani e senza aggancio
  const base4 = layers.slice(0, 4);
  ms('-i', ...base4, 'combine-files', 'snap', 'snap-interval=0.0005', '-union', `target=${base4.map((l) => path.basename(l, '.geojson')).join(',')}`,
    '-filter', 'pid != null', 'remove-empty', '-explode', '-o', P('u.geojson'));
  if (layers.length > 4) {
    ms(P('u.geojson'), '-filter', "modern == 'IND'", '-o', P('u_in.geojson'));
    ms('-i', P('u_in.geojson'), P('dist.geojson'), 'combine-files', '-union', 'target=u_in,dist', '-filter', 'pid != null', 'remove-empty', '-explode', '-o', P('u_in_d.geojson'));
    const rest = readJSON(P('u.geojson')).features.filter((f) => f.properties.modern !== 'IND');
    fs.writeFileSync(P('u.geojson'), JSON.stringify(turf.featureCollection([...rest, ...readJSON(P('u_in_d.geojson')).features])));
  }

  // 2. proprietari
  const u = readJSON(P('u.geojson')).features.filter((f) => f.geometry);
  const inBox = ([x, y], b) => x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3];
  let A = u.map((f) => {
    let pr = f.properties;
    if (pr.modern === 'MIX') { const o = origAt(turf.centroid(f).geometry.coordinates); pr = { ...pr, pid: o?.pid ?? 'MIX', iso: o?.iso ?? '', pname: o?.pname ?? '', modern: o?.modern ?? 'SAU' }; }
    const hist = pr.hist ?? 'null';
    // nelle province europee rifatte il padrone viene dalla provincia d'origine: gli stati d'epoca europei non servono
    if (AF_HIST[hist] === undefined && !(freed && inFreed(turf.centroid(f).geometry.coordinates))) throw new Error(`stato africano senza tag: ${hist}`);
    return { f, pid: pr.pid, iso: pr.iso, pname: pr.pname, modern: pr.modern, hist, owner: AF_HIST[hist] ?? '', oasis: pr.oasis || null, enclave: pr.enclave || null, valley: !!pr.valley, dist: pr.modern === 'IND' ? distAt(f) : null, area: km2(f), c: turf.centroid(f).geometry.coordinates, detail: detailSet.has(pr.modern) };
  }).filter((a) => a.area > 0.5)
    // la punta orientale dell'isola di Kolguev oltre il 50° meridiano: resta con il resto dell'isola, in Europa
    .filter((a) => !(!freed && a.c[0] < 50.6 && a.c[1] > 68.6 && a.c[1] < 69.6));
  const zoneAt = (c) => ARZ.find((z) => c[0] >= z.bb[0] && c[0] <= z.bb[2] && c[1] >= z.bb[1] && c[1] <= z.bb[3] && turf.booleanPointInPolygon(c, z.g))?.zone ?? null;
  // il golfo di Aqaba fino a 30 km dalla costa: Midian egiziano anche per le schegge che cadono fuori dalla fascia
  // atomi sauditi tagliati sulle fasce (l'unione non sempre li divide): ogni pezzo sa in quale fascia sta
  if (ARZ.length) {
    const out = [];
    const push = (a, f, zone) => { for (const poly of f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates]) { const g = turf.polygon(poly); const ar = km2(g); if (ar >= 0.5) out.push({ ...a, f: g, area: ar, c: turf.centroid(g).geometry.coordinates, arzFix: zone }); } };
    for (const a of A) {
      if (a.modern !== 'SAU') { out.push(a); continue; }
      const bb = turf.bbox(a.f);
      let rest = a.f, done = false;
      for (const z of ARZ) {
        if (!rest || bb[2] < z.bb[0] || bb[0] > z.bb[2] || bb[3] < z.bb[1] || bb[1] > z.bb[3]) continue;
        let inter = null;
        try { inter = turf.intersect(turf.featureCollection([rest, z.g])); } catch { inter = null; }
        if (!inter) continue;
        const ia = km2(inter), ra = km2(rest);
        if (ia < 0.5) continue;
        if (ra - ia < 0.5) { push(a, rest, z.zone); rest = null; done = true; break; }
        push(a, inter, z.zone);
        try { rest = turf.difference(turf.featureCollection([rest, z.g])); } catch { rest = null; }
      }
      if (!done && rest && km2(rest) >= 0.5) push(a, rest, null);
    }
    A = out;
  }
  for (const a of A) a.arz = a.modern !== 'SAU' ? null : a.arzFix !== undefined ? a.arzFix : a.c[0] < 35.25 && a.c[1] > 27.9 && a.c[1] < 29.4 ? 'midian' : zoneAt(a.c);
  // atomi delle province europee liberate dal vecchio bordo
  if (freed) for (const a of A) if (inFreed(a.c)) { a.freed = true; a.detail = true; }
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
  for (const a of A) if (a.oasis) { const o = OASES_ALL.find((x) => x.name === a.oasis); if (o.owner !== undefined && o.owner !== null) a.owner = o.owner; }
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
    const k = a.oasis || a.enclave ? 1 : a.freed ? Math.round(a.area / 30000) : a.detail ? Math.round(a.area / (AF_FINE[a.iso] ?? AF_FINE[a.modern] ?? Math.max(T, 60000))) : Math.round(a.area / T);
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
    // coste e steppe percorse dai nomadi (Sahara occidentale, costa mauritana): non sono deserto intransitabile
    if (d && (AF_STEPPE.modern.includes(a.modern) || AF_STEPPE.boxes.some((b) => inBox(a.c, b)))) d = false;
    a.desert = d;
    // province europee rifatte: la regione d'origine (la provincia europea più vicina dello stesso paese) decide
    // padrone e deserto, come nella mappa approvata
    if (a.freed) {
      let best = null, bd = Infinity;
      for (const r of FREED_REG) { if (a.modern === 'SAU' && regZone(r) !== a.arz) continue; const d = turf.distance(a.c, r.at) * (r.modern === a.modern ? 1 : 4); if (d < bd) { bd = d; best = r; } }
      a.fr = best;
      if (best) a.desert = !!best.desert && !a.oasis;
    }
    if (a.desert) a.owner = '';
  }
  log(`Africa: ${A.filter((a) => a.desert).length} atomi di deserto`);

  // regioni storiche della zona di dettaglio: il centro più vicino fra quelli ammessi per il paese moderno
  const ENC = new Set(AF_ENCLAVES.map((e) => e.name));
  const DIST_REG = new Map(Object.entries(AF_DISTRICT_REGIONS).flatMap(([r, ds]) => ds.map((d) => [d, r])));
  const DIST_NAMES = new Set(Object.keys(AF_DISTRICT_REGIONS));
  for (const a of A) {
    if (!a.detail) continue;
    let best = null, bd = Infinity;
    if (a.freed && a.fr) best = a.fr;
    else if (a.enclave) best = REG.find((r) => r.name === a.enclave);
    else if (a.dist && DIST_REG.has(a.dist)) best = REG.find((r) => r.name === DIST_REG.get(a.dist));
    else {
      // in India il distretto intero va alla regione più vicina (confini sui distretti, non linee di Voronoi)
      const at = (a.dist && distCentroid.get(a.dist)) || a.c;
      for (const r of REG) { if (!r.mods.includes(a.modern) || ENC.has(r.name) || DIST_NAMES.has(r.name) || (r.euRegion !== undefined && !AF_DETAIL_REGIONS.some((x) => x[0] === r.name)) || (a.modern === 'SAU' && regZone(r) !== a.arz)) continue; const d = turf.distance(at, r.at); if (d < bd) { bd = d; best = r; } }
    }
    a.region = best;
    // il padrone della regione storica vale per tutte le sue terre abitate (niente schegge di confine del dataset)
    if (best && best.owner !== undefined && !a.desert && !a.oasis ) a.owner = best.owner;
  }
  if (process.env.DEBUG_BOX) { const b = process.env.DEBUG_BOX.split(",").map(Number); for (const a of A) if (a.c[0] > b[0] && a.c[0] < b[2] && a.c[1] > b[1] && a.c[1] < b[3]) log("BOX", a.c.map((v) => v.toFixed(2)).join(","), Math.round(a.area), a.modern, a.arz, a.region?.name, a.freed ? "freed" : "", a.owner); }
  if (process.env.DEBUG_ARZ) { const m = {}; for (const a of A) if (a.arz) { const k = a.arz + "->" + (a.region?.name ?? "-") + (a.freed ? "*" : ""); m[k] = Math.round((m[k] || 0) + a.area); } log(JSON.stringify(m)); }
  if (process.env.DEBUG_DIST) { const m = {}; for (const a of A) if (a.region && process.env.DEBUG_DIST.split(",").includes(a.region.name)) { const k = a.region.name + " <- " + (a.dist || "nodist:" + a.modern); m[k] = (m[k] || 0) + a.area; } log(JSON.stringify(m)); }
  // contiguità: ogni regione tiene il suo pezzo connesso più grande; gli altri pezzi (exclavi del "centro più
  // vicino") passano alla regione confinante con cui condividono più confine. Le isole restano dove sono.
  for (let it = 0; it < 8; it++) {
    let moved = 0;
    const byR = new Map();
    for (const a of A) if (a.detail && a.region) byR.set(a.region, [...(byR.get(a.region) || []), a]);
    for (const [r, list] of byR) {
      const set = new Set(list.map((a) => a.i)), seen = new Set(), comps = [];
      for (const a of list) {
        if (seen.has(a.i)) continue;
        const q = [a.i], c = { ids: [], area: 0 }; seen.add(a.i);
        while (q.length) { const i = q.pop(); c.ids.push(i); c.area += A[i].area; for (const j of shared[i].keys()) if (set.has(j) && !seen.has(j)) { seen.add(j); q.push(j); } }
        comps.push(c);
      }
      if (comps.length < 2) continue;
      comps.sort((x, y) => y.area - x.area);
      for (const c of comps.slice(1)) {
        const ids = new Set(c.ids), border = new Map();
        for (const i of c.ids) for (const [j, l] of shared[i]) {
          const b = A[j];
          if (ids.has(j) || !b.detail || !b.region || b.region === r) continue;
          const w = b.region.mods.includes(A[i].modern) ? l : l * 0.3;
          border.set(b.region, (border.get(b.region) || 0) + w);
        }
        if (!border.size) continue; // isola
        const nr = [...border].sort((x, y) => y[1] - x[1])[0][0];
        if (c.ids.some((i) => A[i].enclave)) continue;
        for (const i of c.ids) { const a = A[i]; a.region = nr; if (nr.owner !== undefined && !a.desert && !a.oasis) a.owner = nr.owner; }
        moved++;
      }
    }
    if (!moved) break;
  }

  // 5. accorpamento: stesso stato d'epoca, stessa classe, stesso paese moderno (nella zona di dettaglio: stessa regione), forma compatta
  const clsOf = (a) => (a.oasis ? `O:${a.oasis}` : a.desert ? 'D' : 'L');
  const keyOf = (a) => (a.oasis ? `O:${a.oasis}|${a.owner}` : a.region && !a.desert ? `${a.owner}|L|R:${a.region.name}` : `${a.owner}|${clsOf(a)}|${a.modern}`);
  const parent = A.map((_, i) => i);
  const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  const cl = new Map();
  for (const a of A) cl.set(a.i, { ids: [a.i], A: a.area, Pm: perim[a.i], nb: new Map(shared[a.i]), key: keyOf(a), T: a.desert ? DESERT_T : a.region ? a.region.T : targetOf(a), owner: a.owner, cls: clsOf(a), modern: a.modern, reg: a.region && !a.desert && !a.oasis ? a.region.name : null, bb: a.bb.slice() });
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
  // possedimenti minuscoli voluti (Mahé, Yanaon, Diu, Damão): regioni con dimensione fino a 500 km², restano a sé
  const MICRO_T = 500;
  // isolette senza vicini: alla provincia più vicina dello stesso stato e paese moderno (Capo Verde, Seychelles, Comore)
  const cent = (c) => turf.centroid(turf.featureCollection(c.ids.map((i) => turf.point(A[i].c)))).geometry.coordinates;
  for (const [id, c] of [...cl]) {
    if (!cl.has(id) || c.nb.size || c.A > c.T * 0.3 || c.T <= MICRO_T) continue;
    const cc = cent(c);
    let best = null, bd = 420;
    for (const [o, O] of cl) { if (o === id || O.owner !== c.owner || O.modern !== c.modern || O.cls !== c.cls) continue; const d = turf.distance(cc, cent(O)) * (c.reg && O.reg === c.reg ? 0.3 : 1); if (d < bd) { bd = d; best = o; } }
    if (best !== null && cl.get(best).A >= c.A) merge(best, id);
    else if (best !== null) merge(id, best);
  }
  // isolotti e schegge minuscole (lagune, scogli del Mar Rosso, isole di Mozambico): alla provincia più vicina
  for (const [id, c] of [...cl]) {
    if (!cl.has(id) || c.A > Math.max(120, c.T * 0.04) || c.cls.startsWith('O:')) continue;
    const cc = cent(c);
    // possedimento minuscolo: i suoi pezzi si riuniscono fra loro, mai con i vicini
    if (c.T <= MICRO_T) {
      let best = null, bd = 60;
      for (const [o, O] of cl) { if (o === id || O.reg !== c.reg || O.A < c.A) continue; const d = turf.distance(cc, cent(O)); if (d < bd) { bd = d; best = o; } }
      if (best !== null) merge(best, id);
      continue;
    }
    // stesso padrone; solo gli scogli davvero minuscoli possono finire a un altro
    let best = null, bd = 200;
    for (const [o, O] of cl) {
      if (o === id || O.A <= c.A || (O.owner !== c.owner && c.A > 60)) continue;
      const d = turf.distance(cc, cent(O)) * (O.owner === c.owner ? 0.6 : 1);
      if (d < bd) { bd = d; best = o; }
    }
    if (best !== null) merge(best, id);
  }
  // zona di dettaglio: i pezzi staccati di una regione (isole come le Dahlak) si uniscono alla provincia maggiore della regione
  for (const [id, c] of [...cl]) {
    if (!cl.has(id) || !c.reg || c.A > c.T * 0.35) continue;
    let best = null;
    for (const [o, O] of cl) if (o !== id && O.reg === c.reg && O.owner === c.owner && O.A > c.A && (!best || O.A > cl.get(best).A)) best = o;
    if (best !== null && !c.nb.has(best)) merge(best, id);
  }
  // una regione che sta in una sola provincia (area totale entro 1,6 volte la dimensione) non resta divisa da un pezzetto
  {
    const byR = new Map();
    for (const [id, c] of cl) if (c.reg && c.cls === 'L') { const k = `${c.reg}|${c.owner}`; byR.set(k, [...(byR.get(k) || []), id]); }
    for (const ids of byR.values()) {
      if (ids.length < 2) continue;
      const tot = ids.reduce((x, i) => x + cl.get(i).A, 0);
      if (tot > cl.get(ids[0]).T * 1.6) continue;
      ids.sort((a, b) => cl.get(b).A - cl.get(a).A);
      for (const i of ids.slice(1)) if (cl.get(i).A < cl.get(i).T * 0.5) merge(ids[0], i);
    }
  }
  if (process.env.DEBUG_REG) for (const [id, c] of cl) if (c.reg && process.env.DEBUG_REG.split(',').includes(c.reg)) log('DBG', id, c.reg, c.owner, c.key, Math.round(c.A), c.T, [...c.nb].map(([o, l]) => `${cl.get(o).reg || cl.get(o).key}:${o}:${Math.round(l)}`).join(' '));
  // niente exclavi: ogni provincia tiene il suo pezzo connesso più grande (e le isole); gli altri pezzi di terraferma
  // passano alla provincia confinante con cui condividono più confine (meglio se dello stesso padrone e della stessa classe)
  {
    const owner = new Map(); // atomo -> provincia
    for (const [id, c] of cl) for (const i of c.ids) owner.set(i, id);
    for (let it = 0; it < 6; it++) {
      let moved = 0;
      for (const [id, c] of cl) {
        if (c.ids.length < 2) continue;
        const set = new Set(c.ids), seen = new Set(), comps = [];
        for (const i of c.ids) {
          if (seen.has(i)) continue;
          const q = [i], comp = { ids: [], area: 0 }; seen.add(i);
          while (q.length) { const k = q.pop(); comp.ids.push(k); comp.area += A[k].area; for (const j of shared[k].keys()) if (set.has(j) && !seen.has(j)) { seen.add(j); q.push(j); } }
          comps.push(comp);
        }
        if (comps.length < 2) continue;
        comps.sort((a, b) => b.area - a.area);
        for (const comp of comps.slice(1)) {
          const border = new Map();
          for (const k of comp.ids) for (const [j, l] of shared[k]) {
            if (set.has(j)) continue;
            const o = owner.get(j), O = cl.get(o);
            border.set(o, (border.get(o) || 0) + l * (O.owner === c.owner ? 3 : 1) * (O.cls === c.cls ? 2 : 1));
          }
          if (!border.size) {
            // un frammento minuscolo staccato da tutto (un taglio fra confini moderni e bacini): va alla provincia più
            // vicina, altrimenti verrebbe scartato e lascerebbe un buco; le isole vere sono più grandi o lontane
            if (comp.area > 80) continue;
            const cc = turf.centroid(turf.featureCollection(comp.ids.map((k) => turf.point(A[k].c)))).geometry.coordinates;
            let best = null, bd = 15;
            for (const b of A) {
              if (set.has(b.i) || cc[0] < b.bb[0] - 0.2 || cc[0] > b.bb[2] + 0.2 || cc[1] < b.bb[1] - 0.2 || cc[1] > b.bb[3] + 0.2) continue;
              const d = turf.pointToPolygonDistance(turf.point(cc), b.f, { units: 'kilometers' });
              if (d < bd) { bd = d; best = b; }
            }
            if (!best) continue;
            border.set(owner.get(best.i), 1);
          }
          const to = [...border].sort((a, b) => b[1] - a[1])[0][0], T = cl.get(to);
          const mv = new Set(comp.ids);
          c.ids = c.ids.filter((k) => !mv.has(k)); c.A -= comp.area;
          T.ids.push(...comp.ids); T.A += comp.area;
          for (const k of comp.ids) owner.set(k, to);
          moved++;
        }
      }
      if (!moved) break;
    }
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
      : modern === 'LBY' ? 'Deserto Libico' : ['IRN', 'AFG'].includes(modern) ? 'Deserti persiani' : ['TKM', 'UZB', 'KAZ', 'KGZ', 'TJK'].includes(modern) ? 'Deserti del Turan' : 'Sahara';
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
    const freedA = mem.filter((a) => a.freed).reduce((x, a) => x + a.area, 0);
    const eu = freedA > c.A * 0.5;
    const rObj = c.reg ? REG.find((r) => r.name === c.reg) : null;
    if (eu && c.reg && !desert && !oasis) name = c.reg.trim();
    let region = c.reg || (histName ? AF_REGION[histName] || histName : AF_NULL_REGION[modern] || modern);
    if (eu && rObj?.euRegion) region = rObj.euRegion;
    if (typeof region === 'string') region = region.trim();
    groupOf.set(id, infos.length);
    infos.push({ name, owner, modern, area: c.A, region, prot: null, byNameList: towns.length > 1 ? towns.map((t) => t[0]) : null, byTown: !!towns.length, lockName: null, desert, oasis, iso, hreg: histName, lang: '', af: true, eu, reg: c.reg, gsum: mem.reduce((s, a) => s + a.gsum, 0) });
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
  const atomOf = new Map();
  for (const [id, c] of cl) for (const i of c.ids) atomOf.set(i, id);
  const raw = A.map((a) => ({ type: 'Feature', geometry: a.f.geometry, properties: { g: groupOf.get(atomOf.get(a.i)) } }));
  // i pezzi divisi in celle non combaciano al metro: si fondono per provincia e si chiudono le fessure fra province
  // (vanno alla provincia vicina), così non restano buchi né false coste
  fs.writeFileSync(P('out_raw.geojson'), JSON.stringify(turf.featureCollection(raw)));
  ms(P('out_raw.geojson'), '-dissolve2', 'g', '-clean', 'gap-fill-area=25km2', '-o', P('out_clean.geojson'));
  const clean = readJSON(P('out_clean.geojson')).features.filter((f) => f.geometry && f.properties.g != null);
  const pieces = clean.length >= infos.length * 0.98 ? clean : raw;
  if (pieces === raw) log('Africa: pulizia delle fessure non riuscita, uso i pezzi grezzi');
  return { pieces, infos };
}
