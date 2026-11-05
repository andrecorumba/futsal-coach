// Court line drawing in SVG (spec court-lineup "Linhas da quadra").
// Lines are drawn once in court metres (40 x 20, origin at the own-goal left corner)
// inside a group whose transform maps metres to the viewBox for the current layout.

import { COURT_LENGTH, COURT_WIDTH, type Layout } from './layout';
import { svgEl, setAttr } from './svg';

const CENTER_CIRCLE_R = 3;
const AREA_R = 6;
const AREA_STRAIGHT = 3.16;
const GOAL_WIDTH = 3;
const GOAL_DEPTH = 0.8;
const PENALTY_MARK = 6;
const SECOND_PENALTY_MARK = 10;

/** Matrix mapping court metres (lx along the length, ly along the width) to viewBox units. */
export function courtTransform(layout: Layout): string {
  const c = layout.court;
  if (layout.orientation === 'landscape') return `matrix(1 0 0 1 ${c.x} ${c.y})`;
  // X = c.x + ly, Y = c.y + c.h - lx  (own goal at the bottom, same mapping as toView).
  return `matrix(0 -1 1 0 ${c.x} ${c.y + c.h})`;
}

/** Penalty area path at the goal line lx = 0, opening towards +lx. */
function areaPath(): string {
  const mid = COURT_WIDTH / 2;
  const top = mid - AREA_STRAIGHT / 2;
  const bottom = mid + AREA_STRAIGHT / 2;
  return [
    `M 0 ${top - AREA_R}`,
    `A ${AREA_R} ${AREA_R} 0 0 1 ${AREA_R} ${top}`,
    `L ${AREA_R} ${bottom}`,
    `A ${AREA_R} ${AREA_R} 0 0 1 0 ${bottom + AREA_R}`,
  ].join(' ');
}

function drawHalf(g: SVGGElement): void {
  const mid = COURT_WIDTH / 2;
  svgEl('path', { d: areaPath(), class: 'court-line' }, g);
  svgEl('circle', { cx: PENALTY_MARK, cy: mid, r: 0.15, class: 'court-mark' }, g);
  svgEl('circle', { cx: SECOND_PENALTY_MARK, cy: mid, r: 0.15, class: 'court-mark' }, g);
  svgEl(
    'rect',
    { x: -GOAL_DEPTH, y: mid - GOAL_WIDTH / 2, width: GOAL_DEPTH, height: GOAL_WIDTH, class: 'court-goal' },
    g,
  );
}

/** Creates the court group. Call `updateCourt` on layout change. */
export function createCourt(): SVGGElement {
  const g = svgEl('g', { class: 'court' });
  svgEl('rect', { x: 0, y: 0, width: COURT_LENGTH, height: COURT_WIDTH, class: 'court-floor' }, g);
  svgEl('rect', { x: 0, y: 0, width: COURT_LENGTH, height: COURT_WIDTH, class: 'court-line' }, g);
  svgEl('line', { x1: COURT_LENGTH / 2, y1: 0, x2: COURT_LENGTH / 2, y2: COURT_WIDTH, class: 'court-line' }, g);
  svgEl('circle', { cx: COURT_LENGTH / 2, cy: COURT_WIDTH / 2, r: CENTER_CIRCLE_R, class: 'court-line' }, g);
  svgEl('circle', { cx: COURT_LENGTH / 2, cy: COURT_WIDTH / 2, r: 0.2, class: 'court-mark' }, g);
  drawHalf(svgEl('g', {}, g));
  // Opposite half: mirror along the length.
  drawHalf(svgEl('g', { transform: `matrix(-1 0 0 1 ${COURT_LENGTH} 0)` }, g));
  return g;
}

export function updateCourt(g: SVGGElement, layout: Layout): void {
  setAttr(g, 'transform', courtTransform(layout));
}

/** Background for the bench area. */
export function createBenchArea(): SVGRectElement {
  return svgEl('rect', { class: 'bench-area', rx: 0.6 });
}

export function updateBenchArea(rect: SVGRectElement, layout: Layout): void {
  // Visible panel: the bench drop area clipped to the viewBox, inset a little.
  const b = layout.bench;
  const x = Math.max(0, b.x);
  const y = Math.max(0, b.y);
  const w = Math.min(layout.width, b.x + b.w) - x;
  const h = Math.min(layout.height, b.y + b.h) - y;
  setAttr(rect, 'x', x + 0.5);
  setAttr(rect, 'y', y + 0.5);
  setAttr(rect, 'width', Math.max(0, w - 1));
  setAttr(rect, 'height', Math.max(0, h - 1));
}
