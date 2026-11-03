// Africa e penisola arabica al 1° gennaio 1881: dati per scripts/map/africa.mjs.
// Fase 1: province storiche e regni (divisione larga, guidata dagli stati d'epoca e dalla densità).

// paesi moderni (adm0_a3 di Natural Earth) esclusi dall'estensione: fuori dal teatro africano-arabo
export const AF_EXCLUDE = ['FJI', 'KIR', 'NOR', 'ATF', 'IRQ', 'JOR', 'KWT', 'ISR', 'PSX', 'SYR', 'BRA',
  // fasi successive: India, Cina, Siberia
  'CHN', 'MNG', 'MDV', 'IOT', 'USA', 'BRN', 'IDN', 'PHL', 'TLS', 'PNG'];
/**
 * Popolazione del 1881 per unità amministrativa moderna (stima dai censimenti del 1881-1897 dei governatorati).
 * Ha la precedenza sul bacino del paese moderno: in Siberia la popolazione di oggi (Vladivostok, Kuzbass) non dice
 * niente di quella del 1881, concentrata negli Urali e lungo la via della Siberia.
 */
export const AF_POP_ISO = {
  'RU-BA': 1_400_000, 'RU-ORE': 700_000, 'RU-CHE': 550_000, 'RU-SVE': 1_000_000, 'RU-PER': 1_000_000, 'RU-UD': 600_000, 'RU-TA': 600_000,
  'RU-SAM': 500_000, 'RU-KIR': 400_000, 'RU-KO': 90_000, 'RU-ARK': 20_000, 'RU-NEN': 8_000,
  'RU-KGN': 450_000, 'RU-TYU': 400_000, 'RU-KHM': 30_000, 'RU-YAN': 20_000, 'RU-OMS': 350_000,
  'RU-NVS': 300_000, 'RU-TOM': 250_000, 'RU-KEM': 250_000, 'RU-ALT': 450_000, 'RU-AL': 50_000,
  'RU-KYA': 400_000, 'RU-KK': 80_000, 'RU-TY': 50_000, 'RU-IRK': 350_000, 'RU-BU': 200_000, 'RU-ZAB': 300_000,
  'RU-SA': 240_000, 'RU-AMU': 40_000, 'RU-YEV': 5_000, 'RU-KHA': 30_000, 'RU-PRI': 50_000, 'RU-SAK': 20_000,
  'RU-KAM': 10_000, 'RU-MAG': 10_000, 'RU-CHU': 12_000,
  // India, Pakistan: stima del 1881 per stato moderno (censimento del 1881 per provincia e agenzia, ripartito)
  'IN-UP': 42_000_000, 'IN-UT': 1_900_000, 'IN-BR': 23_000_000, 'IN-JH': 5_500_000, 'IN-OR': 5_500_000, 'IN-WB': 12_000_000,
  'IN-AP': 12_000_000, 'IN-TN': 15_500_000, 'IN-KL': 5_500_000, 'IN-TG': 6_000_000, 'IN-KA': 10_400_000, 'IN-MH': 17_000_000,
  'IN-GJ': 9_000_000, 'IN-RJ': 10_500_000, 'IN-MP': 14_500_000, 'IN-CT': 3_000_000, 'IN-PB': 6_500_000, 'IN-HR': 4_200_000,
  'IN-HP': 1_600_000, 'IN-DL': 650_000, 'IN-JK': 1_500_000, 'IN-LA': 100_000, 'IN-AS': 2_600_000, 'IN-ML': 300_000, 'IN-NL': 150_000,
  'IN-MZ': 80_000, 'IN-AR': 100_000, 'IN-MN': 220_000, 'IN-TR': 100_000, 'IN-SK': 30_000, 'IN-GA': 450_000, 'IN-PY': 280_000,
  'IN-AN': 15_000, 'IN-LD': 14_000, 'IN-DH': 60_000, 'IN-CH': 20_000,
  'PK-PB': 10_000_000, 'PK-SD': 2_550_000, 'PK-KP': 1_600_000, 'PK-TA': 900_000, 'PK-BA': 450_000, 'PK-JK': 500_000, 'PK-GB': 150_000, 'PK-IS': 50_000,
};
/** India: regioni assegnate per distretto (censimento 2011, DataMeet, CC BY 4.0): stati principeschi e possedimenti europei. */
export const AF_DISTRICT_REGIONS = {
 'Calcutta': ['West Bengal|Kolkata', 'West Bengal|Haora'],
 'Bombay': ['Maharashtra|Mumbai', 'Maharashtra|Mumbai Suburban'],
 'Haiderabad': [
  'Andhra Pradesh|Hyderabad',
  'Andhra Pradesh|Rangareddy',
  'Andhra Pradesh|Mahbubnagar'
 ],
 'Warangal': [
  'Andhra Pradesh|Warangal',
  'Andhra Pradesh|Karimnagar',
  'Andhra Pradesh|Khammam'
 ],
 'Medak': [
  'Andhra Pradesh|Medak',
  'Andhra Pradesh|Nizamabad',
  'Andhra Pradesh|Adilabad'
 ],
 'Nalgonda': [
  'Andhra Pradesh|Nalgonda'
 ],
 'Aurangabad': [
  'Maharashtra|Aurangabad',
  'Maharashtra|Jalna'
 ],
 'Nander': [
  'Maharashtra|Nanded',
  'Maharashtra|Parbhani',
  'Maharashtra|Hingoli'
 ],
 'Bhir': [
  'Maharashtra|Bid',
  'Maharashtra|Latur',
  'Maharashtra|Osmanabad'
 ],
 'Gulbarga': [
  'Karnataka|Gulbarga',
  'Karnataka|Yadgir',
  'Karnataka|Bidar'
 ],
 'Raichur': [
  'Karnataka|Raichur',
  'Karnataka|Koppal'
 ],
 'Bangalore': [
  'Karnataka|Bangalore',
  'Karnataka|Bangalore Rural',
  'Karnataka|Ramanagara'
 ],
 'Mysore': [
  'Karnataka|Mysore',
  'Karnataka|Chamrajnagar',
  'Karnataka|Mandya'
 ],
 'Shimoga': [
  'Karnataka|Shimoga',
  'Karnataka|Chikmagalur'
 ],
 'Chitaldrug': [
  'Karnataka|Chitradurga',
  'Karnataka|Davanagere'
 ],
 'Tumkur': [
  'Karnataka|Tumkur'
 ],
 'Kolar': [
  'Karnataka|Kolar',
  'Karnataka|Chikkaballapura'
 ],
 'Hassan': [
  'Karnataka|Hassan'
 ],
 'Trivandrum': [
  'Kerala|Thiruvananthapuram',
  'Tamil Nadu|Kanniyakumari'
 ],
 'Quilon': [
  'Kerala|Kollam',
  'Kerala|Pathanamthitta'
 ],
 'Kottayam': [
  'Kerala|Kottayam',
  'Kerala|Alappuzha',
  'Kerala|Idukki'
 ],
 'Cochin': [
  'Kerala|Ernakulam',
  'Kerala|Thrissur'
 ],
 'Srinagar': [
  'Jammu & Kashmir|Srinagar',
  'Jammu & Kashmir|Badgam',
  'Jammu & Kashmir|Ganderbal',
  'Jammu & Kashmir|Pulwama',
  'Jammu & Kashmir|Shupiyan',
  'Jammu & Kashmir|Anantnag',
  'Jammu & Kashmir|Kulgam',
  'Jammu & Kashmir|Baramula',
  'Jammu & Kashmir|Bandipore',
  'Jammu & Kashmir|Kupwara'
 ],
 'Jammu': [
  'Jammu & Kashmir|Jammu',
  'Jammu & Kashmir|Samba',
  'Jammu & Kashmir|Kathua',
  'Jammu & Kashmir|Udhampur',
  'Jammu & Kashmir|Reasi',
  'Jammu & Kashmir|Rajouri',
  'Jammu & Kashmir|Punch'
 ],
 'Kishtwar': [
  'Jammu & Kashmir|Doda',
  'Jammu & Kashmir|Kishtwar',
  'Jammu & Kashmir|Ramban'
 ],
 'Ladakh': [
  'Jammu & Kashmir|Leh (ladakh)',
  'Jammu & Kashmir|Kargil',
  'Jammu & Kashmir|Data Not Available'
 ],
 'Patiala': [
  'Punjab|Patiala',
  'Punjab|Sangrur',
  'Punjab|Barnala',
  'Punjab|Fatehgarh Sahib',
  'Punjab|Bathinda',
  'Punjab|Mansa'
 ],
 'Jaipur': [
  'Rajasthan|Jaipur',
  'Rajasthan|Dausa',
  'Rajasthan|Sikar',
  'Rajasthan|Jhunjhunun',
  'Rajasthan|Sawai Madhopur'
 ],
 'Jodhpur': [
  'Rajasthan|Jodhpur',
  'Rajasthan|Nagaur',
  'Rajasthan|Pali',
  'Rajasthan|Barmer',
  'Rajasthan|Jalor'
 ],
 'Udaipur': [
  'Rajasthan|Udaipur',
  'Rajasthan|Rajsamand',
  'Rajasthan|Chittaurgarh',
  'Rajasthan|Bhilwara',
  'Rajasthan|Pratapgarh'
 ],
 'Bikaner': [
  'Rajasthan|Bikaner',
  'Rajasthan|Churu',
  'Rajasthan|Ganganagar',
  'Rajasthan|Hanumangarh'
 ],
 'Gwalior': [
  'Madhya Pradesh|Gwalior',
  'Madhya Pradesh|Bhind',
  'Madhya Pradesh|Morena',
  'Madhya Pradesh|Sheopur',
  'Madhya Pradesh|Shivpuri',
  'Madhya Pradesh|Guna',
  'Madhya Pradesh|Ashoknagar'
 ],
 'Ujjain': [
  'Madhya Pradesh|Ujjain',
  'Madhya Pradesh|Shajapur',
  'Madhya Pradesh|Mandsaur'
 ],
 'Bhilsa': [
  'Madhya Pradesh|Vidisha'
 ],
 'Indore': [
  'Madhya Pradesh|Indore',
  'Madhya Pradesh|West Nimar'
 ],
 'Bhopal': [
  'Madhya Pradesh|Bhopal',
  'Madhya Pradesh|Sehore',
  'Madhya Pradesh|Raisen'
 ],
 'Rewa': [
  'Madhya Pradesh|Rewa',
  'Madhya Pradesh|Satna',
  'Madhya Pradesh|Sidhi',
  'Madhya Pradesh|Singrauli',
  'Madhya Pradesh|Shahdol',
  'Madhya Pradesh|Umaria',
  'Madhya Pradesh|Anuppur'
 ],
 'Baroda': [
  'Gujarat|Vadodara'
 ],
 'Kadi': [
  'Gujarat|Mahesana',
  'Gujarat|Patan'
 ],
 'Amreli': [
  'Gujarat|Amreli'
 ],
 'Navsari': [
  'Gujarat|Navsari'
 ],
 'Kutch': [
  'Gujarat|Kachchh'
 ],
 'Manipur': [
  'Manipur|Bishnupur',
  'Manipur|Chandel',
  'Manipur|Churachandpur',
  'Manipur|Imphal East',
  'Manipur|Imphal West',
  'Manipur|Senapati',
  'Manipur|Tamenglong',
  'Manipur|Thoubal',
  'Manipur|Ukhrul'
 ],
 'Tippera': [
  'Tripura|Dhalai',
  'Tripura|North Tripura',
  'Tripura|South Tripura',
  'Tripura|West Tripura'
 ],
 'Sikkim': [
  'Sikkim|East',
  'Sikkim|North',
  'Sikkim|South',
  'Sikkim|West'
 ],
 'Goa': [
  'Goa|North Goa',
  'Goa|South Goa'
 ],


 'Nagar Aveli': [
  'Dadara & Nagar Havelli|Dadra & Nagar Haveli'
 ],
 'Pondichery': [
  'Puducherry|Puducherry'
 ],



};
/** Popolazione fissa delle grandi città-provincia (censimento del 1881), che i pesi delle località sottostimano. */
export const AF_POP_FIXED = { Bombay: 773_000, Calcutta: 870_000 };
/**
 * Province europee da rifare fuori anche se non toccano il vecchio bordo: stanno sui confini rettilinei tracciati
 * fra il 1913 e il 1965 (Arabia saudita, Giordania, Iraq, Kuwait), che nel 1881 non esistevano.
 */
export const AF_FREE_EU = ['Al-Hudud al-Shamaliyya', 'Al-Jawf', 'Al-Muthanna', 'Al Mafraq', 'Mafraq (est)', 'Ar Rutbah', 'Al-Anbar (sud) I', 'Al-Anbar (ovest) I',
  'Al-Anbar (sud) II', 'Al-Anbar (ovest) II', 'Al-Anbar (sud)', 'Najaf (sud)', 'Aqaba', "Ma'an", 'Governatorato della Capitale', 'Al-Ahmad', 'Al-Jahra'];
/** Regioni aggiunte alla zona rifatta: [nome, lon, lat, paese moderno, dimensione, padrone]. */
export const AF_FREED_EXTRA = [
  // Uadi Sirhan: rivendicato da Damasco ma tenuto da Ruwala e Bani Sakhr; la parte sud con il Giauf è dei Rashidi
  ['Uadi Sirhan', 37.9, 31.0, 'SAU', 35000, 'ARA'],
  // pascoli di Shammar e Anaza fra Baghdad e Ha'il: nessuna presenza statale
  ['Uadi Arar', 41.2, 31.0, 'SAU', 40000, ''],
  // il deserto a sud di Samawa: tribù Dhafir e Shammar (Samawa città resta ottomana, sangiaccato del Muntafiq)
  ['Paese dei Dhafir', 45.0, 29.9, 'IRQ', 35000, ''],
];

/** Correzioni alle province europee rifatte fuori (nome, padrone, dimensione). */
export const AF_FREED_FIX = {
  // il deserto siriaco meridionale (Hamad): tribù Anaza e Shammar, sotto una sovranità ottomana nominale
  // il deserto siriaco centrale (Anaza): ottomano solo sulla carta
  'Al-Hudud al-Shamaliyya': { name: 'Hamad', owner: '', T: 90000 },
  // deserto meridionale iracheno (Dhafir, Shammar): il controllo ottomano si fermava all'Eufrate
  'Al-Anbar (sud)': { name: 'Deserto di Anbar', owner: '', T: 30000 }, 'Najaf (sud)': { owner: '' },
  // il Giauf dei Rashidi è l'oasi e i suoi dintorni; il Uadi Sirhan e il nord del Nefud restano ottomani (Bartholomew 1871)
  'Al-Jawf': { name: 'Giauf', at: [39.87, 29.81], T: 45000 },
  // Aqaba resta egiziana fino al 1892, come il Midian
  'Aqaba': { owner: 'EGY' },
  'Al-Sharqiyya': { name: 'Giubail' },
  'Governatorato della Capitale': { name: 'Kuwait' },
  'Al-Ahmad': { name: 'Fahahil' },
  'Al-Muthanna': { name: 'Samawa', at: [45.29, 31.31], T: 15000 },
  // l'interno del Golfo fra il Neged e al-Hasa: sabbie del Dahna e del Summan, tribù Mutair e Agiman
  'Al-Riyad': { name: 'Dahna', owner: '', T: 70000 },
};
/** Fuori dal vecchio riquadro (a est dell'88° meridiano o a nord del 56° parallelo) entrano solo questi paesi. */
export const AF_FAR_KEEP = ['RUS', 'IND', 'BGD', 'NPL', 'BTN', 'LKA', 'MMR', 'THA', 'LAO', 'KHM', 'VNM', 'MYS', 'SGP'];
// area dell'estensione: tutto ciò che sta fuori dal rettangolo della mappa europea
export const AF_CLIP = [-30, -36, 180, 78];

// grandi laghi naturali (i bacini artificiali come il Nasser, il Volta o il Kariba nel 1881 non esistevano)
export const AF_LAKES = ['Lake Baikal', 'Lake Khanka', 'Lake Taymyr', 'Lake Chany', 'Lake Balkhash', 'Issyk-Kul', 'Lake Zaysan', 'Alakol', 'Lake Albert', 'Lake Malawi', 'Lake Tanganyika', 'Lake Victoria', 'Lake Tana', 'Lac Moeru', 'Lake Bangweulu', 'Lake Kivu', 'Lake Edward', 'Lake Turkana'];

// stato d'epoca (world_1880) -> tag; '' = terra di nessuno
export const AF_HIST = {
  'null': '',
  'Egypt': 'EGY', 'Harer (Egypt)': 'EGY',
  'Ottoman Empire': 'TUR', 'Qatar': 'QAT',
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
  'Persia': 'PER', 'Russian Empire': 'RUS', 'Afghanistan': 'AFG', 'British Raj': 'GBR', 'Bokhara Khanate': 'BUK', 'central Asian khanates': '', 'Manchu Empire': '', 'Nepal': 'NEP', 'Bhutan': 'BHU', 'Ceylon': 'GBR', 'Annam': 'ANN', 'Rattanakosin Kingdom': 'SIA', 'French Indochina': 'FRA', 'Malaya': '', 'Netherlands Indies': '', 'Imperial Japan': '',
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
  { modern: 'QAT', to: 'QAT' },
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
  SAU: 30_000, YEM: 900_000, OMN: 600_000, ARE: 70_000, BHR: 60_000, QAT: 25_000,
  // Persia a est del 50° meridiano (l'ovest sta nel bacino della Persia), Afghanistan, Turkestan e steppa kazaka
  // Russia a est del 50° meridiano: Urali e Siberia (circa 5 milioni negli Urali, 4 in Siberia, poche centinaia di migliaia in Estremo Oriente)
  RUS: 9_000_000,
  // subcontinente indiano (censimenti del 1881: 254 milioni con la Birmania; Ceylon 2,76)
  // Indocina e Malesia peninsulare (stime 1881: censimento della Bassa Birmania 3,7 milioni; Siam circa 6)
  MMR: 7_000_000, THA: 5_500_000, LAO: 800_000, KHM: 1_000_000, VNM: 10_000_000, MYS: 600_000, SGP: 140_000,
  IND: 200_000_000, PAK: 20_000_000, BGD: 27_000_000, NPL: 3_000_000, BTN: 200_000, LKA: 2_760_000, KAS: 5_000,
  IRN: 4_500_000, AFG: 3_000_000, TKM: 700_000, UZB: 3_200_000, KAZ: 2_400_000, KGZ: 650_000, TJK: 900_000, KAB: 5_000,
  ESP: 280_000, PRT: 395_000, FRA: 180_000,
};
// nazioni già presenti con bacino proprio: le loro nuove province attingono al bacino della nazione
export const AF_HOME = { EGY: 'EGY', ARA: 'SAU', NJD: 'SAU', MOR: 'MAR' };

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
/** Il mare d'Aral del 1881 (circa 66.000 km²): i dati di oggi ne hanno solo i resti. */
export const AF_ARAL = [[61.0, 46.8], [61.7, 46.4], [61.6, 45.9], [61.4, 45.3], [61.0, 44.7], [60.4, 44.0], [59.9, 43.6], [59.4, 43.5], [58.9, 43.7], [58.3, 44.3], [58.2, 45.0], [58.4, 45.6], [58.8, 46.0], [59.4, 46.1], [59.9, 46.6], [60.4, 46.8], [61.0, 46.8]];

export const AF_ARID = {
  // Sahara: intransitabile solo a nord del Sahel
  sahara: ['SAHARA', 'LIBYAN DESERT', 'NUBIAN DESERT', 'Ténéré', 'Tassili oua-n-Ahaggar', 'Tassili-n-Ajjer', 'El Djouf', '‘Erg Chech', 'Idhän Murzuq', 'Sarïr Kalanshiyu ar Ramli al Kabi', 'Akchâr', 'Hamada du Drâa', '‘Erg Iguidi', 'WESTERN DESERT'],
  // deserti dove contano i dati sulle località (Arabia, Egitto)
  sparse: ['RUB’ AL KHALI', 'Eastern Desert', 'GARAGUM DESERT', 'QIZILQUM DESERT', 'BETPAQDALA DESERT', 'Kavir Desert', 'LUT DESERT', 'Margo Desert', 'Rigestan'],
};

// località storiche (1881) per il nome delle province: [nome, lon, lat, peso]
export const AF_TOWNS = [
  ['Kamen', 81.35, 53.8, 3], ['Zmeinogorsk', 82.2, 51.15, 8], ['Kolyvan', 82.75, 55.3, 8], ['Sretensk', 117.7, 52.25, 5], ['Nercinskij Zavod', 119.6, 51.3, 5], ['Aksa', 113.3, 50.3, 3],
  ['Tunka', 102.0, 51.7, 3], ['Zima', 102.0, 53.9, 3], ['Tulun', 100.6, 54.6, 3], ['Zeiskaja Pristan', 127.3, 53.7, 3], ['Albazin', 124.2, 53.4, 2], ['Michailo-Semenovskoe', 133.0, 47.9, 2],
  ['Kamen-Rybolov', 132.0, 44.75, 2], ['Nikolsk', 131.95, 43.8, 5], ['Posiet', 130.8, 42.65, 2], ['Olga', 135.3, 43.75, 2], ['Imperatorskaja Gavan', 140.3, 48.97, 1], ['Mariinsk sull\'Amur', 140.4, 51.1, 2],
  ['Zigansk', 123.4, 66.77, 1], ['Bulun', 127.3, 70.75, 1], ['Ust-Maia', 134.5, 60.4, 1], ['Amga', 131.98, 60.9, 2], ['Niznekolymsk', 160.9, 68.55, 1], ['Kuznetsk Siberiano', 0, 0, 0],
  // Russia asiatica (fase 4)
  ['Ufa', 55.96, 54.74, 40], ['Orenburg', 55.1, 51.77, 45], ['Perm', 56.25, 58.0, 40], ['Ekaterinburg', 60.6, 56.84, 40], ['Celiabinsk', 61.4, 55.16, 20], ['Troitsk', 61.56, 54.09, 20], ['Zlatoust', 59.65, 55.17, 20],
  ['Sterlitamak', 55.93, 53.63, 15], ['Birsk', 55.53, 55.42, 10], ['Menzelinsk', 53.1, 55.72, 10], ['Belebei', 54.1, 54.1, 10], ['Orsk', 58.57, 51.2, 15], ['Verchneuralsk', 59.22, 53.88, 10], ['Buzuluk', 52.25, 52.79, 15],
  ['Buguruslan', 52.44, 53.66, 10], ['Bugulma', 52.79, 54.54, 10], ['Cistopol', 50.65, 55.37, 15], ['Sarapul', 53.8, 56.47, 20], ['Glazov', 52.66, 58.14, 10], ['Elabuga', 52.06, 55.76, 15], ['Osa', 55.45, 57.29, 10],
  ['Kungur', 56.94, 57.43, 15], ['Krasnoufimsk', 57.76, 56.61, 10], ['Solikamsk', 56.77, 59.65, 15], ['Cerdyn', 56.48, 60.4, 10], ['Verchoture', 60.81, 58.86, 10], ['Kamyslov', 62.71, 56.85, 10], ['Sadrinsk', 63.63, 56.08, 15],
  ['Irbit', 63.07, 57.68, 15], ['Ust-Sysolsk', 50.84, 61.67, 15], ['Ust-Cilma', 52.15, 65.44, 5], ['Tiumen', 65.53, 57.15, 30], ['Tobolsk', 68.25, 58.2, 35], ['Kurgan', 65.34, 55.44, 15], ['Ialutorovsk', 66.3, 56.65, 10],
  ['Isim', 69.48, 56.11, 15], ['Tiukalinsk', 72.2, 55.87, 5], ['Tara', 74.37, 56.9, 10], ['Turinsk', 63.71, 58.04, 10], ['Omsk', 73.37, 54.98, 35], ['Berezov', 65.06, 63.93, 5], ['Surgut', 73.4, 61.25, 5], ['Obdorsk', 66.6, 66.53, 5],
  ['Tomsk', 84.97, 56.49, 45], ['Mariinsk', 87.75, 56.21, 10], ['Kainsk', 78.33, 55.43, 10], ['Barnaul', 83.78, 53.35, 25], ['Biisk', 85.21, 52.54, 15], ['Kuznetsk', 87.12, 53.76, 10], ['Narym', 81.96, 58.95, 5],
  ['Krasnoiarsk', 92.87, 56.01, 30], ['Acinsk', 90.5, 56.27, 10], ['Minusinsk', 91.69, 53.71, 15], ['Kansk', 95.7, 56.2, 10], ['Eniseisk', 92.17, 58.45, 15], ['Turuchansk', 87.98, 65.8, 5], ['Dudinka', 86.18, 69.4, 1],
  ['Irkutsk', 104.28, 52.29, 45], ['Balagansk', 103.0, 54.0, 5], ['Nizneudinsk', 98.99, 54.9, 10], ['Ilimsk', 103.7, 56.77, 5], ['Kirensk', 108.11, 57.78, 10], ['Verchneudinsk', 107.6, 51.83, 20], ['Kiachta', 106.45, 50.36, 25],
  ['Barguzin', 109.62, 53.62, 5], ['Cita', 113.5, 52.03, 20], ['Nercinsk', 116.52, 51.99, 15], ['Blagovescensk', 127.53, 50.27, 20], ['Vladivostok', 131.89, 43.12, 20], ['Chabarovka', 135.07, 48.48, 15], ['Nikolaevsk', 140.73, 53.14, 15],
  ['Ochotsk', 143.24, 59.36, 5], ['Ajan', 138.17, 56.45, 1], ['Gizhiga', 160.4, 62.05, 5], ['Petropavlovsk', 158.65, 53.02, 10], ['Aleksandrovsk', 142.16, 50.9, 10], ['Iakutsk', 129.73, 62.03, 25], ['Olekminsk', 120.4, 60.37, 5],
  ['Viliuisk', 121.63, 63.75, 5], ['Verchoiansk', 133.39, 67.55, 5], ['Srednekolymsk', 153.7, 67.45, 5], ['Anadyr', 177.5, 64.73, 1],
  // Persia orientale, Afghanistan, Asia centrale (fase 3)
  ['Teheran', 51.39, 35.69, 60], ['Isfahan', 51.67, 32.65, 55], ['Shiraz', 52.54, 29.61, 50], ['Mashhad', 59.6, 36.3, 50], ['Yazd', 54.37, 31.9, 40], ['Kerman', 57.08, 30.28, 40], ['Kashan', 51.44, 33.98, 30], ['Qom', 50.88, 34.64, 30],
  ['Semnan', 53.39, 35.58, 15], ['Damghan', 54.34, 36.17, 10], ['Sari', 53.06, 36.56, 25], ['Barfurush', 52.68, 36.54, 30], ['Astarabad', 54.43, 36.84, 25], ['Sabzevar', 57.68, 36.21, 20], ['Nishapur', 58.8, 36.21, 25], ['Quchan', 58.51, 37.11, 15],
  ['Bojnurd', 57.33, 37.47, 10], ['Torbat', 59.22, 35.27, 10], ['Birjand', 59.21, 32.87, 15], ['Tabas', 56.92, 33.6, 10], ['Bam', 58.36, 29.1, 15], ['Bandar Abbas', 56.27, 27.18, 20], ['Lar', 54.34, 27.68, 15], ['Bushehr', 50.84, 28.97, 30],
  ['Kazerun', 51.65, 29.62, 15], ['Fasa', 53.65, 28.94, 10], ['Sirjan', 55.68, 29.45, 10], ['Sistan', 61.5, 31.0, 10], ['Bampur', 60.45, 27.19, 10], ['Behbahan', 50.24, 30.6, 15],
  ['Kabul', 69.17, 34.53, 55], ['Kandahar', 65.71, 31.61, 45], ['Herat', 62.2, 34.35, 45], ['Ghazni', 68.42, 33.55, 20], ['Jalalabad', 70.45, 34.43, 20], ['Mazar-i Sharif', 67.11, 36.71, 20], ['Balkh', 66.9, 36.76, 15], ['Tashkurgan', 67.69, 36.7, 20],
  ['Kunduz', 68.86, 36.73, 15], ['Faizabad', 70.58, 37.12, 15], ['Maimana', 64.75, 35.92, 15], ['Farah', 62.12, 32.37, 15], ['Girishk', 64.37, 31.82, 10], ['Bamian', 67.83, 34.82, 10], ['Andkhui', 65.12, 36.95, 10], ['Charikar', 69.17, 35.01, 10], ['Kalat-i Ghilzai', 66.9, 32.1, 10],
  ['Bukhara', 64.42, 39.77, 55], ['Samarcanda', 66.96, 39.65, 50], ['Tashkent', 69.28, 41.31, 55], ['Khiva', 60.36, 41.38, 40], ['Kokand', 70.94, 40.53, 45], ['Namangan', 71.67, 41.0, 30], ['Andigian', 72.34, 40.78, 30], ['Margilan', 71.72, 40.47, 30],
  ['Osh', 72.8, 40.52, 20], ['Khogent', 69.62, 40.28, 30], ['Ura-Tyube', 69.0, 39.92, 15], ['Jizzakh', 67.84, 40.12, 15], ['Karshi', 65.79, 38.86, 25], ['Shahrisabz', 66.83, 39.06, 20], ['Kermine', 65.38, 40.15, 10], ['Chardjui', 63.6, 39.08, 15],
  ['Kerki', 65.21, 37.84, 10], ['Termez', 67.27, 37.22, 5], ['Hissar', 68.55, 38.53, 15], ['Kulob', 69.78, 37.91, 15], ['Garm', 70.37, 39.0, 10], ['Kalai-Khumb', 70.77, 38.45, 5], ['Merv', 61.83, 37.6, 30], ['Geok Tepe', 57.97, 38.15, 20],
  ['Kyzyl-Arvat', 56.27, 39.0, 10], ['Krasnovodsk', 52.97, 40.02, 15], ['Chikishlyar', 53.8, 37.6, 5], ['Petro-Aleksandrovsk', 61.0, 41.55, 10], ['Kungrad', 58.9, 43.07, 10], ['Chimkent', 69.6, 42.32, 20], ['Aulie-Ata', 71.37, 42.9, 15],
  ['Turkestan', 68.25, 43.3, 20], ['Perovsk', 65.5, 44.85, 15], ['Kazalinsk', 62.1, 45.76, 15], ['Verny', 76.93, 43.25, 25], ['Kopal', 79.08, 45.13, 10], ['Pishpek', 74.6, 42.87, 10], ['Tokmak', 75.3, 42.84, 10], ['Karakol', 78.39, 42.49, 10],
  ['Naryn', 75.99, 41.43, 10], ['Semipalatinsk', 80.23, 50.41, 25], ['Ust-Kamenogorsk', 82.61, 49.95, 15], ['Pavlodar', 76.95, 52.29, 10], ['Zaisan', 84.87, 47.47, 10], ['Sergiopol', 80.43, 47.97, 10], ['Karkaralinsk', 75.47, 49.41, 10],
  ['Akmolinsk', 71.43, 51.17, 15], ['Kokchetav', 69.39, 53.28, 10], ['Petropavlovsk', 69.15, 54.87, 25], ['Atbasar', 68.36, 51.81, 10], ['Nikolaevsk', 63.62, 53.21, 10], ['Turgai', 63.5, 49.63, 5], ['Irgiz', 61.27, 48.62, 5], ['Temir', 57.2, 49.14, 5],
  ['Gurev', 51.88, 47.11, 15], ['Uralsk', 51.37, 51.23, 30], ['Forte Aleksandrovsk', 50.27, 44.52, 5], ['Najran', 44.13, 17.49, 10], ['Qunfudha', 41.08, 19.13, 10],
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
  ['Saint-Louis', -16.5, 16.03, 45], ['Dakar', -17.44, 14.69, 35], ['Gorée', -17.4, 14.67, 20], ['Rufisque', -17.27, 14.72, 15], ['Bakel', -12.47, 14.9, 15], ['Podor', -14.96, 16.65, 20], ['Matam', -13.26, 15.66, 15], ['Kaolack', -16.07, 14.15, 15], ['Ziguinchor', -16.27, 12.58, 15], ['Bathurst', -16.58, 13.45, 30], ['Bolama', -15.48, 11.58, 25], ['Cacheu', -16.17, 12.27, 15], ['Bissau', -15.6, 11.86, 20], ['Timbo', -11.83, 10.63, 40], ['Labé', -12.28, 11.32, 25], ['Boké', -14.29, 10.94, 15], ['Freetown', -13.23, 8.48, 40], ['Port Loko', -12.79, 8.77, 15], ['Bonthe', -12.5, 7.53, 15], ['Monrovia', -10.8, 6.3, 40], ['Harper', -7.72, 4.37, 20], ['Buchanan', -10.05, 5.88, 15], ['Grand-Bassam', -3.74, 5.2, 25], ['Assinie', -3.45, 5.17, 15], ['Grand Lahou', -5.02, 5.13, 15], ['Baulé', -5.0, 7.5, 10], ['Man', -7.55, 7.41, 10], ['Odienné', -7.57, 9.51, 15], ['Korhogo', -5.63, 9.46, 15], ['Kissi', -10.1, 9.2, 5],
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
export const AF_DESERT_NAMES = [['Karakum', 59.0, 39.5], ['Kyzylkum', 64.0, 42.5], ['Betpak-Dala', 70.0, 45.5], ['Dasht-e Kavir', 54.5, 34.5], ['Dasht-e Lut', 58.5, 32.0], ['Registan', 65.0, 30.8], ['Dasht-i Margo', 63.0, 30.6], ['Saguia el-Hamra', -12.0, 26.5], ['Río de Oro', -14.8, 23.5], ['Tiris', -12.8, 22.0], ['Mreyé', -6.5, 21.0], ['Tanezruft', 0.0, 23.5], ['Azauad', -2.5, 19.5],
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
export const AF_DETAIL_MODERN = ['EGY', 'SDN', 'SDS', 'ERI', 'ETH', 'DJI', 'SOL', 'SOM',
  // fase 2b: il resto del continente a sud del 27° parallelo
  'MRT', 'SEN', 'GMB', 'GNB', 'GIN', 'SLE', 'LBR', 'CIV', 'GHA', 'TGO', 'BEN', 'BFA', 'MLI', 'NER', 'NGA', 'CMR', 'TCD', 'CAF', 'GAB', 'GNQ', 'COG', 'COD',
  'AGO', 'NAM', 'BWA', 'ZAF', 'LSO', 'SWZ', 'MOZ', 'ZWE', 'ZMB', 'MWI', 'TZA', 'KEN', 'UGA', 'RWA', 'BDI', 'MDG', 'SAH', 'MAR',
  // fase 3: Arabia a sud del 27° parallelo, Persia a est del 50° meridiano, Afghanistan e Asia centrale
  'SAU', 'YEM', 'OMN', 'ARE', 'QAT', 'BHR', 'IRN', 'AFG', 'TKM', 'UZB', 'KAZ', 'KGZ', 'TJK', 'AZE', 'KAB',
  // fase 4: la Russia a est del 50° meridiano, il subcontinente indiano
  'RUS', 'IND', 'PAK', 'BGD', 'NPL', 'BTN', 'LKA', 'KAS',
  // fase 5: Indocina e penisola malese
  'MMR', 'THA', 'LAO', 'KHM', 'VNM', 'MYS', 'SGP'];
/** [regione, lon, lat, paesi moderni ammessi, km² per provincia] */
/** Paesi con regioni piccole: le unità del dataset si dividono in pezzi di questa dimensione (km²) prima di assegnarle. */
export const AF_FINE = { ERI: 6000, PAK: 4000, BGD: 3000, NPL: 3000, LKA: 3000, BTN: 3000, KAS: 4000, IND: 10000 };

/** Deserto percorso dai nomadi, non intransitabile: il Sahara occidentale (spagnolo dal 1884) e la costa mauritana. */
export const AF_STEPPE = { modern: ['SAH'], boxes: [[-17.5, 18.5, -15.2, 21.4], [-17.5, 20.7, -8.6, 27.7]] };

/** Piccoli possedimenti costieri ritagliati come regione a sé (la baia comprata dalla Rubattino, circa 600 km²). */
export const AF_ENCLAVES = [{ name: 'Assab', at: [42.7, 13.0], r: 15 }, { name: 'Dakar e Gorea', at: [-17.33, 14.73], r: 16 }, { name: 'Lagos', at: [3.4, 6.5], r: 22 }, { name: 'Walvis Bay', at: [14.55, -22.95], r: 22 }, { name: 'Aden', at: [45.0, 12.8], r: 12 }];

/**
 * Fase 2b: fattore sulla dimensione delle province per paese (primo paese della regione). Dove la popolazione
 * del 1881 è rada (bacino del Congo, Ubangi, Zambesi, Kalahari) le province sono molto più grandi.
 */
export const AF_DETAIL_SCALE = { COD: 1.7, CAF: 1.7, COG: 1.6, GAB: 1.6, AGO: 1.4, ZMB: 1.6, MWI: 1.3, MOZ: 1.4, NAM: 1.3, BWA: 1.2, TCD: 1.4, MRT: 1.2, MLI: 1.4, NER: 1.4,
  BFA: 1.3, ZWE: 1.5, TZA: 1.5, KEN: 1.5, UGA: 1.3, CMR: 1.4, GIN: 1.3, SLE: 1.2, LBR: 1.3, CIV: 1.4, GHA: 1.3, TGO: 1.2, BEN: 1.2, NGA: 1.4, SEN: 1.3, MDG: 1.4, ZAF: 1.7, IRN: 1.2, AFG: 1.2, TKM: 1.3, SAU: 1.1, OMN: 1.1 };

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
  // Massaua con il Samhar, la baia di Zula e le Dahlak; Sahel, Bogos (Cheren) e Barca egiziani dal 1872; l'altopiano (Mareb Mellash) di ras Alula
  ['Massaua', 39.45, 15.5, ['ERI'], 14000, 'EGY'], ['Sahel', 38.55, 16.9, ['ERI'], 26000, 'EGY'], ['Bogos', 38.45, 15.8, ['ERI'], 18000, 'EGY'], ['Barca', 37.6, 15.8, ['ERI'], 34000, 'EGY'],
  ['Hamasien', 38.9, 15.3, ['ERI'], 9000, 'ETH'], ['Seraè', 38.7, 14.85, ['ERI'], 9000, 'ETH'], ['Acchelè Guzai', 39.4, 14.85, ['ERI'], 8000, 'ETH'],
  ['Zula', 40.0, 15.0, ['ERI'], 9000, 'EGY'], ['Dancalia settentrionale', 41.2, 14.3, ['ERI'], 24000, ''], ['Assab', 42.7, 13.0, ['ERI'], 6000, 'ITA'], ['Beilul', 42.15, 13.2, ['ERI'], 24000, ''], ['Raheita', 43.15, 12.7, ['ERI', 'DJI'], 8000, 'RAH'],
  // Etiopia: i regni dell'impero di Giovanni IV
  ['Tigrè', 39.2, 13.7, ['ETH'], 17000, 'ETH'], ['Semien', 38.2, 13.3, ['ETH'], 17000, 'ETH'], ['Begemder', 37.9, 12.0, ['ETH'], 18000, 'ETH'], ['Gojjam', 37.4, 10.6, ['ETH'], 21000, 'ETH'],
  ['Lasta', 39.1, 12.5, ['ETH'], 16000, 'ETH'], ['Uollo', 39.6, 11.1, ['ETH'], 17000, 'ETH'], ['Scioa', 39.1, 9.5, ['ETH'], 21000, 'ETH'],
  // terre oromo, sidama e somale fuori dall'impero
  ['Beni Shangul', 35.0, 10.6, ['ETH', 'SDN'], 35000, 'EGY'], ['Uallega', 35.9, 9.1, ['ETH'], 31000, ''], ['Illubabor', 35.3, 7.9, ['ETH'], 35000, ''], ['Gambela', 34.3, 8.0, ['ETH', 'SDS'], 42000, ''],
  ['Gimma', 36.9, 7.7, ['ETH'], 25000, ''], ['Caffa', 36.1, 7.1, ['ETH'], 25000, ''], ['Gurage', 38.0, 8.3, ['ETH'], 25000, ''], ['Uolaita', 37.6, 6.8, ['ETH'], 31000, ''], ['Sidamo', 38.6, 6.0, ['ETH'], 35000, ''],
  ['Borana', 38.4, 4.3, ['ETH'], 56000, ''], ['Arussi', 39.5, 7.7, ['ETH'], 31000, ''], ['Bale', 40.6, 6.9, ['ETH'], 42000, ''], ['Harar', 42.1, 9.3, ['ETH', 'SOL'], 14000, 'EGY'], ['Ciercer', 40.9, 8.9, ['ETH'], 22000, ''], ['Giggiga', 43.2, 8.9, ['ETH', 'SOL'], 30000, ''],
  ['Aussa', 41.3, 11.6, ['ETH', 'DJI'], 35000, 'AUS'], ['Dancalia', 40.3, 12.9, ['ETH', 'ERI'], 35000, ''], ['Ogaden', 44.2, 7.2, ['ETH'], 77000, ''], ['Uebi Scebeli', 43.0, 5.5, ['ETH', 'SOM'], 70000, ''],
  // Gibuti e Somalia settentrionale
  ['Obock e Tagiura', 42.7, 11.7, ['DJI'], 25000, 'TAG'], ['Zeila', 43.3, 10.9, ['SOL', 'DJI', 'ETH'], 15000, 'EGY'], ['Berbera', 45.0, 10.1, ['SOL'], 20000, 'EGY'], ['Haud', 45.5, 8.8, ['SOL', 'ETH'], 56000, ''],
  ['Dulbahante', 47.4, 8.7, ['SOL', 'SOM'], 49000, ''], ['Uarsangheli', 47.6, 10.7, ['SOL', 'SOM'], 35000, 'WSG'], ['Migiurtinia', 49.6, 10.2, ['SOM'], 49000, 'MIG'], ['Nogal', 48.6, 8.3, ['SOM'], 49000, ''],
  // Somalia meridionale
  ['Obbia', 48.3, 5.5, ['SOM'], 49000, 'OBB'], ['Mudugh', 47.2, 6.2, ['SOM'], 49000, ''], ['Hiran', 45.4, 4.6, ['SOM', 'ETH'], 42000, ''], ['Benadir', 45.4, 2.3, ['SOM'], 15000, 'ZAN'],
  ['Basso Scebeli', 44.3, 1.6, ['SOM'], 18000], ['Bai', 43.6, 2.8, ['SOM'], 35000, ''], ['Lugh', 42.3, 3.6, ['SOM', 'ETH'], 42000, ''], ['Oltregiuba', 41.8, -0.2, ['SOM'], 42000],
  // ===== Fase 2b: il resto del continente (1881) =====
  // Sahara occidentale: terre dei Reguibat e degli Ulad Delim, costa di Río de Oro (Villa Cisneros spagnola dal 1884)
  ['Saguia el-Hamra', -12.3, 26.6, ['SAH', 'MAR'], 90000, ''], ['Río de Oro', -15.4, 23.4, ['SAH', 'MAR'], 80000, ''], ['Tiris', -13.0, 22.6, ['SAH', 'MAR'], 90000, ''],
  ['Capo Bianco', -16.3, 20.2, ['MRT'], 40000, ''],
  // Mauritania: gli emirati mauri
  ['Trarza', -15.3, 17.6, ['MRT'], 60000, ''], ['Brakna', -13.6, 17.3, ['MRT'], 55000, ''], ['Tagant', -11.4, 18.4, ['MRT'], 90000, ''], ['Adrar mauro', -12.8, 20.6, ['MRT'], 150000, ''],
  ['Assaba', -11.6, 16.6, ['MRT'], 45000, ''], ['Guidimaka', -12.0, 15.3, ['MRT'], 25000, ''], ['Hodh', -8.0, 16.5, ['MRT', 'MLI'], 90000, ''],
  // Senegambia
  ['Walo', -15.9, 16.2, ['SEN'], 9000, 'FRA'], ['Dakar e Gorea', -17.33, 14.73, ['SEN'], 2000, 'FRA'], ['Cayor', -16.5, 15.3, ['SEN'], 14000, ''], ['Baol', -16.2, 14.7, ['SEN'], 11000, ''],
  ['Sine-Saloum', -16.0, 13.9, ['SEN'], 16000, ''], ['Djolof', -15.2, 15.3, ['SEN'], 20000, ''], ['Futa Toro', -13.8, 16.0, ['SEN'], 22000, 'FTO'], ['Bundu', -12.5, 14.3, ['SEN'], 25000, ''],
  ['Niani', -14.0, 13.6, ['SEN'], 25000, ''], ['Casamance', -15.6, 12.8, ['SEN'], 20000, ''], ['Gambia', -15.5, 13.45, ['GMB'], 12000, 'GBR'], ['Guinea portoghese', -15.3, 11.9, ['GNB'], 18000, 'POR'],
  // Guinea, Sierra Leone, Liberia
  ['Futa Gialon', -12.2, 11.2, ['GIN'], 30000, 'FJA'], ['Fiumi del Sud', -14.0, 10.3, ['GIN'], 20000, ''], ['Alta Guinea', -9.4, 10.6, ['GIN'], 35000, 'WAS'], ['Guinea forestale', -9.0, 8.5, ['GIN'], 30000, ''],
  ['Freetown', -13.1, 8.4, ['SLE'], 5000, 'GBR'], ['Sherbro', -12.3, 7.5, ['SLE'], 15000, ''], ['Paese temne', -12.2, 9.0, ['SLE'], 22000, ''], ['Paese mende', -11.2, 8.0, ['SLE'], 22000, ''],
  ['Monrovia', -10.6, 6.5, ['LBR'], 15000, 'LIB'], ['Costa del Grano', -8.8, 5.2, ['LBR'], 20000, 'LIB'], ['Liberia interna', -9.5, 7.3, ['LBR'], 40000, ''],
  // Costa d'Avorio, Costa d'Oro, Togo, Dahomey
  ['Grand-Bassam', -3.6, 5.6, ['CIV'], 18000, 'FRA'], ['Costa d\'Avorio occidentale', -6.6, 5.6, ['CIV'], 35000, ''], ['Paese baulé', -5.0, 7.3, ['CIV'], 40000, ''], ['Kong', -4.3, 9.1, ['CIV', 'BFA'], 35000, 'KNG'],
  ['Kabadugu', -7.4, 9.5, ['CIV', 'GIN'], 30000, 'WAS'], ['Paese dan', -7.6, 7.4, ['CIV'], 30000, ''], ['Gyaman', -3.0, 8.0, ['CIV', 'GHA'], 25000, ''],
  ['Costa d\'Oro', -1.3, 5.4, ['GHA'], 10000, 'GBR'], ['Accra', -0.2, 5.8, ['GHA'], 9000, 'GBR'], ['Ascianti', -1.7, 6.7, ['GHA'], 20000, 'ASA'], ['Brong', -1.8, 7.8, ['GHA'], 25000, ''],
  ['Paese ewe', 0.6, 6.8, ['GHA', 'TGO'], 15000, ''], ['Gonja', -1.5, 9.0, ['GHA'], 30000, ''], ['Dagomba', -0.2, 9.6, ['GHA', 'TGO'], 25000, ''], ['Mamprusi', -0.6, 10.6, ['GHA', 'BFA'], 22000, ''],
  ['Togo', 1.1, 7.6, ['TGO'], 18000, ''], ['Togo settentrionale', 1.0, 9.8, ['TGO'], 25000, ''],
  ['Dahomey', 2.1, 7.1, ['BEN'], 15000, 'DAH'], ['Porto Novo', 2.6, 6.6, ['BEN'], 4000, 'FRA'], ['Borgu', 2.9, 10.2, ['BEN', 'NGA'], 35000, 'BRG'], ['Atakora', 1.5, 10.6, ['BEN', 'TGO'], 25000, ''],
  // Alto Volta, Sudan occidentale, Niger
  ['Uagadugu', -1.4, 12.3, ['BFA'], 22000, 'MOS'], ['Yatenga', -2.4, 13.6, ['BFA', 'MLI'], 20000, 'MOS'], ['Tenkodogo', -0.4, 11.7, ['BFA'], 15000, 'MOS'], ['Gurma', 0.6, 12.2, ['BFA', 'NER'], 35000, ''],
  ['Liptako', -0.2, 14.1, ['BFA', 'NER'], 30000, ''], ['Bobo-Dioulasso', -4.3, 11.3, ['BFA', 'MLI'], 30000, ''], ['Paese lobi', -3.2, 10.2, ['BFA', 'CIV', 'GHA'], 25000, ''], ['Paese gurunsi', -2.3, 11.5, ['BFA'], 25000, ''],
  ['Kaarta', -9.5, 14.8, ['MLI'], 40000, 'TUK'], ['Segù', -6.3, 13.4, ['MLI'], 35000, 'TUK'], ['Macina', -4.5, 14.3, ['MLI'], 35000, 'TUK'], ['Bambuk', -11.2, 13.4, ['MLI', 'SEN'], 30000, ''],
  ['Alto Senegal', -10.9, 14.2, ['MLI'], 15000, 'FRA'], ['Beledugu', -7.8, 12.9, ['MLI'], 30000, ''], ['Uassulu', -8.2, 11.4, ['MLI', 'GIN'], 30000, 'WAS'], ['Kenedugu', -5.6, 11.4, ['MLI'], 25000, ''],
  ['Timbuctù', -3.2, 16.5, ['MLI'], 60000, ''], ['Gao', -0.2, 16.0, ['MLI', 'NER'], 60000, ''], ['Hombori', -1.7, 15.2, ['MLI', 'BFA'], 40000, ''], ['Adrar degli Ifoghas', 1.4, 19.0, ['MLI'], 120000, ''],
  ['Damagaram', 9.0, 13.9, ['NER'], 30000, 'DMG'], ['Maradi', 7.2, 13.5, ['NER'], 25000, ''], ['Gobir', 5.6, 13.9, ['NER'], 30000, ''], ['Adar', 5.3, 15.2, ['NER'], 40000, ''],
  ['Zarma', 3.2, 13.2, ['NER'], 30000, ''], ['Say', 2.3, 13.2, ['NER'], 25000, ''], ['Aïr', 8.0, 17.5, ['NER'], 120000, ''], ['Manga', 11.5, 14.0, ['NER'], 50000, 'BOR'],
  // Nigeria: gli emirati del califfato di Sokoto, il Bornu, i Yoruba, il delta
  ['Sokoto', 5.3, 13.0, ['NGA'], 22000, 'SOK'], ['Gando', 4.3, 12.2, ['NGA'], 25000, 'SOK'], ['Katsina', 7.6, 12.6, ['NGA'], 18000, 'SOK'], ['Kano', 8.6, 11.9, ['NGA'], 16000, 'SOK'],
  ['Katagum', 10.0, 12.3, ['NGA'], 22000, 'SOK'], ['Zaria', 7.8, 10.6, ['NGA'], 25000, 'SOK'], ['Bauchi', 9.8, 10.4, ['NGA'], 25000, 'SOK'], ['Gombe', 11.2, 10.3, ['NGA'], 20000, 'SOK'],
  ['Adamaua', 12.4, 9.3, ['NGA', 'CMR'], 30000, 'SOK'], ['Muri', 10.8, 8.8, ['NGA'], 25000, 'SOK'], ['Nupe', 6.0, 9.2, ['NGA'], 22000, 'SOK'], ['Kontagora', 5.4, 10.4, ['NGA'], 25000, 'SOK'],
  ['Ilorin', 4.6, 8.6, ['NGA'], 14000, 'SOK'], ['Nasarawa', 7.9, 8.8, ['NGA'], 20000, 'SOK'], ['Bornu', 13.2, 12.0, ['NGA', 'NER', 'TCD', 'CMR'], 30000, 'BOR'],
  ['Lagos', 3.4, 6.5, ['NGA'], 2000, 'GBR'], ['Egba', 3.3, 7.1, ['NGA'], 11000, ''], ['Ijebu', 4.0, 6.8, ['NGA'], 8000, ''], ['Ibadan', 3.9, 7.5, ['NGA'], 14000, 'YOR'], ['Oyo', 3.9, 8.2, ['NGA'], 15000, 'YOR'],
  ['Ekiti e Ilesha', 5.0, 7.6, ['NGA'], 14000, ''], ['Benin', 5.8, 6.4, ['NGA'], 16000, 'BNN'], ['Delta del Niger', 6.3, 5.0, ['NGA'], 14000, ''], ['Calabar', 8.3, 5.1, ['NGA'], 12000, ''],
  ['Paese igbo', 7.3, 5.8, ['NGA'], 14000, 'ARO'], ['Igala', 6.9, 7.4, ['NGA'], 15000, ''], ['Paese tiv', 9.0, 7.3, ['NGA'], 20000, ''], ['Altopiano di Jos', 9.1, 9.5, ['NGA'], 25000, ''],
  // Camerun, Ciad, Ubangi
  ['Duala', 9.8, 4.2, ['CMR'], 15000, ''], ['Camerun meridionale', 11.5, 3.0, ['CMR'], 50000, ''], ['Grassfields', 10.4, 5.9, ['CMR'], 25000, ''], ['Ngaundere', 13.6, 7.2, ['CMR'], 40000, 'SOK'],
  ['Garua', 13.4, 9.3, ['CMR'], 35000, 'SOK'], ['Mandara', 14.0, 10.9, ['CMR'], 20000, ''], ['Camerun orientale', 14.3, 4.3, ['CMR'], 60000, ''],
  ['Kanem', 15.3, 14.4, ['TCD'], 50000, ''], ['Bagirmi', 16.6, 11.3, ['TCD'], 40000, ''], ['Uadai', 20.8, 13.6, ['TCD'], 40000, 'WAD'], ['Batha', 18.5, 13.3, ['TCD'], 50000, 'WAD'],
  ['Salamat', 19.8, 10.9, ['TCD'], 45000, 'WAD'], ['Paese sara', 17.0, 8.8, ['TCD', 'CAF'], 40000, ''], ['Logone', 15.5, 9.8, ['TCD', 'CMR'], 30000, ''],
  ['Borcu', 18.5, 18.0, ['TCD'], 150000, ''], ['Ennedi', 22.0, 17.0, ['TCD'], 120000, ''], ['Tibesti', 17.5, 21.0, ['TCD'], 150000, ''],
  ['Dar Kuti', 20.6, 8.4, ['CAF'], 60000], ['Ubangi', 18.6, 4.4, ['CAF'], 50000, ''], ['Paese zande', 24.5, 5.5, ['CAF'], 60000, ''], ['Sanga', 16.0, 4.5, ['CAF'], 50000, ''],
  ['Alto Kotto', 22.0, 6.5, ['CAF'], 60000, ''], ['Ouham', 17.4, 7.0, ['CAF'], 50000, ''],
  // Gabon, Congo, Guinea spagnola
  ['Gabon', 9.7, 0.3, ['GAB'], 15000, 'FRA'], ['Ogowè', 10.6, -1.0, ['GAB'], 40000, ''], ['Gabon interno', 12.5, 0.0, ['GAB'], 60000, ''], ['Fernando Po', 8.7, 3.5, ['GNQ'], 3000, 'SPA'], ['Rio Muni', 10.3, 1.6, ['GNQ'], 25000, ''],
  ['Loango', 12.0, -4.3, ['COG'], 30000, ''], ['Niari', 13.5, -3.8, ['COG'], 30000, ''], ['Paese teke', 15.5, -3.0, ['COG'], 40000, 'TEK'], ['Congo settentrionale', 16.3, 1.0, ['COG'], 70000, ''],
  ['Basso Congo', 14.3, -5.4, ['COD'], 20000, ''], ['Kwango', 17.6, -6.8, ['COD'], 50000, 'YAK'], ['Kwilu', 18.8, -4.8, ['COD'], 45000, ''], ['Paese kuba', 21.8, -5.0, ['COD'], 45000, 'KUB'],
  ['Lulua', 22.5, -6.5, ['COD'], 40000, ''], ['Paese luba', 25.0, -7.8, ['COD'], 50000, 'LUB'], ['Lunda', 22.6, -8.7, ['COD'], 50000, 'LUN'], ['Katanga', 27.0, -10.5, ['COD'], 60000, 'YEK'],
  ['Urua', 27.5, -7.0, ['COD'], 50000, ''], ['Manyema', 26.3, -4.0, ['COD'], 45000, 'UTE'], ['Kivu', 28.5, -2.0, ['COD'], 40000, ''], ['Ituri', 29.6, 1.6, ['COD'], 55000, ''],
  ['Uele', 26.5, 3.6, ['COD'], 70000, ''], ['Mongala', 21.5, 2.5, ['COD'], 70000, ''], ['Equatore', 19.0, 0.0, ['COD'], 80000, ''], ['Lualaba', 25.0, 0.5, ['COD'], 80000, ''],
  ['Sankuru', 23.6, -3.0, ['COD'], 60000, ''], ['Lago Leopoldo', 18.3, -2.5, ['COD'], 70000, ''],
  // Angola, Africa del Sud-Ovest, Bechuana
  ['Luanda', 13.5, -9.2, ['AGO'], 20000, 'POR'], ['Ambriz', 13.6, -7.8, ['AGO'], 20000, 'POR'], ['Regno del Congo', 14.6, -6.5, ['AGO'], 30000, 'KGO'], ['Cabinda', 12.3, -5.0, ['AGO'], 7000, ''],
  ['Benguela', 13.7, -12.6, ['AGO'], 25000, 'POR'], ['Moçâmedes', 12.6, -15.2, ['AGO'], 35000, 'POR'], ['Pungo Andongo', 15.6, -9.8, ['AGO'], 25000, 'POR'], ['Cassange', 17.6, -9.3, ['AGO'], 40000, ''],
  ['Bailundo', 15.8, -12.3, ['AGO'], 30000, 'OVI'], ['Bié', 17.2, -12.4, ['AGO'], 35000, 'OVI'], ['Huíla', 14.8, -15.0, ['AGO'], 40000, ''], ['Cuanhama', 15.8, -17.0, ['AGO'], 40000, ''],
  ['Lunda angolana', 20.5, -8.8, ['AGO'], 60000, 'LUN'], ['Moxico', 21.0, -12.5, ['AGO'], 80000, ''], ['Cuando-Cubango', 19.5, -15.8, ['AGO'], 100000, ''],
  ['Ovamboland', 16.0, -17.9, ['NAM'], 50000, ''], ['Kaokoveld', 13.5, -18.8, ['NAM'], 100000, ''], ['Damaraland', 16.8, -21.3, ['NAM'], 120000, ''], ['Walvis Bay', 14.55, -22.95, ['NAM'], 2000, 'GBR'],
  ['Namaqualand', 17.5, -26.0, ['NAM'], 150000, ''], ['Gobabis', 19.5, -22.5, ['NAM'], 120000, ''], ['Okavango', 20.5, -18.2, ['NAM', 'BWA'], 80000, ''],
  ['Bamangwato', 26.5, -22.3, ['BWA'], 80000, 'NGW'], ['Bakwena', 25.5, -24.5, ['BWA'], 60000, ''], ['Ngami', 22.7, -19.8, ['BWA'], 100000, ''], ['Kalahari', 22.3, -23.8, ['BWA'], 150000, ''],
  // Sudafrica: la colonia del Capo, il Natal, le repubbliche boere
  ['Capo', 18.9, -33.8, ['ZAF'], 12000, 'GBR'], ['Capo meridionale', 21.0, -34.0, ['ZAF'], 25000, 'GBR'], ['Karoo', 21.8, -32.3, ['ZAF'], 60000, 'GBR'], ['Namaqualand del Capo', 18.3, -29.8, ['ZAF'], 60000, 'GBR'],
  ['Port Elizabeth', 25.0, -33.6, ['ZAF'], 20000, 'GBR'], ['Graaff-Reinet', 24.5, -32.0, ['ZAF'], 30000, 'GBR'], ['Kaffraria', 27.4, -32.6, ['ZAF'], 18000, 'GBR'], ['Transkei', 28.5, -31.7, ['ZAF'], 15000, 'GBR'],
  ['Pondoland', 29.4, -31.3, ['ZAF'], 10000, ''], ['Griqualand Est', 29.4, -30.4, ['ZAF'], 12000, 'GBR'], ['Natal', 30.4, -29.4, ['ZAF'], 18000, 'GBR'], ['Zululand', 31.6, -28.2, ['ZAF'], 15000, 'ZUL'],
  ['Griqualand Ovest', 24.0, -28.6, ['ZAF'], 40000, 'GBR'], ['Colesberg', 25.0, -30.6, ['ZAF'], 30000, 'GBR'], ['Bechuana meridionali', 23.8, -26.6, ['ZAF'], 60000, ''], ['Kalahari del Capo', 21.0, -28.0, ['ZAF'], 100000, ''],
  ['Bloemfontein', 26.0, -29.0, ['ZAF'], 30000, 'OFS'], ['Kroonstad', 27.3, -27.6, ['ZAF'], 30000, 'OFS'], ['Harrismith', 28.9, -28.3, ['ZAF'], 15000, 'OFS'],
  ['Pretoria', 28.2, -25.7, ['ZAF'], 25000, 'TRA'], ['Potchefstroom', 26.8, -26.6, ['ZAF'], 30000, 'TRA'], ['Lydenburg', 30.4, -25.0, ['ZAF'], 25000, 'TRA'], ['Zoutpansberg', 29.8, -23.2, ['ZAF'], 40000, 'TRA'],
  ['Waterberg', 28.0, -24.0, ['ZAF'], 35000, 'TRA'], ['Wakkerstroom', 30.1, -27.2, ['ZAF'], 15000, 'TRA'],
  ['Basutoland', 28.2, -29.5, ['LSO'], 30000, 'GBR'], ['Swaziland', 31.5, -26.5, ['SWZ'], 20000, 'SWZ'],
  // Mozambico, Zambesi, Nyasa
  ['Lourenço Marques', 32.6, -25.8, ['MOZ'], 15000, 'POR'], ['Gaza', 33.2, -23.6, ['MOZ'], 60000, ''], ['Inhambane', 34.9, -23.5, ['MOZ'], 25000, 'POR'], ['Sofala', 34.6, -19.9, ['MOZ'], 35000, 'POR'],
  ['Manica', 33.3, -19.0, ['MOZ', 'ZWE'], 40000, ''], ['Zambesia', 36.5, -17.5, ['MOZ'], 40000, 'POR'], ['Tete', 33.0, -15.8, ['MOZ'], 50000, 'POR'], ['Mozambico', 40.0, -15.0, ['MOZ'], 25000, 'POR'],
  ['Paese macua', 38.5, -14.5, ['MOZ'], 40000, ''], ['Niassa', 36.0, -13.0, ['MOZ'], 60000, ''], ['Capo Delgado', 39.8, -12.3, ['MOZ'], 30000],
  ['Matabeleland', 28.5, -20.0, ['ZWE'], 60000, 'NDE'], ['Mashonaland', 31.0, -17.6, ['ZWE'], 60000, ''], ['Mashonaland meridionale', 31.0, -20.5, ['ZWE'], 50000, ''],
  ['Barotseland', 23.3, -15.5, ['ZMB'], 70000, 'LOZ'], ['Kafue', 26.8, -15.5, ['ZMB'], 70000, ''], ['Paese tonga', 27.3, -17.0, ['ZMB'], 40000, ''], ['Paese bemba', 31.0, -10.5, ['ZMB'], 60000, ''],
  ['Kazembe', 28.9, -9.8, ['ZMB'], 50000, ''], ['Luangwa', 32.0, -12.8, ['ZMB'], 60000, ''], ['Zambesi superiore', 25.0, -12.5, ['ZMB'], 70000, ''],
  ['Nyasa settentrionale', 33.9, -10.8, ['MWI'], 30000, ''], ['Nyasa centrale', 33.8, -13.5, ['MWI'], 25000, ''], ['Shire', 35.0, -15.5, ['MWI'], 20000, ''],
  // Africa orientale: la costa di Zanzibar, l'interno, i Grandi Laghi
  ['Zanzibar', 39.4, -5.7, ['TZA'], 3000, 'ZAN'], ['Mrima', 38.9, -6.4, ['TZA'], 15000, 'ZAN'], ['Tanga', 38.9, -5.0, ['TZA'], 12000, 'ZAN'], ['Kilwa', 39.2, -9.0, ['TZA'], 20000, 'ZAN'],
  ['Lindi', 39.5, -10.3, ['TZA'], 20000, 'ZAN'], ['Usambara', 38.3, -4.8, ['TZA'], 15000, ''], ['Kilimangiaro', 37.4, -3.4, ['TZA', 'KEN'], 20000, ''], ['Paese masai', 36.5, -4.5, ['TZA', 'KEN'], 60000, ''],
  ['Usukuma', 33.3, -3.0, ['TZA'], 35000, ''], ['Unyamwezi', 32.8, -5.0, ['TZA'], 40000, 'MIR'], ['Ugogo', 35.8, -6.0, ['TZA'], 35000, ''], ['Uhehe', 35.5, -8.2, ['TZA'], 40000, ''],
  ['Songea', 35.6, -10.7, ['TZA'], 40000, 'NGO'], ['Ufipa', 31.5, -8.0, ['TZA'], 40000, ''], ['Ujiji', 30.2, -4.8, ['TZA'], 35000, ''], ['Karagwe', 31.1, -1.8, ['TZA'], 25000, ''],
  ['Usagara', 37.0, -6.8, ['TZA'], 25000, ''], ['Mahenge', 37.0, -9.5, ['TZA'], 40000, ''], ['Ruvuma', 38.0, -10.8, ['TZA'], 40000, ''],
  ['Mombasa', 39.5, -3.9, ['KEN'], 12000, 'ZAN'], ['Malindi e Lamu', 40.3, -2.6, ['KEN'], 20000, 'ZAN'], ['Teita', 38.4, -3.4, ['KEN'], 25000, ''], ['Ukambani', 37.8, -1.5, ['KEN'], 25000, ''],
  ['Paese kikuyu', 36.9, -0.6, ['KEN'], 15000, ''], ['Kavirondo', 34.7, 0.0, ['KEN'], 15000, ''], ['Samburu', 37.2, 1.5, ['KEN'], 70000, ''], ['Turkana', 35.5, 3.2, ['KEN'], 80000, ''],
  ['Mandera', 40.5, 2.5, ['KEN'], 100000, ''], ['Tana', 39.5, -0.5, ['KEN'], 60000, ''],
  ['Buganda', 32.2, 0.3, ['UGA'], 15000, 'BUG'], ['Bunyoro', 31.4, 1.6, ['UGA'], 18000, 'BUN'], ['Busoga', 33.4, 0.8, ['UGA'], 10000, ''], ['Ankole', 30.6, -0.6, ['UGA'], 15000, ''],
  ['Toro', 30.3, 0.7, ['UGA'], 12000, ''], ['Acioli', 32.4, 3.0, ['UGA'], 30000, ''], ['Lango', 33.0, 2.0, ['UGA'], 20000, ''], ['Karamoja', 34.3, 2.8, ['UGA'], 25000, ''], ['Bugisu', 34.2, 1.2, ['UGA'], 12000, ''],
  ['Ruanda', 29.9, -2.0, ['RWA'], 26000, 'RWA'], ['Burundi', 29.9, -3.4, ['BDI'], 28000, 'BDI'],
  // Madagascar: il regno merina e i popoli indipendenti
  ['Imerina', 47.5, -18.9, ['MDG'], 25000, 'MAD'], ['Betsileo', 47.0, -21.2, ['MDG'], 30000, 'MAD'], ['Costa orientale', 49.0, -18.0, ['MDG'], 35000, 'MAD'], ['Antsihanaka', 48.4, -17.2, ['MDG'], 25000, 'MAD'],
  ['Boina', 46.5, -16.2, ['MDG'], 40000, 'MAD'], ['Antankara', 49.2, -13.2, ['MDG'], 25000, 'MAD'], ['Fort-Dauphin', 46.9, -24.6, ['MDG'], 20000, 'MAD'], ['Costa sud-orientale', 47.8, -22.5, ['MDG'], 25000, 'MAD'],
  ['Menabe', 44.5, -19.8, ['MDG'], 50000, ''], ['Bara', 45.5, -22.6, ['MDG'], 50000, ''], ['Paese antandroy', 45.6, -24.8, ['MDG'], 35000, ''], ['Tuléar', 43.9, -23.0, ['MDG'], 35000, ''],
  ['Sakalava settentrionali', 47.8, -14.7, ['MDG'], 30000, ''],
  // ===== Fase 3: Arabia meridionale, Persia orientale, Afghanistan, Asia centrale (1881) =====
  // Arabia: Hegiaz e Asir ottomani, il Neged dei Rashidi (Gebel Shammar), al-Hasa ottomano, l'Oman, la costa della Tregua, lo Yemen
  // Hegiaz ottomano: le città sante, la costa, Taif; l'interno oltre le montagne è delle tribù beduine
  ['Medina', 39.5, 24.5, ['SAU'], 55000, 'TUR'], ['Yanbu', 38.3, 24.4, ['SAU'], 45000, 'TUR'], ['La Mecca', 39.8, 21.5, ['SAU'], 40000, 'TUR'], ['Gedda', 39.17, 21.6, ['SAU'], 15000, 'TUR'], ['Taif', 40.5, 21.0, ['SAU'], 35000, 'TUR'],
  ['Paese degli Harb', 41.3, 24.4, ['SAU'], 50000, ''], ['Paese degli Utaiba', 42.4, 22.5, ['SAU'], 60000, ''], ['Asir', 42.6, 18.4, ['SAU'], 35000, 'TUR'],
  ['Tihama dell\'Asir', 42.4, 17.2, ['SAU'], 15000, 'TUR'], ['Bisha', 42.7, 20.0, ['SAU'], 50000, ''], ['Najran', 44.2, 17.6, ['SAU', 'YEM'], 40000, ''],
  ['Qasim', 43.9, 26.2, ['SAU'], 35000, 'NJD'], ['Sudair', 45.5, 25.6, ['SAU'], 35000, 'NJD'], ['Riad', 46.7, 24.6, ['SAU'], 40000, 'NJD'], ['Kharj', 47.4, 23.9, ['SAU'], 45000, 'NJD'],
  ['Aflag', 46.0, 22.3, ['SAU'], 60000, 'NJD'], ['Uadi Dauasir', 45.0, 20.5, ['SAU'], 80000, 'NJD'], ['Hofuf', 49.5, 25.3, ['SAU'], 60000, 'TUR'], ['Qatif', 49.9, 26.5, ['SAU'], 20000, 'TUR'], ['Summan', 47.8, 25.6, ['SAU'], 60000, ''],
  ['Qatar', 51.2, 25.3, ['QAT'], 12000, 'QAT'], ['Midian', 35.6, 27.6, ['SAU'], 20000, 'EGY'], ['Taima', 38.5, 27.6, ['SAU'], 40000, 'ARA'], ['Khaibar', 39.3, 25.7, ['SAU'], 30000, 'ARA'], ['Bahrein', 50.55, 26.0, ['BHR'], 1000, 'BHR'],
  ['Abu Dhabi', 54.0, 23.8, ['ARE'], 45000, 'TRU'], ['Dubai e Sharja', 55.6, 25.2, ['ARE'], 8000, 'TRU'], ['Ras al-Khaima', 56.0, 25.7, ['ARE'], 5000, 'TRU'],
  ['Mascate', 58.5, 23.4, ['OMN'], 15000, 'OMA'], ['Batina', 56.9, 24.2, ['OMN', 'ARE'], 12000, 'OMA'], ['Oman interno', 57.5, 22.6, ['OMN'], 30000, 'OMA'], ['Sur e Jaalan', 59.1, 22.0, ['OMN'], 25000, 'OMA'],
  ['Musandam', 56.2, 26.1, ['OMN'], 3000, 'OMA'], ['Dhofar', 54.0, 17.4, ['OMN'], 40000, 'OMA'], ['Uosta', 56.5, 19.8, ['OMN'], 90000, ''],
  ['Sana', 44.2, 15.4, ['YEM'], 20000, 'TUR'], ['Luhayya', 42.7, 15.7, ['YEM'], 15000, 'TUR'], ['Saada', 43.8, 16.9, ['YEM'], 25000, ''], ['Hodeida', 43.1, 15.0, ['YEM'], 12000, 'TUR'], ['Taizz', 44.0, 13.6, ['YEM'], 10000, 'TUR'],
  ['Ibb', 44.3, 14.1, ['YEM'], 8000, 'TUR'], ['Dhamar', 44.5, 14.7, ['YEM'], 8000, 'TUR'], ['Marib', 45.6, 15.6, ['YEM'], 30000, ''], ['Aden', 45.0, 12.8, ['YEM'], 500, 'GBR'],
  ['Lahej', 44.9, 13.2, ['YEM'], 15000, ''], ['Bayda', 45.6, 13.9, ['YEM'], 15000, ''], ['Shabwa', 47.0, 14.8, ['YEM'], 35000, ''], ['Hadramaut', 48.8, 15.9, ['YEM'], 30000, ''],
  ['Mukalla', 49.0, 14.6, ['YEM'], 15000, ''], ['Mahra', 51.5, 16.5, ['YEM'], 40000, ''], ['Socotra', 53.9, 12.5, ['YEM'], 4000, ''],
  // Persia a est del 50° meridiano: le province dello scià
  ['Teheran', 51.4, 35.6, ['IRN'], 15000, 'PER'], ['Qom', 50.9, 34.6, ['IRN'], 15000, 'PER'], ['Kashan', 51.5, 33.8, ['IRN'], 18000, 'PER'], ['Isfahan', 51.7, 32.6, ['IRN'], 25000, 'PER'],
  ['Mazanderan', 52.6, 36.4, ['IRN'], 15000, 'PER'], ['Astarabad', 54.6, 37.0, ['IRN'], 18000, 'PER'], ['Semnan e Damghan', 53.9, 35.8, ['IRN'], 30000, 'PER'],
  ['Mashhad', 59.4, 36.4, ['IRN'], 20000, 'PER'], ['Nishapur', 58.6, 36.0, ['IRN'], 18000, 'PER'], ['Sabzevar', 57.5, 36.2, ['IRN'], 18000, 'PER'], ['Quchan e Bojnurd', 57.6, 37.4, ['IRN'], 20000, 'PER'],
  ['Torbat', 59.5, 35.0, ['IRN'], 25000, 'PER'], ['Qaenat', 59.0, 33.2, ['IRN'], 40000, 'PER'], ['Tabas', 56.9, 33.6, ['IRN'], 50000, 'PER'], ['Sistan', 61.5, 30.9, ['IRN'], 25000, 'PER'],
  ['Yazd', 54.5, 31.8, ['IRN'], 40000, 'PER'], ['Kerman', 57.0, 30.0, ['IRN'], 40000, 'PER'], ['Bam e Narmashir', 58.6, 29.0, ['IRN'], 35000, 'PER'], ['Belucistan persiano', 61.0, 27.0, ['IRN'], 60000, 'PER'],
  ['Shiraz', 52.6, 29.6, ['IRN'], 25000, 'PER'], ['Kazerun', 51.5, 29.8, ['IRN'], 15000, 'PER'], ['Bushehr', 51.0, 28.8, ['IRN'], 15000, 'PER'], ['Kuhgiluyeh', 50.7, 30.8, ['IRN'], 18000, 'PER'],
  ['Fasa e Darab', 54.0, 28.8, ['IRN'], 25000, 'PER'], ['Laristan', 54.0, 27.6, ['IRN'], 30000, 'PER'], ['Bandar Abbas', 56.6, 27.4, ['IRN'], 25000, 'PER'], ['Sirjan', 55.7, 29.4, ['IRN'], 25000, 'PER'],
  // Afghanistan dell'emiro Abdur Rahman (Kandahar inglese fino all'aprile 1881); Maimana e il Kafiristan indipendenti
  ['Kabul', 69.0, 34.6, ['AFG'], 20000, 'AFG'], ['Jalalabad', 70.6, 34.5, ['AFG'], 12000, 'AFG'], ['Ghazni', 68.2, 33.3, ['AFG'], 30000, 'AFG'], ['Kandahar', 65.6, 31.5, ['AFG'], 40000, 'AFG'],
  ['Herat', 62.3, 34.4, ['AFG'], 35000, 'AFG'], ['Farah', 62.0, 32.3, ['AFG'], 50000, 'AFG'], ['Helmand', 64.0, 30.4, ['AFG'], 60000, 'AFG'], ['Hazarajat', 66.6, 34.2, ['AFG'], 45000, 'AFG'],
  ['Balkh', 67.0, 36.6, ['AFG'], 30000, 'AFG'], ['Maimana', 64.8, 35.9, ['AFG'], 25000, ''], ['Kunduz', 68.9, 36.6, ['AFG'], 25000, 'AFG'], ['Badakhshan', 70.9, 37.0, ['AFG'], 35000, 'AFG'],
  ['Kafiristan', 70.9, 35.4, ['AFG'], 15000, ''], ['Wakhan', 73.0, 37.0, ['AFG'], 12000, 'AFG'],
  // Turkestan russo, khanati di Bukhara e Khiva (protettorati russi dal 1873), Turkmeni liberi
  ['Krasnovodsk', 53.8, 40.3, ['TKM'], 50000, 'RUS'], ['Atrek', 55.0, 37.9, ['TKM'], 20000, ''], ['Akhal', 57.8, 38.5, ['TKM'], 30000, ''], ['Merv', 61.8, 37.4, ['TKM'], 40000, ''],
  ['Chardjui', 63.5, 39.2, ['TKM'], 25000, 'BUK'], ['Kerki', 65.0, 37.8, ['TKM'], 15000, 'BUK'], ['Tashauz', 59.5, 41.8, ['TKM'], 20000, 'KHI'],
  ['Khiva', 60.4, 41.4, ['UZB'], 20000, 'KHI'], ['Kungrad', 58.9, 43.1, ['UZB'], 35000, 'KHI'], ['Amu Darya', 61.6, 42.3, ['UZB'], 50000, 'RUS'], ['Ustyurt', 56.5, 43.7, ['UZB', 'KAZ'], 100000, 'RUS'],
  ['Bukhara', 64.3, 39.8, ['UZB'], 20000, 'BUK'], ['Karshi', 65.8, 38.8, ['UZB'], 20000, 'BUK'], ['Shahrisabz', 66.9, 39.0, ['UZB'], 12000, 'BUK'], ['Surkhan', 67.5, 37.9, ['UZB'], 20000, 'BUK'],
  ['Samarcanda', 67.0, 39.7, ['UZB'], 15000, 'RUS'], ['Jizzakh', 67.9, 40.3, ['UZB'], 15000, 'RUS'], ['Tashkent', 69.4, 41.3, ['UZB'], 15000, 'RUS'],
  ['Kokand', 70.8, 40.5, ['UZB'], 8000, 'RUS'], ['Namangan', 71.6, 41.0, ['UZB'], 8000, 'RUS'], ['Andigian', 72.3, 40.8, ['UZB'], 8000, 'RUS'],
  ['Khogent', 69.4, 40.1, ['TJK'], 12000, 'RUS'], ['Hissar', 68.6, 38.6, ['TJK'], 18000, 'BUK'], ['Kulob', 69.8, 37.9, ['TJK'], 15000, 'BUK'], ['Karategin', 70.5, 39.0, ['TJK'], 20000, 'BUK'],
  ['Darvaz', 71.3, 38.4, ['TJK'], 15000, 'BUK'], ['Pamir', 73.5, 38.0, ['TJK'], 60000, ''],
  ['Osh', 72.9, 40.4, ['KGZ'], 15000, 'RUS'], ['Alai', 73.2, 39.6, ['KGZ'], 25000, 'RUS'], ['Jalal-Abad', 72.9, 41.3, ['KGZ'], 20000, 'RUS'], ['Talas', 72.2, 42.4, ['KGZ'], 12000, 'RUS'],
  ['Pishpek', 74.6, 42.7, ['KGZ'], 20000, 'RUS'], ['Naryn', 75.6, 41.4, ['KGZ'], 40000, 'RUS'], ['Issyk-Kul', 78.0, 42.0, ['KGZ'], 30000, 'RUS'],
  // la steppa kazaka: oblast di Uralsk, Turgai, Akmolinsk, Semipalatinsk, Semirece, Syr Darya, Mangyshlak
  ['Uralsk', 51.6, 50.6, ['KAZ'], 40000, 'RUS'], ['Gurev', 52.5, 47.3, ['KAZ'], 60000, 'RUS'], ['Mangyshlak', 53.0, 44.0, ['KAZ'], 100000, 'RUS'], ['Temir', 56.5, 48.8, ['KAZ'], 80000, 'RUS'],
  ['Irgiz', 61.0, 48.0, ['KAZ'], 120000, 'RUS'], ['Turgai', 64.0, 50.0, ['KAZ'], 120000, 'RUS'], ['Kustanai', 63.5, 52.8, ['KAZ'], 70000, 'RUS'],
  ['Kazalinsk', 62.0, 45.5, ['KAZ', 'KAB'], 80000, 'RUS'], ['Perovsk', 65.5, 44.8, ['KAZ'], 80000, 'RUS'], ['Turkestan', 68.3, 43.5, ['KAZ'], 50000, 'RUS'], ['Cimkent', 69.6, 42.4, ['KAZ'], 25000, 'RUS'],
  ['Aulie-Ata', 71.5, 43.0, ['KAZ'], 40000, 'RUS'], ['Betpak-Dala', 70.0, 46.0, ['KAZ'], 150000, 'RUS'], ['Akmolinsk', 71.0, 51.0, ['KAZ'], 80000, 'RUS'], ['Kokchetav', 69.4, 53.3, ['KAZ'], 60000, 'RUS'],
  ['Karkaralinsk', 75.5, 49.0, ['KAZ'], 100000, 'RUS'], ['Pavlodar', 76.8, 52.0, ['KAZ'], 70000, 'RUS'], ['Semipalatinsk', 80.0, 50.2, ['KAZ'], 60000, 'RUS'], ['Ust-Kamenogorsk', 83.0, 49.5, ['KAZ'], 50000, 'RUS'],
  ['Zaisan', 84.0, 47.6, ['KAZ'], 40000, 'RUS'], ['Sergiopol', 80.5, 47.5, ['KAZ'], 70000, 'RUS'], ['Kopal', 79.0, 45.0, ['KAZ'], 50000, 'RUS'], ['Verny', 76.8, 43.6, ['KAZ'], 40000, 'RUS'],
  ['Balkhash', 74.5, 46.3, ['KAZ'], 100000, 'RUS'], ['Apsceron', 50.2, 40.4, ['AZE'], 3000, 'RUS'],
  // ===== Fase 4: Russia imperiale a est del 50° meridiano (governatorati e uezd del 1881) =====
  // Urali: governatorati di Ufa, Orenburg, Perm, e le parti orientali di Samara, Kazan, Vjatka, Vologda, Arcangelo
  ['Ufa', 55.9, 54.7, ['RUS'], 25000, 'RUS'], ['Sterlitamak', 56.0, 53.4, ['RUS'], 35000, 'RUS'], ['Birsk', 55.5, 55.6, ['RUS'], 25000, 'RUS'], ['Zlatoust', 58.8, 55.2, ['RUS'], 25000, 'RUS'],
  ['Menzelinsk', 53.1, 55.7, ['RUS'], 20000, 'RUS'], ['Belebei', 54.1, 54.1, ['RUS'], 20000, 'RUS'], ['Orenburg', 55.1, 51.8, ['RUS'], 30000, 'RUS'], ['Orsk', 58.6, 51.2, ['RUS'], 30000, 'RUS'],
  ['Verchneuralsk', 59.2, 53.9, ['RUS'], 30000, 'RUS'], ['Troitsk', 61.6, 54.1, ['RUS'], 25000, 'RUS'], ['Celiabinsk', 61.4, 55.3, ['RUS'], 20000, 'RUS'],
  ['Buzuluk', 52.2, 52.8, ['RUS'], 35000, 'RUS'], ['Buguruslan', 52.4, 53.6, ['RUS'], 20000, 'RUS'], ['Bugulma', 52.8, 54.6, ['RUS'], 15000, 'RUS'], ['Cistopol', 50.7, 55.4, ['RUS'], 18000, 'RUS'],
  ['Sarapul', 53.8, 56.5, ['RUS'], 20000, 'RUS'], ['Glazov', 52.7, 58.1, ['RUS'], 35000, 'RUS'], ['Elabuga', 52.1, 55.8, ['RUS'], 15000, 'RUS'],
  ['Perm', 56.2, 58.0, ['RUS'], 30000, 'RUS'], ['Osa', 55.5, 57.3, ['RUS'], 25000, 'RUS'], ['Kungur', 57.0, 57.4, ['RUS'], 20000, 'RUS'], ['Krasnoufimsk', 57.8, 56.6, ['RUS'], 25000, 'RUS'],
  ['Solikamsk', 56.8, 59.6, ['RUS'], 40000, 'RUS'], ['Cerdyn', 56.5, 61.0, ['RUS'], 90000, 'RUS'], ['Verchoture', 60.6, 59.3, ['RUS'], 70000, 'RUS'], ['Ekaterinburg', 60.6, 56.8, ['RUS'], 30000, 'RUS'],
  ['Kamyslov', 62.7, 56.8, ['RUS'], 25000, 'RUS'], ['Sadrinsk', 63.6, 56.1, ['RUS'], 25000, 'RUS'], ['Irbit', 63.1, 57.7, ['RUS'], 25000, 'RUS'],
  ['Ust-Sysolsk', 51.5, 61.5, ['RUS'], 90000, 'RUS'], ['Pecora', 55.5, 64.5, ['RUS'], 150000, 'RUS'], ['Tundra dei Samoiedi', 59.5, 67.5, ['RUS'], 150000, 'RUS'], ['Novaja Zemlja', 56.0, 73.5, ['RUS'], 100000, 'RUS'],
  // Siberia occidentale: governatorati di Tobolsk e Tomsk
  ['Tiumen', 65.5, 57.2, ['RUS'], 30000, 'RUS'], ['Tobolsk', 68.3, 58.2, ['RUS'], 90000, 'RUS'], ['Kurgan', 65.3, 55.4, ['RUS'], 40000, 'RUS'], ['Ialutorovsk', 66.3, 56.6, ['RUS'], 25000, 'RUS'],
  ['Isim', 69.5, 56.1, ['RUS'], 45000, 'RUS'], ['Tiukalinsk', 72.2, 56.0, ['RUS'], 40000, 'RUS'], ['Tara', 74.4, 56.9, ['RUS'], 60000, 'RUS'], ['Turinsk', 63.7, 58.0, ['RUS'], 30000, 'RUS'],
  ['Omsk', 73.4, 55.0, ['RUS'], 40000, 'RUS'], ['Berezov', 65.1, 63.9, ['RUS'], 250000, 'RUS'], ['Surgut', 73.4, 61.3, ['RUS'], 250000, 'RUS'], ['Obdorsk', 70.0, 67.5, ['RUS'], 300000, 'RUS'],
  ['Tomsk', 85.0, 56.5, ['RUS'], 60000, 'RUS'], ['Mariinsk', 87.8, 56.2, ['RUS'], 50000, 'RUS'], ['Kainsk', 78.2, 55.4, ['RUS'], 90000, 'RUS'], ['Barnaul', 83.8, 53.3, ['RUS'], 90000, 'RUS'],
  ['Biisk', 85.2, 52.5, ['RUS'], 50000, 'RUS'], ['Kuznetsk', 87.1, 53.8, ['RUS'], 50000, 'RUS'], ['Narym', 82.0, 59.0, ['RUS'], 300000, 'RUS'], ['Altai', 87.0, 50.5, ['RUS'], 90000, 'RUS'],
  // Siberia centrale: governatorati dello Enisej e di Irkutsk; l'Uriankhai (Tuva) è dei Qing
  ['Krasnoiarsk', 92.9, 56.0, ['RUS'], 50000, 'RUS'], ['Acinsk', 90.5, 56.3, ['RUS'], 50000, 'RUS'], ['Minusinsk', 91.7, 53.7, ['RUS'], 80000, 'RUS'], ['Kansk', 95.7, 56.2, ['RUS'], 80000, 'RUS'],
  ['Eniseisk', 92.2, 58.8, ['RUS'], 300000, 'RUS'], ['Turuchansk', 88.0, 65.8, ['RUS'], 400000, 'RUS'], ['Taimyr', 95.0, 72.0, ['RUS'], 550000, 'RUS'], ['Tunguska', 100.0, 63.0, ['RUS'], 550000, 'RUS'],
  ['Uriankhai', 94.5, 51.7, ['RUS'], 170000, ''],
  ['Irkutsk', 104.3, 52.3, ['RUS'], 70000, 'RUS'], ['Balagansk', 103.0, 54.0, ['RUS'], 80000, 'RUS'], ['Nizneudinsk', 99.0, 54.9, ['RUS'], 110000, 'RUS'], ['Ilimsk', 103.7, 57.0, ['RUS'], 150000, 'RUS'],
  ['Kirensk', 108.1, 57.8, ['RUS'], 300000, 'RUS'],
  // Transbajkalia, Amur, Litorale, Iacuzia, Kamciatka, Sachalin (russa dal 1875; le Curili giapponesi)
  ['Verchneudinsk', 107.6, 51.8, ['RUS'], 80000, 'RUS'], ['Barguzin', 109.6, 53.6, ['RUS'], 110000, 'RUS'], ['Cita', 113.5, 52.0, ['RUS'], 90000, 'RUS'], ['Nercinsk', 116.5, 52.0, ['RUS'], 90000, 'RUS'],
  ['Argun', 119.5, 51.5, ['RUS'], 60000, 'RUS'], ['Blagovescensk', 127.5, 50.3, ['RUS'], 130000, 'RUS'], ['Alto Amur', 123.5, 54.0, ['RUS'], 250000, 'RUS'],
  ['Vladivostok', 131.9, 43.8, ['RUS'], 50000, 'RUS'], ['Ussuri', 133.5, 45.5, ['RUS'], 60000, 'RUS'], ['Chabarovka', 135.1, 48.5, ['RUS'], 110000, 'RUS'], ['Nikolaevsk', 139.5, 52.5, ['RUS'], 200000, 'RUS'],
  ['Ochotsk', 140.0, 58.0, ['RUS'], 300000, 'RUS'], ['Gizhiga', 159.0, 62.0, ['RUS'], 300000, 'RUS'], ['Kamciatka', 159.0, 55.0, ['RUS'], 150000, 'RUS'], ['Anadyr', 172.0, 65.5, ['RUS'], 550000, 'RUS'],
  ['Sachalin', 142.5, 50.0, ['RUS'], 60000, 'RUS'], ['Curili', 148.0, 45.5, ['RUS'], 15000, ''],
  ['Iakutsk', 129.7, 62.0, ['RUS'], 300000, 'RUS'], ['Olekminsk', 120.4, 60.4, ['RUS'], 300000, 'RUS'], ['Viliuisk', 121.6, 64.0, ['RUS'], 450000, 'RUS'], ['Verchoiansk', 133.4, 67.5, ['RUS'], 600000, 'RUS'],
  ['Kolyma', 153.7, 67.5, ['RUS'], 400000, 'RUS'],

  // ===== Fase 4b: India britannica e stati principeschi, Nepal, Bhutan, Ceylon, Belucistan =====
  ['Calcutta', 88.36, 22.57, ['IND'], 2500, 'GBR'],
  ['Burdwan', 87.86, 23.23, ['IND'], 22000, 'GBR'],
  ['Krishnagar', 88.5, 23.4, ['IND'], 22000, 'GBR'],
  ['Alipore', 88.6, 22.35, ['IND'], 15000, 'GBR'],
  ['Hughli', 88.1, 22.9, ['IND'], 15000, 'GBR'],
  ['Murshidabad', 88.27, 24.18, ['IND'], 22000, 'GBR'],
  ['Darjeeling', 88.26, 27.04, ['IND'], 15000, 'GBR'],
  ['Jalpaiguri', 88.7, 26.5, ['IND'], 22000, 'GBR'],
  ['Midnapore', 87.32, 22.42, ['IND'], 22000, 'GBR'],
  ['Bankura', 87.07, 23.23, ['IND'], 22000, 'GBR'],
  ['Bhagalpur', 87.0, 25.25, ['IND'], 22000, 'GBR'],
  ['Patna', 85.14, 25.6, ['IND'], 22000, 'GBR'],
  ['Gaya', 85.0, 24.8, ['IND'], 22000, 'GBR'],
  ['Muzaffarpur', 85.4, 26.1, ['IND'], 22000, 'GBR'],
  ['Chapra', 84.7, 25.8, ['IND'], 22000, 'GBR'],
  ['Darbhanga', 85.9, 26.15, ['IND'], 22000, 'GBR'],
  ['Purnea', 87.47, 25.78, ['IND'], 22000, 'GBR'],
  ['Arrah', 84.0, 25.0, ['IND'], 22000, 'GBR'],
  ['Monghyr', 86.47, 25.37, ['IND'], 22000, 'GBR'],
  ['Dumka', 87.25, 24.27, ['IND'], 22000, 'GBR'],
  ['Ranchi', 85.33, 23.35, ['IND'], 22000, 'GBR'],
  ['Hazaribagh', 85.36, 24.0, ['IND'], 22000, 'GBR'],
  ['Daltonganj', 84.07, 24.03, ['IND'], 22000, 'GBR'],
  ['Chaibasa', 85.8, 22.55, ['IND'], 22000, 'GBR'],
  ['Purulia', 86.36, 23.33, ['IND'], 22000, 'GBR'],
  ['Cuttack', 85.88, 20.46, ['IND'], 22000, 'GBR'],
  ['Balasore', 86.93, 21.5, ['IND'], 22000, 'GBR'],
  ['Puri', 85.83, 19.81, ['IND'], 22000, 'GBR'],
  ['Mahal tributari', 85.0, 21.0, ['IND'], 40000, 'GBR'],
  ['Meerut', 77.7, 28.98, ['IND'], 22000, 'GBR'],
  ['Agra', 78.0, 27.18, ['IND'], 22000, 'GBR'],
  ['Aligarh', 78.08, 27.88, ['IND'], 22000, 'GBR'],
  ['Bareilly', 79.43, 28.36, ['IND'], 22000, 'GBR'],
  ['Moradabad', 78.77, 28.83, ['IND'], 22000, 'GBR'],
  ['Shahjahanpur', 79.9, 27.88, ['IND'], 22000, 'GBR'],
  ['Allahabad', 81.85, 25.44, ['IND'], 22000, 'GBR'],
  ['Benares', 82.99, 25.32, ['IND'], 22000, 'GBR'],
  ['Gorakhpur', 83.37, 26.76, ['IND'], 22000, 'GBR'],
  ['Azamgarh', 83.18, 26.07, ['IND'], 22000, 'GBR'],
  ['Jhansi', 78.57, 25.45, ['IND'], 8000, 'GBR'],
  ['Lucknow', 80.95, 26.85, ['IND'], 22000, 'GBR'],
  ['Faizabad', 82.13, 26.77, ['IND'], 22000, 'GBR'],
  ['Sitapur', 80.68, 27.57, ['IND'], 22000, 'GBR'],
  ['Kheri', 80.78, 27.95, ['IND'], 22000, 'GBR'],
  ['Bahraich', 81.6, 27.57, ['IND'], 22000, 'GBR'],
  ['Rae Bareli', 81.24, 26.23, ['IND'], 22000, 'GBR'],
  ['Cawnpore', 80.33, 26.45, ['IND'], 22000, 'GBR'],
  ['Farrukhabad', 79.58, 27.38, ['IND'], 22000, 'GBR'],
  ['Etawah', 79.02, 26.78, ['IND'], 22000, 'GBR'],
  ['Almora', 79.66, 29.6, ['IND'], 25000, 'GBR'],
  ['Garhwal', 78.78, 30.15, ['IND'], 25000, 'GBR'],
  ['Dehra Dun', 78.03, 30.32, ['IND'], 15000, 'GBR'],
  ['Saharanpur', 77.55, 29.97, ['IND'], 22000, 'GBR'],
  ['Mirzapur', 82.57, 25.15, ['IND'], 22000, 'GBR'],
  ['Banda', 80.33, 25.48, ['IND'], 22000, 'GBR'],
  ['Delhi', 77.2, 28.65, ['IND'], 22000, 'GBR'],
  ['Hisar', 75.72, 29.15, ['IND'], 22000, 'GBR'],
  ['Rohtak', 76.6, 28.9, ['IND'], 22000, 'GBR'],
  ['Ambala', 76.78, 30.38, ['IND'], 22000, 'GBR'],
  ['Jullundur', 75.58, 31.33, ['IND'], 22000, 'GBR'],
  ['Amritsar', 74.87, 31.63, ['IND'], 22000, 'GBR'],
  ['Ferozepur', 74.6, 30.92, ['IND'], 9000, 'GBR'],
  ['Ludhiana', 75.85, 30.9, ['IND'], 22000, 'GBR'],
  ['Gurdaspur', 75.4, 32.04, ['IND'], 22000, 'GBR'],
  ['Kangra', 76.27, 32.1, ['IND'], 25000, 'GBR'],
  ['Simla', 77.17, 31.1, ['IND'], 25000, 'GBR'],
  ['Bombay', 72.88, 19.07, ['IND'], 2500, 'GBR'],
  ['Thana', 73.0, 19.4, ['IND'], 22000, 'GBR'],
  ['Kolaba', 73.0, 18.5, ['IND'], 22000, 'GBR'],
  ['Poona', 73.85, 18.52, ['IND'], 22000, 'GBR'],
  ['Satara', 74.0, 17.68, ['IND'], 22000, 'GBR'],
  ['Ahmednagar', 74.74, 19.09, ['IND'], 22000, 'GBR'],
  ['Nasik', 73.79, 20.0, ['IND'], 22000, 'GBR'],
  ['Dhulia', 74.77, 20.9, ['IND'], 22000, 'GBR'],
  ['Jalgaon', 75.56, 21.0, ['IND'], 22000, 'GBR'],
  ['Sholapur', 75.9, 17.67, ['IND'], 22000, 'GBR'],
  ['Belgaum', 74.5, 15.85, ['IND'], 22000, 'GBR'],
  ['Dharwar', 75.0, 15.46, ['IND'], 22000, 'GBR'],
  ['Bijapur', 75.71, 16.83, ['IND'], 22000, 'GBR'],
  ['Ratnagiri', 73.3, 16.99, ['IND'], 22000, 'GBR'],
  ['Karwar', 74.13, 14.8, ['IND'], 22000, 'GBR'],
  ['Surat', 72.83, 21.17, ['IND'], 22000, 'GBR'],
  ['Broach', 72.98, 21.7, ['IND'], 22000, 'GBR'],
  ['Kaira', 72.68, 22.75, ['IND'], 22000, 'GBR'],
  ['Ahmedabad', 72.58, 23.03, ['IND'], 8000, 'GBR'],
  ['Godhra', 73.6, 22.78, ['IND'], 22000, 'GBR'],
  ['Kathiawar', 70.8, 22.3, ['IND'], 22000, 'GBR'],
  ['Palanpur', 72.43, 24.17, ['IND'], 22000, 'GBR'],
  ['Idar', 73.0, 23.6, ['IND'], 22000, 'GBR'],
  ['Rajpipla', 73.5, 21.8, ['IND'], 22000, 'GBR'],
  ['Nagpur', 79.09, 21.15, ['IND'], 22000, 'GBR'],
  ['Wardha', 78.6, 20.74, ['IND'], 22000, 'GBR'],
  ['Chanda', 79.3, 19.95, ['IND'], 22000, 'GBR'],
  ['Bhandara', 79.65, 21.17, ['IND'], 22000, 'GBR'],
  ['Balaghat', 80.18, 21.8, ['IND'], 22000, 'GBR'],
  ['Jubbulpore', 79.95, 23.17, ['IND'], 22000, 'GBR'],
  ['Saugor', 78.73, 23.84, ['IND'], 22000, 'GBR'],
  ['Damoh', 79.44, 23.84, ['IND'], 22000, 'GBR'],
  ['Seoni', 79.55, 22.09, ['IND'], 22000, 'GBR'],
  ['Mandla', 80.37, 22.6, ['IND'], 22000, 'GBR'],
  ['Chhindwara', 78.94, 22.06, ['IND'], 22000, 'GBR'],
  ['Betul', 77.9, 21.9, ['IND'], 22000, 'GBR'],
  ['Hoshangabad', 77.72, 22.75, ['IND'], 22000, 'GBR'],
  ['Narsinghpur', 79.19, 22.95, ['IND'], 22000, 'GBR'],
  ['Khandwa', 76.35, 21.82, ['IND'], 22000, 'GBR'],
  ['Raipur', 81.63, 21.25, ['IND'], 22000, 'GBR'],
  ['Bilaspur', 82.15, 22.08, ['IND'], 22000, 'GBR'],
  ['Sambalpur', 83.97, 21.47, ['IND'], 22000, 'GBR'],
  ['Bastar', 81.95, 19.1, ['IND'], 35000, 'GBR'],
  ['Sarguja', 83.2, 23.1, ['IND'], 30000, 'GBR'],
  ['Amraoti', 77.75, 20.93, ['IND'], 22000, 'GBR'],
  ['Akola', 77.0, 20.7, ['IND'], 22000, 'GBR'],
  ['Buldana', 76.18, 20.53, ['IND'], 22000, 'GBR'],
  ['Yavatmal', 78.12, 20.39, ['IND'], 22000, 'GBR'],
  ['Madras', 80.27, 13.08, ['IND'], 8000, 'GBR'],
  ['Chingleput', 79.98, 12.69, ['IND'], 22000, 'GBR'],
  ['Vellore', 79.13, 12.92, ['IND'], 22000, 'GBR'],
  ['Cuddalore', 79.75, 11.75, ['IND'], 22000, 'GBR'],
  ['Tanjore', 79.14, 10.79, ['IND'], 22000, 'GBR'],
  ['Trichinopoly', 78.69, 10.8, ['IND'], 22000, 'GBR'],
  ['Madura', 78.12, 9.93, ['IND'], 22000, 'GBR'],
  ['Ramnad', 78.83, 9.37, ['IND'], 22000, 'GBR'],
  ['Tinnevelly', 77.7, 8.73, ['IND'], 22000, 'GBR'],
  ['Coimbatore', 76.96, 11.0, ['IND'], 22000, 'GBR'],
  ['Ootacamund', 76.7, 11.4, ['IND'], 10000, 'GBR'],
  ['Salem', 78.15, 11.66, ['IND'], 22000, 'GBR'],
  ['Krishnagiri', 78.2, 12.5, ['IND'], 22000, 'GBR'],
  ['Calicut', 75.78, 11.25, ['IND'], 22000, 'GBR'],
  ['Palghat', 76.65, 10.78, ['IND'], 22000, 'GBR'],
  ['Cannanore', 75.37, 11.87, ['IND'], 22000, 'GBR'],
  ['Mangalore', 74.86, 12.87, ['IND'], 22000, 'GBR'],
  ['Bellary', 76.92, 15.14, ['IND'], 22000, 'GBR'],
  ['Anantapur', 77.6, 14.68, ['IND'], 22000, 'GBR'],
  ['Cuddapah', 78.82, 14.47, ['IND'], 22000, 'GBR'],
  ['Kurnool', 78.05, 15.83, ['IND'], 22000, 'GBR'],
  ['Nellore', 79.98, 14.44, ['IND'], 22000, 'GBR'],
  ['Ongole', 80.05, 15.5, ['IND'], 22000, 'GBR'],
  ['Masulipatam', 81.13, 16.17, ['IND'], 22000, 'GBR'],
  ['Guntur', 80.45, 16.3, ['IND'], 22000, 'GBR'],
  ['Rajahmundry', 81.78, 17.0, ['IND'], 22000, 'GBR'],
  ['Cocanada', 82.23, 16.95, ['IND'], 22000, 'GBR'],
  ['Vizagapatam', 83.3, 17.7, ['IND'], 22000, 'GBR'],
  ['Vizianagram', 83.4, 18.1, ['IND'], 22000, 'GBR'],
  ['Jeypore', 82.57, 18.85, ['IND'], 30000, 'GBR'],
  ['Ganjam', 84.8, 19.31, ['IND'], 22000, 'GBR'],
  ['Chicacole', 83.9, 18.3, ['IND'], 22000, 'GBR'],
  ['Mercara', 75.74, 12.42, ['IND'], 10000, 'GBR'],
  ['Pudukkottai', 78.82, 10.38, ['IND'], 10000, 'GBR'],
  ['Kolhapur', 74.24, 16.7, ['IND'], 22000, 'GBR'],
  ['Alwar', 76.6, 27.55, ['IND'], 22000, 'GBR'],
  ['Bharatpur', 77.49, 27.22, ['IND'], 22000, 'GBR'],
  ['Karauli', 77.02, 26.5, ['IND'], 22000, 'GBR'],
  ['Tonk', 75.79, 26.17, ['IND'], 22000, 'GBR'],
  ['Kota', 75.83, 25.18, ['IND'], 22000, 'GBR'],
  ['Bundi', 75.64, 25.44, ['IND'], 22000, 'GBR'],
  ['Jhalawar', 76.16, 24.6, ['IND'], 22000, 'GBR'],
  ['Ajmer', 74.64, 26.45, ['IND'], 22000, 'GBR'],
  ['Jaisalmer', 70.91, 26.92, ['IND'], 45000, 'GBR'],
  ['Sirohi', 72.86, 24.89, ['IND'], 22000, 'GBR'],
  ['Dungarpur', 73.71, 23.84, ['IND'], 22000, 'GBR'],
  ['Banswara', 74.44, 23.55, ['IND'], 22000, 'GBR'],
  ['Datia', 78.46, 25.67, ['IND'], 22000, 'GBR'],
  ['Orchha', 78.84, 24.74, ['IND'], 22000, 'GBR'],
  ['Panna', 80.19, 24.72, ['IND'], 22000, 'GBR'],
  ['Chhatarpur', 79.59, 24.92, ['IND'], 22000, 'GBR'],
  ['Dhar', 75.3, 22.6, ['IND'], 22000, 'GBR'],
  ['Jhabua', 74.59, 22.77, ['IND'], 22000, 'GBR'],
  ['Ratlam', 75.04, 23.33, ['IND'], 22000, 'GBR'],
  ['Rajgarh', 76.73, 24.0, ['IND'], 22000, 'GBR'],
  ['Dewas', 76.05, 22.97, ['IND'], 22000, 'GBR'],
  ['Barwani', 74.9, 22.03, ['IND'], 22000, 'GBR'],
  ['Nimach', 74.87, 24.47, ['IND'], 22000, 'GBR'],
  ['Cooch Behar', 89.45, 26.32, ['IND'], 22000, 'GBR'],
  ['Jind', 76.31, 29.32, ['IND'], 22000, 'GBR'],
  ['Faridkot', 74.76, 30.67, ['IND'], 22000, 'GBR'],
  ['Chamba', 76.13, 32.55, ['IND'], 25000, 'GBR'],
  ['Mandi', 76.93, 31.7, ['IND'], 20000, 'GBR'],
  ['Gauhati', 91.75, 26.18, ['IND'], 22000, 'GBR'],
  ['Goalpara', 90.62, 26.17, ['IND'], 22000, 'GBR'],
  ['Tezpur', 92.8, 26.63, ['IND'], 22000, 'GBR'],
  ['Nowgong', 92.68, 26.35, ['IND'], 22000, 'GBR'],
  ['Sibsagar', 94.64, 26.98, ['IND'], 22000, 'GBR'],
  ['Dibrugarh', 94.9, 27.48, ['IND'], 22000, 'GBR'],
  ['Silchar', 92.8, 24.83, ['IND'], 22000, 'GBR'],
  ['Shillong', 91.88, 25.57, ['IND'], 22000, 'GBR'],
  ['Tura', 90.22, 25.51, ['IND'], 22000, 'GBR'],
  ['Kohima', 94.1, 25.67, ['IND'], 22000, 'GBR'],
  ['Andamane', 92.73, 11.67, ['IND'], 10000, 'GBR'],
  ['Terre degli Abor', 94.9, 28.3, ['IND'], 60000, ''],
  ['Terre degli Aka e dei Dafla', 93.0, 27.6, ['IND'], 40000, ''],
  ['Terre dei Mishmi', 96.2, 28.0, ['IND'], 40000, ''],
  ['Naga liberi', 94.9, 26.4, ['IND'], 15000, ''],
  ['Lushai', 92.8, 23.3, ['IND'], 25000, ''],
  ['Haiderabad', 78.47, 17.38, ['IND'], 25000, 'HYD'],
  ['Warangal', 79.59, 17.97, ['IND'], 25000, 'HYD'],
  ['Aurangabad', 75.34, 19.88, ['IND'], 25000, 'HYD'],
  ['Nander', 77.3, 19.15, ['IND'], 25000, 'HYD'],
  ['Gulbarga', 76.83, 17.33, ['IND'], 25000, 'HYD'],
  ['Raichur', 77.35, 16.2, ['IND'], 25000, 'HYD'],
  ['Bhir', 75.76, 18.99, ['IND'], 25000, 'HYD'],
  ['Medak', 78.26, 18.03, ['IND'], 25000, 'HYD'],
  ['Nalgonda', 79.27, 17.05, ['IND'], 25000, 'HYD'],
  ['Bangalore', 77.59, 12.97, ['IND'], 15000, 'MYS'],
  ['Mysore', 76.64, 12.3, ['IND'], 15000, 'MYS'],
  ['Shimoga', 75.57, 13.93, ['IND'], 15000, 'MYS'],
  ['Chitaldrug', 76.4, 14.23, ['IND'], 15000, 'MYS'],
  ['Tumkur', 77.1, 13.34, ['IND'], 15000, 'MYS'],
  ['Kolar', 78.13, 13.14, ['IND'], 15000, 'MYS'],
  ['Hassan', 76.1, 13.0, ['IND'], 15000, 'MYS'],
  ['Trivandrum', 76.95, 8.52, ['IND'], 12000, 'TVC'],
  ['Quilon', 76.6, 8.88, ['IND'], 12000, 'TVC'],
  ['Kottayam', 76.52, 9.59, ['IND'], 12000, 'TVC'],
  ['Cochin', 76.26, 9.97, ['IND'], 15000, 'COC'],
  ['Srinagar', 74.8, 34.08, ['IND'], 20000, 'KSH'],
  ['Jammu', 74.86, 32.73, ['IND'], 20000, 'KSH'],
  ['Ladakh', 77.58, 34.16, ['IND'], 120000, 'KSH'],
  ['Kishtwar', 75.77, 33.31, ['IND'], 20000, 'KSH'],
  ['Patiala', 76.39, 30.34, ['IND'], 20000, 'PAT'],
  ['Jaipur', 75.79, 26.91, ['IND'], 20000, 'JAI'],
  ['Jodhpur', 73.02, 26.29, ['IND'], 30000, 'JOD'],
  ['Udaipur', 73.71, 24.58, ['IND'], 25000, 'UDA'],
  ['Bikaner', 73.31, 28.02, ['IND'], 35000, 'BIK'],
  ['Gwalior', 78.18, 26.22, ['IND'], 22000, 'GWA'],
  ['Ujjain', 75.78, 23.18, ['IND'], 22000, 'GWA'],
  ['Bhilsa', 77.81, 23.52, ['IND'], 22000, 'GWA'],
  ['Indore', 75.86, 22.72, ['IND'], 20000, 'HOL'],
  ['Bhopal', 77.41, 23.26, ['IND'], 20000, 'BHO'],
  ['Rewa', 81.3, 24.53, ['IND'], 25000, 'REW'],
  ['Baroda', 73.18, 22.3, ['IND'], 20000, 'BRD'],
  ['Kadi', 72.38, 23.6, ['IND'], 20000, 'BRD'],
  ['Amreli', 71.22, 21.6, ['IND'], 20000, 'BRD'],
  ['Navsari', 72.92, 20.95, ['IND'], 20000, 'BRD'],
  ['Kutch', 69.67, 23.25, ['IND'], 25000, 'KUT'],
  ['Manipur', 93.94, 24.81, ['IND'], 25000, 'MNP'],
  ['Tippera', 91.28, 23.84, ['IND'], 15000, 'TRP'],
  ['Sikkim', 88.61, 27.33, ['IND'], 10000, 'SIK'],
  ['Goa', 73.95, 15.4, ['IND'], 8000, 'POR'],
  ['Nagar Aveli', 73.0, 20.27, ['IND'], 300, 'POR'],
  ['Pondichery', 79.8, 11.93, ['IND'], 300, 'FRA'],
  ['Karachi', 67.0, 24.86, ['PAK'], 10000, 'GBR'],
  ['Haiderabad del Sind', 68.37, 25.39, ['PAK'], 10000, 'GBR'],
  ['Shikarpur', 68.64, 27.96, ['PAK'], 10000, 'GBR'],
  ['Umarkot', 69.73, 25.36, ['PAK'], 30000, 'GBR'],
  ['Jacobabad', 68.43, 28.28, ['PAK'], 10000, 'GBR'],
  ['Khairpur', 68.76, 27.4, ['PAK'], 25000, 'KHP'],
  ['Nawabshah', 68.4, 26.25, ['PAK'], 10000, 'GBR'],
  ['Sanghar', 69.1, 26.2, ['PAK'], 25000, 'GBR'],
  ['Larkana', 68.2, 27.55, ['PAK'], 10000, 'GBR'],
  ['Lahore', 74.33, 31.55, ['PAK'], 10000, 'GBR'],
  ['Rawalpindi', 73.05, 33.6, ['PAK'], 10000, 'GBR'],
  ['Jhelum', 73.73, 32.93, ['PAK'], 10000, 'GBR'],
  ['Gujrat', 74.08, 32.57, ['PAK'], 10000, 'GBR'],
  ['Sialkot', 74.53, 32.5, ['PAK'], 10000, 'GBR'],
  ['Gujranwala', 74.19, 32.16, ['PAK'], 10000, 'GBR'],
  ['Shahpur', 72.67, 32.08, ['PAK'], 10000, 'GBR'],
  ['Multan', 71.47, 30.2, ['PAK'], 10000, 'GBR'],
  ['Jhang', 72.32, 31.27, ['PAK'], 10000, 'GBR'],
  ['Montgomery', 73.1, 30.67, ['PAK'], 10000, 'GBR'],
  ['Muzaffargarh', 71.2, 30.07, ['PAK'], 10000, 'GBR'],
  ['Dera Ghazi Khan', 70.63, 30.05, ['PAK'], 25000, 'GBR'],
  ['Dera Ismail Khan', 70.9, 31.83, ['PAK'], 25000, 'GBR'],
  ['Bannu', 70.6, 32.98, ['PAK'], 10000, 'GBR'],
  ['Kohat', 71.44, 33.58, ['PAK'], 10000, 'GBR'],
  ['Peshawar', 71.57, 34.01, ['PAK'], 10000, 'GBR'],
  ['Abbottabad', 73.21, 34.15, ['PAK'], 10000, 'GBR'],
  ['Mianwali', 71.55, 32.58, ['PAK'], 10000, 'GBR'],
  ['Bahawalpur', 71.68, 29.4, ['PAK'], 25000, 'BAH'],
  ['Khanpur', 70.65, 28.65, ['PAK'], 25000, 'BAH'],
  ['Bahawalnagar', 73.25, 29.99, ['PAK'], 25000, 'BAH'],
  ['Kalat', 66.6, 29.03, ['PAK'], 50000, 'KAL'],
  ['Kharan', 65.4, 28.58, ['PAK'], 60000, 'KAL'],
  ['Kech', 63.05, 26.0, ['PAK'], 60000, 'KAL'],
  ['Las Bela', 66.5, 26.0, ['PAK'], 40000, 'KAL'],
  ['Khuzdar', 66.6, 27.8, ['PAK'], 50000, 'KAL'],
  ['Kachhi', 67.6, 28.9, ['PAK'], 30000, 'KAL'],
  ['Quetta', 67.0, 30.18, ['PAK'], 25000, 'GBR'],
  ['Pishin', 67.0, 30.58, ['PAK'], 25000, 'GBR'],
  ['Sibi', 67.87, 29.55, ['PAK'], 25000, 'GBR'],
  ['Paese dei Marri e dei Bugti', 69.0, 29.3, ['PAK'], 40000, ''],
  ['Zhob', 69.4, 31.3, ['PAK'], 50000, ''],
  ['Chagai', 64.0, 29.3, ['PAK'], 80000, ''],
  ['Waziristan', 69.9, 32.6, ['PAK'], 20000, ''],
  ['Tirah e Khyber', 71.0, 33.8, ['PAK'], 15000, ''],
  ['Kurram', 70.1, 33.8, ['PAK'], 10000, ''],
  ['Dir e Bajaur', 71.6, 34.9, ['PAK'], 15000, ''],
  ['Swat', 72.4, 35.2, ['PAK'], 15000, ''],
  ['Chitral', 71.8, 35.85, ['PAK'], 25000, ''],
  ['Muzaffarabad', 73.47, 34.37, ['PAK', 'KAS'], 15000, 'KSH'],
  ['Mirpur', 73.75, 33.15, ['PAK', 'KAS'], 12000, 'KSH'],
  ['Gilgit', 74.3, 35.92, ['PAK', 'KAS'], 30000, 'KSH'],
  ['Baltistan', 75.63, 35.3, ['PAK', 'KAS'], 35000, 'KSH'],
  ['Hunza e Nagar', 74.66, 36.32, ['PAK', 'KAS'], 15000, ''],
  ['Dacca', 90.4, 23.7, ['BGD'], 9000, 'GBR'],
  ['Chittagong', 91.8, 22.35, ['BGD'], 9000, 'GBR'],
  ['Colline di Chittagong', 92.2, 22.6, ['BGD'], 9000, 'GBR'],
  ['Mymensingh', 90.4, 24.75, ['BGD'], 9000, 'GBR'],
  ['Rangpur', 89.25, 25.75, ['BGD'], 9000, 'GBR'],
  ['Rajshahi', 88.6, 24.37, ['BGD'], 9000, 'GBR'],
  ['Bogra', 89.37, 24.85, ['BGD'], 9000, 'GBR'],
  ['Pabna', 89.23, 24.0, ['BGD'], 9000, 'GBR'],
  ['Barisal', 90.35, 22.7, ['BGD'], 9000, 'GBR'],
  ['Jessore', 89.2, 23.17, ['BGD'], 9000, 'GBR'],
  ['Khulna', 89.55, 22.82, ['BGD'], 9000, 'GBR'],
  ['Faridpur', 89.83, 23.6, ['BGD'], 9000, 'GBR'],
  ['Noakhali', 91.1, 22.87, ['BGD'], 9000, 'GBR'],
  ['Comilla', 91.18, 23.46, ['BGD'], 9000, 'GBR'],
  ['Sylhet', 91.87, 24.9, ['BGD'], 9000, 'GBR'],
  ['Kathmandu', 85.32, 27.7, ['NPL'], 10000, 'NEP'],
  ['Pokhara', 83.98, 28.21, ['NPL'], 12000, 'NEP'],
  ['Palpa', 83.55, 27.87, ['NPL'], 12000, 'NEP'],
  ['Doti', 80.9, 29.3, ['NPL'], 15000, 'NEP'],
  ['Jumla', 82.18, 29.27, ['NPL'], 20000, 'NEP'],
  ['Morang', 87.27, 26.45, ['NPL'], 6000, 'NEP'],
  ['Janakpur', 85.92, 26.73, ['NPL'], 10000, 'NEP'],
  ['Dhankuta', 87.34, 26.98, ['NPL'], 12000, 'NEP'],
  ['Gorkha', 84.63, 28.0, ['NPL'], 12000, 'NEP'],
  ['Naya Muluk', 81.6, 28.05, ['NPL'], 12000, 'NEP'],
  ['Salyan', 82.3, 28.3, ['NPL'], 12000, 'NEP'],
  ['Birganj', 84.88, 27.0, ['NPL'], 10000, 'NEP'],
  ['Punakha', 89.86, 27.6, ['BTN'], 10000, 'BHU'],
  ['Paro', 89.4, 27.43, ['BTN'], 8000, 'BHU'],
  ['Tongsa', 90.5, 27.5, ['BTN'], 10000, 'BHU'],
  ['Tashigang', 91.55, 27.33, ['BTN'], 10000, 'BHU'],
  ['Colombo', 79.86, 6.93, ['LKA'], 6000, 'GBR'],
  ['Kandy', 80.63, 7.29, ['LKA'], 6000, 'GBR'],
  ['Jaffna', 80.0, 9.66, ['LKA'], 6000, 'GBR'],
  ['Trincomalee', 81.23, 8.58, ['LKA'], 8000, 'GBR'],
  ['Batticaloa', 81.7, 7.73, ['LKA'], 8000, 'GBR'],
  ['Galle', 80.22, 6.05, ['LKA'], 6000, 'GBR'],
  ['Anuradhapura', 80.4, 8.31, ['LKA'], 10000, 'GBR'],
  ['Badulla', 81.05, 6.99, ['LKA'], 8000, 'GBR'],
  ['Kurunegala', 80.36, 7.49, ['LKA'], 6000, 'GBR'],
  ['Ratnapura', 80.4, 6.68, ['LKA'], 6000, 'GBR'],
  ['Mannar', 80.0, 8.98, ['LKA'], 6000, 'GBR'],

  // ===== Fase 5: Indocina e penisola malese =====
  ['Akyab', 92.9, 20.15, ['MMR'], 20000, 'GBR'],
  ['Sandoway', 94.4, 18.4, ['MMR'], 20000, 'GBR'],
  ['Rangoon', 96.16, 16.8, ['MMR'], 8000, 'GBR'],
  ['Bassein', 94.73, 16.78, ['MMR'], 20000, 'GBR'],
  ['Myaungmya', 95.1, 16.3, ['MMR'], 20000, 'GBR'],
  ['Henzada', 95.46, 17.64, ['MMR'], 20000, 'GBR'],
  ['Prome', 95.2, 18.8, ['MMR'], 20000, 'GBR'],
  ['Thayetmyo', 95.0, 19.5, ['MMR'], 20000, 'GBR'],
  ['Toungoo', 96.43, 18.94, ['MMR'], 20000, 'GBR'],
  ['Shwegyin', 96.9, 17.9, ['MMR'], 20000, 'GBR'],
  ['Moulmein', 97.63, 16.49, ['MMR'], 20000, 'GBR'],
  ['Tavoy', 98.2, 14.08, ['MMR'], 20000, 'GBR'],
  ['Mergui', 98.6, 12.4, ['MMR'], 20000, 'GBR'],
  ['Mandalay', 96.08, 21.97, ['MMR'], 20000, 'BRM'],
  ['Shwebo', 95.7, 22.7, ['MMR'], 20000, 'BRM'],
  ['Minbu', 94.88, 20.18, ['MMR'], 20000, 'BRM'],
  ['Pakokku', 94.8, 21.6, ['MMR'], 20000, 'BRM'],
  ['Meiktila', 95.86, 20.88, ['MMR'], 20000, 'BRM'],
  ['Yamethin', 96.15, 20.0, ['MMR'], 20000, 'BRM'],
  ['Katha', 96.33, 24.17, ['MMR'], 20000, 'BRM'],
  ['Bhamo', 97.23, 24.27, ['MMR'], 20000, 'BRM'],
  ['Myitkyina', 97.4, 25.38, ['MMR'], 30000, 'BRM'],
  ['Kindat', 94.6, 23.8, ['MMR'], 30000, 'BRM'],
  ['Hsipaw', 97.3, 22.6, ['MMR'], 25000, 'BRM'],
  ['Mong Nai', 97.9, 20.5, ['MMR'], 25000, 'BRM'],
  ['Kengtung', 99.6, 21.3, ['MMR'], 25000, 'BRM'],
  ['Yawnghwe', 97.0, 20.6, ['MMR'], 20000, 'BRM'],
  ['Monywa', 95.1, 22.1, ['MMR'], 20000, 'BRM'],
  ['Karenni', 97.2, 19.4, ['MMR'], 12000, ''],
  ['Colline dei Chin', 93.6, 22.4, ['MMR'], 30000, ''],
  ['Hukawng', 96.5, 26.5, ['MMR'], 35000, ''],
  ['Bangkok', 100.5, 13.75, ['THA'], 8000, 'SIA'],
  ['Ayutthaya', 100.57, 14.35, ['THA'], 12000, 'SIA'],
  ['Nakhon Sawan', 100.12, 15.7, ['THA'], 20000, 'SIA'],
  ['Phitsanulok', 100.26, 16.82, ['THA'], 20000, 'SIA'],
  ['Chiang Mai', 98.98, 18.79, ['THA'], 20000, 'SIA'],
  ['Lampang', 99.5, 18.3, ['THA'], 20000, 'SIA'],
  ['Nan', 100.77, 18.78, ['THA'], 20000, 'SIA'],
  ['Phrae', 100.14, 18.0, ['THA'], 20000, 'SIA'],
  ['Korat', 102.1, 14.97, ['THA'], 20000, 'SIA'],
  ['Ubon', 104.85, 15.24, ['THA'], 20000, 'SIA'],
  ['Nong Khai', 102.75, 17.6, ['THA'], 20000, 'SIA'],
  ['Sakon Nakhon', 104.15, 17.16, ['THA'], 20000, 'SIA'],
  ['Roi Et', 103.65, 16.05, ['THA'], 20000, 'SIA'],
  ['Chanthaburi', 102.1, 12.6, ['THA'], 20000, 'SIA'],
  ['Ratchaburi', 99.8, 13.5, ['THA'], 20000, 'SIA'],
  ['Phetchaburi', 99.6, 12.6, ['THA'], 20000, 'SIA'],
  ['Chumphon', 99.18, 10.5, ['THA'], 20000, 'SIA'],
  ['Nakhon Si Thammarat', 99.96, 8.43, ['THA'], 20000, 'SIA'],
  ['Songkhla', 100.6, 7.2, ['THA'], 20000, 'SIA'],
  ['Pattani', 101.25, 6.6, ['THA'], 20000, 'SIA'],
  ['Phuket', 98.39, 8.2, ['THA'], 20000, 'SIA'],
  ['Tak', 99.1, 16.9, ['THA'], 20000, 'SIA'],
  ['Kanchanaburi', 99.2, 14.6, ['THA'], 20000, 'SIA'],
  ['Chiang Rai', 99.83, 19.9, ['THA'], 20000, 'SIA'],
  ['Prachinburi', 101.37, 14.05, ['THA'], 20000, 'SIA'],
  ['Luang Prabang', 102.13, 19.88, ['LAO'], 30000, 'SIA'],
  ['Vientiane', 102.6, 18.1, ['LAO'], 30000, 'SIA'],
  ['Xieng Khouang', 103.2, 19.4, ['LAO'], 30000, 'SIA'],
  ['Champassak', 105.87, 14.9, ['LAO'], 30000, 'SIA'],
  ['Attapeu', 106.83, 14.8, ['LAO'], 30000, 'SIA'],
  ['Savannakhet', 105.2, 16.55, ['LAO'], 30000, 'SIA'],
  ['Khammouane', 104.9, 17.6, ['LAO'], 30000, 'SIA'],
  ['Muang Sing', 101.2, 21.0, ['LAO'], 30000, 'SIA'],
  ['Houaphan', 104.0, 20.4, ['LAO'], 30000, 'SIA'],
  ['Sayaboury', 101.4, 19.0, ['LAO'], 30000, 'SIA'],
  ['Saravane', 106.4, 15.7, ['LAO'], 30000, 'SIA'],
  ['Phnom Penh', 104.92, 11.56, ['KHM'], 8000, 'CAM'],
  ['Kampot', 104.18, 10.75, ['KHM'], 15000, 'CAM'],
  ['Kampong Cham', 105.46, 12.0, ['KHM'], 15000, 'CAM'],
  ['Kampong Thom', 104.9, 12.7, ['KHM'], 15000, 'CAM'],
  ['Pursat', 103.9, 12.53, ['KHM'], 15000, 'CAM'],
  ['Kratie', 106.0, 12.49, ['KHM'], 15000, 'CAM'],
  ['Prey Veng', 105.32, 11.3, ['KHM'], 15000, 'CAM'],
  ['Battambang', 103.2, 13.1, ['KHM'], 15000, 'SIA'],
  ['Siem Reap', 103.86, 13.6, ['KHM'], 15000, 'SIA'],
  ['Stung Treng', 106.0, 13.6, ['KHM'], 25000, 'SIA'],
  ['Koh Kong', 103.5, 11.4, ['KHM'], 15000, 'SIA'],
  ['Saigon', 106.7, 10.78, ['VNM'], 4000, 'FRA'],
  ['My Tho', 106.36, 10.36, ['VNM'], 7000, 'FRA'],
  ['Vinh Long', 106.0, 10.1, ['VNM'], 7000, 'FRA'],
  ['Chau Doc', 105.12, 10.7, ['VNM'], 7000, 'FRA'],
  ['Soc Trang', 105.97, 9.6, ['VNM'], 7000, 'FRA'],
  ['Rach Gia', 105.08, 10.0, ['VNM'], 7000, 'FRA'],
  ['Ca Mau', 105.15, 9.18, ['VNM'], 7000, 'FRA'],
  ['Bien Hoa', 106.82, 11.1, ['VNM'], 10000, 'FRA'],
  ['Tay Ninh', 106.1, 11.3, ['VNM'], 7000, 'FRA'],
  ['Ba Ria', 107.17, 10.6, ['VNM'], 7000, 'FRA'],
  ['Kon Tum', 108.0, 14.35, ['VNM'], 25000, ''],
  ['Darlac', 108.05, 12.7, ['VNM'], 25000, ''],
  ['Langbian', 108.4, 11.9, ['VNM'], 25000, ''],
  ['Paese dei Thai neri', 103.2, 22.0, ['VNM'], 25000, ''],
  ['Lao Cai', 104.0, 22.4, ['VNM'], 15000, ''],
  ['Hue', 107.58, 16.46, ['VNM'], 12000, 'ANN'],
  ['Quang Tri', 107.0, 16.8, ['VNM'], 12000, 'ANN'],
  ['Quang Binh', 106.4, 17.5, ['VNM'], 12000, 'ANN'],
  ['Ha Tinh', 105.9, 18.34, ['VNM'], 12000, 'ANN'],
  ['Nghe An', 105.3, 19.0, ['VNM'], 15000, 'ANN'],
  ['Thanh Hoa', 105.5, 19.9, ['VNM'], 12000, 'ANN'],
  ['Quang Nam', 108.1, 15.6, ['VNM'], 12000, 'ANN'],
  ['Quang Ngai', 108.8, 15.0, ['VNM'], 12000, 'ANN'],
  ['Binh Dinh', 109.0, 14.0, ['VNM'], 12000, 'ANN'],
  ['Phu Yen', 109.2, 13.1, ['VNM'], 12000, 'ANN'],
  ['Khanh Hoa', 109.0, 12.25, ['VNM'], 12000, 'ANN'],
  ['Binh Thuan', 108.0, 11.1, ['VNM'], 12000, 'ANN'],
  ['Hanoi', 105.85, 21.03, ['VNM'], 5000, 'ANN'],
  ['Nam Dinh', 106.17, 20.43, ['VNM'], 6000, 'ANN'],
  ['Hai Duong', 106.33, 20.94, ['VNM'], 6000, 'ANN'],
  ['Haiphong', 106.68, 20.86, ['VNM'], 5000, 'ANN'],
  ['Bac Ninh', 106.07, 21.19, ['VNM'], 6000, 'ANN'],
  ['Son Tay', 105.4, 21.2, ['VNM'], 8000, 'ANN'],
  ['Hung Hoa', 104.9, 21.5, ['VNM'], 12000, 'ANN'],
  ['Thai Nguyen', 105.84, 21.7, ['VNM'], 12000, 'ANN'],
  ['Lang Son', 106.76, 21.85, ['VNM'], 12000, 'ANN'],
  ['Cao Bang', 106.25, 22.67, ['VNM'], 12000, 'ANN'],
  ['Tuyen Quang', 105.2, 22.2, ['VNM'], 12000, 'ANN'],
  ['Son La', 104.0, 21.2, ['VNM'], 15000, 'ANN'],
  ['Quang Yen', 107.4, 21.3, ['VNM'], 12000, 'ANN'],
  ['Ninh Binh', 105.9, 20.2, ['VNM'], 6000, 'ANN'],
  ['Hoa Binh', 105.3, 20.7, ['VNM'], 12000, 'ANN'],
  ['Penang', 100.4, 5.4, ['MYS'], 1500, 'GBR'],
  ['Malacca', 102.25, 2.25, ['MYS'], 4000, 'GBR'],
  ['Singapore', 103.82, 1.35, ['SGP'], 600, 'GBR'],
  ['Perak', 101.0, 4.6, ['MYS'], 15000, 'PRK'],
  ['Selangor', 101.5, 3.3, ['MYS'], 15000, 'SEL'],
  ['Negeri Sembilan', 102.1, 2.8, ['MYS'], 10000, ''],
  ['Johor', 103.4, 2.0, ['MYS'], 12000, 'JOH'],
  ['Pahang', 102.7, 3.8, ['MYS'], 18000, 'PAH'],
  ['Kuala Lipis', 101.9, 4.3, ['MYS'], 18000, 'PAH'],
  ['Terengganu', 103.0, 4.9, ['MYS'], 15000, 'TRG'],
  ['Kelantan', 102.0, 5.4, ['MYS'], 15000, 'KEL'],
  ['Kedah', 100.6, 6.1, ['MYS'], 15000, 'KED'],
];
