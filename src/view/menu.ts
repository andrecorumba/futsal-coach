// Hamburger menu: a panel that slides in from the left over a scrim (spec match-persistence
// "Menu não cobre a quadra em repouso"). While open, the rest of the app is inert, so a tap on
// the court only closes the menu. Sections: match actions, summary, lineups and colors.

import type { App } from '../main';
import type { Lineup } from '../state/model';
import { isRunning } from '../state/time';
import { deleteLineup, exportLineup, listLineups, loadLineup, saveLineup } from '../state/storage';
import { alertDialog, confirmDialog, promptDialog } from './dialog';
import { downloadJson, lineupFilename } from './files';
import { formatElapsed } from './format';
import { t } from './i18n';
import { icons } from './icons';
import { displayName, historyLines, summaryRows } from './summary';

export interface MenuOptions {
  app: App;
  /** Element made inert while the menu is open (the app root). */
  root: HTMLElement;
  exportMatch(): void;
  importJson(): Promise<void>;
}

export interface Menu {
  open(): void;
  close(): void;
  isOpen(): boolean;
  /** Re-renders the lineup list (e.g. after an import added one). */
  refresh(): void;
  destroy(): void;
}

const SUMMARY_REFRESH_MS = 1000;
/** How long the scrim keeps swallowing events after the closing gesture ends (covers the synthetic click). */
const GUARD_MS = 400;

export function createMenu(opts: MenuOptions): Menu {
  const { app, root } = opts;

  const scrim = document.createElement('div');
  scrim.className = 'menu-scrim';

  const panel = document.createElement('aside');
  panel.className = 'menu-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', t.menu.title);
  panel.inert = true;

  const header = document.createElement('div');
  header.className = 'menu-header';
  const title = document.createElement('h2');
  title.textContent = t.menu.title;
  const closeButton = button('', 'btn menu-close');
  closeButton.innerHTML = icons.close;
  closeButton.setAttribute('aria-label', t.menu.close);
  closeButton.title = t.menu.close;
  header.append(title, closeButton);

  const body = document.createElement('div');
  body.className = 'menu-body';

  // Match actions
  const matchSection = section(t.menu.sectionMatch);
  const newMatchButton = button(t.menu.newMatch, 'btn menu-action');
  const exportButton = button(t.menu.exportMatch, 'btn menu-action');
  const importButton = button(t.menu.importJson, 'btn menu-action');
  const note = document.createElement('p');
  note.className = 'menu-note';
  note.textContent = t.menu.backupNote;
  const actionRow = document.createElement('div');
  actionRow.className = 'menu-actions';
  actionRow.append(newMatchButton, exportButton, importButton);
  matchSection.append(actionRow, note);

  // Summary
  const summarySection = section(t.menu.sectionSummary);
  const summaryList = document.createElement('ol');
  summaryList.className = 'summary-list';
  const historyTitle = document.createElement('h4');
  historyTitle.textContent = t.menu.historyTitle;
  const historyList = document.createElement('ol');
  historyList.className = 'history-list';
  summarySection.append(summaryList, historyTitle, historyList);

  // Lineups
  const lineupSection = section(t.menu.sectionLineups);
  const saveButton = button(t.menu.saveLineup, 'btn menu-action');
  const lineupList = document.createElement('ul');
  lineupList.className = 'lineup-list';
  lineupSection.append(saveButton, lineupList);

  // Colors
  const colorSection = section(t.menu.sectionColors);
  const lineInput = colorInput();
  const gkInput = colorInput();
  colorSection.append(colorRow(t.menu.lineColor, lineInput), colorRow(t.menu.gkColor, gkInput));

  body.append(matchSection, summarySection, lineupSection, colorSection);
  panel.append(header, body);
  document.body.append(scrim, panel);

  let opened = false;
  let timer: ReturnType<typeof setInterval> | null = null;

  function renderSummary(): void {
    const state = app.getState();
    const rows = summaryRows(state, app.now());
    summaryList.replaceChildren(
      ...rows.map((r) => {
        const li = document.createElement('li');
        li.className = r.onCourt ? 'on-court' : '';
        const name = document.createElement('span');
        name.className = 'summary-name';
        name.textContent = displayName(r.name);
        const badge = document.createElement('span');
        badge.className = 'summary-badge';
        if (r.onCourt) {
          badge.textContent = t.menu.onCourt;
          badge.title = t.menu.onCourtLabel;
        }
        const time = document.createElement('span');
        time.className = 'summary-time';
        time.textContent = formatElapsed(r.playingMs);
        li.append(name, badge, time);
        return li;
      }),
    );
    const lines = historyLines(state);
    if (lines.length === 0) {
      const li = document.createElement('li');
      li.className = 'history-empty';
      li.textContent = t.menu.historyEmpty;
      historyList.replaceChildren(li);
    } else {
      historyList.replaceChildren(
        ...lines.map((line) => {
          const li = document.createElement('li');
          li.textContent = line;
          return li;
        }),
      );
    }
  }

  function renderLineups(): void {
    const lineups = listLineups();
    if (lineups.length === 0) {
      const li = document.createElement('li');
      li.className = 'lineup-empty';
      li.textContent = t.menu.noLineups;
      lineupList.replaceChildren(li);
      return;
    }
    lineupList.replaceChildren(...lineups.map(lineupItem));
  }

  function lineupItem(lineup: Lineup): HTMLLIElement {
    const li = document.createElement('li');
    const label = document.createElement('div');
    label.className = 'lineup-label';
    const name = document.createElement('span');
    name.className = 'lineup-name';
    name.textContent = lineup.name;
    const count = document.createElement('span');
    count.className = 'lineup-count';
    count.textContent = t.menu.playersCount(lineup.roster.length);
    label.append(name, count);
    const load = button(t.menu.loadLineup, 'btn btn-primary');
    load.setAttribute('aria-label', t.menu.loadLineupLabel(lineup.name));
    const exp = button(t.menu.exportLineup, 'btn');
    exp.setAttribute('aria-label', t.menu.exportLineupLabel(lineup.name));
    const del = button(t.menu.deleteLineup, 'btn btn-danger');
    del.setAttribute('aria-label', t.menu.deleteLineupLabel(lineup.name));
    const actions = document.createElement('div');
    actions.className = 'lineup-actions';
    actions.append(load, exp, del);
    li.append(label, actions);

    load.addEventListener('click', () => {
      void confirmDialog(t.menu.confirmLoadLineup(lineup.name), t.menu.loadAction).then((ok) => {
        const saved = ok ? loadLineup(lineup.name) : null;
        if (!saved) return;
        app.dispatch({ type: 'loadLineup', lineup: saved });
        close();
      });
    });
    exp.addEventListener('click', () => {
      const saved = loadLineup(lineup.name) ?? lineup;
      downloadJson(lineupFilename(saved.name), exportLineup(saved));
    });
    del.addEventListener('click', () => {
      void confirmDialog(t.menu.confirmDeleteLineup(lineup.name), t.menu.deleteAction).then((ok) => {
        if (!ok) return;
        deleteLineup(lineup.name);
        renderLineups();
      });
    });
    return li;
  }

  function renderColors(): void {
    const { lineColor, gkColor } = app.getState().settings;
    if (document.activeElement !== lineInput && lineInput.value !== lineColor) lineInput.value = lineColor;
    if (document.activeElement !== gkInput && gkInput.value !== gkColor) gkInput.value = gkColor;
  }

  function render(): void {
    renderSummary();
    renderLineups();
    renderColors();
  }

  const unsubscribe = app.subscribe(() => {
    if (!opened) return;
    renderSummary();
    renderColors();
  });

  function open(): void {
    if (opened) return;
    opened = true;
    render();
    root.inert = true;
    panel.inert = false;
    scrim.classList.add('open');
    panel.classList.add('open');
    document.addEventListener('keydown', onKey);
    // Playing times change continuously while the clock runs.
    timer = setInterval(() => {
      if (isRunning(app.getState())) renderSummary();
    }, SUMMARY_REFRESH_MS);
    body.scrollTop = 0;
    closeButton.focus();
  }

  function close(): void {
    if (!opened) return;
    opened = false;
    if (timer !== null) clearInterval(timer);
    timer = null;
    document.removeEventListener('keydown', onKey);
    scrim.classList.remove('open');
    panel.classList.remove('open');
    panel.inert = true;
    root.inert = false;
    app.menuButton.focus();
  }

  const onKey = (ev: KeyboardEvent): void => {
    // A dialog on top handles its own Escape.
    if (ev.key !== 'Escape' || ev.defaultPrevented || document.querySelector('.dialog-backdrop')) return;
    ev.preventDefault();
    close();
  };

  const onMenuButton = (): void => open();
  app.menuButton.addEventListener('click', onMenuButton);
  closeButton.addEventListener('click', close);
  // Any press outside the panel closes the menu at once (taps and drags alike). The scrim keeps
  // catching the rest of that gesture, including the trailing click, so nothing underneath
  // (court, tokens, add-reserve button) reacts to it.
  let guardTimer: ReturnType<typeof setTimeout> | null = null;
  const releaseGuard = (): void => {
    if (guardTimer !== null) clearTimeout(guardTimer);
    guardTimer = null;
    scrim.classList.remove('guard');
  };
  scrim.addEventListener('pointerdown', (ev) => {
    ev.preventDefault();
    if (!opened) return;
    scrim.classList.add('guard');
    if (guardTimer !== null) clearTimeout(guardTimer);
    guardTimer = null;
    close();
  });
  const endGesture = (): void => {
    if (!scrim.classList.contains('guard')) return;
    if (guardTimer !== null) clearTimeout(guardTimer);
    guardTimer = setTimeout(releaseGuard, GUARD_MS);
  };
  scrim.addEventListener('pointerup', endGesture);
  scrim.addEventListener('pointercancel', endGesture);
  scrim.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    releaseGuard();
  });

  newMatchButton.addEventListener('click', () => {
    void confirmDialog(t.menu.confirmNewMatch, t.menu.newMatchAction).then((ok) => {
      if (!ok) return;
      app.dispatch({ type: 'newMatch' });
      close();
    });
  });
  exportButton.addEventListener('click', () => opts.exportMatch());
  importButton.addEventListener('click', () => {
    void opts.importJson().then(() => {
      if (opened) render();
    });
  });

  saveButton.addEventListener('click', () => {
    void (async () => {
      const name = await promptDialog(t.menu.lineupNamePrompt, t.menu.lineupNamePlaceholder, t.menu.save);
      if (name === null) return;
      if (loadLineup(name) && !(await confirmDialog(t.menu.confirmOverwriteLineup(name), t.menu.overwriteAction))) return;
      try {
        saveLineup(name, app.getState());
      } catch {
        await alertDialog(t.menu.storageFailed);
      }
      renderLineups();
    })();
  });

  lineInput.addEventListener('input', () => app.dispatch({ type: 'setColors', colors: { lineColor: lineInput.value } }));
  gkInput.addEventListener('input', () => app.dispatch({ type: 'setColors', colors: { gkColor: gkInput.value } }));

  return {
    open,
    close,
    isOpen: () => opened,
    refresh() {
      if (opened) render();
    },
    destroy() {
      close();
      releaseGuard();
      unsubscribe();
      app.menuButton.removeEventListener('click', onMenuButton);
      scrim.remove();
      panel.remove();
    },
  };
}

function section(heading: string): HTMLElement {
  const el = document.createElement('section');
  el.className = 'menu-section';
  const h = document.createElement('h3');
  h.textContent = heading;
  el.append(h);
  return el;
}

function button(label: string, className: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = className;
  b.textContent = label;
  return b;
}

function colorInput(): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'color';
  return input;
}

function colorRow(label: string, input: HTMLInputElement): HTMLLabelElement {
  const row = document.createElement('label');
  row.className = 'color-row';
  const text = document.createElement('span');
  text.textContent = label;
  row.append(text, input);
  return row;
}
