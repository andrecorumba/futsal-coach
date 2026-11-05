import { describe, expect, it } from 'vitest';
import { defaultLineup, newMatch, POSITIONS, type Match } from '../src/state/model';
import { reduce, type Action } from '../src/state/reducer';
import { at, benchNames, courtCount, deepFreeze, idOf, MIN, namedMatch, slotIdOf, T0 } from './helpers';

function run(match: Match, ...actions: Action[]): Match {
  return actions.reduce((m, a) => deepFreeze(reduce(m, a)), match);
}

describe('model: newMatch (task 2.1)', () => {
  it('has 5 court slots, 4 bench slots, 9 unnamed players and a stopped 20 minute clock', () => {
    const m = newMatch(defaultLineup());
    const court = m.slots.filter((s) => s.kind === 'court');
    const bench = m.slots.filter((s) => s.kind === 'bench');
    expect(court.map((s) => s.position)).toEqual([...POSITIONS]);
    expect(court.every((s) => s.playerId !== null)).toBe(true);
    expect(bench).toHaveLength(4);
    expect(m.roster).toHaveLength(9);
    expect(m.roster.every((p) => p.name === '')).toBe(true);
    expect(m.clock).toMatchObject({ periodMinutes: 20, period: 1, remainingMs: 20 * MIN, runningSince: null, finished: false });
    expect(m.playingTimeMs).toEqual({});
    expect(m.substitutions).toEqual([]);
  });

  it('places court slots inside the court with normalized coordinates and every player in one slot', () => {
    const m = newMatch();
    for (const s of m.slots.filter((x) => x.kind === 'court')) {
      expect(s.x).toBeGreaterThan(0);
      expect(s.x).toBeLessThan(1);
      expect(s.y).toBeGreaterThan(0);
      expect(s.y).toBeLessThan(1);
    }
    const placed = m.slots.map((s) => s.playerId);
    expect(new Set(placed).size).toBe(9);
    expect(m.roster.every((p) => placed.includes(p.id))).toBe(true);
  });
});

describe('court-lineup: Edição do nome por toque (task 2.2)', () => {
  it('Nomear jogadora: setName stores the name shown below the token', () => {
    const m = deepFreeze(newMatch());
    const pv = m.slots.find((s) => s.position === 'PV')!;
    const next = run(m, { type: 'setName', playerId: pv.playerId!, name: 'Duda' });
    expect(at(next, 'PV')).toBe('Duda');
  });

  it('Cancelar edição: without a confirmed setName the previous name is unchanged', () => {
    const m = namedMatch();
    // Cancelling dispatches nothing; confirming the same text is a no-op that keeps the reference.
    expect(reduce(m, { type: 'setName', playerId: idOf(m, 'Duda'), name: 'Duda' })).toBe(m);
    expect(at(m, 'PV')).toBe('Duda');
  });

  it('trims names and ignores unknown players', () => {
    const m = deepFreeze(newMatch());
    const id = m.roster[0]!.id;
    expect(run(m, { type: 'setName', playerId: id, name: '  Lia  ' }).roster[0]!.name).toBe('Lia');
    expect(reduce(m, { type: 'setName', playerId: 'nope', name: 'X' })).toBe(m);
  });
});

describe('court-lineup: Incluir e excluir reservas (task 2.2)', () => {
  it('Adicionar reserva: a new unnamed token appears on the bench', () => {
    const m = namedMatch();
    const next = run(m, { type: 'addReserve' });
    expect(benchNames(next)).toEqual([...benchNames(m), '']);
    expect(next.roster).toHaveLength(m.roster.length + 1);
    const ids = next.slots.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('Excluir reserva: removes the bench token and its data from the roster', () => {
    let m = namedMatch();
    const liaId = idOf(m, 'Lia');
    m = run(m, { type: 'removeReserve', slotId: slotIdOf(m, 'Lia') });
    expect(benchNames(m)).toEqual(['Mia', 'Nina', 'Olga']);
    expect(m.roster.some((p) => p.id === liaId)).toBe(false);
    expect(m.playingTimeMs[liaId]).toBeUndefined();
  });

  it('Tentar excluir titular: removing a court slot is refused', () => {
    const m = namedMatch();
    expect(reduce(m, { type: 'removeReserve', slotId: slotIdOf(m, 'Duda') })).toBe(m);
  });

  it('generates unique ids after removals and additions', () => {
    const m = namedMatch();
    const next = run(m, { type: 'removeReserve', slotId: slotIdOf(m, 'Olga') }, { type: 'addReserve' }, { type: 'addReserve' });
    const pids = next.roster.map((p) => p.id);
    const sids = next.slots.map((s) => s.id);
    expect(new Set(pids).size).toBe(pids.length);
    expect(new Set(sids).size).toBe(sids.length);
  });
});

describe('substitutions: dropOn (task 2.3)', () => {
  const drop = (m: Match, name: string, target: Extract<Action, { type: 'dropOn' }>['target'], now = T0): Match =>
    deepFreeze(reduce(m, { type: 'dropOn', fromSlotId: slotIdOf(m, name), target, now }));

  it('Substituição simples: Lia (bench) onto Duda (PV) swaps them', () => {
    const m = namedMatch();
    const liaBench = slotIdOf(m, 'Lia');
    const next = drop(m, 'Lia', { kind: 'slot', slotId: slotIdOf(m, 'Duda') });
    expect(at(next, 'PV')).toBe('Lia');
    expect(slotIdOf(next, 'Duda')).toBe(liaBench);
  });

  it('Quadra permanece com cinco: a swap keeps the court count', () => {
    const m = namedMatch();
    const next = drop(m, 'Lia', { kind: 'slot', slotId: slotIdOf(m, 'Duda') });
    expect(courtCount(next)).toBe(courtCount(m));
    expect(courtCount(next)).toBe(5);
  });

  it('Retirar sem substituir: Eva (AD) dropped on the bench leaves AD empty', () => {
    const m = namedMatch();
    const next = drop(m, 'Eva', { kind: 'bench' });
    expect(benchNames(next)).toContain('Eva');
    expect(at(next, 'AD')).toBeNull();
    expect(courtCount(next)).toBe(4);
  });

  it('Vaga vazia continua visível: the empty court slot keeps its position', () => {
    const next = drop(namedMatch(), 'Eva', { kind: 'bench' });
    const ad = next.slots.find((s) => s.position === 'AD');
    expect(ad).toMatchObject({ kind: 'court', position: 'AD', playerId: null });
    expect(next.slots.filter((s) => s.kind === 'court')).toHaveLength(5);
  });

  it('Ajustar posicionamento tático: Carla (FX) moved to a free spot changes only her coordinates', () => {
    const m = namedMatch();
    const next = drop(m, 'Carla', { kind: 'court', x: 0.4, y: 0.3 });
    const fx = next.slots.find((s) => s.position === 'FX')!;
    expect(fx).toMatchObject({ x: 0.4, y: 0.3, position: 'FX', playerId: idOf(m, 'Carla') });
    expect(next.slots.filter((s) => s.id !== fx.id)).toEqual(m.slots.filter((s) => s.id !== fx.id));
  });

  it('Titular solta sobre outra titular: two court players swap positions', () => {
    const m = namedMatch();
    const next = drop(m, 'Carla', { kind: 'slot', slotId: slotIdOf(m, 'Duda') });
    expect(at(next, 'PV')).toBe('Carla');
    expect(at(next, 'FX')).toBe('Duda');
    expect(next.substitutions).toEqual([]);
  });

  it('Soltar sobre o cronômetro: an invalid target returns the same state', () => {
    const m = namedMatch();
    expect(reduce(m, { type: 'dropOn', fromSlotId: slotIdOf(m, 'Duda'), target: { kind: 'none' }, now: T0 })).toBe(m);
    expect(reduce(m, { type: 'dropOn', fromSlotId: slotIdOf(m, 'Lia'), target: { kind: 'none' }, now: T0 })).toBe(m);
  });

  it('Quadra cheia (court-lineup Limite de cinco): a reserve dropped on free court space with 5 on court is refused', () => {
    const m = namedMatch();
    expect(reduce(m, { type: 'dropOn', fromSlotId: slotIdOf(m, 'Lia'), target: { kind: 'court', x: 0.5, y: 0.5 }, now: T0 })).toBe(m);
  });

  it('Quadra com vaga livre (court-lineup Limite de cinco): a reserve dropped on free court space fills the empty slot', () => {
    const m = drop(namedMatch(), 'Eva', { kind: 'bench' });
    const next = drop(m, 'Lia', { kind: 'court', x: 0.5, y: 0.5 });
    expect(at(next, 'AD')).toBe('Lia');
    expect(courtCount(next)).toBe(5);
    expect(benchNames(next)).not.toContain('Lia');
  });

  it('a reserve dropped on an empty position marker enters that position', () => {
    const m = drop(namedMatch(), 'Eva', { kind: 'bench' });
    const ad = m.slots.find((s) => s.position === 'AD')!;
    const next = drop(m, 'Mia', { kind: 'slot', slotId: ad.id });
    expect(at(next, 'AD')).toBe('Mia');
    expect(benchNames(next)).toEqual(['Lia', 'Nina', 'Olga', 'Eva']);
  });

  it('a court player dropped onto a bench player swaps them', () => {
    const m = namedMatch();
    const next = drop(m, 'Duda', { kind: 'slot', slotId: slotIdOf(m, 'Lia') });
    expect(at(next, 'PV')).toBe('Lia');
    expect(benchNames(next)).toContain('Duda');
  });

  it('bench to bench, bench to bench area and drops from an empty slot change nothing', () => {
    const m = namedMatch();
    expect(reduce(m, { type: 'dropOn', fromSlotId: slotIdOf(m, 'Lia'), target: { kind: 'slot', slotId: slotIdOf(m, 'Mia') }, now: T0 })).toBe(m);
    expect(reduce(m, { type: 'dropOn', fromSlotId: slotIdOf(m, 'Lia'), target: { kind: 'bench' }, now: T0 })).toBe(m);
    const empty = drop(m, 'Eva', { kind: 'bench' });
    const ad = empty.slots.find((s) => s.position === 'AD')!;
    expect(reduce(empty, { type: 'dropOn', fromSlotId: ad.id, target: { kind: 'bench' }, now: T0 })).toBe(empty);
  });

  it('never has more than 5 players on court after any sequence of drops', () => {
    let m = namedMatch();
    m = drop(m, 'Eva', { kind: 'bench' });
    m = drop(m, 'Lia', { kind: 'court', x: 0.5, y: 0.5 });
    m = drop(m, 'Mia', { kind: 'court', x: 0.5, y: 0.5 });
    m = drop(m, 'Nina', { kind: 'slot', slotId: slotIdOf(m, 'Duda') });
    expect(courtCount(m)).toBe(5);
    expect(m.slots.filter((s) => s.kind === 'court')).toHaveLength(5);
    expect(m.slots.filter((s) => s.kind === 'bench').every((s) => s.playerId !== null)).toBe(true);
  });
});

describe('substitutions: Histórico de substituições (task 2.4)', () => {
  it('Registro de troca: Lia in for Duda at 07:20 of 1T', () => {
    let m = run(namedMatch(), { type: 'startClock', now: T0 });
    const now = T0 + 7 * MIN + 20_000;
    m = run(m, { type: 'dropOn', fromSlotId: slotIdOf(m, 'Lia'), target: { kind: 'slot', slotId: slotIdOf(m, 'Duda') }, now });
    expect(m.substitutions).toEqual([{ period: 1, elapsedMs: 440_000, outPlayerId: idOf(m, 'Duda'), inPlayerId: idOf(m, 'Lia'), outName: 'Duda', inName: 'Lia' }]);
  });

  it('Registro de retirada: Eva leaves with no replacement', () => {
    let m = run(namedMatch(), { type: 'startClock', now: T0 }, { type: 'pauseClock', now: T0 + 90_000 });
    m = run(m, { type: 'dropOn', fromSlotId: slotIdOf(m, 'Eva'), target: { kind: 'bench' }, now: T0 + 200_000 });
    expect(m.substitutions).toEqual([{ period: 1, elapsedMs: 90_000, outPlayerId: idOf(m, 'Eva'), inPlayerId: null, outName: 'Eva', inName: '' }]);
  });

  it('Reposicionamento não registra: repositioning and court swaps add no entry', () => {
    let m = namedMatch();
    m = run(
      m,
      { type: 'dropOn', fromSlotId: slotIdOf(m, 'Carla'), target: { kind: 'court', x: 0.2, y: 0.4 }, now: T0 },
      { type: 'dropOn', fromSlotId: slotIdOf(m, 'Bia'), target: { kind: 'slot', slotId: slotIdOf(m, 'Duda') }, now: T0 },
    );
    expect(m.substitutions).toEqual([]);
  });

  it('Consultar histórico: entries are kept in chronological order', () => {
    let m = run(namedMatch(), { type: 'startClock', now: T0 });
    m = run(m, { type: 'dropOn', fromSlotId: slotIdOf(m, 'Lia'), target: { kind: 'slot', slotId: slotIdOf(m, 'Duda') }, now: T0 + 1 * MIN });
    m = run(m, { type: 'dropOn', fromSlotId: slotIdOf(m, 'Eva'), target: { kind: 'bench' }, now: T0 + 2 * MIN });
    m = run(m, { type: 'dropOn', fromSlotId: slotIdOf(m, 'Mia'), target: { kind: 'court', x: 0.5, y: 0.5 }, now: T0 + 3 * MIN });
    m = run(m, { type: 'setPeriod', period: 2, now: T0 + 4 * MIN }, { type: 'startClock', now: T0 + 5 * MIN });
    m = run(m, { type: 'dropOn', fromSlotId: slotIdOf(m, 'Duda'), target: { kind: 'slot', slotId: slotIdOf(m, 'Mia') }, now: T0 + 5 * MIN + 30_000 });
    expect(m.substitutions.map((s) => [s.period, s.elapsedMs])).toEqual([
      [1, 1 * MIN],
      [1, 2 * MIN],
      [1, 3 * MIN],
      [2, 30_000],
    ]);
    expect(m.substitutions[2]).toMatchObject({ outPlayerId: null, inPlayerId: idOf(m, 'Mia') });
  });
});

describe('substitutions: name snapshots (design.md D11)', () => {
  it('history keeps the names after the player is renamed or the reserve is deleted', () => {
    let m = run(namedMatch(), { type: 'startClock', now: T0 });
    const lia = idOf(m, 'Lia');
    m = run(m, { type: 'dropOn', fromSlotId: slotIdOf(m, 'Lia'), target: { kind: 'slot', slotId: slotIdOf(m, 'Duda') }, now: T0 + MIN });
    const dudaSlot = slotIdOf(m, 'Duda');
    m = run(m, { type: 'setName', playerId: lia, name: 'Liana' }, { type: 'removeReserve', slotId: dudaSlot });
    expect(m.roster.some((p) => p.name === 'Duda')).toBe(false);
    expect(m.substitutions[0]).toMatchObject({ outName: 'Duda', inName: 'Lia' });
  });
});

describe('reducer: colors and purity', () => {
  it('setColors updates only the given color', () => {
    const m = namedMatch();
    const next = run(m, { type: 'setColors', colors: { gkColor: '#ff0000' } });
    expect(next.settings).toEqual({ lineColor: m.settings.lineColor, gkColor: '#ff0000', reserveColor: m.settings.reserveColor });
  });

  it('does not mutate the input match', () => {
    const m = namedMatch(); // deep frozen: any mutation would throw
    expect(() =>
      run(
        m,
        { type: 'startClock', now: T0 },
        { type: 'dropOn', fromSlotId: slotIdOf(m, 'Lia'), target: { kind: 'slot', slotId: slotIdOf(m, 'Duda') }, now: T0 + MIN },
        { type: 'addReserve' },
        { type: 'pauseClock', now: T0 + 2 * MIN },
        { type: 'newMatch' },
      ),
    ).not.toThrow();
  });
});
