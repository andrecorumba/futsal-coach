// Pure reducer (design.md D3). Returns the same object reference when an action
// does not change anything, so the view can detect refused drops and animate a return.

import {
  COURT_SLOT_COUNT,
  findSlot,
  newClock,
  playerName,
  nextId,
  type Colors,
  type Lineup,
  type Match,
  type Period,
  type Slot,
  type Substitution,
} from './model';
import * as time from './time';

/** Where a dragged token was released, as resolved by the view (design.md D5). */
export type DropTarget =
  | { kind: 'slot'; slotId: string }
  | { kind: 'court'; x: number; y: number }
  | { kind: 'bench' }
  | { kind: 'none' };

export type Action =
  | { type: 'setName'; playerId: string; name: string }
  | { type: 'addReserve' }
  | { type: 'removeReserve'; slotId: string }
  | { type: 'dropOn'; fromSlotId: string; target: DropTarget; now: number }
  | { type: 'startClock'; now: number }
  | { type: 'pauseClock'; now: number }
  | { type: 'resetClock'; now: number }
  | { type: 'setPeriod'; period: Period; now: number }
  | { type: 'setDuration'; minutes: number }
  | { type: 'tick'; now: number }
  | { type: 'setColors'; colors: Partial<Colors> }
  | { type: 'newMatch' }
  | { type: 'loadLineup'; lineup: Lineup }
  | { type: 'importMatch'; match: Match };

export function reduce(match: Match, action: Action): Match {
  switch (action.type) {
    case 'setName':
      return setName(match, action.playerId, action.name);
    case 'addReserve':
      return addReserve(match);
    case 'removeReserve':
      return removeReserve(match, action.slotId);
    case 'dropOn':
      return dropOn(match, action.fromSlotId, action.target, action.now);
    case 'startClock':
      return time.startClock(match, action.now);
    case 'pauseClock':
      return time.pauseClock(match, action.now);
    case 'resetClock':
      return time.resetClock(match, action.now);
    case 'setPeriod':
      return time.setPeriod(match, action.period, action.now);
    case 'setDuration':
      return time.setDuration(match, action.minutes);
    case 'tick':
      return time.settle(match, action.now);
    case 'setColors':
      return { ...match, settings: { ...match.settings, ...action.colors } };
    case 'newMatch':
      return restartMatch(match);
    case 'loadLineup':
      return applyLineup(match, action.lineup);
    case 'importMatch':
      return action.match;
  }
}

// Roster editing (spec court-lineup)

function setName(match: Match, playerId: string, name: string): Match {
  const trimmed = name.trim();
  const player = match.roster.find((p) => p.id === playerId);
  if (!player || player.name === trimmed) return match;
  return { ...match, roster: match.roster.map((p) => (p.id === playerId ? { ...p, name: trimmed } : p)) };
}

function addReserve(match: Match): Match {
  const playerId = nextId('p', match.roster.map((p) => p.id));
  const slotId = nextId('bench-', match.slots.map((s) => s.id));
  return {
    ...match,
    roster: [...match.roster, { id: playerId, name: '' }],
    slots: [...match.slots, { id: slotId, kind: 'bench', playerId, x: 0, y: 0 }],
  };
}

/** Removes a bench slot and its player. Court slots are refused. */
function removeReserve(match: Match, slotId: string): Match {
  const slot = findSlot(match, slotId);
  if (!slot || slot.kind !== 'bench') return match;
  const playerId = slot.playerId;
  const playingTimeMs = { ...match.playingTimeMs };
  if (playerId !== null) delete playingTimeMs[playerId];
  return {
    ...match,
    roster: match.roster.filter((p) => p.id !== playerId),
    slots: match.slots.filter((s) => s.id !== slotId),
    playingTimeMs,
  };
}

// Drag and drop (spec substitutions)

function dropOn(input: Match, fromSlotId: string, target: DropTarget, now: number): Match {
  // A clock that already reached zero must be stopped before anyone starts accruing.
  const match = time.settle(input, now);
  const from = findSlot(match, fromSlotId);
  if (!from || from.playerId === null) return input;

  switch (target.kind) {
    case 'none':
      return input;

    case 'court':
      if (from.kind === 'court') {
        return withSlots(match, match.slots.map((s) => (s.id === from.id ? { ...s, x: target.x, y: target.y } : s)));
      }
      // Bench to free court space: take the first empty position, or refuse when the court is full.
      {
        const empty = match.slots.find((s) => s.kind === 'court' && s.playerId === null);
        return empty ? enterEmptySlot(match, from, empty, now) : input;
      }

    case 'bench':
      return from.kind === 'court' ? leaveCourt(match, from, now) : input;

    case 'slot': {
      const to = findSlot(match, target.slotId);
      if (!to || to.id === from.id) return input;
      if (from.kind === 'court' && to.kind === 'court') return swapCourtSlots(match, from, to);
      if (from.kind === 'bench' && to.kind === 'court') {
        return to.playerId === null ? enterEmptySlot(match, from, to, now) : swapBenchCourt(match, from, to, now);
      }
      if (from.kind === 'court' && to.kind === 'bench') return swapBenchCourt(match, to, from, now);
      return input; // bench onto bench: no change
    }
  }
}

function withSlots(match: Match, slots: Slot[]): Match {
  return { ...match, slots };
}

/** Two court slots exchange occupants (or one moves into an empty position). Not a substitution. */
function swapCourtSlots(match: Match, a: Slot, b: Slot): Match {
  return withSlots(
    match,
    match.slots.map((s) => {
      if (s.id === a.id) return { ...s, playerId: b.playerId };
      if (s.id === b.id) return { ...s, playerId: a.playerId };
      return s;
    }),
  );
}

/** Reserve takes the court position; the starter moves to the reserve's bench slot. */
function swapBenchCourt(match: Match, bench: Slot, court: Slot, now: number): Match {
  const inId = bench.playerId;
  const outId = court.playerId;
  let m = withSlots(
    match,
    match.slots.map((s) => {
      if (s.id === bench.id) return { ...s, playerId: outId };
      if (s.id === court.id) return { ...s, playerId: inId };
      return s;
    }),
  );
  m = transferPlayingTime(m, outId, inId, now);
  return record(m, outId, inId, now);
}

/** Reserve enters an empty court position; its bench slot disappears with it. */
function enterEmptySlot(match: Match, bench: Slot, court: Slot, now: number): Match {
  const inId = bench.playerId;
  const occupied = match.slots.filter((s) => s.kind === 'court' && s.playerId !== null).length;
  if (occupied >= COURT_SLOT_COUNT) return match;
  let m = withSlots(
    match,
    match.slots
      .filter((s) => s.id !== bench.id)
      .map((s) => (s.id === court.id ? { ...s, playerId: inId } : s)),
  );
  m = transferPlayingTime(m, null, inId, now);
  return record(m, null, inId, now);
}

/** Starter leaves the court for a new bench slot; the position stays empty. */
function leaveCourt(match: Match, court: Slot, now: number): Match {
  const outId = court.playerId;
  const benchId = nextId('bench-', match.slots.map((s) => s.id));
  let m = withSlots(match, [
    ...match.slots.map((s) => (s.id === court.id ? { ...s, playerId: null } : s)),
    { id: benchId, kind: 'bench', playerId: outId, x: 0, y: 0 },
  ]);
  m = transferPlayingTime(m, outId, null, now);
  return record(m, outId, null, now);
}

function transferPlayingTime(match: Match, outId: string | null, inId: string | null, now: number): Match {
  let m = outId === null ? match : time.consolidate(match, [outId], now);
  if (inId !== null) m = time.beginPlaying(m, [inId], now);
  return m;
}

function record(match: Match, outPlayerId: string | null, inPlayerId: string | null, now: number): Match {
  const entry: Substitution = {
    period: match.clock.period,
    elapsedMs: time.elapsedAt(match, now),
    outPlayerId,
    inPlayerId,
    outName: playerName(match, outPlayerId),
    inName: playerName(match, inPlayerId),
  };
  return { ...match, substitutions: [...match.substitutions, entry] };
}

// Match lifecycle (spec match-persistence)

/** New match from the menu: keeps names and slots, zeroes clock, times and history. */
function restartMatch(match: Match): Match {
  return {
    ...match,
    clock: newClock(match.clock.periodMinutes),
    playingTimeMs: {},
    playingSince: {},
    substitutions: [],
  };
}

/** Loads a saved lineup: roster and slots from the lineup, times, history and clock zeroed. */
function applyLineup(match: Match, lineup: Lineup): Match {
  return {
    ...restartMatch(match),
    roster: lineup.roster.map((p) => ({ ...p })),
    slots: lineup.slots.map((s) => ({ ...s })),
  };
}
