// Rivendicazioni storiche e pretese al 1881 (oltre a quelle "di nucleo", che nascono dalle etnie).
// Una provincia può essere rivendicata da più nazioni: è così che nascono le contese dell'epoca.

import type { Tag } from '../engine/types';
import type { Match } from './ethnic1881';

export type ClaimStrength = 'nucleo' | 'storica' | 'pretesa';

/** [chi rivendica, forza, dove, perché] */
export const CLAIMS_1881: [Tag, ClaimStrength, Match, string][] = [
  // Impero ottomano: i deserti fra Siria, Iraq e Arabia, rivendicati sulla carta ma in mano alle tribù beduine
  ['MEX', 'pretesa', { modern: ['MEX'], owner: [''] }, 'lo Yucatán orientale dei maya di Chan Santa Cruz'],
  ['GUA', 'pretesa', { name: ['Belize', 'Toledo (Belize)', 'Soconusco', 'Chiapas'] }, 'il Belize britannico e il Soconusco'],
  ['NIC', 'pretesa', { name: ['Riserva Mosquitia', 'Capo Gracias a Dios'] }, 'la Riserva Mosquitia'],
  ['CHL', 'pretesa', { name: ['Antofagasta', 'Cobija', 'Calama', 'Atacama', 'Taltal', 'Tarapacá', 'Iquique', 'Pisagua', 'Arica', 'Putre', 'Tacna', 'Tarata'] }, 'il deserto del salnitro conquistato nella guerra del Pacifico'],
  ['CHL', 'pretesa', { modern: ['CHL'], owner: [''] }, 'l\'Araucanía e la Patagonia occidentale'],
  ['ARG', 'pretesa', { modern: ['ARG'], owner: [''] }, 'la Patagonia, la Terra del Fuoco e il Chaco'],
  ['CHL', 'pretesa', { name: ['Santa Cruz (Patagonia)', 'Lago Argentino', 'Río Gallegos', 'Terra del Fuoco argentina'] }, 'la Patagonia australe fino al Río Santa Cruz'],
  ['BOL', 'pretesa', { name: ['Chaco Boreal', 'Alto Paraguay', 'Formosa', 'Chaco centrale'] }, 'il Chaco fino al Pilcomayo e al fiume Paraguay'],
  ['PAR', 'pretesa', { name: ['Chaco Boreal', 'Alto Paraguay', 'Otuquis'] }, 'il Chaco Boreal'],
  ['VEN', 'pretesa', { name: ['Essequibo', 'Barima', 'Cuyuni', 'Guyana interna', 'Rupununi'] }, 'la Guayana Esequiba fino al fiume Essequibo'],
  ['FRA', 'pretesa', { name: ['Amapá'] }, 'il Contestato franco-brasiliano fra l\'Oyapock e l\'Araguari'],
  ['BRA', 'pretesa', { name: ['Amapá', 'Rupununi'] }, 'il Contestato franco-brasiliano e il Pirara'],
  ['ECU', 'pretesa', { name: ['Maynas', 'Iquitos', 'Putumayo', 'Jaén (Perù)', 'Tumbes'] }, 'l\'Amazzonia del Marañón e le province di confine'],
  ['PRU', 'pretesa', { name: ['Canelos', 'Macas', 'Napo'] }, 'l\'Oriente ecuadoriano'],
  ['COL', 'pretesa', { name: ['Putumayo'] }, 'il Putumayo'],
  ['GBR', 'pretesa', { name: ['Paese del Re', 'Urewera', 'Taupo'] }, 'le terre maori fuori dal controllo coloniale (Kīngitanga)'],
  ['SPA', 'pretesa', { name: ['Pohnpei', 'Chuuk', 'Yap', 'Kosrae', 'Palau'] }, 'le Caroline e Palau, rivendicate dalla Spagna'],
  ['FRA', 'pretesa', { name: ['Isole Sottovento'] }, 'le Isole Sottovento della Società'],
  ['CHI', 'nucleo', { name: ['Ili'] }, 'l\'Ili occupato dai russi dal 1871 (trattato di San Pietroburgo in discussione)'],
  ['CHI', 'pretesa', { name: ['Okinawa', 'Sakishima'] }, 'il regno delle Ryukyu, tributario dei Qing, annesso dal Giappone nel 1879'],
  ['CHI', 'pretesa', { owner: [''], modern: ['CHN', 'TWN'] }, 'tribù e altipiani di frontiera'],
  ['NED', 'pretesa', { owner: ['ACH'] }, 'Aceh, in guerra dal 1873'],
  ['NED', 'pretesa', { owner: ['BAL', 'LOM'] }, 'sovranità riconosciuta dai principi balinesi nei trattati del 1841-49'],
  ['NED', 'pretesa', { modern: ['IDN'], owner: [''] }, 'le Indie fino al 141° meridiano'],
  ['SPA', 'pretesa', { modern: ['PHL'], owner: [''] }, 'la Cordigliera e Mindanao interno'],
  ['SUL', 'pretesa', { name: ['Sandakan', 'Darvel Bay', 'Kudat'] }, 'il Borneo nord-orientale, ceduto a Dent nel 1878'],
  ['ANN', 'pretesa', { name: ['Xieng Khouang', 'Houaphan'] }, 'principati lao tributari anche di Hue'],
  ['TUR', 'pretesa', { name: ['Hamad', 'Uadi Arar', 'Uadi Sirhan', 'Paese dei Dhafir', 'Deserto di Anbar', 'Najaf (sud)', 'Dahna', 'Summan'] }, 'deserti beduini dei vilayet di Siria, Baghdad e Bassora'],
  // Francia: la ferita del 1871
  ['FRA', 'storica', { iso: ['FR-67', 'FR-68', 'FR-57'], owner: ['GER'] }, 'Alsazia-Lorena, perse nel 1871'],
  // Italia: le terre irredente oltre il nucleo etnico
  ['ITA', 'storica', { iso: ['HR-13', 'HR-17', 'HR-19', 'HR-08'] }, 'Dalmazia veneziana'],
  ['ITA', 'storica', { iso: ['HR-18', 'SI-046', 'IT-GO'] }, 'Istria e Gorizia'],
  ['ITA', 'pretesa', { iso: ['FR-06'] }, 'Nizza, ceduta nel 1860'],
  ['ITA', 'pretesa', { iso: ['FR-2A', 'FR-2B'] }, 'Corsica'],
  ['ITA', 'pretesa', { modern: ['MLT'] }, 'Malta'],
  ['ITA', 'pretesa', { iso: ['CH-TI'] }, 'Canton Ticino'],
  ['ITA', 'pretesa', { modern: ['TUN'] }, 'Tunisi, colonia di fatto degli italiani'],
  ['ITA', 'pretesa', { modern: ['LBY'] }, 'Tripolitania e Cirenaica'],
  ['ITA', 'pretesa', { modern: ['ALB'] }, 'l\'altra sponda dell\'Adriatico'],
  // Serbia e Montenegro
  ['SER', 'storica', { modern: ['BIH'] }, 'Bosnia ed Erzegovina, occupate dall\'Austria (1878)'],
  ['SER', 'storica', { modern: ['KOS'] }, 'Vecchia Serbia e Kosovo'],
  ['SER', 'storica', { owner: ['TUR'], modern: ['SRB', 'MNE'] }, 'Sangiaccato di Novi Pazar'],
  ['SER', 'storica', { modern: ['MKD'], name: ['Uskub', 'Kalkandelen'] }, 'Macedonia settentrionale'],
  ['SER', 'pretesa', { modern: ['MKD'] }, 'Macedonia'],
  ['SER', 'pretesa', { iso: ['RS-03', 'RS-07', 'RS-02', 'RS-04'] }, 'Voivodina'],
  ['MNE', 'storica', { name: ['Trebigne', 'Mostar'] }, 'Erzegovina'],
  ['MNE', 'storica', { owner: ['TUR'], modern: ['SRB', 'MNE'] }, 'Sangiaccato'],
  ['MNE', 'pretesa', { name: ['Scutari'] }, 'Scutari'],
  // Bulgaria: la grande Bulgaria di Santo Stefano
  ['BUL', 'storica', { modern: ['MKD'] }, 'Macedonia di Santo Stefano'],
  ['BUL', 'storica', { name: ['Kilkís'] }, 'Macedonia'],
  ['BUL', 'pretesa', { owner: ['TUR'], iso: ['GR-A'] }, 'Tracia'],
  ['BUL', 'pretesa', { iso: ['TR-22', 'TR-39'] }, 'Tracia orientale'],
  ['BUL', 'pretesa', { iso: ['RO-TL', 'RO-CT'] }, 'Dobrugia'],
  // Grecia: la Megali Idea
  ['GRE', 'storica', { owner: ['TUR'], iso: ['GR-E', 'GR-D'] }, 'Tessaglia ed Epiro, promesse a Berlino'],
  ['GRE', 'storica', { owner: ['TUR'], iso: ['GR-M'] }, 'Creta'],
  ['GRE', 'storica', { owner: ['TUR'], iso: ['GR-B', 'GR-C', 'GR-A', 'GR-K', 'GR-L'] }, 'Macedonia, Tracia e isole'],
  ['GRE', 'storica', { name: ['Argirocastro'] }, 'Epiro settentrionale'],
  ['GRE', 'pretesa', { iso: ['TR-34', 'TR-35', 'TR-59', 'TR-39'] }, 'Costantinopoli e Ionia'],
  ['GRE', 'pretesa', { modern: ['CYP', 'CYN'] }, 'Cipro'],
  // Romania
  ['ROM', 'storica', { modern: ['MDA'] }, 'Bessarabia, ripresa dalla Russia nel 1878'],
  ['ROM', 'storica', { iso: ['UA-77', 'RO-SV'] }, 'Bucovina'],
  ['ROM', 'pretesa', { owner: ['AUH'], modern: ['ROU'] }, 'Transilvania e Banato'],
  // Russia: stretti e Slavi
  ['RUS', 'pretesa', { iso: ['TR-34', 'TR-17'] }, 'Costantinopoli e gli Stretti'],
  ['RUS', 'pretesa', { owner: ['AUH'], modern: ['UKR'] }, 'Galizia orientale e Rutenia (panslavismo)'],
  ['RUS', 'pretesa', { iso: ['TR-25', 'TR-04', 'TR-65'] }, 'Armenia turca'],
  // Impero ottomano: la sovranità perduta
  ['TUR', 'storica', { modern: ['BIH'] }, 'Bosnia, ancora di diritto ottomana'],
  ['TUR', 'storica', { modern: ['BGR'] }, 'Bulgaria, principato tributario'],
  ['TUR', 'storica', { iso: ['TR-36', 'TR-75', 'TR-76'] }, 'Kars, Ardahan e Batum (1878)'],
  ['TUR', 'storica', { modern: ['CYP', 'CYN'] }, 'Cipro, affidata agli inglesi (1878)'],
  ['TUR', 'pretesa', { modern: ['ROU'], iso: ['RO-TL', 'RO-CT'] }, 'Dobrugia'],
  ['TUR', 'pretesa', { modern: ['SRB'], name: ['Nisch', 'Pirot', 'Leskovac'] }, 'Niš, ceduta nel 1878'],
  // Austria-Ungheria
  ['AUH', 'pretesa', { owner: ['TUR'], modern: ['SRB', 'MNE'] }, 'Sangiaccato (presidi dal 1879)'],
  ['AUH', 'pretesa', { name: ['Salonicco'] }, 'la via di Salonicco'],
  // Danimarca, Spagna, Germania
  ['DEN', 'storica', { iso: ['DE-SH'] }, 'Schleswig, perso nel 1864'],
  ['SPA', 'storica', { modern: ['GIB'] }, 'Gibilterra'],
  ['SPA', 'pretesa', { modern: ['MAR'], iso: ['MA-01'] }, 'il Rif e Tetuán'],
  ['GER', 'pretesa', { iso: ['FR-54', 'FR-55', 'FR-88'] }, 'Lorena francese (Briey)'],
  // Persia, Egitto
  ['PER', 'storica', { modern: ['AZE', 'ARM'] }, 'il Caucaso perso nel 1828'],
  ['EGY', 'pretesa', { modern: ['ISR', 'PSX', 'SYR', 'LBN'] }, 'la Siria di Mehmet Ali'],
];
