// viewBox and projection per orientation (design.md D6).
//
// The court is 40 x 20 units with a 1-unit margin. Court slots use normalized
// coordinates (x along the length, 0 = own goal; y along the width, 0 = left of
// the attacking direction) and are projected with `toView`. Bench slots are laid
// out in a grid of cells next to (landscape) or below (portrait) the court.
//
// Touch target math (spec court-lineup "Alvos de toque adequados"):
//   Worst supported case is a 360 x 740 CSS px phone in portrait. The SVG area is
//   740 - TOP_BAR_PX (44) - CLOCK_BAR_PX (64) = 632 px tall and 360 px wide.
//   The portrait viewBox is 22 x 56, so the scale is min(360 / 22, 632 / 56)
//   = min(16.36, 11.29) = 11.29 px per unit (height-limited).
//   A 44 px target therefore needs 44 / 11.29 = 3.90 units, i.e. a radius of 1.95.
//   HIT_RADIUS = 2.0 gives 2 * 2.0 * 11.29 = 45.1 px. The visible circle is a bit
//   smaller (TOKEN_RADIUS = 1.6, 36 px) and an invisible hit circle carries the target.
//   Landscape on a 740 x 360 phone: (360 - 108) / 22 = 11.45 px per unit, 45.8 px.
//   Bench cells are 5 x 6 units, so neighbouring 4-unit hit circles never overlap.
//   `tests/layout.test.ts` checks these numbers.

import type { Slot } from '../state/model';

export type Orientation = 'landscape' | 'portrait';

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Layout {
  orientation: Orientation;
  /** viewBox size; origin is always 0,0. */
  width: number;
  height: number;
  /** Court rectangle in viewBox units. */
  court: Rect;
  /**
   * Bench drop area in viewBox units. It extends past the viewBox on the outer sides,
   * so a release in the letterbox strip beside the bench still counts as the bench;
   * releases outside the SVG element itself are filtered by the caller.
   */
  bench: Rect;
  /** Number of bench cells laid out (reserves plus the add control). */
  benchCells: number;
}

/** Heights of the HTML bars around the SVG. Applied to CSS as custom properties by main.ts. */
export const TOP_BAR_PX = 44;
export const CLOCK_BAR_PX = 64;

export const COURT_LENGTH = 40;
export const COURT_WIDTH = 20;
const MARGIN = 1;
/** How far the bench drop area extends beyond the viewBox (letterboxing). */
const OUTSIDE = 1000;

export const TOKEN_RADIUS = 1.6;
export const HIT_RADIUS = 2.0;
/** Name and time label offsets below the token centre, and font sizes, in units. */
export const NAME_OFFSET = TOKEN_RADIUS + 1.1;
export const TIME_OFFSET = TOKEN_RADIUS + 2.05;
export const NAME_FONT = 1.0;
export const TIME_FONT = 0.85;
export const INNER_FONT = 1.25;

export const BENCH_CELL_W = 5;
export const BENCH_CELL_H = 6;
/** Gap between court and bench (court edge to bench origin). */
const BENCH_GAP = 2;

/** Base sizes from design.md D6; the bench dimension grows when more cells are needed. */
const LANDSCAPE_MIN = { width: 52, height: 22 };
const PORTRAIT_MIN = { width: 22, height: 56 };

/** Portrait: 4 columns across the 20-unit court width. Landscape: 3 rows down the 20-unit court height. */
const PORTRAIT_COLS = Math.floor(COURT_WIDTH / BENCH_CELL_W);
const LANDSCAPE_ROWS = Math.floor(COURT_WIDTH / BENCH_CELL_H);

export function currentOrientation(): Orientation {
  return globalThis.matchMedia?.('(orientation: portrait)').matches ? 'portrait' : 'landscape';
}

/** Layout for an orientation and a number of bench cells (reserves + 1 for the add control). */
export function computeLayout(orientation: Orientation, benchCells: number): Layout {
  const cells = Math.max(1, benchCells);
  if (orientation === 'landscape') {
    const cols = Math.ceil(cells / LANDSCAPE_ROWS);
    const benchX = MARGIN + COURT_LENGTH + BENCH_GAP;
    const width = Math.max(LANDSCAPE_MIN.width, benchX + cols * BENCH_CELL_W + MARGIN);
    const height = LANDSCAPE_MIN.height;
    return {
      orientation,
      width,
      height,
      court: { x: MARGIN, y: MARGIN, w: COURT_LENGTH, h: COURT_WIDTH },
      bench: { x: benchX - 1, y: -OUTSIDE, w: width - benchX + 1 + OUTSIDE, h: height + 2 * OUTSIDE },
      benchCells: cells,
    };
  }
  const rows = Math.ceil(cells / PORTRAIT_COLS);
  const benchY = MARGIN + COURT_LENGTH + BENCH_GAP;
  const width = PORTRAIT_MIN.width;
  const height = Math.max(PORTRAIT_MIN.height, benchY + rows * BENCH_CELL_H + MARGIN);
  return {
    orientation,
    width,
    height,
    court: { x: MARGIN, y: MARGIN, w: COURT_WIDTH, h: COURT_LENGTH },
    bench: { x: -OUTSIDE, y: benchY - 1, w: width + 2 * OUTSIDE, h: height - benchY + 1 + OUTSIDE },
    benchCells: cells,
  };
}

/** Layout for a list of slots: one bench cell per bench slot plus the add control. */
export function layoutFor(orientation: Orientation, slots: readonly Slot[]): Layout {
  return computeLayout(orientation, slots.filter((s) => s.kind === 'bench').length + 1);
}

export function viewBoxOf(layout: Layout): string {
  return `0 0 ${layout.width} ${layout.height}`;
}

/**
 * Projects normalized court coordinates into the viewBox.
 * Landscape: own goal on the left, attacking right. Portrait: own goal at the bottom
 * (next to the bench), attacking up; "left of the attacking direction" stays on the left.
 */
export function toView(slot: Pick<Slot, 'x' | 'y'>, layout: Layout): Point {
  const c = layout.court;
  if (layout.orientation === 'landscape') return { x: c.x + slot.x * c.w, y: c.y + slot.y * c.h };
  return { x: c.x + slot.y * c.w, y: c.y + c.h - slot.x * c.h };
}

/** Inverse of `toView`, clamped so a token dropped at the edge stays fully inside the court. */
export function fromView(p: Point, layout: Layout): { x: number; y: number } {
  const c = layout.court;
  let x: number;
  let y: number;
  if (layout.orientation === 'landscape') {
    x = (p.x - c.x) / c.w;
    y = (p.y - c.y) / c.h;
  } else {
    x = (c.y + c.h - p.y) / c.h;
    y = (p.x - c.x) / c.w;
  }
  const insetX = TOKEN_RADIUS / COURT_LENGTH;
  const insetY = TOKEN_RADIUS / COURT_WIDTH;
  return { x: clamp(x, insetX, 1 - insetX), y: clamp(y, insetY, 1 - insetY) };
}

/** Centre of the bench cell at `index` (0-based). Landscape fills columns top to bottom; portrait fills rows left to right. */
export function benchCell(index: number, layout: Layout): Point {
  if (layout.orientation === 'landscape') {
    const col = Math.floor(index / LANDSCAPE_ROWS);
    const row = index % LANDSCAPE_ROWS;
    return {
      x: MARGIN + COURT_LENGTH + BENCH_GAP + (col + 0.5) * BENCH_CELL_W,
      y: MARGIN + HIT_RADIUS + row * BENCH_CELL_H,
    };
  }
  const col = index % PORTRAIT_COLS;
  const row = Math.floor(index / PORTRAIT_COLS);
  return {
    x: MARGIN + (col + 0.5) * BENCH_CELL_W,
    y: MARGIN + COURT_LENGTH + BENCH_GAP + HIT_RADIUS + row * BENCH_CELL_H,
  };
}

/** Centre of every slot in the viewBox, keyed by slot id. Bench order follows the slots array. */
export function slotCenters(slots: readonly Slot[], layout: Layout): Map<string, Point> {
  const out = new Map<string, Point>();
  let bench = 0;
  for (const s of slots) out.set(s.id, s.kind === 'court' ? toView(s, layout) : benchCell(bench++, layout));
  return out;
}

/** Position of the "add reserve" control: the cell after the last reserve. */
export function addControlCenter(slots: readonly Slot[], layout: Layout): Point {
  return benchCell(slots.filter((s) => s.kind === 'bench').length, layout);
}

export function insideRect(p: Point, r: Rect): boolean {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}

/** CSS px per viewBox unit when the SVG (meet) fills a box of the given size. */
export function pxPerUnit(layout: Layout, boxWidth: number, boxHeight: number): number {
  return Math.min(boxWidth / layout.width, boxHeight / layout.height);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
