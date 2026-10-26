#!/usr/bin/env node
// Scarica da HistoGIS (ACDH, Accademia austriaca delle scienze; CC BY 4.0) le unità amministrative
// in vigore al 1° gennaio 1881 usate come base della mappa:
//  - Regierungsbezirke prussiani, Kreise bavaresi, distretti del Baden
//  - distretti (Bezirkshauptmannschaften) della Cisleitania e i Kronländer austro-ungarici
// Risultato: data-raw/histogis/<gruppo>.geojson. Ripetibile; salta i file già presenti.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'data-raw/histogis');
const API = 'https://histogis.acdh.oeaw.ac.at/api';
const DATE = '1881-01-01';

const GROUPS = {
  prussia: (r) => r.source_name.startsWith('Prussia Governmental Districts'),
  prussia_prov: (r) => r.source_name.startsWith('Prussia Provinces'),
  bavaria: (r) => r.source_name.startsWith('Bavaria Counties'),
  baden: (r) => r.source_name.startsWith('Baden Counties'),
  cisleithania: (r) => r.source_name.startsWith('Cisleithanien Districts'),
  crownlands: (r) => r.source_name.startsWith('Austro-Hungarian Empire Crownlands') || r.source_name.startsWith('Austrian Empire Crownlands'),
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJSON(url) {
  for (let i = 0; i < 6; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch { /* ritenta */ }
    await sleep(2000 * (i + 1));
  }
  throw new Error(`HistoGIS non risponde: ${url}`);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const idxPath = path.join(OUT, 'index.json');
  let index;
  if (fs.existsSync(idxPath)) index = JSON.parse(fs.readFileSync(idxPath, 'utf8'));
  else {
    index = [];
    for (let page = 1; ; page++) {
      const d = await getJSON(`${API}/tempspatial-simple/?format=json&limit=50&page=${page}`);
      index.push(...d.results);
      if (!d.next) break;
      await sleep(250);
    }
    fs.writeFileSync(idxPath, JSON.stringify(index));
  }
  const valid = index.filter((r) => (r.start_date || '0000') <= DATE && DATE <= (r.end_date || '9999'));
  for (const [name, pick] of Object.entries(GROUPS)) {
    const file = path.join(OUT, `${name}.geojson`);
    if (fs.existsSync(file)) continue;
    const recs = valid.filter(pick);
    const features = [];
    for (const r of recs) {
      const f = await getJSON(`${API}/tempspatial/${r.id}/?format=json`);
      features.push({ type: 'Feature', geometry: f.geometry, properties: { hid: r.id, name: r.title, alt: r.alt_name || '', adm: r.adm_name, source: r.source_name, start: r.start_date, end: r.end_date, wikidata: r.wikidata_id || '' } });
      await sleep(150);
    }
    fs.writeFileSync(file, JSON.stringify({ type: 'FeatureCollection', features }));
    console.log(`[histogis] ${name}: ${features.length} unità`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
