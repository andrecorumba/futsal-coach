// Inline SVG icons for buttons (markup only; labels come from i18n.ts).

const wrap = (body: string): string =>
  `<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">${body}</svg>`;

export const icons = {
  menu: wrap('<path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>'),
  play: wrap('<path d="M8 5v14l11-7z" fill="currentColor"/>'),
  pause: wrap('<path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/>'),
  reset: wrap(
    '<path d="M5 12a7 7 0 1 0 2.1-5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M4 3v5h5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
  ),
  check: wrap('<path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>'),
  close: wrap('<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>'),
} as const;
