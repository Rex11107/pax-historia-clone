// Interessi coloniali delle potenze (1881). Non sono tappe obbligate: ogni interesse ha un peso storico,
// una finestra di anni in cui l'IA lo persegue di più, prerequisiti leggeri e le vie con cui si ottiene.
// Le province si indicano per nome (vale anche "Nome (est)", "Nome (sud)"…) o per paese di oggi.
//
// Stadi: 1 storico (ciò che la potenza ottenne), 2 rivendicazioni reali (chiese senza ottenere, o più tardi),
// 3 ambizioni (si aprono solo con la decisione "maggiori richieste", dopo un cambio di governo o una crisi).

import type { Tag } from '../engine/types';

export type ColonialPath = 'occupazione' | 'protettorato' | 'acquisto' | 'assenso' | 'guerra';

export const PATH_LABEL: Record<ColonialPath, [string, string]> = {
  occupazione: ['Occupazione', 'una spedizione entra nelle terre di nessuno e le annette'],
  protettorato: ['Trattato di protettorato', 'un sultano o un re accetta la protezione: serve una presenza vicina, conta la paura dei vicini'],
  acquisto: ['Acquisto o cessione', 'si compra il territorio dal suo padrone (come Assab nel 1869, il Benadir nel 1905)'],
  assenso: ['Subentro con assenso', 'chi tiene il territorio (o il suo protettore) acconsente al passaggio: decisivo quando l\'Egitto si ritira'],
  guerra: ['Guerra', 'una guerra vinta: le province dell\'interesse contano come rivendicazioni nella pace'],
};

export interface InterestSeed {
  id: string;
  nation: Tag;
  stage: 1 | 2 | 3;
  name: string;
  desc: string;
  names?: string[];
  modern?: string[];
  paths: ColonialPath[];
  /** peso storico 0-1: quanto l'IA ci tiene */
  weight: number;
  /** anni in cui l'IA lo persegue di più */
  window?: [number, number];
  /** non prima di quest'anno (modalità storica) */
  earliest?: number;
  /** interessi da completare prima */
  requires?: string[];
  /** basta uno di questi */
  requiresAny?: string[];
  /** con questo completato, l'anno minimo non vale più dopo `days` giorni (Italia a Tunisi: la Libia viene prima) */
  early?: { after: string; days: number };
  /** se uno di questi (di chiunque) è completato, l'interesse si chiude */
  excludes?: string[];
  /** stadio 2 aperto fin dall'inizio: una questione già aperta nel 1881 */
  open?: boolean;
}

export const INTERESTS_1881: InterestSeed[] = [
  // --- Italia (pilota) ---
  { id: 'ita-assab', nation: 'ITA', stage: 1, name: 'La baia di Assab', desc: 'Comprata dalla Rubattino nel 1869 ai sultani dancali: il primo possedimento italiano.', names: ['Assab'], paths: ['acquisto'], weight: 1 },
  { id: 'ita-dancalia', nation: 'ITA', stage: 1, name: 'La costa dancala', desc: 'Da Assab lungo il Mar Rosso: Beilul (1885), il sultanato di Raheita e la Dancalia settentrionale.', names: ['Beilul', 'Raheita', 'Dancalia settentrionale'], paths: ['occupazione', 'protettorato'], weight: 0.8, window: [1882, 1888] },
  { id: 'ita-massaua', nation: 'ITA', stage: 1, name: 'Massaua e il Samhar', desc: 'Porto egiziano; nel 1885, con l\'Egitto in ritirata davanti al Mahdi, Londra lascia entrare l\'Italia.', names: ['Massaua', 'Zula'], paths: ['assenso', 'guerra'], weight: 0.9, window: [1884, 1886], earliest: 1882 },
  { id: 'ita-eritrea', nation: 'ITA', stage: 1, name: 'La colonia Eritrea', desc: 'Dalla costa all\'altopiano: Cheren e il Bogos (1888), poi Hamasien, Seraè e Acchelè Guzai, ceduti da Menelik a Uccialli (1889).', names: ['Bogos', 'Sahel', 'Barca', 'Hamasien', 'Seraè', 'Acchelè Guzai'], paths: ['assenso', 'acquisto', 'occupazione', 'guerra'], weight: 0.85, window: [1887, 1890], requires: ['ita-massaua'] },
  { id: 'ita-somalia-nord', nation: 'ITA', stage: 1, name: 'I sultanati somali', desc: 'Protettorati su Obbia (1888) e sulla Migiurtinia (1889): i sultani cercano un appoggio contro i rivali e contro Zanzibar.', names: ['Obbia', 'Migiurtinia', 'Nogal', 'Mudugh'], paths: ['protettorato', 'occupazione'], weight: 0.8, window: [1888, 1890], earliest: 1884 },
  { id: 'ita-benadir', nation: 'ITA', stage: 1, name: 'Il Benadir', desc: 'I porti di Mogadiscio, Merca e Brava, affittati dal sultano di Zanzibar (1892) e comprati nel 1905.', names: ['Benadir', 'Brava', 'Basso Scebeli'], paths: ['acquisto', 'assenso', 'guerra'], weight: 0.7, window: [1889, 1905], earliest: 1885 },
  { id: 'ita-tunisia', nation: 'ITA', stage: 2, name: 'Tunisi', desc: 'Colonia di fatto degli italiani, ma la Francia prepara il protettorato. Una questione aperta nel 1881.', modern: ['TUN'], paths: ['protettorato', 'guerra'], weight: 0.35, window: [1881, 1882], open: true, excludes: ['fra-tunisia'] },
  { id: 'ita-libia', nation: 'ITA', stage: 2, name: 'Tripolitania e Cirenaica', desc: 'La "quarta sponda", presa agli Ottomani nel 1911. Con Tunisi già italiana, la questione si apre un anno dopo.', modern: ['LBY'], paths: ['guerra', 'assenso'], weight: 0.6, window: [1911, 1912], earliest: 1911, early: { after: 'ita-tunisia', days: 365 } },
  { id: 'ita-etiopia', nation: 'ITA', stage: 2, name: 'L\'Etiopia', desc: 'L\'articolo 17 di Uccialli letto come protettorato; poi Adua (1896). Si apre con l\'Eritrea.', modern: ['ETH'], paths: ['protettorato', 'guerra'], weight: 0.45, window: [1889, 1896], requires: ['ita-eritrea'] },
  { id: 'ita-somalia-int', nation: 'ITA', stage: 2, name: 'La Somalia interna', desc: 'Dall\'Uebi Scebeli al Giuba: Hiran, Bai, Lugh, tenuti a fatica fino agli anni Venti.', names: ['Hiran', 'Bai', 'Lugh'], paths: ['occupazione', 'protettorato'], weight: 0.5, window: [1895, 1925], requiresAny: ['ita-somalia-nord', 'ita-benadir'] },
  { id: 'ita-oltregiuba', nation: 'ITA', stage: 2, name: 'L\'Oltregiuba', desc: 'Chisimaio e la riva destra del Giuba, ceduti da Londra nel 1924 come compenso per la guerra.', names: ['Oltregiuba', 'Chisimaio'], paths: ['assenso', 'acquisto'], weight: 0.35, window: [1919, 1925], requires: ['ita-benadir'] },
  { id: 'ita-albania', nation: 'ITA', stage: 3, name: 'L\'Albania', desc: 'L\'altra sponda dell\'Adriatico: Valona (1914), il protettorato (1917), l\'occupazione (1939).', modern: ['ALB'], paths: ['protettorato', 'guerra'], weight: 0.4, window: [1912, 1939] },
  { id: 'ita-ogaden', nation: 'ITA', stage: 3, name: 'L\'Ogaden', desc: 'Le terre somale fra l\'Harar e la Somalia italiana.', names: ['Ogaden', 'Haud', 'Giggiga', 'Uebi Scebeli'], paths: ['occupazione', 'guerra'], weight: 0.35, window: [1900, 1936], requiresAny: ['ita-somalia-int', 'ita-etiopia'] },

  // --- Francia ---
  { id: 'fra-tunisia', nation: 'FRA', stage: 1, name: 'Il protettorato di Tunisi', desc: 'Il trattato del Bardo (maggio 1881), con il pretesto dei Krumiri.', modern: ['TUN'], paths: ['protettorato', 'guerra'], weight: 1, window: [1881, 1882], excludes: ['ita-tunisia'] },
  { id: 'fra-sudan', nation: 'FRA', stage: 1, name: 'Il Sudan francese', desc: 'Dal Senegal al Niger: Toucouleur, Samori, Timbuctù.', modern: ['SEN', 'MLI', 'GIN', 'BFA', 'MRT'], paths: ['occupazione', 'guerra', 'protettorato'], weight: 0.9, window: [1881, 1900] },
  { id: 'fra-congo', nation: 'FRA', stage: 1, name: 'Il Congo francese', desc: 'I trattati di Brazza con il Makoko dei Teke (1880) e l\'Ogooué.', modern: ['GAB', 'COG', 'CAF'], paths: ['protettorato', 'occupazione'], weight: 0.8, window: [1882, 1891] },
  { id: 'fra-obock', nation: 'FRA', stage: 1, name: 'Obock e Gibuti', desc: 'Comprata ai sultani dancali nel 1862, occupata dal 1884: lo scalo per l\'Indocina.', modern: ['DJI'], paths: ['protettorato', 'acquisto'], weight: 0.7, window: [1884, 1896] },
  { id: 'fra-madagascar', nation: 'FRA', stage: 1, name: 'Il Madagascar', desc: 'Protettorato dopo la guerra del 1883-85, annessione nel 1896.', modern: ['MDG'], paths: ['protettorato', 'guerra'], weight: 0.8, window: [1883, 1896] },
  { id: 'fra-guinea', nation: 'FRA', stage: 1, name: 'Costa d\'Avorio e Dahomey', desc: 'I banchi della costa e il regno di Behanzin (1892-94).', modern: ['CIV', 'BEN'], paths: ['protettorato', 'guerra', 'occupazione'], weight: 0.75, window: [1889, 1894] },
  { id: 'fra-niger', nation: 'FRA', stage: 2, name: 'Niger e Ciad', desc: 'La missione Voulet-Chanoine e la caduta di Rabih (1900): unire l\'Africa occidentale e quella equatoriale.', modern: ['NER', 'TCD'], paths: ['occupazione', 'guerra'], weight: 0.6, window: [1897, 1914], requires: ['fra-sudan'] },
  { id: 'fra-marocco', nation: 'FRA', stage: 2, name: 'Il Marocco', desc: 'L\'intesa con Londra (1904), le crisi del 1905 e del 1911, il protettorato (1912).', modern: ['MAR'], paths: ['protettorato', 'guerra'], weight: 0.6, window: [1904, 1912], earliest: 1900, excludes: ['spa-marocco', 'ger-marocco'] },
  { id: 'fra-fascioda', nation: 'FRA', stage: 3, name: 'L\'Alto Nilo', desc: 'La missione Marchand a Fascioda (1898): una fascia francese da Dakar a Gibuti.', names: ['Fascioda', 'Sobat', 'Bahr el-Ghazal'], paths: ['occupazione', 'assenso'], weight: 0.3, window: [1896, 1899], excludes: ['gbr-sudan'] },

  // --- Gran Bretagna ---
  { id: 'gbr-egitto', nation: 'GBR', stage: 1, name: 'L\'Egitto', desc: 'Il "protettorato velato": Tel el-Kebir (1882) e il governo di Cromer.', modern: ['EGY'], paths: ['protettorato', 'guerra'], weight: 0.9, window: [1882, 1883] },
  { id: 'gbr-somaliland', nation: 'GBR', stage: 1, name: 'Zeila e Berbera', desc: 'La costa somala di fronte ad Aden, lasciata dall\'Egitto nel 1884.', names: ['Zeila', 'Berbera'], paths: ['assenso', 'occupazione', 'protettorato'], weight: 0.85, window: [1884, 1887] },
  { id: 'gbr-niger', nation: 'GBR', stage: 1, name: 'Il Niger', desc: 'La Royal Niger Company di Goldie, gli emirati di Sokoto, Benin (1897).', modern: ['NGA'], paths: ['protettorato', 'guerra', 'occupazione'], weight: 0.85, window: [1885, 1903] },
  { id: 'gbr-costa-oro', nation: 'GBR', stage: 1, name: 'La Costa d\'Oro', desc: 'La colonia della costa e le guerre con gli Ascianti (fino al 1901).', modern: ['GHA', 'SLE'], paths: ['guerra', 'protettorato', 'occupazione'], weight: 0.75, window: [1881, 1901] },
  { id: 'gbr-africa-orientale', nation: 'GBR', stage: 1, name: 'L\'Africa orientale britannica', desc: 'La compagnia di Mackinnon, il Buganda (1894), il Kenya.', modern: ['KEN', 'UGA'], paths: ['protettorato', 'occupazione', 'guerra'], weight: 0.8, window: [1888, 1900] },
  { id: 'gbr-zanzibar', nation: 'GBR', stage: 1, name: 'Zanzibar', desc: 'Il protettorato del 1890, scambiato con Helgoland.', names: ['Zanzibar', 'Mombasa', 'Lindi'], paths: ['protettorato', 'guerra'], weight: 0.7, window: [1890, 1896] },
  { id: 'gbr-rodesia', nation: 'GBR', stage: 1, name: 'Bechuanaland e Rhodesia', desc: 'Rhodes e la British South Africa Company: la via del Capo verso nord.', modern: ['BWA', 'ZWE', 'ZMB', 'MWI'], paths: ['protettorato', 'guerra', 'occupazione'], weight: 0.85, window: [1885, 1900], excludes: ['por-mappa-rosa'] },
  { id: 'gbr-aden', nation: 'GBR', stage: 1, name: 'Il protettorato di Aden', desc: 'I trattati con i sultani dell\'Hadramaut e di Lahej.', names: ['Lahej', 'Shabwa', 'Mukalla', 'Mahra', 'Socotra'], paths: ['protettorato', 'occupazione'], weight: 0.6, window: [1886, 1914] },
  { id: 'gbr-sudan', nation: 'GBR', stage: 2, name: 'La riconquista del Sudan', desc: 'Kitchener a Omdurman (1898): il condominio anglo-egiziano.', modern: ['SDN', 'SDS'], paths: ['guerra', 'occupazione'], weight: 0.6, window: [1896, 1899], requires: ['gbr-egitto'] },
  { id: 'gbr-boeri', nation: 'GBR', stage: 2, name: 'Le repubbliche boere', desc: 'La guerra del 1899-1902.', names: ['Pretoria', 'Zoutpansberg', 'Lydenburg', 'Bloemfontein', 'Wolmaransstad', 'Harrismith'], paths: ['guerra'], weight: 0.5, window: [1899, 1902] },
  { id: 'gbr-somalia-int', nation: 'GBR', stage: 2, name: 'L\'interno somalo', desc: 'L\'Haud, i Dulbahante e i Uarsangheli.', names: ['Haud', 'Dulbahante', 'Uarsangheli'], paths: ['protettorato', 'occupazione'], weight: 0.4, window: [1886, 1920], requires: ['gbr-somaliland'] },
  { id: 'gbr-tanganica', nation: 'GBR', stage: 3, name: 'Dal Capo al Cairo', desc: 'L\'anello mancante: le terre fra i Grandi Laghi e il Nyasa.', modern: ['TZA', 'RWA', 'BDI'], paths: ['occupazione', 'guerra', 'protettorato'], weight: 0.3, window: [1890, 1919], excludes: ['ger-africa-orientale'] },

  // --- Germania (dal 1884) ---
  { id: 'ger-camerun', nation: 'GER', stage: 1, name: 'Camerun e Togo', desc: 'I trattati di Nachtigal (1884).', modern: ['CMR', 'TGO'], paths: ['protettorato', 'occupazione'], weight: 0.85, window: [1884, 1890], earliest: 1884 },
  { id: 'ger-sudovest', nation: 'GER', stage: 1, name: 'L\'Africa del Sud-Ovest', desc: 'Lüderitz ad Angra Pequena (1884).', modern: ['NAM'], paths: ['occupazione', 'acquisto'], weight: 0.8, window: [1884, 1890], earliest: 1884 },
  { id: 'ger-africa-orientale', nation: 'GER', stage: 1, name: 'L\'Africa orientale tedesca', desc: 'Peters e la compagnia dell\'Africa orientale (1885): la terraferma di Zanzibar.', modern: ['TZA', 'RWA', 'BDI'], paths: ['protettorato', 'occupazione', 'acquisto', 'guerra'], weight: 0.85, window: [1885, 1898], earliest: 1884, excludes: ['gbr-tanganica'] },
  { id: 'ger-marocco', nation: 'GER', stage: 2, name: 'Il Marocco', desc: 'Il "colpo di Agadir" (1911): o il Marocco o un compenso.', modern: ['MAR'], paths: ['protettorato', 'assenso'], weight: 0.2, window: [1905, 1911], earliest: 1900, excludes: ['fra-marocco', 'spa-marocco'] },
  { id: 'ger-mittelafrika', nation: 'GER', stage: 3, name: 'La Mittelafrika', desc: 'Il sogno di unire Camerun e Africa orientale attraverso il Congo.', modern: ['COD', 'COG', 'CAF'], paths: ['assenso', 'guerra', 'occupazione'], weight: 0.25, window: [1900, 1918], requiresAny: ['ger-camerun'] },

  // --- Portogallo ---
  { id: 'por-angola', nation: 'POR', stage: 1, name: 'L\'Angola', desc: 'Dalle fortezze della costa all\'altopiano degli Ovimbundu.', modern: ['AGO'], paths: ['occupazione', 'guerra', 'protettorato'], weight: 0.85, window: [1885, 1915] },
  { id: 'por-mozambico', nation: 'POR', stage: 1, name: 'Il Mozambico', desc: 'Dai prazos dello Zambesi alla campagna di Gungunhana (1895).', modern: ['MOZ'], paths: ['occupazione', 'guerra'], weight: 0.85, window: [1885, 1902] },
  { id: 'por-mappa-rosa', nation: 'POR', stage: 2, name: 'La mappa rosa', desc: 'Unire Angola e Mozambico; l\'ultimatum britannico del 1890 la chiude.', modern: ['ZMB', 'ZWE', 'MWI'], paths: ['occupazione', 'protettorato'], weight: 0.4, window: [1886, 1890], excludes: ['gbr-rodesia'] },

  // --- Belgio (Leopoldo II) ---
  { id: 'bel-congo', nation: 'BEL', stage: 1, name: 'Lo Stato libero del Congo', desc: 'L\'Associazione internazionale di Leopoldo, riconosciuta a Berlino (1885).', modern: ['COD'], paths: ['occupazione', 'protettorato', 'guerra'], weight: 0.9, window: [1882, 1908], earliest: 1882 },
  { id: 'bel-lado', nation: 'BEL', stage: 2, name: 'L\'enclave di Lado', desc: 'L\'affitto britannico sull\'Alto Nilo (1894-1910).', names: ['Lado', 'Equatoria'], paths: ['assenso', 'occupazione'], weight: 0.3, window: [1894, 1910], requires: ['bel-congo'] },

  // --- Spagna ---
  { id: 'spa-rio-de-oro', nation: 'SPA', stage: 1, name: 'Il Rio de Oro', desc: 'Villa Cisneros (1884) di fronte alle Canarie.', modern: ['SAH'], names: ['Saguia el-Hamra'], paths: ['occupazione'], weight: 0.6, window: [1884, 1886], earliest: 1884 },
  { id: 'spa-marocco', nation: 'SPA', stage: 2, name: 'Il Marocco settentrionale', desc: 'Il Rif e Tetuan: la zona spagnola del 1912.', names: ['Tangeri', 'Uezzan', 'Taza', 'Mehdia'], paths: ['protettorato', 'guerra', 'assenso'], weight: 0.35, window: [1904, 1912], earliest: 1900, excludes: ['ger-marocco'] },
];
