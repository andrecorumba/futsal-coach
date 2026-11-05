import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { newMatch, onCourtPlayerIds, type Match } from '../src/state/model';
import { reduce, type Action } from '../src/state/reducer';
import { elapsedAt, isFinishedAt, playingTimeAt, remainingAt } from '../src/state/time';
import { deepFreeze, idOf, MIN, namedMatch, slotIdOf, T0 } from './helpers';

function run(match: Match, ...actions: Action[]): Match {
  return actions.reduce((m, a) => deepFreeze(reduce(m, a)), match);
}

const SEC = 1000;

describe('match-clock (task 3.1)', () => {
  it('Estado inicial: 20:00, stopped, 1st period', () => {
    const m = newMatch();
    expect(remainingAt(m, T0)).toBe(20 * MIN);
    expect(remainingAt(m, T0 + 10 * MIN)).toBe(20 * MIN);
    expect(m.clock.runningSince).toBeNull();
    expect(m.clock.period).toBe(1);
  });

  it('Iniciar e pausar: start, pause after 3 s shows 19:57 and stops decrementing', () => {
    const m = run(newMatch(), { type: 'startClock', now: T0 }, { type: 'pauseClock', now: T0 + 3 * SEC });
    expect(remainingAt(m, T0 + 3 * SEC)).toBe(19 * MIN + 57 * SEC);
    expect(remainingAt(m, T0 + 60 * MIN)).toBe(19 * MIN + 57 * SEC);
  });

  it('Retomar: resuming from 19:57 decrements from 19:57', () => {
    let m = run(newMatch(), { type: 'startClock', now: T0 }, { type: 'pauseClock', now: T0 + 3 * SEC });
    const t = T0 + 5 * MIN;
    m = run(m, { type: 'startClock', now: t });
    expect(remainingAt(m, t)).toBe(19 * MIN + 57 * SEC);
    expect(remainingAt(m, t + 2 * SEC)).toBe(19 * MIN + 55 * SEC);
  });

  it('starting an already running clock is ignored', () => {
    const m = run(newMatch(), { type: 'startClock', now: T0 });
    expect(reduce(m, { type: 'startClock', now: T0 + 5 * SEC })).toBe(m);
  });

  it('Ajustar antes de começar: 20:00 adjusted to 15 shows 15:00', () => {
    const m = run(newMatch(), { type: 'setDuration', minutes: 15 });
    expect(remainingAt(m, T0)).toBe(15 * MIN);
    expect(m.clock.periodMinutes).toBe(15);
  });

  it('Ajustar com o período em andamento: 12:30 stays 12:30 and 2T starts at 15:00', () => {
    const t1230 = T0 + 7 * MIN + 30 * SEC;
    // While running
    let m = run(newMatch(), { type: 'startClock', now: T0 }, { type: 'setDuration', minutes: 15 });
    expect(remainingAt(m, t1230)).toBe(12 * MIN + 30 * SEC);
    // While paused mid-period
    m = run(m, { type: 'pauseClock', now: t1230 }, { type: 'setDuration', minutes: 15 });
    expect(remainingAt(m, t1230 + MIN)).toBe(12 * MIN + 30 * SEC);
    expect(elapsedAt(m, t1230)).toBe(7 * MIN + 30 * SEC);
    m = run(m, { type: 'setPeriod', period: 2, now: t1230 + MIN });
    expect(remainingAt(m, t1230 + MIN)).toBe(15 * MIN);
  });

  it('clamps the duration to whole minutes between 1 and 60', () => {
    expect(run(newMatch(), { type: 'setDuration', minutes: 0 }).clock.periodMinutes).toBe(1);
    expect(run(newMatch(), { type: 'setDuration', minutes: 90 }).clock.periodMinutes).toBe(60);
    expect(run(newMatch(), { type: 'setDuration', minutes: 12.4 }).clock.periodMinutes).toBe(12);
  });

  it('Passar para o 2º tempo: during 1T, the period becomes 2 and the clock resets, stopped', () => {
    const m = run(newMatch(), { type: 'startClock', now: T0 }, { type: 'setPeriod', period: 2, now: T0 + 5 * MIN });
    expect(m.clock.period).toBe(2);
    expect(m.clock.runningSince).toBeNull();
    expect(remainingAt(m, T0 + 10 * MIN)).toBe(20 * MIN);
  });

  it('Passar para o 2º tempo: after 1T ended', () => {
    let m = run(newMatch(), { type: 'startClock', now: T0 }, { type: 'tick', now: T0 + 21 * MIN });
    expect(m.clock.finished).toBe(true);
    m = run(m, { type: 'setPeriod', period: 2, now: T0 + 25 * MIN });
    expect(m.clock).toMatchObject({ period: 2, remainingMs: 20 * MIN, runningSince: null, finished: false });
  });

  it('Dados preservados: changing period keeps names, slots, playing time and history', () => {
    let m = run(namedMatch(), { type: 'startClock', now: T0 });
    m = run(m, { type: 'dropOn', fromSlotId: slotIdOf(m, 'Lia'), target: { kind: 'slot', slotId: slotIdOf(m, 'Duda') }, now: T0 + MIN });
    m = run(m, { type: 'pauseClock', now: T0 + 2 * MIN });
    const next = run(m, { type: 'setPeriod', period: 2, now: T0 + 3 * MIN });
    expect(next.roster).toEqual(m.roster);
    expect(next.slots).toEqual(m.slots);
    expect(next.playingTimeMs).toEqual(m.playingTimeMs);
    expect(next.substitutions).toEqual(m.substitutions);
  });

  it('Reiniciar com confirmação: reset returns to the configured duration, stopped, same period', () => {
    let m = run(newMatch(), { type: 'setPeriod', period: 2, now: T0 }, { type: 'startClock', now: T0 });
    m = run(m, { type: 'resetClock', now: T0 + 4 * MIN });
    expect(m.clock).toMatchObject({ period: 2, remainingMs: 20 * MIN, runningSince: null, finished: false });
  });

  it('Reiniciar cancelado: without a reset action the clock keeps running as before', () => {
    // Cancelling the confirmation dispatches nothing; the state keeps counting from timestamps.
    const m = run(newMatch(), { type: 'startClock', now: T0 });
    expect(remainingAt(m, T0 + 4 * MIN)).toBe(16 * MIN);
    expect(m.clock.runningSince).toBe(T0);
  });

  describe('Tela bloqueada e retomada', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(T0);
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('30 s with no ticks (screen locked) shows 30 s less on resume', () => {
      const m = run(newMatch(), { type: 'startClock', now: Date.now() });
      vi.advanceTimersByTime(2 * MIN); // normal play
      const before = remainingAt(m, Date.now());
      // Screen locked: setInterval would not fire; only the system clock advances.
      vi.setSystemTime(Date.now() + 30 * SEC);
      const after = remainingAt(m, Date.now());
      expect(Math.abs(before - after - 30 * SEC)).toBeLessThanOrEqual(1 * SEC);
      expect(after).toBe(17 * MIN + 30 * SEC);
    });
  });
});

describe('match-clock: Fim do período (task 3.3)', () => {
  it('Zerar: reaching 00:00 stops the clock and marks it finished', () => {
    let m = run(newMatch(), { type: 'startClock', now: T0 });
    expect(remainingAt(m, T0 + 20 * MIN + 5 * SEC)).toBe(0);
    expect(isFinishedAt(m, T0 + 20 * MIN)).toBe(true);
    m = run(m, { type: 'tick', now: T0 + 20 * MIN + 250 });
    expect(m.clock).toMatchObject({ remainingMs: 0, runningSince: null, finished: true });
  });

  it('remaining time is never negative', () => {
    const m = run(newMatch(), { type: 'setDuration', minutes: 1 }, { type: 'startClock', now: T0 });
    for (const dt of [0, 30 * SEC, MIN, MIN + 1, 10 * MIN, 1e9]) {
      expect(remainingAt(m, T0 + dt)).toBeGreaterThanOrEqual(0);
    }
    expect(remainingAt(run(m, { type: 'tick', now: T0 + 1e9 }), T0 + 2e9)).toBe(0);
    expect(remainingAt(run(m, { type: 'pauseClock', now: T0 + 5 * MIN }), T0 + 5 * MIN)).toBe(0);
  });

  it('startClock is ignored while finished, until reset or period change', () => {
    let m = run(newMatch(), { type: 'startClock', now: T0 }, { type: 'tick', now: T0 + 21 * MIN });
    expect(reduce(m, { type: 'startClock', now: T0 + 22 * MIN })).toBe(m);
    // Also ignored when the end was reached but not yet consolidated by a tick.
    const unsettled = run(newMatch(), { type: 'startClock', now: T0 });
    expect(run(unsettled, { type: 'startClock', now: T0 + 21 * MIN }).clock).toMatchObject({ finished: true, runningSince: null });
    m = run(m, { type: 'resetClock', now: T0 + 23 * MIN }, { type: 'startClock', now: T0 + 24 * MIN });
    expect(m.clock.runningSince).toBe(T0 + 24 * MIN);
  });

  it('playing time stops at the instant the clock hits zero', () => {
    const m = run(namedMatch(), { type: 'setDuration', minutes: 1 }, { type: 'startClock', now: T0 });
    const duda = idOf(m, 'Duda');
    expect(playingTimeAt(m, duda, T0 + 5 * MIN)).toBe(MIN);
    const settled = run(m, { type: 'tick', now: T0 + 5 * MIN });
    expect(settled.playingTimeMs[duda]).toBe(MIN);
    expect(settled.playingSince).toEqual({});
  });

  it('a substitution after the clock ran out does not start accrual for the incoming player', () => {
    let m = run(namedMatch(), { type: 'setDuration', minutes: 1 }, { type: 'startClock', now: T0 });
    m = run(m, { type: 'dropOn', fromSlotId: slotIdOf(m, 'Lia'), target: { kind: 'slot', slotId: slotIdOf(m, 'Duda') }, now: T0 + 2 * MIN });
    expect(playingTimeAt(m, idOf(m, 'Lia'), T0 + 10 * MIN)).toBe(0);
    expect(playingTimeAt(m, idOf(m, 'Duda'), T0 + 10 * MIN)).toBe(MIN);
    expect(m.substitutions[0]!.elapsedMs).toBe(MIN);
  });
});

describe('playing-time (task 3.2)', () => {
  it('Cinco em quadra por um minuto: starters accrue 60 s, reserves keep their time', () => {
    const m = run(namedMatch(), { type: 'startClock', now: T0 }, { type: 'pauseClock', now: T0 + MIN });
    const court = onCourtPlayerIds(m);
    expect(court).toHaveLength(5);
    for (const id of court) expect(playingTimeAt(m, id, T0 + 2 * MIN)).toBe(MIN);
    for (const p of m.roster.filter((x) => !court.includes(x.id))) expect(playingTimeAt(m, p.id, T0 + 2 * MIN)).toBe(0);
  });

  it('accrues live while running, without consolidation', () => {
    const m = run(namedMatch(), { type: 'startClock', now: T0 });
    expect(playingTimeAt(m, idOf(m, 'Bia'), T0 + 45 * SEC)).toBe(45 * SEC);
    expect(playingTimeAt(m, idOf(m, 'Lia'), T0 + 45 * SEC)).toBe(0);
  });

  it('Cronômetro pausado: no player accrues while paused', () => {
    let m = run(namedMatch(), { type: 'startClock', now: T0 }, { type: 'pauseClock', now: T0 + 30 * SEC });
    m = run(m, { type: 'startClock', now: T0 + 10 * MIN }, { type: 'pauseClock', now: T0 + 10 * MIN + 30 * SEC });
    for (const id of onCourtPlayerIds(m)) expect(playingTimeAt(m, id, T0 + 20 * MIN)).toBe(MIN);
  });

  it('Goleira conta: the goalkeeper accrues like the other starters', () => {
    const m = run(namedMatch(), { type: 'startClock', now: T0 });
    const gk = m.slots.find((s) => s.position === 'GL')!.playerId!;
    expect(gk).toBe(idOf(m, 'Ana'));
    expect(playingTimeAt(m, gk, T0 + 90 * SEC)).toBe(90 * SEC);
  });

  it('Troca no meio do período: Duda 05:00, Lia 00:00, Lia replaces Duda, +120 s gives 05:00 and 02:00', () => {
    let m = run(namedMatch(), { type: 'startClock', now: T0 });
    const t = T0 + 5 * MIN;
    m = run(m, { type: 'dropOn', fromSlotId: slotIdOf(m, 'Lia'), target: { kind: 'slot', slotId: slotIdOf(m, 'Duda') }, now: t });
    expect(playingTimeAt(m, idOf(m, 'Duda'), t + 120 * SEC)).toBe(5 * MIN);
    expect(playingTimeAt(m, idOf(m, 'Lia'), t + 120 * SEC)).toBe(2 * MIN);
  });

  it('a player who leaves and comes back keeps the earlier time', () => {
    let m = run(namedMatch(), { type: 'startClock', now: T0 });
    m = run(m, { type: 'dropOn', fromSlotId: slotIdOf(m, 'Eva'), target: { kind: 'bench' }, now: T0 + MIN });
    m = run(m, { type: 'dropOn', fromSlotId: slotIdOf(m, 'Eva'), target: { kind: 'court', x: 0.5, y: 0.5 }, now: T0 + 3 * MIN });
    expect(playingTimeAt(m, idOf(m, 'Eva'), T0 + 4 * MIN)).toBe(2 * MIN);
  });

  it('Tempo persiste entre períodos: period change and reset keep accumulated time', () => {
    let m = run(namedMatch(), { type: 'startClock', now: T0 });
    m = run(m, { type: 'setPeriod', period: 2, now: T0 + 3 * MIN });
    const duda = idOf(m, 'Duda');
    expect(playingTimeAt(m, duda, T0 + 10 * MIN)).toBe(3 * MIN);
    m = run(m, { type: 'startClock', now: T0 + 10 * MIN }, { type: 'resetClock', now: T0 + 11 * MIN });
    expect(playingTimeAt(m, duda, T0 + 20 * MIN)).toBe(4 * MIN);
  });

  it('Partida nova: a new match from the menu starts everyone at 00:00', () => {
    let m = run(namedMatch(), { type: 'startClock', now: T0 }, { type: 'pauseClock', now: T0 + 5 * MIN });
    m = run(m, { type: 'newMatch' });
    for (const p of m.roster) expect(playingTimeAt(m, p.id, T0 + 6 * MIN)).toBe(0);
  });

  it('the sum of playing time equals 5 times the elapsed game time', () => {
    let m = run(namedMatch(), { type: 'startClock', now: T0 });
    m = run(m, { type: 'dropOn', fromSlotId: slotIdOf(m, 'Lia'), target: { kind: 'slot', slotId: slotIdOf(m, 'Duda') }, now: T0 + 2 * MIN });
    m = run(m, { type: 'dropOn', fromSlotId: slotIdOf(m, 'Mia'), target: { kind: 'slot', slotId: slotIdOf(m, 'Ana') }, now: T0 + 7 * MIN });
    m = run(m, { type: 'pauseClock', now: T0 + 10 * MIN });
    const total = m.roster.reduce((sum, p) => sum + playingTimeAt(m, p.id, T0 + 10 * MIN), 0);
    expect(total).toBe(5 * 10 * MIN);
  });
});
