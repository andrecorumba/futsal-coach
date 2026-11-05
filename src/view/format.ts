// Time formatting helpers shared by the clock bar and the tokens.

/** MM:SS rounding down (playing time). */
export function formatElapsed(ms: number): string {
  return mmss(Math.floor(Math.max(0, ms) / 1000));
}

/** MM:SS rounding up, so a countdown shows 00:00 only when it really ended. */
export function formatRemaining(ms: number): string {
  return mmss(Math.ceil(Math.max(0, ms) / 1000));
}

function mmss(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Truncates to `max` characters (by code point) with an ellipsis. */
export function truncate(text: string, max = 10): string {
  const chars = Array.from(text);
  return chars.length > max ? `${chars.slice(0, max).join('')}…` : text;
}

/** First letter of a name, uppercased, or empty. */
export function initial(name: string): string {
  const first = Array.from(name.trim())[0];
  return first ? first.toLocaleUpperCase('pt-BR') : '';
}

/** Dark or light text for a background colour (#rrggbb), using relative luminance. */
export function contrastText(hex: string): '#111111' | '#ffffff' {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return '#ffffff';
  const [r, g, b] = [m[1]!, m[2]!, m[3]!].map((h) => {
    const c = parseInt(h, 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  // Contrast against white vs. near-black; pick the larger.
  return (1.05 / (lum + 0.05) >= (lum + 0.05) / 0.056 ? '#ffffff' : '#111111');
}
