// File export (Blob + <a download>) and import (<input type="file">), plus filename helpers.

import { t } from './i18n';

const pad = (n: number): string => String(n).padStart(2, '0');

/** futsal-partida-YYYYMMDD-HHMM.json, in local time. */
export function matchFilename(date: Date): string {
  const d = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
  const h = `${pad(date.getHours())}${pad(date.getMinutes())}`;
  return `${t.files.matchPrefix}-${d}-${h}.json`;
}

/** Lowercase ASCII slug: accents removed, anything else non-alphanumeric collapsed to "-". */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** futsal-escalacao-<nome>.json */
export function lineupFilename(name: string): string {
  return `${t.files.lineupPrefix}-${slugify(name) || t.files.unnamedLineup}.json`;
}

/** Downloads `text` as a JSON file. */
export function downloadJson(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.append(a);
  a.click();
  a.remove();
  // Give the browser time to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Opens the file picker for a JSON file and resolves with its text, or null if nothing was chosen. */
export function pickJsonFile(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.style.display = 'none';
    let settled = false;
    const finish = (value: string | null): void => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(value);
    };
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return finish(null);
      file.text().then(finish, (err: unknown) => {
        settled = true;
        input.remove();
        reject(err instanceof Error ? err : new Error(String(err)));
      });
    });
    input.addEventListener('cancel', () => finish(null));
    document.body.append(input);
    input.click();
  });
}
