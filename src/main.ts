import '@fontsource/alegreya/latin-400.css';
import '@fontsource/alegreya/latin-400-italic.css';
import '@fontsource/alegreya/latin-600-italic.css';
import '@fontsource/alegreya/latin-700.css';
import '@fontsource/alegreya-sans/latin-400.css';
import '@fontsource/alegreya-sans/latin-500.css';
import '@fontsource/alegreya-sans/latin-700.css';
import './ui/style.css';

import { Game } from './game';
import type { MapData } from './engine/types';
import { NATIONS } from './scenario/europe1881';
import { listSaves, loadGame, loadSettings } from './storage/storage';
import { App } from './ui/app';
import { $, h, show } from './ui/dom';

async function boot() {
  const status = $('#start-status');
  try {
    const [settings, mapData] = await Promise.all([
      loadSettings(),
      fetch('data/europe1881.json').then((r) => { if (!r.ok) throw new Error(`mappa non trovata (${r.status})`); return r.json() as Promise<MapData>; }),
    ]);
    const app = new App(mapData, settings);
    (window as unknown as { app: App }).app = app;
    const saves = await listSaves().catch(() => []);
    status.textContent = '';
    const choices = $('#start-actions');
    const auto = saves.find((s) => s.slot === 'auto');
    if (auto) {
      choices.append(h('button', { class: 'primary', onclick: async () => {
        const state = await loadGame('auto');
        if (state) app.start(Game.fromState(mapData, state, settings));
      } }, `Continua: ${auto.label}`));
    }
    const majors = Object.entries(NATIONS).filter(([, p]) => p.major);
    const minors = Object.entries(NATIONS).filter(([t, p]) => !p.major && !p.micro && t !== 'NUL');
    const sel = h('select', { id: 'nation-select', 'aria-label': 'Nazione' },
      h('optgroup', { label: 'Grandi potenze' }, ...majors.map(([t, p]) => h('option', { value: t, selected: t === 'ITA' }, p.name))),
      h('optgroup', { label: 'Altre nazioni' }, ...minors.map(([t, p]) => h('option', { value: t }, p.name))),
    ) as HTMLSelectElement;
    choices.append(
      h('label', { class: 'field' }, 'Nazione da guidare', sel),
      h('button', { class: auto ? '' : 'primary', onclick: () => app.start(Game.create(mapData, sel.value, settings)) }, 'Nuova partita, 1° gennaio 1881'),
    );
  } catch (e) {
    status.textContent = `Impossibile avviare: ${(e as Error).message}`;
  }
}

show($('#game'), false);
boot();
