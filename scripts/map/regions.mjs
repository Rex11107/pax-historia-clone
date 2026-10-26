// Regioni storiche: il livello "contenitore" sopra le province di gioco.
// Servono a trattati, rivendicazioni e AI ("cedo la Galizia"), e come etichette a zoom intermedio.
//
// Priorità: padre d'epoca (provincia prussiana, Kronland, governatorato russo) dove c'è; altrove
// compartimenti italiani del 1881, vilayet ottomani ricostruiti dalle province turche moderne,
// regioni storiche approssimate dalle suddivisioni moderne. Mai un nome che nel 1881 non avesse senso.

const HIST = {
  // Prussia, Baviera, Baden
  Brandenburg: 'Brandeburgo', Posen: 'Posnania', Hannover: 'Hannover', 'Schleswig-Holstein': 'Schleswig-Holstein', Hohenzollern: 'Hohenzollern',
  // Kronländer
  'Erzherzogtum Österreich unter der Enns': 'Bassa Austria', 'Erzherzogtum Österreich ob der Enns': 'Alta Austria', 'Herzogtum Steiermark': 'Stiria',
  'Herzogtum Ober- und Niederschlesien': 'Slesia austriaca', 'Herzogtum Salzburg': 'Salisburgo', 'Königreich Böhmen': 'Boemia', 'Markgrafschaft Mähren': 'Moravia',
  'Triest mit Gebiet': 'Litorale austriaco', 'Gefürstete Grafschaft Görz und Gradisca': 'Litorale austriaco', 'Markgrafschaft Istrien': 'Litorale austriaco',
  'Land Vorarlberg': 'Tirolo e Vorarlberg', 'Gefürstete Grafschaft Tirol': 'Tirolo e Vorarlberg', 'Herzogtum Krain': 'Carniola', 'Königreich Dalmatien': 'Dalmazia',
  'Herzogtum Kärnten': 'Carinzia', 'Herzogtum Bukowina': 'Bucovina', 'Königreich Galizien und Lodomerien': 'Galizia',
  // governatorati russi (RISTAT 1897)
  Kurland: 'Curlandia', Viatka: 'Vjatka', Warsaw: 'Varsavia', Lublin: 'Lublino', Volhynian: 'Volinia', Podolsk: 'Podolia', Kherson: 'Cherson',
  Chernigov: 'Černigov', Moscow: 'Mosca', Orel: 'Orël', Kharkov: "Char'kov", Taurida: 'Tauride', Ryazan: 'Rjazan', Voronezh: 'Voronež',
  'Don (Cosacchi del Don)': 'Terra dei Cosacchi del Don', 'Black Sea': 'Kuban', Kutaisi: 'Kutais', Elisabethpol: 'Elisavetpol', Dagestan: 'Daghestan',
  'Nizhny Novgorod': 'Nižnij Novgorod', Astrakhan: 'Astrachan', Arkhangelsk: 'Arcangelo', 'St. Petersburg': 'San Pietroburgo', Yaroslavl: 'Jaroslavl',
  Oulu: 'Uleåborg', 'Abo-Björneborg': 'Turku e Pori', Häme: 'Tavastia', Uusimaa: 'Nylandia', Vyborg: 'Viipuri', Ural: "Ural'sk", Fiume: 'Croazia-Slavonia',
};
const TRENTINO = new Set(['Trento', 'Rovereto', 'Riva', 'Tione', 'Cles', 'Borgo', 'Primiero', 'Cavalese', 'Mezzolombardo']);

const IT = {
  Piemonte: 'Piemonte', "Valle d'Aosta": 'Piemonte', Liguria: 'Liguria', Lombardia: 'Lombardia', Veneto: 'Veneto', 'Friuli-Venezia Giulia': 'Veneto',
  'Emilia-Romagna': 'Emilia', Toscana: 'Toscana', Marche: 'Marche', Umbria: 'Umbria', Lazio: 'Roma', Abruzzo: 'Abruzzi e Molise', Molise: 'Abruzzi e Molise',
  Campania: 'Campania', Apulia: 'Puglie', Basilicata: 'Basilicata', Calabria: 'Calabrie', Sicily: 'Sicilia', Sardegna: 'Sardegna', 'Trentino-Alto Adige': 'Tirolo e Vorarlberg',
};
const IT_ISO = { 'IT-RI': 'Umbria' };

const FR = {
  'Hauts-de-France': 'Fiandra e Piccardia', 'Grand Est': 'Champagne e Lorena', "Provence-Alpes-Côte-d'Azur": 'Provenza', 'Auvergne-Rhône-Alpes': 'Lionese, Alvernia e Savoia',
  'Nouvelle-Aquitaine': 'Guienna e Guascogna', Occitanie: 'Linguadoca', 'Bourgogne-Franche-Comté': 'Borgogna e Franca Contea', 'Pays de la Loire': 'Angiò e Vandea',
  Bretagne: 'Bretagna', Normandie: 'Normandia', Corse: 'Corsica', 'Centre-Val de Loire': 'Orléanais e Berry', 'Île-de-France': 'Île-de-France',
};
const ES = {
  'Andalucía': 'Andalusia', 'Cataluña': 'Catalogna', 'Aragón': 'Aragona', 'Castilla y León': 'Vecchia Castiglia e León', Cantabria: 'Vecchia Castiglia e León', 'La Rioja': 'Vecchia Castiglia e León',
  'Castilla-La Mancha': 'Nuova Castiglia', Madrid: 'Nuova Castiglia', Valenciana: 'Valenza', Murcia: 'Murcia', Extremadura: 'Estremadura', Galicia: 'Galizia',
  Asturias: 'Asturie', 'País Vasco': 'Paesi Baschi e Navarra', 'Foral de Navarra': 'Paesi Baschi e Navarra', 'Islas Baleares': 'Baleari',
};
const PT = { Norte: 'Minho e Trás-os-Montes', 'Norte, Centro': 'Beira', Centro: 'Beira', Lisbon: 'Estremadura portoghese', Alentejo: 'Alentejo', Algarve: 'Algarve' };
const GB = {
  'North East': 'Inghilterra settentrionale', 'North West': 'Inghilterra settentrionale', 'Yorkshire and the Humber': 'Inghilterra settentrionale',
  'East Midlands': 'Midlands', 'West Midlands': 'Midlands', East: 'Anglia orientale', 'Greater London': 'Londra e Sud-est', 'South East': 'Londra e Sud-est',
  'South West': 'Inghilterra sud-occidentale', 'West Wales and the Valleys': 'Galles', 'East Wales': 'Galles', 'Highlands and Islands': 'Highlands',
  'North Eastern': 'Lowlands scozzesi', Eastern: 'Lowlands scozzesi', 'South Western': 'Lowlands scozzesi', 'Northern Ireland': 'Ulster',
};
const IE = { CN: 'Ulster', DL: 'Ulster', MN: 'Ulster', G: 'Connacht', LM: 'Connacht', MO: 'Connacht', RN: 'Connacht', SO: 'Connacht', CE: 'Munster', CO: 'Munster', KY: 'Munster', LK: 'Munster', TA: 'Munster', WD: 'Munster' };
const HU = {
  'Western Transdanubia': 'Transdanubio', 'Central Transdanubia': 'Transdanubio', 'Southern Transdanubia': 'Transdanubio', 'Central Hungary': 'Alföld',
  'Northern Hungary': 'Alta Ungheria', 'Northern Great Plain': 'Alföld', 'Great Southern Plain': 'Alföld',
};
// vilayet ottomani (1881) dalle province turche moderne, per numero di targa
const TR = {};
const vil = (name, plates) => plates.split(' ').forEach((n) => { TR[`TR-${n}`] = name; });
vil('Adrianopoli', '22 39 59 17');
vil('Costantinopoli', '34');
vil('Brussa', '16 10 11 26 43 03 41 54 77 64');
vil('Aidin', '35 45 09 20 48');
vil('Konya', '42 07 32 15 70 51 68');
vil('Angora', '06 66 40 50 38 71');
vil('Kastamonu', '37 18 57 14 81 67 74 78');
vil('Trebisonda', '61 55 52 28 53 08 29 69');
vil('Sivas', '58 05 60 19');
vil('Erzurum', '25 24 04 36 75 76');
vil('Van', '65 30');
vil('Bitlis', '13 49 56 12');
vil('Diyarbakır', '21 47 72 73');
vil('Mamuret-ül-Aziz', '23 44 62 02');
vil('Aleppo', '27 63 46 79 31');
vil('Adana', '01 33 80');

/**
 * Nome della regione per un pezzo di provincia.
 * @param {{modern:string, iso:string, reg:string|null, name:string, owner:string}} p
 * @param {[number, number]} c centro [lon, lat]
 * @returns {string|null} null = deciso dopo (vicini o nome della provincia)
 */
export function regionOf(p, c) {
  const [lon, lat] = c;
  const reg = String(p.reg || '');
  const iso = String(p.iso || '');
  // chi possiede il deserto non prende il nome delle province ottomane vicine
  if (p.owner === 'ARA') return 'Arabia';
  if (p.owner === 'GER' && p.modern === 'DNK') return 'Schleswig-Holstein';
  if (p.owner === 'RUS' && p.modern === 'TUR') return 'Kutais';
  if (reg.startsWith('H:')) {
    const h = reg.slice(2);
    if (h === 'Gefürstete Grafschaft Tirol' && TRENTINO.has(p.name)) return 'Trentino';
    if (h === 'Baviera' && p.name === 'Palatinato') return 'Palatinato';
    if (h === 'Ungheria') {
      if (p.modern === 'SVK') return 'Alta Ungheria';
      if (p.modern === 'UKR') return 'Rutenia subcarpatica';
      if (p.modern === 'SRB') return 'Voivodina';
      if (p.modern === 'ROU') return ['RO-TM', 'RO-CS', 'RO-AR'].includes(iso) ? 'Banato' : ['RO-BH', 'RO-SM', 'RO-SJ', 'RO-MM'].includes(iso) ? 'Partium' : 'Transilvania';
      if (p.modern === 'HUN') return HU[p.regModern] || 'Ungheria';
      return 'Transdanubio';
    }
    return HIST[h] || h;
  }
  switch (p.modern) {
    case 'ITA': return p.owner === 'ITA' ? IT_ISO[iso] || IT[reg] || null : null;
    case 'VAT': case 'SMR': return 'Roma';
    case 'FRA': return p.owner === 'GER' ? 'Alsazia-Lorena' : FR[reg] || null;
    case 'MCO': return 'Provenza';
    case 'DZA': return p.owner === 'TUR' ? 'Tripolitania' : p.owner !== 'FRA' ? 'Marocco' : lon < 1.2 ? 'Orano' : lon < 5.0 ? 'Algeri' : 'Costantina';
    case 'ESP': return ES[reg] || null;
    case 'AND': return 'Catalogna';
    case 'PRT': return PT[reg] || null;
    case 'GBR': return GB[reg] || null;
    case 'IRL': return IE[iso.replace('IE-', '')] || 'Leinster';
    case 'IMN': return 'Inghilterra settentrionale';
    case 'JEY': case 'GGY': case 'ALD': return 'Isole del Canale';
    case 'MLT': return 'Malta';
    case 'CYP': case 'CYN': case 'ESB': case 'WSB': return 'Cipro';
    case 'SWE': return lat >= 60.6 ? 'Norrland' : lat >= 58.7 ? 'Svealand' : 'Götaland';
    case 'NOR': return lat >= 65 ? 'Norvegia settentrionale' : lat >= 62.3 ? 'Trøndelag' : lon < 7.6 ? 'Norvegia occidentale' : 'Norvegia orientale';
    case 'DNK': return 'Danimarca';
    case 'ISL': return 'Islanda';
    case 'FRO': return 'Isole Fær Øer';
    case 'NLD': return 'Paesi Bassi';
    case 'BEL': return reg === 'Walloon' ? 'Vallonia' : 'Fiandre e Brabante';
    case 'LUX': return 'Lussemburgo';
    case 'CHE': return null; // lingua: decisa dal chiamante
    case 'GRC':
      if (p.owner === 'GRE') return lat < 38.3 && lon < 23.4 ? 'Peloponneso' : 'Grecia continentale e isole';
      if (lat < 35.8) return 'Creta';
      if (lon > 25.5 && lat < 40) return "Isole dell'Egeo";
      if (lat > 40.1) return lon > 24.3 ? 'Adrianopoli' : 'Salonicco';
      return lon < 21.6 ? 'Giannina' : 'Tessaglia';
    case 'ALB': return lat > 41.4 ? 'Scutari' : lat > 40.6 ? 'Monastir' : 'Giannina';
    case 'MKD': return lon < 21.3 ? 'Monastir' : lat > 41.9 ? 'Kosovo' : 'Salonicco';
    case 'KOS': return 'Kosovo';
    case 'SRB': return p.owner === 'SER' ? 'Serbia' : p.owner === 'TUR' ? 'Kosovo' : null;
    case 'MNE': return p.owner === 'MNE' ? 'Montenegro' : p.owner === 'TUR' ? 'Kosovo' : null;
    case 'BIH': return 'Bosnia-Erzegovina';
    case 'BGR':
      if (p.owner === 'BUL') return 'Bulgaria';
      return iso === 'BG-01' ? 'Salonicco' : ['BG-21', 'BG-09'].includes(iso) ? 'Adrianopoli' : 'Rumelia orientale';
    case 'ROU':
      if (p.owner !== 'ROM') return null;
      return ['RO-CT', 'RO-TL'].includes(iso) ? 'Dobrugia' : ['RO-SV', 'RO-BT', 'RO-IS', 'RO-NT', 'RO-BC', 'RO-VS', 'RO-GL', 'RO-VN'].includes(iso) ? 'Moldavia' : 'Valacchia';
    case 'TUR': return TR[iso] || null;
    case 'SYR': return ['SY-HL', 'SY-ID', 'SY-RA', 'SY-HA', 'SY-DY'].includes(iso) ? 'Aleppo' : 'Siria';
    case 'LBN': return 'Monte Libano';
    case 'ISR': case 'PSX': return 'Palestina';
    case 'JOR': return 'Siria';
    case 'IRQ': return lat > 35.3 ? 'Mosul' : lat > 32.3 ? 'Baghdad' : 'Bassora';
    case 'SAU': case 'KWT': return p.owner === 'TUR' ? 'Hegiaz' : 'Arabia';
    case 'EGY': return lat >= 29.6 ? 'Basso Egitto' : 'Alto Egitto';
    case 'LBY': return lon < 19 ? 'Tripolitania' : 'Cirenaica';
    case 'TUN': return 'Tunisia';
    case 'MAR': case 'SAH': return 'Marocco';
    case 'IRN': return lat > 36.4 && lon < 48.6 ? 'Azerbaigian persiano' : lat > 36.0 ? 'Gilan e Mazandaran' : 'Persia occidentale';
    case 'GIB': return 'Gibilterra';
    case 'LIE': return 'Liechtenstein';
    default: return null;
  }
}
