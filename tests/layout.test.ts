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
  TIME_OFFSET,
  TOKEN_RADIUS,
  type Layout,
} from '../src/view/layout';
import { contrastText, formatElapsed, formatRemaining, initial, truncate } from '../src/view/format';

function courtCenter(l: Layout): { x: number; y: number } {
  return { x: l.court.x + l.court.w / 2, y: l.court.y + l.court.h / 2 };
}

describe('layout: projection (task 5.1)', () => {
  it('uses the base viewBoxes for a new match (portrait 29 x 43, design.md D1 of phone-fit-and-restart-match plus one unit below)', () => {
    const portrait = computeLayout('portrait', 5);
    expect([portrait.width, portrait.height]).toEqual([29, 43]);
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
    const scale = pxPerUnit(l, 360, 740 - CLOCK_BAR_PX);
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
    const scale = pxPerUnit(l, 740, 360 - CLOCK_BAR_PX);
    expect(2 * HIT_RADIUS * scale).toBeGreaterThanOrEqual(44);
    expect(TOKEN_RADIUS).toBeLessThan(HIT_RADIUS);
  });

  it('the bench grows instead of overlapping when reserves are added', () => {
    const p = computeLayout('portrait', 12);
    expect(p.width).toBeGreaterThan(29);
    expect(p.height).toBe(43);
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

describe('layout: portrait bench beside the court (task 2.1, spec "Disposição em paisagem e retrato")', () => {
  const inViewBox = (c: { x: number; y: number }, l: Layout) =>
    c.x - HIT_RADIUS >= 0 && c.x + HIT_RADIUS <= l.width && c.y - HIT_RADIUS >= 0 && c.y + HIT_RADIUS <= l.height;
  const rightOfCourt = (c: { x: number; y: number }, l: Layout) => c.x - HIT_RADIUS >= l.court.x + l.court.w;

  it('5 cells (4 reserves + add): one column right of the court, filled top to bottom', () => {
    const l = computeLayout('portrait', 5);
    expect([l.width, l.height]).toEqual([29, 43]);
    const cells = Array.from({ length: 5 }, (_, i) => benchCell(i, l));
    expect(cells).toEqual([
      { x: 25.5, y: 3 },
      { x: 25.5, y: 9 },
      { x: 25.5, y: 15 },
      { x: 25.5, y: 21 },
      { x: 25.5, y: 27 },
    ]);
    for (const c of cells) {
      expect(rightOfCourt(c, l)).toBe(true);
      expect(inViewBox(c, l)).toBe(true);
    }
    // The drop area starts right after the court and covers the column.
    expect(l.bench.x).toBe(22);
    for (const c of cells) expect(c.x >= l.bench.x && c.y >= l.bench.y && c.y <= l.bench.y + l.bench.h).toBe(true);
  });

  it('8 cells: a second column above 6 cells, viewBox 34 x 43', () => {
    const l = computeLayout('portrait', 8);
    expect([l.width, l.height]).toEqual([34, 43]);
    expect(benchCell(5, l)).toEqual({ x: 25.5, y: 33 });
    expect(benchCell(6, l)).toEqual({ x: 30.5, y: 3 });
    expect(benchCell(7, l)).toEqual({ x: 30.5, y: 9 });
    const cells = Array.from({ length: 8 }, (_, i) => benchCell(i, l));
    for (const c of cells) {
      expect(rightOfCourt(c, l)).toBe(true);
      expect(inViewBox(c, l)).toBe(true);
    }
    for (let i = 0; i < cells.length; i++)
      for (let j = i + 1; j < cells.length; j++)
        expect(Math.hypot(cells[i]!.x - cells[j]!.x, cells[i]!.y - cells[j]!.y)).toBeGreaterThanOrEqual(2 * HIT_RADIUS);
  });

  it('labels of the default lineup stay inside the viewBox in both orientations', () => {
    const m = newMatch();
    for (const o of ['landscape', 'portrait'] as const) {
      const l = layoutFor(o, m.slots);
      for (const c of slotCenters(m.slots, l).values()) expect(c.y + TIME_OFFSET).toBeLessThanOrEqual(l.height);
    }
  });

  it('6 cells still fit in one column', () => {
    expect(computeLayout('portrait', 6).width).toBe(29);
    expect(computeLayout('portrait', 7).width).toBe(34);
  });

  it('the initial layout uses the add-control cell right after the last reserve', () => {
    const m = newMatch();
    const l = layoutFor('portrait', m.slots);
    expect(l.benchCells).toBe(5);
    expect(slotCenters(m.slots, l).get('bench-4')).toEqual(benchCell(3, l));
  });

  it('Preencher a tela do iPhone 15: 393 x 659 gives a court of 250 px or more and 90 % or more of the height', () => {
    const l = layoutFor('portrait', newMatch().slots);
    const boxW = 393;
    const boxH = 659 - CLOCK_BAR_PX;
    const scale = pxPerUnit(l, boxW, boxH);
    expect(l.court.w * scale).toBeGreaterThanOrEqual(250);
    expect((l.height * scale) / boxH).toBeGreaterThanOrEqual(0.9);
    expect(l.width * scale).toBeLessThanOrEqual(boxW + 1e-9);
  });

  it('Banco com muitas reservas em retrato: two columns at 360 px wide keep 40 px targets', () => {
    const l = computeLayout('portrait', 12);
    expect(l.width).toBe(34);
    expect(2 * HIT_RADIUS * pxPerUnit(l, 360, 740 - CLOCK_BAR_PX)).toBeGreaterThanOrEqual(40);
  });

  it('landscape is unchanged: bench column right of the court, 3 cells per column', () => {
    expect([computeLayout('landscape', 3).width, computeLayout('landscape', 3).height]).toEqual([52, 22]);
    const l = computeLayout('landscape', 5);
    expect([l.width, l.height]).toEqual([54, 22]);
    expect(benchCell(0, l)).toEqual({ x: 45.5, y: 3 });
    expect(benchCell(3, l)).toEqual({ x: 50.5, y: 3 });
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
