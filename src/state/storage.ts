// localStorage persistence, JSON export/import and validation (design.md D7).

import {
  APP_ID,
  DEFAULT_COORDS,
  DEFAULT_SETTINGS,
  FORMAT_VERSION,
  POSITIONS,
  clampMinutes,
  courtSlotId,
  lineupFromMatch,
  newClock,
  nextId,
  type Clock,
  type Colors,
  type Lineup,
  type Match,
  type Player,
  type PlayerRole,
  type Position,
  type Settings,
  type Slot,
  type Substitution,
} from './model';
import { t } from '../view/i18n';

export const STORAGE_KEYS = {
  match: 'futsal:match',
  lineups: 'futsal:lineups',
  settings: 'futsal:settings',
} as const;

/** User-facing import errors (pt-BR); the strings live in view/i18n.ts with the rest of the UI text. */
export const IMPORT_ERRORS = t.importErrors;

/** Minimal subset of the Web Storage API, so tests can pass an in-memory shim. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function defaultStorage(): StorageLike {
  return globalThis.localStorage;
}

type MatchFile = { app: typeof APP_ID; kind: 'match' } & Match;
type LineupFile = { app: typeof APP_ID; kind: 'lineup' } & Lineup;

export type ImportResult =
  | { ok: true; kind: 'match'; match: Match }
  | { ok: true; kind: 'lineup'; lineup: Lineup }
  | { ok: false; error: string };

// Serialization

export function serializeMatch(match: Match): string {
  const file: MatchFile = { app: APP_ID, kind: 'match', ...match, version: FORMAT_VERSION };
  return JSON.stringify(file);
}

export function serializeLineup(lineup: Lineup): string {
  const file: LineupFile = { app: APP_ID, kind: 'lineup', ...lineup, version: FORMAT_VERSION };
  return JSON.stringify(file);
}

/** Pretty-printed JSON of the whole match, for download. */
export function exportMatch(match: Match): string {
  return JSON.stringify(JSON.parse(serializeMatch(match)), null, 2);
}

/** Pretty-printed JSON of one lineup, for download. */
export function exportLineup(lineup: Lineup): string {
  return JSON.stringify(JSON.parse(serializeLineup(lineup)), null, 2);
}

/**
 * Parses an imported file. Pure: never touches storage, so a failure changes nothing.
 * Accepts `{ app: "futsal-coach", kind: "match" | "lineup", version <= 1, ... }`.
 */
export function parseImport(text: string): ImportResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: IMPORT_ERRORS.invalidJson };
  }
  if (!isRecord(data) || data.app !== APP_ID || (data.kind !== 'match' && data.kind !== 'lineup')) {
    return { ok: false, error: IMPORT_ERRORS.unknownFormat };
  }
  if (typeof data.version !== 'number' || !Number.isInteger(data.version) || data.version < 1) {
    return { ok: false, error: IMPORT_ERRORS.unknownFormat };
  }
  if (data.version > FORMAT_VERSION) return { ok: false, error: IMPORT_ERRORS.futureVersion };

  if (data.kind === 'match') {
    const match = normalizeMatch(data);
    return match ? { ok: true, kind: 'match', match } : { ok: false, error: IMPORT_ERRORS.unknownFormat };
  }
  const lineup = normalizeLineup(data);
  return lineup ? { ok: true, kind: 'lineup', lineup } : { ok: false, error: IMPORT_ERRORS.unknownFormat };
}

// Current match (futsal:match)

export function saveMatch(match: Match, storage: StorageLike = defaultStorage()): void {
  storage.setItem(STORAGE_KEYS.match, serializeMatch(match));
}

/** Returns the saved match, or null when there is none or it cannot be read. */
export function loadMatch(storage: StorageLike = defaultStorage()): Match | null {
  const raw = storage.getItem(STORAGE_KEYS.match);
  if (raw === null) return null;
  const result = parseImport(raw);
  return result.ok && result.kind === 'match' ? result.match : null;
}

export function clearMatch(storage: StorageLike = defaultStorage()): void {
  storage.removeItem(STORAGE_KEYS.match);
}

// Settings (futsal:settings)

export function saveSettings(settings: Settings, storage: StorageLike = defaultStorage()): void {
  storage.setItem(
    STORAGE_KEYS.settings,
    JSON.stringify({ version: FORMAT_VERSION, ...normalizeSettings(settings) }),
  );
}

export function loadSettings(storage: StorageLike = defaultStorage()): Settings {
  const raw = storage.getItem(STORAGE_KEYS.settings);
  if (raw === null) return { ...DEFAULT_SETTINGS };
  try {
    return normalizeSettings(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

// Lineups (futsal:lineups)

export function listLineups(storage: StorageLike = defaultStorage()): Lineup[] {
  const raw = storage.getItem(STORAGE_KEYS.lineups);
  if (raw === null) return [];
  try {
    const data: unknown = JSON.parse(raw);
    const items = isRecord(data) && Array.isArray(data.lineups) ? data.lineups : [];
    return items.map((item) => normalizeLineup(item)).filter((l): l is Lineup => l !== null);
  } catch {
    return [];
  }
}

function writeLineups(lineups: Lineup[], storage: StorageLike): void {
  storage.setItem(STORAGE_KEYS.lineups, JSON.stringify({ version: FORMAT_VERSION, lineups }));
}

/** Adds a lineup, replacing any existing lineup with the same name. */
export function addLineup(lineup: Lineup, storage: StorageLike = defaultStorage()): Lineup[] {
  const lineups = [...listLineups(storage).filter((l) => l.name !== lineup.name), lineup];
  writeLineups(lineups, storage);
  return lineups;
}

/** Saves the current roster and slots under `name` (trimmed). Returns the saved lineup, or null for an empty name. */
export function saveLineup(name: string, match: Match, storage: StorageLike = defaultStorage()): Lineup | null {
  const trimmed = name.trim();
  if (trimmed === '') return null;
  const lineup = lineupFromMatch(match, trimmed);
  addLineup(lineup, storage);
  return lineup;
}

/** Returns the saved lineup with that name. Apply it with the reducer's `loadLineup` action. */
export function loadLineup(name: string, storage: StorageLike = defaultStorage()): Lineup | null {
  return listLineups(storage).find((l) => l.name === name) ?? null;
}

export function deleteLineup(name: string, storage: StorageLike = defaultStorage()): Lineup[] {
  const lineups = listLineups(storage).filter((l) => l.name !== name);
  writeLineups(lineups, storage);
  return lineups;
}

// Validation and normalization

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function clamp01(v: unknown, fallback: number): number {
  return isFiniteNumber(v) ? Math.min(1, Math.max(0, v)) : fallback;
}

function isColor(v: unknown): v is string {
  return typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);
}

function isRole(v: unknown): v is PlayerRole {
  return v === 'starter' || v === 'reserve';
}

function normalizeColors(v: unknown): Colors {
  const r = isRecord(v) ? v : {};
  return {
    lineColor: isColor(r.lineColor) ? r.lineColor : DEFAULT_SETTINGS.lineColor,
    gkColor: isColor(r.gkColor) ? r.gkColor : DEFAULT_SETTINGS.gkColor,
    reserveColor: isColor(r.reserveColor) ? r.reserveColor : DEFAULT_SETTINGS.reserveColor,
  };
}

function normalizeSettings(v: unknown): Settings {
  const r = isRecord(v) ? v : {};
  return {
    ...normalizeColors(r),
    periodMinutes: isFiniteNumber(r.periodMinutes) ? clampMinutes(r.periodMinutes) : DEFAULT_SETTINGS.periodMinutes,
  };
}

function normalizeRoster(v: unknown): Player[] | null {
  if (!Array.isArray(v)) return null;
  const seen = new Set<string>();
  const roster: Player[] = [];
  for (const item of v) {
    if (!isRecord(item) || typeof item.id !== 'string' || item.id === '' || seen.has(item.id)) continue;
    seen.add(item.id);
    roster.push({ id: item.id, name: typeof item.name === 'string' ? item.name : '', role: isRole(item.role) ? item.role : null });
  }
  return roster;
}

/**
 * Rebuilds slots so that the invariants hold: exactly 5 court slots (one per position),
 * every player in exactly one slot, bench slots never empty.
 */
function normalizeSlots(v: unknown, roster: Player[]): Slot[] | null {
  if (!Array.isArray(v)) return null;
  const known = new Set(roster.map((p) => p.id));
  const placed = new Set<string>();
  const take = (id: unknown): string | null => {
    if (typeof id !== 'string' || !known.has(id) || placed.has(id)) return null;
    placed.add(id);
    return id;
  };

  const court = new Map<Position, Slot>();
  const bench: Slot[] = [];
  for (const item of v) {
    if (!isRecord(item)) continue;
    if (item.kind === 'court') {
      const position = item.position as Position;
      if (!POSITIONS.includes(position) || court.has(position)) continue;
      const d = DEFAULT_COORDS[position];
      court.set(position, {
        id: typeof item.id === 'string' && item.id !== '' ? item.id : courtSlotId(position),
        kind: 'court',
        position,
        playerId: take(item.playerId),
        x: clamp01(item.x, d.x),
        y: clamp01(item.y, d.y),
      });
    } else if (item.kind === 'bench') {
      const playerId = take(item.playerId);
      if (playerId === null) continue;
      const id = typeof item.id === 'string' && item.id !== '' ? item.id : '';
      bench.push({ id, kind: 'bench', playerId, x: 0, y: 0 });
    }
  }

  const slots: Slot[] = POSITIONS.map(
    (position) =>
      court.get(position) ?? { id: courtSlotId(position), kind: 'court', position, playerId: null, ...DEFAULT_COORDS[position] },
  );
  const ids = new Set(slots.map((s) => s.id));
  const addBench = (slot: Slot): void => {
    const id = slot.id !== '' && !ids.has(slot.id) ? slot.id : nextId('bench-', ids);
    ids.add(id);
    slots.push({ ...slot, id });
  };
  bench.forEach(addBench);
  // Players not referenced by any slot go to the bench so nobody is lost.
  for (const p of roster) {
    if (!placed.has(p.id)) addBench({ id: '', kind: 'bench', playerId: p.id, x: 0, y: 0 });
  }
  return slots;
}

function normalizeClock(v: unknown, fallbackMinutes: number): Clock {
  if (!isRecord(v)) return newClock(fallbackMinutes);
  const periodMinutes = isFiniteNumber(v.periodMinutes) ? clampMinutes(v.periodMinutes) : fallbackMinutes;
  const period = v.period === 2 ? 2 : 1;
  const periodLengthMs =
    isFiniteNumber(v.periodLengthMs) && v.periodLengthMs > 0 ? v.periodLengthMs : periodMinutes * 60_000;
  const remainingMs = isFiniteNumber(v.remainingMs)
    ? Math.min(periodLengthMs, Math.max(0, v.remainingMs))
    : periodLengthMs;
  const runningSince = isFiniteNumber(v.runningSince) && remainingMs > 0 ? v.runningSince : null;
  const finished = typeof v.finished === 'boolean' ? v.finished && runningSince === null : remainingMs === 0;
  return { periodMinutes, period, remainingMs, runningSince, periodLengthMs, finished };
}

function normalizeTimes(v: unknown, known: Set<string>): Record<string, number> {
  const out: Record<string, number> = {};
  if (!isRecord(v)) return out;
  for (const [id, ms] of Object.entries(v)) {
    if (known.has(id) && isFiniteNumber(ms) && ms >= 0) out[id] = ms;
  }
  return out;
}

/**
 * Kickoff lineup (court slot id to player id). Optional in files; entries whose slot is not a
 * court slot or whose player is not in the roster are dropped, and a player counts only once.
 */
function normalizeKickoffCourt(v: unknown, slots: Slot[], known: Set<string>): Record<string, string> {
  const out: Record<string, string> = {};
  if (!isRecord(v)) return out;
  const courtIds = new Set(slots.filter((s) => s.kind === 'court').map((s) => s.id));
  const used = new Set<string>();
  for (const [slotId, playerId] of Object.entries(v)) {
    if (!courtIds.has(slotId) || typeof playerId !== 'string' || !known.has(playerId) || used.has(playerId)) continue;
    out[slotId] = playerId;
    used.add(playerId);
  }
  return out;
}

function normalizeSubstitutions(v: unknown, roster: Player[]): Substitution[] {
  if (!Array.isArray(v)) return [];
  const nullableId = (x: unknown): string | null => (typeof x === 'string' ? x : null);
  // Older files without name snapshots fall back to the current roster name, if the player still exists.
  const nameOf = (snapshot: unknown, id: string | null): string =>
    typeof snapshot === 'string' ? snapshot : (roster.find((p) => p.id === id)?.name ?? '');
  return v.filter(isRecord).map((s) => {
    const outPlayerId = nullableId(s.outPlayerId);
    const inPlayerId = nullableId(s.inPlayerId);
    return {
      period: s.period === 2 ? 2 : 1,
      elapsedMs: isFiniteNumber(s.elapsedMs) && s.elapsedMs >= 0 ? s.elapsedMs : 0,
      outPlayerId,
      inPlayerId,
      outName: nameOf(s.outName, outPlayerId),
      inName: nameOf(s.inName, inPlayerId),
    };
  });
}

export function normalizeMatch(v: unknown): Match | null {
  if (!isRecord(v)) return null;
  const roster = normalizeRoster(v.roster);
  if (!roster) return null;
  const slots = normalizeSlots(v.slots, roster);
  if (!slots) return null;
  const known = new Set(roster.map((p) => p.id));
  const clock = normalizeClock(v.clock, DEFAULT_SETTINGS.periodMinutes);

  // Accrual only exists for court players while the clock runs.
  const playingSince: Record<string, number> = {};
  if (clock.runningSince !== null) {
    const saved = normalizeTimes(v.playingSince, known);
    for (const s of slots) {
      if (s.kind === 'court' && s.playerId !== null) playingSince[s.playerId] = saved[s.playerId] ?? clock.runningSince;
    }
  }

  const playingTimeMs = normalizeTimes(v.playingTimeMs, known);
  const substitutions = normalizeSubstitutions(v.substitutions, roster);
  // Files from before roles existed: infer whether the clock was ever started (design.md D5).
  const kickoff =
    typeof v.kickoff === 'boolean'
      ? v.kickoff
      : substitutions.length > 0 ||
        Object.values(playingTimeMs).some((ms) => ms > 0) ||
        clock.runningSince !== null ||
        clock.remainingMs < clock.periodLengthMs;
  const onCourt = new Set(slots.filter((s) => s.kind === 'court' && s.playerId !== null).map((s) => s.playerId));
  const withRoles: Player[] = roster.map((p) => ({
    ...p,
    role: !kickoff ? null : (p.role ?? (onCourt.has(p.id) ? 'starter' : 'reserve')),
  }));

  return {
    version: FORMAT_VERSION,
    roster: withRoles,
    slots,
    clock,
    playingTimeMs,
    playingSince,
    substitutions,
    settings: normalizeColors(v.settings),
    kickoff,
    kickoffCourt: kickoff ? normalizeKickoffCourt(v.kickoffCourt, slots, known) : {},
  };
}

export function normalizeLineup(v: unknown): Lineup | null {
  if (!isRecord(v)) return null;
  const roster = normalizeRoster(v.roster);
  if (!roster) return null;
  const slots = normalizeSlots(v.slots, roster);
  if (!slots) return null;
  // Lineups do not keep roles: they are frozen again at the next kickoff (design.md D5).
  return {
    version: FORMAT_VERSION,
    name: typeof v.name === 'string' ? v.name.trim() : '',
    roster: roster.map((p) => ({ ...p, role: null })),
    slots,
  };
}
