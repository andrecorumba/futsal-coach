// Small SVG DOM helpers.

export const SVG_NS = 'http://www.w3.org/2000/svg';

export function svgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number> = {},
  parent?: Element,
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  parent?.appendChild(el);
  return el;
}

/** Sets an attribute only when it changed, to keep re-renders cheap. */
export function setAttr(el: Element, name: string, value: string | number): void {
  const v = String(value);
  if (el.getAttribute(name) !== v) el.setAttribute(name, v);
}

export function setText(el: Element, text: string): void {
  if (el.textContent !== text) el.textContent = text;
}
