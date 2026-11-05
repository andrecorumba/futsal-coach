// Timestamp-based clock and playing time (design.md D4).
// Every function is pure: callers pass `now` (epoch ms).

import { clampMinutes, onCourtPlayerIds, type Match, type Period } from './model';

export function isRunning(match: Match): boolean {
  return match.clock.runningSince !== null;
}

/** Instant at which the running clock reaches 00:00, or null if stopped. */
export function clockEndsAt(match: Match): number | null {
  const { runningSince, remainingMs } = match.clock;
  return runningSince === null ? null : runningSince + remainingMs;
}

/** Remaining time in the period at `now`; never negative. */
export function remainingAt(match: Match, now: number): number {
  const { runningSince, remainingMs } = match.clock;
  if (runningSince === null) return Math.max(0, remainingMs);
  return Math.max(0, remainingMs - Math.max(0, now - runningSince));
}

/** Elapsed game time in the current period at `now`. */
export function elapsedAt(match: Match, now: number): number {
  return Math.max(0, match.clock.periodLengthMs - remainingAt(match, now));
}

/** True when the period has ended, either already consolidated or reached while running. */
export function isFinishedAt(match: Match, now: number): boolean {
  return match.clock.finished || (isRunning(match) && remainingAt(match, now) === 0);
}

/** True when the current period has not been started yet (full time, stopped). */
export function isPeriodUntouched(match: Match): boolean {
  const c = match.clock;
  return c.runningSince === null && !c.finished && c.remainingMs === c.periodLengthMs;
}

/** Accumulated playing time for a player at `now`, capped at the instant the clock hits zero. */
export function playingTimeAt(match: Match, playerId: string, now: number): number {
  const base = match.playingTimeMs[playerId] ?? 0;
  const since = match.playingSince[playerId];
  const end = clockEndsAt(match);
  if (since === undefined || end === null) return base;
  return base + Math.max(0, Math.min(now, end) - since);
}

/** Moves the running accrual of the given players into `playingTimeMs` and stops their accrual. */
export function consolidate(match: Match, playerIds: readonly string[], now: number): Match {
  const ids = playerIds.filter((id) => match.playingSince[id] !== undefined);
  if (ids.length === 0) return match;
  const playingTimeMs = { ...match.playingTimeMs };
  const playingSince = { ...match.playingSince };
  for (const id of ids) {
    playingTimeMs[id] = playingTimeAt(match, id, now);
    delete playingSince[id];
  }
  return { ...match, playingTimeMs, playingSince };
}

/** Starts accrual for the given players if the clock is running. */
export function beginPlaying(match: Match, playerIds: readonly string[], now: number): Match {
  if (!isRunning(match) || playerIds.length === 0) return match;
  const playingSince = { ...match.playingSince };
  for (const id of playerIds) playingSince[id] = now;
  return { ...match, playingSince };
}

function consolidateAll(match: Match, now: number): Match {
  return consolidate(match, Object.keys(match.playingSince), now);
}

/**
 * If the running clock has reached zero by `now`, stops it at exactly 00:00 and
 * marks the period finished. Playing time is consolidated up to the end instant.
 */
export function settle(match: Match, now: number): Match {
  const end = clockEndsAt(match);
  if (end === null || now < end) return match;
  const m = consolidateAll(match, end);
  return { ...m, clock: { ...m.clock, remainingMs: 0, runningSince: null, finished: true } };
}

export function startClock(match: Match, now: number): Match {
  const m = settle(match, now);
  if (isRunning(m) || m.clock.finished || m.clock.remainingMs <= 0) return m;
  const running: Match = { ...m, clock: { ...m.clock, runningSince: now } };
  return beginPlaying(running, onCourtPlayerIds(running), now);
}

export function pauseClock(match: Match, now: number): Match {
  const m = settle(match, now);
  if (!isRunning(m)) return m;
  const consolidated = consolidateAll(m, now);
  return {
    ...consolidated,
    clock: { ...consolidated.clock, remainingMs: remainingAt(m, now), runningSince: null },
  };
}

function restartPeriod(match: Match, period: Period, now: number): Match {
  const m = pauseClock(match, now);
  const ms = m.clock.periodMinutes * 60_000;
  return {
    ...m,
    clock: { ...m.clock, period, remainingMs: ms, periodLengthMs: ms, runningSince: null, finished: false },
  };
}

/** Resets the current period to the configured duration, stopped. Playing time is kept. */
export function resetClock(match: Match, now: number): Match {
  return restartPeriod(match, match.clock.period, now);
}

/** Switches to the given period, resetting the clock to the configured duration, stopped. */
export function setPeriod(match: Match, period: Period, now: number): Match {
  return restartPeriod(match, period, now);
}

/**
 * Changes the configured duration (integer minutes, clamped to 1..60). It applies to
 * the current period only when that period has not started; otherwise to the next ones.
 */
export function setDuration(match: Match, minutes: number): Match {
  const periodMinutes = clampMinutes(minutes);
  if (periodMinutes === match.clock.periodMinutes && !isPeriodUntouched(match)) return match;
  if (isPeriodUntouched(match)) {
    const ms = periodMinutes * 60_000;
    return { ...match, clock: { ...match.clock, periodMinutes, remainingMs: ms, periodLengthMs: ms } };
  }
  return { ...match, clock: { ...match.clock, periodMinutes } };
}
