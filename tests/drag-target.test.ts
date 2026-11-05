import { describe, expect, it } from 'vitest';
import { reduce } from '../src/state/reducer';
import { newMatch } from '../src/state/model';
import { resolveTarget } from '../src/view/drag';
import { HIT_RADIUS, insideRect, layoutFor, slotCenters, toView } from '../src/view/layout';
import { T0 } from './helpers';

describe('drag: resolveTarget (task 6.1, design.md D5)', () => {
  for (const orientation of ['landscape', 'portrait'] as const) {
    describe(orientation, () => {
      const m = newMatch();
      const layout = layoutFor(orientation, m.slots);
      const centers = slotCenters(m.slots, layout);
      const at = (id: string) => centers.get(id)!;

      it('rule 1: over another token gives that slot', () => {
        const pv = at('court-PV');
        expect(resolveTarget({ x: pv.x + HIT_RADIUS * 0.6, y: pv.y }, m.slots, layout, 'bench-1')).toEqual({
          kind: 'slot',
          slotId: 'court-PV',
        });
        expect(resolveTarget(at('bench-2'), m.slots, layout, 'court-AD')).toEqual({ kind: 'slot', slotId: 'bench-2' });
      });

      it('rule 1: over an empty court marker gives that slot', () => {
        const left = reduce(m, { type: 'dropOn', fromSlotId: 'court-AD', target: { kind: 'bench' }, now: T0 });
        const l = layoutFor(orientation, left.slots);
        const marker = slotCenters(left.slots, l).get('court-AD')!;
        expect(resolveTarget(marker, left.slots, l, 'bench-1')).toEqual({ kind: 'slot', slotId: 'court-AD' });
      });

      it('rule 1 ignores the dragged token itself', () => {
        const fx = at('court-FX');
        const r = resolveTarget(fx, m.slots, layout, 'court-FX');
        expect(r.kind).toBe('court');
      });

      it('rule 2: inside the court rectangle gives a free court point', () => {
        const p = toView({ x: 0.4, y: 0.85 }, layout);
        const r = resolveTarget(p, m.slots, layout, 'court-FX');
        expect(r.kind).toBe('court');
        if (r.kind === 'court') {
          expect(r.x).toBeCloseTo(0.4);
          expect(r.y).toBeCloseTo(0.85);
        }
      });

      it('rule 3: inside the bench rectangle (away from tokens) gives the bench', () => {
        const b = layout.bench;
        // Below the last bench cell, still in the bench column.
        const p = orientation === 'landscape' ? { x: b.x + b.w - 0.6, y: b.y + b.h - 0.5 } : { x: 25.5, y: 39 };
        expect(insideRect(p, b)).toBe(true);
        expect(resolveTarget(p, m.slots, layout, 'court-AD')).toEqual({ kind: 'bench' });
      });

      it('rule 3: the letterbox strip beside the bench (outside the viewBox) still counts as bench', () => {
        const p = orientation === 'landscape' ? { x: layout.width + 3, y: 11 } : { x: layout.width + 3, y: 20 };
        expect(resolveTarget(p, m.slots, layout, 'court-AD')).toEqual({ kind: 'bench' });
      });

      it('rule 4: outside everything gives none', () => {
        expect(resolveTarget({ x: -3, y: -3 }, m.slots, layout, 'court-AD')).toEqual({ kind: 'none' });
        // Margin beside the court, between the court and the bench.
        const margin = orientation === 'landscape' ? { x: 0.5, y: 11 } : { x: 0.5, y: 20 };
        expect(resolveTarget(margin, m.slots, layout, 'court-AD')).toEqual({ kind: 'none' });
        // Gap between the court and the bench column (right of the court in both orientations).
        const gap = orientation === 'landscape' ? { x: 41.5, y: 11 } : { x: 21.5, y: 20 };
        expect(resolveTarget(gap, m.slots, layout, 'court-AD')).toEqual({ kind: 'none' });
        // Margin below the court.
        const below = orientation === 'landscape' ? { x: 20, y: 21.5 } : { x: 11, y: 41.5 };
        expect(resolveTarget(below, m.slots, layout, 'court-AD')).toEqual({ kind: 'none' });
      });
    });
  }
});
