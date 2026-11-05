import { describe, expect, it } from 'vitest';
import { newMatch } from '../src/state/model';
import {
  benchCell,
  CLOCK_BAR_PX,
  computeLayout,
  fromView,
  HIT_RADIUS,
  layoutFor,
  pxPerUnit,
  slotCenters,
  toView,
  TOKEN_RADIUS,
  TOP_BAR_PX,
  type Layout,
} from '../src/view/layout';
import { contrastText, formatElapsed, formatRemaining, initial, truncate } from '../src/view/format';

function courtCenter(l: Layout): { x: number; y: number } {
  return { x: l.court.x + l.court.w / 2, y: l.court.y + l.court.h / 2 };
}

describe('layout: projection (task 5.1)', () => {
  it('uses the design.md D6 viewBoxes for a new match', () => {
    const portrait = computeLayout('portrait', 5);
    expect([portrait.width, portrait.height]).toEqual([22, 56]);
    expect(portrait.court).toEqual({ x: 1, y: 1, w: 20, h: 40 });
    const landscape = computeLayout('landscape', 3);
    expect([landscape.width, landscape.height]).toEqual([52, 22]);
    expect(landscape.court).toEqual({ x: 1, y: 1, w: 40, h: 20 });
  });

  it('a slot at (0.5, 0.5) projects to the court centre in both orientations', () => {
    for (const o of ['landscape', 'portrait'] as const) {
      const l = computeLayout(o, 5);
      expect(toView({ x: 0.5, y: 0.5 }, l)).toEqual(courtCenter(l));
    }
  });

  it('portrait puts the own goal at the bottom and keeps left on the left', () => {
    const l = computeLayout('portrait', 5);
    expect(toView({ x: 0, y: 0 }, l)).toEqual({ x: 1, y: 41 });
    expect(toView({ x: 1, y: 1 }, l)).toEqual({ x: 21, y: 1 });
  });

  it('fromView inverts toView inside the court', () => {
    for (const o of ['landscape', 'portrait'] as const) {
      const l = computeLayout(o, 5);
      const p = fromView(toView({ x: 0.3, y: 0.7 }, l), l);
      expect(p.x).toBeCloseTo(0.3);
      expect(p.y).toBeCloseTo(0.7);
    }
  });

  it('bench cells are outside the court', () => {
    for (const o of ['landscape', 'portrait'] as const) {
      const l = computeLayout(o, 5);
      for (let i = 0; i < 5; i++) {
        const c = benchCell(i, l);
        const insideCourt =
          c.x + HIT_RADIUS > l.court.x && c.x - HIT_RADIUS < l.court.x + l.court.w &&
          c.y + HIT_RADIUS > l.court.y && c.y - HIT_RADIUS < l.court.y + l.court.h;
        expect(insideCourt).toBe(false);
        expect(c.x + HIT_RADIUS).toBeLessThanOrEqual(l.width);
        expect(c.y + HIT_RADIUS).toBeLessThanOrEqual(l.height);
      }
    }
  });
});

describe('layout: touch targets (task 5.3, spec "Tela pequena")', () => {
  it('360 x 740 portrait keeps 44 px targets with no overlap in the initial layout', () => {
    const m = newMatch();
    const l = layoutFor('portrait', m.slots);
    const scale = pxPerUnit(l, 360, 740 - TOP_BAR_PX - CLOCK_BAR_PX);
    expect(2 * HIT_RADIUS * scale).toBeGreaterThanOrEqual(44);
    const centers = [...slotCenters(m.slots, l).values(), benchCell(4, l)];
    for (let i = 0; i < centers.length; i++) {
      for (let j = i + 1; j < centers.length; j++) {
        const d = Math.hypot(centers[i]!.x - centers[j]!.x, centers[i]!.y - centers[j]!.y);
        expect(d).toBeGreaterThanOrEqual(2 * HIT_RADIUS);
      }
    }
  });

  it('740 x 360 landscape keeps 44 px targets', () => {
    const l = layoutFor('landscape', newMatch().slots);
    const scale = pxPerUnit(l, 740, 360 - TOP_BAR_PX - CLOCK_BAR_PX);
    expect(2 * HIT_RADIUS * scale).toBeGreaterThanOrEqual(44);
    expect(TOKEN_RADIUS).toBeLessThan(HIT_RADIUS);
  });

  it('the bench grows instead of overlapping when reserves are added', () => {
    const p = computeLayout('portrait', 12);
    expect(p.height).toBeGreaterThan(56);
    const l = computeLayout('landscape', 12);
    expect(l.width).toBeGreaterThan(52);
    for (const layout of [p, l]) {
      const cells = Array.from({ length: 12 }, (_, i) => benchCell(i, layout));
      for (let i = 0; i < cells.length; i++)
        for (let j = i + 1; j < cells.length; j++)
          expect(Math.hypot(cells[i]!.x - cells[j]!.x, cells[i]!.y - cells[j]!.y)).toBeGreaterThanOrEqual(2 * HIT_RADIUS);
    }
  });
});

describe('format', () => {
  it('formats times and names', () => {
    expect(formatElapsed(12 * 60_000 + 40_999)).toBe('12:40');
    expect(formatRemaining(20 * 60_000 - 3_000)).toBe('19:57');
    expect(formatRemaining(20 * 60_000 - 2_500)).toBe('19:58');
    expect(formatRemaining(0)).toBe('00:00');
    expect(truncate('Maria Eduarda')).toBe('Maria Edua…');
    expect(truncate('Duda')).toBe('Duda');
    expect(initial(' lia')).toBe('L');
    expect(initial('')).toBe('');
    expect(contrastText('#ffffff')).toBe('#111111');
    expect(contrastText('#fdd835')).toBe('#111111');
    expect(contrastText('#0d47a1')).toBe('#ffffff');
  });
});
