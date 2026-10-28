// Risorse delle province (1881). Ogni provincia ha una risorsa di base (agricoltura, legname, pesca, allevamento)
// dedotta dalla geografia, più le risorse strategiche dei giacimenti noti dell'epoca (carbone, ferro, petrolio,
// zolfo, metalli, sale) e le colture di pregio (cotone, seta, tabacco). Chi controlla la provincia ne ricava
// un'entrata settimanale; carbone e ferro rendono di più alle nazioni industriali.
// Il deserto non ha truppe ma può avere risorse (le saline del Sahara): appartiene a chi controlla le terre attorno.

import type { GameMap } from './map';
import type { ProvinceData, Tag } from './types';

export type ResourceId = 'grano' | 'bestiame' | 'legname' | 'pesce' | 'datteri' | 'olio' | 'vino' | 'tabacco' | 'seta' | 'cotone'
  | 'sale' | 'zolfo' | 'metalli' | 'petrolio' | 'ferro' | 'carbone';

export interface ResourceInfo { label: string; icon: string; value: number; strategic: boolean; industrial: boolean }

/** value = milioni a settimana per provincia controllata (prima del moltiplicatore industriale) */
export const RESOURCES: Record<ResourceId, ResourceInfo> = {
  grano: { label: 'grano', icon: '🌾', value: 0.04, strategic: false, industrial: false },
  bestiame: { label: 'bestiame', icon: '🐄', value: 0.03, strategic: false, industrial: false },
  legname: { label: 'legname', icon: '🌲', value: 0.03, strategic: false, industrial: false },
  pesce: { label: 'pesce', icon: '🐟', value: 0.03, strategic: false, industrial: false },
  datteri: { label: 'datteri', icon: '🌴', value: 0.02, strategic: false, industrial: false },
  olio: { label: 'olio d\'oliva', icon: '🫒', value: 0.05, strategic: false, industrial: false },
  vino: { label: 'vino', icon: '🍇', value: 0.06, strategic: false, industrial: false },
  tabacco: { label: 'tabacco', icon: '🍂', value: 0.08, strategic: false, industrial: false },
  seta: { label: 'seta', icon: '🧵', value: 0.1, strategic: false, industrial: false },
  cotone: { label: 'cotone', icon: '☁️', value: 0.12, strategic: false, industrial: false },
  sale: { label: 'sale', icon: '🧂', value: 0.06, strategic: true, industrial: false },
  zolfo: { label: 'zolfo', icon: '🟡', value: 0.12, strategic: true, industrial: false },
  metalli: { label: 'rame, piombo e mercurio', icon: '⚒️', value: 0.15, strategic: true, industrial: false },
  petrolio: { label: 'petrolio', icon: '🛢️', value: 0.12, strategic: true, industrial: true },
  ferro: { label: 'ferro', icon: '🔩', value: 0.2, strategic: true, industrial: true },
  carbone: { label: 'carbone', icon: '⚫', value: 0.25, strategic: true, industrial: true },
};

/** Giacimenti e distretti noti nel 1881: [risorsa, lon, lat, nome]. */
export const SITES: [ResourceId, number, number, string][] = [
  // carbone
  ['carbone', 7.2, 51.5, 'Ruhr'], ['carbone', 7.0, 49.3, 'Saar'], ['carbone', 18.9, 50.3, 'Alta Slesia'], ['carbone', 16.3, 50.77, 'Waldenburg'],
  ['carbone', 12.5, 50.72, 'Zwickau'], ['carbone', 6.1, 50.8, 'Aquisgrana'], ['carbone', 18.3, 49.83, 'Ostrava'], ['carbone', 14.1, 50.15, 'Kladno'],
  ['carbone', 13.4, 49.75, 'Pilsen'], ['carbone', 19.2, 50.33, 'Dąbrowa'], ['carbone', 38.0, 48.1, 'Donec'], ['carbone', 39.5, 48.3, 'Donec orientale'],
  ['carbone', 2.8, 50.45, 'Nord-Pas-de-Calais'], ['carbone', 4.4, 45.43, 'Saint-Étienne'], ['carbone', 4.43, 46.8, 'Le Creusot'], ['carbone', 4.08, 44.13, 'Alès'],
  ['carbone', 5.57, 50.63, 'Liegi'], ['carbone', 4.44, 50.41, 'Charleroi'], ['carbone', 3.95, 50.45, 'Borinage'], ['carbone', -3.4, 51.65, 'Galles meridionale'],
  ['carbone', -1.6, 54.85, 'Durham e Northumberland'], ['carbone', -1.5, 53.6, 'Yorkshire'], ['carbone', -2.5, 53.55, 'Lancashire'], ['carbone', -2.1, 52.6, 'Black Country'],
  ['carbone', -3.9, 55.85, 'Lanarkshire'], ['carbone', -3.2, 56.1, 'Fife'], ['carbone', -5.8, 43.3, 'Asturie'], ['carbone', 31.8, 41.45, 'Eraclea (Zonguldak)'],
  ['carbone', 18.2, 46.07, 'Pécs'], ['carbone', 23.36, 45.41, 'valle dello Jiu'], ['carbone', 8.5, 39.2, 'Sulcis'],
  // ferro
  ['ferro', 6.0, 49.45, 'minette di Lorena'], ['ferro', 6.1, 49.2, 'Metz-Thionville'], ['ferro', -2.93, 43.26, 'Biscaglia'], ['ferro', 10.4, 42.78, 'Elba'],
  ['ferro', 33.35, 47.9, 'Krivoj Rog'], ['ferro', 14.9, 47.52, 'Erzberg'], ['ferro', 14.99, 60.08, 'Grängesberg'], ['ferro', 17.86, 60.2, 'Dannemora'],
  ['ferro', 20.66, 67.13, 'Gällivare'], ['ferro', -3.4, 54.6, 'Cumbria'], ['ferro', -1.1, 54.55, 'Cleveland'], ['ferro', 8.0, 50.87, 'Siegerland'],
  ['ferro', 20.4, 48.7, 'Gömör'], ['ferro', -1.5, 40.7, 'Ojos Negros'], ['ferro', 7.7, 36.85, 'Mokta el Hadid'], ['ferro', 22.9, 45.75, 'Hunyad'],
  // petrolio
  ['petrolio', 49.85, 40.4, 'Baku'], ['petrolio', 45.7, 43.3, 'Groznyj'], ['petrolio', 23.42, 49.29, 'Boryslav'], ['petrolio', 25.9, 45.1, 'Prahova'],
  ['petrolio', 7.9, 48.95, 'Pechelbronn'], ['petrolio', 9.85, 52.66, 'Wietze'], ['petrolio', 40.0, 44.6, 'Kuban'],
  // zolfo
  ['zolfo', 14.06, 37.49, 'Caltanissetta'], ['zolfo', 13.58, 37.31, 'Agrigento'], ['zolfo', 12.2, 43.95, 'Romagna'], ['zolfo', 14.5, 37.6, 'Enna'],
  // metalli
  ['metalli', -6.6, 37.7, 'Rio Tinto'], ['metalli', -3.63, 38.09, 'Linares'], ['metalli', -4.84, 38.77, 'Almadén'], ['metalli', 14.03, 46.0, 'Idria'],
  ['metalli', 24.05, 37.72, 'Laurio'], ['metalli', 8.54, 39.31, 'Iglesiente'], ['metalli', 15.63, 60.6, 'Falun'], ['metalli', 10.4, 51.8, 'Harz'],
  ['metalli', 11.5, 51.6, 'Mansfeld'], ['metalli', 13.3, 50.9, 'Freiberg'], ['metalli', -5.2, 50.25, 'Cornovaglia'], ['metalli', 11.6, 42.9, 'Amiata'],
  ['metalli', 18.9, 48.45, 'Schemnitz'], ['metalli', 14.0, 49.69, 'Příbram'], ['metalli', 13.67, 46.63, 'Bleiberg'], ['metalli', 45.6, 40.55, 'Kedabek'],
  ['metalli', 43.3, 42.3, 'Čiatura'], ['metalli', 10.4, 63.2, 'Røros'],
  // sale
  ['sale', 20.06, 49.98, 'Wieliczka'], ['sale', 13.6, 47.6, 'Salzkammergut'], ['sale', -2.5, 53.2, 'Cheshire'], ['sale', 11.58, 51.86, 'Stassfurt'],
  ['sale', 38.0, 48.6, 'Bachmut'], ['sale', -0.68, 37.98, 'Torrevieja'], ['sale', 12.5, 38.0, 'Trapani'], ['sale', 25.94, 45.24, 'Slănic'],
  ['sale', 33.6, 46.0, 'saline di Crimea'], ['sale', 46.8, 49.15, 'lago Elton'], ['sale', 8.2, 34.1, 'chott el-Djerid'], ['sale', 5.3, 30.4, 'saline del Sahara'],
  // cotone, seta, tabacco
  ['cotone', 31.0, 30.8, 'delta del Nilo'], ['cotone', 31.4, 31.0, 'delta del Nilo'], ['cotone', 30.6, 30.9, 'delta del Nilo'], ['cotone', 35.3, 37.0, 'Cilicia'],
  ['cotone', 27.5, 37.8, 'valle del Meandro'], ['cotone', 23.55, 41.1, 'Serres'], ['cotone', 46.36, 40.68, 'Elisavetpol'], ['cotone', 44.5, 40.1, 'Erevan'],
  ['seta', 9.5, 45.7, 'Brianza'], ['seta', 9.1, 45.8, 'Como'], ['seta', 7.6, 44.6, 'Piemonte'], ['seta', 11.8, 45.6, 'Veneto'], ['seta', 4.0, 44.2, 'Cevenne'],
  ['seta', 4.85, 45.75, 'Lione'], ['seta', 29.06, 40.18, 'Brussa'], ['seta', 35.6, 33.9, 'Monte Libano'], ['seta', 47.2, 41.2, 'Nukha'], ['seta', -1.1, 38.0, 'Murcia'],
  ['seta', 16.2, 38.9, 'Calabria'], ['tabacco', 24.4, 41.0, 'Cavalla'], ['tabacco', 24.9, 41.15, 'Xanthi'], ['tabacco', 35.8, 35.5, 'Laodicea'],
  ['tabacco', 17.8, 43.34, 'Erzegovina'], ['tabacco', 36.3, 41.28, 'Samsun'], ['tabacco', 24.75, 42.15, 'Filippopoli'], ['tabacco', 22.4, 39.6, 'Tessaglia'],
  // vino di pregio fuori dalla fascia mediterranea
  ['vino', 0.0, 44.85, 'Bordeaux'], ['vino', 4.8, 47.0, 'Borgogna'], ['vino', 4.0, 49.1, 'Champagne'], ['vino', 8.0, 50.0, 'Rheingau'], ['vino', 6.9, 49.95, 'Mosella'],
  ['vino', 21.4, 48.13, 'Tokaj'], ['vino', -8.6, 41.15, 'Porto'], ['vino', -6.1, 36.7, 'Jerez'], ['vino', 11.25, 43.5, 'Chianti'], ['vino', 8.0, 44.7, 'Langhe'],
];

const MED = new Set(['ITA', 'ESP', 'PRT', 'GRC', 'ALB', 'HRV', 'MNE', 'CYP', 'MLT', 'ISR', 'PSX', 'LBN', 'SYR', 'TUN', 'DZA', 'MAR', 'LBY']);
const WINE = new Set(['FRA', 'ITA', 'ESP', 'PRT', 'GRC', 'HRV', 'SVN', 'HUN', 'MKD', 'BGR', 'GEO', 'MDA', 'ROU']);
const STEPPE = new Set(['KAZ', 'TKM', 'UZB']);

/** Hash deterministico 0..1 (stessa provincia, stessa risorsa a ogni partita). */
const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return ((h >>> 0) % 1000) / 1000; };

/** Risorsa di base dalla geografia. */
export function baseResource(p: ProvinceData): ResourceId | null {
  const [lon, lat] = p.lonlat;
  if (p.impassable) return null;
  if (p.oasis) return 'datteri';
  if (p.modern === 'EGY') return lat > 30.2 ? 'cotone' : 'grano';
  if (p.terrain === 'desert') return lat < 33 && hash(p.name) < 0.4 ? 'datteri' : 'bestiame';
  if (p.modern === 'NOR' || p.modern === 'ISL' || p.modern === 'FRO' || (p.coast && lat > 62)) return p.coast ? 'pesce' : 'legname';
  if (p.terrain === 'forest' || lat >= 58) return 'legname';
  if (STEPPE.has(p.modern) || (lon > 43 && lat < 48.5 && lat > 44.5)) return 'bestiame';
  const med = MED.has(p.modern) || (p.modern === 'FRA' && lat < 44.5) || (p.modern === 'TUR' && lon < 30.5);
  if (med && lat < 44.5) {
    if (p.coast && p.terrain !== 'mountain') return hash(p.name) < 0.55 ? 'olio' : 'vino';
    if (p.terrain === 'hills') return WINE.has(p.modern) ? 'vino' : 'bestiame';
  }
  if (p.terrain === 'mountain') return lat > 44 && lon > 13 && lon < 30 && hash(p.name) < 0.5 ? 'legname' : 'bestiame';
  if (WINE.has(p.modern) && lat < 47.5 && p.terrain === 'hills' && hash(p.name) < 0.5) return 'vino';
  if (p.terrain === 'marsh') return 'legname';
  // pianure e colline: miscela secondo il clima, deterministica per provincia
  const h = hash(p.name + ':' + p.id);
  const pick = (...w: [ResourceId, number][]) => { let acc = 0; for (const [r, x] of w) { acc += x; if (h < acc) return r; } return w[w.length - 1][0]; };
  const fishing = p.coast && lat > 47 && lon < 30;
  if (['FIN', 'SWE', 'EST', 'LVA'].includes(p.modern) || (lat > 56 && lon > 25)) return pick(['legname', 0.5], [fishing ? 'pesce' : 'bestiame', 0.2], ['grano', 0.3]);
  if (['IRL', 'GBR', 'NLD', 'DNK', 'CHE', 'BEL'].includes(p.modern) || (p.modern === 'FRA' && lon < 0 && lat > 46.5)) return pick(['bestiame', 0.45], [fishing ? 'pesce' : 'legname', 0.2], ['grano', 0.35]);
  if (['UKR', 'MDA', 'ROU', 'HUN', 'SRB', 'BGR'].includes(p.modern) || (p.modern === 'RUS' && lat < 54)) return pick(['grano', 0.7], ['bestiame', 0.3]);
  if (lat > 47) return pick(['grano', 0.5], ['bestiame', 0.22], [fishing ? 'pesce' : 'legname', 0.28]);
  return pick(['grano', 0.6], ['bestiame', 0.25], ['legname', 0.15]);
}

/** Risorse di ogni provincia: giacimenti (fino a due) e risorsa di base. Deterministico. */
export function assignResources(map: GameMap): ResourceId[][] {
  const out: ResourceId[][] = map.provinces.map(() => []);
  for (const [res, lon, lat] of SITES) {
    const id = map.locate(lon, lat) ?? (() => { const n = map.nearest(lon, lat); const p = map.provinces[n]; return Math.hypot((p.lonlat[0] - lon) * Math.cos((lat * Math.PI) / 180), p.lonlat[1] - lat) < 1.2 ? n : null; })();
    if (id === null) continue;
    if (!out[id].includes(res) && out[id].length < 2) out[id].push(res);
  }
  map.provinces.forEach((p, i) => {
    const b = baseResource(p);
    if (b && !out[i].includes(b)) out[i].push(b);
  });
  return out;
}

/** Entrata settimanale di una risorsa per una nazione con quel livello industriale. */
export function resourceValue(r: ResourceId, industry: number): number {
  const info = RESOURCES[r];
  return info.value * (info.industrial ? 0.5 + industry / 100 : 1);
}

/** Riepilogo per nazione: quante province per risorsa e valore settimanale. */
export function nationResources(map: GameMap, res: ResourceId[][], controller: Tag[], owner: Tag[], tag: Tag, industry: number, extra?: (i: number) => ResourceId[]) {
  const count: Partial<Record<ResourceId, number>> = {};
  let income = 0;
  for (let i = 0; i < res.length; i++) {
    if (controller[i] !== tag) continue;
    const occupied = owner[i] !== tag;
    for (const r of extra ? [...res[i], ...extra(i)] : res[i]) {
      count[r] = (count[r] ?? 0) + 1;
      income += resourceValue(r, industry) * (occupied ? 0.5 : 1);
    }
  }
  const missing = (['carbone', 'ferro'] as ResourceId[]).filter((r) => !count[r]);
  return { count, income: Math.round(income * 100) / 100, missing };
}

export const resourceLabel = (r: ResourceId) => `${RESOURCES[r].icon} ${RESOURCES[r].label}`;
