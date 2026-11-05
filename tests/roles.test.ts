import { describe, expect, it } from 'vitest';
import { DEFAULT_COLORS, newMatch, type Match } from '../src/state/model';
import { reduce, type Action } from '../src/state/reducer';
import { exportMatch, loadSettings, parseImport, saveLineup, loadLineup, STORAGE_KEYS } from '../src/state/storage';
import { deepFreeze, idOf, MemoryStorage, MIN, namedMatch, slotIdOf, T0 } from './helpers';

function run(match: Match, ...actions: Action[]): Match {
  return actions.reduce((m, a) => deepFreeze(reduce(m, a)), match);
}

const roleOf = (m: Match, name: string) => m.roster.find((p) => p.id === idOf(m, name))!.role;
const swap = (m: Match, reserve: string, starter: string, now = T0): Match =>
  run(m, { type: 'dropOn', fromSlotId: slotIdOf(m, reserve), target: { kind: 'slot', slotId: slotIdOf(m, starter) }, now });

describe('model: roles and colours in a new match (task 1.1)', () => {
  it('a new match has no kickoff, every role null and the three default colours', () => {
    const m = newMatch();
    expect(m.kickoff).toBe(false);
    expect(m.roster.every((p) => p.role === null)).toBe(true);
    expect(m.settings).toEqual({ lineColor: '#1e88e5', gkColor: '#fdd835', reserveColor: '#b39ddb' });
    expect(DEFAULT_COLORS.reserveColor).toBe('#b39ddb');
  });

  it('addReserve before kickoff creates a player without a role', () => {
    const m = run(namedMatch(), { type: 'addReserve' });
    expect(m.roster.at(-1)!.role).toBeNull();
  });
});

describe('court-lineup: Papel de titular ou reserva (task 1.2)', () => {
  it('Congelar no apito inicial: Duda on court becomes starter, Lia on the bench reserve; later changes keep them', () => {
    let m = run(namedMatch(), { type: 'startClock', now: T0 });
    expect(m.kickoff).toBe(true);
    expect(roleOf(m, 'Duda')).toBe('starter');
    expect(roleOf(m, 'Lia')).toBe('reserve');
    expect(m.roster.filter((p) => p.role === 'starter')).toHaveLength(5);
    expect(m.roster.filter((p) => p.role === 'reserve')).toHaveLength(4);
    m = swap(m, 'Lia', 'Duda', T0 + MIN);
    m = run(m, { type: 'dropOn', fromSlotId: slotIdOf(m, 'Eva'), target: { kind: 'bench' }, now: T0 + 2 * MIN });
    m = run(m, { type: 'pauseClock', now: T0 + 3 * MIN }, { type: 'startClock', now: T0 + 4 * MIN });
    expect(roleOf(m, 'Duda')).toBe('starter');
    expect(roleOf(m, 'Eva')).toBe('starter');
    expect(roleOf(m, 'Lia')).toBe('reserve');
  });

  it('places at the first start decide: a reserve moved to court before kickoff becomes a starter', () => {
    let m = swap(namedMatch(), 'Lia', 'Duda');
    m = run(m, { type: 'startClock', now: T0 });
    expect(roleOf(m, 'Lia')).toBe('starter');
    expect(roleOf(m, 'Duda')).toBe('reserve');
  });

  it('Reserva que entra mantém o papel: after kickoff Lia stays reserve on court and Duda starter on the bench', () => {
    let m = run(namedMatch(), { type: 'startClock', now: T0 });
    m = swap(m, 'Lia', 'Duda', T0 + MIN);
    expect(m.slots.find((s) => s.playerId === idOf(m, 'Lia'))!.kind).toBe('court');
    expect(roleOf(m, 'Lia')).toBe('reserve');
    expect(m.slots.find((s) => s.playerId === idOf(m, 'Duda'))!.kind).toBe('bench');
    expect(roleOf(m, 'Duda')).toBe('starter');
  });

  it('Trocar de período não altera: setPeriod and resetClock keep the frozen roles and the kickoff', () => {
    let m = run(namedMatch(), { type: 'startClock', now: T0 });
    m = swap(m, 'Lia', 'Duda', T0 + MIN);
    const roles = m.roster.map((p) => p.role);
    m = run(m, { type: 'setPeriod', period: 2, now: T0 + 2 * MIN });
    expect(m.kickoff).toBe(true);
    expect(m.roster.map((p) => p.role)).toEqual(roles);
    m = run(m, { type: 'startClock', now: T0 + 3 * MIN }, { type: 'resetClock', now: T0 + 4 * MIN }, { type: 'startClock', now: T0 + 5 * MIN });
    expect(m.roster.map((p) => p.role)).toEqual(roles);
  });

  it('addReserve after kickoff creates a reserve', () => {
    const m = run(namedMatch(), { type: 'startClock', now: T0 }, { type: 'addReserve' });
    expect(m.roster.at(-1)!.role).toBe('reserve');
  });
});

describe('court-lineup: Nova partida zera os papéis (task 1.3)', () => {
  const played = (): Match => swap(run(namedMatch(), { type: 'startClock', now: T0 }), 'Lia', 'Duda', T0 + MIN);

  it('newMatch clears kickoff and roles, and the next start freezes them from the current places', () => {
    let m = run(played(), { type: 'newMatch' });
    expect(m.kickoff).toBe(false);
    expect(m.roster.every((p) => p.role === null)).toBe(true);
    m = run(m, { type: 'startClock', now: T0 + 10 * MIN });
    expect(roleOf(m, 'Lia')).toBe('starter');
    expect(roleOf(m, 'Duda')).toBe('reserve');
  });

  it('loadLineup clears kickoff and roles', () => {
    const storage = new MemoryStorage();
    const lineup = saveLineup('Sub-9', played(), storage)!;
    expect(lineup.roster.every((p) => p.role === null)).toBe(true);
    const m = run(played(), { type: 'loadLineup', lineup: loadLineup('Sub-9', storage)! });
    expect(m.kickoff).toBe(false);
    expect(m.roster.every((p) => p.role === null)).toBe(true);
  });
});

describe('substitutions: Histórico only after kickoff (task 2.1)', () => {
  it('Troca antes do apito não registra: swap, removal and entry before the first start add no entry', () => {
    let m = swap(namedMatch(), 'Lia', 'Duda');
    m = run(m, { type: 'dropOn', fromSlotId: slotIdOf(m, 'Eva'), target: { kind: 'bench' }, now: T0 });
    m = run(m, { type: 'dropOn', fromSlotId: slotIdOf(m, 'Mia'), target: { kind: 'court', x: 0.5, y: 0.5 }, now: T0 });
    expect(m.slots.find((s) => s.position === 'AD')!.playerId).toBe(idOf(m, 'Mia'));
    expect(m.substitutions).toEqual([]);
  });

  it('Troca com o relógio pausado após o apito registra, with the elapsed time at the pause', () => {
    let m = run(namedMatch(), { type: 'startClock', now: T0 }, { type: 'pauseClock', now: T0 + 2 * MIN + 5_000 });
    m = swap(m, 'Lia', 'Duda', T0 + 9 * MIN);
    expect(m.substitutions).toEqual([
      { period: 1, elapsedMs: 2 * MIN + 5_000, outPlayerId: idOf(m, 'Duda'), inPlayerId: idOf(m, 'Lia'), outName: 'Duda', inName: 'Lia' },
    ]);
  });

  it('after reset to a full stopped period the kickoff still holds, so changes keep recording', () => {
    let m = run(namedMatch(), { type: 'startClock', now: T0 }, { type: 'resetClock', now: T0 + MIN });
    m = swap(m, 'Lia', 'Duda', T0 + 2 * MIN);
    expect(m.substitutions).toHaveLength(1);
    expect(m.substitutions[0]!.elapsedMs).toBe(0);
  });
});

describe('compatibility: roles, kickoff and reserve colour (task 3.1)', () => {
  const legacy = (extra: Record<string, unknown>): string =>
    JSON.stringify({
      app: 'futsal-coach',
      kind: 'match',
      version: 1,
      roster: [{ id: 'a', name: 'Duda' }, { id: 'b', name: 'Lia' }],
      slots: [{ id: 'court-PV', kind: 'court', position: 'PV', playerId: 'a' }, { id: 'bench-1', kind: 'bench', playerId: 'b' }],
      settings: { lineColor: '#ff0000', gkColor: '#00ff00' },
      ...extra,
    });

  const parseMatch = (text: string): Match => {
    const r = parseImport(text);
    if (!r.ok || r.kind !== 'match') throw new Error('expected match');
    return r.match;
  };

  it('Partida salva sem papéis, relógio já iniciado: each player gets the role of the current place', () => {
    const paused = parseMatch(legacy({ clock: { periodMinutes: 20, period: 1, remainingMs: 15 * MIN, runningSince: null, periodLengthMs: 20 * MIN, finished: false } }));
    expect(paused.kickoff).toBe(true);
    expect(paused.roster.map((p) => p.role)).toEqual(['starter', 'reserve']);
    const running = parseMatch(legacy({ clock: { periodMinutes: 20, period: 1, remainingMs: 20 * MIN, runningSince: T0, periodLengthMs: 20 * MIN, finished: false } }));
    expect(running.kickoff).toBe(true);
    const withHistory = parseMatch(legacy({ substitutions: [{ period: 1, elapsedMs: 0, outPlayerId: null, inPlayerId: 'a' }] }));
    expect(withHistory.kickoff).toBe(true);
    const withTime = parseMatch(legacy({ playingTimeMs: { a: 1000 } }));
    expect(withTime.kickoff).toBe(true);
    expect(withTime.roster.map((p) => p.role)).toEqual(['starter', 'reserve']);
  });

  it('Partida salva sem papéis, relógio nunca iniciado: no kickoff and no fixed roles', () => {
    const m = parseMatch(legacy({}));
    expect(m.kickoff).toBe(false);
    expect(m.roster.every((p) => p.role === null)).toBe(true);
  });

  it('a saved match with colours but no reserve colour gets the light purple default and keeps the others', () => {
    expect(parseMatch(legacy({})).settings).toEqual({ lineColor: '#ff0000', gkColor: '#00ff00', reserveColor: '#b39ddb' });
  });

  it('Configuração salva sem cor de reservas: uses the default reserve colour and keeps the other two', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEYS.settings, JSON.stringify({ version: 1, lineColor: '#ff0000', gkColor: '#00ff00', periodMinutes: 15 }));
    expect(loadSettings(storage)).toEqual({ lineColor: '#ff0000', gkColor: '#00ff00', reserveColor: '#b39ddb', periodMinutes: 15 });
    storage.setItem(STORAGE_KEYS.settings, JSON.stringify({ version: 1, lineColor: '#ff0000', gkColor: '#00ff00', reserveColor: 'purple' }));
    expect(loadSettings(storage).reserveColor).toBe('#b39ddb');
  });

  it('export and import round-trip keeps kickoff, roles and the three colours', () => {
    let m = run(namedMatch(), { type: 'startClock', now: T0 });
    m = swap(m, 'Lia', 'Duda', T0 + MIN);
    m = run(m, { type: 'pauseClock', now: T0 + 2 * MIN }, { type: 'setColors', colors: { reserveColor: '#7b1fa2' } });
    const back = parseMatch(exportMatch(m));
    expect(back).toEqual(m);
    expect(back.kickoff).toBe(true);
    expect(roleOf(back, 'Lia')).toBe('reserve');
    expect(roleOf(back, 'Duda')).toBe('starter');
    expect(back.settings.reserveColor).toBe('#7b1fa2');
  });

  it('an explicit kickoff false wins over the inference and clears stray roles', () => {
    const m = parseMatch(
      legacy({ kickoff: false, playingTimeMs: { a: 1000 }, roster: [{ id: 'a', name: 'Duda', role: 'reserve' }, { id: 'b', name: 'Lia' }] }),
    );
    expect(m.kickoff).toBe(false);
    expect(m.roster.every((p) => p.role === null)).toBe(true);
  });

  it('an imported lineup carries no roles', () => {
    const r = parseImport(
      JSON.stringify({ app: 'futsal-coach', kind: 'lineup', version: 1, name: 'X', roster: [{ id: 'a', name: 'Duda', role: 'starter' }], slots: [] }),
    );
    if (!r.ok || r.kind !== 'lineup') throw new Error('expected lineup');
    expect(r.lineup.roster[0]!.role).toBeNull();
  });
});
