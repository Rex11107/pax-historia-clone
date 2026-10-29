// Africa e penisola arabica al 1° gennaio 1881: dati per scripts/map/africa.mjs.
// Fase 1: province storiche e regni (divisione larga, guidata dagli stati d'epoca e dalla densità).

// paesi moderni (adm0_a3 di Natural Earth) esclusi dall'estensione: fuori dal teatro africano-arabo
export const AF_EXCLUDE = ['IRN', 'TKM', 'FJI', 'KIR', 'NOR', 'ATF', 'IRQ', 'JOR', 'KWT', 'ISR', 'PSX', 'SYR', 'AFG', 'PAK', 'BRA'];
// area dell'estensione: tutto ciò che sta fuori dal rettangolo della mappa europea
export const AF_CLIP = [-30, -36, 62, 40];

// grandi laghi naturali (i bacini artificiali come il Nasser, il Volta o il Kariba nel 1881 non esistevano)
export const AF_LAKES = ['Lake Albert', 'Lake Malawi', 'Lake Tanganyika', 'Lake Victoria', 'Lake Tana', 'Lac Moeru', 'Lake Bangweulu', 'Lake Kivu', 'Lake Edward', 'Lake Turkana'];

// stato d'epoca (world_1880) -> tag; '' = terra di nessuno
export const AF_HIST = {
  'null': '',
  'Egypt': 'EGY', 'Harer (Egypt)': 'EGY',
  'Ottoman Empire': 'TUR', 'Qatar': 'TUR',
  'Arabia': 'ARA', 'Oman': 'OMA', 'Trucial Oman': 'TRU',
  'Morocco': 'MOR', 'Spain': 'SPA', 'Spanish Guinea': 'SPA',
  'Ethiopia': 'ETH', 'Sultanate of Zanzibar': 'ZAN', 'Madagascar': 'MAD', 'Imerina': 'MAD', 'Liberia': 'LIB',
  'Transvaal': 'TRA', 'Orange Free State': 'OFS', 'Zululand': 'ZUL', 'Swaziland': 'SWZ', 'Ndebele': 'NDE', 'Ngwato': 'NGW', 'Lozi': 'LOZ', 'Barotse': 'LOZ',
  'Cape Colony': 'GBR', 'Natal': 'GBR', 'Griqualand West': 'GBR', 'Basutoland': 'GBR', 'Gold Coast (GB)': 'GBR', 'Sierra Leone': 'GBR', 'Gambia': 'GBR', 'Lagos': 'GBR',
  'Senegal (FR)': 'FRA', 'Gabon': 'FRA', 'Ivory Coast': 'FRA', 'Cotonou': 'FRA',
  'Portuguese Guinea': 'POR', 'Angola (Portugal)': 'POR', 'Mozambique': 'POR',
  'Sokoto Caliphate': 'SOK', 'Kanem-Bornu': 'BOR', 'Wadai Empire': 'WAD', 'Tukular Caliphate': 'TUK', 'Wassoulou Empire': 'WAS', 'Kong Empire': 'KNG', 'Mossi States': 'MOS',
  'Asante': 'ASA', 'Dahomey': 'DAH', 'Futa Jalon': 'FJA', 'Futa Toro': 'FTO', 'Ibadan': 'YOR', 'Oyo': 'YOR', 'Benin': 'BNN', 'Borgu States': 'BRG', 'Dendi Kingdom': 'DND',
  'Sultanate of Damagaram': 'DMG', 'Rabih az-Zubayr': 'RAB', 'Ato trading confederacy': 'ARO', 'Calabar': '', 'Opobo': '',
  'Buganda': 'BUG', 'Bunyoro': 'BUN', 'Rwanda': 'RWA', 'Burundi': 'BDI',
  'Kuba': 'KUB', 'Luba': 'LUB', 'Lunda': 'LUN', 'Yaka': 'YAK', 'Teke': 'TEK', 'Yeke': 'YEK', 'Sultanate of Utetera': 'UTE', 'Congo': 'KGO',
  'Mbailundu': 'OVI', 'Ovimbundu': 'OVI', 'Mirambo Unyanyembe Ukimbu': 'MIR', 'Nguni': 'NGO', 'Shona': '',
  // fuori teatro (filtrati dai paesi esclusi, ma il nome va riconosciuto)
  'Persia': 'PER', 'Russian Empire': 'RUS', 'Afghanistan': '', 'British Raj': '', 'Bokhara Khanate': '',
};

// correzioni al dataset 1880: { modern, iso?, from?, to, box? [minLon,minLat,maxLon,maxLat] }
export const AF_OVERRIDES = [
  // Yemen: altopiano e Tihama ottomani dal 1872; Aden britannica dal 1839; il resto sultanati indipendenti
  { modern: 'YEM', iso: ['YE-SN', 'YE-SA', 'YE-HU', 'YE-TA', 'YE-IB', 'YE-DH', 'YE-HJ', 'YE-SD', 'YE-AM', 'YE-MW', 'YE-RA'], to: 'TUR' },
  { modern: 'YEM', iso: ['YE-AD'], to: 'GBR' },
  { modern: 'YEM', iso: ['YE-LA', 'YE-AB', 'YE-SH', 'YE-HD', 'YE-MR', 'YE-BA', 'YE-DA', 'YE-MA', 'YE-JA'], to: '' },
  // Oman: Mascate e Oman (con il Dhofar, dal 1829); la costa dei pirati agli sceicchi della Tregua
  { modern: 'OMN', from: 'ARA', to: 'OMA' }, { modern: 'OMN', from: '', to: 'OMA' },
  { modern: 'OMN', iso: ['OM-MU'], to: 'OMA' },
  { modern: 'ARE', to: 'TRU' },
  { modern: 'SAU', from: 'TRU', to: 'ARA' },
  { modern: 'BHR', to: 'BHR' },
  { modern: 'QAT', to: 'TUR' },
  // Egitto: il Sudan fino al Darfur (annesso nel 1874), Massaua e il Bogos, Zeila e Berbera, Harar
  { modern: 'SDN', iso: ['SD-DN', 'SD-DW', 'SD-DC', 'SD-DS', 'SD-DE', 'SD-KN', 'SD-KS', 'SD-KW', 'SD-NR', 'SD-RS', 'SD-KA', 'SD-GD', 'SD-SI', 'SD-NB', 'SD-NW', 'SD-GZ', 'SD-KH', 'SD-NO'], from: '', to: 'EGY' },
  { modern: 'ERI', iso: ['ER-SK', 'ER-GB', 'ER-DK', 'ER-AN'], to: 'EGY' },
  { modern: 'ERI', iso: ['ER-MA', 'ER-DU'], to: 'ETH' }, // Hamasien e Seraye: Etiopia di Giovanni IV
  { modern: 'ETH', from: 'EGY', to: 'EGY' },
  { modern: 'SOL', box: [42.5, 9.8, 46.0, 11.6], from: '', to: 'EGY' }, // costa di Zeila e Berbera (1875-1884)
  // Transvaal: entro i confini sudafricani (il dataset lo allarga sul Limpopo)
  { modern: 'BWA', from: 'TRA', to: '' }, { modern: 'ZWE', from: 'TRA', to: '' }, { modern: 'MOZ', from: 'TRA', to: 'POR' },
  // Città del Capo e la penisola del Capo mancano nel poligono della colonia
  { modern: 'ZAF', iso: ['ZA-WC'], to: 'GBR' },
  // Zanzibar e Pemba: cuore del sultanato
  { modern: 'TZA', iso: ['TZ-06', 'TZ-07', 'TZ-10', 'TZ-11', 'TZ-15'], to: 'ZAN' },
  // isole: Canarie, Madera, Azzorre, Capo Verde, São Tomé, Fernando Po, Mascarene, Seychelles, Sant'Elena, Mayotte
  { modern: 'ESP', to: 'SPA' }, { modern: 'PRT', to: 'POR' }, { modern: 'CPV', to: 'POR' }, { modern: 'STP', to: 'POR' },
  { modern: 'GNQ', iso: ['GQ-BN', 'GQ-BS', 'GQ-AN'], to: 'SPA' }, { modern: 'GNQ', iso: ['GQ-LI', 'GQ-KN', 'GQ-CS', 'GQ-WN'], to: '' },
  { modern: 'MUS', to: 'GBR' }, { modern: 'SYC', to: 'GBR' }, { modern: 'SHN', to: 'GBR' },
  { modern: 'FRA', iso: ['FR-RE', 'FR-YT'], to: 'FRA' },
  // Dakar e Gorée: francesi (il poligono del Senegal si ferma prima del Capo Verde)
  { modern: 'SEN', box: [-17.6, 14.5, -17.0, 14.9], to: 'FRA' },
  // Uadai: il dataset lo sposta a nord, nel deserto; Abeché e Uara ne erano il cuore. Il Baghirmi (Massenya) gli pagava tributo
  { modern: 'TCD', box: [18.3, 11.3, 23.6, 15.6], from: '', to: 'WAD' }, { modern: 'TCD', box: [15.4, 9.8, 18.3, 12.6], from: '', to: 'WAD' },
  // l'Aïr (sultanato di Agadez) non era di Sokoto
  { modern: 'NER', box: [4.5, 16.2, 11.0, 21.0], from: 'SOK', to: '' },
  // lo Scioa di Menelik, re vassallo di Giovanni IV dal 1878
  { modern: 'ETH', box: [37.8, 8.4, 40.6, 10.8], from: '', to: 'ETH' },
  // Bahr el-Ghazal: provincia egiziana (Gessi pascià, poi Lupton bey)
  { modern: 'SDS', iso: ['SS-BW', 'SS-BN', 'SS-WR', 'SS-LK', 'SS-UY'], from: '', to: 'EGY' },
  // porti del Benadir (Mogadiscio, Merca, Brava): del sultano di Zanzibar
  { modern: 'SOM', box: [43.6, 0.6, 46.6, 3.2], from: '', to: 'ZAN' },
  // Luanda e il Bengo: portoghesi dal 1576 (il poligono dell'Angola lascia fuori la città)
  { modern: 'AGO', box: [12.8, -9.7, 14.3, -7.5], from: '', to: 'POR' },
  // Walvis Bay: annessa dalla Gran Bretagna nel 1878
  { modern: 'NAM', box: [14.3, -23.2, 14.9, -22.7], to: 'GBR' },
  // Sahara occidentale: nel 1881 nessuno (Río de Oro sarà spagnolo dal 1884)
  { modern: 'MAR', iso: ['MA-15', 'MA-16'], from: 'MOR', to: '' },
];

// popolazione 1880 (stime da Frankema e Jerven 2014, Manning 2010, censimenti coloniali) per paese moderno:
// è il bacino delle province africane che non hanno una voce propria in NATION_POP_1881
export const AF_POP = {
  DZA: 60_000, LBY: 20_000, EGY: 0, MAR: 30_000, SAH: 20_000, MRT: 250_000,
  MLI: 1_800_000, NER: 1_500_000, TCD: 1_500_000, SDN: 600_000, SDS: 600_000,
  ERI: 250_000, ETH: 6_000_000, DJI: 40_000, SOL: 150_000, SOM: 900_000,
  KEN: 2_400_000, UGA: 2_600_000, TZA: 4_000_000, RWA: 1_000_000, BDI: 1_000_000,
  COD: 9_000_000, COG: 600_000, GAB: 300_000, GNQ: 80_000, CMR: 2_400_000, CAF: 800_000,
  NGA: 18_000_000, BEN: 900_000, TGO: 600_000, GHA: 2_000_000, CIV: 1_700_000, BFA: 2_000_000,
  LBR: 600_000, SLE: 900_000, GIN: 1_400_000, GNB: 250_000, SEN: 1_000_000, GMB: 150_000, CPV: 100_000, STP: 20_000,
  AGO: 2_400_000, ZMB: 900_000, MWI: 900_000, MOZ: 2_500_000, ZWE: 600_000, BWA: 120_000, NAM: 200_000,
  ZAF: 2_600_000, LSO: 150_000, SWZ: 80_000, MDG: 2_500_000, MUS: 360_000, COM: 60_000, SYC: 15_000, SHN: 6_000,
  SAU: 30_000, YEM: 900_000, OMN: 600_000, ARE: 70_000, BHR: 60_000, QAT: 0,
  ESP: 280_000, PRT: 395_000, FRA: 180_000,
};
// nazioni già presenti con bacino proprio: le loro nuove province attingono al bacino della nazione
export const AF_HOME = { EGY: 'EGY', ARA: 'SAU', MOR: 'MAR' };

// oasi e valli abitate nel deserto: cerchi transitabili (r in km)
export const AF_OASES = [
  { name: 'Kharga', at: [30.55, 25.44], r: 35, owner: 'EGY', pop: 7000 },
  { name: 'Dakhla', at: [29.0, 25.5], r: 35, owner: 'EGY', pop: 17000 },
  { name: 'Cufra', at: [23.3, 24.2], r: 40, owner: '', pop: 4000 }, // senussiti dal 1895
  { name: 'Murzuk', at: [13.92, 25.92], r: 45, owner: 'TUR', pop: 8000 },
  { name: 'Ghat', at: [10.17, 24.96], r: 30, owner: 'TUR', pop: 4000 }, // presidio ottomano dal 1875
  { name: 'Gianet', at: [9.48, 24.55], r: 30, owner: '', pop: 2000 },
  { name: 'Hoggar', at: [5.52, 22.8], r: 60, owner: '', pop: 6000 }, // Tuareg Kel Ahaggar
  { name: 'Aïr', at: [8.0, 17.5], r: 90, owner: '', pop: 30000 }, // sultanato di Agadez
  { name: 'Bilma', at: [12.92, 18.69], r: 35, owner: '', pop: 3000 },
  { name: 'Tibesti', at: [17.0, 21.0], r: 70, owner: '', pop: 8000 },
  { name: 'Borcu', at: [19.1, 17.9], r: 50, owner: '', pop: 6000 }, // Faya
  { name: 'Ennedi', at: [21.85, 17.0], r: 50, owner: '', pop: 5000 },
  { name: 'Adrar', at: [-13.05, 20.5], r: 60, owner: '', pop: 15000 }, // emirato di Adrar, Atar e Chinguetti
  { name: 'Tagant', at: [-11.4, 18.55], r: 50, owner: '', pop: 15000 }, // Tidjikja
  { name: 'Walata', at: [-7.03, 17.3], r: 35, owner: '', pop: 3000 },
  { name: 'Taudeni', at: [-3.97, 22.68], r: 25, owner: '', pop: 500 }, // miniere di sale
  { name: 'Selima', at: [29.32, 21.37], r: 20, owner: '', pop: 200 },
  { name: 'Suakin', at: [37.33, 19.1], r: 30, owner: 'EGY', pop: 10000 }, // porto egiziano del Mar Rosso
  { name: 'Tokar', at: [37.73, 18.43], r: 25, owner: 'EGY', pop: 6000 },
  // Arabia
  { name: 'Giabrin', at: [49.6, 23.3], r: 25, owner: '', pop: 500 },
  { name: 'Liwa', at: [53.75, 23.1], r: 35, owner: 'TRU', pop: 3000 },
  { name: 'Buraimi', at: [55.75, 24.25], r: 25, owner: 'OMA', pop: 8000 },
  { name: 'Najran', at: [44.15, 17.5], r: 40, owner: '', pop: 15000 },
];
// piste carovaniere transahariane e arabe (vedi CARAVAN_ROUTES)
export const AF_ROUTES = [
  ['Fezzan', 'Murzuk', [[14.35, 27.3], [14.1, 26.6], [13.92, 25.92]]],
  ['Murzuk', 'Ghat', [[13.92, 25.92], [11.5, 25.3], [10.17, 24.96]]],
  ['Gadames', 'Ghat', [[9.5, 30.13], [10.0, 27.5], [10.17, 24.96]]],
  ['Murzuk', 'Bilma', [[13.92, 25.92], [14.1, 22.6], [12.92, 18.69]]],
  ['Bilma', 'Cuca', [[12.92, 18.69], [13.6, 16.8], [13.3, 15.2]]],
  ['Ghat', 'Aïr', [[10.17, 24.96], [8.4, 19.07], [8.0, 17.5]]],
  ['Bilma', 'Aïr', [[12.92, 18.69], [10.5, 18.0], [8.0, 17.5]]],
  ['Hoggar', 'Aïr', [[5.52, 22.8], [6.0, 20.0], [8.0, 17.5]]],
  ['Tidikelt', 'Hoggar', [[2.3, 27.25], [3.75, 25.3], [5.52, 22.8]]],
  ['Hoggar', 'Gianet', [[5.52, 22.8], [7.5, 23.8], [9.48, 24.55]]],
  ['Touat', 'Taudeni', [[-0.29, 27.87], [-1.8, 25.0], [-3.97, 22.68]]],
  ['Taudeni', 'Timbuctù', [[-3.97, 22.68], [-3.4, 18.9], [-3.0, 16.9]]],
  ['Walata', 'Timbuctù', [[-7.03, 17.3], [-5.0, 16.8], [-3.0, 16.9]]],
  ['Tagant', 'Adrar', [[-11.4, 18.55], [-12.3, 19.6], [-13.05, 20.5]]],
  ['Adrar', 'Trarza', [[-13.05, 20.5], [-14.5, 19.0], [-15.5, 18.0]]],
  ['Adrar', 'Tindouf', [[-13.05, 20.5], [-11.0, 24.5], [-8.15, 27.67]]],
  ['Tagant', 'Walata', [[-11.4, 18.55], [-9.0, 17.8], [-7.03, 17.3]]],
  ['Augila', 'Cufra', [[21.4, 29.05], [22.2, 27.0], [23.3, 24.2]]],
  ['Cufra', 'Ennedi', [[23.3, 24.2], [22.5, 20.0], [21.85, 17.0]]],
  ['Ennedi', 'Uara', [[21.85, 17.0], [21.2, 15.8], [20.8, 14.9]]],
  ['Borcu', 'Tibesti', [[19.1, 17.9], [18.0, 19.5], [17.0, 21.0]]],
  ['Borcu', 'Kanem', [[19.1, 17.9], [18.0, 16.6], [17.0, 15.5]]],
  ['Tibesti', 'Murzuk', [[17.0, 21.0], [15.0, 23.5], [13.92, 25.92]]],
  ['Asiut', 'Kharga', [[31.18, 27.18], [30.8, 26.3], [30.55, 25.44]]],
  ['Kharga', 'Dakhla', [[30.55, 25.44], [29.7, 25.5], [29.0, 25.5]]],
  ['Dakhla', 'Farafra', [[29.0, 25.5], [28.4, 26.3], [27.97, 27.15]]],
  ['Kharga', 'Esna', [[30.55, 25.44], [31.6, 25.3], [32.55, 25.29]]],
  ['Kharga', 'Selima', [[30.55, 25.44], [30.0, 23.5], [29.32, 21.37]]],
  ['Selima', 'Darfur', [[29.32, 21.37], [27.5, 17.5], [25.6, 15.2]]], // Darb el-Arbain, la via dei quaranta giorni
  ['Suakin', 'Berber', [[37.33, 19.1], [35.6, 18.6], [33.98, 18.02]]],
  ['Rub al-Khali', 'Najran', [[49.6, 23.3], [46.5, 19.5], [44.15, 17.5]]],
];

// valli fluviali transitabili nel deserto (buffer in km attorno al fiume di Natural Earth)
export const AF_VALLEYS = [{ names: ['Nile', 'Nilo', 'White Nile', 'Blue Nile'], km: 22, maxLat: 27.2, minLat: 15.0 }, { names: ['Niger'], km: 30, minLat: 14.5, maxLat: 18.0 }, { names: ['Sénégal', 'Senegal'], km: 25, minLat: 14.0, maxLat: 17.0 }];
// deserti di Natural Earth che diventano intransitabili (con la sola condizione della bassa densità)
export const AF_ARID = {
  // Sahara: intransitabile solo a nord del Sahel
  sahara: ['SAHARA', 'LIBYAN DESERT', 'NUBIAN DESERT', 'Ténéré', 'Tassili oua-n-Ahaggar', 'Tassili-n-Ajjer', 'El Djouf', '‘Erg Chech', 'Idhän Murzuq', 'Sarïr Kalanshiyu ar Ramli al Kabi', 'Akchâr', 'Hamada du Drâa', '‘Erg Iguidi', 'WESTERN DESERT'],
  // deserti dove contano i dati sulle località (Arabia, Egitto)
  sparse: ['RUB’ AL KHALI', 'Eastern Desert'],
};

// località storiche (1881) per il nome delle province: [nome, lon, lat, peso]
export const AF_TOWNS = [
  // Egitto e Sudan egiziano
  ['Asiut', 31.18, 27.18, 40], ['Girga', 31.89, 26.34, 30], ['Sohag', 31.7, 26.56, 20], ['Qena', 32.72, 26.16, 30], ['Luxor', 32.64, 25.69, 25], ['Esna', 32.55, 25.29, 20], ['Assuan', 32.9, 24.09, 30], ['Uadi Halfa', 31.33, 21.8, 20], ['Dongola', 30.48, 19.17, 30], ['Berber', 33.98, 18.02, 30], ['Khartum', 32.53, 15.6, 60], ['Sennar', 33.63, 13.55, 35], ['El Obeid', 30.22, 13.18, 45], ['El Fasher', 25.35, 13.63, 40], ['Cassala', 36.4, 15.45, 35], ['Suakin', 37.33, 19.1, 35], ['Massaua', 39.45, 15.61, 40], ['Cheren', 38.47, 15.78, 20], ['Fascioda', 32.1, 9.88, 25], ['Lado', 31.7, 5.03, 25], ['Dem Zubeir', 26.07, 7.73, 20], ['Gondokoro', 31.67, 4.9, 15], ['Fazogli', 34.35, 11.3, 15], ['Gallabat', 36.37, 12.97, 20], ['Ed Damer', 33.97, 17.6, 15], ['Shendi', 33.43, 16.68, 20], ['Darà', 24.3, 11.5, 15], ['Taiscia', 22.0, 11.8, 10], ['Nyala', 24.88, 12.05, 15], ['Kordofan', 30.2, 12.0, 5], ['Zeila', 43.47, 11.35, 35], ['Berbera', 45.03, 10.44, 35], ['Harar', 42.12, 9.31, 50],
  // Etiopia e Corno
  ['Debre Tabor', 38.03, 11.85, 45], ['Gondar', 37.47, 12.6, 40], ['Adua', 38.9, 14.17, 35], ['Macallè', 39.47, 13.5, 35], ['Axum', 38.72, 14.13, 20], ['Ancober', 39.73, 9.59, 40], ['Magdala', 39.37, 11.37, 20], ['Gogiam', 37.7, 10.33, 30], ['Uollo', 39.6, 11.1, 20], ['Gimma', 36.83, 7.67, 30], ['Caffa', 36.25, 7.25, 25], ['Aussa', 41.4, 11.6, 25], ['Gildessa', 42.05, 9.85, 10], ['Ogaden', 44.5, 7.2, 10], ['Mogadiscio', 45.34, 2.04, 45], ['Brava', 44.03, 1.11, 25], ['Merca', 44.75, 1.72, 20], ['Chisimaio', 42.54, -0.36, 25], ['Obbia', 48.53, 5.32, 20], ['Alula', 50.75, 11.97, 15], ['Lugh', 42.55, 3.8, 15], ['Bardera', 42.3, 2.35, 15], ['Gibuti', 43.15, 11.6, 1], ['Obock', 43.29, 11.96, 15], ['Assab', 42.73, 13.01, 30],
  ['Asmara', 38.93, 15.33, 12], ['Adi Ugri', 38.82, 14.88, 12], ['Adigrat', 39.46, 14.28, 15], ['Antalo', 39.38, 13.3, 12], ['Socota', 39.03, 12.63, 15], ['Debre Marcos', 37.73, 10.33, 20],
  ['Basso', 37.75, 10.1, 5], ['Debre Berhan', 39.53, 9.68, 15], ['Liccè', 39.65, 9.9, 15], ['Entotto', 38.77, 9.08, 10], ['Bonga', 36.24, 7.27, 20], ['Ghera', 36.2, 7.7, 8], ['Lekemti', 36.55, 9.08, 15],
  ['Uad Medani', 33.52, 14.4, 20], ['Metemma', 36.2, 12.95, 15], ['El Damer', 33.97, 17.59, 10], ['Duem', 32.3, 13.99, 10], ['Bara', 30.37, 13.7, 10], ['Talodi', 30.38, 10.63, 10], ['Kaka', 32.18, 10.62, 8],
  ['Uau', 28.0, 7.7, 10], ['Rumbek', 29.7, 6.8, 10], ['Dufile', 31.95, 3.58, 10], ['Bor', 31.56, 6.21, 8], ['Kobbei', 25.1, 14.2, 15], ['Kebkabiya', 24.08, 13.64, 15], ['Shakka', 26.5, 10.2, 10], ['Tagiura', 42.88, 11.78, 15],
  // Africa orientale
  ['Zanzibar', 39.19, -6.16, 60], ['Pemba', 39.75, -5.15, 20], ['Mombasa', 39.67, -4.05, 40], ['Malindi', 40.11, -3.22, 25], ['Lamu', 40.9, -2.27, 30], ['Bagamoyo', 38.9, -6.44, 30], ['Dar es Salaam', 39.28, -6.82, 25], ['Chilua', 39.52, -8.95, 25], ['Lindi', 39.71, -10.0, 20], ['Tabora', 32.8, -5.02, 40], ['Ugigi', 29.67, -4.88, 35], ['Urambo', 32.07, -5.07, 30], ['Mengo', 32.57, 0.31, 45], ['Masindi', 31.72, 1.68, 30], ['Kabarega', 31.35, 1.45, 5], ['Nyanza', 29.75, -2.35, 30], ['Kitega', 29.93, -3.43, 30], ['Ujiji', 29.67, -4.88, 1], ['Tanga', 39.1, -5.07, 20], ['Pangani', 38.98, -5.43, 20], ['Mamboya', 37.27, -6.27, 10], ['Kilimangiaro', 37.35, -3.3, 15], ['Ruvuma', 37.5, -11.0, 5], ['Songea', 35.65, -10.68, 15], ['Kilwa', 39.5, -8.93, 1], ['Masai', 36.5, -2.0, 10], ['Kavirondo', 34.6, 0.2, 10], ['Ukambani', 37.8, -1.5, 10], ['Teita', 38.4, -3.4, 5], ['Unyoro', 31.5, 1.8, 1], ['Toro', 30.27, 0.65, 15], ['Ankole', 30.65, -0.6, 15], ['Busoga', 33.4, 0.7, 15], ['Karagwe', 31.1, -1.75, 15], ['Usukuma', 33.5, -3.0, 10], ['Ugogo', 35.75, -6.2, 10], ['Uhehe', 35.7, -7.8, 15], ['Ufipa', 31.6, -8.0, 10],
  // Congo e Africa centrale
  ['Nyangwe', 26.2, -4.22, 35], ['Kasongo', 26.65, -4.43, 30], ['Bunkeya', 26.97, -10.4, 30], ['Musumba', 22.5, -8.5, 35], ['Mushenge', 21.8, -4.9, 25], ['Kazembe', 28.9, -9.8, 25], ['Mbanza Congo', 14.25, -6.27, 35], ['Boma', 13.05, -5.85, 25], ['Banana', 12.33, -6.0, 15], ['Vivi', 13.47, -5.68, 15], ['Mbé', 15.85, -2.75, 25], ['Brazzaville', 15.28, -4.27, 10], ['Stanley Pool', 15.3, -4.3, 5], ['Kabinda', 24.48, -6.13, 15], ['Kasai', 21.0, -6.0, 5], ['Ubangi', 19.0, 3.5, 5], ['Uele', 26.0, 3.5, 10], ['Equatore', 18.3, 0.05, 10], ['Lualaba', 25.5, -1.5, 5], ['Manyema', 26.0, -3.0, 10], ['Rua', 27.5, -7.0, 10], ['Ituri', 29.5, 1.8, 8], ['Kwango', 17.5, -6.5, 8], ['Sankuru', 23.5, -4.0, 8], ['Lunda', 21.0, -9.0, 5],
  ['Cuca', 14.08, 13.12, 40], ['Zinder', 8.99, 13.8, 40], ['Abeché', 20.83, 13.83, 35], ['Uara', 20.82, 14.53, 20], ['Massenya', 16.17, 11.4, 30], ['Bagirmi', 16.5, 11.0, 5], ['Kanem', 15.5, 14.5, 15], ['Dar Kuti', 22.5, 8.5, 15], ['Dar Fertit', 24.5, 8.5, 10], ['Ndele', 20.65, 8.41, 10], ['Ubangi-Shari', 20.5, 6.5, 5], ['Adamaua', 13.5, 7.3, 20], ['Yola', 12.48, 9.2, 30], ['Ngaundere', 13.58, 7.32, 20], ['Duala', 9.7, 4.05, 30], ['Bimbia', 9.2, 4.0, 10], ['Batanga', 9.87, 2.85, 10], ['Fumban', 10.9, 5.72, 20], ['Ogowè', 10.5, -0.7, 10], ['Libreville', 9.45, 0.39, 30], ['Loango', 11.85, -4.65, 25], ['Santa Isabel', 8.78, 3.75, 25], ['Rio Muni', 10.3, 1.6, 10],
  // Africa occidentale
  ['Sokoto', 5.24, 13.06, 50], ['Kano', 8.52, 12.0, 50], ['Katsina', 7.6, 12.99, 35], ['Zaria', 7.72, 11.11, 35], ['Bauchi', 9.84, 10.31, 30], ['Gombe', 11.17, 10.29, 20], ['Ilorin', 4.55, 8.5, 30], ['Bida', 6.01, 9.08, 30], ['Nupe', 6.0, 9.0, 1], ['Gando', 4.5, 12.6, 25], ['Kontagora', 5.47, 10.4, 15], ['Keffi', 7.87, 8.85, 15], ['Muri', 10.8, 9.2, 15], ['Lokoja', 6.74, 7.8, 15], ['Ibadan', 3.9, 7.38, 45], ['Abeokuta', 3.35, 7.15, 35], ['Oyo', 3.93, 7.85, 30], ['Ilesha', 4.75, 7.62, 20], ['Ife', 4.55, 7.48, 15], ['Ijebu Ode', 3.92, 6.82, 15], ['Lagos', 3.39, 6.45, 40], ['Benin', 5.62, 6.34, 40], ['Bonny', 7.17, 4.43, 25], ['Calabar', 8.32, 4.95, 30], ['Opobo', 7.55, 4.52, 20], ['Arochukwu', 7.9, 5.38, 25], ['Onitsha', 6.78, 6.15, 25], ['Brass', 6.24, 4.32, 15], ['Igala', 6.9, 7.3, 10], ['Tiv', 9.0, 7.4, 10], ['Bussa', 4.52, 9.88, 25], ['Nikki', 3.21, 9.94, 25], ['Kandi', 2.94, 11.13, 10],
  ['Abomey', 1.99, 7.18, 45], ['Uidah', 2.08, 6.36, 30], ['Porto Novo', 2.62, 6.5, 30], ['Cotonou', 2.43, 6.37, 15], ['Atakpamé', 1.13, 7.53, 15], ['Lomé', 1.22, 6.13, 5], ['Kumasi', -1.62, 6.69, 50], ['Cape Coast', -1.24, 5.11, 35], ['Accra', -0.2, 5.56, 35], ['Elmina', -1.35, 5.08, 15], ['Salaga', -0.52, 8.55, 20], ['Yendi', -0.01, 9.44, 25], ['Kintampo', -1.73, 8.05, 15], ['Bontuku', -2.8, 8.04, 25], ['Kong', -4.6, 9.15, 45], ['Bobo-Dioulasso', -4.3, 11.18, 30], ['Uagadugu', -1.53, 12.37, 45], ['Uahiguya', -2.42, 13.58, 30], ['Tenkodogo', -0.37, 11.78, 20], ['Fada Ngurma', 0.35, 12.06, 20], ['Gruma', 0.8, 12.0, 1], ['Dori', -0.03, 14.03, 15], ['Ségou', -6.27, 13.45, 45], ['Nioro', -9.6, 15.23, 30], ['Bandiagara', -3.61, 14.35, 30], ['Bissandugu', -9.0, 10.0, 35], ['Kankan', -9.31, 10.38, 30], ['Sikasso', -5.67, 11.32, 30], ['Timbuctù', -3.0, 16.77, 40], ['Gao', -0.05, 16.27, 25], ['Djenné', -4.55, 13.9, 30], ['Mopti', -4.2, 14.5, 15], ['Kayes', -11.45, 14.45, 10], ['Médine', -11.37, 14.37, 20], ['Bamako', -8.0, 12.65, 20], ['Kita', -9.49, 13.03, 15], ['Say', 2.36, 13.1, 25], ['Niamey', 2.11, 13.51, 1], ['Dosso', 3.19, 13.05, 20], ['Tessaua', 7.98, 13.75, 15], ['Maradi', 7.1, 13.5, 20], ['Agadez', 7.99, 16.97, 30], ['Ansongo', 0.5, 15.67, 15], ['Menaka', 2.4, 15.92, 10], ['Hombori', -1.68, 15.28, 15], ['Kidal', 1.41, 18.44, 10], ['Arauan', -3.4, 18.9, 5],
  ['Saint-Louis', -16.5, 16.03, 45], ['Dakar', -17.44, 14.69, 35], ['Gorée', -17.4, 14.67, 20], ['Rufisque', -17.27, 14.72, 15], ['Bakel', -12.47, 14.9, 15], ['Podor', -14.96, 16.65, 20], ['Matam', -13.26, 15.66, 15], ['Kaolack', -16.07, 14.15, 15], ['Ziguinchor', -16.27, 12.58, 15], ['Bathurst', -16.58, 13.45, 30], ['Bolama', -15.48, 11.58, 25], ['Cacheu', -16.17, 12.27, 15], ['Bissau', -15.6, 11.86, 20], ['Timbo', -11.83, 10.63, 40], ['Labé', -12.28, 11.32, 25], ['Boké', -14.29, 10.94, 15], ['Freetown', -13.23, 8.48, 40], ['Port Loko', -12.79, 8.77, 15], ['Bonthe', -12.5, 7.53, 15], ['Monrovia', -10.8, 6.3, 40], ['Harper', -7.72, 4.37, 20], ['Buchanan', -10.05, 5.88, 15], ['Grand-Bassam', -3.74, 5.2, 25], ['Assinie', -3.28, 5.13, 15], ['Grand Lahou', -5.02, 5.13, 15], ['Baulé', -5.0, 7.5, 10], ['Man', -7.55, 7.41, 10], ['Odienné', -7.57, 9.51, 15], ['Korhogo', -5.63, 9.46, 15], ['Kissi', -10.1, 9.2, 5],
  // Africa australe
  ['Città del Capo', 18.42, -33.92, 60], ['Port Elizabeth', 25.6, -33.96, 35], ['Grahamstown', 26.53, -33.3, 30], ['East London', 27.91, -33.02, 25], ['Graaff-Reinet', 24.53, -32.25, 25], ['Kimberley', 24.77, -28.74, 40], ['Beaufort West', 22.58, -32.35, 20], ['Colesberg', 25.0, -30.72, 15], ['Calvinia', 19.77, -31.47, 15], ['Springbok', 17.88, -29.66, 10], ['Upington', 21.25, -28.45, 5], ['Vryburg', 24.73, -26.95, 5], ['Kuruman', 23.43, -27.45, 20], ['Mafeking', 25.64, -25.86, 10], ['Umtata', 28.78, -31.59, 20], ['Pondoland', 29.5, -31.2, 15], ['Pietermaritzburg', 30.38, -29.6, 40], ['Durban', 31.03, -29.86, 35], ['Ulundi', 31.42, -28.32, 35], ['Pretoria', 28.19, -25.75, 45], ['Potchefstroom', 27.1, -26.71, 35], ['Lydenburg', 30.45, -25.1, 20], ['Pietersburg', 29.45, -23.9, 5], ['Zoutpansberg', 30.0, -23.0, 15], ['Rustenburg', 27.24, -25.67, 20], ['Utrecht', 30.32, -27.66, 15], ['Bloemfontein', 26.21, -29.12, 40], ['Harrismith', 29.13, -28.27, 15], ['Kroonstad', 27.23, -27.65, 15], ['Maseru', 27.48, -29.31, 30], ['Mbabane', 31.13, -26.32, 25], ['Shoshong', 26.5, -23.03, 35], ['Molepolole', 25.5, -24.4, 15], ['Bulawayo', 28.58, -20.15, 40], ['Inyati', 28.85, -19.68, 10], ['Lealui', 23.05, -15.2, 35], ['Sesheke', 24.3, -17.48, 15], ['Lukulu', 23.24, -14.38, 10], ['Ngami', 22.7, -20.4, 10], ['Ghanzi', 21.7, -21.7, 5], ['Okavango', 20.0, -18.5, 5], ['Windhoek', 17.08, -22.57, 20], ['Walvis Bay', 14.5, -22.95, 20], ['Otjimbingwe', 16.13, -22.35, 15], ['Bethanie', 17.17, -26.5, 10], ['Rehoboth', 17.08, -23.32, 10], ['Ovamboland', 16.0, -17.8, 15], ['Damaraland', 15.5, -20.5, 5], ['Namaqualand', 17.5, -27.5, 5], ['Kaokoveld', 13.5, -18.5, 3],
  ['Lourenço Marques', 32.57, -25.97, 35], ['Inhambane', 35.38, -23.86, 30], ['Sofala', 34.75, -20.15, 20], ['Quelimane', 36.88, -17.88, 30], ['Mozambico', 40.73, -15.03, 40], ['Ibo', 40.58, -12.35, 20], ['Tete', 33.59, -16.16, 25], ['Sena', 35.0, -17.45, 20], ['Regno di Gaza', 33.0, -24.0, 15], ['Manicaland', 33.0, -19.0, 15], ['Zumbo', 30.45, -15.6, 10], ['Niassa', 36.5, -13.0, 10], ['Blantyre', 35.0, -15.79, 20], ['Livingstonia', 34.1, -10.6, 10], ['Shire', 35.2, -16.2, 5], ['Mashonaland', 31.0, -17.8, 10], ['Gutu', 31.15, -19.65, 5], ['Luangwa', 31.5, -12.5, 5], ['Bemba', 31.0, -10.5, 10], ['Kafue', 27.0, -15.0, 5],
  ['Luanda', 13.23, -8.84, 45], ['Benguela', 13.41, -12.58, 35], ['Moçâmedes', 12.15, -15.2, 25], ['Ambriz', 13.12, -7.85, 15], ['Bailundo', 15.87, -12.2, 30], ['Bié', 16.93, -12.38, 25], ['Cassange', 17.5, -9.6, 15], ['Malanje', 16.35, -9.54, 15], ['Pungo Andongo', 15.65, -9.67, 15], ['Humbe', 14.9, -16.7, 10], ['Cuanhama', 15.8, -17.2, 10], ['Moxico', 20.0, -12.0, 5], ['Cabinda', 12.2, -5.55, 20], ['Lunda', 20.0, -8.5, 3],
  // Madagascar e isole
  ['Tananarive', 47.52, -18.91, 50], ['Tamatave', 49.4, -18.15, 35], ['Majunga', 46.32, -15.72, 30], ['Fianarantsoa', 47.09, -21.45, 30], ['Tuléar', 43.67, -23.35, 20], ['Fort-Dauphin', 46.98, -25.03, 20], ['Diego Suarez', 49.29, -12.28, 15], ['Menabe', 44.5, -20.5, 15], ['Boina', 46.5, -16.5, 10], ['Bara', 45.5, -22.5, 10], ['Betsileo', 47.0, -21.0, 5], ['Antandroy', 45.5, -25.0, 10], ['Nosy Be', 48.26, -13.33, 20],
  ['Port Louis', 57.5, -20.16, 40], ['Saint-Denis', 55.45, -20.88, 40], ['Victoria', 55.45, -4.62, 20], ['Jamestown', -5.72, -15.93, 15], ['Mamoudzou', 45.23, -12.78, 15], ['Moroni', 43.25, -11.7, 15], ['Mutsamudu', 44.4, -12.17, 10], ['Praia', -23.51, 14.92, 25], ['Mindelo', -24.98, 16.89, 15], ['São Tomé', 6.73, 0.34, 20], ['Funchal', -16.91, 32.65, 35], ['Ponta Delgada', -25.67, 37.74, 30], ['Angra', -27.22, 38.66, 20], ['Las Palmas', -15.42, 28.1, 35], ['Santa Cruz de Tenerife', -16.25, 28.47, 35],
  // Arabia
  ['La Mecca', 39.83, 21.42, 60], ['Medina', 39.61, 24.47, 50], ['Gedda', 39.17, 21.49, 40], ['Taif', 40.42, 21.27, 25], ['Yanbu', 38.06, 24.09, 20], ['El Ula', 37.92, 26.62, 15], ['Abha', 42.5, 18.22, 25], ['Gizan', 42.55, 16.89, 15], ['Sana', 44.21, 15.35, 50], ['Hodeida', 42.95, 14.8, 35], ['Moka', 43.25, 13.32, 25], ['Taizz', 44.02, 13.58, 30], ['Ibb', 44.18, 13.97, 15], ['Saada', 43.76, 16.94, 25], ['Dhamar', 44.4, 14.55, 15], ['Aden', 45.03, 12.79, 45], ['Lahej', 44.88, 13.05, 25], ['Mukalla', 49.12, 14.54, 30], ['Shibam', 48.63, 15.93, 25], ['Tarim', 49.0, 16.05, 15], ['Seyun', 48.79, 15.94, 15], ['Marib', 45.32, 15.47, 10], ['Shabwa', 47.0, 14.7, 5], ['Mahra', 51.5, 16.5, 10], ['Socotra', 53.85, 12.5, 15], ['Bayda', 45.57, 13.98, 10], ['Ahwar', 46.7, 13.5, 5],
  ['Mascate', 58.59, 23.61, 50], ['Sohar', 56.74, 24.35, 25], ['Nizwa', 57.53, 22.93, 30], ['Rustaq', 57.42, 23.39, 20], ['Sur', 59.53, 22.57, 25], ['Salala', 54.1, 17.02, 25], ['Ibra', 58.53, 22.69, 10], ['Masira', 58.8, 20.4, 5], ['Abu Dhabi', 54.37, 24.45, 20], ['Dubai', 55.3, 25.26, 20], ['Sharja', 55.39, 25.35, 25], ['Ras al-Khaima', 55.94, 25.79, 25], ['Doha', 51.53, 25.29, 25], ['Manama', 50.58, 26.22, 25],
  ['Riad', 46.72, 24.63, 40], ['Unaiza', 43.99, 26.08, 30], ['Buraida', 43.97, 26.33, 30], ['Hofuf', 49.59, 25.38, 40], ['Qatif', 50.0, 26.56, 25], ['Kharj', 47.3, 24.15, 15], ['Sudair', 45.6, 25.7, 10], ['Uadi Dauasir', 45.0, 20.45, 15], ['Bisha', 42.6, 20.0, 15], ['Ranya', 42.85, 21.25, 5], ['Aflag', 46.0, 22.3, 10], ['Washm', 45.0, 25.4, 10],
];
// nomi per le province del deserto senza una forma del terreno prevalente (il punto più vicino)
export const AF_DESERT_NAMES = [['Saguia el-Hamra', -12.0, 26.5], ['Río de Oro', -14.8, 23.5], ['Tiris', -12.8, 22.0], ['Mreyé', -6.5, 21.0], ['Tanezruft', 0.0, 23.5], ['Azauad', -2.5, 19.5],
  ['Adrar degli Ifoghas', 1.5, 19.5], ['Tamesna', 5.0, 18.0], ['Teneré', 10.5, 19.0], ['Kawar', 13.0, 19.5], ['Giado', 12.5, 21.8], ['Giurab', 17.5, 16.7], ['Mourdi', 22.0, 18.5], ['Sarir Tibesti', 18.5, 24.5],
  ['Calanscio', 22.0, 27.0], ['Gilf Kebir', 26.0, 23.5], ['Uadi Hauar', 26.5, 17.5], ['Atmur', 32.5, 20.5], ['Bayuda', 32.8, 17.8], ['Nubia', 31.0, 21.5], ['Etbai', 35.5, 21.0], ['Uadi Allaqi', 33.5, 22.5],
  ['Ahnet', 2.0, 25.0], ['Muydir', 4.0, 25.5], ['Tassili', 7.5, 25.5], ['Fezzan meridionale', 13.0, 24.0], ['Hamada di Murzuk', 12.0, 26.0], ['Erg Chech', -2.5, 25.0], ['Hodh', -8.0, 17.8],
  ['Rub al-Khali', 50.0, 20.0], ['Jafura', 50.5, 24.0], ['Dahna', 47.0, 23.5], ['Ramlat as-Sabatayn', 46.5, 15.8], ['Uahiba', 58.7, 21.7], ['Gidda', 52.0, 18.5]];
// nomi moderni da non usare (città nate dopo il 1881 o rinominate)
export const AF_ANACHRONISTIC = new Set(['Dar Naim', 'Serekunda', 'Ajegunle', 'Ikeja', 'Nazrēt', 'Ncotshane', 'Addis Ababa', 'Nairobi', 'Johannesburg', 'Harare', 'Lusaka', 'Djibouti', 'Port Sudan', 'Conakry', 'Abidjan', 'Bangui', "N'Djamena", 'Niamey', 'Kigali', 'Bujumbura',
  'Dodoma', 'Arusha', 'Kampala', 'Kinshasa', 'Lubumbashi', 'Kolwezi', 'Likasi', 'Kisangani', 'Mbuji-Mayi', 'Kananga', 'Bukavu', 'Goma', 'Port Harcourt', 'Kaduna', 'Jos', 'Abuja', 'Yamoussoukro', 'Nouakchott',
  'Gaborone', 'Lilongwe', 'Kitwe', 'Ndola', 'Chingola', 'Mufulira', 'Luanshya', 'Welkom', 'Soweto', 'Sasolburg', 'Vanderbijlpark', 'Secunda', 'Benoni', 'Germiston', 'Boksburg', 'Springs', 'Krugersdorp',
  'Juba', 'Malakal', 'Kosti', 'Omdurman', 'Kisumu', 'Entebbe', 'Jinja', 'Port-Gentil', 'Pointe-Noire', 'Yaoundé', 'Beira', 'Nacala', 'Maputo', 'Matola', 'Mutare', 'Gweru', 'Kwekwe',
  'Francistown', 'Lobito', 'Huambo', 'Lubango', 'Kuito', 'Mbanza-Ngungu', 'Antsiranana', 'Toamasina', 'Mahajanga', 'Antananarivo', 'Toliara', 'Thohoyandou', 'Polokwane', 'Mbombela', 'Nelspruit',
  'Bhisho', 'Mthatha', 'Rustenburg', 'Klerksdorp', 'Tema', 'Takoradi', 'Sekondi-Takoradi', 'Tamale', 'Bobo', 'Koudougou', 'Ouagadougou', 'Bamako', 'Sikasso', 'Garoua', 'Maroua', 'Ngaoundéré',
  'Bertoua', 'Ebolowa', 'Bafoussam', 'Bamenda', 'Douala', 'Libreville', 'Owendo', 'Moanda', 'Franceville', 'Dolisie', 'Gemena', 'Mbandaka', 'Bandundu', 'Kikwit', 'Tshikapa', 'Kalemie', 'Uvira',
  'Mwanza', 'Moshi', 'Morogoro', 'Mbeya', 'Iringa', 'Kigoma', 'Musoma', 'Shinyanga', 'Sumbawanga', 'Mtwara', 'Lindi', 'Songea', 'Eldoret', 'Nakuru', 'Thika', 'Garissa', 'Kakamega', 'Meru',
  'Hargeisa', 'Burao', 'Bosaso', 'Galkayo', 'Beledweyne', 'Baidoa', 'Kismayo', 'Dire Dawa', 'Jijiga', 'Mekele', 'Bahir Dar', 'Dessie', 'Awasa', 'Adama', 'Nazret', 'Jimma', 'Asmara', 'Assab',
  'Riyadh', 'Dammam', 'Khobar', 'Dhahran', 'Jubail', 'Hafar al-Batin', 'Al Khobar', 'Khamis Mushait', 'Jazan', 'Sakakah', 'Arar', 'Tabuk', 'Ad Dammam', 'Abqaiq', 'Ras Tanura', 'Ar Ruways',
  'Port Said', 'Al Ain', 'Madinat Zayed', 'Jebel Ali', 'Mina Qaboos', 'Seeb', 'Bawshar', 'Duqm', 'Salalah', 'Ataq', 'Sayun', 'Al Mukalla', "Sana'a", 'Aden', 'Taiz', 'Al Hudaydah', 'Ibb',
  'Agadez', 'Arlit', 'Zinder', 'Tahoua', 'Diffa', 'Abéché', 'Sarh', 'Moundou', 'Faya-Largeau', 'Kaolack', 'Thiès', 'Touba', 'Nouadhibou', 'Zouerate', 'Kayes', 'Timbuktu', 'Mopti', 'Gao']);
// etichette italiane degli stati d'epoca (regione storica delle province)
export const AF_REGION = {
  'Egypt': 'Sudan egiziano', 'Harer (Egypt)': 'Harar', 'Ottoman Empire': 'Arabia ottomana', 'Arabia': 'Neged', 'Oman': 'Oman', 'Trucial Oman': 'Costa della Tregua', 'Qatar': 'Qatar',
  'Ethiopia': 'Abissinia', 'Sultanate of Zanzibar': 'Zanzibar', 'Madagascar': 'Madagascar', 'Imerina': 'Imerina', 'Liberia': 'Liberia', 'Transvaal': 'Transvaal', 'Orange Free State': 'Orange',
  'Zululand': 'Zululand', 'Swaziland': 'Swaziland', 'Ndebele': 'Matabeleland', 'Ngwato': 'Bamangwato', 'Lozi': 'Barotseland', 'Barotse': 'Barotseland', 'Cape Colony': 'Colonia del Capo', 'Natal': 'Natal',
  'Griqualand West': 'Griqualand occidentale', 'Basutoland': 'Basutoland', 'Gold Coast (GB)': 'Costa d\'Oro', 'Sierra Leone': 'Sierra Leone', 'Gambia': 'Gambia', 'Lagos': 'Lagos', 'Senegal (FR)': 'Senegal',
  'Gabon': 'Gabon', 'Ivory Coast': 'Costa d\'Avorio', 'Cotonou': 'Cotonou', 'Portuguese Guinea': 'Guinea portoghese', 'Angola (Portugal)': 'Angola', 'Mozambique': 'Mozambico', 'Spanish Guinea': 'Guinea spagnola',
  'Sokoto Caliphate': 'Sokoto', 'Kanem-Bornu': 'Bornu', 'Wadai Empire': 'Uadai', 'Tukular Caliphate': 'Impero tukulor', 'Wassoulou Empire': 'Uassulu', 'Kong Empire': 'Kong', 'Mossi States': 'Mossi',
  'Asante': 'Ascianti', 'Dahomey': 'Dahomey', 'Futa Jalon': 'Futa Gialon', 'Futa Toro': 'Futa Toro', 'Ibadan': 'Yoruba', 'Oyo': 'Yoruba', 'Benin': 'Benin', 'Borgu States': 'Borgu', 'Dendi Kingdom': 'Dendi',
  'Sultanate of Damagaram': 'Damagaram', 'Rabih az-Zubayr': 'Dar Kuti', 'Ato trading confederacy': 'Aro', 'Calabar': 'Calabar', 'Opobo': 'Opobo', 'Buganda': 'Buganda', 'Bunyoro': 'Bunyoro', 'Rwanda': 'Ruanda',
  'Burundi': 'Burundi', 'Kuba': 'Kuba', 'Luba': 'Luba', 'Lunda': 'Lunda', 'Yaka': 'Yaka', 'Teke': 'Teke', 'Yeke': 'Garanganze', 'Sultanate of Utetera': 'Manyema', 'Congo': 'Congo', 'Mbailundu': 'Bailundo',
  'Ovimbundu': 'Bié', 'Mirambo Unyanyembe Ukimbu': 'Unyamwezi', 'Nguni': 'Ngoni', 'Shona': 'Mashonaland', 'Morocco': 'Sus', 'Spain': 'Canarie',
};
// regioni delle terre di nessuno per paese moderno
export const AF_NULL_REGION = {
  DZA: 'Sahara', LBY: 'Sahara libico', EGY: 'Deserto orientale', MAR: 'Sahara occidentale', SAH: 'Sahara occidentale', MRT: 'Mauritania', MLI: 'Sahel', NER: 'Sahel', TCD: 'Ciad', SDN: 'Sudan', SDS: 'Alto Nilo',
  ERI: 'Dancalia', ETH: 'Galla', DJI: 'Dancalia', SOL: 'Somalia', SOM: 'Somalia', KEN: 'Africa orientale', UGA: 'Grandi Laghi', TZA: 'Africa orientale', RWA: 'Grandi Laghi', BDI: 'Grandi Laghi',
  COD: 'Congo', COG: 'Congo', GAB: 'Gabon', GNQ: 'Rio Muni', CMR: 'Camerun', CAF: 'Ubangi', NGA: 'Nigeria', BEN: 'Costa degli Schiavi', TGO: 'Costa degli Schiavi', GHA: 'Costa d\'Oro', CIV: 'Costa d\'Avorio',
  BFA: 'Volta', LBR: 'Costa del Pepe', SLE: 'Sierra Leone', GIN: 'Guinea', GNB: 'Guinea', SEN: 'Senegambia', GMB: 'Senegambia', AGO: 'Angola', ZMB: 'Zambesi', MWI: 'Nyasa', MOZ: 'Mozambico', ZWE: 'Mashonaland',
  BWA: 'Kalahari', NAM: 'Africa del Sud-Ovest', ZAF: 'Cafreria', LSO: 'Basutoland', SWZ: 'Swaziland', MDG: 'Madagascar', COM: 'Comore', SAU: 'Arabia', YEM: 'Arabia meridionale', OMN: 'Oman', ARE: 'Costa della Tregua',
};
// scala delle dimensioni per paese moderno (più fitte dove serve dettaglio storico)
export const AF_SIZE = { ZAF: 0.55, LSO: 0.6, SWZ: 0.6, EGY: 0.35, ETH: 0.75, ERI: 0.7, YEM: 0.55, OMN: 0.8, NGA: 1.0, GHA: 0.8, SEN: 0.75, GMB: 0.6, SLE: 0.8, MDG: 0.9, TZA: 0.9, KEN: 0.9, UGA: 0.8, SAU: 0.85 };

// --- Fase 2a: regioni storiche e province di dettaglio (Egitto-Sudan e Corno d'Africa) ---
// Atomi = suddivisioni ∩ stati d'epoca ∩ bacini HydroBASINS di livello 6 (confini naturali sugli spartiacque);
// ogni atomo va alla regione storica del centro più vicino (fra quelle ammesse per il suo paese moderno);
// le province si formano dentro la regione, con la dimensione indicata (km²).
export const AF_DETAIL_MODERN = ['EGY', 'SDN', 'SDS', 'ERI', 'ETH', 'DJI', 'SOL', 'SOM'];
/** [regione, lon, lat, paesi moderni ammessi, km² per provincia] */
export const AF_DETAIL_REGIONS = [
  // Alto Egitto: le mudiriyya del 1881
  ['Girga', 31.75, 26.4, ['EGY'], 5000, 'EGY'], ['Qena', 32.7, 26.0, ['EGY'], 5000, 'EGY'], ['Esna', 32.55, 25.2, ['EGY'], 5000, 'EGY'], ['Assuan', 32.9, 24.1, ['EGY'], 6000, 'EGY'], ['Nubia', 31.5, 22.3, ['EGY', 'SDN'], 12000, 'EGY'],
  // Sudan egiziano: le province (mudiriyya) del governatorato di Khartum
  ['Dongola', 30.5, 19.3, ['SDN'], 34000, 'EGY'], ['Berber', 33.9, 18.2, ['SDN'], 38000, 'EGY'], ['Khartum', 32.6, 15.7, ['SDN'], 34000, 'EGY'], ['Sennar', 33.6, 13.4, ['SDN'], 38000, 'EGY'],
  ['Fazogli', 34.4, 11.2, ['SDN', 'ETH'], 48000, 'EGY'], ['Gallabat', 36.2, 13.0, ['SDN'], 38000, 'EGY'], ['Taka', 36.3, 15.6, ['SDN', 'ERI'], 48000, 'EGY'], ['Suakin', 37.0, 19.3, ['SDN'], 57000, 'EGY'],
  ['Kordofan', 30.2, 13.5, ['SDN'], 57000, 'EGY'], ['Monti Nuba', 30.0, 11.0, ['SDN'], 57000, 'EGY'], ['Fascioda', 32.4, 10.3, ['SDN', 'SDS'], 66000, 'EGY'],
  ['El Fasher', 25.4, 14.4, ['SDN'], 66000, 'EGY'], ['Kebkabiya', 23.4, 13.0, ['SDN'], 57000], ['Dara', 24.6, 11.6, ['SDN'], 57000, 'EGY'], ['Shakka', 26.5, 10.2, ['SDN', 'SDS'], 66000, 'EGY'],
  ['Bahr el-Ghazal', 27.5, 7.8, ['SDS', 'SDN'], 64000, 'EGY'], ['Rohl', 30.0, 6.8, ['SDS'], 64000, 'EGY'], ['Sobat', 33.0, 8.6, ['SDS'], 64000, 'EGY'], ['Equatoria', 31.6, 4.6, ['SDS'], 64000, 'EGY'], ['Bor', 31.8, 6.6, ['SDS'], 64000, 'EGY'],
  // Eritrea e costa
  ['Massaua', 39.3, 15.8, ['ERI'], 14000, 'EGY'], ['Bogos', 38.3, 15.9, ['ERI'], 16000, 'EGY'], ['Hamasien', 38.9, 15.3, ['ERI'], 7000, 'ETH'], ['Seraè', 38.6, 14.8, ['ERI'], 8000, 'ETH'], ['Acchelè Guzai', 39.3, 14.8, ['ERI'], 7000, 'ETH'], ['Zula', 39.85, 15.05, ['ERI'], 6000, 'EGY'],
  ['Dancalia settentrionale', 40.6, 14.3, ['ERI', 'ETH'], 20000, ''], ['Assab', 42.7, 13.0, ['ERI'], 6000, 'ITA'], ['Beilul', 42.2, 13.5, ['ERI'], 12000, ''], ['Raheita', 43.15, 12.7, ['ERI', 'DJI'], 8000, ''],
  // Etiopia: i regni dell'impero di Giovanni IV
  ['Tigrè', 39.2, 13.7, ['ETH'], 17000, 'ETH'], ['Semien', 38.2, 13.3, ['ETH'], 17000, 'ETH'], ['Begemder', 37.9, 12.0, ['ETH'], 18000, 'ETH'], ['Gojjam', 37.4, 10.6, ['ETH'], 21000, 'ETH'],
  ['Lasta', 39.1, 12.5, ['ETH'], 16000, 'ETH'], ['Uollo', 39.6, 11.1, ['ETH'], 17000, 'ETH'], ['Scioa', 39.1, 9.5, ['ETH'], 21000, 'ETH'],
  // terre oromo, sidama e somale fuori dall'impero
  ['Beni Shangul', 35.0, 10.6, ['ETH', 'SDN'], 35000, 'EGY'], ['Uallega', 35.9, 9.1, ['ETH'], 31000, ''], ['Illubabor', 35.3, 7.9, ['ETH'], 35000, ''], ['Gambela', 34.3, 8.0, ['ETH', 'SDS'], 42000, ''],
  ['Gimma', 36.9, 7.7, ['ETH'], 25000, ''], ['Caffa', 36.1, 7.1, ['ETH'], 25000, ''], ['Gurage', 38.0, 8.3, ['ETH'], 25000, ''], ['Uolaita', 37.6, 6.8, ['ETH'], 31000, ''], ['Sidamo', 38.6, 6.0, ['ETH'], 35000, ''],
  ['Borana', 38.4, 4.3, ['ETH', 'KEN'], 56000, ''], ['Arussi', 39.5, 7.7, ['ETH'], 31000, ''], ['Bale', 40.6, 6.9, ['ETH'], 42000, ''], ['Harar', 42.1, 9.3, ['ETH', 'SOL'], 14000, 'EGY'], ['Ciercer', 40.9, 8.9, ['ETH'], 22000, ''], ['Giggiga', 43.2, 8.9, ['ETH', 'SOL'], 30000, ''],
  ['Aussa', 41.3, 11.6, ['ETH', 'DJI'], 35000, ''], ['Dancalia', 40.3, 12.9, ['ETH', 'ERI'], 35000, ''], ['Ogaden', 44.2, 7.2, ['ETH'], 77000, ''], ['Uebi Scebeli', 43.0, 5.5, ['ETH', 'SOM'], 70000, ''],
  // Gibuti e Somalia settentrionale
  ['Obock e Tagiura', 42.7, 11.7, ['DJI'], 25000, ''], ['Zeila', 43.3, 10.9, ['SOL', 'DJI', 'ETH'], 15000, 'EGY'], ['Berbera', 45.0, 10.1, ['SOL'], 20000, 'EGY'], ['Haud', 45.5, 8.8, ['SOL', 'ETH'], 56000, ''],
  ['Dulbahante', 47.4, 8.7, ['SOL', 'SOM'], 49000, ''], ['Uarsangheli', 47.6, 10.7, ['SOL', 'SOM'], 35000, ''], ['Migiurtinia', 49.6, 10.2, ['SOM'], 49000, ''], ['Nogal', 48.6, 8.3, ['SOM'], 49000, ''],
  // Somalia meridionale
  ['Obbia', 48.3, 5.5, ['SOM'], 49000, ''], ['Mudugh', 47.2, 6.2, ['SOM'], 49000, ''], ['Hiran', 45.4, 4.6, ['SOM', 'ETH'], 42000, ''], ['Benadir', 45.4, 2.3, ['SOM'], 15000, 'ZAN'],
  ['Basso Scebeli', 44.3, 1.6, ['SOM'], 18000], ['Bai', 43.6, 2.8, ['SOM'], 35000, ''], ['Lugh', 42.3, 3.6, ['SOM', 'ETH', 'KEN'], 42000, ''], ['Oltregiuba', 41.8, -0.2, ['SOM', 'KEN'], 42000],
];
