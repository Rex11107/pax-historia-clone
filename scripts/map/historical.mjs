// Unità amministrative d'epoca al posto delle province moderne di Natural Earth, dove esistono dati aperti:
//  - HistoGIS (ACDH-CH, Accademia austriaca delle scienze; CC BY 4.0): Regierungsbezirke prussiani,
//    Kreise bavaresi, distretti del Baden, distretti della Cisleitania, Kronländer austro-ungarici
//  - RISTAT (Kessler & Markevich, Electronic Repository of Russian Historical Statistics; CC0):
//    uezd e governatorati dell'Impero russo, censimento 1897
//
// Ogni unità porta il proprietario 1881 (certo: è un'unità di quello stato) e il "padre" storico
// (provincia prussiana, Kronland, governatorato) che decide gli accorpamenti. Fuori dalla copertura
// restano le province moderne; quelle della Transleitania vengono tagliate sui confini dei Kronländer
// (Ungheria, Croazia-Slavonia, Confine militare) così che anche lì gli accorpamenti seguano linee d'epoca.

import fs from 'node:fs';
import path from 'node:path';
import * as turf from '@turf/turf';

const LAYERS = [
  { file: 'histogis/prussia.geojson', own: 'GER', parent: { file: 'histogis/prussia_prov.geojson' }, src: 'P' },
  { file: 'histogis/bavaria.geojson', own: 'GER', parentName: 'Baviera', src: 'B' },
  { file: 'histogis/baden.geojson', own: 'GER', parentName: 'Baden', src: 'D' },
  { file: 'histogis/cisleithania.geojson', own: 'AUH', parent: { file: 'histogis/crownlands.geojson' }, src: 'C' },
  { file: 'ristat/districts1897.geojson', own: 'RUS', ristat: true, src: 'R' },
];
// Kronländer della Transleitania: tagliano le province moderne rimaste
const TRANS = ['Königreich Ungarn', 'Königreich Kroatien und Slawonien', 'Militärgrenze', 'Freie Stadt Fiume mit Gebiet'];
const PARENT_IT = {
  Ostpreußen: 'Prussia Orientale', Westpreußen: 'Prussia Occidentale', Pommern: 'Pomerania', Schlesien: 'Slesia', Sachsen: 'Sassonia prussiana',
  Westfalen: 'Vestfalia', Rheinprovinz: 'Renania', 'Hessen-Nassau': 'Assia-Nassau',
};
const DE_IT = {
  Köln: 'Colonia', München: 'Monaco di Baviera', Wien: 'Vienna', Prag: 'Praga', Krakau: 'Cracovia', Lemberg: 'Leopoli', Triest: 'Trieste', Görz: 'Gorizia',
  Trient: 'Trento', Bozen: 'Bolzano', Rovereto: 'Rovereto', Pola: 'Pola', Zara: 'Zara', Spalato: 'Spalato', Ragusa: 'Ragusa', Cattaro: 'Cattaro',
  Frankfurt: 'Francoforte', 'Frankfurt / Oder': 'Francoforte sull\'Oder', Aachen: 'Aquisgrana', Trier: 'Treviri', Koblenz: 'Coblenza', Regensburg: 'Ratisbona',
  Nürnberg: 'Norimberga', Augsburg: 'Augusta', Pfalz: 'Palatinato', Oberbayern: 'Alta Baviera', Niederbayern: 'Bassa Baviera', Oberfranken: 'Alta Franconia',
  Mittelfranken: 'Media Franconia', 'Unterfranken und Aschaffenburg': 'Bassa Franconia', 'Oberpfalz und Regensburg': 'Alto Palatinato', 'Schwaben und Neuburg': 'Svevia',
  Braunschweig: 'Brunswick', Hannover: 'Hannover', Kassel: 'Kassel', Wiesbaden: 'Wiesbaden', Danzig: 'Danzica', Breslau: 'Breslavia', Stettin: 'Stettino',
  Posen: 'Posen', Königsberg: 'Königsberg', 'Hohenzollern-Sigmaringen': 'Hohenzollern', 'Hohenzollern-Hechingen': 'Hechingen', Konstanz: 'Costanza', Freiburg: 'Friburgo',
  Innsbruck: 'Innsbruck', Salzburg: 'Salisburgo', Laibach: 'Lubiana', Klagenfurt: 'Klagenfurt', Graz: 'Graz', Linz: 'Linz', Brünn: 'Brno', Olmütz: 'Olomouc',
  Troppau: 'Troppau', Czernowitz: 'Czernowitz', Teschen: 'Teschen', Pilsen: 'Pilsen', Budweis: 'Budweis', Reichenberg: 'Reichenberg', Eger: 'Eger',
};

const TRENTINO_DISTRICTS = new Set(['Trient', 'Rovereto', 'Riva', 'Tione', 'Cles', 'Borgo', 'Primiero', 'Cavalese', 'Mezzolombardo']);
const clean = (n) => String(n || '').replace(/\s*\((Stadt|Landbezirk|Umgebung|Land|Stadt und Land)\)/g, '').replace(/^Stadt\s+/, '').trim();
const ruParent = (s) => String(s).replace(/ (governorate|region|oblast)( incl\..*)?$/i, '').replace(/ Cossack host lands/, ' (Cosacchi del Don)').trim();
// Nome dell'uezd: è l'aggettivo della sua città ("Novgorodskii" -> "Novgorod"). Le forme irregolari
// (capoluoghi soprattutto) sono in tabella; per le altre si prova "radice", "radice+sk", "radice+a"
// contro le località di Natural Earth vicine, altrimenti si usa la radice. Mai il nome moderno.
const RU_IRREG = {
  Rizhskii: 'Riga', Kaluzhskii: 'Kaluga', Tulskii: 'Tula', Penzenskii: 'Penza', Viatskii: 'Vjatka', Kostromskoi: 'Kostroma', Iaroslavskii: 'Jaroslavl',
  Vologodskii: 'Vologda', Moskovskii: 'Mosca', Varshavskii: 'Varsavia', Kievskii: 'Kiev', Odesskii: 'Odessa', Khersonskii: 'Cherson', Plotskii: 'Płock',
  Kalishskii: 'Kalisz', Petrokovskii: 'Piotrków', Keletskii: 'Kielce', Liublinskii: 'Lublino', Sedletskii: 'Siedlce', Lomzhinskii: 'Łomża', Suvalkskii: 'Suwałki',
  Kovenskii: 'Kovno', Vilenskii: 'Vilna', Grodnenskii: 'Grodno', Revelskii: 'Reval', Orlovskii: 'Orël', Riazanskii: 'Rjazan', Kazanskii: 'Kazan',
  Samarskii: 'Samara', Astrakhanskii: 'Astrachan', Simferopolskii: 'Sinferopoli', Tiflisskii: 'Tiflis', Erivanskii: 'Erevan', Bakinskii: 'Baku',
  Kutaisskii: 'Kutais', Elisavetpolskii: 'Elisavetpol', Tverskoi: 'Tver', Nizhegorodskii: 'Nižnij Novgorod', Poltavskii: 'Poltava', Chernigovskii: 'Černigov',
  Zhitomirskii: 'Žitomir', 'Kamenets-Podolskii': 'Kamenec-Podolskij', Kishinevskii: 'Kišinëv', Sevastopolskoe: 'Sebastopoli', 'Kerch-Enikalskoe': 'Kerč',
  'Donskoi 1-I': 'Primo distretto del Don', 'Donskoi 2-I': 'Secondo distretto del Don', 'Vnutrenniaia Kirgizskaia Orda': 'Orda interna kirghisa',
  'Kalmytskaia Step': 'Steppa calmucca', 'Karanogaiskoe Pristavstvo': 'Steppa nogai', Trukhmenskoe: 'Truchmeni', Achikulakskoe: 'Ačikulak',
  Bolshederbetovskoe: 'Bolšoj Derbet', Arkhangelskaia: 'Arcangelo', Feodosiiskii: 'Feodosia', Evpatoriiskii: 'Eupatoria', Ialtinskii: 'Jalta',
  Iziumskii: 'Izjum', Sumskii: 'Sumy', Eletskii: 'Elec', Lipetskii: 'Lipeck', Lutskii: 'Luck', Brestskii: 'Brest-Litovsk', Belostokskii: 'Białystok',
  Shavelskii: 'Šavli', Vindavskii: 'Windau', Pernovskii: 'Pernau', Mariupolskii: 'Mariupol', Berdianskii: 'Berdjansk', Ekaterinoslavskii: 'Ekaterinoslav',
  Tsarskoselskii: 'Carskoe Selo', Shlisselburgskii: 'Schlüsselburg', Novorossiiskii: 'Novorossijsk', Sochinskii: 'Soči', Ekaterinodarskii: 'Ekaterinodar',
  Riazhskii: 'Rjažsk', Kineshemskii: 'Kinešma', Kolomenskii: 'Kolomna', Tsaritsynskii: 'Caricyn', Kharkovskii: 'Char\'kov', Voronezhskii: 'Voronež',
  Gomelskii: 'Gomel', Nezhinskii: 'Nežin', Smolenskii: 'Smolensk', Vitebskii: 'Vitebsk', Polotskii: 'Polock', Minskii: 'Minsk', Pinskii: 'Pinsk',
  Kurskii: 'Kursk', Tomskii: 'Tomsk', Dvinskii: 'Dvinsk', Novgorodskii: 'Novgorod', Pskovskii: 'Pskov', Vladimirskii: 'Vladimir', Simbirskii: 'Simbirsk',
  Saratovskii: 'Saratov', Stavropolskii: 'Stavropol', Vladikavkazskii: 'Vladikavkaz', Taganrogskii: 'Taganrog', Batumskii: 'Batum', Sukhumskii: 'Suchum',
  Karsskii: 'Kars', Dneprovskii: 'Aleški', Perekopskii: 'Perekop', Odoevskii: 'Odoev', 'Novgorod-Severskii': 'Novgorod-Severskij',
  Nikolskii: 'Nikolsk', 'Orlovskii|Viatka governorate': 'Orlov', 'Stavropolskii|Samara governorate': 'Stavropol sul Volga',
  'Aleksandrovskii|Vladimir governorate': 'Aleksandrov', 'Aleksandrovskii|Stavropol governorate': 'Aleksandrovskoe', 'Aleksandrovskii|Arkhangelsk governorate': 'Aleksandrovsk sul Murman',
  'Ust-Medvedkovskii': 'Ust-Medvedica', Novouzenskii: 'Novouzensk', Tsarevskii: 'Carev', Mozhaiskii: 'Možajsk',
  Petrogradskii: 'San Pietroburgo', Petergofskii: 'Peterhof', Rossienskii: 'Rossieny', Veliunskii: 'Wieluń', Lodzinskii: 'Łódź', Rovenskii: 'Rovno', Iziaslavskii: 'Izjaslavl', Rechitskii: 'Rečica', Vinnitskii: 'Vinnica',
  Radomskii: 'Radom', Kremenchugskii: 'Kremenčug', Velikolutskii: 'Velikie Luki', Tarashchanskii: 'Tarašča', Elatomskii: 'Elatma', Bogoroditskii: 'Bogorodick',
  Pinezhskii: 'Pinega', Onezhskii: 'Onega', Totemskii: 'Tot\'ma', Starorusskii: 'Staraja Russa', Vyshnevolotskii: 'Vyšnij Voloček', Novotorzhskii: 'Toržok',
  Ezelskii: 'Ösel', Pinchovskii: 'Pińczów', Chenstokhovskii: 'Częstochowa', Bendinskii: 'Będzin', Zamostskii: 'Zamość', Kholmskii: 'Chełm', Tsarevokokshaiskii: 'Carevokokšajsk',
  'Kolskii|Arkhangelsk governorate': 'Kola', 'Kolskii|Kalisz governorate': 'Koło', 'Kholmskii|Pskov governorate': 'Cholm',
  'Iurevskii|Livonia governorate': 'Dorpat', 'Iurevskii|Vladimir governorate': 'Jurev-Polskij', 'Aleksandrovskii|Ekaterinoslav governorate': 'Aleksandrovsk',
  'Belskii|Grodno governorate': 'Bielsk', 'Belskii|Siedlce governorate': 'Biała', 'Belskii|Smolensk governorate': 'Belyj',
};
const norm = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/kh/g, 'h').replace(/[yj]/g, 'i').replace(/iu/g, 'u').replace(/ia/g, 'a').replace(/w/g, 'v').replace(/[^a-z]/g, '');
function ruTown(adj, prov, nearby) {
  const k = RU_IRREG[`${adj}|${prov}`] || RU_IRREG[adj];
  if (k) return k;
  if (!/(skii|skoi|skij)$/.test(adj)) return adj;
  if (/tskii$/.test(adj)) return adj.replace(/tskii$/, 'ts');
  const stem = adj.replace(/(skii|skoi|skij)$/, '');
  const cands = [stem + 'sk', stem, stem + 'a', stem + 'y', stem.replace(/e([a-z])$/, '$1') + 'a'];
  const near = new Set(nearby.map(norm));
  for (const c of cands) if (near.has(norm(c))) return c;
  return stem;
}

function inside(pt, f) {
  const bb = f.bb || (f.bb = turf.bbox(f));
  return pt[0] >= bb[0] && pt[0] <= bb[2] && pt[1] >= bb[1] && pt[1] <= bb[3] && turf.booleanPointInPolygon(pt, f);
}
const anchor = (f) => { try { return turf.pointOnFeature(f).geometry.coordinates; } catch { return turf.centroid(f).geometry.coordinates; } };

/**
 * Costruisce la base delle province: unità d'epoca dove coperte, province moderne altrove.
 * @returns {string|null} percorso del GeoJSON risultante (stessi campi di prov.geojson + own) o null se mancano i dati
 */
export function buildHistoricalBase({ ms, RAW, TMP, BBOX, provPath, places, exo, log }) {
  const have = LAYERS.filter((l) => fs.existsSync(path.join(RAW, l.file)));
  if (!have.length) return null;
  const prov = JSON.parse(fs.readFileSync(provPath, 'utf8'));
  const modernOf = (pt) => prov.features.find((f) => inside(pt, f))?.properties;
  const crown = fs.existsSync(path.join(RAW, 'histogis/crownlands.geojson')) ? JSON.parse(fs.readFileSync(path.join(RAW, 'histogis/crownlands.geojson'), 'utf8')).features : [];

  const townIn = (f, min) => {
    const bb = turf.bbox(f);
    let best = null, bp = min;
    for (const pl of places) {
      const [x, y] = pl.geometry.coordinates;
      if (x < bb[0] || x > bb[2] || y < bb[1] || y > bb[3]) continue;
      const pop = pl.properties.pop_max || 0;
      if (pop > bp && turf.booleanPointInPolygon([x, y], f)) { bp = pop; best = pl.properties.name; }
    }
    return best;
  };
  // 1. unità per livello, col padre storico e il paese moderno (per popolazione e chiave di accorpamento)
  const layerFiles = [];
  let units = 0;
  for (const L of have) {
    const fc = JSON.parse(fs.readFileSync(path.join(RAW, L.file), 'utf8'));
    let parents = [];
    if (L.parent) {
      // più versioni della stessa provincia: vale quella in vigore il 1° gennaio 1881 con l'inizio più recente
      const all = JSON.parse(fs.readFileSync(path.join(RAW, L.parent.file), 'utf8')).features
        .filter((f) => (f.properties.start || '0') <= '1881-01-01' && '1881-01-01' <= (f.properties.end || '9999'));
      const byName = new Map();
      for (const f of all) { const o = byName.get(f.properties.name); if (!o || o.properties.start < f.properties.start) byName.set(f.properties.name, f); }
      parents = [...byName.values()];
    }
    const feats = [];
    for (const f0 of fc.features) {
      if (!f0.geometry) continue;
      const bb0 = turf.bbox(f0);
      if (bb0[2] < BBOX[0] || bb0[0] > BBOX[2] || bb0[3] < BBOX[1] || bb0[1] > BBOX[3]) continue;
      // le unità a cavallo del bordo dell'area di gioco si tagliano, non si scartano
      const f = bb0[0] < BBOX[0] || bb0[2] > BBOX[2] || bb0[1] < BBOX[1] || bb0[3] > BBOX[3] ? { ...f0, geometry: turf.bboxClip(f0, BBOX).geometry } : f0;
      if (!f.geometry.coordinates.length || turf.area(f) < 1e6) continue;
      const pt = anchor(f);
      const p = f.properties;
      let parent, name, id;
      if (L.ristat) {
        parent = ruParent(p.prov_ENG); id = `R${p.Distr_ID}`;
        const bb = turf.bbox(f);
        const nearby = places.filter((pl) => { const [x, y] = pl.geometry.coordinates; return x > bb[0] - 0.2 && x < bb[2] + 0.2 && y > bb[1] - 0.2 && y < bb[3] + 0.2; })
          .flatMap((pl) => [pl.properties.name, pl.properties.name_en, pl.properties.namealt].filter(Boolean));
        name = ruTown(p.Name_ENG, p.prov_ENG, nearby);
      } else {
        parent = L.parentName || parents.find((q) => inside(pt, q))?.properties.name || parents.map((q) => [q, turf.distance(pt, turf.centroid(q))]).sort((a, b) => a[1] - b[1])[0]?.[0].properties.name || '?';
        parent = PARENT_IT[parent] || parent;
        // il Trentino (distretti di lingua italiana del Tirolo) è un contenitore a sé: non si accorpa con l'Alto Adige
        if (parent === 'Gefürstete Grafschaft Tirol' && TRENTINO_DISTRICTS.has(clean(p.name))) parent = 'Trentino';
        id = `${L.src}${p.hid}`;
        const n = clean(p.name);
        name = DE_IT[n] || exo(n);
      }
      const m = modernOf(pt) || {};
      feats.push({ type: 'Feature', geometry: f.geometry, properties: { pid: id, iso: m.iso || '', pname: name, modern: m.modern || '', reg: `H:${parent}`, nreg: m.reg || null, own: L.own } });
    }
    const raw = path.join(TMP, `h_${L.src}_raw.geojson`);
    fs.writeFileSync(raw, JSON.stringify({ type: 'FeatureCollection', features: feats }));
    layerFiles.push({ ...L, raw, n: feats.length });
    units += feats.length;
  }

  // 2. terraferma di Natural Earth: le coste restano quelle della mappa, non quelle dei singoli dataset
  const land = path.join(TMP, 'h_land.geojson');
  ms(provPath, '-dissolve2', '-o', land);
  // 3. precedenza nell'ordine dei livelli: ognuno perde ciò che è già coperto dai precedenti
  const done = [];
  let cover = null;
  for (const L of layerFiles) {
    const out = path.join(TMP, `h_${L.src}.geojson`);
    const args = [L.raw, '-clean', '-simplify', 'interval=800', 'keep-shapes', '-clip', land];
    if (cover) args.push('-erase', cover);
    ms(...args, '-explode', '-each', 'harea=this.area/1e6', '-o', out);
    done.push(out);
    const nextCover = path.join(TMP, `h_cover_${L.src}.geojson`);
    ms('-i', ...(cover ? [cover, out] : [out]), 'combine-files', '-merge-layers', 'force', '-dissolve2', '-o', nextCover);
    cover = nextCover;
  }
  // 4. province moderne fuori copertura
  const rest = path.join(TMP, 'h_rest.geojson');
  // i frammenti minuscoli nati dall'erase si scartano; le province intere (Malta, Gibilterra) restano
  ms(provPath, '-each', 'oarea=this.area/1e6', '-erase', cover, '-explode', '-each', 'harea=this.area/1e6', '-filter', 'harea > 4 || harea > oarea * 0.9', '-o', rest);
  // 4b. Transleitania: tagli sui Kronländer
  let restFinal = rest;
  const trans = crown.filter((f) => TRANS.includes(f.properties.name) && (f.properties.start || '0') <= '1881-01-01' && '1881-01-01' <= (f.properties.end || '9999'));
  if (trans.length) {
    const tp = path.join(TMP, 'h_trans.geojson');
    fs.writeFileSync(tp, JSON.stringify(turf.featureCollection(trans.map((f) => ({ type: 'Feature', geometry: f.geometry, properties: { crown: PARENT_IT[f.properties.name] || f.properties.name } })))));
    restFinal = path.join(TMP, 'h_rest_trans.geojson');
    ms('-i', rest, tp, 'combine-files', 'snap', '-union', 'target=h_rest,h_trans', '-filter', 'pid != null', 'remove-empty', '-explode', '-each', 'harea=this.area/1e6', '-filter', 'harea > 4 || harea > oarea * 0.9', '-o', restFinal);
  }

  // 5. unione: ogni parte staccata ha un proprio pid, così pezzi lontani della stessa provincia moderna non si riuniscono
  const features = [];
  const seen = new Map();
  const uniq = (pid) => { const k = (seen.get(pid) || 0) + 1; seen.set(pid, k); return k === 1 ? pid : `${pid}~h${k}`; };
  const crownName = { 'Königreich Ungarn': 'Ungheria', 'Königreich Kroatien und Slawonien': 'Croazia-Slavonia', Militärgrenze: 'Confine militare', 'Freie Stadt Fiume mit Gebiet': 'Fiume' };
  const CUT = new Set(['DEU', 'HRV', 'ROU', 'SRB', 'HUN', 'AUT', 'CZE', 'POL', 'UKR', 'SVK', 'SVN']);
  for (const file of [...done, restFinal]) {
    const fc = JSON.parse(fs.readFileSync(file, 'utf8'));
    // province moderne spezzate dalla copertura d'epoca (Bassa Sassonia -> Oldenburg, Brunswick…): ogni parte grande
    // prende il nome della sua città principale
    const bigParts = new Map();
    for (const f of fc.features) if (!f.properties.own && (f.properties.harea || 0) > 300) bigParts.set(f.properties.pid, (bigParts.get(f.properties.pid) || 0) + 1);
    for (const f of fc.features) {
      const p = f.properties;
      if (!p.own && CUT.has(p.modern) && bigParts.get(p.pid) > 1 && (p.harea || 0) > 300) { const t = townIn(f, 8000); if (t) p.pname = exo(t); }
    }
    const sorted = fc.features.filter((f) => f.geometry).sort((a, b) => (b.properties.harea || 0) - (a.properties.harea || 0));
    for (const f of sorted) {
      const p = f.properties;
      const reg = p.crown ? `H:${crownName[p.crown] || p.crown}` : p.reg;
      const pid = uniq(p.pid);
      // exclavi delle unità d'epoca: prendono il nome della loro città principale (Schmalkalden, Rinteln…)
      let pname = p.pname;
      if (p.own && pid !== p.pid) { const t = townIn(f, 3000); if (t) pname = exo(t); }
      features.push({ type: 'Feature', geometry: f.geometry, properties: { pid, iso: p.iso || '', pname, modern: p.modern, reg: reg ?? null, nreg: p.nreg ?? (p.own ? null : p.reg ?? null), own: p.own || null } });
    }
  }
  const out = path.join(TMP, 'prov_hist.geojson');
  fs.writeFileSync(out, JSON.stringify(turf.featureCollection(features)));
  ms(out, '-clean', '-o', 'force', out);
  log(`unità d'epoca: ${layerFiles.map((l) => `${l.src}=${l.n}`).join(' ')} (${units}); ${features.length} pezzi di base`);
  return out;
}
