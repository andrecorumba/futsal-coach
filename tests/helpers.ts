import { newMatch, type Match } from '../src/state/model';
import { reduce } from '../src/state/reducer';
import type { StorageLike } from '../src/state/storage';

/** In-memory localStorage shim. */
export class MemoryStorage implements StorageLike {
  readonly data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, String(value));
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
  snapshot(): Record<string, string> {
    return Object.fromEntries(this.data);
  }
}

/** Recursively freezes an object so tests fail if a reducer mutates its input. */
export function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value)) deepFreeze(v);
  }
  return value;
}

export const COURT_NAMES = { GL: 'Ana', FX: 'Carla', AE: 'Bia', AD: 'Eva', PV: 'Duda' } as const;
export const BENCH_NAMES = ['Lia', 'Mia', 'Nina', 'Olga'] as const;

/** A new match with every player named: court Ana/Carla/Bia/Eva/Duda, bench Lia/Mia/Nina/Olga. */
export function namedMatch(): Match {
  let m = newMatch();
  for (const slot of m.slots) {
    const name = slot.kind === 'court' ? COURT_NAMES[slot.position!] : BENCH_NAMES[Number(slot.id.split('-')[1]) - 1]!;
    m = reduce(m, { type: 'setName', playerId: slot.playerId!, name });
  }
  return deepFreeze(m);
}

export function idOf(match: Match, name: string): string {
  const p = match.roster.find((x) => x.name === name);
  if (!p) throw new Error(`no player named ${name}`);
  return p.id;
}

export function slotIdOf(match: Match, name: string): string {
  const id = idOf(match, name);
  const s = match.slots.find((x) => x.playerId === id);
  if (!s) throw new Error(`${name} is not in a slot`);
  return s.id;
}

/** Name of the player in the court slot at `position`, or null if empty. */
export function at(match: Match, position: string): string | null {
  const s = match.slots.find((x) => x.position === position);
  if (!s?.playerId) return null;
  return match.roster.find((p) => p.id === s.playerId)?.name ?? null;
}

export function benchNames(match: Match): string[] {
  return match.slots
    .filter((s) => s.kind === 'bench')
    .map((s) => match.roster.find((p) => p.id === s.playerId)?.name ?? '?');
}

export function courtCount(match: Match): number {
  return match.slots.filter((s) => s.kind === 'court' && s.playerId !== null).length;
}

export const T0 = 1_700_000_000_000;
export const MIN = 60_000;
