// Pointer events and drop target resolution (design.md D5).

import type { Slot } from '../state/model';
import type { DropTarget } from '../state/reducer';
import { fromView, HIT_RADIUS, insideRect, slotCenters, type Layout, type Point } from './layout';

/** Movement (CSS px) under which a press is a tap rather than a drag. */
export const TAP_TOLERANCE_PX = 8;

/**
 * Resolves where a token released at `point` (viewBox units) lands. Pure.
 *  1. Within the hit radius of another token or empty court marker: that slot (nearest wins).
 *  2. Inside the court rectangle: free court point (normalized x, y).
 *  3. Inside the bench rectangle: the bench.
 *  4. Anywhere else: none (cancel).
 */
export function resolveTarget(
  point: Point,
  slots: readonly Slot[],
  layout: Layout,
  draggedSlotId?: string,
): DropTarget {
  const centers = slotCenters(slots, layout);
  let best: { id: string; d: number } | null = null;
  for (const s of slots) {
    if (s.id === draggedSlotId) continue;
    const c = centers.get(s.id);
    if (!c) continue;
    const d = Math.hypot(point.x - c.x, point.y - c.y);
    if (d <= HIT_RADIUS && (best === null || d < best.d)) best = { id: s.id, d };
  }
  if (best) return { kind: 'slot', slotId: best.id };
  if (insideRect(point, layout.court)) return { kind: 'court', ...fromView(point, layout) };
  if (insideRect(point, layout.bench)) return { kind: 'bench' };
  return { kind: 'none' };
}

export interface DragOptions {
  svg: SVGSVGElement;
  /** Layer holding the token groups; the dragged group is moved to its end. */
  layer: SVGGElement;
  /** Current centre of a slot in viewBox units. */
  centerOf(slotId: string): Point | undefined;
  onTap(slotId: string, group: SVGGElement): void;
  /**
   * Called on release after a drag with the token centre (viewBox units) where it was
   * dropped and whether the pointer was released over the SVG element at all.
   */
  onDrop(slotId: string, dropCenter: Point, overSvg: boolean): void;
}

interface Gesture {
  pointerId: number;
  slotId: string;
  group: SVGGElement;
  startClient: Point;
  /** Pointer position minus token centre, viewBox units. */
  offset: Point;
  center: Point;
  dragging: boolean;
}

/** Swallows the click event that a browser may synthesize right after a pointerup. */
function suppressNextClick(): void {
  const stop = (ev: MouseEvent): void => {
    ev.stopPropagation();
    ev.preventDefault();
    cleanup();
  };
  const cleanup = (): void => {
    window.removeEventListener('click', stop, true);
    clearTimeout(timer);
  };
  window.addEventListener('click', stop, true);
  const timer = setTimeout(cleanup, 400);
}

/** Converts client (CSS px) coordinates to viewBox units. */
export function clientToView(svg: SVGSVGElement, clientX: number, clientY: number): Point {
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: clientX, y: clientY };
  const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
  return { x: p.x, y: p.y };
}

/**
 * Wires drag and tap on tokens. Move and up are listened on `window`, which receives
 * them whether or not pointer capture works (iOS Safari fallback, design.md risks).
 * Returns a function that removes the listeners.
 */
export function attachDrag(opts: DragOptions): () => void {
  let g: Gesture | null = null;

  const onDown = (ev: PointerEvent): void => {
    if (g || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
    const group = (ev.target as Element | null)?.closest<SVGGElement>('g.token[data-slot-id]');
    if (!group || !opts.layer.contains(group)) return;
    const slotId = group.dataset.slotId!;
    const center = opts.centerOf(slotId);
    if (!center) return;
    ev.preventDefault();
    const p = clientToView(opts.svg, ev.clientX, ev.clientY);
    g = {
      pointerId: ev.pointerId,
      slotId,
      group,
      startClient: { x: ev.clientX, y: ev.clientY },
      offset: { x: p.x - center.x, y: p.y - center.y },
      center,
      dragging: false,
    };
    try {
      group.setPointerCapture(ev.pointerId);
    } catch {
      // Window listeners below still receive the events.
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
  };

  const onMove = (ev: PointerEvent): void => {
    if (!g || ev.pointerId !== g.pointerId) return;
    if (!g.dragging) {
      const moved = Math.hypot(ev.clientX - g.startClient.x, ev.clientY - g.startClient.y);
      if (moved < TAP_TOLERANCE_PX) return;
      g.dragging = true;
      g.group.getAnimations().forEach((a) => a.cancel());
      opts.layer.appendChild(g.group);
      g.group.classList.add('dragging');
    }
    const p = clientToView(opts.svg, ev.clientX, ev.clientY);
    g.center = { x: p.x - g.offset.x, y: p.y - g.offset.y };
    g.group.style.transform = `translate(${g.center.x}px, ${g.center.y}px)`;
  };

  const finish = (): Gesture | null => {
    const done = g;
    g = null;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onCancel);
    if (done) {
      done.group.classList.remove('dragging');
      try {
        if (done.group.hasPointerCapture(done.pointerId)) done.group.releasePointerCapture(done.pointerId);
      } catch {
        // ignore
      }
    }
    return done;
  };

  const onUp = (ev: PointerEvent): void => {
    if (!g || ev.pointerId !== g.pointerId) return;
    const done = finish();
    if (!done) return;
    // The compatibility click that follows a touch would otherwise hit whatever opens
    // under the finger (the name editor's confirm button) or sits under the drop point.
    suppressNextClick();
    if (done.dragging) {
      const r = opts.svg.getBoundingClientRect();
      const over = ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
      opts.onDrop(done.slotId, done.center, over);
    } else {
      opts.onTap(done.slotId, done.group);
    }
  };

  const onCancel = (ev: PointerEvent): void => {
    if (!g || ev.pointerId !== g.pointerId) return;
    const done = finish();
    // Treat as a drop outside every target so the token animates back.
    if (done?.dragging) opts.onDrop(done.slotId, done.center, false);
  };

  const onKey = (ev: KeyboardEvent): void => {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    const group = (ev.target as Element | null)?.closest<SVGGElement>('g.token[data-slot-id]');
    if (!group) return;
    ev.preventDefault();
    opts.onTap(group.dataset.slotId!, group);
  };

  opts.svg.addEventListener('pointerdown', onDown);
  opts.svg.addEventListener('keydown', onKey);
  return () => {
    finish();
    opts.svg.removeEventListener('pointerdown', onDown);
    opts.svg.removeEventListener('keydown', onKey);
  };
}
