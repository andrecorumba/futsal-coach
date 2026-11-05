import { describe, expect, it } from 'vitest';
import type { Match } from '../src/state/model';
import { reduce, type DropTarget } from '../src/state/reducer';
import { IMPORT_ERRORS } from '../src/state/storage';
import { lineupFilename, matchFilename, slugify } from '../src/view/files';
import { t } from '../src/view/i18n';
import { historyLine, historyLines, summaryRows } from '../src/view/summary';
import { idOf, MIN, namedMatch, slotIdOf, T0 } from './helpers';

const drop = (m: Match, name: string, target: DropTarget, now: number): Match =>
  reduce(m, { type: 'dropOn', fromSlotId: slotIdOf(m, name), target, now });

describe('menu summary (spec playing-time "Resumo de tempos", task 8.1)', () => {
  it('lists every roster player by playing time descending, marking who is on court', () => {
    let m = reduce(namedMatch(), { type: 'startClock', now: T0 });
    // Lia replaces Duda after 2 minutes; at 5 minutes Lia has 3, Duda 2, the others 5; the rest of the bench 0.
    m = drop(m, 'Lia', { kind: 'slot', slotId: slotIdOf(m, 'Duda') }, T0 + 2 * MIN);
    const rows = summaryRows(m, T0 + 5 * MIN);
    expect(rows).toHaveLength(m.roster.length);
    expect(rows.map((r) => r.name)).toEqual(['Ana', 'Carla', 'Bia', 'Eva', 'Lia', 'Duda', 'Mia', 'Nina', 'Olga']);
    expect(rows.map((r) => r.playingMs)).toEqual([5, 5, 5, 5, 3, 2, 0, 0, 0].map((n) => n * MIN));
    expect(rows.filter((r) => r.onCourt).map((r) => r.name).sort()).toEqual(['Ana', 'Bia', 'Carla', 'Eva', 'Lia']);
  });

  it('keeps roster order for equal times', () => {
    const m = namedMatch();
    expect(summaryRows(m, T0).map((r) => r.name)).toEqual(m.roster.map((p) => p.name));
  });
});

describe('menu history (spec substitutions "Consultar histórico")', () => {
  it('formats substitutions, removals and entries with the name snapshots', () => {
    expect(historyLine({ period: 1, elapsedMs: 440_999, outPlayerId: 'a', inPlayerId: 'b', outName: 'Duda', inName: 'Lia' })).toBe(
      '1T 07:20 - saiu Duda, entrou Lia',
    );
    expect(historyLine({ period: 2, elapsedMs: 90_000, outPlayerId: 'a', inPlayerId: null, outName: 'Eva', inName: '' })).toBe(
      '2T 01:30 - saiu Eva',
    );
    expect(historyLine({ period: 1, elapsedMs: 0, outPlayerId: null, inPlayerId: 'b', outName: '', inName: '' })).toBe(
      `1T 00:00 - entrou ${t.unnamed}`,
    );
  });

  it('lists the history in chronological order and survives deleting a reserve', () => {
    let m = reduce(namedMatch(), { type: 'startClock', now: T0 });
    m = drop(m, 'Lia', { kind: 'slot', slotId: slotIdOf(m, 'Duda') }, T0 + MIN);
    m = drop(m, 'Eva', { kind: 'bench' }, T0 + 3 * MIN);
    m = reduce(m, { type: 'setPeriod', period: 2, now: T0 + 4 * MIN });
    m = reduce(m, { type: 'startClock', now: T0 + 5 * MIN });
    m = drop(m, 'Mia', { kind: 'court', x: 0.5, y: 0.5 }, T0 + 6 * MIN);
    m = reduce(m, { type: 'removeReserve', slotId: slotIdOf(m, 'Duda') });
    expect(() => idOf(m, 'Duda')).toThrow();
    expect(historyLines(m)).toEqual(['1T 01:00 - saiu Duda, entrou Lia', '1T 03:00 - saiu Eva', '2T 01:00 - entrou Mia']);
  });
});

describe('export filenames (task 8.3)', () => {
  it('names match files futsal-partida-YYYYMMDD-HHMM.json in local time', () => {
    expect(matchFilename(new Date(2026, 10, 5, 9, 7))).toBe('futsal-partida-20261105-0907.json');
  });

  it('names lineup files futsal-escalacao-<nome>.json with a safe slug', () => {
    expect(lineupFilename('Sub-9 titular')).toBe('futsal-escalacao-sub-9-titular.json');
    expect(lineupFilename('  Ação & Pivô ')).toBe('futsal-escalacao-acao-pivo.json');
    expect(lineupFilename('!!!')).toBe('futsal-escalacao-sem-nome.json');
    expect(slugify('Çaçá')).toBe('caca');
  });
});

describe('i18n (task 5.4)', () => {
  it('import errors come from i18n.ts', () => {
    expect(IMPORT_ERRORS).toBe(t.importErrors);
  });
});
