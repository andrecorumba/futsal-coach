// Bootstrap: `createApp` builds the board, clock and drag handling around the reducer;
// `bootstrap` adds the resume dialog, autosave, settings, menu, import/export, wake lock
// and service worker registration on top of it (task group 8).
import './style.css';
import { registerSW } from 'virtual:pwa-register';
import { findSlot, newMatch, playerName, type Match } from './state/model';
import { reduce, type Action } from './state/reducer';
import {
  addLineup,
  clearMatch,
  exportMatch,
  loadLineup,
  loadMatch,
  loadSettings,
  parseImport,
  saveMatch,
  saveSettings,
} from './state/storage';
import { isRunning } from './state/time';
import { ClockBar } from './view/clock';
import { createBenchArea, createCourt, updateBenchArea, updateCourt } from './view/court';
import { alertDialog, choiceDialog, confirmDialog } from './view/dialog';
import { attachDrag, resolveTarget } from './view/drag';
import { openNameEditor, type NameEditor } from './view/editor';
import { downloadJson, matchFilename, pickJsonFile } from './view/files';
import { t } from './view/i18n';
import { icons } from './view/icons';
import { CLOCK_BAR_PX, currentOrientation, layoutFor, viewBoxOf, type Layout } from './view/layout';
import { setAttr, svgEl } from './view/svg';
import { createMenu } from './view/menu';
import { TokenLayer } from './view/tokens';
import { createWakeLock } from './view/wakelock';

export const TICK_MS = 250;
export const AUTOSAVE_DEBOUNCE_MS = 300;

export type Listener = (next: Match, prev: Match, action: Action) => void;

export interface App {
  getState(): Match;
  /** Runs the reducer; on change notifies subscribers and re-renders. Returns the new state. */
  dispatch(action: Action): Match;
  /** Called after every state change. Returns an unsubscribe function. */
  subscribe(listener: Listener): () => void;
  /** Full re-render from the current state. */
  render(): void;
  now(): number;
  /** Menu button floating over the board's top-left corner (the menu wires it). */
  readonly menuButton: HTMLButtonElement;
  destroy(): void;
}

export function createApp(root: HTMLElement, initial: Match): App {
  let state = initial;
  const listeners = new Set<Listener>();
  const now = (): number => Date.now();

  document.documentElement.style.setProperty('--clock-bar', `${CLOCK_BAR_PX}px`);

  // Menu button: no top bar, it floats over the board's top-left corner (design.md D2 of
  // phone-fit-and-restart-match), so the court gets the full height above the clock bar.
  const menuButton = document.createElement('button');
  menuButton.type = 'button';
  menuButton.className = 'btn menu-button';
  menuButton.innerHTML = icons.menu;
  menuButton.setAttribute('aria-label', t.menuButton);
  menuButton.title = t.menuButton;

  // Board: court, bench and tokens in one SVG.
  const board = document.createElement('main');
  board.className = 'board';
  const svg = svgEl('svg', { class: 'field', role: 'group', 'aria-label': t.courtArea, preserveAspectRatio: 'xMidYMid meet' });
  const benchArea = createBenchArea();
  const court = createCourt();
  const tokens = new TokenLayer(() => dispatch({ type: 'addReserve' }));
  svg.append(benchArea, court, tokens.layer);
  board.append(svg, menuButton);

  let editor: NameEditor | null = null;
  const clock = new ClockBar({
    dispatch: (a) => void dispatch(a),
    getState: () => state,
    now,
    confirm: confirmDialog,
  });

  root.replaceChildren(board, clock.el);

  let orientation = currentOrientation();
  let layout: Layout = layoutFor(orientation, state.slots);

  function render(): void {
    const at = now();
    layout = layoutFor(orientation, state.slots);
    setAttr(svg, 'viewBox', viewBoxOf(layout));
    setAttr(svg, 'data-orientation', layout.orientation);
    updateBenchArea(benchArea, layout);
    updateCourt(court, layout);
    tokens.render(state, layout, at);
    clock.render(state, at);
  }

  function dispatch(action: Action): Match {
    const prev = state;
    const next = reduce(prev, action);
    if (next === prev) return prev;
    state = next;
    render();
    for (const l of listeners) l(next, prev, action);
    return next;
  }

  // Period end: vibrate once when the clock transitions to finished.
  listeners.add((next, prev) => {
    if (!prev.clock.finished && next.clock.finished) navigator.vibrate?.(200);
  });

  const detachDrag = attachDrag({
    svg,
    layer: tokens.layer,
    centerOf: (id) => tokens.centerOf(id),
    onTap: (slotId, group) => openEditor(slotId, group),
    onDrop: (slotId, center, overSvg) => {
      const slot = findSlot(state, slotId);
      const before = tokens.playerPositions();
      if (slot?.playerId) before.set(slot.playerId, center);
      // Released over the clock bar, the menu button or outside the window: cancel.
      const target = overSvg ? resolveTarget(center, state.slots, layout, slotId) : { kind: 'none' as const };
      const prev = state;
      dispatch({ type: 'dropOn', fromSlotId: slotId, target, now: now() });
      // Refused drop: put the dragged token back in place before animating its return.
      if (state === prev) tokens.render(state, layout, now());
      tokens.animateFrom(before);
    },
  });

  function openEditor(slotId: string, group: SVGGElement): void {
    editor?.commit();
    const slot = findSlot(state, slotId);
    if (!slot?.playerId) return;
    const playerId = slot.playerId;
    const name = playerName(state, playerId);
    editor = openNameEditor({
      anchor: group.getBoundingClientRect(),
      name,
      canRemove: slot.kind === 'bench',
      onConfirm: (value) => {
        editor = null;
        dispatch({ type: 'setName', playerId, name: value });
      },
      onRemove: () => {
        editor = null;
        void confirmDialog(t.confirmRemove(name), t.removeAction).then((ok) => {
          // Look the slot up again: the player may have moved while the dialog was open.
          const current = state.slots.find((s) => s.playerId === playerId);
          if (ok && current?.kind === 'bench') dispatch({ type: 'removeReserve', slotId: current.id });
        });
      },
    });
  }

  // Orientation switching: same state, different projection.
  const portraitQuery = window.matchMedia('(orientation: portrait)');
  const onOrientation = (): void => {
    editor?.commit();
    orientation = currentOrientation();
    render();
  };
  portraitQuery.addEventListener('change', onOrientation);

  // 250 ms tick: the reducer only settles a period that reached zero; otherwise
  // the state is unchanged and only the time texts are refreshed (design.md D4).
  let timer: ReturnType<typeof setInterval> | null = null;
  const tick = (): void => {
    const at = now();
    const prev = state;
    dispatch({ type: 'tick', now: at });
    if (state === prev) {
      clock.updateTime(state, at);
      tokens.updateTimes(state, at);
    }
  };
  const startLoop = (): void => {
    if (timer === null) timer = setInterval(tick, TICK_MS);
  };
  const stopLoop = (): void => {
    if (timer !== null) clearInterval(timer);
    timer = null;
  };
  // Hidden: consolidate (settle) and stop rendering. Visible: consolidate and redraw at once.
  const onVisibility = (): void => {
    tick();
    if (document.visibilityState === 'hidden') stopLoop();
    else startLoop();
  };
  document.addEventListener('visibilitychange', onVisibility);

  render();
  if (document.visibilityState !== 'hidden') startLoop();

  return {
    getState: () => state,
    dispatch,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    render,
    now,
    menuButton,
    destroy() {
      stopLoop();
      detachDrag();
      editor?.cancel();
      portraitQuery.removeEventListener('change', onOrientation);
      document.removeEventListener('visibilitychange', onVisibility);
      listeners.clear();
    },
  };
}

/** Device colours win over the colours stored in a resumed or imported match (spec team-colors "Cores persistem"). */
function withDeviceColors(match: Match, colors: Match['settings']): Match {
  return {
    ...match,
    settings: { lineColor: colors.lineColor, gkColor: colors.gkColor, reserveColor: colors.reserveColor },
  };
}

/** Resume dialog (spec match-persistence "Retomada ao reabrir"). Resolves true to continue the saved match. */
async function askResume(): Promise<boolean> {
  for (;;) {
    const choice = await choiceDialog(t.resume.message, [
      { label: t.resume.newMatch, value: 'new' },
      { label: t.resume.continue, value: 'continue', primary: true },
    ]);
    if (choice === 'continue') return true;
    if (await confirmDialog(t.resume.confirmNew, t.resume.discard)) return false;
  }
}

export async function bootstrap(root: HTMLElement): Promise<App> {
  const settings = loadSettings();
  const saved = loadMatch();
  let initial = newMatch(undefined, settings);
  let resumed = false;
  if (saved) {
    resumed = await askResume();
    if (resumed) initial = withDeviceColors(saved, settings);
    else clearMatch();
  }

  const app = createApp(root, initial);

  // Autosave, debounced; flushed when the page is hidden so the last change is never lost.
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  const save = (): void => {
    saveTimer = null;
    try {
      saveMatch(app.getState());
    } catch {
      // Storage full or unavailable (private mode): exporting JSON is the backup.
    }
  };
  const flush = (): void => {
    if (saveTimer === null) return;
    clearTimeout(saveTimer);
    save();
  };
  app.subscribe(() => {
    if (saveTimer !== null) clearTimeout(saveTimer);
    saveTimer = setTimeout(save, AUTOSAVE_DEBOUNCE_MS);
  });
  window.addEventListener('pagehide', flush);

  // Device settings: colours and default period length.
  app.subscribe((next, _prev, action) => {
    if (action.type !== 'setColors' && action.type !== 'setDuration') return;
    try {
      saveSettings({ ...next.settings, periodMinutes: next.clock.periodMinutes });
    } catch {
      // Ignored, as above.
    }
  });

  // Wake lock follows the clock; the browser drops it when hidden, so re-acquire on return.
  const wakeLock = createWakeLock();
  app.subscribe((next) => wakeLock.sync(isRunning(next)));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
    else wakeLock.sync(isRunning(app.getState()));
  });

  const exportCurrentMatch = (): void => {
    downloadJson(matchFilename(new Date(app.now())), exportMatch(app.getState()));
  };

  const importJson = async (): Promise<void> => {
    let text: string | null;
    try {
      text = await pickJsonFile();
    } catch {
      await alertDialog(t.importErrors.readFailed);
      return;
    }
    if (text === null) return;
    const result = parseImport(text);
    if (!result.ok) {
      await alertDialog(result.error);
      return;
    }
    if (result.kind === 'match') {
      if (!(await confirmDialog(t.menu.confirmImportMatch, t.menu.importMatchAction))) return;
      app.dispatch({ type: 'importMatch', match: withDeviceColors(result.match, app.getState().settings) });
      // Like resuming: a file saved with the clock running comes in paused.
      if (isRunning(app.getState())) app.dispatch({ type: 'pauseClock', now: app.now() });
      menu.close();
      return;
    }
    const name = result.lineup.name || t.menu.importedLineupFallback;
    if (loadLineup(name) && !(await confirmDialog(t.menu.confirmOverwriteLineup(name), t.menu.overwriteAction))) return;
    try {
      addLineup({ ...result.lineup, name });
    } catch {
      await alertDialog(t.menu.storageFailed);
      return;
    }
    menu.refresh();
    await alertDialog(t.menu.importedLineup(name));
  };

  const menu = createMenu({ app, root, exportMatch: exportCurrentMatch, importJson });

  // Resuming with the clock running: the real time elapsed while closed counts (design.md D11),
  // then the clock is paused at the moment of resuming.
  if (resumed && isRunning(app.getState())) app.dispatch({ type: 'pauseClock', now: app.now() });

  return app;
}

const root = document.querySelector<HTMLDivElement>('#app');
if (root) {
  // New versions download in the background and apply on the next open: no reload mid-game (design.md D8).
  if ('serviceWorker' in navigator) {
    registerSW({
      immediate: true,
      onNeedRefresh() {
        // Intentionally nothing: the waiting service worker takes over on the next open.
      },
    });
  }
  void bootstrap(root).then((app) => {
    if (import.meta.env.DEV) (window as unknown as { futsalApp: App }).futsalApp = app;
  });
}
