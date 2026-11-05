// viewBox and projection per orientation (design.md D6; portrait reworked in D1 of
// phone-fit-and-restart-match).
//
// The court is 40 x 20 units with a 1-unit margin. Court slots use normalized
// coordinates (x along the length, 0 = own goal; y along the width, 0 = left of
// the attacking direction) and are projected with `toView`. Bench slots are laid
// out in columns of cells to the right of the court in both orientations: 3 cells
// per column in landscape (court height 20), 6 in portrait (court height 40).
// Columns fill top to bottom, and a new column is added when one is full.
//
// The SVG fills everything between the top of the screen and the clock bar: there is no
// top bar, the menu button floats over the board's top-left corner (design.md D2).
//
// Touch target math (spec court-lineup "Alvos de toque adequados"):
//   Worst supported case is a 360 x 740 CSS px phone in portrait. The SVG area is
//   740 - CLOCK_BAR_PX (64) = 676 px tall and 360 px wide.
//   The portrait viewBox is 29 x 43, so the scale is min(360 / 29, 676 / 43)
//   = min(12.41, 15.72) = 12.41 px per unit (width-limited).
//   HIT_RADIUS = 2.0 gives 2 * 2.0 * 12.41 = 49.7 px. The visible circle is a bit
//   smaller (TOKEN_RADIUS = 1.6, 39.7 px) and an invisible hit circle carries the target.
//   Above 6 bench cells portrait gets a second column (width 34): 360 / 34 = 10.59 px per
//   unit, 42.4 px targets (spec "Banco com muitas reservas em retrato" asks for 40 px or more).
//   iPhone 15 Safari portrait, 393 x 659: SVG area 393 x 595, scale min(13.55, 13.84) = 13.55,
//   court 271 x 542 px, drawing height 583 px = 97.9 % of the area.
//   Landscape on a 740 x 360 phone: (360 - 64) / 22 = 13.45 px per unit, 53.8 px.
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

/** Height of the clock bar below the SVG. Applied to CSS as a custom property by main.ts. */
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

/**
 * Base sizes; the bench width grows when more columns are needed. Portrait is 29 x 43 rather
 * than the 29 x 42 of design.md D1: one extra unit below the court keeps the time label of the
 * goalkeeper at her default spot (baseline at 42.25) inside the viewBox when the screen is
 * height-limited, as on a tablet in portrait.
 */
const LANDSCAPE_MIN = { width: 52, height: 22 };
const PORTRAIT_MIN = { width: 29, height: 43 };

/** Cells per bench column: as many as fit along the court's vertical side (3 in landscape, 6 in portrait). */
const LANDSCAPE_ROWS = Math.floor(COURT_WIDTH / BENCH_CELL_H);
const PORTRAIT_ROWS = Math.floor(COURT_LENGTH / BENCH_CELL_H);

function courtSize(orientation: Orientation): { w: number; h: number } {
  return orientation === 'landscape' ? { w: COURT_LENGTH, h: COURT_WIDTH } : { w: COURT_WIDTH, h: COURT_LENGTH };
}

function rowsPerColumn(orientation: Orientation): number {
  return orientation === 'landscape' ? LANDSCAPE_ROWS : PORTRAIT_ROWS;
}

export function currentOrientation(): Orientation {
  return globalThis.matchMedia?.('(orientation: portrait)').matches ? 'portrait' : 'landscape';
}

/** Layout for an orientation and a number of bench cells (reserves + 1 for the add control). */
export function computeLayout(orientation: Orientation, benchCells: number): Layout {
  const cells = Math.max(1, benchCells);
  const court = courtSize(orientation);
  const base = orientation === 'landscape' ? LANDSCAPE_MIN : PORTRAIT_MIN;
  const cols = Math.ceil(cells / rowsPerColumn(orientation));
  const benchX = MARGIN + court.w + BENCH_GAP;
  const width = Math.max(base.width, benchX + cols * BENCH_CELL_W + MARGIN);
  const height = base.height;
  return {
    orientation,
    width,
    height,
    court: { x: MARGIN, y: MARGIN, w: court.w, h: court.h },
    bench: { x: benchX - 1, y: -OUTSIDE, w: width - benchX + 1 + OUTSIDE, h: height + 2 * OUTSIDE },
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
 * Landscape: own goal on the left, attacking right. Portrait: own goal at the bottom,
 * attacking up; "left of the attacking direction" stays on the left.
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

/** Centre of the bench cell at `index` (0-based). Both orientations fill columns top to bottom, right of the court. */
export function benchCell(index: number, layout: Layout): Point {
  const rows = rowsPerColumn(layout.orientation);
  const col = Math.floor(index / rows);
  const row = index % rows;
  return {
    x: layout.court.x + layout.court.w + BENCH_GAP + (col + 0.5) * BENCH_CELL_W,
    y: MARGIN + HIT_RADIUS + row * BENCH_CELL_H,
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
