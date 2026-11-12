// Risorse fuori da Europa, Africa e Arabia (1881): Asia orientale e meridionale, Sud-est asiatico, Asia centrale,
// Persia, Siberia, Americhe e Oceania. Come per l'Europa: una risorsa di base dalla geografia della provincia
// (suddivisione moderna ISO 3166-2, latitudine, terreno) più i giacimenti e i distretti noti o sfruttati nel 1881.
// Le scelte storiche non ovvie hanno il loro commento: il caffè di Ceylon (la ruggine non l'ha ancora sostituito
// col tè), i nitrati di Tarapacá (peruviani fino alla guerra del Pacifico, ma il luogo è quello), l'oppio di
// Bihar, Malwa, Sichuan e Yunnan, lo stagno di Larut e Bangka, la lana australiana e del Río de la Plata.

import type { ProvinceData } from './types';
import type { ResourceId } from './resources';

type Pick = (...w: [ResourceId, number][]) => ResourceId;

const set = (s: string) => new Set(s.split(' '));
const sub = (p: ProvinceData) => (p.iso ?? '').split('-')[1] ?? '';

// --- Asia orientale ---
const CN_PASCOLI = set('XZ QH');
const CN_MANCIURIA = set('HL JL LN');
const CN_NORD = set('HE SD HA SX SN BJ TJ GS NX');
const CN_TE = set('FJ JX HN AH ZJ'); // colline del tè (Wuyi, Keemun, Anhua, Longjing)
const CN_OPPIO = set('SC CQ YN GZ'); // l'oppio indigeno del sud-ovest supera già quello importato
// --- India ---
const IN_RISO_IUTA = set('WB'); // Bengala: riso e iuta del delta
const IN_OPPIO = set('BR JH'); // agenzia dell'oppio di Patna
const IN_GANGE = set('UP');
const IN_PUNJAB = set('PB HR DH CH');
const IN_DECCAN = set('MH TG MP CT KA'); // terre nere del cotone (Berar, Khandesh, Dharwar)
const IN_SUD = set('AP TN PY');
const IN_MALABAR = set('KL GA');
const IN_NORDEST = set('AS ML NL MN MZ TR AR SK');
const IN_MONTI = set('HP UT JK LA');
// --- Sud-est asiatico (Indie olandesi per isola) ---
const ID_GIAVA = set('JB JT JI YO BT JK');
const ID_SUMATRA = set('AC SU SB RI JA SS BE LA BB KR');
const ID_BORNEO = set('KI KS KT KB KU');
const ID_CELEBES = set('SN SG SR ST GO SA');
const ID_MOLUCCHE = set('MA MU');
const ID_SONDA = set('NB NT BA');
// --- Asia centrale ---
const UZ_OASI = set('FA AN NG SA BU XO TO TK SI JI QA'); // Fergana, Samarcanda, Bukhara, Khiva
// --- Stati Uniti ---
const US_GRANO = set('ND SD MN WI IA IL IN OH NE KS MO MI');
const US_COTONE = set('MS AL GA SC AR TX');
const US_TABACCO = set('VA KY NC TN MD');
const US_PASCOLI = set('WY MT CO NM AZ UT NV ID OK');
const US_FORESTE = set('WA OR ME');
const US_NORDEST = set('VT NH MA CT RI');
const US_MEDIO = set('NY PA NJ DE WV DC');
// --- Canada ---
const CA_NORD = set('YT NT NU');
const CA_PRATERIE = set('AB SK MB');
const CA_MARITTIME = set('NB NS PE NL');
// --- Messico e America centrale ---
const MX_NORD = set('SON CHH COA DUR NLE TAM BCN BCS SIN');
const MX_CENTRO = set('ZAC SLP AGU GUA QUE HID MEX CMX JAL MIC PUE TLA NAY COL');
const MX_SUD = set('OAX CHP GRO TAB');
const MX_YUC = set('YUC CAM ROO');
// --- Brasile ---
const BR_AMAZZONIA = set('AM PA AC RO RR AP');
const BR_SERTAO = set('MA PI CE RN PB');
const BR_ZUCCHERO = set('PE AL SE BA');
const BR_CAFFE = set('RJ ES SP');
const BR_SUD = set('PR SC');
const BR_CENTRO = set('GO MT MS TO DF');
// --- Argentina, Cile, Perù, Bolivia ---
const AR_PAMPA = set('B C S X E L');
const AR_VINO = set('M J');
const AR_NORD = set('A Y K F G H P N W D');
const CL_NORD = set('AP TA AN AT');
const CL_CENTRO = set('CO VS RM LI ML NB BI');
const PE_AMAZZONIA = set('LOR UCA MDD SAM AMA');
const PE_COSTA = set('TUM PIU LAM LAL ANC LIM CAL ICA');
const BO_ALTIPIANO = set('L O P');
const BO_ORIENTE = set('S B N');
// --- isole tropicali ---
const ANTILLE_ZUCCHERO = set('BRB LCA VCT ATG KNA MTQ GLP DMA MSR VIR CUW ABW XMONTSERRAT XANGUILLA XTORTOLA XSTBARTH MAF');
const PACIFICO = set('SLB VUT NCL TON WSM PYF FSM PLW GUM ASM NIU XNORFOLK XPITCAIRN XRARO XNAURU XJALUIT XFUNAFUTI XTARAWA XSAIPAN XCHUUK XYAP XUVEA XGAMBIER XTUBUAI XCOCOS');

/** Risorsa di base fuori da Europa, Africa e Arabia; undefined = la provincia segue le regole europee e africane. */
export function worldResource(p: ProvinceData, pick: Pick): ResourceId | undefined {
  const [lon, lat] = p.lonlat;
  const s = sub(p), m = p.modern, t = p.terrain, coast = p.coast;
  switch (m) {
    // Asia orientale
    case 'CHN': case 'HKG': case 'XMACAO':
      if (s === 'XJ') return pick(['bestiame', 0.5], ['grano', 0.3], ['cotone', 0.2]);
      if (s === 'NM' || CN_PASCOLI.has(s)) return pick(['bestiame', 0.85], ['grano', 0.15]);
      if (CN_MANCIURIA.has(s)) return t === 'forest' || t === 'mountain' ? 'legname' : pick(['grano', 0.6], ['legname', 0.25], ['bestiame', 0.15]); // soia e sorgo
      if (CN_NORD.has(s)) return pick(['grano', 0.7], ['cotone', 0.15], ['bestiame', 0.15]);
      if (CN_OPPIO.has(s)) return t === 'mountain' ? pick(['legname', 0.4], ['oppio', 0.35], ['bestiame', 0.25]) : pick(['riso', 0.55], ['oppio', 0.3], ['seta', 0.15]);
      if (CN_TE.has(s) && (t === 'hills' || t === 'mountain')) return pick(['te', 0.5], ['riso', 0.35], ['legname', 0.15]);
      if (s === 'HI') return pick(['zucchero', 0.4], ['palma', 0.3], ['pesce', 0.3]);
      return coast ? pick(['riso', 0.65], ['pesce', 0.2], ['seta', 0.15]) : pick(['riso', 0.75], ['seta', 0.1], ['te', 0.15]);
    case 'TWN': return lat > 24 ? pick(['te', 0.5], ['riso', 0.5]) : pick(['zucchero', 0.6], ['riso', 0.4]); // oolong a nord, canna a sud
    case 'MNG': return 'bestiame';
    case 'JPN':
      if (s === '01') return pick(['pesce', 0.55], ['legname', 0.45]); // Hokkaido: aringhe e foreste
      return coast ? pick(['riso', 0.6], ['pesce', 0.3], ['seta', 0.1]) : pick(['riso', 0.65], ['seta', 0.25], ['legname', 0.1]);
    case 'KOR': return pick(['riso', 0.7], ['pesce', coast ? 0.3 : 0], ['bestiame', 0.3]);
    case 'PRK': return t === 'mountain' || t === 'forest' ? 'legname' : pick(['grano', 0.5], ['riso', 0.3], ['bestiame', 0.2]);
    // India britannica e principati
    case 'IND':
      if (IN_RISO_IUTA.has(s)) return pick(['riso', 0.6], ['iuta', 0.3], ['pesce', 0.1]);
      if (IN_OPPIO.has(s)) return pick(['riso', 0.45], ['oppio', 0.25], ['grano', 0.3]);
      if (IN_GANGE.has(s)) return pick(['grano', 0.5], ['zucchero', 0.25], ['oppio', 0.15], ['cotone', 0.1]);
      if (IN_PUNJAB.has(s)) return pick(['grano', 0.7], ['cotone', 0.2], ['bestiame', 0.1]);
      if (s === 'RJ') return pick(['bestiame', 0.7], ['grano', 0.3]);
      if (s === 'GJ') return pick(['cotone', 0.5], ['grano', 0.3], ['bestiame', 0.2]);
      if (IN_DECCAN.has(s)) return pick(['cotone', 0.45], ['grano', 0.35], ['bestiame', 0.2]);
      if (IN_SUD.has(s)) return pick(['riso', 0.6], ['cotone', 0.2], ['palma', 0.2]);
      if (IN_MALABAR.has(s)) return pick(['spezie', 0.5], ['palma', 0.3], ['pesce', 0.2]); // pepe, cardamomo, cocco
      if (IN_NORDEST.has(s)) return pick(['te', s === 'AS' ? 0.5 : 0.2], ['riso', 0.5], ['legname', 0.3]);
      if (IN_MONTI.has(s)) return pick(['bestiame', 0.4], ['lana', s === 'JK' ? 0.3 : 0.1], ['legname', 0.3], ['grano', 0.2]);
      if (s === 'AN') return 'legname';
      return pick(['riso', 0.5], ['grano', 0.3], ['bestiame', 0.2]);
    case 'BGD': return pick(['riso', 0.55], ['iuta', 0.4], ['pesce', 0.05]);
    case 'PAK': return lon > 70 && lat > 29.5 ? pick(['grano', 0.7], ['cotone', 0.2], ['bestiame', 0.1]) : pick(['bestiame', 0.55], ['cotone', 0.25], ['grano', 0.2]);
    case 'LKA': return pick(['caffe', 0.6], ['spezie', 0.2], ['palma', 0.2]); // Ceylon è ancora l'isola del caffè
    case 'NPL': case 'BTN': return pick(['bestiame', 0.5], ['legname', 0.3], ['grano', 0.2]);
    case 'XDAMA': case 'XDIU': case 'XMAHE': case 'XKARI': case 'XYANA': case 'XCHAN': case 'XMALE': return pick(['pesce', 0.5], ['riso', 0.3], ['spezie', 0.2]);
    // Sud-est asiatico
    case 'VNM': return t === 'mountain' || t === 'forest' ? 'legname' : pick(['riso', 0.75], ['pesce', coast ? 0.25 : 0], ['legname', 0.25]);
    case 'KHM': case 'LAO': return t === 'mountain' || t === 'forest' ? 'legname' : pick(['riso', 0.6], ['pesce', 0.2], ['legname', 0.2]);
    case 'THA': return lat > 17 ? pick(['legname', 0.6], ['riso', 0.4]) : pick(['riso', 0.75], ['pesce', 0.15], ['legname', 0.1]); // tek del nord
    case 'MMR': return lat < 18 && t !== 'mountain' ? pick(['riso', 0.8], ['pesce', 0.2]) : pick(['legname', 0.6], ['riso', 0.4]); // delta dell'Irrawaddy e tek
    case 'MYS': return lon > 109 ? pick(['legname', 0.6], ['gomma', 0.2], ['pesce', 0.2]) : pick(['spezie', 0.35], ['pesce', 0.35], ['legname', 0.3]);
    case 'SGP': case 'BRN': return pick(['pesce', 0.6], ['legname', 0.4]);
    case 'IDN':
      if (ID_GIAVA.has(s)) return pick(['caffe', 0.35], ['riso', 0.35], ['zucchero', 0.3]); // sistema delle colture
      if (ID_SUMATRA.has(s)) return pick(['spezie', 0.45], ['legname', 0.35], ['caffe', 0.2]); // pepe di Aceh e Lampung, caffè di Padang
      if (ID_BORNEO.has(s)) return pick(['legname', 0.6], ['gomma', 0.4]); // guttaperca
      if (ID_CELEBES.has(s)) return pick(['riso', 0.4], ['caffe', 0.3], ['spezie', 0.3]);
      if (ID_MOLUCCHE.has(s)) return 'spezie';
      if (ID_SONDA.has(s)) return pick(['riso', 0.4], ['bestiame', 0.3], ['legname', 0.3]); // cavalli di Sumbawa, sandalo di Timor
      return pick(['legname', 0.45], ['palma', 0.3], ['pesce', 0.25]); // Nuova Guinea
    case 'TLS': return pick(['caffe', 0.5], ['legname', 0.5]);
    case 'PHL': return lat > 14 ? pick(['riso', 0.5], ['tabacco', 0.3], ['legname', 0.2]) : lat > 9.5 ? pick(['zucchero', 0.5], ['riso', 0.3], ['pesce', 0.2]) : pick(['legname', 0.4], ['palma', 0.3], ['pesce', 0.3]);
    case 'PNG': return pick(['legname', 0.45], ['palma', 0.3], ['pesce', 0.25]);
    // Asia centrale e Persia
    case 'UZB': return UZ_OASI.has(s) ? pick(['cotone', 0.35], ['seta', 0.2], ['grano', 0.45]) : 'bestiame';
    case 'TKM': return pick(['bestiame', 0.7], ['cotone', 0.15], ['grano', 0.15]);
    case 'KGZ': case 'TJK': return pick(['bestiame', 0.7], ['grano', 0.3]);
    case 'AFG': return pick(['bestiame', 0.55], ['grano', 0.45]);
    case 'IRN':
      if (lat > 36.4 && lon > 48.5 && lon < 54.5 && t !== 'mountain') return pick(['riso', 0.5], ['seta', 0.5]); // Gilan e Mazandaran
      if (lat < 29.5) return pick(['datteri', 0.5], ['bestiame', 0.5]);
      return pick(['grano', 0.5], ['bestiame', 0.35], ['oppio', 0.15]);
    // Americhe
    case 'USA':
      if (s === 'AK') return pick(['pellicce', 0.55], ['pesce', 0.45]);
      if (s === 'HI') return 'zucchero';
      if (s === 'LA') return pick(['zucchero', 0.4], ['cotone', 0.4], ['riso', 0.2]);
      if (s === 'TX' && lon < -98) return 'bestiame';
      if (s === 'FL') return pick(['legname', 0.4], ['bestiame', 0.3], ['pesce', 0.3]);
      if (s === 'CA') return pick(['grano', 0.5], ['bestiame', 0.25], ['vino', 0.15], ['legname', 0.1]);
      if (US_COTONE.has(s)) return coast && (s === 'SC' || s === 'GA') ? pick(['riso', 0.4], ['cotone', 0.6]) : pick(['cotone', 0.7], ['grano', 0.2], ['legname', 0.1]);
      if (US_TABACCO.has(s)) return pick(['tabacco', 0.5], ['grano', 0.35], [coast ? 'pesce' : 'bestiame', 0.15]);
      if (US_PASCOLI.has(s)) return pick(['bestiame', 0.8], ['grano', 0.2]);
      if (US_FORESTE.has(s)) return coast ? pick(['legname', 0.5], ['pesce', 0.3], ['grano', 0.2]) : pick(['grano', 0.5], ['legname', 0.5]);
      if (US_GRANO.has(s)) return s === 'MI' && lat > 44.5 || s === 'WI' && lat > 45 || s === 'MN' && lat > 46.5 ? 'legname' : pick(['grano', 0.75], ['bestiame', 0.25]);
      if (US_NORDEST.has(s)) return pick(['bestiame', 0.4], [coast ? 'pesce' : 'legname', 0.3], ['legname', 0.3]);
      if (US_MEDIO.has(s)) return pick(['grano', 0.5], ['bestiame', 0.3], ['legname', 0.2]);
      return pick(['grano', 0.6], ['bestiame', 0.4]);
    case 'CAN':
      if (CA_NORD.has(s) || lat > 55) return coast ? pick(['pellicce', 0.6], ['pesce', 0.4]) : 'pellicce'; // la Terra di Rupert della Compagnia della Baia di Hudson
      if (s === 'BC') return pick(['legname', 0.5], ['pesce', 0.5]);
      if (CA_PRATERIE.has(s)) return pick(['bestiame', 0.45], ['pellicce', 0.3], ['grano', 0.25]);
      if (CA_MARITTIME.has(s)) return pick(['pesce', 0.5], ['legname', 0.35], ['grano', 0.15]);
      if (s === 'QC') return pick(['legname', 0.5], ['grano', 0.3], ['pesce', coast ? 0.2 : 0]);
      return pick(['grano', 0.55], ['legname', 0.45]);
    case 'SPM': case 'XBERMUDA': case 'BHS': case 'CYM': case 'TCA': case 'SGS': return 'pesce';
    case 'MEX':
      if (MX_NORD.has(s)) return pick(['bestiame', 0.7], ['grano', 0.3]);
      if (MX_CENTRO.has(s)) return pick(['grano', 0.6], ['bestiame', 0.4]); // mais
      if (s === 'MOR') return 'zucchero';
      if (s === 'VER') return pick(['tabacco', 0.4], ['caffe', 0.3], ['zucchero', 0.3]);
      if (MX_YUC.has(s)) return pick(['bestiame', 0.4], ['legname', 0.6]); // legno di Campeche
      if (MX_SUD.has(s)) return pick(['cacao', s === 'TAB' ? 0.4 : 0.1], ['caffe', 0.25], ['legname', 0.35], ['grano', 0.3]);
      return pick(['grano', 0.6], ['bestiame', 0.4]);
    case 'GTM': case 'SLV': case 'CRI': return pick(['caffe', 0.65], ['bestiame', 0.2], ['grano', 0.15]);
    case 'NIC': case 'HND': return pick(['bestiame', 0.4], ['legname', 0.35], ['caffe', 0.25]);
    case 'BLZ': return 'legname'; // mogano
    case 'PAN': return pick(['bestiame', 0.5], ['pesce', 0.5]);
    case 'CUB': return lon < -83 ? 'tabacco' : pick(['zucchero', 0.75], ['tabacco', 0.25]); // Vuelta Abajo
    case 'JAM': return pick(['zucchero', 0.5], ['caffe', 0.3], ['spezie', 0.2]);
    case 'HTI': return pick(['caffe', 0.7], ['legname', 0.3]);
    case 'DOM': return pick(['tabacco', 0.4], ['zucchero', 0.3], ['legname', 0.3]);
    case 'PRI': return pick(['zucchero', 0.5], ['caffe', 0.5]);
    case 'TTO': case 'GRD': return pick(['cacao', 0.6], ['zucchero', 0.4]);
    case 'BRA':
      if (BR_AMAZZONIA.has(s)) return pick(['gomma', 0.7], ['legname', 0.3]);
      if (BR_SERTAO.has(s)) return pick(['cotone', 0.5], ['bestiame', 0.5]);
      if (BR_ZUCCHERO.has(s)) return pick(['zucchero', 0.6], ['tabacco', s === 'BA' ? 0.2 : 0], ['cotone', 0.2], ['bestiame', 0.2]);
      if (BR_CAFFE.has(s)) return pick(['caffe', 0.8], ['zucchero', 0.2]);
      if (s === 'MG') return pick(['caffe', 0.4], ['bestiame', 0.35], ['grano', 0.25]);
      if (BR_SUD.has(s)) return pick(['legname', 0.5], ['grano', 0.3], ['bestiame', 0.2]); // araucaria ed erva-mate
      if (s === 'RS') return pick(['bestiame', 0.7], ['grano', 0.3]); // charque
      if (BR_CENTRO.has(s)) return pick(['bestiame', 0.7], ['legname', 0.3]);
      return pick(['bestiame', 0.5], ['legname', 0.5]);
    case 'ARG':
      if (AR_PAMPA.has(s)) return pick(['bestiame', 0.45], ['lana', 0.35], ['grano', 0.2]); // pecore merinos e colonie di Santa Fe
      if (s === 'T') return 'zucchero';
      if (AR_VINO.has(s)) return pick(['vino', 0.6], ['bestiame', 0.4]);
      if (AR_NORD.has(s)) return pick(['bestiame', 0.6], ['legname', 0.4]); // quebracho
      return 'bestiame'; // Patagonia: terre indigene, la "conquista del deserto" è in corso
    case 'URY': return pick(['bestiame', 0.6], ['lana', 0.4]);
    case 'PRY': return pick(['legname', 0.5], ['bestiame', 0.5]);
    case 'FLK': return 'lana';
    case 'CHL':
      if (CL_NORD.has(s)) return coast ? 'pesce' : 'bestiame';
      if (CL_CENTRO.has(s)) return pick(['grano', 0.6], ['vino', 0.2], ['bestiame', 0.2]); // il grano cileno va in California e in Australia
      return pick(['legname', 0.6], ['bestiame', 0.2], ['pesce', 0.2]);
    case 'PER':
      if (PE_AMAZZONIA.has(s)) return pick(['gomma', 0.6], ['legname', 0.4]);
      if (PE_COSTA.has(s)) return pick(['zucchero', 0.4], ['cotone', 0.3], ['pesce', 0.3]);
      return pick(['lana', 0.5], ['bestiame', 0.3], ['grano', 0.2]); // alpaca della sierra
    case 'BOL':
      if (BO_ALTIPIANO.has(s)) return pick(['lana', 0.5], ['bestiame', 0.5]);
      if (BO_ORIENTE.has(s)) return pick(['gomma', 0.4], ['bestiame', 0.6]);
      return pick(['grano', 0.6], ['bestiame', 0.4]);
    case 'ECU': return lon < -79.2 ? pick(['cacao', 0.7], ['legname', 0.3]) : lon > -77.8 ? pick(['gomma', 0.5], ['legname', 0.5]) : pick(['grano', 0.5], ['bestiame', 0.5]);
    case 'COL': return pick(['caffe', 0.35], ['bestiame', 0.25], ['tabacco', 0.2], ['legname', 0.2]);
    case 'VEN': return lat < 6.5 ? pick(['legname', 0.6], ['gomma', 0.4]) : pick(['caffe', 0.4], ['bestiame', 0.35], ['cacao', 0.25]);
    case 'GUY': case 'SUR': case 'GUF': return coast ? pick(['zucchero', 0.7], ['legname', 0.3]) : 'legname';
    // Oceania
    case 'AUS':
      if (s === 'TAS') return pick(['legname', 0.45], ['lana', 0.45], ['grano', 0.1]);
      if (s === 'QLD' && coast && lat > -26) return pick(['zucchero', 0.5], ['bestiame', 0.3], ['legname', 0.2]);
      if (lat > -20) return pick(['bestiame', 0.6], ['pesce', coast ? 0.4 : 0], ['lana', 0.4]);
      if (s === 'WA' && lon < 118 && lat < -30) return pick(['legname', 0.4], ['lana', 0.4], ['grano', 0.2]); // jarrah
      return (s === 'NSW' || s === 'VIC' || s === 'SA') && lat < -32 ? pick(['lana', 0.6], ['grano', 0.4]) : pick(['lana', 0.75], ['bestiame', 0.25]);
    case 'NZL': return lat > -38 ? pick(['legname', 0.5], ['lana', 0.5]) : pick(['lana', 0.7], ['grano', 0.3]); // kauri a nord, Canterbury a sud
    case 'FJI': return pick(['zucchero', 0.5], ['palma', 0.5]);
    case 'GRL': return 'pesce';
  }
  if (PACIFICO.has(m)) return pick(['palma', 0.6], ['pesce', 0.4]); // copra
  if (ANTILLE_ZUCCHERO.has(m)) return 'zucchero';
  // Siberia ed Estremo Oriente russo
  if (m === 'RUS' && lon >= 60) {
    if (lat >= 60 || lon > 140) return coast ? pick(['pellicce', 0.5], ['pesce', 0.5]) : pick(['pellicce', 0.6], ['legname', 0.4]);
    if (lon > 105) return pick(['legname', 0.4], ['pellicce', 0.3], ['bestiame', 0.3]); // Transbajkalia e Amur
    return pick(['grano', 0.4], ['legname', 0.35], ['pellicce', 0.25]); // la fascia agricola di Tobol'sk, Tomsk, Irkutsk
  }
  return undefined;
}

/** Giacimenti e distretti noti nel 1881 fuori da Europa, Africa e Arabia: [risorsa, lon, lat, nome]. */
export const WORLD_SITES: [ResourceId, number, number, string][] = [
  // carbone
  ['carbone', -75.66, 41.41, 'antracite della Pennsylvania'], ['carbone', -79.99, 40.44, 'Pittsburgh'], ['carbone', -88.2, 41.27, 'Illinois'],
  ['carbone', -82.2, 39.5, 'valle dell\'Hocking'], ['carbone', -81.6, 38.35, 'Kanawha'], ['carbone', -86.8, 33.52, 'Birmingham (Alabama)'],
  ['carbone', -62.7, 45.6, 'Pictou'], ['carbone', -60.2, 46.14, 'Capo Bretone'], ['carbone', -125.3, 49.6, 'Nanaimo'],
  ['carbone', 129.75, 32.66, 'Takashima'], ['carbone', 130.45, 33.03, 'Miike'], ['carbone', 141.9, 43.2, 'Horonai'],
  ['carbone', 118.18, 39.63, 'Kaiping'], ['carbone', 151.78, -32.93, 'Newcastle (Nuovo Galles del Sud)'], ['carbone', -73.16, -37.09, 'Lota'],
  ['carbone', 87.12, 23.62, 'Raniganj'],
  // ferro
  ['ferro', -87.6, 46.5, 'Marquette'], ['ferro', -73.46, 44.05, 'Port Henry'], ['ferro', -76.4, 40.27, 'Cornwall (Pennsylvania)'],
  ['ferro', -86.8, 33.48, 'Red Mountain'], ['ferro', 59.97, 57.91, 'Nižnij Tagil'], ['ferro', 59.67, 55.17, 'Zlatoust'], ['ferro', 141.88, 39.27, 'Kamaishi'],
  // petrolio
  ['petrolio', -79.67, 41.63, 'Oil Creek'], ['petrolio', -82.15, 42.88, 'Petrolia'], ['petrolio', 94.87, 20.46, 'Yenangyaung'], ['petrolio', -80.67, -3.68, 'Zorritos'],
  // oro
  ['oro', -121.06, 39.22, 'Grass Valley'], ['oro', -120.6, 38.2, 'Mother Lode'], ['oro', -103.73, 44.38, 'Black Hills'], ['oro', -105.5, 39.8, 'Central City'],
  ['oro', -112.04, 46.59, 'Helena'], ['oro', -134.4, 58.3, 'Juneau'], ['oro', -121.5, 53.1, 'Cariboo'],
  ['oro', 143.85, -37.56, 'Ballarat'], ['oro', 144.28, -36.76, 'Bendigo'], ['oro', 149.42, -33.03, 'Hill End'], ['oro', 146.26, -20.08, 'Charters Towers'],
  ['oro', 152.67, -26.19, 'Gympie'], ['oro', 144.2, -16.1, 'Palmer River'], ['oro', 169.4, -45.1, 'Otago'], ['oro', 170.96, -42.72, 'Hokitika'], ['oro', 175.54, -37.14, 'Thames'],
  ['oro', 114.2, 57.85, 'Lena'], ['oro', 60.8, 56.9, 'Berëzovskij'], ['oro', -43.82, -19.98, 'Morro Velho'], ['oro', -74.7, 7.0, 'Antioquia'],
  ['oro', -61.82, 7.35, 'El Callao'], ['oro', -53.2, 4.8, 'Saint-Élie'], ['oro', 109.0, 0.9, 'Montrado'],
  // argento
  ['argento', -119.65, 39.31, 'Comstock'], ['argento', -106.29, 39.25, 'Leadville'], ['argento', -111.5, 40.65, 'Park City'], ['argento', -110.07, 31.71, 'Tombstone'],
  ['argento', -102.58, 22.77, 'Zacatecas'], ['argento', -101.26, 21.02, 'Guanajuato'], ['argento', -98.73, 20.12, 'Pachuca'], ['argento', -100.88, 23.69, 'Real de Catorce'],
  ['argento', -107.74, 27.03, 'Batopilas'], ['argento', -65.75, -19.58, 'Potosí'], ['argento', -66.68, -20.4, 'Huanchaca'], ['argento', -76.26, -10.68, 'Cerro de Pasco'],
  ['argento', -69.05, -23.0, 'Caracoles'], ['argento', -70.4, -27.8, 'Chañarcillo'], ['argento', -87.05, 14.2, 'San Juancito'], ['argento', 119.6, 51.3, 'Nerčinsk'],
  ['argento', 82.19, 51.15, 'Zmeinogorsk'], ['argento', 134.8, 35.17, 'Ikuno'], ['argento', 138.4, 38.04, 'Sado'],
  // rame, piombo, mercurio, nichel
  ['metalli', -88.45, 47.24, 'rame del Keweenaw'], ['metalli', -112.53, 46.0, 'Butte'], ['metalli', -109.92, 31.44, 'Bisbee'], ['metalli', -109.3, 33.05, 'Clifton'],
  ['metalli', -90.55, 37.95, 'piombo del Missouri'], ['metalli', -121.83, 37.18, 'mercurio di New Almaden'], ['metalli', -70.33, -27.37, 'rame di Copiapó'],
  ['metalli', -71.25, -30.0, 'rame di Coquimbo'], ['metalli', 137.59, -34.07, 'Moonta e Wallaroo'], ['metalli', 138.93, -33.68, 'Burra'], ['metalli', 145.83, -31.5, 'Cobar'],
  ['metalli', 139.44, 36.63, 'Ashio'], ['metalli', 133.33, 33.9, 'Besshi'], ['metalli', 103.18, 26.08, 'rame di Dongchuan'], ['metalli', 166.2, -21.6, 'nichel di Thio'],
  // stagno
  ['stagno', 100.74, 4.85, 'Larut'], ['stagno', 101.69, 3.14, 'Selangor'], ['stagno', 106.1, -2.1, 'Bangka'], ['stagno', 107.65, -2.87, 'Belitung'],
  ['stagno', 98.39, 7.88, 'Phuket'], ['stagno', 145.52, -41.42, 'Mount Bischoff'], ['stagno', 145.38, -17.38, 'Herberton'], ['stagno', 151.12, -29.5, 'Vegetable Creek'],
  ['stagno', 103.16, 23.36, 'Gejiu'],
  // nitrati, guano e salnitro
  ['nitrati', -70.14, -20.21, 'nitrati di Tarapacá'], ['nitrati', -70.2, -23.6, 'nitrati di Antofagasta'], ['nitrati', -76.2, -13.6, 'guano delle Chincha'],
  ['nitrati', -80.0, -6.9, 'guano delle Lobos'], ['nitrati', 85.4, 26.1, 'salnitro del Tirhut'],
  // tè
  ['te', 117.98, 27.7, 'Wuyi'], ['te', 117.7, 29.85, 'Keemun'], ['te', 111.2, 28.4, 'Anhua'], ['te', 114.3, 29.8, 'Yangloudong'], ['te', 120.1, 30.25, 'Longjing'],
  ['te', 100.97, 22.79, 'Pu\'er'], ['te', 103.0, 29.98, 'Ya\'an'], ['te', 121.5, 25.06, 'oolong di Formosa'], ['te', 138.38, 34.98, 'Shizuoka'], ['te', 135.8, 34.89, 'Uji'],
  ['te', 94.2, 26.9, 'Assam'], ['te', 88.26, 27.04, 'Darjeeling'], ['te', 92.8, 24.8, 'Cachar'],
  // seta
  ['seta', 120.1, 30.87, 'Huzhou'], ['seta', 120.3, 31.57, 'Wuxi'], ['seta', 113.25, 22.84, 'Shunde'], ['seta', 138.89, 36.26, 'Tomioka'], ['seta', 138.05, 36.06, 'Suwa'],
  ['seta', 140.47, 37.75, 'Fukushima'], ['seta', 88.27, 24.18, 'Murshidabad'], ['seta', 76.65, 12.3, 'Mysore'], ['seta', 49.58, 37.28, 'Gilan'],
  ['seta', 64.42, 39.77, 'Bukhara'], ['seta', 71.78, 40.47, 'Fergana'],
  // oppio
  ['oppio', 85.14, 25.6, 'Patna'], ['oppio', 83.58, 25.58, 'Ghazipur'], ['oppio', 75.86, 22.72, 'Malwa'], ['oppio', 75.78, 23.18, 'Ujjain'],
  ['oppio', 51.67, 32.65, 'Isfahan'], ['oppio', 54.37, 31.9, 'Yazd'], ['oppio', 104.07, 30.67, 'Sichuan'], ['oppio', 102.71, 25.04, 'Yunnan'], ['oppio', 106.7, 26.6, 'Guizhou'],
  ['oppio', 30.54, 38.76, 'Afyonkarahisar'],
  // iuta
  ['iuta', 90.41, 23.81, 'Dacca'], ['iuta', 90.4, 24.75, 'Mymensingh'], ['iuta', 89.7, 24.45, 'Serajganj'], ['iuta', 89.25, 25.75, 'Rangpur'], ['iuta', 88.35, 22.57, 'Hooghly'],
  // cotone
  ['cotone', -91.06, 33.41, 'Delta del Mississippi'], ['cotone', -87.02, 32.41, 'Black Belt'], ['cotone', -81.97, 33.47, 'Augusta'], ['cotone', -96.3, 30.6, 'Brazos'],
  ['cotone', 77.75, 20.93, 'Berar'], ['cotone', 72.97, 21.7, 'Broach'], ['cotone', 75.0, 15.46, 'Dharwar'], ['cotone', 69.24, 41.3, 'Taškent'],
  ['cotone', -44.3, -2.53, 'Maranhão'], ['cotone', -80.63, -5.19, 'Piura'], ['cotone', 120.86, 32.0, 'Tongzhou'],
  // tabacco
  ['tabacco', -79.14, 37.41, 'Lynchburg'], ['tabacco', -84.5, 38.05, 'Kentucky'], ['tabacco', -78.9, 35.99, 'Durham'], ['tabacco', -72.6, 41.95, 'valle del Connecticut'],
  ['tabacco', -83.7, 22.42, 'Vuelta Abajo'], ['tabacco', 121.7, 17.6, 'Cagayan'], ['tabacco', 98.67, 3.59, 'Deli'], ['tabacco', -38.95, -12.6, 'Cachoeira'],
  ['tabacco', -74.76, 4.78, 'Ambalema'], ['tabacco', 113.7, -8.17, 'Besuki'],
  // zucchero
  ['zucchero', -81.58, 23.04, 'Matanzas'], ['zucchero', -80.44, 22.15, 'Cienfuegos'], ['zucchero', -91.2, 30.0, 'Louisiana'], ['zucchero', -156.33, 20.8, 'Maui'],
  ['zucchero', 149.18, -21.14, 'Mackay'], ['zucchero', 152.35, -24.87, 'Bundaberg'], ['zucchero', 112.9, -7.64, 'Pasuruan'], ['zucchero', 108.55, -6.73, 'Cirebon'],
  ['zucchero', 122.95, 10.67, 'Negros'], ['zucchero', 120.7, 15.07, 'Pampanga'], ['zucchero', -34.9, -8.05, 'Pernambuco'], ['zucchero', -38.6, -12.6, 'Recôncavo'],
  ['zucchero', -59.55, 13.1, 'Barbados'], ['zucchero', -77.3, 18.1, 'Giamaica'], ['zucchero', -66.5, 18.2, 'Porto Rico'], ['zucchero', -61.3, 10.5, 'Trinidad'],
  ['zucchero', -58.16, 6.8, 'Demerara'], ['zucchero', -79.03, -8.11, 'Trujillo'], ['zucchero', 178.5, -18.1, 'Rewa'], ['zucchero', -65.22, -26.82, 'Tucumán'],
  ['zucchero', -99.23, 18.92, 'Morelos'], ['zucchero', 120.21, 23.0, 'Tainan'],
  // caffè
  ['caffe', -43.66, -22.4, 'valle del Paraíba'], ['caffe', -47.06, -22.9, 'Campinas'], ['caffe', -43.35, -21.76, 'Zona da Mata'], ['caffe', -40.5, -20.0, 'Espírito Santo'],
  ['caffe', 107.6, -7.0, 'Preanger'], ['caffe', 124.84, 1.3, 'Minahasa'], ['caffe', 80.64, 7.29, 'Kandy'], ['caffe', 75.8, 12.42, 'Coorg'], ['caffe', 76.7, 11.4, 'Nilgiri'],
  ['caffe', -84.08, 9.93, 'Valle Centrale'], ['caffe', -90.73, 14.56, 'Antigua'], ['caffe', -89.2, 13.7, 'El Salvador'], ['caffe', -72.2, 7.77, 'Táchira'],
  ['caffe', -66.9, 10.5, 'Caracas'], ['caffe', -72.5, 7.9, 'Cúcuta'], ['caffe', -72.3, 18.5, 'Haiti'], ['caffe', -66.7, 18.27, 'Utuado'], ['caffe', -76.6, 18.05, 'Blue Mountains'],
  ['caffe', -96.93, 18.88, 'Córdoba (Veracruz)'], ['caffe', 125.6, -8.6, 'Timor'],
  // cacao
  ['cacao', -79.75, -1.55, 'Guayas'], ['cacao', -66.0, 10.4, 'Barlovento'], ['cacao', -61.7, 12.1, 'Grenada'], ['cacao', -39.05, -14.8, 'Ilhéus'],
  ['cacao', -92.93, 17.99, 'Tabasco'], ['cacao', 6.6, 0.3, 'São Tomé'], ['cacao', 8.7, 3.5, 'Fernando Po'],
  // spezie
  ['spezie', 128.18, -3.7, 'chiodi di garofano di Amboina'], ['spezie', 129.9, -4.53, 'noce moscata di Banda'], ['spezie', 127.38, 0.79, 'Ternate'],
  ['spezie', 75.49, 11.75, 'pepe di Tellicherry'], ['spezie', 76.27, 9.93, 'Cochin'], ['spezie', 79.86, 6.93, 'cannella di Colombo'], ['spezie', 105.26, -5.43, 'pepe di Lampung'],
  ['spezie', 95.5, 4.5, 'pepe di Aceh'],
  // lana
  ['lana', 147.37, -35.12, 'Riverina'], ['lana', 145.94, -30.09, 'Bourke'], ['lana', 142.9, -37.6, 'Western District'], ['lana', 138.6, -33.0, 'Mid North'],
  ['lana', 151.95, -27.56, 'Darling Downs'], ['lana', 172.1, -43.5, 'Canterbury'], ['lana', 176.8, -39.5, 'Hawke\'s Bay'], ['lana', -59.0, -36.5, 'Buenos Aires'],
  ['lana', -56.0, -33.0, 'Banda Orientale'], ['lana', 24.53, -32.25, 'Karoo'], ['lana', -59.0, -51.7, 'Falkland'], ['lana', -71.54, -16.4, 'alpaca di Arequipa'],
  ['lana', 74.8, 34.08, 'scialli del Kashmir'],
  // pellicce
  ['pellicce', -92.4, 57.0, 'York Factory'], ['pellicce', -121.35, 61.86, 'Fort Simpson'], ['pellicce', 129.73, 62.03, 'Jakutsk'], ['pellicce', 158.65, 53.02, 'Kamčatka'],
  // perle
  ['perle', 122.6, -17.9, 'Roebuck Bay'], ['perle', 142.45, -10.9, 'Stretto di Torres'], ['perle', 114.4, -26.0, 'Shark Bay'], ['perle', 79.8, 8.8, 'golfo di Mannar'],
  ['perle', -79.0, 8.4, 'Isole delle Perle'], ['perle', -110.3, 24.15, 'La Paz'], ['perle', 121.0, 6.0, 'Sulu'], ['perle', -134.97, -23.12, 'Tuamotu e Gambier'],
  // sale
  ['sale', -76.15, 43.05, 'Syracuse'], ['sale', -83.95, 43.42, 'Saginaw'], ['sale', -73.0, 21.5, 'isole Turks'], ['sale', 75.08, 26.9, 'lago Sambhar'],
  ['sale', 73.03, 32.65, 'Khewra'], ['sale', 104.78, 29.35, 'Zigong'], ['sale', 117.2, 39.1, 'Changlu'],
  // diamanti
  ['diamanti', -43.6, -18.24, 'Diamantina'], ['diamanti', 80.19, 24.72, 'Panna'],
  // altri distretti noti nel 1881
  ['carbone', 112.55, 37.87, 'carbone dello Shanxi'], ['carbone', 113.3, 40.1, 'Datong'], ['carbone', 118.05, 36.8, 'Boshan'], ['carbone', 121.74, 25.13, 'Keelung'],
  ['carbone', 130.7, 33.65, 'Chikuhō'], ['carbone', 142.05, 50.84, 'Due (Sachalin)'], ['carbone', 171.6, -41.75, 'Westport'],
  ['ferro', 112.85, 35.5, 'ferro di Zezhou'], ['oro', 78.27, 12.95, 'Kolar'], ['oro', 127.5, 53.8, 'Zeja'], ['metalli', 73.0, 48.4, 'rame di Uspenskij'],
  ['metalli', -67.5, -29.0, 'Famatina'], ['metalli', -76.6, 5.7, 'platino del Chocó'], ['sale', -74.0, 5.02, 'Zipaquirá'], ['diamanti', -41.4, -12.56, 'Chapada Diamantina'],
  ['petrolio', -61.65, 10.23, 'lago d\'asfalto di Trinidad'], ['gomma', 173.8, -35.5, 'gomma di kauri'], ['gomma', -64.9, -14.8, 'Beni'], ['gomma', -73.25, -3.75, 'Iquitos'],
  ['gomma', -74.5, -1.0, 'Putumayo'], ['seta', 104.07, 30.9, 'seta del Sichuan'], ['seta', 121.4, 37.5, 'seta selvatica dello Shandong'], ['zucchero', 116.7, 23.4, 'Shantou'],
  ['pesce', 121.5, 38.9, 'golfo del Bohai'], ['sale', 120.5, 33.5, 'saline del Huai'], ['pellicce', 127.0, 49.0, 'Amur'], ['pellicce', 98.0, 52.0, 'Saiani'],
];
