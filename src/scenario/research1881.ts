// Albero della ricerca 1880-1914 e scienziati storici.
// `year` = data storica dell'innovazione: ricercarla prima costa il 30% di tempo in più per ogni anno d'anticipo.
// `start` = industria minima per conoscerla già nel 1881 (le innovazioni più vecchie le hanno tutti i paesi avanzati).
// `weeks` = durata base; `cost` = milioni a settimana (per una grande potenza; i paesi piccoli pagano meno);
// `consumes` = risorse da avere (proprie o importate) mentre dura, altrimenti va a metà velocità.

import type { BuildingId } from './buildings1881';
import type { ResourceId } from '../engine/resources';
import type { Tag } from '../engine/types';

export type Category = 'industria' | 'energia' | 'trasporti' | 'militare' | 'agricoltura' | 'medicina';
export const CATEGORIES: { id: Category; label: string; icon: string; lines: [string, string][] }[] = [
  { id: 'industria', label: 'Industria', icon: '🏭', lines: [['acciaio', 'Acciaio'], ['chimica', 'Chimica'], ['tessile', 'Tessile'], ['organizzazione', 'Organizzazione']] },
  { id: 'energia', label: 'Energia', icon: '⚡', lines: [['elettricita', 'Elettricità'], ['idro', 'Idroelettrico'], ['carbone', 'Carbone e vapore'], ['petrolio', 'Petrolio']] },
  { id: 'trasporti', label: 'Trasporti', icon: '🚂', lines: [['ferrovie', 'Ferrovie'], ['porti', 'Porti e navi'], ['comunicazioni', 'Comunicazioni']] },
  { id: 'militare', label: 'Militare', icon: '⚔️', lines: [['fanteria', 'Fanteria'], ['artiglieria', 'Artiglieria'], ['esplosivi', 'Esplosivi'], ['fortificazioni', 'Fortificazioni']] },
  { id: 'agricoltura', label: 'Agricoltura', icon: '🌾', lines: [['concimi', 'Concimi'], ['macchine', 'Macchine agricole'], ['bonifiche', 'Bonifiche e conserve']] },
  { id: 'medicina', label: 'Medicina', icon: '⚕️', lines: [['igiene', 'Igiene'], ['batteriologia', 'Batteriologia'], ['tropicale', 'Medicina tropicale']] },
];

export interface TechEffects {
  income?: number; quality?: number; exhaustion?: number; manpower?: number; logistics?: number; railSpeed?: number;
  agri?: number; industrialYield?: number; attrition?: number; oilValue?: number; upkeep?: number;
  stability?: number; industry?: number;
  /** quota del malus "senza carbone" eliminata (idroelettrico: solo con montagne) */
  coalRelief?: number;
  /** riduce il bonus delle fortezze nemiche quando si attacca (alti esplosivi) */
  fortBreak?: number;
  /** annulla fortBreak nemico (forti in calcestruzzo) */
  fortArmor?: boolean;
}

export interface Tech {
  id: string;
  cat: Category;
  line: string;
  name: string;
  year: number;
  weeks: number;
  cost: number;
  prereq: string[];
  start?: number;
  minIndustry?: number;
  consumes?: ResourceId[];
  effects: TechEffects;
  /** livelli delle opere sbloccati */
  unlocks?: [BuildingId, number][];
  /** giacimenti che diventano sfruttabili per chi controlla la provincia */
  sites?: [ResourceId, number, number, string][];
  desc: string;
}

const t = (id: string, cat: Category, line: string, name: string, year: number, weeks: number, cost: number, prereq: string[], effects: TechEffects, desc: string, extra: Partial<Tech> = {}): Tech =>
  ({ id, cat, line, name, year, weeks, cost, prereq, effects, desc, ...extra });

export const TECHS: Tech[] = [
  // --- Industria ---
  t('bessemer', 'industria', 'acciaio', 'Convertitore Bessemer', 1856, 30, 0.6, [], { industry: 2 }, 'L\'acciaio in grande quantità: ghisa soffiata nel convertitore.', { start: 25, consumes: ['ferro', 'carbone'] }),
  t('siemens_martin', 'industria', 'acciaio', 'Forno Siemens-Martin', 1865, 36, 0.8, ['bessemer'], { industry: 2 }, 'Il forno a suola: acciaio di qualità anche da rottami.', { start: 50, consumes: ['ferro', 'carbone'], unlocks: [['siderurgia', 2]] }),
  t('thomas', 'industria', 'acciaio', 'Processo Thomas-Gilchrist', 1879, 40, 0.9, ['bessemer'], { industry: 3 }, 'Il rivestimento basico rende utilizzabile il ferro fosforoso: la minette di Lorena e Lussemburgo, il ferro svedese.', { start: 85, consumes: ['ferro', 'carbone'], sites: [['ferro', 5.9, 49.25, 'Briey'], ['ferro', 6.0, 49.55, 'Minette lussemburghese'], ['ferro', 20.2, 67.85, 'Kiruna'], ['ferro', 15.0, 60.1, 'Grängesberg']] }),
  t('acciaio_massa', 'industria', 'acciaio', 'Acciaierie integrate', 1890, 52, 1.2, ['siemens_martin', 'thomas'], { industry: 4, industrialYield: 1.1 }, 'Altiforni, convertitori e laminatoi in un solo stabilimento.', { minIndustry: 45, consumes: ['ferro', 'carbone'], unlocks: [['siderurgia', 3]] }),
  t('soda_solvay', 'industria', 'chimica', 'Soda Solvay', 1872, 30, 0.6, [], { industry: 1, industrialYield: 1.03 }, 'Il processo all\'ammoniaca per la soda: vetro, sapone, carta.', { start: 55, consumes: ['sale'], unlocks: [['chimica', 2]] }),
  t('coloranti', 'industria', 'chimica', 'Coloranti sintetici', 1880, 40, 0.9, ['soda_solvay'], { income: 1.02, industrialYield: 1.05 }, 'L\'anilina e l\'indaco sintetico: la chimica tedesca conquista il mondo.', { start: 82, consumes: ['carbone'] }),
  t('elettrochimica', 'industria', 'chimica', 'Elettrochimica', 1890, 46, 1.0, ['coloranti', 'corrente_alternata'], { industry: 3 }, 'Alluminio, cloro e soda caustica con l\'elettrolisi.', { minIndustry: 40, consumes: ['sale', 'metalli'], unlocks: [['chimica', 3]] }),
  t('telaio_meccanico', 'industria', 'tessile', 'Telaio meccanico', 1840, 20, 0.4, [], { industry: 1 }, 'Filature e tessiture a vapore.', { start: 20, unlocks: [['tessile', 2]] }),
  t('filatura_anelli', 'industria', 'tessile', 'Filatoio ad anelli', 1870, 30, 0.6, ['telaio_meccanico'], { industrialYield: 1.04 }, 'Più filo, meno operai specializzati.', { start: 55, consumes: ['cotone'] }),
  t('tessile_elettrico', 'industria', 'tessile', 'Tessitura elettrica', 1895, 40, 0.8, ['filatura_anelli', 'motore_elettrico'], { industrialYield: 1.05, industry: 2 }, 'Il motore elettrico in ogni telaio.', { unlocks: [['tessile', 3]] }),
  t('pezzi_intercambiabili', 'industria', 'organizzazione', 'Pezzi intercambiabili', 1880, 36, 0.8, ['bessemer'], { industry: 2, quality: 1.01 }, 'Macchine utensili di precisione: armi e macchine in serie.', { start: 88 }),
  t('organizzazione_scientifica', 'industria', 'organizzazione', 'Organizzazione scientifica del lavoro', 1905, 52, 1.0, ['pezzi_intercambiabili', 'motore_elettrico'], { income: 1.03, industry: 3 }, 'Taylor e la catena di montaggio.', { minIndustry: 55 }),

  // --- Energia ---
  t('dinamo', 'energia', 'elettricita', 'Dinamo industriale', 1871, 26, 0.6, [], { industry: 1 }, 'La dinamo di Gramme e di Siemens: la corrente continua in quantità.', { start: 75, consumes: ['metalli'] }),
  t('illuminazione', 'energia', 'elettricita', 'Illuminazione elettrica', 1882, 30, 0.7, ['dinamo'], { income: 1.01, stability: 1 }, 'Centrali urbane e lampade: Pearl Street, Milano Santa Radegonda.', { consumes: ['metalli'] }),
  t('corrente_alternata', 'energia', 'elettricita', 'Corrente alternata e trasformatori', 1886, 40, 0.9, ['illuminazione'], { industry: 2 }, 'Il campo magnetico rotante di Ferraris e Tesla, i trasformatori.', { consumes: ['metalli'] }),
  t('motore_elettrico', 'energia', 'elettricita', 'Motore elettrico industriale', 1889, 40, 0.9, ['corrente_alternata'], { industrialYield: 1.05, industry: 2 }, 'La forza motrice si stacca dalla macchina a vapore.', { consumes: ['metalli'] }),
  t('trasmissione', 'energia', 'elettricita', 'Trasmissione a distanza', 1891, 40, 1.0, ['corrente_alternata'], { industry: 1 }, 'Lauffen-Francoforte, 175 km: l\'energia viaggia.', { consumes: ['metalli'] }),
  t('centrali_idro', 'energia', 'idro', 'Centrali idroelettriche', 1886, 40, 0.8, ['illuminazione'], { coalRelief: 0.5 }, 'Il "carbone bianco": dove ci sono montagne e fiumi l\'industria usa meno carbone.', { consumes: ['metalli'] }),
  t('impianti_alpini', 'energia', 'idro', 'Grandi impianti alpini', 1898, 52, 1.1, ['centrali_idro', 'trasmissione'], { coalRelief: 0.5, industry: 3 }, 'Paderno d\'Adda, Vizzola: le Alpi alimentano le fabbriche della pianura.', { minIndustry: 25, consumes: ['metalli'] }),
  t('cokerie', 'energia', 'carbone', 'Cokerie a recupero', 1882, 30, 0.6, [], { income: 1.01, industrialYield: 1.03 }, 'Dal carbone si recuperano gas, catrame e ammoniaca.', { consumes: ['carbone'] }),
  t('turbina', 'energia', 'carbone', 'Turbina a vapore', 1884, 40, 0.9, ['cokerie'], { industry: 2, logistics: 1.03 }, 'La turbina di Parsons: centrali e navi più potenti.', { consumes: ['carbone', 'metalli'] }),
  t('trivellazione', 'energia', 'petrolio', 'Trivellazione petrolifera', 1859, 20, 0.4, [], { oilValue: 1.2 }, 'Il pozzo di Drake: si cerca il petrolio in profondità.', { start: 30 }),
  t('raffinazione', 'energia', 'petrolio', 'Raffinazione del cherosene', 1883, 30, 0.7, ['trivellazione'], { oilValue: 1.4 }, 'Distillazione continua, oleodotti e navi cisterna (Baku, Nobel).', { consumes: ['petrolio'] }),
  t('motore_scoppio', 'energia', 'petrolio', 'Motore a scoppio', 1886, 46, 1.0, ['raffinazione', 'pezzi_intercambiabili'], { logistics: 1.03, oilValue: 1.2 }, 'Daimler e Benz: il motore leggero a benzina.', { consumes: ['petrolio', 'metalli'] }),
  t('prospezione', 'energia', 'petrolio', 'Prospezione geologica moderna', 1900, 52, 1.0, ['raffinazione'], {}, 'Geologia e sondaggi: si trovano i giacimenti di Grozny, Maikop, Kirkuk e della Persia.', { sites: [['petrolio', 45.7, 43.3, 'Grozny'], ['petrolio', 40.1, 44.6, 'Maikop'], ['petrolio', 44.4, 35.47, 'Kirkuk'], ['petrolio', 49.3, 31.95, 'Masjed Soleyman']] }),

  // --- Trasporti ---
  t('binari_acciaio', 'trasporti', 'ferrovie', 'Binari d\'acciaio', 1870, 26, 0.6, ['bessemer'], { railSpeed: 1.05 }, 'Rotaie d\'acciaio al posto del ferro: treni più pesanti e veloci.', { start: 35, consumes: ['ferro'], unlocks: [['ferrovia', 2]] }),
  t('freno_westinghouse', 'trasporti', 'ferrovie', 'Freno ad aria compressa', 1880, 26, 0.6, ['binari_acciaio'], { railSpeed: 1.08 }, 'Il freno Westinghouse: convogli lunghi e sicuri.', { start: 80 }),
  t('doppio_binario', 'trasporti', 'ferrovie', 'Doppio binario e grandi stazioni', 1885, 40, 0.9, ['binari_acciaio'], { railSpeed: 1.05, logistics: 1.05 }, 'Linee a doppio binario, scali di smistamento.', { consumes: ['ferro'], unlocks: [['ferrovia', 3]] }),
  t('ferrovie_strategiche', 'trasporti', 'ferrovie', 'Ferrovie strategiche', 1890, 46, 1.0, ['doppio_binario', 'telegrafo'], { logistics: 1.1 }, 'Orari di mobilitazione e linee verso le frontiere (il piano Schlieffen nasce sui binari).', { minIndustry: 35 }),
  t('dragaggi', 'trasporti', 'porti', 'Draghe a vapore e moli in muratura', 1870, 26, 0.6, [], { income: 1.01 }, 'Fondali più profondi, moli e magazzini.', { start: 30, unlocks: [['porto', 2]] }),
  t('navi_acciaio', 'trasporti', 'porti', 'Piroscafi in acciaio a elica', 1880, 36, 0.8, ['dragaggi', 'bessemer'], { income: 1.02, logistics: 1.02 }, 'Scafi d\'acciaio e macchine a triplice espansione.', { start: 85, consumes: ['ferro', 'carbone'] }),
  t('bacini', 'trasporti', 'porti', 'Bacini di carenaggio in acciaio', 1890, 46, 1.0, ['navi_acciaio'], { income: 1.02 }, 'Bacini, gru idrauliche, banchine ferroviarie.', { consumes: ['ferro'], unlocks: [['porto', 3]] }),
  t('frigorifere', 'trasporti', 'porti', 'Navi frigorifere', 1882, 30, 0.6, ['navi_acciaio'], { agri: 1.05 }, 'La carne congelata attraversa gli oceani.', {}),
  t('telegrafo', 'trasporti', 'comunicazioni', 'Telegrafo elettrico', 1850, 20, 0.3, [], { logistics: 1.02 }, 'Fili e cavi sottomarini legano capitali e fronti.', { start: 15 }),
  t('telefono', 'trasporti', 'comunicazioni', 'Telefono e centralini', 1880, 30, 0.6, ['telegrafo', 'dinamo'], { income: 1.01, stability: 1 }, 'Le prime reti telefoniche cittadine.', { start: 90, consumes: ['metalli'] }),
  t('radio', 'trasporti', 'comunicazioni', 'Radiotelegrafia', 1897, 46, 0.9, ['telefono', 'corrente_alternata'], { logistics: 1.03, quality: 1.01 }, 'Marconi: il segnale senza fili.', { consumes: ['metalli'] }),

  // --- Militare ---
  t('retrocarica', 'militare', 'fanteria', 'Fucile a retrocarica', 1866, 20, 0.5, [], { quality: 1.02 }, 'Dreyse, Chassepot, Martini-Henry, Vetterli.', { start: 15 }),
  t('ripetizione', 'militare', 'fanteria', 'Fucile a ripetizione', 1886, 40, 1.0, ['retrocarica', 'pezzi_intercambiabili'], { quality: 1.04 }, 'Lebel, Mannlicher, Mauser: il serbatoio e la polvere senza fumo.', { consumes: ['ferro'] }),
  t('mitragliatrice', 'militare', 'fanteria', 'Mitragliatrice', 1884, 46, 1.1, ['retrocarica', 'pezzi_intercambiabili'], { quality: 1.04, exhaustion: 1.03 }, 'La Maxim: una sola arma ferma un battaglione.', { consumes: ['ferro'] }),
  t('cannoni_acciaio', 'militare', 'artiglieria', 'Cannoni d\'acciaio a retrocarica', 1870, 30, 0.8, ['bessemer'], { quality: 1.02 }, 'Le canne d\'acciaio di Krupp e Armstrong.', { start: 45, consumes: ['ferro'] }),
  t('tiro_rapido', 'militare', 'artiglieria', 'Artiglieria a tiro rapido', 1897, 52, 1.2, ['cannoni_acciaio', 'senza_fumo', 'acciaio_massa'], { quality: 1.05 }, 'Il 75 francese: freno di rinculo e quindici colpi al minuto.', { consumes: ['ferro'] }),
  t('dinamite', 'militare', 'esplosivi', 'Dinamite', 1867, 20, 0.5, [], { income: 1.01 }, 'Nobel: gallerie, miniere, demolizioni.', { start: 30, consumes: ['zolfo'] }),
  t('senza_fumo', 'militare', 'esplosivi', 'Polvere senza fumo', 1884, 40, 1.0, ['dinamite'], { quality: 1.03 }, 'La Poudre B di Vieille: più gittata, nessuna nube a tradire i tiratori.', { consumes: ['zolfo'] }),
  t('alti_esplosivi', 'militare', 'esplosivi', 'Granate ad alto esplosivo', 1885, 40, 1.0, ['dinamite'], { fortBreak: 0.4 }, 'Melinite e lyddite: le granate-torpedine sventrano i forti in muratura.', { consumes: ['zolfo'] }),
  t('forti_poligonali', 'militare', 'fortificazioni', 'Forti poligonali staccati', 1860, 26, 0.6, [], {}, 'Cinture di forti attorno alle piazzeforti.', { start: 25, unlocks: [['fortezza', 2]] }),
  t('forti_calcestruzzo', 'militare', 'fortificazioni', 'Forti in calcestruzzo e cupole corazzate', 1887, 46, 1.1, ['forti_poligonali', 'alti_esplosivi'], { fortArmor: true }, 'La risposta alla "crisi dell\'obice-torpedine": calcestruzzo e acciaio.', { consumes: ['ferro'], unlocks: [['fortezza', 3]] }),

  // --- Agricoltura ---
  t('superfosfati', 'agricoltura', 'concimi', 'Superfosfati', 1843, 26, 0.5, [], { agri: 1.1 }, 'Il concime chimico di Lawes.', { start: 45, consumes: ['zolfo'] }),
  t('nitrati', 'agricoltura', 'concimi', 'Nitrati del Cile e concimazione razionale', 1880, 30, 0.6, ['superfosfati'], { agri: 1.08 }, 'Il salnitro cileno nei campi europei.', {}),
  t('scorie_thomas', 'agricoltura', 'concimi', 'Scorie Thomas come concime', 1885, 30, 0.6, ['superfosfati', 'thomas'], { agri: 1.06 }, 'Il sottoprodotto delle acciaierie concima le campagne.', {}),
  t('haber_bosch', 'agricoltura', 'concimi', 'Sintesi dell\'ammoniaca', 1910, 60, 1.4, ['nitrati', 'elettrochimica'], { agri: 1.15, quality: 1.01 }, 'Haber e Bosch: azoto dall\'aria, per i campi e per gli esplosivi.', { minIndustry: 60 }),
  t('mietitrice', 'agricoltura', 'macchine', 'Mietitrice meccanica', 1850, 20, 0.4, [], { agri: 1.05, manpower: 1.02 }, 'McCormick: meno braccia per il raccolto, più uomini per la leva.', { start: 40 }),
  t('trebbiatrice', 'agricoltura', 'macchine', 'Trebbiatrici a vapore', 1880, 30, 0.6, ['mietitrice'], { agri: 1.06, manpower: 1.02 }, 'Le macchine a vapore sulle aie.', { start: 85, consumes: ['carbone'] }),
  t('idrovore', 'agricoltura', 'bonifiche', 'Idrovore a vapore', 1875, 26, 0.6, [], { agri: 1.03 }, 'Le pompe prosciugano paludi e valli.', { start: 35, consumes: ['carbone'], unlocks: [['agricoltura', 2]] }),
  t('bonifica_integrale', 'agricoltura', 'bonifiche', 'Bonifica integrale', 1900, 52, 1.0, ['idrovore'], { agri: 1.05, stability: 1 }, 'Prosciugamento, strade, case e lotti ai coloni.', { unlocks: [['agricoltura', 3]] }),
  t('scatolame', 'agricoltura', 'bonifiche', 'Conserve in scatola', 1870, 20, 0.4, [], { attrition: 0.95 }, 'Carne e verdure in latta per l\'esercito.', { start: 35, consumes: ['metalli'] }),

  // --- Medicina ---
  t('acquedotti', 'medicina', 'igiene', 'Acquedotti e fognature', 1860, 30, 0.6, [], { stability: 1 }, 'Acqua pulita contro il colera.', { start: 40 }),
  t('antisepsi', 'medicina', 'igiene', 'Antisepsi', 1867, 26, 0.5, [], { attrition: 0.92 }, 'Lister: il fenolo in sala operatoria; i feriti sopravvivono.', { start: 35 }),
  t('croce_rossa', 'medicina', 'igiene', 'Sanità militare moderna', 1880, 30, 0.6, ['antisepsi'], { exhaustion: 0.95, attrition: 0.95 }, 'Ospedali da campo, barelle, ambulanze ferroviarie.', { start: 80 }),
  t('batteriologia', 'medicina', 'batteriologia', 'Batteriologia', 1882, 40, 0.8, ['antisepsi'], { stability: 1, attrition: 0.93 }, 'Koch isola il bacillo della tubercolosi (1882) e del colera (1883).', {}),
  t('vaccini', 'medicina', 'batteriologia', 'Vaccini e sieri', 1890, 46, 0.9, ['batteriologia'], { stability: 1, manpower: 1.03 }, 'Pasteur, Behring: rabbia, difterite, tetano.', {}),
  t('chinino', 'medicina', 'tropicale', 'Profilassi col chinino', 1854, 20, 0.4, [], { attrition: 0.95 }, 'Il chinino ogni giorno per le truppe in Africa.', { start: 20 }),
  t('medicina_tropicale', 'medicina', 'tropicale', 'Medicina tropicale', 1897, 46, 0.9, ['chinino', 'batteriologia'], { attrition: 0.88 }, 'Laveran e Ross: la malaria viene dalla zanzara.', {}),
];

export interface Scientist {
  id: string;
  name: string;
  nation: Tag;
  /** linee dell'albero in cui lavora */
  lines: string[];
  years: [number, number];
  /** velocità in più (0,05-0,2) */
  speed: number;
  /** costo in più (laboratorio, onorari), 0-0,1 */
  cost?: number;
  note: string;
}

const sc = (id: string, nation: Tag, name: string, lines: string[], years: [number, number], speed: number, note: string, cost = 0): Scientist => ({ id, nation, name, lines, years, speed, cost, note });

export const SCIENTISTS: Scientist[] = [
  // Italia
  sc('ferraris', 'ITA', 'Galileo Ferraris', ['elettricita', 'idro'], [1881, 1897], 0.15, 'Il campo magnetico rotante (1885).'),
  sc('pacinotti', 'ITA', 'Antonio Pacinotti', ['elettricita'], [1881, 1912], 0.08, 'L\'inventore dell\'anello della dinamo.'),
  sc('cannizzaro', 'ITA', 'Stanislao Cannizzaro', ['chimica'], [1881, 1910], 0.1, 'Il padre della chimica italiana moderna.'),
  sc('sobrero', 'ITA', 'Ascanio Sobrero', ['esplosivi'], [1881, 1888], 0.05, 'Lo scopritore della nitroglicerina, ormai anziano.'),
  sc('golgi', 'ITA', 'Camillo Golgi', ['batteriologia', 'igiene'], [1881, 1926], 0.1, 'Istologo; studia il ciclo della malaria.'),
  sc('grassi', 'ITA', 'Giovanni Battista Grassi', ['tropicale'], [1885, 1925], 0.12, 'Dimostra che l\'anofele trasmette la malaria umana.'),
  sc('righi', 'ITA', 'Augusto Righi', ['comunicazioni'], [1885, 1920], 0.08, 'Le onde elettromagnetiche, maestro di Marconi.'),
  sc('marconi', 'ITA', 'Guglielmo Marconi', ['comunicazioni'], [1895, 1937], 0.15, 'La radiotelegrafia (poi lavorerà in Inghilterra).', 0.05),
  sc('pirelli', 'ITA', 'Giovanni Battista Pirelli', ['comunicazioni', 'tessile'], [1881, 1932], 0.06, 'Gomma e cavi telegrafici a Milano.'),
  // Germania
  sc('wsiemens', 'GER', 'Werner von Siemens', ['elettricita', 'comunicazioni'], [1881, 1892], 0.18, 'Dinamo, telegrafo, la prima ferrovia elettrica.', 0.1),
  sc('koch', 'GER', 'Robert Koch', ['batteriologia', 'igiene'], [1881, 1910], 0.2, 'Bacilli della tubercolosi e del colera.', 0.05),
  sc('behring', 'GER', 'Emil von Behring', ['batteriologia'], [1890, 1917], 0.1, 'Il siero antidifterico.'),
  sc('baeyer', 'GER', 'Adolf von Baeyer', ['chimica'], [1881, 1917], 0.15, 'La sintesi dell\'indaco.'),
  sc('kekule', 'GER', 'August Kekulé', ['chimica'], [1881, 1896], 0.08, 'La struttura del benzene.'),
  sc('hertz', 'GER', 'Heinrich Hertz', ['comunicazioni', 'elettricita'], [1885, 1894], 0.1, 'Le onde elettromagnetiche (1887).'),
  sc('daimler', 'GER', 'Gottlieb Daimler', ['petrolio'], [1881, 1900], 0.15, 'Il motore veloce a benzina.'),
  sc('benz', 'GER', 'Carl Benz', ['petrolio'], [1881, 1929], 0.1, 'La prima automobile (1886).'),
  sc('diesel', 'GER', 'Rudolf Diesel', ['petrolio', 'carbone'], [1890, 1913], 0.1, 'Il motore ad accensione per compressione.'),
  sc('krupp', 'GER', 'Alfred Krupp', ['artiglieria', 'acciaio'], [1881, 1887], 0.12, 'Il "re dei cannoni" di Essen.', 0.05),
  sc('fakrupp', 'GER', 'Friedrich Alfred Krupp', ['artiglieria', 'acciaio'], [1887, 1902], 0.08, 'L\'erede: corazze e cannoni.'),
  sc('haber', 'GER', 'Fritz Haber', ['concimi', 'chimica'], [1898, 1933], 0.15, 'La sintesi dell\'ammoniaca.'),
  sc('mauser', 'GER', 'Paul Mauser', ['fanteria'], [1881, 1914], 0.12, 'I fucili Mauser.'),
  // Francia
  sc('pasteur', 'FRA', 'Louis Pasteur', ['batteriologia', 'igiene'], [1881, 1895], 0.2, 'Vaccini contro carbonchio e rabbia.', 0.05),
  sc('laveran', 'FRA', 'Alphonse Laveran', ['tropicale'], [1881, 1922], 0.12, 'Scopre il plasmodio della malaria in Algeria.'),
  sc('berthelot', 'FRA', 'Marcellin Berthelot', ['chimica', 'esplosivi'], [1881, 1907], 0.12, 'Termochimica e studio degli esplosivi.'),
  sc('vieille', 'FRA', 'Paul Vieille', ['esplosivi'], [1882, 1934], 0.15, 'La Poudre B senza fumo (1884).'),
  sc('turpin', 'FRA', 'Eugène Turpin', ['esplosivi'], [1881, 1927], 0.1, 'La melinite (1885).'),
  sc('eiffel', 'FRA', 'Gustave Eiffel', ['ferrovie', 'porti'], [1881, 1923], 0.1, 'Viadotti e ponti in ferro: Garabit, il Douro.', 0.05),
  sc('deprez', 'FRA', 'Marcel Deprez', ['elettricita'], [1881, 1918], 0.1, 'La trasmissione elettrica a distanza (1882).'),
  sc('moissan', 'FRA', 'Henri Moissan', ['chimica'], [1886, 1907], 0.08, 'Il fluoro e il forno elettrico.'),
  sc('debange', 'FRA', 'Charles Ragon de Bange', ['artiglieria'], [1881, 1914], 0.1, 'L\'otturatore de Bange dei cannoni francesi.'),
  // Regno Unito
  sc('kelvin', 'GBR', 'Lord Kelvin', ['comunicazioni', 'elettricita'], [1881, 1907], 0.15, 'Cavi sottomarini e misure elettriche.', 0.05),
  sc('lister', 'GBR', 'Joseph Lister', ['igiene'], [1881, 1912], 0.15, 'L\'antisepsi chirurgica.'),
  sc('ross', 'GBR', 'Ronald Ross', ['tropicale'], [1890, 1932], 0.12, 'La zanzara e la malaria (1897).'),
  sc('parsons', 'GBR', 'Charles Parsons', ['carbone', 'porti'], [1884, 1931], 0.15, 'La turbina a vapore (1884).'),
  sc('gthomas', 'GBR', 'Sidney Gilchrist Thomas', ['acciaio'], [1881, 1885], 0.15, 'Il processo basico per l\'acciaio.'),
  sc('wmsiemens', 'GBR', 'William Siemens', ['acciaio', 'elettricita'], [1881, 1883], 0.1, 'Il forno a recupero.'),
  sc('maxim', 'GBR', 'Hiram Maxim', ['fanteria'], [1884, 1916], 0.15, 'La mitragliatrice automatica, costruita a Londra.', 0.05),
  sc('armstrong', 'GBR', 'William Armstrong', ['artiglieria', 'porti'], [1881, 1900], 0.1, 'Cannoni e navi da guerra a Elswick.'),
  sc('lawes', 'GBR', 'John Bennet Lawes', ['concimi'], [1881, 1900], 0.1, 'Rothamsted e i superfosfati.'),
  // Russia
  sc('mendeleev', 'RUS', 'Dmitrij Mendeleev', ['chimica', 'petrolio', 'esplosivi'], [1881, 1907], 0.15, 'La tavola periodica; studia il petrolio di Baku e la polvere senza fumo.'),
  sc('jablockov', 'RUS', 'Pavel Jabločkov', ['elettricita'], [1881, 1894], 0.08, 'La "candela" ad arco.'),
  sc('butlerov', 'RUS', 'Aleksandr Butlerov', ['chimica'], [1881, 1886], 0.08, 'La teoria della struttura chimica.'),
  sc('mosin', 'RUS', 'Sergej Mosin', ['fanteria'], [1881, 1902], 0.1, 'Il fucile Mosin-Nagant (1891).'),
  sc('popov', 'RUS', 'Aleksandr Popov', ['comunicazioni'], [1895, 1906], 0.08, 'Il ricevitore radio (1895).'),
  sc('suchov', 'RUS', 'Vladimir Šuchov', ['petrolio', 'ferrovie'], [1881, 1939], 0.1, 'Oleodotti e cracking a Baku.'),
  // Austria-Ungheria
  sc('mannlicher', 'AUH', 'Ferdinand Mannlicher', ['fanteria'], [1881, 1904], 0.15, 'I fucili a ripetizione Mannlicher.'),
  sc('tesla', 'AUH', 'Nikola Tesla', ['elettricita'], [1881, 1883], 0.15, 'A Budapest nel 1881; nel 1884 emigra in America.'),
  sc('welsbach', 'AUH', 'Carl Auer von Welsbach', ['elettricita', 'chimica'], [1885, 1929], 0.08, 'La reticella a gas e la lampada a osmio.'),
  sc('billroth', 'AUH', 'Theodor Billroth', ['igiene'], [1881, 1894], 0.1, 'Il padre della chirurgia addominale.'),
  sc('skoda', 'AUH', 'Emil Škoda', ['artiglieria', 'acciaio'], [1881, 1900], 0.1, 'Le officine di Pilsen.'),
  // altri
  sc('nobel', 'SWE', 'Alfred Nobel', ['esplosivi'], [1881, 1896], 0.2, 'Dinamite e balistite (vive a Parigi e Sanremo).', 0.1),
  sc('delaval', 'SWE', 'Gustaf de Laval', ['carbone', 'macchine'], [1881, 1913], 0.1, 'Turbina e scrematrice centrifuga.'),
  sc('arrhenius', 'SWE', 'Svante Arrhenius', ['chimica'], [1884, 1927], 0.05, 'La dissociazione elettrolitica.'),
  sc('solvay', 'BEL', 'Ernest Solvay', ['chimica'], [1881, 1922], 0.15, 'La soda all\'ammoniaca.'),
  sc('gramme', 'BEL', 'Zénobe Gramme', ['elettricita'], [1881, 1901], 0.1, 'La dinamo industriale.'),
  sc('vanthoff', 'NED', 'Jacobus van \'t Hoff', ['chimica'], [1881, 1911], 0.1, 'La stereochimica.'),
  sc('cajal', 'SPA', 'Santiago Ramón y Cajal', ['batteriologia', 'igiene'], [1883, 1934], 0.1, 'Istologo; lavora sul colera di Valencia (1885).'),
  sc('peral', 'SPA', 'Isaac Peral', ['porti'], [1881, 1895], 0.05, 'Il sottomarino elettrico (1888).'),
  sc('babes', 'ROM', 'Victor Babeș', ['batteriologia'], [1887, 1926], 0.1, 'Fonda l\'istituto di batteriologia di Bucarest.'),
  sc('brown', 'SWI', 'Charles Brown', ['elettricita', 'idro'], [1891, 1924], 0.1, 'La Brown Boveri di Baden.'),
  sc('finsen', 'DEN', 'Niels Finsen', ['igiene'], [1893, 1904], 0.05, 'La fototerapia.'),
];
