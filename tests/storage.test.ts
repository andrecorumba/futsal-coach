import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, newMatch, type Match } from '../src/state/model';
import { reduce, type Action } from '../src/state/reducer';
import {
  addLineup,
  clearMatch,
  deleteLineup,
  exportLineup,
  exportMatch,
  IMPORT_ERRORS,
  listLineups,
  loadLineup,
  loadMatch,
  loadSettings,
  parseImport,
  saveLineup,
  saveMatch,
  saveSettings,
  STORAGE_KEYS,
} from '../src/state/storage';
import { playingTimeAt, remainingAt } from '../src/state/time';
import { at, benchNames, deepFreeze, idOf, MemoryStorage, MIN, namedMatch, slotIdOf, T0 } from './helpers';

function run(match: Match, ...actions: Action[]): Match {
  return actions.reduce((m, a) => deepFreeze(reduce(m, a)), match);
}

/** A match in progress: clock running, one substitution, one player removed from court. */
function matchInProgress(): Match {
  let m = run(namedMatch(), { type: 'startClock', now: T0 });
  m = run(m, { type: 'dropOn', fromSlotId: slotIdOf(m, 'Lia'), target: { kind: 'slot', slotId: slotIdOf(m, 'Duda') }, now: T0 + 3 * MIN });
  m = run(m, { type: 'dropOn', fromSlotId: slotIdOf(m, 'Eva'), target: { kind: 'bench' }, now: T0 + 4 * MIN });
  m = run(m, { type: 'dropOn', fromSlotId: slotIdOf(m, 'Carla'), target: { kind: 'court', x: 0.33, y: 0.41 }, now: T0 + 4 * MIN });
  return run(m, { type: 'setColors', colors: { lineColor: '#ffffff' } });
}

describe('storage: futsal:match (task 4.1)', () => {
  it('save then load returns an equivalent match, including runningSince', () => {
    const storage = new MemoryStorage();
    const m = matchInProgress();
    saveMatch(m, storage);
    const loaded = loadMatch(storage);
    expect(loaded).toEqual(m);
    expect(loaded!.clock.runningSince).toBe(T0);
    expect(remainingAt(loaded!, T0 + 5 * MIN)).toBe(15 * MIN);
    expect(playingTimeAt(loaded!, idOf(m, 'Lia'), T0 + 5 * MIN)).toBe(2 * MIN);
  });

  it('Cronômetro rodando salvo: the stored JSON carries the start instant and format version', () => {
    const storage = new MemoryStorage();
    saveMatch(matchInProgress(), storage);
    const raw = JSON.parse(storage.getItem(STORAGE_KEYS.match)!);
    expect(raw).toMatchObject({ app: 'futsal-coach', kind: 'match', version: 1 });
    expect(raw.clock.runningSince).toBe(T0);
  });

  it('returns null when nothing is saved or the data is corrupt, and clearMatch removes it', () => {
    const storage = new MemoryStorage();
    expect(loadMatch(storage)).toBeNull();
    storage.setItem(STORAGE_KEYS.match, '{not json');
    expect(loadMatch(storage)).toBeNull();
    saveMatch(newMatch(), storage);
    clearMatch(storage);
    expect(loadMatch(storage)).toBeNull();
  });

  it('normalizes missing fields with defaults', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      STORAGE_KEYS.match,
      JSON.stringify({
        app: 'futsal-coach',
        kind: 'match',
        version: 1,
        roster: [{ id: 'a', name: 'Duda' }, { id: 'b', name: 'Lia' }, { id: 'c' }],
        slots: [{ id: 'court-PV', kind: 'court', position: 'PV', playerId: 'a' }, { id: 'x', kind: 'bench', playerId: 'b' }],
      }),
    );
    const m = loadMatch(storage)!;
    expect(m.slots.filter((s) => s.kind === 'court').map((s) => s.position)).toEqual(['GL', 'FX', 'AE', 'AD', 'PV']);
    expect(at(m, 'PV')).toBe('Duda');
    expect(at(m, 'GL')).toBeNull();
    // Unplaced player "c" goes to the bench so nobody is lost.
    expect(benchNames(m)).toEqual(['Lia', '']);
    expect(m.clock).toMatchObject({ periodMinutes: 20, period: 1, remainingMs: 20 * MIN, runningSince: null, finished: false });
    expect(m.settings).toEqual({ lineColor: DEFAULT_SETTINGS.lineColor, gkColor: DEFAULT_SETTINGS.gkColor, reserveColor: DEFAULT_SETTINGS.reserveColor });
    expect(m.kickoff).toBe(false);
    expect(m.roster.every((p) => p.role === null)).toBe(true);
    expect(m.playingTimeMs).toEqual({});
    expect(m.substitutions).toEqual([]);
  });

  it('repairs inconsistent references: unknown and duplicate players are dropped', () => {
    const r = parseImport(
      JSON.stringify({
        app: 'futsal-coach',
        kind: 'match',
        version: 1,
        roster: [{ id: 'a', name: 'Duda' }],
        slots: [
          { id: 'court-GL', kind: 'court', position: 'GL', playerId: 'a' },
          { id: 'court-FX', kind: 'court', position: 'FX', playerId: 'a' },
          { id: 'b1', kind: 'bench', playerId: 'ghost' },
        ],
        playingTimeMs: { a: 1000, ghost: 5000 },
      }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok || r.kind !== 'match') return;
    expect(at(r.match, 'GL')).toBe('Duda');
    expect(at(r.match, 'FX')).toBeNull();
    expect(benchNames(r.match)).toEqual([]);
    expect(r.match.playingTimeMs).toEqual({ a: 1000 });
  });
});

describe('storage: futsal:settings (task 4.1)', () => {
  it('returns defaults when empty and round-trips saved settings', () => {
    const storage = new MemoryStorage();
    expect(loadSettings(storage)).toEqual(DEFAULT_SETTINGS);
    saveSettings({ lineColor: '#ffeb3b', gkColor: '#e53935', reserveColor: '#7b1fa2', periodMinutes: 15 }, storage);
    expect(loadSettings(storage)).toEqual({ lineColor: '#ffeb3b', gkColor: '#e53935', reserveColor: '#7b1fa2', periodMinutes: 15 });
    expect(JSON.parse(storage.getItem(STORAGE_KEYS.settings)!).version).toBe(1);
  });

  it('normalizes invalid settings', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEYS.settings, JSON.stringify({ lineColor: 'red', periodMinutes: 500 }));
    expect(loadSettings(storage)).toEqual({ ...DEFAULT_SETTINGS, periodMinutes: 60 });
    storage.setItem(STORAGE_KEYS.settings, 'garbage');
    expect(loadSettings(storage)).toEqual(DEFAULT_SETTINGS);
  });

  it('a new match uses the saved settings (team-colors Cores persistem)', () => {
    const storage = new MemoryStorage();
    saveSettings({ lineColor: '#ffffff', gkColor: '#000000', reserveColor: '#123456', periodMinutes: 12 }, storage);
    const m = newMatch(undefined, loadSettings(storage));
    expect(m.settings).toEqual({ lineColor: '#ffffff', gkColor: '#000000', reserveColor: '#123456' });
    expect(m.clock.remainingMs).toBe(12 * MIN);
  });
});

describe('storage: export and import (task 4.2)', () => {
  it('round trip: an exported match imports back unchanged', () => {
    const m = matchInProgress();
    const json = exportMatch(m);
    expect(JSON.parse(json)).toMatchObject({ app: 'futsal-coach', kind: 'match', version: 1 });
    const r = parseImport(json);
    expect(r).toEqual({ ok: true, kind: 'match', match: m });
  });

  it('round trip: an exported lineup imports back with name, roster and slots', () => {
    const lineup = { version: 1, name: 'Sub-9 titular', roster: namedMatch().roster, slots: namedMatch().slots };
    const json = exportLineup(lineup);
    expect(JSON.parse(json)).toMatchObject({ app: 'futsal-coach', kind: 'lineup', version: 1, name: 'Sub-9 titular' });
    expect(parseImport(json)).toEqual({ ok: true, kind: 'lineup', lineup });
  });

  it('Arquivo inválido: non-JSON content is rejected with a pt-BR message', () => {
    expect(parseImport('isto não é json')).toEqual({ ok: false, error: IMPORT_ERRORS.invalidJson });
    expect(parseImport('')).toEqual({ ok: false, error: IMPORT_ERRORS.invalidJson });
    expect(IMPORT_ERRORS.invalidJson).toMatch(/JSON válido/);
  });

  it('Arquivo inválido: JSON without the app format is rejected', () => {
    const cases = [
      '[]',
      'null',
      '42',
      JSON.stringify({ hello: 'world' }),
      JSON.stringify({ app: 'outro-app', kind: 'match', version: 1, roster: [], slots: [] }),
      JSON.stringify({ app: 'futsal-coach', kind: 'placar', version: 1 }),
      JSON.stringify({ app: 'futsal-coach', kind: 'match', roster: [], slots: [] }),
      JSON.stringify({ app: 'futsal-coach', kind: 'match', version: 1 }),
      JSON.stringify({ app: 'futsal-coach', kind: 'lineup', version: 1, name: 'x', roster: 'no' }),
    ];
    for (const text of cases) expect(parseImport(text)).toEqual({ ok: false, error: IMPORT_ERRORS.unknownFormat });
    expect(IMPORT_ERRORS.unknownFormat).toMatch(/formato/);
  });

  it('Versão futura: version greater than supported is refused with a clear message', () => {
    const text = JSON.stringify({ ...JSON.parse(exportMatch(newMatch())), version: 2 });
    expect(parseImport(text)).toEqual({ ok: false, error: IMPORT_ERRORS.futureVersion });
    expect(IMPORT_ERRORS.futureVersion).toMatch(/versão mais nova/);
  });

  it('a failed import changes no data', () => {
    const storage = new MemoryStorage();
    const m = matchInProgress();
    saveMatch(m, storage);
    saveLineup('Sub-9 titular', m, storage);
    const before = storage.snapshot();
    for (const text of ['{', JSON.stringify({ app: 'x' }), JSON.stringify({ app: 'futsal-coach', kind: 'lineup', version: 9 })]) {
      const r = parseImport(text);
      expect(r.ok).toBe(false);
    }
    expect(storage.snapshot()).toEqual(before);
    expect(loadMatch(storage)).toEqual(m);
  });
});

describe('storage: substitution name snapshots (design.md D11)', () => {
  it('keeps saved names and fills missing ones from the roster', () => {
    const m = namedMatch();
    const duda = m.roster.find((p) => p.name === 'Duda')!.id;
    const file = {
      ...JSON.parse(exportMatch(m)),
      substitutions: [
        { period: 1, elapsedMs: 1000, outPlayerId: 'gone', inPlayerId: duda, outName: 'Zoe', inName: 'Duda antiga' },
        { period: 2, elapsedMs: 2000, outPlayerId: duda, inPlayerId: null },
      ],
    };
    const r = parseImport(JSON.stringify(file));
    if (!r.ok || r.kind !== 'match') throw new Error('import failed');
    expect(r.match.substitutions.map((s) => [s.outName, s.inName])).toEqual([
      ['Zoe', 'Duda antiga'],
      ['Duda', ''],
    ]);
  });
});

describe('storage: lineups and new match (task 4.3)', () => {
  it('Salvar escalação: "Sub-9 titular" appears in the saved list', () => {
    const storage = new MemoryStorage();
    saveLineup('Sub-9 titular', namedMatch(), storage);
    expect(listLineups(storage).map((l) => l.name)).toEqual(['Sub-9 titular']);
  });

  it('saving with an existing name replaces it, and empty names are refused', () => {
    const storage = new MemoryStorage();
    saveLineup('A', namedMatch(), storage);
    saveLineup(' A ', newMatch(), storage);
    expect(listLineups(storage)).toHaveLength(1);
    expect(listLineups(storage)[0]!.roster.every((p) => p.name === '')).toBe(true);
    expect(saveLineup('   ', newMatch(), storage)).toBeNull();
    expect(listLineups(storage)).toHaveLength(1);
  });

  it('Carregar escalação: roster, names and slots become the saved ones; times and history are zeroed', () => {
    const storage = new MemoryStorage();
    const saved = namedMatch();
    saveLineup('Sub-9 titular', saved, storage);
    const current = run(matchInProgress(), { type: 'pauseClock', now: T0 + 6 * MIN });
    const lineup = loadLineup('Sub-9 titular', storage)!;
    const next = run(current, { type: 'loadLineup', lineup });
    expect(next.roster).toEqual(saved.roster);
    expect(next.slots).toEqual(saved.slots);
    expect(next.playingTimeMs).toEqual({});
    expect(next.playingSince).toEqual({});
    expect(next.substitutions).toEqual([]);
    expect(next.clock).toMatchObject({ period: 1, remainingMs: 20 * MIN, runningSince: null });
    expect(next.settings).toEqual(current.settings);
    expect(loadLineup('nao existe', storage)).toBeNull();
  });

  it('Excluir escalação: removes it from the list without affecting the current match', () => {
    const storage = new MemoryStorage();
    const m = matchInProgress();
    saveMatch(m, storage);
    saveLineup('Sub-9 titular', m, storage);
    saveLineup('Reservas', namedMatch(), storage);
    deleteLineup('Sub-9 titular', storage);
    expect(listLineups(storage).map((l) => l.name)).toEqual(['Reservas']);
    expect(loadMatch(storage)).toEqual(m);
  });

  it('Importar escalação: an imported lineup is added to the list without changing the match', () => {
    const storage = new MemoryStorage();
    const m = matchInProgress();
    saveMatch(m, storage);
    const r = parseImport(exportLineup({ version: 1, name: 'Importada', roster: namedMatch().roster, slots: namedMatch().slots }));
    if (!r.ok || r.kind !== 'lineup') throw new Error('expected lineup');
    addLineup(r.lineup, storage);
    expect(listLineups(storage).map((l) => l.name)).toEqual(['Importada']);
    expect(loadMatch(storage)).toEqual(m);
  });

  it('Nova partida com mesmo elenco: names and slots kept, times 00:00, empty history, 1T with configured duration', () => {
    const m = run(matchInProgress(), { type: 'setDuration', minutes: 15 }, { type: 'setPeriod', period: 2, now: T0 + 6 * MIN });
    const next = run(m, { type: 'newMatch' });
    // Names kept; roles are cleared until the next kickoff (court-lineup "Nova partida zera os papéis").
    expect(next.roster).toEqual(m.roster.map((p) => ({ ...p, role: null })));
    expect(next.slots).toEqual(m.slots);
    for (const p of next.roster) expect(playingTimeAt(next, p.id, T0 + 10 * MIN)).toBe(0);
    expect(next.substitutions).toEqual([]);
    expect(next.clock).toMatchObject({ period: 1, periodMinutes: 15, remainingMs: 15 * MIN, runningSince: null, finished: false });
  });
});
