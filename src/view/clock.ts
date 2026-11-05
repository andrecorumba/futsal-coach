// Bottom clock bar (spec match-clock): MM:SS display, start/pause, reset with
// confirmation, period toggle 1T/2T and period duration 1..60 minutes.

import { MAX_PERIOD_MINUTES, MIN_PERIOD_MINUTES, type Match } from '../state/model';
import type { Action } from '../state/reducer';
import { isFinishedAt, isRunning, remainingAt } from '../state/time';
import { formatRemaining } from './format';
import { icons } from './icons';
import { t } from './i18n';

export interface ClockBarDeps {
  dispatch(action: Action): void;
  getState(): Match;
  now(): number;
  confirm(message: string, confirmLabel: string): Promise<boolean>;
}

export class ClockBar {
  readonly el: HTMLElement;
  private readonly period: HTMLButtonElement;
  private readonly display: HTMLOutputElement;
  private readonly toggle: HTMLButtonElement;
  private readonly reset: HTMLButtonElement;
  private readonly duration: HTMLInputElement;

  constructor(deps: ClockBarDeps) {
    this.el = document.createElement('footer');
    this.el.className = 'clock-bar';
    this.el.setAttribute('role', 'region');
    this.el.setAttribute('aria-label', t.clock.region);

    this.period = button('btn clock-period');
    this.display = document.createElement('output');
    this.display.className = 'clock-display';
    this.display.setAttribute('aria-label', t.clock.remaining);
    this.toggle = button('btn btn-primary clock-toggle');
    this.reset = button('btn clock-reset');
    this.reset.innerHTML = icons.reset;
    this.reset.setAttribute('aria-label', t.clock.reset);
    this.reset.title = t.clock.reset;

    const durationLabel = document.createElement('label');
    durationLabel.className = 'clock-duration';
    this.duration = document.createElement('input');
    this.duration.type = 'number';
    this.duration.inputMode = 'numeric';
    this.duration.min = String(MIN_PERIOD_MINUTES);
    this.duration.max = String(MAX_PERIOD_MINUTES);
    this.duration.step = '1';
    this.duration.setAttribute('aria-label', t.clock.duration);
    this.duration.title = t.clock.duration;
    const suffix = document.createElement('span');
    suffix.textContent = t.clock.minutesSuffix;
    suffix.setAttribute('aria-hidden', 'true');
    durationLabel.append(this.duration, suffix);

    this.el.append(this.period, this.display, this.toggle, this.reset, durationLabel);

    this.toggle.addEventListener('click', () => {
      const m = deps.getState();
      const now = deps.now();
      deps.dispatch(isRunning(m) ? { type: 'pauseClock', now } : { type: 'startClock', now });
    });
    this.period.addEventListener('click', () => {
      const next = deps.getState().clock.period === 1 ? 2 : 1;
      deps.dispatch({ type: 'setPeriod', period: next, now: deps.now() });
    });
    this.reset.addEventListener('click', () => {
      void deps.confirm(t.clock.confirmReset(deps.getState().clock.period), t.clock.resetAction).then((ok) => {
        if (ok) deps.dispatch({ type: 'resetClock', now: deps.now() });
      });
    });
    const applyDuration = (): void => {
      const minutes = Number(this.duration.value);
      if (this.duration.value !== '' && Number.isFinite(minutes)) deps.dispatch({ type: 'setDuration', minutes });
      // Show the clamped value even if the state did not change.
      this.duration.value = String(deps.getState().clock.periodMinutes);
    };
    this.duration.addEventListener('change', applyDuration);
    this.duration.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') this.duration.blur();
    });
  }

  render(match: Match, now: number): void {
    const running = isRunning(match);
    const finished = isFinishedAt(match, now);
    setText(this.period, t.clock.periodShort(match.clock.period));
    this.period.setAttribute('aria-label', t.clock.periodLabel(match.clock.period));
    this.toggle.innerHTML = running ? icons.pause : icons.play;
    const label = running ? t.clock.pause : t.clock.start;
    this.toggle.setAttribute('aria-label', label);
    this.toggle.title = label;
    this.toggle.disabled = !running && finished;
    if (document.activeElement !== this.duration) this.duration.value = String(match.clock.periodMinutes);
    this.updateTime(match, now);
  }

  /** Updates only the display (250 ms tick). */
  updateTime(match: Match, now: number): void {
    const finished = isFinishedAt(match, now);
    setText(this.display, formatRemaining(remainingAt(match, now)));
    this.display.classList.toggle('finished', finished);
    const title = finished ? t.clock.finished : '';
    if (this.display.title !== title) this.display.title = title;
    this.el.classList.toggle('running', isRunning(match) && !finished);
  }
}

function button(className: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = className;
  return b;
}

function setText(el: HTMLElement, text: string): void {
  if (el.textContent !== text) el.textContent = text;
}
