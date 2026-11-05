// Name editor: an HTML box positioned over a token (spec court-lineup "Edição do nome por toque").
// Enter or blur confirms, Escape or the cancel button cancels. The remove option is
// offered only for bench slots; court players cannot be removed from the UI.

import { icons } from './icons';
import { t } from './i18n';

export interface NameEditorOptions {
  /** Token rectangle in client coordinates. */
  anchor: DOMRect;
  name: string;
  canRemove: boolean;
  onConfirm(name: string): void;
  onRemove(): void;
}

export interface NameEditor {
  /** Closes the editor confirming the typed name. */
  commit(): void;
  /** Closes the editor without changes. */
  cancel(): void;
}

export function openNameEditor(opts: NameEditorOptions): NameEditor {
  const box = document.createElement('div');
  box.className = 'name-editor';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-label', t.editor.label);

  const row = document.createElement('div');
  row.className = 'name-editor-row';
  const input = document.createElement('input');
  input.type = 'text';
  input.value = opts.name;
  input.placeholder = t.editor.placeholder;
  input.setAttribute('aria-label', t.editor.label);
  input.autocomplete = 'off';
  input.setAttribute('autocapitalize', 'words');
  input.enterKeyHint = 'done';
  input.maxLength = 40;
  const ok = iconButton(icons.check, t.editor.confirm, 'btn btn-primary');
  const cancel = iconButton(icons.close, t.editor.cancel, 'btn');
  row.append(input, ok, cancel);
  box.append(row);

  let remove: HTMLButtonElement | null = null;
  if (opts.canRemove) {
    remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'btn btn-danger name-editor-remove';
    remove.textContent = t.editor.remove;
    box.append(remove);
  }

  let open = true;
  const close = (): void => {
    if (!open) return;
    open = false;
    document.removeEventListener('pointerdown', onOutside, true);
    box.remove();
  };
  const commit = (): void => {
    if (!open) return;
    const value = input.value;
    close();
    opts.onConfirm(value);
  };
  const doCancel = (): void => close();

  // Keep focus in the input when pressing the buttons, so blur does not commit first.
  for (const b of [ok, cancel, remove]) b?.addEventListener('pointerdown', (ev) => ev.preventDefault());
  ok.addEventListener('click', commit);
  cancel.addEventListener('click', doCancel);
  remove?.addEventListener('click', () => {
    close();
    opts.onRemove();
  });
  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      commit();
    } else if (ev.key === 'Escape') {
      ev.preventDefault();
      doCancel();
    }
  });
  input.addEventListener('blur', (ev) => {
    const next = ev.relatedTarget as Node | null;
    if (next && box.contains(next)) return;
    commit();
  });
  // iOS does not blur an input when tapping a non-focusable area: commit on any outside press.
  const onOutside = (ev: PointerEvent): void => {
    if (!box.contains(ev.target as Node)) commit();
  };

  document.body.append(box);
  position(box, opts.anchor);
  document.addEventListener('pointerdown', onOutside, true);
  input.focus();
  input.select();
  return { commit, cancel: doCancel };
}

function iconButton(icon: string, label: string, className: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = className;
  b.innerHTML = icon;
  b.setAttribute('aria-label', label);
  b.title = label;
  return b;
}

/** Centres the box on the token, kept inside the viewport. */
function position(box: HTMLElement, anchor: DOMRect): void {
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  const w = box.offsetWidth;
  const h = box.offsetHeight;
  const cx = anchor.left + anchor.width / 2;
  const cy = anchor.top + anchor.height / 2;
  const left = Math.min(Math.max(8, cx - w / 2), Math.max(8, vw - w - 8));
  const top = Math.min(Math.max(8, cy - h / 2), Math.max(8, vh - h - 8));
  box.style.left = `${left}px`;
  box.style.top = `${top}px`;
}
