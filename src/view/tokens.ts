// Idempotent token and label rendering, FLIP animation (design.md D3, D5).
// One <g> per slot, keyed by slot.id. Its position is a CSS transform in viewBox
// units, so the Web Animations API can animate it. Animation is keyed by player:
// a player whose centre changed between two renders slides from the old point.

import { playerName, type Match, type Slot } from '../state/model';
import { playingTimeAt } from '../state/time';
import { contrastText, formatElapsed, initial, truncate } from './format';
import { t } from './i18n';
import {
  addControlCenter,
  HIT_RADIUS,
  INNER_FONT,
  NAME_FONT,
  NAME_OFFSET,
  slotCenters,
  TIME_FONT,
  TIME_OFFSET,
  TOKEN_RADIUS,
  type Layout,
  type Point,
} from './layout';
import { setAttr, setText, svgEl } from './svg';

export const FLIP_MS = 300;

interface TokenParts {
  g: SVGGElement;
  body: SVGCircleElement;
  inner: SVGTextElement;
  name: SVGTextElement;
  time: SVGTextElement;
}

function translate(p: Point): string {
  return `translate(${round(p.x)}px, ${round(p.y)}px)`;
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function prefersReducedMotion(): boolean {
  return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export class TokenLayer {
  readonly layer: SVGGElement;
  private readonly parts = new Map<string, TokenParts>();
  private readonly addControl: SVGGElement;
  private centers = new Map<string, Point>();
  /** Centre of each player's token in the last render. */
  private playerCenters = new Map<string, Point>();
  private playerSlots = new Map<string, string>();

  constructor(onAddReserve: () => void) {
    this.layer = svgEl('g', { class: 'tokens' });
    this.addControl = svgEl('g', {
      class: 'add-reserve',
      role: 'button',
      tabindex: 0,
      'aria-label': t.addReserve,
    });
    svgEl('circle', { r: HIT_RADIUS, class: 'hit' }, this.addControl);
    svgEl('circle', { r: TOKEN_RADIUS, class: 'add-ring' }, this.addControl);
    const k = TOKEN_RADIUS * 0.5;
    svgEl('path', { d: `M ${-k} 0 H ${k} M 0 ${-k} V ${k}`, class: 'add-plus' }, this.addControl);
    svgEl('title', {}, this.addControl).textContent = t.addReserve;
    this.addControl.addEventListener('click', onAddReserve);
    this.addControl.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        onAddReserve();
      }
    });
    this.layer.appendChild(this.addControl);
  }

  centerOf(slotId: string): Point | undefined {
    return this.centers.get(slotId);
  }

  /** Copy of the player centres from the last render (FLIP "first"). */
  playerPositions(): Map<string, Point> {
    return new Map(this.playerCenters);
  }

  groupOf(slotId: string): SVGGElement | undefined {
    return this.parts.get(slotId)?.g;
  }

  render(match: Match, layout: Layout, now: number): void {
    this.centers = slotCenters(match.slots, layout);
    this.playerCenters = new Map();
    this.playerSlots = new Map();
    const seen = new Set<string>();
    for (const slot of match.slots) {
      seen.add(slot.id);
      const parts = this.parts.get(slot.id) ?? this.create(slot);
      const c = this.centers.get(slot.id)!;
      parts.g.style.transform = translate(c);
      if (slot.playerId !== null) {
        this.playerCenters.set(slot.playerId, c);
        this.playerSlots.set(slot.playerId, slot.id);
      }
      this.update(parts, slot, match, now);
    }
    for (const [id, parts] of this.parts) {
      if (!seen.has(id)) {
        parts.g.remove();
        this.parts.delete(id);
      }
    }
    this.addControl.style.transform = translate(addControlCenter(match.slots, layout));
  }

  /** Updates only the playing-time texts (250 ms tick). */
  updateTimes(match: Match, now: number): void {
    for (const slot of match.slots) {
      if (slot.playerId === null) continue;
      const parts = this.parts.get(slot.id);
      if (parts) setText(parts.time, formatElapsed(playingTimeAt(match, slot.playerId, now)));
    }
  }

  /** FLIP "invert and play": every token whose player moved slides from its previous centre. */
  animateFrom(before: Map<string, Point>): void {
    if (prefersReducedMotion()) return;
    for (const [playerId, to] of this.playerCenters) {
      const from = before.get(playerId);
      if (!from || Math.hypot(from.x - to.x, from.y - to.y) < 0.01) continue;
      const slotId = this.playerSlots.get(playerId);
      const g = slotId === undefined ? undefined : this.parts.get(slotId)?.g;
      if (!g || typeof g.animate !== 'function') continue;
      g.getAnimations().forEach((a) => a.cancel());
      g.animate([{ transform: translate(from) }, { transform: translate(to) }], {
        duration: FLIP_MS,
        easing: 'ease-out',
      });
    }
  }

  private create(slot: Slot): TokenParts {
    const g = svgEl('g', { 'data-slot-id': slot.id });
    svgEl('circle', { r: HIT_RADIUS, class: 'hit' }, g);
    const body = svgEl('circle', { r: TOKEN_RADIUS, class: 'body' }, g);
    const inner = svgEl('text', { class: 'inner', 'font-size': INNER_FONT, 'dominant-baseline': 'central' }, g);
    const name = svgEl('text', { class: 'name', y: NAME_OFFSET, 'font-size': NAME_FONT }, g);
    const time = svgEl('text', { class: 'time', y: TIME_OFFSET, 'font-size': TIME_FONT }, g);
    // Keep new slots below the add control and any dragged token already raised.
    this.layer.insertBefore(g, this.addControl);
    const parts = { g, body, inner, name, time };
    this.parts.set(slot.id, parts);
    return parts;
  }

  private update(p: TokenParts, slot: Slot, match: Match, now: number): void {
    const occupied = slot.playerId !== null;
    const isCourt = slot.kind === 'court';
    setAttr(p.g, 'class', `${occupied ? 'token' : 'empty'} ${slot.kind}`);
    if (!occupied) {
      const pos = slot.position!;
      setAttr(p.g, 'role', 'img');
      setAttr(p.g, 'aria-label', t.emptySlotLabel(pos));
      p.g.removeAttribute('tabindex');
      setText(p.inner, pos);
      p.inner.style.fill = '';
      p.body.style.fill = '';
      setText(p.name, '');
      setText(p.time, '');
      return;
    }
    const name = playerName(match, slot.playerId);
    const time = formatElapsed(playingTimeAt(match, slot.playerId!, now));
    const color = isCourt && slot.position === 'GL' ? match.settings.gkColor : match.settings.lineColor;
    p.body.style.fill = color;
    p.inner.style.fill = contrastText(color);
    setText(p.inner, isCourt ? slot.position! : initial(name));
    setText(p.name, truncate(name));
    setText(p.time, time);
    const role = isCourt ? t.positionName(slot.position!) : t.reserve;
    setAttr(p.g, 'role', 'button');
    setAttr(p.g, 'tabindex', 0);
    setAttr(p.g, 'aria-label', t.tokenLabel(role, name, time));
  }
}
