import { describe, expect, it } from 'vitest';
import { newMatch, type Match } from '../src/state/model';
import { reduce, type Action } from '../src/state/reducer';
import { exportMatch, parseImport } from '../src/state/storage';
import { playingTimeAt } from '../src/state/time';
import { at, benchNames, deepFreeze, idOf, MIN, namedMatch, slotIdOf, T0 } from './helpers';

function run(match: Match, ...actions: Action[]): Match {
  return actions.reduce((m, a) => deepFreeze(reduce(m, a)), match);
}

const swap = (m: Match, reserve: string, starter: string, now: number): Match =>
  run(m, { type: 'dropOn', fromSlotId: slotIdOf(m, reserve), target: { kind: 'slot', slotId: slotIdOf(m, starter) }, now });

const POS = ['GL', 'FX', 'AE', 'AD', 'PV'] as const;
const courtNames = (m: Match) => POS.map((p) => at(m, p));
const KICKOFF = ['Ana', 'Carla', 'Bia', 'Eva', 'Duda'];

/** Bench slots always hold a player, and every player is in exactly one slot. */
function expectSlotInvariant(m: Match): void {
  expect(m.slots.filter((s) => s.kind === 'bench').every((s) => s.playerId !== null)).toBe(true);
  const placed = m.slots.map((s) => s.playerId).filter((id): id is string => id !== null);
  expect(new Set(placed).size).toBe(placed.length);
  expect([...placed].sort()).toEqual(m.roster.map((p) => p.id).sort());
  expect(new Set(m.slots.map((s) => s.id)).size).toBe(m.slots.length);
}

describe('court-lineup: Escalação do apito guardada (task 1.1)', () => {
  it('a new match has an empty kickoff lineup', () => {
    expect(newMatch().kickoffCourt).toEqual({});
  });

  it('Guardar no apito: the first start records the player of every court slot', () => {
    const m = run(namedMatch(), { type: 'startClock', now: T0 });
    expect(m.kickoffCourt).toEqual({
      'court-GL': idOf(m, 'Ana'),
      'court-FX': idOf(m, 'Carla'),
      'court-AE': idOf(m, 'Bia'),
      'court-AD': idOf(m, 'Eva'),
      'court-PV': idOf(m, 'Duda'),
    });
  });

  it('an empty court slot at kickoff is not recorded', () => {
    const m = run(
      namedMatch(),
      { type: 'dropOn', fromSlotId: 'court-AD', target: { kind: 'bench' }, now: T0 },
      { type: 'startClock', now: T0 },
    );
    expect(Object.keys(m.kickoffCourt).sort()).toEqual(['court-AE', 'court-FX', 'court-GL', 'court-PV']);
  });

  it('Trocas não alteram: substitutions, pauses and later starts keep the recorded lineup', () => {
    let m = run(namedMatch(), { type: 'startClock', now: T0 });
    const recorded = m.kickoffCourt;
    m = swap(m, 'Lia', 'Duda', T0 + MIN);
    m = run(
      m,
      { type: 'dropOn', fromSlotId: slotIdOf(m, 'Eva'), target: { kind: 'bench' }, now: T0 + 2 * MIN },
      { type: 'pauseClock', now: T0 + 3 * MIN },
      { type: 'setPeriod', period: 2, now: T0 + 3 * MIN },
      { type: 'startClock', now: T0 + 4 * MIN },
    );
    expect(m.kickoffCourt).toEqual(recorded);
  });

  it('loadLineup clears the kickoff lineup', () => {
    const m = run(namedMatch(), { type: 'startClock', now: T0 });
    const next = run(m, { type: 'loadLineup', lineup: { version: 1, name: 'x', roster: m.roster, slots: m.slots } });
    expect(next.kickoffCourt).toEqual({});
  });

  it('round-trips through export and import', () => {
    const m = swap(run(namedMatch(), { type: 'startClock', now: T0 }), 'Lia', 'Duda', T0 + MIN);
    const r = parseImport(exportMatch(m));
    if (!r.ok || r.kind !== 'match') throw new Error('expected match');
    expect(r.match.kickoffCourt).toEqual(m.kickoffCourt);
  });

  it('a saved match without the field loads with an empty kickoff lineup', () => {
    const m = run(namedMatch(), { type: 'startClock', now: T0 });
    const file = JSON.parse(exportMatch(m)) as Record<string, unknown>;
    delete file.kickoffCourt;
    const r = parseImport(JSON.stringify(file));
    if (!r.ok || r.kind !== 'match') throw new Error('expected match');
    expect(r.match.kickoffCourt).toEqual({});
    expect(r.match.kickoff).toBe(true);
  });

  it('invalid entries are dropped on load: unknown slot, bench slot, unknown player, non-string, duplicate player', () => {
    const m = run(namedMatch(), { type: 'startClock', now: T0 });
    const file = JSON.parse(exportMatch(m)) as Record<string, unknown>;
    file.kickoffCourt = {
      'court-GL': idOf(m, 'Ana'),
      'court-FX': 'p999',
      'court-XX': idOf(m, 'Bia'),
      'bench-1': idOf(m, 'Lia'),
      'court-AE': 7,
      'court-AD': idOf(m, 'Ana'),
      'court-PV': idOf(m, 'Duda'),
    };
    const r = parseImport(JSON.stringify(file));
    if (!r.ok || r.kind !== 'match') throw new Error('expected match');
    expect(r.match.kickoffCourt).toEqual({ 'court-GL': idOf(m, 'Ana'), 'court-PV': idOf(m, 'Duda') });
  });

  it('a match without kickoff loads with an empty kickoff lineup even if the file has entries', () => {
    const m = namedMatch();
    const file = JSON.parse(exportMatch(m)) as Record<string, unknown>;
    file.kickoffCourt = { 'court-GL': idOf(m, 'Ana') };
    const r = parseImport(JSON.stringify(file));
    if (!r.ok || r.kind !== 'match') throw new Error('expected match');
    expect(r.match.kickoffCourt).toEqual({});
  });
});

describe('match-persistence: Reiniciar partida pelo menu (task 1.2)', () => {
  it('Reiniciar após o jogo: Duda back at PV, Lia on the bench, names kept, everything zeroed', () => {
    let m = run(namedMatch(), { type: 'startClock', now: T0 });
    m = swap(m, 'Lia', 'Duda', T0 + 3 * MIN);
    m = run(m, { type: 'pauseClock', now: T0 + 5 * MIN });
    expect(at(m, 'PV')).toBe('Lia');
    const next = run(m, { type: 'newMatch' });
    expect(at(next, 'PV')).toBe('Duda');
    expect(courtNames(next)).toEqual(KICKOFF);
    expect(benchNames(next)).toEqual(['Mia', 'Nina', 'Olga', 'Lia']);
    expect(next.roster.map((p) => p.name)).toEqual(m.roster.map((p) => p.name));
    for (const p of next.roster) expect(playingTimeAt(next, p.id, T0 + 10 * MIN)).toBe(0);
    expect(next.playingSince).toEqual({});
    expect(next.substitutions).toEqual([]);
    expect(next.roster.every((p) => p.role === null)).toBe(true);
    expect(next.kickoff).toBe(false);
    expect(next.kickoffCourt).toEqual({});
    expect(next.clock).toMatchObject({ period: 1, remainingMs: 20 * MIN, periodLengthMs: 20 * MIN, runningSince: null, finished: false });
    expectSlotInvariant(next);
  });

  it('works while the clock is running, and keeps the configured duration', () => {
    let m = run(namedMatch(), { type: 'setDuration', minutes: 15 }, { type: 'startClock', now: T0 });
    m = swap(m, 'Lia', 'Duda', T0 + MIN);
    const next = run(m, { type: 'newMatch' });
    expect(next.clock).toMatchObject({ period: 1, periodMinutes: 15, remainingMs: 15 * MIN, runningSince: null });
    expect(next.playingSince).toEqual({});
    expect(at(next, 'PV')).toBe('Duda');
  });

  it('court-to-court swaps and moves are undone in occupants; slot coordinates are kept', () => {
    let m = run(namedMatch(), { type: 'startClock', now: T0 });
    m = run(
      m,
      { type: 'dropOn', fromSlotId: 'court-FX', target: { kind: 'slot', slotId: 'court-PV' }, now: T0 + MIN },
      { type: 'dropOn', fromSlotId: 'court-AE', target: { kind: 'court', x: 0.4, y: 0.3 }, now: T0 + MIN },
    );
    expect(at(m, 'PV')).toBe('Carla');
    const next = run(m, { type: 'newMatch' });
    expect(courtNames(next)).toEqual(KICKOFF);
    expect(next.slots.find((s) => s.id === 'court-AE')).toMatchObject({ x: 0.4, y: 0.3 });
  });

  it('a starter who left to the bench comes back; an empty position is refilled; bench slots match the players off court', () => {
    let m = run(namedMatch(), { type: 'startClock', now: T0 });
    m = run(m, { type: 'dropOn', fromSlotId: slotIdOf(m, 'Eva'), target: { kind: 'bench' }, now: T0 + MIN });
    m = swap(m, 'Lia', 'Duda', T0 + 2 * MIN);
    expect(at(m, 'AD')).toBeNull();
    expect(m.slots.filter((s) => s.kind === 'bench')).toHaveLength(5);
    const next = run(m, { type: 'newMatch' });
    expect(courtNames(next)).toEqual(KICKOFF);
    expect(benchNames(next)).toEqual(['Mia', 'Nina', 'Olga', 'Lia']);
    expect(next.slots.filter((s) => s.kind === 'bench')).toHaveLength(4);
    expectSlotInvariant(next);
  });

  it('a reserve who entered an empty position goes back to the bench, at the end', () => {
    let m = run(namedMatch(), { type: 'startClock', now: T0 });
    m = run(m, { type: 'dropOn', fromSlotId: slotIdOf(m, 'Eva'), target: { kind: 'bench' }, now: T0 + MIN });
    m = run(m, { type: 'dropOn', fromSlotId: slotIdOf(m, 'Nina'), target: { kind: 'slot', slotId: 'court-AD' }, now: T0 + 2 * MIN });
    const next = run(m, { type: 'newMatch' });
    expect(courtNames(next)).toEqual(KICKOFF);
    expect(benchNames(next)).toEqual(['Lia', 'Mia', 'Olga', 'Nina']);
    expectSlotInvariant(next);
  });

  it('reserves added after kickoff stay on the bench', () => {
    let m = run(namedMatch(), { type: 'startClock', now: T0 }, { type: 'addReserve' });
    const newId = m.roster.at(-1)!.id;
    m = run(m, { type: 'setName', playerId: newId, name: 'Rita' });
    m = swap(m, 'Rita', 'Bia', T0 + MIN);
    const next = run(m, { type: 'newMatch' });
    expect(courtNames(next)).toEqual(KICKOFF);
    expect(benchNames(next)).toEqual(['Lia', 'Mia', 'Nina', 'Olga', 'Rita']);
    expectSlotInvariant(next);
  });

  it('Reiniciar antes do apito: slots stay as they are, names kept, clock, times and history zeroed', () => {
    let m = swap(namedMatch(), 'Lia', 'Duda', T0);
    m = run(m, { type: 'dropOn', fromSlotId: 'court-AE', target: { kind: 'court', x: 0.5, y: 0.3 }, now: T0 });
    m = run(m, { type: 'setPeriod', period: 2, now: T0 });
    const next = run(m, { type: 'newMatch' });
    expect(next.slots).toEqual(m.slots);
    expect(next.roster).toEqual(m.roster);
    expect(next.clock).toMatchObject({ period: 1, remainingMs: 20 * MIN, runningSince: null });
    expect(next.substitutions).toEqual([]);
    expect(next.playingTimeMs).toEqual({});
  });

  it('Reserva excluída após o apito: the slot of a deleted kickoff starter stays empty, the others come back', () => {
    let m = run(namedMatch(), { type: 'startClock', now: T0 });
    m = swap(m, 'Lia', 'Duda', T0 + MIN);
    // Duda is now on the bench; delete her.
    m = run(m, { type: 'removeReserve', slotId: slotIdOf(m, 'Duda') });
    expect(m.roster.some((p) => p.name === 'Duda')).toBe(false);
    const next = run(m, { type: 'newMatch' });
    expect(courtNames(next)).toEqual(['Ana', 'Carla', 'Bia', 'Eva', null]);
    expect(benchNames(next)).toEqual(['Mia', 'Nina', 'Olga', 'Lia']);
    expectSlotInvariant(next);
  });

  it('a kickoff lineup loaded from an old file without the field behaves like before kickoff (slots kept)', () => {
    let m = run(namedMatch(), { type: 'startClock', now: T0 });
    m = swap(m, 'Lia', 'Duda', T0 + MIN);
    const file = JSON.parse(exportMatch(m)) as Record<string, unknown>;
    delete file.kickoffCourt;
    const r = parseImport(JSON.stringify(file));
    if (!r.ok || r.kind !== 'match') throw new Error('expected match');
    const next = run(r.match, { type: 'newMatch' });
    expect(next.slots).toEqual(r.match.slots);
    expect(next.substitutions).toEqual([]);
  });
});
