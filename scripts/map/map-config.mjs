// Configurazione storica della mappa 1881.
// Valori demografici approssimati (censimenti 1880-1881, arrotondati).

const iso = (cc, list) => list.split(' ').map((x) => `${cc}-${x}`);

// Nome dello stato in historical-basemaps world_1880 -> tag di gioco
export const HIST_TO_TAG = {
  'Italy': 'ITA',
  'France': 'FRA',
  'Algeria (FR)': 'FRA',
  'Germany': 'GER',
  'Austria Hungary': 'AUH',
  'Bosnia-Herzegovina': 'AUH', // formalmente ottomana, occupata dall'Austria-Ungheria dal 1878
  'United Kingdom of Great Britain and Ireland': 'GBR',
  'Malta': 'GBR',
  'Russian Empire': 'RUS',
  'Ottoman Empire': 'TUR',
  'Egypt': 'EGY',
  'Spain': 'SPA',
  'Portugal': 'POR',
  'Switzerland': 'SWI',
  'Belgium': 'BEL',
  'Netherlands': 'NED',
  'Luxembourg': 'LUX',
  'Denmark': 'DEN',
  'Sweden–Norway': 'SWE',
  'Greece': 'GRE',
  'Romania': 'ROM',
  'Serbia': 'SER',
  'Montenegro': 'MNE',
  'Bulgaria': 'BUL',
  'Morocco': 'MOR',
  'Persia': 'PER',
  'Arabia': 'ARA',
};

// Correzioni (il dataset 1880 riporta alcuni confini del 1878-1912 in modo impreciso).
// Ogni regola: paese moderno (adm0_a3), stato di partenza opzionale, condizione sul centro del pezzo.
export const OVERRIDES = [
  { modern: 'CYP', to: 'GBR' }, // Cipro amministrata dal Regno Unito dal 1878
  { modern: 'CYN', to: 'GBR' },
  { modern: 'TUN', to: 'TUN' }, // Beilicato di Tunisi (protettorato francese solo da maggio 1881)
  { modern: 'ISL', to: 'DEN' },
  // Il dataset usa la Bulgaria di Santo Stefano: nel 1881 Macedonia, Rumelia orientale e Creta sono ottomane
  { from: 'BUL', notModern: 'BGR', to: 'TUR' },
  // Balcani: assegnazione esplicita per provincia moderna (il dataset 1880 qui è impreciso)
  { iso: iso('BG', '05 12 06 15 04 07 11 18 17 19 08 03 27 25 14 23 22 10'), to: 'BUL' }, // Principato di Bulgaria
  { iso: iso('BG', '02 28 26 09 21 16 24 20 13 01'), to: 'TUR' }, // Rumelia orientale (autonoma) e Macedonia
  { iso: iso('RO', 'MH DJ CL TR GR CT OT BT IS VS GL TL DB IF AG GJ VL PH VN BZ NT BC BR IL B'), to: 'ROM' },
  { iso: iso('RO', 'SM AR BH TM CS MM CJ BN SJ HD CV BV SB MS HR AB SV'), to: 'AUH' }, // Transilvania, Banato, Bucovina
  { iso: iso('UA', '77 21 46 26 61'), to: 'AUH' }, // Galizia, Bucovina settentrionale, Rutenia subcarpatica
  { iso: iso('RS', '00 08 09 10 11 12 13 14 15 16 17 19 20 21 22 23 24'), to: 'SER' },
  { iso: iso('RS', '01 02 03 04 05 06 07'), to: 'AUH' }, // Voivodina
  { iso: iso('ME', '12 16 02 20 06 07 18 09 15 21 11 01'), to: 'MNE' },
  { iso: iso('ME', '14 04 03 17 13'), to: 'TUR' }, // Sangiaccato di Novi Pazar, Plav-Gusinje
  { iso: iso('ME', '10 19 08 05'), to: 'AUH' }, // Bocche di Cattaro
  // Grecia prima della cessione della Tessaglia (luglio 1881)
  { from: 'GRE', notModern: 'GRC', to: 'TUR' },
  { modern: 'GRC', when: ([lon, lat]) => lat > 39.05 && lon > 20.5, to: 'TUR' },
  { modern: 'GRC', when: ([lon, lat]) => lat < 35.8 && lon > 23.3, to: 'TUR' }, // Creta
  { modern: 'GRC', when: ([lon, lat]) => lon > 25.8 && lat > 36 && lat < 40, to: 'TUR' }, // Egeo orientale e Dodecaneso
  // Il dataset 1880 sbaglia Alsazia-Lorena (tedesca dal 1871) e Savoia/Nizza (francesi dal 1860)
  { iso: ['FR-57', 'FR-67', 'FR-68'], to: 'GER' },
  { modern: 'FRA', from: 'ITA', to: 'FRA' },
  // Bessarabia meridionale e Kars-Ardahan-Batumi alla Russia (Congresso di Berlino, 1878); Caucaso russo
  { modern: 'MDA', to: 'RUS' },
  { modern: 'UKR', from: 'ROM', to: 'RUS' },
  { iso: ['TR-36', 'TR-75', 'TR-08'], to: 'RUS' },
  { modern: 'GEO', to: 'RUS' }, { modern: 'ARM', to: 'RUS' }, { modern: 'AZE', to: 'RUS' },
  // Confini rimasti identici fino a oggi: il paese moderno decide (corregge l'imprecisione del dataset)
  { modern: 'AUT', to: 'AUH' }, { modern: 'HUN', to: 'AUH' }, { modern: 'CZE', to: 'AUH' }, { modern: 'SVK', to: 'AUH' }, { modern: 'SVN', to: 'AUH' },
  { modern: 'DEU', from: 'AUH', to: 'GER' }, { modern: 'DEU', from: 'SWI', to: 'GER' }, { modern: 'DEU', from: 'DEN', to: 'GER' },
  { modern: 'CHE', to: 'SWI' }, { modern: 'LIE', to: 'AUH' }, { modern: 'ESP', to: 'SPA' }, { modern: 'AND', to: 'SPA' }, { modern: 'PRT', to: 'POR' },
  { modern: 'BEL', to: 'BEL' }, { modern: 'NLD', to: 'NED' }, { modern: 'LUX', to: 'LUX' }, { modern: 'MCO', to: 'FRA' },
  { modern: 'ITA', from: 'SWI', to: 'ITA' }, { modern: 'ITA', from: 'FRA', to: 'ITA' }, { modern: 'FRA', from: 'SPA', to: 'FRA' }, { modern: 'FRA', from: 'SWI', to: 'FRA' },
  // Trentino e Alto Adige austriaci
  { iso: ['IT-TN', 'IT-BZ'], to: 'AUH' },
  { modern: 'EGY', to: 'EGY' }, { modern: 'LBY', to: 'TUR' }, { modern: 'BIH', to: 'AUH' },
  { modern: 'RUS', from: 'PER', to: 'RUS' },
  // Belgrado serba (il dataset la attribuisce all'Austria)
  { iso: ['RS-00'], to: 'SER' },
  // Isole Ionie greche dal 1864
  { iso: ['GR-F'], to: 'GRE' }, { iso: ['GR-D'], to: 'TUR' }, // Isole Ionie greche, Epiro ottomano (Arta ceduta solo a luglio 1881)
  { modern: 'ALB', to: 'TUR' }, { modern: 'MKD', to: 'TUR' }, { modern: 'KOS', to: 'TUR' },
];

// Poligoni di correzione (lon/lat) per confini che non seguono le province moderne
export const CORRECTION_POLYGONS = [
  // Schleswig settentrionale: prussiano dal 1864 fino al confine del fiume Kongeå
  { to: 'GER', ring: [[8.0, 54.78], [10.2, 54.78], [10.2, 55.46], [8.0, 55.46], [8.0, 54.78]] },
];

// Popolazione 1881 per nazione; le sotto-voci (paese moderno) hanno un totale proprio,
// il resto della nazione si divide la parte rimanente.
export const NATION_POP_1881 = {
  ITA: { total: 28_460_000 },
  FRA: { total: 40_970_000, DZA: 3_310_000 },
  GER: { total: 45_230_000 },
  AUH: { total: 39_400_000, BIH: 1_160_000 },
  GBR: { total: 35_100_000, IRL: 4_900_000, CYP: 186_000, CYN: 0, MLT: 150_000 },
  RUS: { total: 84_000_000, POL: 7_300_000, FIN: 2_060_000, GEO: 1_100_000, ARM: 600_000, AZE: 1_200_000 },
  TUR: { total: 24_000_000, TUR: 11_500_000, LBY: 1_000_000, IRQ: 1_400_000, SYR: 1_600_000, LBN: 400_000, ISR: 300_000, PSX: 200_000, JOR: 200_000, SAU: 600_000 },
  EGY: { total: 6_800_000 },
  SPA: { total: 16_600_000 },
  POR: { total: 4_550_000 },
  SWI: { total: 2_850_000 },
  BEL: { total: 5_520_000 },
  NED: { total: 4_010_000 },
  LUX: { total: 210_000 },
  DEN: { total: 2_000_000, ISL: 72_000 },
  SWE: { total: 6_490_000, NOR: 1_900_000 },
  GRE: { total: 1_680_000 },
  ROM: { total: 4_600_000 },
  SER: { total: 1_700_000 },
  MNE: { total: 200_000 },
  BUL: { total: 2_000_000 },
  MOR: { total: 5_000_000 },
  TUN: { total: 1_100_000 },
  PER: { total: 2_500_000 },
  ARA: { total: 1_500_000 },
  NUL: { total: 300_000 },
};

// Punti di catena montuosa (lon, lat): provincia "montagna" se il centro è entro 75 km
export const MOUNTAINS = [
  // Alpi
  [6.9, 45.9], [7.4, 46.3], [8.3, 46.6], [9.5, 46.5], [10.3, 46.6], [11.3, 46.7], [12.3, 46.6], [13.6, 46.4], [10.6, 47.2], [12.5, 47.2], [14.5, 47.3], [6.4, 44.9], [7.0, 44.3],
  // Pirenei
  [-1.4, 42.9], [0.2, 42.7], [1.6, 42.5],
  // Appennini
  [10.6, 44.3], [11.8, 43.7], [13.2, 42.7], [14.1, 41.9], [15.5, 40.6], [16.2, 39.3],
  // Carpazi
  [19.8, 49.3], [22.5, 49.1], [24.4, 48.1], [25.4, 47.2], [25.8, 45.6], [24.0, 45.4], [22.5, 45.3],
  // Dinaridi e Balcani
  [16.8, 44.2], [18.2, 43.5], [19.4, 42.9], [20.4, 42.4], [21.2, 41.7], [23.3, 42.0], [24.6, 42.7], [25.6, 42.8], [21.6, 39.8],
  // Caucaso
  [41.8, 43.2], [43.8, 42.8], [46.0, 41.9],
  // Atlante
  [-7.8, 31.2], [-5.0, 32.8], [-4.0, 34.0], [0.5, 34.3], [3.5, 36.4], [6.5, 35.4],
  // Alpi scandinave
  [8.5, 61.5], [12.5, 63.8], [16.0, 67.0],
  // Tauro e altopiano armeno
  [33.0, 37.2], [36.5, 38.0], [41.0, 39.8], [43.5, 38.5],
];

// Colline/altopiani: entro 110 km
export const HILLS = [
  [-3.8, 40.2], [-4.6, 41.6], [-2.5, 37.5], [-7.6, 40.5], // Meseta, Sierra
  [2.8, 45.5], [3.3, 44.3], // Massiccio centrale
  [-4.5, 57.0], [-3.5, 52.5], // Highlands, Galles
  [8.0, 48.2], [10.2, 50.4], [13.0, 50.6], [11.0, 49.0], // Foresta Nera, Turingia, Erzgebirge, Baviera
  [15.3, 49.6], [17.5, 49.5], // Boemia, Moravia
  [32.5, 39.2], [35.5, 39.0], [38.5, 39.3], // Anatolia
  [24.0, 38.6], [22.2, 37.5], // Grecia
  [9.1, 40.1], [14.6, 37.6], // Sardegna, Sicilia
  [36.3, 33.5], [35.6, 31.8], // Libano, Giudea
  [21.5, 43.8], [26.0, 41.9], // Serbia, Rodopi
];

// Località di controllo: [nome, lon, lat, proprietario atteso al 1° gennaio 1881]
export const CHECKS = [
  ['Nizza', 7.26, 43.70, 'FRA'], ['Chambéry', 5.92, 45.57, 'FRA'], ['Strasburgo', 7.75, 48.58, 'GER'], ['Metz', 6.18, 49.12, 'GER'],
  ['Mulhouse', 7.34, 47.75, 'GER'], ['Belfort', 6.86, 47.64, 'FRA'], ['Nancy', 6.18, 48.69, 'FRA'], ['Aabenraa', 9.42, 55.04, 'GER'],
  ['Poznań', 16.93, 52.40, 'GER'], ['Danzica', 18.65, 54.35, 'GER'], ['Breslavia', 17.04, 51.11, 'GER'], ['Cracovia', 19.94, 50.06, 'AUH'],
  ['Leopoli', 24.03, 49.84, 'AUH'], ['Varsavia', 21.01, 52.23, 'RUS'], ['Vilnius', 25.28, 54.69, 'RUS'], ['Helsinki', 24.94, 60.17, 'RUS'],
  ['Chișinău', 28.86, 47.01, 'RUS'], ['Izmail', 28.83, 45.35, 'RUS'], ['Costanza', 28.63, 44.17, 'ROM'], ['Kars', 43.10, 40.60, 'RUS'],
  ['Batumi', 41.64, 41.64, 'RUS'], ['Sarajevo', 18.41, 43.86, 'AUH'], ['Niš', 21.90, 43.32, 'SER'], ['Skopje', 21.43, 42.00, 'TUR'],
  ['Salonicco', 22.94, 40.64, 'TUR'], ['Larissa', 22.42, 39.64, 'TUR'], ['Atene', 23.73, 37.98, 'GRE'], ['Plovdiv', 24.75, 42.15, 'TUR'],
  ['Sofia', 23.32, 42.70, 'BUL'], ['Varna', 27.91, 43.21, 'BUL'], ['Venezia', 12.33, 45.44, 'ITA'], ['Trieste', 13.77, 45.65, 'AUH'],
  ['Fiume', 14.44, 45.33, 'AUH'], ['Trento', 11.12, 46.07, 'AUH'], ['Roma', 12.48, 41.90, 'ITA'], ['Tunisi', 10.17, 36.80, 'TUN'],
  ['Tripoli', 13.19, 32.89, 'TUR'], ['Alessandria', 29.92, 31.20, 'EGY'], ['Nicosia', 33.36, 35.17, 'GBR'], ['La Valletta', 14.51, 35.90, 'GBR'],
  ['Ajaccio', 8.90, 42.00, 'FRA'], ['Berna', 7.45, 46.95, 'SWI'], ['Lussemburgo', 6.13, 49.61, 'LUX'], ['Bruxelles', 4.35, 50.85, 'BEL'],
  ['Amsterdam', 4.90, 52.37, 'NED'], ['Oslo', 10.75, 59.91, 'SWE'], ['Dublino', -6.26, 53.35, 'GBR'], ['Algeri', 3.06, 36.75, 'FRA'],
  ['Orano', -0.63, 35.70, 'FRA'], ['Fès', -5.00, 34.03, 'MOR'], ['Beirut', 35.50, 33.89, 'TUR'], ['Gerusalemme', 35.21, 31.77, 'TUR'],
  ['Tbilisi', 44.79, 41.72, 'RUS'], ['Baku', 49.87, 40.41, 'RUS'], ['Costantinopoli', 28.98, 41.01, 'TUR'], ['Bucarest', 26.10, 44.43, 'ROM'],
  ['Belgrado', 20.47, 44.76, 'SER'], ['Cettigne', 18.92, 42.39, 'MNE'], ['Creta', 24.80, 35.30, 'TUR'], ['Corfù', 19.92, 39.62, 'GRE'],
  ['Palma', 2.65, 39.57, 'SPA'], ['Lisbona', -9.14, 38.72, 'POR'], ['Copenaghen', 12.45, 55.70, 'DEN'], ['Stoccolma', 18.07, 59.33, 'SWE'],
  ['Suceava', 26.25, 47.65, 'AUH'], ['Cluj', 23.59, 46.77, 'AUH'], ['Timișoara', 21.23, 45.75, 'AUH'], ['Brașov', 25.60, 45.65, 'AUH'],
  ['Černivci', 25.94, 48.29, 'AUH'], ['Iași', 27.59, 47.16, 'ROM'], ['Galați', 28.04, 45.44, 'ROM'], ['Craiova', 23.80, 44.32, 'ROM'],
  ['Dobrič', 27.83, 43.57, 'BUL'], ['Silistra', 27.26, 44.11, 'BUL'], ['Ruse', 25.96, 43.85, 'BUL'], ['Vidin', 22.88, 43.99, 'BUL'],
  ['Pirot', 22.59, 43.15, 'SER'], ['Vranje', 21.90, 42.55, 'SER'], ['Novi Sad', 19.84, 45.27, 'AUH'], ['Pljevlja', 19.36, 43.36, 'TUR'],
  ['Adrianopoli', 26.56, 41.68, 'TUR'], ['Burgas', 27.47, 42.50, 'TUR'], ['Nikšić', 18.94, 42.78, 'MNE'], ['Podgorica', 19.26, 42.44, 'MNE'],
  ['Porto Said', 32.30, 31.26, 'EGY'], ['Giannina', 20.85, 39.66, 'TUR'], ['Zante', 20.90, 37.78, 'GRE'], ['Foča', 18.78, 43.50, 'AUH'],
  ['Königsberg', 20.51, 54.71, 'GER'], ['Riga', 24.11, 56.95, 'RUS'], ['Odessa', 30.73, 46.48, 'RUS'], ['Budapest', 19.04, 47.50, 'AUH'],
  ['Praga', 14.42, 50.08, 'AUH'], ['Bolzano', 11.35, 46.50, 'AUH'], ['Gorizia', 13.62, 45.94, 'AUH'], ['Pola', 13.85, 44.87, 'AUH'],
  ['Zara', 15.40, 44.10, 'AUH'], ['Castelnuovo', 18.54, 42.46, 'AUH'], ['Scutari', 19.51, 42.07, 'TUR'], ['Smirne', 27.14, 38.42, 'TUR'],
  ['Damasco', 36.29, 33.51, 'TUR'], ['Il Cairo', 31.24, 30.04, 'EGY'], ['Gibilterra', -5.35, 36.14, 'SPA'], ['Edimburgo', -3.19, 55.95, 'GBR'],
];
