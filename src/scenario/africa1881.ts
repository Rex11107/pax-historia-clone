import type { NationProfile } from '../engine/types';

// Stati d'Africa e d'Arabia al 1° gennaio 1881 (fase 1 dell'estensione della mappa).
// Eserciti di pace stimati per ordine di grandezza; industria e finanze quasi nulle, coesione variabile.

type P = Omit<NationProfile, 'tag'>;

const base = (o: Partial<P> & Pick<P, 'name' | 'short' | 'adjective' | 'color' | 'capital'>): P => ({
  government: 'regno', leader: '', major: false,
  industry: 2, militaryQuality: 30, cohesion: 50, finance: 5, naval: 0, rail: 0,
  doctrine: 'defensive', armyPeace: 10000, debt: 0,
  temperament: 'diffidente verso gli stranieri, deciso a conservare l\'indipendenza',
  goals: ['preservare l\'indipendenza'], redLines: ['occupazione della capitale'],
  rivals: [], friends: [],
  ...o,
});

export const AFRICA_NATIONS: Record<string, P> = {
  // Corno d'Africa e valle del Nilo
  ETH: base({ name: 'Impero d\'Etiopia', short: ["l'", 'Etiopia'], adjective: 'etiope', color: '#3f8f4f', capital: [38.03, 11.85], government: 'impero', leader: 'Negus Neghesti Giovanni IV; re dello Scioa Menelik',
    militaryQuality: 45, cohesion: 45, finance: 8, armyPeace: 60000, temperament: 'fiero e sospettoso, vincitore dell\'Egitto a Gundet e Gura', goals: ['sbocco al mare a Massaua', 'tenere uniti i ras'], rivals: ['EGY'] }),
  // Africa orientale
  ZAN: base({ name: 'Sultanato di Zanzibar', short: ['', 'Zanzibar'], adjective: 'zanzibarino', color: '#b3473f', capital: [39.19, -6.16], government: 'sultanato', leader: 'Sultano Barghash bin Said',
    finance: 25, naval: 5, armyPeace: 5000, temperament: 'mercantile, legato al console britannico Kirk', goals: ['controllo delle carovane dell\'interno'], friends: ['GBR'], rivals: ['MIR'] }),
  // nascono in partita: la rivolta del Mahdi (1881-85) e il ritiro egiziano dall'Harar (1885)
  MAH: base({ name: 'Stato mahdista', short: ['lo ', 'Stato mahdista'], adjective: 'mahdista', color: '#5a4a2a', capital: [30.22, 13.18], government: 'teocrazia guerriera', leader: 'il Mahdi Muhammad Ahmad',
    spawned: true, militaryQuality: 45, cohesion: 65, finance: 3, armyPeace: 45000, temperament: 'guerra santa contro gli egiziani e gli infedeli', goals: ['cacciare gli egiziani dal Sudan', 'portare la guerra santa in Egitto e in Etiopia'], rivals: ['EGY', 'ETH', 'GBR'] }),
  HAR: base({ name: 'Emirato di Harar', short: ["l'", 'Harar'], adjective: 'hararino', color: '#9a6a9a', capital: [42.12, 9.31], government: 'emirato', leader: 'Emiro Abdullahi',
    spawned: true, cohesion: 45, finance: 6, armyPeace: 3000, temperament: 'città santa e mercato del caffè, stretta fra Scioa e Somali', goals: ['preservare l\'indipendenza'], rivals: ['ETH'] }),
  // sultanati del Corno: piccoli, si legano a una potenza con un trattato di protettorato più che con la guerra
  OBB: base({ name: 'Sultanato di Obbia', short: ['il ', 'Sultanato di Obbia'], adjective: 'obbiese', color: '#8e4fc4', capital: [48.53, 5.35], government: 'sultanato', leader: 'Sultano Yusuf Ali Kenadid',
    cohesion: 45, finance: 4, naval: 1, armyPeace: 2500, temperament: 'fondatore ambizioso, in cerca di un protettore contro i rivali', goals: ['tenere la costa da Obbia a El Dher'], rivals: ['MIG', 'ZAN'] }),
  MIG: base({ name: 'Sultanato della Migiurtinia', short: ['la ', 'Migiurtinia'], adjective: 'migiurtino', color: '#c4664f', capital: [50.75, 11.97], government: 'sultanato', leader: 'Boqor Osman Mahamud',
    cohesion: 50, finance: 6, naval: 2, armyPeace: 3000, temperament: 'signore della costa dei naufragi, geloso della sua indipendenza', goals: ['dominare il Capo Guardafui e i suoi commerci'], rivals: ['OBB'] }),
  WSG: base({ name: 'Sultanato dei Uarsangheli', short: ['i ', 'Uarsangheli'], adjective: 'uarsanghelo', color: '#4f8ac4', capital: [48.2, 11.16], government: 'sultanato', leader: 'il sultano di Las Khorey',
    cohesion: 50, finance: 3, armyPeace: 1500, temperament: 'piccolo sultanato costiero, commercia con Aden', goals: ['preservare l\'indipendenza'], friends: ['GBR'] }),
  AUS: base({ name: 'Sultanato dell\'Aussa', short: ["l'", 'Aussa'], adjective: 'aussino', color: '#d4a07a', capital: [41.44, 11.57], government: 'sultanato', leader: 'Sultano Mohammed Hanfadhe',
    cohesion: 55, finance: 4, armyPeace: 4000, temperament: 'padrone delle carovane fra la costa dancala e lo Scioa', goals: ['controllo della via del sale e delle carovane'] }),
  RAH: base({ name: 'Sultanato di Raheita', short: ['il ', 'Sultanato di Raheita'], adjective: 'raheitino', color: '#a094e0', capital: [43.2, 12.73], government: 'sultanato', leader: 'il sultano di Raheita',
    cohesion: 50, finance: 2, armyPeace: 800, temperament: 'piccolo sultanato dancalo, stretto fra Assab e Obock', goals: ['preservare l\'indipendenza'] }),
  TAG: base({ name: 'Sultanato di Tagiura', short: ['il ', 'Sultanato di Tagiura'], adjective: 'tagiurino', color: '#d07a6a', capital: [42.88, 11.78], government: 'sultanato', leader: 'il sultano di Tagiura',
    cohesion: 50, finance: 3, armyPeace: 1000, temperament: 'sultanato dancalo, ha venduto Obock alla Francia nel 1862', goals: ['commercio con l\'Harar e lo Scioa'], friends: ['FRA'] }),
  MIR: base({ name: 'Regno di Mirambo', short: ['', 'Unyamwezi'], adjective: 'nyamwezi', color: '#8a5a2b', capital: [32.07, -5.07], leader: 'Mtemi Mirambo', militaryQuality: 40, armyPeace: 12000,
    temperament: 'ambizioso, padrone delle vie dell\'avorio', goals: ['dominare le carovane fra la costa e i Grandi Laghi'], rivals: ['ZAN'] }),
  BUG: base({ name: 'Regno di Buganda', short: ['il ', 'Buganda'], adjective: 'ganda', color: '#5d4a9e', capital: [32.57, 0.31], leader: 'Kabaka Mutesa I', cohesion: 65, armyPeace: 20000, naval: 2,
    temperament: 'centralizzato, curioso delle religioni straniere', goals: ['egemonia sui Grandi Laghi'], rivals: ['BUN'] }),
  BUN: base({ name: 'Regno di Bunyoro', short: ['il ', 'Bunyoro'], adjective: 'nyoro', color: '#7b65b5', capital: [31.72, 1.68], leader: 'Omukama Kabarega', armyPeace: 10000, rivals: ['BUG', 'EGY'] }),
  RWA: base({ name: 'Regno del Ruanda', short: ['il ', 'Ruanda'], adjective: 'ruandese', color: '#4f7a3a', capital: [29.75, -2.35], government: 'regno', leader: 'Mwami Kigeli IV Rwabugiri', cohesion: 70, militaryQuality: 40, armyPeace: 15000, rivals: ['BDI'] }),
  BDI: base({ name: 'Regno del Burundi', short: ['il ', 'Burundi'], adjective: 'burundese', color: '#6aa04a', capital: [29.93, -3.43], leader: 'Mwami Mwezi IV Gisabo', cohesion: 60, armyPeace: 8000, rivals: ['RWA'] }),
  NGO: base({ name: 'Ngoni', short: ['gli ', 'Ngoni'], adjective: 'ngoni', color: '#9a6d3a', capital: [35.65, -10.68], government: 'confederazione guerriera', leader: 'capi ngoni di Songea', militaryQuality: 40, armyPeace: 6000 }),
  // Congo e Africa centrale
  UTE: base({ name: 'Dominio di Tippu Tip', short: ['il ', 'Manyema'], adjective: 'manyema', color: '#9c7a3c', capital: [26.65, -4.43], government: 'sultanato mercantile', leader: 'Hamed bin Muhammed (Tippu Tip)',
    militaryQuality: 40, finance: 15, armyPeace: 8000, temperament: 'mercante di avorio e schiavi, armato di fucili', goals: ['monopolio dell\'avorio del Congo orientale'], friends: ['ZAN'] }),
  YEK: base({ name: 'Regno di Garanganze', short: ['il ', 'Garanganze'], adjective: 'yeke', color: '#a35d8a', capital: [26.97, -10.4], leader: 'Mwami Msiri', armyPeace: 8000, goals: ['rame e avorio del Katanga'], rivals: ['LUB', 'LUN'] }),
  LUN: base({ name: 'Impero Lunda', short: ['il ', 'Lunda'], adjective: 'lunda', color: '#6d8f5a', capital: [22.5, -8.5], government: 'impero', leader: 'Mwant Yav Mbumba', cohesion: 35, armyPeace: 8000, rivals: ['YEK'] }),
  LUB: base({ name: 'Impero Luba', short: ['il ', 'Luba'], adjective: 'luba', color: '#7d6a4a', capital: [25.5, -8.0], government: 'impero', leader: 'Mulopwe Kasongo Kalombo', cohesion: 35, armyPeace: 8000, rivals: ['YEK'] }),
  KUB: base({ name: 'Regno Kuba', short: ['il ', 'Kuba'], adjective: 'kuba', color: '#a8844a', capital: [21.8, -4.9], leader: 'Nyim Kot aMbweeky', cohesion: 60, armyPeace: 5000 }),
  YAK: base({ name: 'Regno Yaka', short: ['lo ', 'Yaka'], adjective: 'yaka', color: '#8f6d4a', capital: [17.5, -6.5], leader: 'Kiamfu', armyPeace: 5000 }),
  TEK: base({ name: 'Regno Teke', short: ['il ', 'Teke'], adjective: 'teke', color: '#5b8a7a', capital: [15.85, -2.75], leader: 'Makoko Iloo I', armyPeace: 4000, temperament: 'ha appena firmato un trattato con Brazza (1880)', friends: ['FRA'] }),
  KGO: base({ name: 'Regno del Congo', short: ['il ', 'Congo'], adjective: 'congolese', color: '#4a6f8f', capital: [14.25, -6.27], leader: 'Mani Kongo Pedro V', cohesion: 30, armyPeace: 3000, temperament: 'vassallo nominale del Portogallo', friends: ['POR'] }),
  RAB: base({ name: 'Dominio di Rabih', short: ['il ', 'Dar Kuti'], adjective: 'rabihista', color: '#8f4a4a', capital: [22.5, 8.5], government: 'signoria militare', leader: 'Rabih az-Zubayr', militaryQuality: 50, armyPeace: 8000,
    temperament: 'condottiero schiavista, erede delle bande di Zubayr', goals: ['conquistare il Bornu'], rivals: ['EGY', 'BOR', 'WAD'] }),
  // Sudan centrale e occidentale
  WAD: base({ name: 'Sultanato del Uadai', short: ['il ', 'Uadai'], adjective: 'uadaiano', color: '#b56a3a', capital: [20.83, 13.83], government: 'sultanato', leader: 'Sultano Yusuf', militaryQuality: 40, armyPeace: 15000, rivals: ['BOR', 'EGY'] }),
  BOR: base({ name: 'Sultanato del Bornu', short: ['il ', 'Bornu'], adjective: 'bornuano', color: '#a8b85a', capital: [14.08, 13.12], government: 'sultanato', leader: 'Shehu Bukar Garbai', armyPeace: 15000, rivals: ['WAD', 'SOK'] }),
  DMG: base({ name: 'Sultanato del Damagaram', short: ['il ', 'Damagaram'], adjective: 'zinderino', color: '#5aa85a', capital: [8.99, 13.8], government: 'sultanato', leader: 'Sultano Tanimoun', militaryQuality: 40, armyPeace: 6000, friends: ['BOR'] }),
  SOK: base({ name: 'Califfato di Sokoto', short: ['il ', 'Califfato di Sokoto'], adjective: 'sokotino', color: '#7fa8d6', capital: [5.24, 13.06], government: 'califfato', leader: 'Califfo Muazu; emiri di Kano, Zaria, Bauchi, Adamaua',
    cohesion: 40, finance: 10, armyPeace: 50000, temperament: 'federazione di emirati, orgogliosa del jihad di Usman dan Fodio', goals: ['tenere unito il califfato', 'commercio transahariano'], rivals: ['BOR'] }),
  BRG: base({ name: 'Stati del Borgu', short: ['il ', 'Borgu'], adjective: 'borgu', color: '#5ab58f', capital: [4.52, 9.88], government: 'confederazione', leader: 'Re di Bussa e di Nikki', cohesion: 30, armyPeace: 6000 }),
  YOR: base({ name: 'Ibadan', short: ['', 'Ibadan'], adjective: 'yoruba', color: '#3f63b5', capital: [3.9, 7.38], government: 'repubblica militare', leader: 'Are Ona Kakanfo Latosa', militaryQuality: 40, armyPeace: 15000,
    temperament: 'nel mezzo delle guerre yoruba (Kiriji)', goals: ['egemonia sulla Yorubaland'], rivals: ['DAH'] }),
  BNN: base({ name: 'Regno del Benin', short: ['il ', 'Benin'], adjective: 'edo', color: '#b5893f', capital: [5.62, 6.34], leader: 'Oba Adolo', cohesion: 55, armyPeace: 8000 }),
  ARO: base({ name: 'Confederazione Aro', short: ['gli ', 'Aro'], adjective: 'aro', color: '#9e4fae', capital: [7.9, 5.38], government: 'confederazione oracolare', leader: 'consiglio di Arochukwu', finance: 15, armyPeace: 5000 }),
  DAH: base({ name: 'Regno del Dahomey', short: ['il ', 'Dahomey'], adjective: 'dahomeyano', color: '#4f9e4f', capital: [1.99, 7.18], leader: 'Re Glele', militaryQuality: 50, cohesion: 65, armyPeace: 12000,
    temperament: 'militarista, con il corpo delle amazzoni', goals: ['razzie verso Abeokuta', 'tenere Uidah'], rivals: ['YOR', 'FRA'] }),
  ASA: base({ name: 'Impero Ascianti', short: ["l'", 'Ascianti'], adjective: 'ascianti', color: '#c4508f', capital: [-1.62, 6.69], government: 'confederazione monarchica', leader: 'Asantehene Mensa Bonsu', militaryQuality: 45, cohesion: 50, finance: 15, armyPeace: 20000,
    temperament: 'ferito dalla presa di Kumasi (1874), diffidente verso Londra', goals: ['riprendere le vie verso la costa'], rivals: ['GBR'] }),
  MOS: base({ name: 'Regni Mossi', short: ['i ', 'Mossi'], adjective: 'mossi', color: '#8fb5e0', capital: [-1.53, 12.37], government: 'regno', leader: 'Mogho Naba Sanem', cohesion: 55, armyPeace: 10000 }),
  KNG: base({ name: 'Impero di Kong', short: ['il ', 'Kong'], adjective: 'kong', color: '#c4a14a', capital: [-4.6, 9.15], government: 'impero mercantile', leader: 'Karamoko Ule Uattara', finance: 15, armyPeace: 8000, rivals: ['WAS'] }),
  WAS: base({ name: 'Impero del Uassulu', short: ['il ', 'Uassulu'], adjective: 'uassulunké', color: '#d48a5a', capital: [-9.0, 10.0], government: 'impero', leader: 'Almamy Samori Turé', militaryQuality: 50, cohesion: 55, armyPeace: 20000, doctrine: 'mobile',
    temperament: 'conquistatore energico, armato di fucili moderni', goals: ['espandersi verso il Niger', 'tenere lontani i francesi'], rivals: ['FRA', 'KNG', 'TUK'] }),
  TUK: base({ name: 'Impero tukulor', short: ["l'", 'Impero tukulor'], adjective: 'tukulor', color: '#a86ad4', capital: [-6.27, 13.45], government: 'califfato', leader: 'Ahmadu Tall', cohesion: 30, armyPeace: 20000,
    temperament: 'stato in crisi, con i fratelli di Ahmadu in rivolta', goals: ['difendere Ségou dai francesi'], rivals: ['FRA', 'WAS'] }),
  FTO: base({ name: 'Futa Toro', short: ['il ', 'Futa Toro'], adjective: 'futanké', color: '#d4a56a', capital: [-13.26, 15.66], government: 'almamiato', leader: 'almamy del Futa Toro', cohesion: 30, armyPeace: 4000, rivals: ['FRA'] }),
  FJA: base({ name: 'Almamiato del Futa Gialon', short: ['il ', 'Futa Gialon'], adjective: 'fula', color: '#8fd4b0', capital: [-11.83, 10.63], government: 'almamiato', leader: 'Almamy Ibrahima Sori Dara', cohesion: 45, armyPeace: 8000 }),
  LIB: base({ name: 'Repubblica di Liberia', short: ['la ', 'Liberia'], adjective: 'liberiano', color: '#7ad47a', capital: [-10.8, 6.3], government: 'repubblica', leader: 'Presidente Anthony W. Gardiner', finance: 10, armyPeace: 1500, debt: 100,
    temperament: 'piccola repubblica costiera, indebitata con Londra', goals: ['farsi riconoscere i confini dell\'interno'], friends: [] }),
  // Africa australe
  TRA: base({ name: 'Repubblica del Transvaal', short: ['il ', 'Transvaal'], adjective: 'boero', color: '#4fc4b0', capital: [28.19, -25.75], government: 'repubblica', leader: 'Triumvirato Kruger, Pretorius, Joubert',
    militaryQuality: 55, cohesion: 70, finance: 8, armyPeace: 7000, doctrine: 'mobile', debt: 300,
    temperament: 'in rivolta contro l\'annessione britannica del 1877: guerra aperta da dicembre', goals: ['riconquistare l\'indipendenza'], redLines: ['annessione britannica'], rivals: ['GBR', 'ZUL'], friends: ['OFS'] }),
  OFS: base({ name: 'Stato Libero dell\'Orange', short: ["l'", 'Orange'], adjective: 'orangista', color: '#d4c46a', capital: [26.21, -29.12], government: 'repubblica', leader: 'Presidente Johannes Brand', militaryQuality: 50, cohesion: 70, finance: 12, armyPeace: 3000,
    temperament: 'prudente, neutrale ma vicino ai fratelli del Transvaal', friends: ['TRA'] }),
  ZUL: base({ name: 'Zululand', short: ['lo ', 'Zululand'], adjective: 'zulu', color: '#b04fc4', capital: [31.42, -28.32], government: 'tredici capi sotto residente britannico', leader: 'Cetshwayo in esilio; capi Zibhebhu e Hamu', cohesion: 25, militaryQuality: 45, armyPeace: 5000,
    temperament: 'regno spezzato dopo la guerra del 1879', goals: ['riavere il re Cetshwayo'], rivals: ['TRA'] }),
  SWZ: base({ name: 'Regno dello Swaziland', short: ['lo ', 'Swaziland'], adjective: 'swazi', color: '#8fc44f', capital: [31.13, -26.32], leader: 'Ngwenyama Mbandzeni', armyPeace: 5000 }),
  NDE: base({ name: 'Regno Matabele', short: ['il ', 'Matabeleland'], adjective: 'matabele', color: '#7ac44f', capital: [28.58, -20.15], leader: 'Re Lobengula', militaryQuality: 45, cohesion: 60, armyPeace: 15000, rivals: ['NGW'] }),
  NGW: base({ name: 'Regno dei Bamangwato', short: ['i ', 'Bamangwato'], adjective: 'ngwato', color: '#4f86c4', capital: [26.5, -23.03], leader: 'Kgosi Khama III', cohesion: 65, armyPeace: 4000, friends: ['GBR'], rivals: ['NDE'] }),
  LOZ: base({ name: 'Regno dei Lozi', short: ['il ', 'Barotseland'], adjective: 'lozi', color: '#c44f86', capital: [23.05, -15.2], leader: 'Litunga Lewanika', cohesion: 40, armyPeace: 8000, naval: 1 }),
  OVI: base({ name: 'Regno del Bailundo', short: ['il ', 'Bailundo'], adjective: 'ovimbundu', color: '#86d4d4', capital: [15.87, -12.2], leader: 'Soba Ekuikui II', finance: 10, armyPeace: 6000, temperament: 'carovanieri della gomma e della cera', friends: [] }),
  MAD: base({ name: 'Regno del Madagascar', short: ['il ', 'Madagascar'], adjective: 'malgascio', color: '#45b84a', capital: [47.52, -18.91], government: 'monarchia', leader: 'Regina Ranavalona II; primo ministro Rainilaiarivony',
    industry: 4, militaryQuality: 35, cohesion: 45, finance: 15, naval: 2, armyPeace: 20000, debt: 50, temperament: 'merina, modernizzatrice e protestante, ostile alle pretese francesi', goals: ['sovranità su tutta l\'isola'], rivals: ['FRA'], friends: ['GBR'] }),
  // Arabia
  OMA: base({ name: 'Sultanato di Mascate e Oman', short: ["l'", 'Oman'], adjective: 'omanita', color: '#5d3fb5', capital: [58.59, 23.61], government: 'sultanato', leader: 'Sultano Turki bin Said', finance: 10, naval: 4, armyPeace: 5000,
    temperament: 'impoverito dalla separazione da Zanzibar, protetto dagli inglesi', friends: ['GBR'], rivals: ['ZAN'] }),
  TRU: base({ name: 'Stati della Tregua', short: ['gli ', 'Stati della Tregua'], adjective: 'trucial', color: '#3fb5c4', capital: [55.39, 25.35], government: 'sceiccati sotto tregua britannica', leader: 'sceicchi di Abu Dhabi, Dubai, Sharja', cohesion: 30, finance: 8, naval: 2, armyPeace: 2000, friends: ['GBR'] }),
  BHR: base({ name: 'Bahrein', short: ['il ', 'Bahrein'], adjective: 'bahreinita', color: '#c43f5d', capital: [50.58, 26.22], government: 'sceiccato', leader: 'Sceicco Isa bin Ali Al Khalifa', micro: true, finance: 20, armyPeace: 0, friends: ['GBR'] }),
};

/** Opinioni iniziali africane e arabe (A verso B). */
export const AFRICA_OPINIONS: [string, string, number][] = [
  ['ETH', 'EGY', -60], ['EGY', 'ETH', -40],
  ['TRA', 'GBR', -85], ['GBR', 'TRA', -50], ['OFS', 'TRA', 40], ['TRA', 'OFS', 40], ['OFS', 'GBR', -10],
  ['ZUL', 'GBR', -40], ['ASA', 'GBR', -40], ['GBR', 'ASA', -15],
  ['MAD', 'FRA', -35], ['FRA', 'MAD', -20], ['MAD', 'GBR', 20],
  ['WAS', 'FRA', -30], ['TUK', 'FRA', -35], ['FRA', 'TUK', -15], ['DAH', 'YOR', -40], ['YOR', 'DAH', -50],
  ['BUG', 'BUN', -40], ['BUN', 'BUG', -40], ['BUN', 'EGY', -40], ['RWA', 'BDI', -30], ['BDI', 'RWA', -30],
  ['NDE', 'NGW', -30], ['NGW', 'NDE', -30], ['NGW', 'GBR', 30], ['ZAN', 'GBR', 30], ['GBR', 'ZAN', 20], ['ZAN', 'MIR', -30], ['MIR', 'ZAN', -20],
  ['OMA', 'GBR', 30], ['TRU', 'GBR', 35], ['ARA', 'TUR', -30], ['TUR', 'ARA', -20], ['WAD', 'BOR', -30], ['BOR', 'WAD', -30], ['RAB', 'BOR', -30],
  ['TEK', 'FRA', 30], ['KGO', 'POR', 20], ['SOK', 'BOR', -20],
  ['OBB', 'MIG', -40], ['MIG', 'OBB', -40], ['OBB', 'ZAN', -20], ['ZAN', 'OBB', -15], ['TAG', 'FRA', 20], ['FRA', 'TAG', 10], ['WSG', 'GBR', 15], ['AUS', 'ETH', -10], ['RAH', 'TAG', 10],
];
