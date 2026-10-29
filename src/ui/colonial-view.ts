// Governo → Colonie: gli interessi coloniali in tre stadi, le vie per ottenerli, le decisioni e l'amministrazione.

import { actionsFor, colonial, decideAmbition, evaluate, execute, interestProvinces, interestsOf, interestStatus, POLICY_INFO, setPolicy, type ColonialAction } from '../engine/colonial';
import { PATH_LABEL, type InterestSeed } from '../scenario/colonial1881';
import { nationName, formatDate, type World } from '../engine/world';
import { h } from './dom';

interface Host {
  world: World;
  toast(msg: string): void;
  changed(): void;
  rerender(): void;
  highlight(ids: Set<number> | null): void;
  center(p: number): void;
}

const STAGE: Record<1 | 2 | 3, [string, string]> = {
  1: ['Storico', 'ciò che la nostra potenza ottenne davvero'],
  2: ['Rivendicazioni reali', 'ciò che chiese senza ottenerlo, o ottenne più tardi'],
  3: ['Ambizioni', 'si aprono solo con la decisione «maggiori richieste»'],
};

export class ColonialView {
  open = new Set<string>();
  constructor(private host: Host) {}

  view(): Node {
    const w = this.host.world, s = w.state, me = s.player, c = colonial(w);
    const list = interestsOf(me);
    if (!list.length) return h('div', null, h('p', { class: 'muted' }, `${nationName(w, me)} non ha un programma coloniale. Le terre di nessuno confinanti si prendono entrando con un esercito.`));
    const pending = c.pending[me];
    const decision = pending ? h('div', { class: 'card confirm' },
      h('p', null, h('b', null, 'Decisione coloniale. '), `Il momento politico (${pending.why}) riapre la questione: chiedere di più o consolidare ciò che abbiamo?`),
      h('ul', { class: 'list plain' },
        h('li', null, h('div', { class: 'row' }, h('b', null, 'Maggiori richieste'), h('button', { class: 'link', onclick: () => this.decide('richieste') }, 'Scegli')),
          h('div', { class: 'sub' }, 'si aprono le ambizioni (stadio 3); stabilità −2, le grandi potenze ci guardano con sospetto')),
        h('li', null, h('div', { class: 'row' }, h('b', null, 'Consolidamento'), h('button', { class: 'link', onclick: () => this.decide('consolidamento') }, 'Scegli')),
          h('div', { class: 'sub' }, 'stabilità +3, le colonie si integrano il 50% più in fretta; se ne riparla fra dieci anni, a un nuovo governo')))) : null;
    const amb = c.ambition[me];
    const liq = c.liquidating && c.liquidating.provinces.length ? h('p', { class: 'notice' }, `Liquidazione egiziana fino al ${formatDate(c.liquidating.until)}: ${c.liquidating.provinces.map((p) => w.map.provinces[p].name).join(', ')}. Chi ha un interesse può chiedere di subentrare.`) : null;
    const mode = s.options?.colonialMode === 'libero' ? 'libera (niente date né prerequisiti; cambia in Impostazioni)' : 'storica (date e prerequisiti leggeri; cambia in Impostazioni)';
    const stages = ([1, 2, 3] as const).map((st) => {
      const items = list.filter((x) => x.stage === st);
      if (!items.length) return null;
      return h('div', null, h('h3', null, STAGE[st][0], h('small', { class: 'sub' }, ` · ${STAGE[st][1]}`)), h('ul', { class: 'list plain' }, ...items.map((x) => this.item(x))));
    });
    const admin = list.filter((x) => c.admin[x.id]).map((x) => this.adminCard(x));
    return h('div', null,
      decision,
      liq,
      h('p', { class: 'sub' }, `Modalità ${mode}.${amb ? ` Scelta: ${amb.choice === 'richieste' ? 'maggiori richieste' : 'consolidamento'} (${formatDate(amb.day)}).` : ''}`),
      ...stages,
      admin.length ? h('h3', null, 'Amministrazione delle colonie') : null,
      ...admin,
    );
  }

  private decide(choice: 'richieste' | 'consolidamento') {
    const w = this.host.world;
    const err = decideAmbition(w, w.state.player, choice);
    this.host.toast(err ?? (choice === 'richieste' ? 'Maggiori richieste: si aprono le ambizioni.' : 'Consolidamento.'));
    this.host.changed();
  }

  private item(x: InterestSeed): Node {
    const w = this.host.world;
    const st = interestStatus(w, x);
    const pct = Math.round(st.progress * 100);
    const badge = { done: '✔ completato', closed: '✖ sfumato', available: 'disponibile', locked: 'bloccato' }[st.state];
    const isOpen = this.open.has(x.id);
    const show = () => {
      const ids = interestProvinces(w, x);
      this.host.highlight(new Set(ids));
      if (ids.length) this.host.center(ids[Math.floor(ids.length / 2)]);
    };
    return h('li', { class: st.state === 'closed' ? 'dim' : '' },
      h('div', { class: 'row' }, h('b', null, x.name), h('span', { class: 'sub' }, `${badge} · ${pct}%`)),
      h('div', { class: 'meter' }, h('i', { style: `width:${pct}%` }), h('b', { style: 'left:80%' })),
      h('div', { class: 'sub' }, x.desc, ' Vie: ', x.paths.map((p) => PATH_LABEL[p][0].toLowerCase()).join(', '), x.window ? `. Epoca: ${x.window[0]}–${x.window[1]}.` : '.'),
      st.state === 'locked' ? h('div', { class: 'sub' }, 'Manca: ', st.reasons.join('; ')) : null,
      h('div', { class: 'buttons' },
        h('button', { class: 'link', onclick: show }, 'Mostra sulla mappa'),
        st.state === 'available' ? h('button', { class: 'link', onclick: () => { if (isOpen) this.open.delete(x.id); else this.open.add(x.id); this.host.rerender(); } }, isOpen ? 'Chiudi le vie' : 'Vie possibili') : null),
      st.state === 'available' && isOpen ? this.actions(x) : null);
  }

  private actions(x: InterestSeed): Node {
    const w = this.host.world;
    const acts = actionsFor(w, x);
    if (!acts.length) return h('p', { class: 'sub' }, 'Nessuna via aperta adesso.');
    return h('ul', { class: 'list plain' }, ...acts.map((a) => this.action(a)));
  }

  private action(a: ColonialAction): Node {
    const w = this.host.world;
    const ev = evaluate(w, a);
    const label = PATH_LABEL[a.path][0];
    const who = a.path === 'protettorato' ? nationName(w, a.target) : a.path === 'acquisto' ? nationName(w, a.from) : a.path === 'assenso' ? (a.decider === a.from ? nationName(w, a.from) : `${nationName(w, a.decider)} (per ${nationName(w, a.from)})`) : a.path === 'guerra' ? nationName(w, a.against) : '';
    const where = a.path === 'occupazione' || a.path === 'acquisto' || a.path === 'assenso' ? a.provinces.map((p) => w.map.provinces[p].name).join(', ') : '';
    const diplo = a.path === 'protettorato' || a.path === 'acquisto' || a.path === 'assenso';
    const parts = ev.parts.filter(([, v]) => v !== 0).map(([k, v]) => `${k} ${v > 0 ? '+' : '−'}${Math.abs(v)}`).join(', ');
    return h('li', null,
      h('div', { class: 'row' }, h('b', null, `${label}${who ? ` · ${who}` : ''}`),
        diplo ? h('button', { class: 'link', disabled: !!ev.refusal, onclick: () => this.run(a) }, ev.cost ? `Proponi (${ev.cost} M)` : 'Proponi') : null,
        a.path === 'occupazione' ? h('button', { class: 'link', onclick: () => { this.host.highlight(new Set(a.provinces)); this.host.center(a.provinces[0]); this.host.toast('Muovi un esercito in una delle terre evidenziate: la spedizione la annette.'); } }, 'Evidenzia') : null),
      where ? h('div', { class: 'sub' }, where) : null,
      h('div', { class: 'sub' }, PATH_LABEL[a.path][1]),
      ev.refusal ? h('div', { class: 'sub' }, `Non ora: ${ev.refusal}`) : diplo ? h('div', { class: 'sub' }, `Probabilità: ${ev.score} su ${ev.need} necessari${ev.ok ? ' (accetterebbe)' : ' (rifiuterebbe)'}${parts ? ` · ${parts}` : ''}`) : null);
  }

  private run(a: ColonialAction) {
    const w = this.host.world;
    const err = execute(w, a);
    this.host.toast(err ? `Niente da fare: ${err}.` : 'Accordo firmato.');
    this.host.changed();
  }

  private adminCard(x: InterestSeed): Node {
    const w = this.host.world, ad = colonial(w).admin[x.id];
    const seg = <K extends 'culto' | 'economia' | 'rappresentanza'>(key: K, title: string) => {
      const opts = POLICY_INFO[key] as Record<string, readonly [string, string]>;
      const cur = ad[key] as string;
      return h('div', null, h('b', null, title),
        h('div', { class: 'seg' }, ...Object.entries(opts).map(([v, [l]]) => h('button', { class: cur === v ? 'on' : '', onclick: () => { setPolicy(w, x.id, key, v); this.host.changed(); } }, l))),
        h('div', { class: 'sub' }, opts[cur][1]));
    };
    return h('div', { class: 'card' },
      h('div', { class: 'row' }, h('b', null, x.name), h('span', { class: 'sub' }, `integrazione ${Math.round(ad.integration)} · resistenza ${Math.round(ad.resistance)}${ad.resistance >= 70 ? ' · RISCHIO DI RIVOLTA' : ''}`)),
      h('div', { class: 'meter' }, h('i', { style: `width:${Math.round(ad.integration)}%` }), h('b', { style: `left:${Math.min(100, Math.round(ad.resistance))}%` })),
      seg('culto', 'Culto'), seg('economia', 'Economia'), seg('rappresentanza', 'Rappresentanza'));
  }
}
