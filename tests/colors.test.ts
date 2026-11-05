import { describe, expect, it } from 'vitest';
import { colorFor } from '../src/state/colors';
import { newMatch, type Match, type Slot } from '../src/state/model';
import { reduce, type Action } from '../src/state/reducer';
import { deepFreeze, idOf, MIN, namedMatch, slotIdOf, T0 } from './helpers';

const BLUE = '#1e88e5';
const PURPLE = '#b39ddb';
const YELLOW = '#fdd835';

function run(match: Match, ...actions: Action[]): Match {
  return actions.reduce((m, a) => deepFreeze(reduce(m, a)), match);
}

/** Colour of the token that holds the named player, as tokens.ts computes it. */
function colorOf(m: Match, name: string): string {
  const id = idOf(m, name);
  const slot = m.slots.find((s) => s.playerId === id)!;
  return colorFor(m, slot, m.roster.find((p) => p.id === id)!);
}

const swap = (m: Match, from: string, onto: string, now = T0): Match =>
  run(m, { type: 'dropOn', fromSlotId: slotIdOf(m, from), target: { kind: 'slot', slotId: slotIdOf(m, onto) }, now });

describe('team-colors: colorFor (task 4.1)', () => {
  it('Partida nova: bench tokens light purple, court tokens blue, goalkeeper yellow', () => {
    const m = namedMatch();
    for (const s of m.slots) {
      const expected = s.kind === 'bench' ? PURPLE : s.position === 'GL' ? YELLOW : BLUE;
      expect(colorFor(m, s, m.roster.find((p) => p.id === s.playerId)!)).toBe(expected);
    }
  });

  it('Reserva em quadra: after kickoff Lia entering a non-goalkeeper slot uses the reserve colour', () => {
    const m = swap(run(namedMatch(), { type: 'startClock', now: T0 }), 'Lia', 'Duda', T0 + MIN);
    expect(colorOf(m, 'Lia')).toBe(PURPLE);
  });

  it('Titular no banco após sair: Duda on the bench after kickoff keeps the starters colour', () => {
    const m = swap(run(namedMatch(), { type: 'startClock', now: T0 }), 'Lia', 'Duda', T0 + MIN);
    expect(colorOf(m, 'Duda')).toBe(BLUE);
  });

  it('Reserva no gol: Lia in the goalkeeper slot uses the goalkeeper colour; Ana on the bench uses the starters colour', () => {
    const m = swap(run(namedMatch(), { type: 'startClock', now: T0 }), 'Lia', 'Ana', T0 + MIN);
    expect(colorOf(m, 'Lia')).toBe(YELLOW);
    expect(colorOf(m, 'Ana')).toBe(BLUE);
  });

  it('Antes do apito o papel segue o lugar: Lia is blue on court and purple again back on the bench', () => {
    let m = swap(namedMatch(), 'Lia', 'Duda');
    expect(colorOf(m, 'Lia')).toBe(BLUE);
    expect(colorOf(m, 'Duda')).toBe(PURPLE);
    m = swap(m, 'Duda', 'Lia');
    expect(colorOf(m, 'Lia')).toBe(PURPLE);
    expect(colorOf(m, 'Duda')).toBe(BLUE);
  });

  it('Alterar cores: new starters, reserves and goalkeeper colours apply to every matching token', () => {
    let m = swap(run(namedMatch(), { type: 'startClock', now: T0 }), 'Lia', 'Duda', T0 + MIN);
    m = run(m, { type: 'setColors', colors: { lineColor: '#000001', reserveColor: '#000002', gkColor: '#000003' } });
    expect(colorOf(m, 'Duda')).toBe('#000001');
    expect(colorOf(m, 'Carla')).toBe('#000001');
    expect(colorOf(m, 'Lia')).toBe('#000002');
    expect(colorOf(m, 'Mia')).toBe('#000002');
    expect(colorOf(m, 'Ana')).toBe('#000003');
  });

  it('an empty-role player on an arbitrary slot follows the slot kind', () => {
    const m = newMatch();
    const bench: Slot = { id: 'b', kind: 'bench', playerId: 'x', x: 0, y: 0 };
    const court: Slot = { id: 'c', kind: 'court', position: 'PV', playerId: 'x', x: 0, y: 0 };
    expect(colorFor(m, bench, { role: null })).toBe(PURPLE);
    expect(colorFor(m, court, { role: null })).toBe(BLUE);
    expect(colorFor(m, bench, { role: 'starter' })).toBe(BLUE);
    expect(colorFor(m, court, { role: 'reserve' })).toBe(PURPLE);
  });
});
