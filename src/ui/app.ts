import { APP_VERSION, installUpdate, isNative, isNewer, latestRelease, type Release } from '../update';
import { Game, type Phase, type TurnOutcome } from '../game';
import { describeProposal, TREATY_LABEL, type Proposal } from '../engine/diplomacy';
import { budget, POLICY_EFFECTS, RECRUIT, recruit, setPolicy, stabilityTarget } from '../engine/economy';
import { TERRAIN_NAME } from '../engine/map';
import { RESOURCES, resourceLabel, type ResourceId } from '../engine/resources';
import { callElection, crisisChance, OPTION_LABEL, politicsOf, PROGRAM_EFFECTS, REGIME_LABEL, resolveCrisis, THRESHOLD } from '../engine/politics';
import { BUILDINGS, buildRefusal, buildings, cancelProject, canBuildIn, industryOf, inputEfficiency, logistics, projects, provinceCapacity, slots, startProject, totalLevel, type BuildingId } from '../engine/construction';
import { annex, annexRefusal, declareIndependence, imposeProtectorate, LEVEL_INFO, libertyTarget, loosen, protectorateRefusal, subjectOf, subjects, tighten } from '../engine/vassals';
import { appoint, cabinetOf, candidates, describeEffects, headMinister, minister, OFFICE_LABEL, OFFICES, type Office } from '../engine/ministers';
import { bondRate, cancelTrade, contractsOf, effectiveResources, freeLots, MAX_LOTS, proposeTradeTreaty, quote, signTrade, tradeTreatyRefusal, type Quote } from '../engine/trade';
import { assignOrders, planPath } from '../engine/orders';
import type { Condition, MapData, Order, Policies, Tag, Unit, UnitType } from '../engine/types';
import { al, atWar, di, enemiesOf, formatDate, nationName, opinion, shortName, treatyBetween } from '../engine/world';
import { declareWar } from '../engine/diplomacy';
import { chatJSON, usage } from '../llm/client';
import { deleteSave, listSaves, loadGame, saveSettings, type Settings } from '../storage/storage';
import { $, fmtK, h, show } from './dom';
import { MapView } from './mapview';

type Tab = 'army' | 'diplomacy' | 'government' | 'dispatches' | 'province' | 'unit' | 'settings';

const UNIT_TYPE: Record<UnitType, string> = { infantry: 'fanteria', cavalry: 'cavalleria', artillery: 'artiglieria' };
const PHASE: Record<Phase, string> = { traduzione: 'Lo Stato maggiore legge le direttive…', simulazione: 'Le truppe marciano: sette giorni di campagna…', dispaccio: 'I dispacci arrivano dalle capitali…', salvataggio: 'Archiviazione…' };

export class App {
  game!: Game;
  map!: MapView;
  tab: Tab = 'dispatches';
  sheetOpen = false;
  provinceId: number | null = null;
  unitId: string | null = null;
  chatWith: Tag | null = null;
  pick: { unitId: string; type: 'move' | 'attack' } | null = null;
  pending: { target: number; days: number; path: number[] } | null = null;
  chatBusy = false;
  draftOffer: Proposal | null = null;
  lastOffer: Record<Tag, Proposal | null> = {};
  govTab: 'budget' | 'trade' | 'politics' | 'build' = 'budget';
  trade: { mode: 'buy' | 'sell'; res: ResourceId; qty: number } = { mode: 'buy', res: 'carbone', qty: 1 };

  constructor(private mapData: MapData, public settings: Settings) {}

  start(game: Game) {
    this.game = game;
    show($('#start'), false);
    show($('#game'), true);
    const canvas = $<HTMLCanvasElement>('#map');
    if (!this.map) {
      this.map = new MapView(canvas, game.world, {
        onProvince: (id) => this.onProvince(id),
        onUnit: (u) => this.selectUnit(u.id),
      });
      this.bindChrome();
      void this.map.loadPhysical('data/physical1881.json');
    } else this.map.setWorld(game.world);
    this.refreshTop();
    this.setTab(game.state.dispatches.length ? 'dispatches' : 'dispatches', false);
    if (!game.state.dispatches.length) this.renderWelcome();
  }

  // --- barra superiore e schede ---
  private bindChrome() {
    document.querySelectorAll<HTMLButtonElement>('.tabs button[data-tab]').forEach((b) => b.addEventListener('click', () => {
      const t = b.dataset.tab as Tab;
      if (this.tab === t && this.sheetOpen) this.closeSheet(); else this.setTab(t);
    }));
    $('#settings-btn').addEventListener('click', () => this.setTab('settings'));
    $('#sheet-close').addEventListener('click', () => this.closeSheet());
    $('#end-turn').addEventListener('click', () => this.openTurnDialog());
    $('#res-btn').addEventListener('click', (e) => {
      this.map.showResources = !this.map.showResources;
      (e.currentTarget as HTMLElement).setAttribute('aria-pressed', String(this.map.showResources));
      this.map.invalidate();
    });
    $('#works-btn').addEventListener('click', (e) => {
      this.map.showWorks = !this.map.showWorks;
      (e.currentTarget as HTMLElement).setAttribute('aria-pressed', String(this.map.showWorks));
      this.map.invalidate();
    });
    $('#relief-btn').addEventListener('click', (e) => {
      this.map.showRelief = !this.map.showRelief;
      (e.currentTarget as HTMLElement).setAttribute('aria-pressed', String(this.map.showRelief));
      this.map.invalidate();
    });
  }

  refreshTop() {
    const s = this.game.state;
    const n = s.nations[s.player];
    $('#date').textContent = formatDate(s.day);
    $('#nation').textContent = this.game.world.profiles[s.player].name;
    const b = n.lastBudget ?? budget(this.game.world, s.player);
    $('#stats').replaceChildren(...[
      h('span', { title: 'Tesoro (milioni)' }, h('b', null, Math.round(n.treasury)), ' M', h('small', { class: b.net >= 0 ? 'pos' : 'neg' }, ` ${b.net >= 0 ? '+' : ''}${b.net.toFixed(1)}`)),
      h('span', { title: 'Riserva di uomini' }, h('b', null, fmtK(n.manpower)), ' uomini'),
      h('span', { title: 'Stabilità interna' }, 'stabilità ', h('b', null, Math.round(n.stability))),
      enemiesOf(s, s.player).size ? h('span', { class: 'war' }, 'in guerra') : null,
      politicsOf(this.game.world, s.player)?.crisis ? h('span', { class: 'war', style: 'cursor:pointer', onclick: () => { this.govTab = 'politics'; this.setTab('government'); } }, 'crisi di governo') : null,
    ].filter((x): x is HTMLSpanElement => !!x));
  }

  setTab(t: Tab, open = true) {
    this.tab = t;
    document.querySelectorAll<HTMLButtonElement>('.tabs button[data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === t));
    if (open) this.openSheet();
    this.render();
  }
  openSheet() { this.sheetOpen = true; $('#sheet').classList.add('open'); }
  closeSheet() { this.sheetOpen = false; $('#sheet').classList.remove('open'); this.cancelPick(); }

  render() {
    const body = $('#sheet-body');
    const title = $('#sheet-title');
    const views: Record<Tab, () => [string, Node]> = {
      army: () => ['Esercito', this.viewArmy()],
      diplomacy: () => (this.chatWith ? [nationName(this.game.world, this.chatWith), this.viewChat(this.chatWith)] : ['Diplomazia', this.viewDiplomacy()]),
      government: () => ['Governo', this.viewGovernment()],
      dispatches: () => ['Dispacci', this.viewDispatches()],
      province: () => [this.provinceId !== null ? this.game.world.map.provinces[this.provinceId].name : 'Provincia', this.viewProvince()],
      unit: () => { const u = this.unit(); return [u ? u.name : 'Unità', this.viewUnit()]; },
      settings: () => ['Impostazioni', this.viewSettings()],
    };
    const [t, node] = views[this.tab]();
    title.textContent = t;
    body.replaceChildren(node);
    // la conversazione usa quasi tutto lo schermo e si apre sull'ultimo messaggio (letto dall'inizio)
    const inChat = this.tab === 'diplomacy' && !!this.chatWith;
    $('#sheet').classList.toggle('tall', inChat);
    if (inChat) {
      const msgs = body.querySelectorAll('.msg');
      const last = msgs[msgs.length - 1] as HTMLElement | undefined;
      if (last) requestAnimationFrame(() => { body.scrollTop = Math.max(0, last.offsetTop - body.offsetTop - 8); });
    }
  }

  private renderWelcome() {
    const s = this.game.state;
    const body = $('#sheet-body');
    $('#sheet-title').textContent = 'Primo gennaio 1881';
    body.replaceChildren(h('div', { class: 'prose' },
      h('p', { class: 'lead' }, `A ${this.game.world.map.provinces[s.nations[s.player].capital].name} il governo si riunisce per il nuovo anno. Guidi ${this.game.world.profiles[s.player].name}.`),
      h('p', null, 'Ogni turno dura una settimana. Muovi le truppe toccando una pedina e poi la destinazione, tratta con le altre capitali nella scheda Diplomazia, regola imposte e mobilitazione in Governo.'),
      h('p', null, 'Quando sei pronto premi Fine settimana: puoi anche scrivere direttive libere ("tieni il II Corpo a Udine finché non arriva la cavalleria") e lo Stato maggiore le tradurrà in ordini.'),
      this.game.hasKey ? null : h('p', { class: 'notice' }, 'Manca la chiave API: senza di essa la diplomazia e i dispacci narrati non funzionano. ', h('button', { class: 'link', onclick: () => this.setTab('settings') }, 'Inseriscila ora')),
      s.situations.length ? h('div', null, h('h3', null, 'Questioni aperte'), ...s.situations.map((x) => h('p', null, h('b', null, x.title), ': ', x.summary))) : null,
    ));
    this.openSheet();
  }

  // --- selezioni sulla mappa ---
  private onProvince(id: number | null) {
    if (this.pick && id !== null) { this.previewTarget(id); return; }
    this.provinceId = id;
    this.map.selectedProvince = id;
    this.map.invalidate();
    if (id === null) return;
    this.setTab('province');
  }

  selectUnit(id: string) {
    const u = this.game.state.units.find((x) => x.id === id);
    if (!u) return;
    this.unitId = id;
    this.map.selectedUnit = id;
    this.map.selectedProvince = null;
    this.map.previewPath = null;
    this.pick = null;
    this.map.previewPick = false;
    this.map.invalidate();
    this.setTab('unit');
  }

  unit(): Unit | undefined { return this.game.state.units.find((x) => x.id === this.unitId); }

  private cancelPick() {
    this.pick = null; this.pending = null;
    if (this.map) { this.map.previewPick = false; this.map.previewPath = null; this.map.invalidate(); }
    $('#hint').classList.add('is-hidden');
  }

  private startPick(type: 'move' | 'attack') {
    const u = this.unit();
    if (!u) return;
    this.pick = { unitId: u.id, type };
    this.pending = null;
    this.map.previewPick = true;
    const hint = $('#hint');
    hint.textContent = type === 'attack' ? 'Tocca la provincia da attaccare' : 'Tocca la provincia di destinazione';
    hint.classList.remove('is-hidden');
    if (window.innerWidth < 900) this.closeSheetKeepPick();
  }
  private closeSheetKeepPick() { this.sheetOpen = false; $('#sheet').classList.remove('open'); }

  private previewTarget(id: number) {
    const u = this.unit();
    if (!u || !this.pick) return;
    const plan = planPath(this.game.world, u, id, this.pick.type === 'attack');
    this.pending = plan ? { target: id, days: plan.days, path: plan.path } : null;
    this.map.previewPath = plan?.path ?? null;
    this.map.selectedProvince = id;
    this.map.focusBetween(u.location, id);
    this.map.invalidate();
    $('#hint').classList.add('is-hidden');
    this.tab = 'unit';
    this.openSheet();
    this.render();
    if (!plan) this.toast(`${this.game.world.map.provinces[id].name} non è raggiungibile: territorio neutrale o nessun collegamento.`);
  }

  // --- viste ---
  private viewArmy(): Node {
    const w = this.game.world, s = w.state;
    const units = s.units.filter((u) => u.nation === s.player);
    const men = units.reduce((x, u) => x + u.strength, 0);
    return h('div', null,
      h('p', { class: 'muted' }, `${units.length} unità, ${fmtK(men)} uomini in armi. Tocca un'unità per darle ordini.`),
      h('ul', { class: 'list' }, ...units.map((u) => h('li', { onclick: () => { this.map.centerOn(u.location); this.selectUnit(u.id); } },
        h('div', { class: 'row' }, h('b', null, u.name), h('span', { class: 'num' }, fmtK(u.strength))),
        h('div', { class: 'sub' }, `${w.map.provinces[u.location].name} · ${this.orderSummary(u)}`),
        this.bars(u),
      ))),
    );
  }

  private bars(u: Unit) {
    const bar = (label: string, v: number) => h('span', { class: 'bar', title: `${label} ${Math.round(v * 100)}%` }, h('i', { style: `width:${Math.round(v * 100)}%`, class: v < 0.3 ? 'low' : '' }), label);
    return h('div', { class: 'bars' }, bar('forza', u.strength / u.maxStrength), bar('morale', u.morale), bar('rifornimenti', u.supply));
  }

  private orderSummary(u: Unit): string {
    const w = this.game.world;
    if (u.inBattle) return 'in battaglia';
    if (u.recovering) return 'si riorganizza';
    if (!u.orders.length) return u.entrench > 0.5 ? 'trincerata' : 'in attesa di ordini';
    const o = u.orders[0];
    const where = o.target != null ? w.map.provinces[o.target].name : '';
    const label = { move: `in marcia verso ${where}`, attack: `attacco su ${where}`, hold: 'tiene la posizione', entrench: 'si trincera' }[o.type];
    return o.status === 'active' ? label : `in attesa: ${label}`;
  }

  private viewUnit(): Node {
    const u = this.unit();
    const w = this.game.world, s = w.state;
    if (!u) return h('p', { class: 'muted' }, 'Unità non più presente: distrutta o arresa.');
    const mine = u.nation === s.player;
    const p = w.map.provinces[u.location];
    const info = h('div', null,
      h('p', { class: 'sub' }, `${UNIT_TYPE[u.type]} ${di(w, u.nation)} a ${p.name} (${TERRAIN_NAME[p.terrain]})`),
      h('p', null, h('b', null, `${u.strength.toLocaleString('it-IT')}`), ` uomini su ${u.maxStrength.toLocaleString('it-IT')}`),
      this.bars(u),
      mine ? h('p', { class: 'sub' }, `Trinceramento ${Math.round(u.entrench * 100)}% · esperienza ${Math.round(u.experience * 100)}% · ${this.orderSummary(u)}`) : null,
    );
    if (!mine) return info;
    const queue = u.orders.length ? h('ol', { class: 'queue' }, ...u.orders.map((o) => h('li', null, this.describeOrder(o)))) : null;
    const preCond = h('select', { id: 'precond' },
      h('option', { value: '' }, 'parti subito'),
      h('option', { value: 'supply' }, 'parti con rifornimenti ≥ 60%'),
      h('option', { value: 'strength' }, 'parti con forza ≥ 80%'),
      h('option', { value: 'days3' }, 'parti fra 3 giorni'),
      h('option', { value: 'days7' }, 'parti fra 7 giorni'),
    );
    const pend = this.pending && this.pick?.unitId === u.id
      ? h('div', { class: 'card confirm' },
        h('p', null, `${this.pick.type === 'attack' ? 'Attacco su' : 'Marcia verso'} `, h('b', null, w.map.provinces[this.pending.target].name), `: circa ${Math.max(1, Math.round(this.pending.days))} giorni, ${this.pending.path.length} tappe.`),
        preCond,
        h('div', { class: 'buttons' },
          h('button', { class: 'primary', onclick: () => this.confirmOrder('replace') }, 'Dai l\'ordine'),
          u.orders.length ? h('button', { onclick: () => this.confirmOrder('append') }, 'Aggiungi in coda') : null,
          h('button', { class: 'quiet', onclick: () => { this.cancelPick(); this.render(); } }, 'Annulla'),
        ))
      : null;
    return h('div', null, info, queue, pend ?? h('div', { class: 'buttons' },
      h('button', { class: 'primary', onclick: () => this.startPick('move') }, 'Muovi'),
      h('button', { onclick: () => this.startPick('attack') }, 'Attacca'),
      h('button', { onclick: () => this.simpleOrder({ type: 'entrench' }) }, 'Trincerati'),
      u.orders.length ? h('button', { class: 'quiet', onclick: () => this.simpleOrder(null) }, 'Annulla ordini') : null,
    ));
  }

  private describeOrder(o: Order): string {
    const w = this.game.world;
    const where = o.target != null ? w.map.provinces[o.target]?.name : '';
    const base = { move: `marcia verso ${where}`, attack: `attacca ${where}`, hold: 'tieni la posizione', entrench: 'trincerati' }[o.type];
    const cond = (c?: Condition) => {
      if (!c) return '';
      switch (c.type) {
        case 'day_gte': return `${c.value} giorni`;
        case 'supply_gte': return `rifornimenti ≥ ${Math.round(c.value * 100)}%`;
        case 'strength_gte': return `forza ≥ ${Math.round(c.value * 100)}%`;
        case 'unit_at': return `${this.game.state.units.find((u) => u.id === c.unit)?.name ?? c.unit} a ${w.map.provinces[c.province]?.name}`;
        case 'controlled_by': return `${w.map.provinces[c.province]?.name} in mano a ${c.nation}`;
        case 'no_enemy_at': return `nessun nemico a ${w.map.provinces[c.province]?.name}`;
        default: return '';
      }
    };
    return `${base}${o.precondition ? `, quando ${cond(o.precondition)}` : ''}${o.until ? `, fino a ${cond(o.until)}` : ''}`;
  }

  private confirmOrder(mode: 'replace' | 'append') {
    const u = this.unit();
    if (!u || !this.pending || !this.pick) return;
    const pre = ($('#precond') as HTMLSelectElement | null)?.value;
    const precondition: Condition | undefined = pre === 'supply' ? { type: 'supply_gte', value: 0.6 } : pre === 'strength' ? { type: 'strength_gte', value: 0.8 } : pre === 'days3' ? { type: 'day_gte', value: 3 } : pre === 'days7' ? { type: 'day_gte', value: 7 } : undefined;
    // l'attesa "fra N giorni" è un hold con until, seguito dal movimento
    const orders: Order[] = pre?.startsWith('days') ? [{ type: 'hold', until: precondition }, { type: this.pick.type, target: this.pending.target }] : [{ type: this.pick.type, target: this.pending.target, precondition }];
    const errs = assignOrders(this.game.world, u.id, orders, mode, this.game.state.player);
    if (errs.length) this.toast(errs[0]);
    this.cancelPick();
    this.map.invalidate();
    this.render();
  }

  private simpleOrder(o: Order | null) {
    const u = this.unit();
    if (!u) return;
    if (!o) { u.orders = []; u.move = null; } else assignOrders(this.game.world, u.id, [o], 'replace', this.game.state.player);
    this.map.invalidate();
    this.render();
  }

  private viewProvince(): Node {
    const w = this.game.world, s = w.state;
    if (this.provinceId === null) return h('p', null, 'Tocca una provincia sulla mappa.');
    const id = this.provinceId;
    const p = w.map.provinces[id];
    const owner = s.owner[id], ctrl = s.controller[id];
    const units = s.units.filter((u) => u.location === id);
    const canRecruit = owner === s.player && ctrl === s.player;
    return h('div', null,
      h('p', { class: 'sub' }, `${nationName(w, owner)}${ctrl !== owner ? ` — occupata da ${nationName(w, ctrl)}` : ''}`),
      h('dl', { class: 'facts' },
        h('dt', null, 'Popolazione'), h('dd', null, p.pop.toLocaleString('it-IT')),
        h('dt', null, 'Superficie'), h('dd', null, `${p.area.toLocaleString('it-IT')} km²`),
        ...(w.map.resources[id].length ? [h('dt', null, 'Risorse'), h('dd', null, w.map.resources[id].map(resourceLabel).join(', '))] : []),
        h('dt', null, 'Terreno'), h('dd', null, p.impassable ? `deserto intransitabile${p.region ? ` (${p.region})` : ''}` : `${TERRAIN_NAME[p.terrain]}${p.oasis ? ', oasi' : ''}${p.coast ? ', costa' : ''}`),
        ...(w.map.adj[id].some((e) => e.route) ? [h('dt', null, 'Piste carovaniere'), h('dd', null, w.map.adj[id].filter((e) => e.route).map((e) => `verso ${w.map.provinces[e.to].name} (${Math.round(e.km)} km)`).join(', '))] : []),
        ...(w.map.riversOf(id).length ? [h('dt', null, 'Fiumi di confine'), h('dd', null, w.map.riversOf(id).map((r) => `${r.name} (verso ${w.map.provinces[r.to].name})`).join(', '))] : []),
      ),
      p.impassable ? h('p', { class: 'muted' }, 'Le truppe non attraversano il deserto: si passa solo lungo le piste carovaniere. Il deserto appartiene a chi controlla tutte le terre transitabili che lo circondano; se sono più d\'uno resta terra di nessuno.') : null,
      !p.impassable && owner === '' ? h('p', { class: 'muted' }, 'Terra di nessuno: la prima nazione che vi porta le sue truppe la occupa.') : null,
      units.length ? h('div', null, h('h3', null, 'Truppe presenti'), h('ul', { class: 'list' }, ...units.map((u) => h('li', { onclick: () => this.selectUnit(u.id) }, h('div', { class: 'row' }, h('span', null, u.name), h('span', { class: 'num' }, fmtK(u.strength))))))) : h('p', { class: 'muted' }, 'Nessuna truppa nella provincia.'),
      owner && owner !== s.player ? h('div', { class: 'buttons' }, h('button', { onclick: () => { this.chatWith = owner; this.setTab('diplomacy'); } }, `Scrivi ${al(w, owner)}`)) : null,
      this.viewWorks(id),
      canRecruit ? h('div', null, h('h3', null, 'Arruolamento'), h('div', { class: 'buttons' }, ...(Object.keys(RECRUIT) as UnitType[]).map((t) => h('button', { onclick: () => this.doRecruit(t, id) }, `${RECRUIT[t].label} · ${RECRUIT[t].cost} M`)))) : null,
    );
  }

  private viewWorks(id: number): Node | null {
    const w = this.game.world, s = w.state, me = s.player;
    const p = w.map.provinces[id];
    if (p.impassable) return null;
    const lv = buildings(w)[id];
    const have = (Object.keys(BUILDINGS) as BuildingId[]).filter((b) => lv[b]);
    const pend = projects(w).filter((x) => x.province === id);
    const mine = canBuildIn(w, me, id);
    return h('div', null, h('h3', null, 'Opere'),
      h('p', null, have.length ? have.map((b) => `${BUILDINGS[b].icon} ${BUILDINGS[b].label} ${'●'.repeat(lv[b]!)}${'○'.repeat(BUILDINGS[b].max - lv[b]!)}`).join(' · ') : 'nessuna'),
      h('p', { class: 'sub' }, `Capienza logistica: ${provinceCapacity(w, id)} mila uomini.`),
      pend.length ? h('ul', { class: 'list plain' }, ...pend.map((x) => h('li', null, h('div', { class: 'row' }, h('span', null, `${BUILDINGS[x.type].icon} ${BUILDINGS[x.type].label} → livello ${x.level}`), h('span', { class: 'sub' }, `${Math.ceil(x.daysLeft / 7)} sett.`)), h('div', { class: 'meter' }, h('i', { style: `width:${Math.round((1 - x.daysLeft / x.total) * 100)}%` }))))) : null,
      mine ? h('div', { class: 'build-grid' }, ...(Object.keys(BUILDINGS) as BuildingId[]).map((b) => {
        const cur = lv[b] ?? 0;
        const info = BUILDINGS[b];
        const err = buildRefusal(w, me, id, b);
        if (err === 'livello massimo' || err === 'serve la costa' || err === 'non ci sono risorse minerarie' || err === 'terreno inadatto') return null;
        return h('button', { disabled: !!err, title: err ?? info.desc, onclick: () => { const e = startProject(w, me, id, b); this.toast(e ?? `Cantiere aperto: ${info.label}.`); this.afterStateChange(); } },
          h('b', null, `${info.icon} ${info.label} ${cur + 1}`), h('small', null, err ?? `${info.cost(cur + 1)} M · ${info.weeks(cur + 1)} sett.${info.industrial && inputEfficiency(w, me, b) < 1 ? ` · senza materie prime rende ${Math.round(inputEfficiency(w, me, b) * 100)}%` : ''}`));
      })) : null,
    );
  }

  private viewBuild(): Node {
    const w = this.game.world, s = w.state, me = s.player;
    const L = logistics(w, me);
    const mine = projects(w).filter((x) => x.nation === me);
    const ind = industryOf(w, me), base = w.profiles[me].industry;
    const eff = (b: BuildingId) => { const e = inputEfficiency(w, me, b); return e === 1 ? '' : ` (materie prime mancanti: rende ${Math.round(e * 100)}%)`; };
    return h('div', null,
      h('h3', null, 'Logistica dell\'esercito'),
      h('div', { class: 'meter' }, h('i', { style: `width:${Math.min(100, L.ratio * 50)}%` }), h('b', { style: 'left:50%' })),
      h('p', { class: 'sub' }, `Capacità ${L.capacity} mila uomini, in armi ${L.men} mila (rapporto ${L.ratio.toFixed(2).replace('.', ',')}): rifornimenti, portata fuori dai confini e rinforzi ×${L.factor.toFixed(2).replace('.', ',')}. La capacità cresce con l'industria, l'industria bellica, le risorse strategiche (carbone, ferro, petrolio, metalli, anche importati), la popolazione, le ferrovie e i porti; più eserciti la consumano.`),
      h('dl', { class: 'facts' },
        h('dt', null, 'Industria'), h('dd', null, `${ind}/100${ind !== base ? ` (nel 1881 ${base})` : ''}`),
        h('dt', null, 'Cantieri'), h('dd', null, `${mine.length} di ${slots(w, me)} (uno in più ogni 15 M di entrate settimanali)`),
        ...(Object.keys(BUILDINGS) as BuildingId[]).flatMap((b) => { const n = totalLevel(w, me, b); return n ? [h('dt', null, `${BUILDINGS[b].icon} ${BUILDINGS[b].label}`), h('dd', null, `${n} livelli${BUILDINGS[b].industrial ? eff(b) : ''}`)] : []; })),
      h('h3', null, 'Cantieri aperti'),
      mine.length ? h('ul', { class: 'list plain' }, ...mine.map((x) => h('li', null,
        h('div', { class: 'row' }, h('span', null, `${BUILDINGS[x.type].icon} ${BUILDINGS[x.type].label} ${x.level} a `, h('button', { class: 'link', onclick: () => this.onProvince(x.province) }, w.map.provinces[x.province].name)),
          h('button', { class: 'link', onclick: () => { cancelProject(w, x.id); this.toast('Cantiere chiuso: rientra metà della spesa.'); this.afterStateChange(); } }, 'Annulla')),
        h('div', { class: 'meter' }, h('i', { style: `width:${Math.round((1 - x.daysLeft / x.total) * 100)}%` })),
        h('div', { class: 'sub' }, `${Math.ceil(x.daysLeft / 7)} settimane${s.controller[x.province] !== s.owner[x.province] ? ' · fermo: provincia occupata' : ''}`)))) : h('p', { class: 'muted' }, 'Nessun cantiere. Tocca una provincia sulla mappa e scegli cosa costruire.'),
      h('h3', null, 'Che cosa si costruisce'),
      h('ul', { class: 'list plain' }, ...(Object.keys(BUILDINGS) as BuildingId[]).map((b) => h('li', null, h('b', null, `${BUILDINGS[b].icon} ${BUILDINGS[b].label}`), h('div', { class: 'sub' }, `${BUILDINGS[b].desc}. Livello 1: ${BUILDINGS[b].cost(1)} M, ${BUILDINGS[b].weeks(1)} settimane; massimo ${BUILDINGS[b].max}.`)))),
      h('p', { class: 'muted' }, 'Si costruisce nelle proprie province non occupate, e nei vassalli e protettorati (l\'investimento abbassa il loro desiderio di indipendenza). Annullare un cantiere restituisce metà della spesa; in una provincia occupata i lavori si fermano.'),
    );
  }

  private doRecruit(t: UnitType, id: number) {
    const err = recruit(this.game.world, this.game.state.player, t, id);
    this.toast(err ?? `Nuovo ${RECRUIT[t].label} arruolato: si completerà con la riserva di uomini.`);
    this.refreshTop(); this.map.invalidate(); this.render();
  }

  private viewGovernment(): Node {
    const nav = h('div', { class: 'seg subnav' },
      h('button', { class: this.govTab === 'budget' ? 'on' : '', onclick: () => { this.govTab = 'budget'; this.render(); } }, 'Bilancio e politiche'),
      h('button', { class: this.govTab === 'politics' ? 'on' : '', onclick: () => { this.govTab = 'politics'; this.render(); } }, politicsOf(this.game.world, this.game.state.player)?.crisis ? 'Politica ⚠' : 'Politica'),
      h('button', { class: this.govTab === 'trade' ? 'on' : '', onclick: () => { this.govTab = 'trade'; this.render(); } }, 'Commercio'),
      h('button', { class: this.govTab === 'build' ? 'on' : '', onclick: () => { this.govTab = 'build'; this.render(); } }, 'Costruzione'));
    return h('div', null, nav, this.govTab === 'trade' ? this.viewTrade() : this.govTab === 'politics' ? this.viewPolitics() : this.govTab === 'build' ? this.viewBuild() : this.viewBudget());
  }

  private viewPolitics(): Node {
    const w = this.game.world, s = w.state, me = s.player;
    const ps = politicsOf(w, me);
    if (!ps) return h('p', { class: 'muted' }, 'Nessuna vita politica.');
    const auto = ps.regime === 'autocracy';
    const thr = THRESHOLD[ps.regime];
    const gov = ps.parties.filter((p) => ps.gov.includes(p.id));
    const risk = crisisChance(ps);
    const pct = (v: number) => `${v.toFixed(0)}%`;
    const crisis = ps.crisis ? h('div', { class: 'card confirm' },
      h('p', null, h('b', null, auto ? 'Crisi a corte.' : ps.regime === 'constitutional' ? 'Il parlamento blocca il governo.' : 'Il governo ha perso la maggioranza.'),
        ` Scegli come uscirne entro la fine della prossima settimana, altrimenti decide il corso degli eventi.`),
      h('ul', { class: 'list plain' }, ...ps.crisis.options.map((o) => h('li', null,
        h('div', { class: 'row' }, h('b', null, OPTION_LABEL[o][0]), h('button', { class: 'link', onclick: () => { const err = resolveCrisis(w, me, o); this.toast(err ?? OPTION_LABEL[o][0]); this.afterStateChange(); } }, 'Scegli')),
        h('div', { class: 'sub' }, OPTION_LABEL[o][1]))))) : null;
    return h('div', null,
      crisis,
      h('dl', { class: 'facts' },
        h('dt', null, 'Regime'), h('dd', null, REGIME_LABEL[ps.regime]),
        h('dt', null, auto ? 'Al potere' : 'Governo'), h('dd', null, `${ps.head}${ps.fixedHead ? ' (nominato dalla Corona)' : ''} · ${gov.map((p) => p.name).join(' + ')}`),
        h('dt', null, 'In carica dal'), h('dd', null, ps.since ? formatDate(ps.since) : 'prima del 1881'),
        h('dt', null, 'Prossime elezioni'), h('dd', null, ps.nextElection !== null ? formatDate(ps.nextElection) : 'nessuna'),
        ps.decreeUntil ? h('dt', null, 'Decreto') : null, ps.decreeUntil ? h('dd', null, `si governa per decreto fino al ${formatDate(ps.decreeUntil)}`) : null),
      h('h3', null, 'Fiducia nel governo'),
      h('div', { class: 'meter' }, h('i', { style: `width:${ps.confidence}%` }), h('b', { style: `left:${thr}%` })),
      h('p', { class: 'sub' }, `${Math.round(ps.confidence)}/100; sotto ${thr} il governo è a rischio. ${risk > 0 ? `Rischio di crisi questa settimana: ${Math.round(risk * 100)}%.` : 'Nessun rischio di crisi per ora.'}`),
      h('h3', null, auto ? 'Fazioni a corte' : 'Partiti'),
      h('table', { class: 'budget parties' },
        h('tr', null, h('th', null, ''), h('th', { class: 'num' }, auto ? 'peso' : 'seggi'), h('th', { class: 'num' }, auto ? 'oggi' : 'consenso')),
        ...[...ps.parties].sort((a, b) => b.seats - a.seats).map((p) => h('tr', { class: ps.gov.includes(p.id) ? 'gov' : '' },
          h('td', null, h('b', null, p.name), h('div', { class: 'sub' }, `${p.program} · ${p.leaders[0]}${ps.gov.includes(p.id) ? ' · al governo' : ''}`)),
          h('td', { class: 'num' }, pct(p.seats)),
          h('td', { class: `num ${p.pop > p.seats + 1 ? 'pos' : p.pop < p.seats - 1 ? 'neg' : ''}` }, pct(p.pop))))),
      this.viewCabinet(),
      h('h3', null, 'Programma di governo'),
      h('ul', { class: 'list plain' }, ...[...new Set(gov.map((p) => p.program))].map((pr) => h('li', null, h('b', null, pr), ': ', PROGRAM_EFFECTS[pr].label))),
      auto ? null : h('div', { class: 'buttons' }, h('button', { onclick: () => { const err = callElection(w, me); this.toast(err ?? 'Camere sciolte: si vota fra quattro settimane.'); this.afterStateChange(); } }, 'Sciogliere le Camere')),
      h('p', { class: 'muted' }, auto
        ? 'Il sovrano non risponde a un parlamento, ma le fazioni di corte pesano: il loro favore cambia con l\'ordine nel paese, la guerra e il passare del tempo. Se il governo scivola sotto la soglia, la crisi non scatta di colpo: il rischio cresce settimana dopo settimana.'
        : 'Non decidi tu le elezioni: il consenso dei partiti si muove con la stanchezza di guerra, la stabilità, il deficit, le imposte, gli umori del paese e il logoramento di chi governa. La censura rallenta i cambiamenti ma irrita liberali e radicali. Il governo non cade automaticamente sotto la soglia: il rischio di crisi cresce quanto più la fiducia è bassa, e nella crisi scegli tu la via d\'uscita.'),
    );
  }

  private viewCabinet(): Node | null {
    const w = this.game.world, s = w.state, me = s.player;
    const c = cabinetOf(w, me);
    if (!c) return null;
    const ps = politicsOf(w, me)!;
    const head = headMinister(w, me);
    const party = (id: string | null) => (id ? ps.parties.find((p) => p.id === id)?.name ?? id : 'senza partito');
    return h('div', null,
      h('h3', null, 'Ministri'),
      head ? h('p', null, h('b', null, `${head.name}, capo del governo`), h('div', { class: 'sub' }, `${head.note} Effetti: ${describeEffects(w, head.effects)}.`)) : null,
      h('ul', { class: 'list plain' }, ...OFFICES.map((o: Office) => {
        const cur = minister(c.posts[o]);
        const opts = candidates(w, me, o);
        const sel = h('select', { onchange: (e: Event) => {
          const id = (e.target as HTMLSelectElement).value;
          const err = appoint(w, me, o, id);
          this.toast(err ?? `${minister(id)!.name} nominato.`); this.afterStateChange();
        } }, ...(cur ? [] : [h('option', { value: '' }, '—')]), ...opts.map((x) => h('option', { value: x.id, selected: x.id === cur?.id }, `${x.name} (${party(x.party)})`))) as HTMLSelectElement;
        return h('li', null,
          h('div', { class: 'row' }, h('b', null, OFFICE_LABEL[o]), opts.length > 1 ? sel : h('span', null, cur?.name ?? 'vacante')),
          cur && cur.id === head?.id ? h('div', { class: 'sub' }, 'Tiene il dicastero lo stesso capo del governo: i suoi effetti contano una volta sola.') : cur ? h('div', { class: 'sub' }, `${cur.note} Effetti: ${describeEffects(w, cur.effects)}.`) : h('div', { class: 'sub' }, 'Nessun personaggio storico disponibile: un funzionario di carriera, senza effetti.'));
      })),
      h('p', { class: 'muted' }, 'Si nominano solo uomini dei partiti al governo (o senza partito), vivi e attivi in quell\'anno. Ogni cambio costa un punto di stabilità, si può rifare dopo quattro settimane, e licenziare un uomo della maggioranza la irrita. Se il governo cambia, chi resta senza maggioranza lascia il posto.'),
    );
  }

  private viewTrade(): Node {
    const w = this.game.world, s = w.state, me = s.player;
    const eff = effectiveResources(w, me);
    const t = this.trade;
    const ids = Object.keys(RESOURCES) as ResourceId[];
    const mine = contractsOf(s, me);
    const fmt = (v: number) => v.toFixed(2).replace('.', ',');
    const contractsNode = h('div', null, h('h3', null, 'Contratti in corso'),
      mine.length ? h('ul', { class: 'list plain' }, ...mine.map((c) => {
        const buy = c.buyer === me, other = buy ? c.seller : c.buyer;
        const rate = bondRate(w, c, other);
        return h('li', null,
          h('div', { class: 'row' }, h('span', null, `${buy ? 'Importiamo' : 'Esportiamo'} ${c.qty} ${c.qty === 1 ? 'lotto' : 'lotti'} di ${resourceLabel(c.res)} ${buy ? 'da' : 'verso'} `, h('b', null, nationName(w, other))),
            h('span', { class: `num ${buy ? 'neg' : 'pos'}` }, `${buy ? '−' : '+'}${fmt(c.price)}`)),
          h('div', { class: 'row sub' }, h('span', null, `dal ${formatDate(c.startDay)} · stima loro verso di noi ${signed(opinion(s, other, me))} (+${fmt(rate)}/sett.)`),
            h('button', { class: 'link', onclick: () => { const err = cancelTrade(w, c.id, me); this.toast(err ?? 'Contratto disdetto: il partner non l\'ha presa bene.'); this.afterStateChange(); } }, 'Disdici')));
      })) : h('p', { class: 'muted' }, 'Nessun contratto. Le nazioni senza carbone o ferro pagano ogni settimana di più: comprarli all\'estero toglie il malus.'));
    // scelta della risorsa e dei lotti
    const resOpts = t.mode === 'buy' ? ids : ids.filter((r) => freeLots(w, me, r) > 0);
    if (!resOpts.includes(t.res) && resOpts.length) t.res = resOpts[0];
    const picker = h('div', { class: 'trade-pick' },
      h('div', { class: 'seg' },
        h('button', { class: t.mode === 'buy' ? 'on' : '', onclick: () => { t.mode = 'buy'; this.render(); } }, 'Comprare'),
        h('button', { class: t.mode === 'sell' ? 'on' : '', onclick: () => { t.mode = 'sell'; this.render(); } }, 'Vendere')),
      resOpts.length ? h('select', { onchange: (e: Event) => { t.res = (e.target as HTMLSelectElement).value as ResourceId; this.render(); } },
        ...resOpts.map((r) => h('option', { value: r, selected: r === t.res }, `${resourceLabel(r)} (nostre ${eff.count[r] ?? 0}${t.mode === 'sell' ? `, vendibili ${freeLots(w, me, r)}` : ''})`))) : null,
      h('select', { onchange: (e: Event) => { t.qty = Number((e.target as HTMLSelectElement).value); this.render(); } },
        ...Array.from({ length: MAX_LOTS }, (_, i) => h('option', { value: i + 1, selected: i + 1 === t.qty }, `${i + 1} ${i ? 'lotti' : 'lotto'}/sett.`))));
    let market: Node;
    if (!resOpts.length) market = h('p', { class: 'muted' }, 'Non abbiamo eccedenze da vendere.');
    else {
      const partners = Object.keys(s.nations).filter((x) => x !== me && s.nations[x].alive && !w.profiles[x]?.micro);
      const qs: Quote[] = t.mode === 'buy'
        ? partners.filter((x) => freeLots(w, x, t.res) > 0).map((x) => quote(w, x, me, t.res, t.qty))
        : partners.map((x) => quote(w, me, x, t.res, t.qty));
      qs.sort((a, b) => (a.refusal ? 1 : 0) - (b.refusal ? 1 : 0) || (t.mode === 'buy' ? a.total - b.total : b.buyerValue - a.buyerValue));
      const shown = qs.slice(0, 14);
      market = shown.length ? h('ul', { class: 'list plain' }, ...shown.map((q) => {
        const other = t.mode === 'buy' ? q.seller : q.buyer;
        return h('li', { class: q.refusal ? 'dim' : '' },
          h('div', { class: 'row' }, h('span', null, h('i', { class: 'swatch', style: `background:${w.profiles[other].color}` }), h('b', null, nationName(w, other))),
            h('span', { class: 'num' }, `${fmt(q.total)} M/sett.`)),
          h('div', { class: 'row sub' },
            h('span', null, `${q.treaty ? 'accordo commerciale' : 'dazi +30%'}${t.mode === 'buy' ? ` · disponibili ${q.free} · valore per noi ${fmt(q.buyerValue)}` : ` · valore per loro ${fmt(q.buyerValue)}`}${q.refusal ? ` · ${q.refusal}` : ''}`),
            q.treaty || tradeTreatyRefusal(w, me, other) ? null : h('button', { class: 'link', onclick: () => { const err = proposeTradeTreaty(w, me, other); this.toast(err ?? `Accordo commerciale con ${nationName(w, other)} per 5 anni: niente più dazi.`); this.afterStateChange(); } }, 'Accordo'),
            q.refusal ? null : h('button', { class: 'link', onclick: () => {
              const err = t.mode === 'buy' ? signTrade(w, q.seller, me, t.res, t.qty) : signTrade(w, me, q.buyer, t.res, t.qty);
              this.toast(err ?? 'Contratto firmato.'); this.afterStateChange();
            } }, 'Firma')));
      })) : h('p', { class: 'muted' }, 'Nessuno ne vende.');
    }
    return h('div', null,
      h('dl', { class: 'facts' },
        h('dt', null, 'Pagamenti'), h('dd', null, `${fmt(eff.pay)} M/sett.`),
        h('dt', null, 'Incassi'), h('dd', null, `${fmt(eff.earn)} M/sett.`),
        h('dt', null, 'Mancano'), h('dd', null, eff.missing.length ? eff.missing.join(' e ') : 'nulla di strategico')),
      contractsNode,
      h('h3', null, 'Mercato'), picker, market,
      h('p', { class: 'muted' }, 'Un lotto è la produzione settimanale di una provincia. Il prezzo è il valore per chi vende più il 25%; senza accordo commerciale dazi e intermediari aggiungono il 30% (l\'accordo si chiede col pulsante \"Accordo\", che compare quando il partner ci stima abbastanza: 15, oppure 5 se commerciamo già insieme, 35 per un rivale storico; o si negozia in Diplomazia). Una risorsa che in patria manca vale per chi la compra quasi il doppio. Ogni contratto migliora un poco i rapporti, di più se la risorsa è strategica e se pesa sull\'economia del partner; chi disdice perde un po\' di stima. Le guerre interrompono i traffici.'),
    );
  }

  private viewBudget(): Node {
    const w = this.game.world, s = w.state, me = s.player;
    const n = s.nations[me];
    const b = budget(w, me);
    const row = (label: string, v: number, sign = -1) => h('tr', null, h('td', null, label), h('td', { class: 'num' }, `${sign > 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}`));
    const policy = <K extends keyof Policies>(key: K, title: string) => {
      const opts = POLICY_EFFECTS[key] as Record<string, { label: string }>;
      return h('div', { class: 'policy' }, h('h4', null, title), h('div', { class: 'seg' }, ...Object.entries(opts).map(([v, o]) => h('button', {
        class: n.policies[key] === v ? 'on' : '',
        onclick: () => { setPolicy(w, me, key, v as Policies[K]); this.refreshTop(); this.render(); },
      }, o.label))), h('p', { class: 'sub' }, policyEffect(key, n.policies[key])));
    };
    return h('div', null,
      h('table', { class: 'budget' }, h('caption', null, 'Bilancio settimanale previsto (milioni)'),
        row('Entrate fiscali', b.income - (b.resources ?? 0) - (b.works ?? 0), 1), row('Risorse delle province', b.resources ?? 0, 1), row('Campi, industrie e porti', b.works ?? 0, 1), row('Commercio (saldo)', b.trade ?? 0, (b.trade ?? 0) >= 0 ? 1 : -1), ...(b.tribute ? [row(b.tribute > 0 ? 'Tributi dei vassalli' : 'Tributo al signore', b.tribute, b.tribute > 0 ? 1 : -1)] : []), row('Mantenimento esercito', b.upkeep), row('Amministrazione', b.administration), row('Interessi sul debito', b.interest), row('Opere pubbliche', b.infrastructure),
        h('tr', { class: 'total' }, h('td', null, 'Saldo'), h('td', { class: `num ${b.net >= 0 ? 'pos' : 'neg'}` }, `${b.net >= 0 ? '+' : '−'}${Math.abs(b.net).toFixed(1)}`))),
      h('dl', { class: 'facts' },
        h('dt', null, 'Debito pubblico'), h('dd', null, `${Math.round(n.debt).toLocaleString('it-IT')} M`),
        h('dt', null, 'Leva settimanale'), h('dd', null, `${b.manpowerGain.toLocaleString('it-IT')} uomini`),
        h('dt', null, 'Stabilità'), h('dd', null, `${Math.round(n.stability)} (tende a ${Math.round(stabilityTarget(w, me))})`),
        h('dt', null, 'Stanchezza di guerra'), h('dd', null, `${Math.round(n.warExhaustion)}/100`),
        h('dt', null, 'Rete ferroviaria'), h('dd', null, `${Math.round(n.rail)}/100`),
      ),
      (() => {
        const r = effectiveResources(w, me);
        const ids = (Object.keys(r.count) as ResourceId[]).sort((a, c) => RESOURCES[c].value - RESOURCES[a].value);
        return h('div', null, h('h3', null, 'Risorse'),
          h('p', null, ids.map((x) => `${resourceLabel(x)} ×${r.count[x]}`).join(' · ') || 'nessuna'),
          Object.keys(r.imports).length ? h('p', { class: 'sub' }, `Importate: ${(Object.entries(r.imports) as [ResourceId, number][]).map(([x, q]) => `${resourceLabel(x)} ×${q}`).join(' · ')}`) : null,
          r.missing.length ? h('p', { class: 'sub' }, `Mancano ${r.missing.join(' e ')}: ${r.missing.includes('carbone') && w.profiles[me].industry >= 50 ? 'senza carbone le entrate calano del 5%' : ''}${r.missing.length === 2 && w.profiles[me].industry >= 50 ? '; ' : ''}${r.missing.includes('ferro') ? 'senza ferro l\'artiglieria costa il 30% in più' : ''}.`) : null);
      })(),
      policy('tax', 'Imposte'), policy('mobilization', 'Esercito'), policy('infrastructure', 'Ferrovie e opere'), policy('press', 'Stampa'),
      s.situations.length ? h('div', null, h('h3', null, 'Questioni aperte'), ...s.situations.map((x) => h('p', null, h('b', null, x.title), ': ', x.summary))) : null,
    );
  }

  private viewDiplomacy(): Node {
    const w = this.game.world, s = w.state, me = s.player;
    const tags = Object.keys(s.nations).filter((t) => t !== me && t !== 'NUL' && s.nations[t].alive);
    const neigh = new Set<Tag>();
    w.map.provinces.forEach((p) => { if (s.owner[p.id] === me) w.map.adj[p.id].forEach((e) => neigh.add(s.owner[e.to])); });
    const rank = (t: Tag) => (atWar(s, me, t) ? 0 : w.profiles[t].major ? 1 : neigh.has(t) ? 2 : 3);
    tags.sort((a, b) => rank(a) - rank(b) || w.profiles[a].name.localeCompare(w.profiles[b].name));
    return h('div', null,
      this.game.hasKey ? null : h('p', { class: 'notice' }, 'Per parlare con i governi serve la chiave API. ', h('button', { class: 'link', onclick: () => this.setTab('settings') }, 'Impostazioni')),
      this.viewSubjects(),
      h('ul', { class: 'list nations' }, ...tags.map((t) => {
        const treaties = s.treaties.filter((x) => (x.a === t && x.b === me) || (x.b === t && x.a === me)).map((x) => TREATY_LABEL[x.type]);
        const unread = (s.chats[t]?.length ?? 0);
        return h('li', { onclick: () => { this.chatWith = t; this.render(); } },
          h('div', { class: 'row' }, h('span', null, h('i', { class: 'swatch', style: `background:${w.profiles[t].color}` }), h('b', null, w.profiles[t].name)), h('span', { class: `num ${opinion(s, t, me) < 0 ? 'neg' : 'pos'}` }, signed(opinion(s, t, me)))),
          h('div', { class: 'sub' }, atWar(s, me, t) ? 'IN GUERRA con noi' : treaties.join(', ') || 'nessun trattato', subjectOf(w, t) ? ` · ${subjectOf(w, t)!.level} ${di(w, subjectOf(w, t)!.overlord)}` : '', unread ? ` · ${unread} messaggi` : ''),
        );
      })),
      h('p', { class: 'muted' }, 'Il numero è il giudizio che quel governo ha di noi (da −100 a 100).'),
    );
  }

  private viewSubjects(): Node | null {
    const w = this.game.world, s = w.state, me = s.player;
    const list = subjects(w).filter((x) => x.overlord === me || x.subject === me);
    const others = subjects(w).filter((x) => x.overlord !== me && x.subject !== me);
    const act = (label: string, fn: () => string | null, err: string | null = null) => h('button', { class: 'link', disabled: !!err, title: err ?? '', onclick: () => { const e = fn(); this.toast(e ?? label); this.afterStateChange(); } }, label);
    return h('div', null,
      list.length ? h('h3', null, 'Stati soggetti') : null,
      ...list.map((x) => {
        const lt = libertyTarget(w, x);
        const asOverlord = x.overlord === me;
        const other = asOverlord ? x.subject : x.overlord;
        return h('div', { class: 'card' },
          h('div', { class: 'row' }, h('b', null, asOverlord ? `${nationName(w, x.subject)}: ${x.level}` : `Siamo ${x.level} ${di(w, x.overlord)}`), h('span', { class: 'num' }, `${Math.round(x.liberty)}/100`)),
          h('div', { class: 'meter' }, h('i', { style: `width:${x.liberty}%` }), h('b', { style: 'left:75%' })),
          h('p', { class: 'sub' }, `Desiderio di indipendenza, tende a ${Math.round(lt.target)}: ${lt.parts.map(([k, v]) => `${k} ${v >= 0 ? '+' : ''}${v}`).join(', ')}. ${LEVEL_INFO[x.level].desc}${x.liberty >= 75 ? '; sopra 75 il tributo non arriva più' : ''}.`),
          h('div', { class: 'buttons' }, ...(asOverlord ? [
            x.level !== 'protettorato' ? act('Stringere il legame', () => tighten(w, me, x.subject), x.liberty >= 25 ? 'serve un desiderio di indipendenza sotto 25' : null) : null,
            act(x.level === 'tributario' ? 'Riconoscere l\'indipendenza' : 'Allentare il legame', () => loosen(w, me, x.subject)),
            x.level === 'protettorato' ? act('Annettere', () => annex(w, me, x.subject), annexRefusal(w, me, x.subject)) : null,
            h('button', { class: 'link', onclick: () => { this.chatWith = other; this.render(); } }, 'Scrivi'),
          ] : [act('Proclamare l\'indipendenza', () => declareIndependence(w, me), x.liberty < 75 ? 'serve un desiderio di indipendenza di almeno 75' : null)]).filter((n) => !!n)));
      }),
      others.length ? h('p', { class: 'sub' }, `Altri stati soggetti: ${others.map((x) => `${shortName(w, x.subject)} (${x.level} ${di(w, x.overlord)}, ${Math.round(x.liberty)})`).join('; ')}.`) : null,
    );
  }

  private viewChat(tag: Tag): Node {
    const w = this.game.world, s = w.state, me = s.player;
    const pr = w.profiles[tag];
    const chat = s.chats[tag] ?? [];
    const offer = this.lastOffer[tag];
    const input = h('textarea', { rows: 3, placeholder: 'Scrivi la tua nota diplomatica…', maxlength: 1500 }) as HTMLTextAreaElement;
    const send = h('button', { class: 'primary', disabled: this.chatBusy || !this.game.hasKey, onclick: () => this.sendChat(tag, input.value) }, this.chatBusy ? 'In attesa di risposta…' : 'Invia');
    const war = atWar(s, me, tag);
    return h('div', { class: 'chat' },
      h('div', { class: 'chat-head' },
        h('button', { class: 'link', onclick: () => { this.chatWith = null; this.render(); } }, '‹ Tutte le nazioni'),
        h('p', { class: 'sub' }, `${pr.government}; ${pr.leader}. Giudizio su di noi ${signed(opinion(s, tag, me))}, nostro su di loro ${signed(opinion(s, me, tag))}.`),
      ),
      h('div', { class: 'chat-log' }, chat.length ? chat.map((m) => h('div', { class: `msg ${m.role}` }, h('p', null, m.text), h('small', null, `${formatDate(m.day)}${m.intent && m.intent !== 'none' ? ` · ${intentLabel(m.intent)}` : ''}`))) : h('p', { class: 'muted' }, 'Nessuna corrispondenza. Scrivi liberamente: il governo risponde in carattere, può rifiutare, tergiversare o controproporre.')),
      offer ? h('div', { class: 'card confirm' }, h('p', null, 'Proposta sul tavolo: ', h('b', null, describeProposal(w, me, tag, offer))), h('div', { class: 'buttons' },
        h('button', { class: 'primary', onclick: () => { const err = this.game.acceptOffer(tag, offer); this.lastOffer[tag] = null; this.toast(err ?? 'Accordo firmato.'); this.afterStateChange(); } }, 'Firma'),
        h('button', { class: 'quiet', onclick: () => { this.lastOffer[tag] = null; this.render(); } }, 'Lascia cadere'))) : null,
      h('div', { class: 'compose' },
        this.offerPicker(tag),
        input,
        h('div', { class: 'buttons' }, send, war ? null : h('button', { class: 'danger', onclick: () => this.confirmWar(tag) }, 'Dichiara guerra'),
          war && !protectorateRefusal(w, me, tag) ? h('button', { onclick: () => { const e = imposeProtectorate(w, me, tag); this.toast(e ?? `Pace firmata: ${nationName(w, tag)} è nostro protettorato.`); this.chatWith = null; this.afterStateChange(); } }, 'Imporre il protettorato') : null),
      ),
    );
  }

  private offerPicker(tag: Tag): Node {
    const w = this.game.world, s = w.state, me = s.player;
    const war = atWar(s, me, tag);
    const opts: [string, string][] = war ? [['', 'nessuna proposta formale'], ['peace_white', 'pace bianca'], ['peace_take', 'pace: ci cedono ciò che occupiamo'], ['peace_give', 'pace: cediamo ciò che occupano']]
      : [['', 'nessuna proposta formale'], ['alliance', 'alleanza difensiva'], ['non_aggression', 'non aggressione (10 anni)'], ['trade', 'accordo commerciale (5 anni)'], ['military_access', 'accesso militare (2 anni)'], ['guarantee', 'garanzia della loro indipendenza'], ['subsidy_give', 'sussidio da parte nostra (50 M)'], ...[...enemiesOf(s, me)].filter((e) => e !== tag).map((e) => [`join_${e}`, `entrare in guerra contro ${nationName(w, e)}`] as [string, string])];
    const sel = h('select', { onchange: (e: Event) => { this.draftOffer = this.buildOffer(tag, (e.target as HTMLSelectElement).value); } }, ...opts.map(([v, l]) => h('option', { value: v }, l))) as HTMLSelectElement;
    this.draftOffer = null;
    return h('label', { class: 'offer' }, 'Allega una proposta formale ', sel);
  }

  private buildOffer(tag: Tag, v: string): Proposal | null {
    const s = this.game.state, me = s.player;
    if (!v) return null;
    if (v === 'peace_white') return { type: 'peace' };
    if (v === 'peace_take') return { type: 'peace', giver: tag, provinces: this.game.world.map.provinces.filter((p) => s.owner[p.id] === tag && s.controller[p.id] === me).map((p) => p.id).slice(0, 30) };
    if (v === 'peace_give') return { type: 'peace', giver: me, provinces: this.game.world.map.provinces.filter((p) => s.owner[p.id] === me && s.controller[p.id] === tag).map((p) => p.id).slice(0, 30) };
    if (v === 'subsidy_give') return { type: 'subsidy', giver: me, amount: 50 };
    if (v.startsWith('join_')) return { type: 'join_war', against: v.slice(5) };
    return { type: v as Proposal['type'], years: v === 'non_aggression' ? 10 : v === 'trade' ? 5 : v === 'military_access' ? 2 : undefined };
  }

  private async sendChat(tag: Tag, text: string) {
    if (!text.trim() && !this.draftOffer) return;
    this.chatBusy = true;
    const offer = this.draftOffer;
    this.render();
    try {
      const r = await this.game.talk(tag, text.trim() || '(nota diplomatica formale)', offer);
      if (r.applied) this.toast(`Accordo concluso: ${r.applied}.`);
      else if (r.veto) this.toast(`Nessun accordo: ${r.veto}.`);
      this.lastOffer[tag] = r.intent === 'counter' || r.intent === 'propose' ? r.proposal : null;
    } catch (e) {
      this.toast((e as Error).message);
    } finally {
      this.chatBusy = false;
      this.draftOffer = null;
      this.afterStateChange();
    }
  }

  private confirmWar(tag: Tag) {
    const w = this.game.world, s = w.state;
    const allies = s.treaties.filter((t) => !t.violated && (t.type === 'alliance' || (t.type === 'guarantee' && t.b === tag)) && (t.a === tag || t.b === tag)).map((t) => nationName(w, t.a === tag ? t.b : t.a));
    const pact = treatyBetween(s, s.player, tag, 'non_aggression');
    this.dialog(`Dichiarare guerra a ${nationName(w, tag)}?`, [
      allies.length ? `Entreranno in guerra anche: ${allies.join(', ')}.` : 'Nessun alleato è obbligato a intervenire al loro fianco.',
      pact ? 'Esiste un patto di non aggressione: violarlo peserà sul giudizio di tutte le capitali.' : 'Tutte le capitali giudicheranno l\'aggressione.',
    ], 'Dichiara guerra', () => {
      declareWar(w, s.player, tag, 'decisione del governo');
      s.nations[s.player].policies.mobilization = s.nations[s.player].policies.mobilization === 'peace' ? 'partial' : s.nations[s.player].policies.mobilization;
      this.afterStateChange();
    });
  }

  private viewDispatches(): Node {
    const s = this.game.state;
    const items = [...s.dispatches].reverse();
    const last = this.game.lastOutcome;
    return h('div', { class: 'prose' },
      last && (last.errors.length || last.aiError || last.applied.length) ? h('div', { class: 'card' },
        last.applied.length ? h('p', { class: 'sub' }, `Eseguito: ${last.applied.join('; ')}.`) : null,
        last.errors.length ? h('p', { class: 'sub neg' }, `Non eseguito: ${last.errors.join('; ')}.`) : null,
        last.aiError ? h('p', { class: 'sub neg' }, `AI non disponibile: ${last.aiError}`) : null,
      ) : null,
      items.length ? items.map((d, i) => h('article', { class: i === 0 ? 'dispatch latest' : 'dispatch' },
        h('h3', null, `Settimana al ${formatDate(d.day)}`),
        ...d.text.split(/\n+/).map((p) => h('p', null, p)),
        d.notes ? h('p', { class: 'sub' }, `Stato maggiore: ${d.notes}`) : null,
      )) : h('p', { class: 'muted' }, 'Nessun dispaccio: i resoconti arrivano alla fine di ogni settimana.'),
      s.memory.length > 5 && s.chronicle ? h('details', null, h('summary', null, 'Cronaca della partita'), h('p', null, s.chronicle)) : null,
    );
  }

  private viewSettings(): Node {
    const st = this.settings;
    const field = (label: string, key: 'apiKey' | 'baseUrl' | 'model' | 'diplomacyModel', type = 'text', help = '') => h('label', { class: 'field' }, label,
      h('input', { type, value: st[key] ?? '', autocomplete: 'off', spellcheck: false, oninput: (e: Event) => { (st as unknown as Record<string, string>)[key] = (e.target as HTMLInputElement).value.trim(); } }),
      help ? h('small', null, help) : null);
    const saves = h('ul', { class: 'list' });
    listSaves().then((all) => saves.replaceChildren(...all.map((m) => h('li', null,
      h('div', { class: 'row' }, h('b', null, m.label), h('span', { class: 'sub' }, formatDate(m.day))),
      h('div', { class: 'buttons' },
        h('button', { onclick: async () => { const state = await loadGame(m.slot); if (state) this.start(Game.fromState(this.mapData, state, this.settings)); } }, 'Carica'),
        m.slot !== 'auto' ? h('button', { class: 'quiet', onclick: async () => { await deleteSave(m.slot); this.render(); } }, 'Elimina') : null),
    ))));
    return h('div', null,
      h('h3', null, 'Modello AI'),
      h('p', { class: 'sub' }, 'La chiave resta solo su questo telefono e viene inviata solo al provider indicato.'),
      field('Chiave API', 'apiKey', 'password', 'Per DeepSeek: platform.deepseek.com → API keys.'),
      field('Indirizzo del provider', 'baseUrl', 'url', 'Qualsiasi servizio compatibile OpenAI (DeepSeek, OpenRouter…).'),
      field('Modello', 'model', 'text', 'Predefinito: deepseek-v4-flash.'),
      field('Modello per la diplomazia (facoltativo)', 'diplomacyModel', 'text', 'Es. deepseek-v4-pro per negoziati più ricchi. Vuoto = stesso modello.'),
      h('div', { class: 'buttons' },
        h('button', { class: 'primary', onclick: async () => { await saveSettings(st); this.game.config = st; this.toast('Impostazioni salvate.'); this.render(); } }, 'Salva'),
        h('button', { onclick: () => this.testKey() }, 'Prova la connessione'),
      ),
      h('p', { class: 'sub' }, `Uso in questa sessione: ${usage.calls} chiamate, ${fmtK(usage.promptTokens)} token in ingresso (${fmtK(usage.cachedTokens)} dalla cache), ${fmtK(usage.completionTokens)} in uscita.`),
      h('h3', null, 'Aggiornamenti'),
      this.updateBox(),
      h('h3', null, 'Partite'),
      saves,
      h('div', { class: 'buttons' },
        h('button', { onclick: async () => { const name = `slot-${Date.now()}`; await this.game.save(name); this.toast('Partita salvata.'); this.render(); } }, 'Salva in un nuovo slot'),
        h('button', { onclick: () => this.exportSave() }, 'Esporta (copia)'),
        h('button', { onclick: () => this.importSave() }, 'Importa'),
        h('button', { class: 'danger', onclick: () => this.dialog('Iniziare una nuova partita?', ['La partita attuale resta nel salvataggio automatico finché non giochi un turno della nuova.'], 'Nuova partita', () => location.reload()) }, 'Nuova partita'),
      ),
    );
  }

  private updateState: { checking: boolean; latest: Release | null; error: string } = { checking: false, latest: null, error: '' };

  private updateBox(): Node {
    const u = this.updateState;
    const newer = u.latest && isNewer(u.latest);
    const status = u.checking ? 'Controllo in corso…'
      : u.error ? `Controllo non riuscito: ${u.error}`
      : !u.latest ? ''
      : newer ? `Disponibile la versione ${u.latest.version}.`
      : APP_VERSION === 'dev' ? `Ultima versione pubblicata: ${u.latest.version}.` : 'Hai già l\'ultima versione.';
    return h('div', null,
      h('p', { class: 'sub' }, `Versione installata: ${APP_VERSION}.${status ? ` ${status}` : ''}`),
      newer && isNative() ? h('p', { class: 'sub' }, 'Si apre il download del nuovo APK: al termine tocca la notifica e conferma l\'installazione. La partita resta salvata.') : null,
      h('div', { class: 'buttons' },
        h('button', { disabled: u.checking, onclick: () => this.checkUpdate() }, 'Controlla aggiornamenti'),
        newer ? h('button', { class: 'primary', onclick: () => installUpdate() }, isNative() ? `Scarica e installa ${u.latest!.version}` : 'Ricarica') : null,
      ),
    );
  }

  private async checkUpdate() {
    this.updateState = { checking: true, latest: null, error: '' };
    this.render();
    try { this.updateState = { checking: false, latest: await latestRelease(), error: '' }; } catch (e) { this.updateState = { checking: false, latest: null, error: (e as Error).message }; }
    this.render();
  }

  private async testKey() {
    this.game.config = this.settings;
    try {
      this.toast('Prova in corso…');
      const r = await chatJSON(this.settings, [{ role: 'system', content: 'Rispondi solo con un oggetto JSON.' }, { role: 'user', content: 'Rispondi con {"ok": true}.' }], { maxTokens: 50, temperature: 0 });
      this.toast(r.ok ? `Connessione riuscita (${this.settings.model}).` : `Il provider risponde, ma in modo inatteso: ${JSON.stringify(r).slice(0, 80)}`);
    } catch (e) { this.toast((e as Error).message); }
  }

  private async exportSave() {
    const text = JSON.stringify(this.game.state);
    try { await navigator.clipboard.writeText(text); this.toast(`Salvataggio copiato negli appunti (${Math.round(text.length / 1024)} KB).`); }
    catch { this.dialog('Copia il salvataggio', [text.slice(0, 200) + '…'], 'Chiudi', () => {}); }
  }

  private importSave() {
    const ta = h('textarea', { rows: 6, placeholder: 'Incolla qui il salvataggio esportato' }) as HTMLTextAreaElement;
    this.dialog('Importa una partita', [ta], 'Importa', () => {
      try { const state = JSON.parse(ta.value); if (state?.version !== 1) throw new Error(); this.start(Game.fromState(this.mapData, state, this.settings)); }
      catch { this.toast('Il testo incollato non è un salvataggio valido.'); }
    });
  }

  // --- fine turno ---
  private openTurnDialog() {
    if (this.game.busy) return;
    const ta = h('textarea', { rows: 4, placeholder: this.game.hasKey ? 'Facoltativo. Es.: "Il II e III Corpo avanzino su Trento appena la cavalleria è a Verona; alza le imposte."' : 'Le direttive scritte richiedono la chiave API.', disabled: !this.game.hasKey }) as HTMLTextAreaElement;
    this.dialog('Direttive per la settimana', [h('p', { class: 'sub' }, 'Gli ordini dati dalla mappa sono già registrati. Qui puoi aggiungere istruzioni libere allo Stato maggiore e al governo.'), ta], 'Esegui il turno', () => this.runTurn(ta.value));
    setTimeout(() => ta.focus(), 50);
  }

  private async runTurn(directive: string) {
    const ov = $('#overlay');
    const txt = $('#overlay-text');
    show(ov, true);
    let out: TurnOutcome | null = null;
    try {
      out = await this.game.playTurn(directive, (p) => { txt.textContent = PHASE[p]; });
    } catch (e) {
      this.toast((e as Error).message);
    } finally {
      show(ov, false);
    }
    if (!out) return;
    this.map.selectedProvince = null;
    this.map.refreshPolitical();
    this.refreshTop();
    if (this.settings.animate) await this.animate(out);
    this.map.invalidate();
    this.setTab('dispatches');
    if (out.aiError) this.toast(`AI non disponibile: ${out.aiError}`);
  }

  private animate(out: TurnOutcome): Promise<void> {
    const frames = out.report.frames;
    if (frames.length < 2) return Promise.resolve();
    const dayMs = 420;
    const t0 = performance.now();
    const banner = $('#hint');
    banner.classList.remove('is-hidden');
    return new Promise((resolve) => {
      const step = () => {
        const t = (performance.now() - t0) / dayMs;
        const i = Math.min(frames.length - 2, Math.floor(t));
        const f = Math.min(1, t - i);
        const a = frames[i], b = frames[i + 1];
        const cur: Record<string, [number, number]> = {};
        for (const id of Object.keys(b)) { const pa = a[id] ?? b[id], pb = b[id]; cur[id] = [pa[0] + (pb[0] - pa[0]) * f, pa[1] + (pb[1] - pa[1]) * f]; }
        this.map.override = cur;
        banner.textContent = formatDate(out.report.fromDay + Math.min(7, Math.floor(t) + 1));
        this.map.invalidate();
        if (t < frames.length - 1) requestAnimationFrame(step);
        else { this.map.override = null; banner.classList.add('is-hidden'); resolve(); }
      };
      requestAnimationFrame(step);
    });
  }

  afterStateChange() {
    this.map.refreshPolitical();
    this.refreshTop();
    this.render();
  }

  // --- utilità ---
  toast(text: string) {
    const t = h('div', { class: 'toast', role: 'status' }, text);
    $('#toasts').append(t);
    setTimeout(() => t.remove(), 5200);
  }

  dialog(title: string, content: (string | Node)[], confirm: string, onConfirm: () => void) {
    const close = () => d.remove();
    const d = h('div', { class: 'modal' }, h('div', { class: 'modal-box', role: 'dialog', 'aria-modal': 'true' },
      h('h2', null, title),
      ...content.map((c) => (typeof c === 'string' ? h('p', null, c) : c)),
      h('div', { class: 'buttons' },
        h('button', { class: 'primary', onclick: () => { close(); onConfirm(); } }, confirm),
        h('button', { class: 'quiet', onclick: close }, 'Annulla')),
    ));
    document.body.append(d);
  }
}

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));
const intentLabel = (i: string) => ({ accept: 'accetta', reject: 'rifiuta', counter: 'controproposta', propose: 'proposta' }[i] ?? i);

function policyEffect(key: keyof Policies, v: string): string {
  const e = (POLICY_EFFECTS[key] as Record<string, Record<string, number | string>>)[v];
  const parts: string[] = [];
  const pct = (x: number) => `${x > 1 ? '+' : ''}${Math.round((x - 1) * 100)}%`;
  if (key === 'tax') parts.push(`entrate ${pct(e.income as number)}`, `stabilità ${signed(e.stability as number)}`);
  if (key === 'mobilization') parts.push(`costo dell'esercito ${pct(e.upkeep as number)}`, `leva ${pct(e.manpower as number)}`, `stabilità ${signed(e.stability as number)}`);
  if (key === 'infrastructure') parts.push(`costo ${Math.round((e.cost as number) * 100)}% delle entrate`, `ferrovie +${e.rail}/settimana`);
  if (key === 'press') parts.push(`stabilità ${signed(e.stability as number)}`, `stanchezza di guerra ${pct(e.exhaustion as number)}`);
  return parts.join(', ').replace(/^(entrate 0%, stabilità 0|costo dell'esercito 0%, leva 0%, stabilità 0|stabilità 0, stanchezza di guerra 0%)$/, 'nessun effetto particolare');
}
