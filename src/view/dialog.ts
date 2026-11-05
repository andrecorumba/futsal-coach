// Small in-page dialogs (instead of window.confirm / prompt / alert).

import { t } from './i18n';

interface DialogButton<T> {
  label: string;
  className: string;
  value: T;
}

interface DialogOptions<T> {
  message: string;
  buttons: DialogButton<T>[];
  /** Escape and backdrop tap resolve with `dismiss.value`; omit `dismiss` for a non-dismissable dialog. */
  dismiss?: { value: T };
  /** Index of the button focused on open (default 0). */
  focusIndex?: number;
  /** Optional text input, submitted with the last button or Enter. */
  input?: { label: string; placeholder: string; value: string };
  /** Called for the submit (last) button value when the input is present; return null to keep the dialog open. */
  onInputSubmit?: (text: string) => T | null;
}

let counter = 0;

function showDialog<T>(opts: DialogOptions<T>): Promise<T> {
  return new Promise((resolve) => {
    const previous = document.activeElement as HTMLElement | null;
    const backdrop = document.createElement('div');
    backdrop.className = 'dialog-backdrop';
    const box = document.createElement('div');
    box.className = 'dialog';
    box.setAttribute('role', opts.input ? 'dialog' : 'alertdialog');
    box.setAttribute('aria-modal', 'true');
    const text = document.createElement('p');
    text.id = `dialog-message-${++counter}`;
    text.textContent = opts.message;
    box.setAttribute('aria-describedby', text.id);
    box.append(text);

    let input: HTMLInputElement | null = null;
    if (opts.input) {
      input = document.createElement('input');
      input.type = 'text';
      input.className = 'dialog-input';
      input.value = opts.input.value;
      input.placeholder = opts.input.placeholder;
      input.setAttribute('aria-label', opts.input.label);
      input.autocomplete = 'off';
      input.maxLength = 40;
      input.enterKeyHint = 'done';
      box.append(input);
    }

    const actions = document.createElement('div');
    actions.className = 'dialog-actions';
    const buttons = opts.buttons.map((b) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = b.className;
      el.textContent = b.label;
      actions.append(el);
      return el;
    });
    box.append(actions);
    backdrop.append(box);

    const close = (result: T): void => {
      document.removeEventListener('keydown', onKey, true);
      backdrop.remove();
      previous?.focus?.();
      resolve(result);
    };
    const choose = (index: number): void => {
      const value = opts.buttons[index]!.value;
      if (input && opts.onInputSubmit && index === opts.buttons.length - 1) {
        const out = opts.onInputSubmit(input.value);
        if (out === null) {
          input.focus();
          return;
        }
        close(out);
        return;
      }
      close(value);
    };
    const onKey = (ev: KeyboardEvent): void => {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        ev.stopPropagation();
        if (opts.dismiss) close(opts.dismiss.value);
      } else if (ev.key === 'Enter' && input && document.activeElement === input) {
        ev.preventDefault();
        choose(opts.buttons.length - 1);
      }
    };
    buttons.forEach((el, i) => el.addEventListener('click', () => choose(i)));
    backdrop.addEventListener('pointerdown', (ev) => {
      if (ev.target === backdrop && opts.dismiss) close(opts.dismiss.value);
    });
    document.addEventListener('keydown', onKey, true);
    document.body.append(backdrop);
    if (input) {
      input.focus();
      input.select();
    } else {
      buttons[opts.focusIndex ?? 0]?.focus();
    }
  });
}

/** Shows a modal confirmation. Resolves true on confirm, false on cancel, Escape or backdrop tap. */
export function confirmDialog(message: string, confirmLabel: string = t.dialog.confirm): Promise<boolean> {
  return showDialog<boolean>({
    message,
    buttons: [
      { label: t.dialog.cancel, className: 'btn', value: false },
      { label: confirmLabel, className: 'btn btn-danger', value: true },
    ],
    dismiss: { value: false },
  });
}

/** Shows a message with a single OK button. */
export function alertDialog(message: string): Promise<void> {
  return showDialog<void>({
    message,
    buttons: [{ label: t.dialogOk, className: 'btn btn-primary', value: undefined }],
    dismiss: { value: undefined },
  }).then(() => undefined);
}

/** Asks for a text. Resolves with the trimmed, non-empty text, or null when cancelled. */
export function promptDialog(message: string, placeholder: string, confirmLabel: string): Promise<string | null> {
  return showDialog<string | null>({
    message,
    input: { label: message, placeholder, value: '' },
    buttons: [
      { label: t.dialog.cancel, className: 'btn', value: null },
      { label: confirmLabel, className: 'btn btn-primary', value: null },
    ],
    dismiss: { value: null },
    onInputSubmit: (text) => (text.trim() === '' ? null : text.trim()),
  });
}

/** Non-dismissable choice between labelled options (used by the resume dialog). */
export function choiceDialog<T extends string>(message: string, choices: { label: string; value: T; primary?: boolean }[]): Promise<T> {
  return showDialog<T>({
    message,
    buttons: choices.map((c) => ({ label: c.label, className: c.primary ? 'btn btn-primary' : 'btn', value: c.value })),
    focusIndex: Math.max(0, choices.findIndex((c) => c.primary)),
  });
}
