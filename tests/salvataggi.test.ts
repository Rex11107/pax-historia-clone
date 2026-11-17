// Blocco A3 (corti 08, 09, 10): versioni dei salvataggi, scrittura sicura, confronto delle versioni dell'app.
import { describe, expect, it } from 'vitest';
import { newGame } from '../src/engine/setup';
import { mapKey, migrate, SAVE_VERSION } from '../src/engine/migrate';
import { checkInvariants } from '../src/engine/invariants';
import { runTurn } from '../src/engine/turn';
import { GameMap } from '../src/engine/map';
import { profilesFor } from '../src/engine/setup';
import { chooseRecord } from '../src/storage/storage';
import { compareVersions } from '../src/update';
import type { MapData } from '../src/engine/types';
import { MAP } from './helpers';

const M = MAP as unknown as MapData;
/** un salvataggio come uscirebbe dal disco: JSON e ritorno */
const disk = (x: unknown) => JSON.parse(JSON.stringify(x));

describe('versioni dei salvataggi (corte 10, capo 1)', () => {
  it('una partita nuova ha la versione attuale e l\'impronta della mappa', () => {
    const w = newGame(MAP, 'ITA');
    expect(w.state.version).toBe(SAVE_VERSION);
    expect(w.state.mapKey).toBe(mapKey(M));
  });

  it('un salvataggio della versione 1 si riapre e si gioca', () => {
    const w = newGame(MAP, 'ITA');
    const old = disk(w.state);
    old.version = 1; delete old.mapKey; delete old.dispatches;
    const { state, warnings } = migrate(old, M);
    expect(state.version).toBe(SAVE_VERSION);
    expect(state.dispatches).toEqual([]);
    expect(state.mapKey).toBe(mapKey(M));
    expect(warnings.join(' ')).toMatch(/versione 1/);
    const w2 = { map: new GameMap(M), profiles: profilesFor(), state };
    runTurn(w2);
    expect(checkInvariants(w2)).toEqual([]);
  });

  it('un salvataggio senza numero di versione riceve gli elenchi mancanti', () => {
    const old = disk(newGame(MAP, 'FRA').state);
    delete old.version; delete old.chats; delete old.memory; delete old.events;
    const { state } = migrate(old, M);
    expect(state.chats).toEqual({});
    expect(state.memory).toEqual([]);
    expect(state.events).toEqual([]);
  });

  it('una partita già alla versione attuale passa senza avvisi né cambiamenti', () => {
    const s = disk(newGame(MAP, 'ITA').state);
    const before = JSON.stringify(s);
    const { state, warnings } = migrate(s, M);
    expect(warnings).toEqual([]);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('rifiuta con un messaggio chiaro i casi che non si possono riprendere', () => {
    const s = disk(newGame(MAP, 'ITA').state);
    expect(() => migrate({ ...s, owner: s.owner.slice(1) }, M)).toThrow(/versione precedente della mappa/);
    expect(() => migrate({ ...s, version: SAVE_VERSION + 1 }, M)).toThrow(/più recente/);
    expect(() => migrate({ nations: {} }, M)).toThrow(/danneggiato/);
    expect(() => migrate(null, M)).toThrow(/danneggiato/);
  });

  it('avvisa se la mappa è stata ritoccata, ma non per una rinomina', () => {
    const s = disk(newGame(MAP, 'ITA').state);
    const renamed = { ...M, provinces: M.provinces.map((p, i) => (i === 5 ? { ...p, name: 'Nome nuovo' } : p)) };
    expect(mapKey(renamed)).toBe(mapKey(M));
    s.mapKey = 'vecchia';
    expect(migrate(s, M).warnings.join(' ')).toMatch(/ritoccata/);
  });
});

describe('scrittura sicura (corte 10, persistenza 1)', () => {
  const good = { meta: { slot: 'auto' }, state: JSON.stringify({ turn: 3 }) };
  const prev = { meta: { slot: 'auto' }, state: JSON.stringify({ turn: 2 }) };
  it('legge il salvataggio principale se è integro', () => {
    expect(chooseRecord(good, prev)).toEqual({ state: { turn: 3 }, fromBackup: false });
  });
  it('ripiega sulla copia di riserva se il principale è troncato o manca', () => {
    expect(chooseRecord({ ...good, state: good.state.slice(0, 5) }, prev)).toEqual({ state: { turn: 2 }, fromBackup: true });
    expect(chooseRecord(undefined, prev)).toEqual({ state: { turn: 2 }, fromBackup: true });
  });
  it('senza nulla di leggibile restituisce null', () => {
    expect(chooseRecord(undefined, undefined)).toBeNull();
    expect(chooseRecord({ ...good, state: '{' }, { ...prev, state: '' })).toBeNull();
  });
});

describe('versioni dell\'app (corte 10, capo 3)', () => {
  it('confronta le versioni numero per numero', () => {
    expect(compareVersions('0.2.0', '0.1.84')).toBeGreaterThan(0);
    expect(compareVersions('0.1.85', '0.1.84')).toBeGreaterThan(0);
    expect(compareVersions('v0.1.84', '0.1.84')).toBe(0);
    expect(compareVersions('0.1.9', '0.1.10')).toBeLessThan(0);
    expect(compareVersions('1.0', '0.9.99')).toBeGreaterThan(0);
    expect(compareVersions('0.1.84', '0.1.84.1')).toBeLessThan(0);
  });
});
