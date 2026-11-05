// Domain types and factories (design.md D2).

export const FORMAT_VERSION = 1;
export const APP_ID = 'futsal-coach';

export type Position = 'GL' | 'FX' | 'AE' | 'AD' | 'PV';
export const POSITIONS: readonly Position[] = ['GL', 'FX', 'AE', 'AD', 'PV'];

export const DEFAULT_PERIOD_MINUTES = 20;
export const MIN_PERIOD_MINUTES = 1;
export const MAX_PERIOD_MINUTES = 60;
export const COURT_SLOT_COUNT = 5;
export const DEFAULT_BENCH_SIZE = 4;

export interface Player {
  id: string;
  name: string;
}

export type SlotKind = 'court' | 'bench';

export interface Slot {
  id: string;
  kind: SlotKind;
  /** Only court slots have a nominal position. */
  position?: Position;
  /** Court slots may be empty (null). Bench slots always hold a player. */
  playerId: string | null;
  /** Normalized court coordinates: x along the length (0 = own goal), y along the width (0 = left of the attacking direction). Unused for bench slots. */
  x: number;
  y: number;
}

export type Period = 1 | 2;

export interface Clock {
  /** Configured duration in minutes; applies to the next periods. */
  periodMinutes: number;
  period: Period;
  /** Remaining time at the last consolidation. */
  remainingMs: number;
  /** Epoch ms when the clock last started running, or null when stopped. */
  runningSince: number | null;
  /** Duration the current period started with (used to compute elapsed time). */
  periodLengthMs: number;
  /** True once the current period reached 00:00; start is blocked until reset or period change. */
  finished: boolean;
}

export interface Substitution {
  period: Period;
  /** Elapsed game time in the period when the change happened. */
  elapsedMs: number;
  outPlayerId: string | null;
  inPlayerId: string | null;
  /** Name snapshots taken at the moment of the change (design.md D11), so history stays readable after a reserve is deleted. */
  outName: string;
  inName: string;
}

export interface Colors {
  lineColor: string;
  gkColor: string;
}

export interface Match {
  version: number;
  roster: Player[];
  slots: Slot[];
  clock: Clock;
  /** Consolidated playing time per player id. */
  playingTimeMs: Record<string, number>;
  /** Instant from which a court player is accumulating (only while the clock runs). */
  playingSince: Record<string, number>;
  substitutions: Substitution[];
  settings: Colors;
}

export interface Lineup {
  version: number;
  name: string;
  roster: Player[];
  slots: Slot[];
}

/** Device-level preferences stored under `futsal:settings`. */
export interface Settings extends Colors {
  periodMinutes: number;
}

export const DEFAULT_COLORS: Colors = { lineColor: '#1e88e5', gkColor: '#fdd835' };

export const DEFAULT_SETTINGS: Settings = { ...DEFAULT_COLORS, periodMinutes: DEFAULT_PERIOD_MINUTES };

/** Default normalized coordinates, attacking towards x = 1. */
export const DEFAULT_COORDS: Record<Position, { x: number; y: number }> = {
  GL: { x: 0.06, y: 0.5 },
  FX: { x: 0.3, y: 0.5 },
  AE: { x: 0.55, y: 0.22 },
  AD: { x: 0.55, y: 0.78 },
  PV: { x: 0.8, y: 0.5 },
};

export function courtSlotId(position: Position): string {
  return `court-${position}`;
}

export function clampMinutes(minutes: number): number {
  if (!Number.isFinite(minutes)) return DEFAULT_PERIOD_MINUTES;
  return Math.min(MAX_PERIOD_MINUTES, Math.max(MIN_PERIOD_MINUTES, Math.round(minutes)));
}

/** Returns `${prefix}${n}` with n greater than any numeric suffix already used. Deterministic, so reducers stay pure. */
export function nextId(prefix: string, existing: Iterable<string>): string {
  let max = 0;
  for (const id of existing) {
    if (!id.startsWith(prefix)) continue;
    const n = Number(id.slice(prefix.length));
    if (Number.isInteger(n) && n > max) max = n;
  }
  return `${prefix}${max + 1}`;
}

export function defaultLineup(name = ''): Lineup {
  const roster: Player[] = [];
  const slots: Slot[] = [];
  let n = 0;
  for (const position of POSITIONS) {
    const id = `p${++n}`;
    roster.push({ id, name: '' });
    slots.push({ id: courtSlotId(position), kind: 'court', position, playerId: id, ...DEFAULT_COORDS[position] });
  }
  for (let i = 1; i <= DEFAULT_BENCH_SIZE; i++) {
    const id = `p${++n}`;
    roster.push({ id, name: '' });
    slots.push({ id: `bench-${i}`, kind: 'bench', playerId: id, x: 0, y: 0 });
  }
  return { version: FORMAT_VERSION, name, roster, slots };
}

export function newClock(periodMinutes: number = DEFAULT_PERIOD_MINUTES, period: Period = 1): Clock {
  const minutes = clampMinutes(periodMinutes);
  const ms = minutes * 60_000;
  return { periodMinutes: minutes, period, remainingMs: ms, runningSince: null, periodLengthMs: ms, finished: false };
}

export function newMatch(lineup: Lineup = defaultLineup(), settings: Partial<Settings> = {}): Match {
  const s = { ...DEFAULT_SETTINGS, ...settings };
  return {
    version: FORMAT_VERSION,
    roster: lineup.roster.map((p) => ({ ...p })),
    slots: lineup.slots.map((sl) => ({ ...sl })),
    clock: newClock(s.periodMinutes),
    playingTimeMs: {},
    playingSince: {},
    substitutions: [],
    settings: { lineColor: s.lineColor, gkColor: s.gkColor },
  };
}

/** Snapshot of the current roster and slots as a named lineup. */
export function lineupFromMatch(match: Match, name: string): Lineup {
  return {
    version: FORMAT_VERSION,
    name,
    roster: match.roster.map((p) => ({ ...p })),
    slots: match.slots.map((s) => ({ ...s })),
  };
}

// Query helpers

export function courtSlots(match: Pick<Match, 'slots'>): Slot[] {
  return match.slots.filter((s) => s.kind === 'court');
}

export function benchSlots(match: Pick<Match, 'slots'>): Slot[] {
  return match.slots.filter((s) => s.kind === 'bench');
}

export function onCourtPlayerIds(match: Pick<Match, 'slots'>): string[] {
  return courtSlots(match)
    .map((s) => s.playerId)
    .filter((id): id is string => id !== null);
}

export function findSlot(match: Pick<Match, 'slots'>, slotId: string): Slot | undefined {
  return match.slots.find((s) => s.id === slotId);
}

export function slotOfPlayer(match: Pick<Match, 'slots'>, playerId: string): Slot | undefined {
  return match.slots.find((s) => s.playerId === playerId);
}

export function playerName(match: Pick<Match, 'roster'>, playerId: string | null): string {
  if (playerId === null) return '';
  return match.roster.find((p) => p.id === playerId)?.name ?? '';
}
