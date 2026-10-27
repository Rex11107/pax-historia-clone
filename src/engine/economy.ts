import { ROMAN, UNIT_LABEL } from './setup';
import type { Budget, GameEvent, Policies, Tag, UnitType } from './types';
import { clamp, emit, hostileUnitsAt, warsOf, type World } from './world';
import { effectiveResources } from './trade';
import { govEffects } from './politics';

// Effetti meccanici delle politiche interne (il pannello "Interno" li mostra così come sono).
export const POLICY_EFFECTS = {
  tax: {
    low: { income: 0.85, stability: 5, label: 'Imposte basse' },
    normal: { income: 1, stability: 0, label: 'Imposte ordinarie' },
    high: { income: 1.2, stability: -8, label: 'Imposte alte' },
  },
  mobilization: {
    peace: { upkeep: 1, manpower: 1, stability: 0, label: 'Esercito di pace' },
    partial: { upkeep: 1.5, manpower: 2.2, stability: -2, label: 'Mobilitazione parziale' },
    full: { upkeep: 2.2, manpower: 4, stability: -6, label: 'Mobilitazione generale' },
  },
  infrastructure: {
    none: { cost: 0, rail: 0, label: 'Nessun investimento' },
    normal: { cost: 0.02, rail: 0.03, label: 'Investimenti ordinari' },
    heavy: { cost: 0.08, rail: 0.15, label: 'Grandi opere ferroviarie' },
  },
  press: {
    free: { stability: -3, exhaustion: 1.15, label: 'Stampa libera' },
    guided: { stability: 0, exhaustion: 1, label: 'Stampa orientata' },
    censored: { stability: 4, exhaustion: 0.75, label: 'Censura' },
  },
} as const;

export const RECRUIT: Record<UnitType, { men: number; cost: number; label: string }> = {
  infantry: { men: 20000, cost: 12, label: 'corpo d\'armata' },
  cavalry: { men: 8000, cost: 7, label: 'divisione di cavalleria' },
  artillery: { men: 8000, cost: 9, label: 'brigata d\'artiglieria' },
};

export function budget(w: World, tag: Tag): Budget {
  const s = w.state;
  const n = s.nations[tag];
  const pr = w.profiles[tag];
  const pol = n.policies;
  let popEff = 0;
  for (let i = 0; i < s.owner.length; i++) {
    const p = w.map.provinces[i].pop;
    if (s.owner[i] === tag && s.controller[i] === tag) popEff += p;
    else if (s.controller[i] === tag) popEff += p * 0.25; // requisizioni nelle province occupate
  }
  const trade = s.treaties.filter((t) => t.type === 'trade' && !t.violated && (t.a === tag || t.b === tag)).length;
  const res = effectiveResources(w, tag);
  const gov = govEffects(w, tag);
  // senza carbone le nazioni industriali lo comprano all'estero: entrate ridotte del 5%
  const coalMalus = pr.industry >= 50 && res.missing.includes('carbone') ? 0.95 : 1;
  const income = (popEff / 1e6) * (0.6 + (0.8 * pr.industry) / 100) * POLICY_EFFECTS.tax[pol.tax].income * (1 + Math.min(0.15, trade * 0.03)) * coalMalus * gov.income + res.income;
  const men = s.units.filter((u) => u.nation === tag).reduce((x, u) => x + u.strength, 0);
  const war = warsOf(s, tag).length > 0;
  const upkeep = (men / 1000) * 0.023 * POLICY_EFFECTS.mobilization[pol.mobilization].upkeep * (war ? 1.6 : 1) * gov.upkeep;
  const administration = income * 0.3;
  const interest = ((n.debt * 0.045) / 52) * gov.interest;
  const infrastructure = income * POLICY_EFFECTS.infrastructure[pol.infrastructure].cost;
  const manpowerGain = Math.round(popEff * 7e-5 * POLICY_EFFECTS.mobilization[pol.mobilization].manpower * gov.manpower);
  const r = (v: number) => Math.round(v * 100) / 100;
  const tradeNet = res.earn - res.pay;
  return { income: r(income), resources: r(res.income), trade: r(tradeNet), upkeep: r(upkeep), administration: r(administration), interest: r(interest), infrastructure: r(infrastructure), net: r(income + tradeNet - upkeep - administration - interest - infrastructure), manpowerGain };
}

export function stabilityTarget(w: World, tag: Tag): number {
  const n = w.state.nations[tag];
  const pol = n.policies;
  return clamp(w.profiles[tag].cohesion * 0.6 + 30 + POLICY_EFFECTS.tax[pol.tax].stability + POLICY_EFFECTS.mobilization[pol.mobilization].stability + POLICY_EFFECTS.press[pol.press].stability + govEffects(w, tag).stability - n.warExhaustion * 0.4, 0, 100);
}

/** Aggiornamento economico settimanale (fine turno). */
export function weeklyEconomy(w: World, sink: GameEvent[]) {
  const s = w.state;
  for (const tag of Object.keys(s.nations)) {
    const n = s.nations[tag];
    if (!n.alive) continue;
    const pr = w.profiles[tag];
    const b = budget(w, tag);
    n.lastBudget = b;
    n.treasury += b.net;
    if (n.treasury < 0) {
      n.debt += -n.treasury * 1.1;
      n.treasury = 0;
      n.stability = clamp(n.stability - (1.2 - pr.finance / 100), 0, 100);
      if (tag === s.player) emit(w, { type: 'deficit', nations: [tag], text: 'Le casse sono vuote: il governo emette nuovo debito.' }, sink);
    }
    n.manpower += b.manpowerGain;
    n.rail = clamp(n.rail + POLICY_EFFECTS.infrastructure[n.policies.infrastructure].rail + govEffects(w, tag).rail, 0, 100);
    const pop = w.map.provinces.reduce((x, p, i) => x + (s.owner[i] === tag ? p.pop : 0), 0) || 1;
    if (warsOf(s, tag).length) n.warExhaustion = clamp(n.warExhaustion + (n.turnLosses / (pop / 1e6)) * 0.01 * POLICY_EFFECTS.press[n.policies.press].exhaustion * govEffects(w, tag).exhaustion * (1.3 - pr.cohesion / 100) + 0.3, 0, 100);
    else n.warExhaustion = clamp(n.warExhaustion - 1.5, 0, 100);
    n.turnLosses = 0;
    const target = stabilityTarget(w, tag);
    n.stability = clamp(n.stability + clamp(target - n.stability, -1.5, 1), 0, 100);
    if (n.stability < 25 && tag === s.player) emit(w, { type: 'unrest', nations: [tag], text: 'Disordini e scioperi nelle città: la stabilità interna è pericolosamente bassa.' }, sink);
  }
}

export function setPolicy<K extends keyof Policies>(w: World, tag: Tag, key: K, value: Policies[K]): string | null {
  const opts = Object.keys(POLICY_EFFECTS[key]);
  if (!opts.includes(value as string)) return `valore non valido per ${key}: ${value}`;
  w.state.nations[tag].policies[key] = value;
  return null;
}

/** Arruolamento: costa denaro subito; l'unità nasce al 25% e si completa con la riserva. */
export function recruit(w: World, tag: Tag, type: UnitType, province: number, sink?: GameEvent[]): string | null {
  const s = w.state;
  const n = s.nations[tag];
  const spec = RECRUIT[type];
  if (!spec) return `tipo di unità sconosciuto: ${type}`;
  if (s.owner[province] !== tag || s.controller[province] !== tag) return 'si può arruolare solo in province proprie e controllate';
  if (!w.map.passable(province)) return 'nel deserto non si arruola';
  if (hostileUnitsAt(s, tag, province).length) return 'la provincia è contesa';
  // l'artiglieria senza ferro proprio costa il 30% in più (cannoni comprati all'estero)
  const cost = type === 'artillery' && effectiveResources(w, tag).missing.includes('ferro') ? Math.round(spec.cost * 1.3) : spec.cost;
  if (n.treasury < cost) return `fondi insufficienti (servono ${cost} M)`;
  if (n.manpower < spec.men * 0.25) return 'riserva di uomini insufficiente';
  n.treasury -= cost;
  const men = Math.round(spec.men * 0.25);
  n.manpower -= men;
  const count = s.units.filter((u) => u.nation === tag && u.type === type).length + 1;
  const id = `${tag}-r${++s.nextId}`;
  s.units.push({
    id, nation: tag, type, name: `${ROMAN(count)} ${UNIT_LABEL[type]}${tag === s.player ? '' : ` ${w.profiles[tag].adjective}`} (nuova leva)`,
    strength: men, maxStrength: spec.men, morale: 0.5, supply: 1, experience: 0, entrench: 0,
    location: province, move: null, orders: [], inBattle: false, recovering: 0,
  });
  emit(w, { type: 'unit_raised', province, nations: [tag], text: `Arruolato un nuovo ${spec.label} a ${w.map.provinces[province].name}.` }, sink);
  return null;
}

