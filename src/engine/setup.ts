import { GameMap } from './map';
import type { GameState, MapData, NationProfile, NationState, Tag, Unit, UnitType } from './types';
import { NOBODY, type World } from './world';
import { updateDeserts } from './desert';
import { colonialWeight } from './ethnic';
import { INITIAL_OPINIONS, INITIAL_TREATIES, NATIONS } from '../scenario/europe1881';
import { AMERICAS_OCCUPATIONS } from '../scenario/americas1881';

export const ROMAN = (n: number) => {
  const t: [number, string][] = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let s = '';
  for (const [v, r] of t) while (n >= v) { s += r; n -= v; }
  return s;
};

export const UNIT_LABEL: Record<UnitType, string> = { infantry: 'Corpo d\'armata', cavalry: 'Divisione di cavalleria', artillery: 'Brigata d\'artiglieria' };

export function profilesFor(): Record<Tag, NationProfile> {
  const out: Record<Tag, NationProfile> = {};
  for (const [tag, p] of Object.entries(NATIONS)) out[tag] = { tag, ...p };
  return out;
}

export function newGame(mapData: MapData, player: Tag = 'ITA', seed = 'regnum'): World {
  const map = new GameMap(mapData);
  const profiles = profilesFor();
  const owner = map.provinces.map((p) => p.owner);
  const present = new Set(owner.filter((t) => t !== NOBODY));

  const nations: Record<Tag, NationState> = {};
  for (const tag of present) {
    const pr = profiles[tag];
    if (!pr) throw new Error(`profilo mancante per ${tag}`);
    const pop = map.provinces.filter((p) => p.owner === tag).reduce((s, p) => s + p.pop * colonialWeight({ map } as World, tag, p.id), 0) * (profiles[tag]?.fiscal ?? 1);
    nations[tag] = {
      tag,
      treasury: Math.round(pop / 1e6 * 4 * (0.5 + pr.finance / 100)),
      debt: pr.debt,
      manpower: Math.round(pop * 0.004),
      stability: Math.round(pr.cohesion * 0.6 + 30),
      warExhaustion: 0,
      rail: pr.rail,
      opinion: {},
      policies: { tax: 'normal', mobilization: 'peace', infrastructure: 'normal', press: 'guided' },
      capital: map.locate(pr.capital[0], pr.capital[1], tag) ?? map.nearest(pr.capital[0], pr.capital[1], tag),
      alive: true,
      turnLosses: 0,
    };
  }
  for (const [a, b, v] of INITIAL_OPINIONS) if (nations[a] && nations[b]) nations[a].opinion[b] = v;

  const state: GameState = {
    version: 1, seed, scenario: mapData.scenario, player,
    day: 0, turn: 1, owner, controller: [...owner], nations,
    units: [], battles: {}, wars: [], treaties: [], situations: [], events: [], memory: [], chronicle: '', dispatches: [], chats: {}, nextId: 0,
  };
  INITIAL_TREATIES.forEach((t, i) => state.treaties.push({ id: `t${i}`, ...t, startDay: -365, endDay: null }));
  // guerra del Pacifico (dal 5 aprile 1879): il Cile occupa il Litorale boliviano e il sud del Perù
  if (nations.CHL && nations.PRU && nations.BOL) {
    for (const o of AMERICAS_OCCUPATIONS) for (const p of map.provinces) if (o.owners.includes(owner[p.id]) && o.names.includes(p.name)) state.controller[p.id] = o.by;
    state.wars.push({ id: 'w_pacifico', name: 'Guerra del Pacifico', attackers: ['CHL'], defenders: ['PRU', 'BOL'], startDay: -637, casualties: { CHL: 9000, PRU: 18000, BOL: 6000 } });
  }
  state.situations.push({
    id: 'tunisia', title: 'La questione tunisina', startDay: 0, nations: ['FRA', 'ITA', 'TUN', 'TUR'],
    summary: 'Francia e Italia si contendono l\'influenza sul Beilicato di Tunisi, indebitato e formalmente vassallo ottomano. Parigi prepara un intervento con il pretesto delle incursioni dei Krumiri dall\'Algeria.',
  });
  state.situations.push({
    id: 'thessaly', title: 'Tessaglia ed Epiro', startDay: 0, nations: ['GRE', 'TUR', 'GBR'],
    summary: 'Le potenze hanno promesso alla Grecia rettifiche di confine a spese dell\'Impero ottomano dopo il Congresso di Berlino; la trattativa è ancora aperta.',
  });

  state.situations.push({
    id: 'boer', title: 'La rivolta del Transvaal', startDay: 0, nations: ['TRA', 'GBR', 'OFS'],
    summary: 'Il 16 dicembre 1880 i boeri hanno proclamato di nuovo la Repubblica Sudafricana, annessa dalla Gran Bretagna nel 1877: le guarnigioni britanniche sono assediate e il generale Colley raccoglie truppe nel Natal.',
  });
  state.situations.push({
    id: 'scramble', title: 'La corsa all\'Africa', startDay: 0, nations: ['GBR', 'FRA', 'POR', 'GER', 'ITA', 'BEL'],
    summary: 'Brazza e Stanley si contendono il bacino del Congo; la Francia avanza dal Senegal verso il Niger; il Portogallo rivendica le terre fra Angola e Mozambico; la compagnia genovese Rubattino tiene la baia di Assab per conto dell\'Italia.',
  });

  state.situations.push({
    id: 'pacifico', title: 'La guerra del Pacifico', startDay: 0, nations: ['CHL', 'PRU', 'BOL'],
    summary: 'Dal 1879 il Cile combatte Perù e Bolivia per il salnitro del deserto: ha preso il Litorale boliviano, Tarapacá, Arica e Tacna e ora sbarca a sud di Lima, difesa da Piérola con milizie improvvisate.',
  });
  state.situations.push({
    id: 'patagonia', title: 'Patagonia contesa', startDay: 0, nations: ['ARG', 'CHL'],
    summary: 'Argentina e Cile si contendono la Patagonia e la Terra del Fuoco; il console statunitense media un trattato. Intanto Roca ha spinto la frontiera al Río Negro e il Cile avanza nell\'Araucanía.',
  });
  state.situations.push({
    id: 'panama', title: 'Il canale di Panama', startDay: 0, nations: ['COL', 'FRA'],
    summary: 'Il 1° gennaio 1881 la compagnia di Ferdinand de Lesseps comincia i lavori del canale attraverso l\'istmo di Panama, provincia degli Stati Uniti di Colombia.',
  });

  const w: World = { map, profiles, state };
  updateDeserts(w); // il deserto circondato da un solo stato è suo fin dall'inizio
  for (const tag of present) placeArmies(w, tag);
  return w;
}

export function placeArmies(w: World, tag: Tag) {
  const pr = w.profiles[tag];
  const s = w.state;
  if (!pr.armyPeace) return;
  const own = w.map.provinces.filter((p) => p.owner === tag && !p.impassable).map((p) => p.id);
  if (!own.length) return;
  const n = Math.max(1, Math.min(28, Math.round(pr.armyPeace / 30000)));
  const each = Math.round(pr.armyPeace / n / 1000) * 1000;
  // candidati: capitale, province di confine verso rivali e grandi potenze, poi le più popolose
  const cap = s.nations[tag].capital;
  const borderScore = (id: number) => {
    let sc = 0;
    for (const e of w.map.adj[id]) {
      const o = s.owner[e.to];
      if (o === tag || e.strait || e.route || o === NOBODY || w.map.provinces[e.to].impassable) continue;
      sc += pr.rivals.includes(o) ? 3 : w.profiles[o]?.major ? 1.5 : 0.5;
    }
    return sc;
  };
  const ranked = own
    .map((id) => ({ id, sc: (id === cap ? 100 : 0) + borderScore(id) * 4 + Math.log10(w.map.provinces[id].pop + 10) }))
    .sort((a, b) => b.sc - a.sc || a.id - b.id)
    .map((x) => x.id);
  const counters: Record<UnitType, number> = { infantry: 0, cavalry: 0, artillery: 0 };
  for (let i = 0; i < n; i++) {
    const type: UnitType = i > 0 && i % 6 === 5 ? 'cavalry' : i > 0 && i % 6 === 3 && n >= 4 ? 'artillery' : 'infantry';
    counters[type]++;
    const strength = type === 'infantry' ? each : Math.round(each * 0.5);
    const unit: Unit = {
      id: `${tag}-${i + 1}`, nation: tag,
      name: `${ROMAN(counters[type])} ${UNIT_LABEL[type]}${tag === w.state.player ? '' : ` ${pr.adjective}`}`,
      type, strength, maxStrength: strength, morale: 0.8, supply: 1, experience: 0.1 + pr.militaryQuality / 400,
      entrench: 0.2, location: ranked[i % ranked.length], move: null, orders: [], inBattle: false, recovering: 0,
    };
    s.units.push(unit);
  }
}
