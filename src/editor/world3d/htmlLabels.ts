/**
 * Text over the 3D level editor (3D-1, V7.78): actors' names, Player Starts, Widget Component frames and the names of
 * reference variables, as HTML placed on the screen each frame. They stay sharp and the same size whatever the
 * distance, as the top view's labels; made once per key, moved afterwards, removed when gone.
 */
export interface Label {
  key: string;
  text: string;
  x: number;
  y: number;
  /** Extra class: 'start', 'frame' (a Widget Component's Draw Size), 'ref', 'selected'. */
  cls?: string;
  /** A frame's size in px; a label without one is centred on (x, y) with its top there. */
  w?: number;
  h?: number;
  faded?: boolean;
}

export class HtmlLabels {
  readonly el = document.createElement('div');
  private readonly items = new Map<string, HTMLDivElement>();

  constructor() {
    this.el.className = 'world3d-labels';
  }

  update(labels: readonly Label[]): void {
    const seen = new Set<string>();
    for (const l of labels) {
      seen.add(l.key);
      let div = this.items.get(l.key);
      if (!div) {
        div = document.createElement('div');
        this.items.set(l.key, div);
        this.el.appendChild(div);
      }
      const cls = `w3-label${l.cls ? ` ${l.cls}` : ''}${l.faded ? ' faded' : ''}`;
      if (div.className !== cls) div.className = cls;
      if (div.textContent !== l.text) div.textContent = l.text;
      if (l.w !== undefined && l.h !== undefined) {
        div.style.width = `${l.w}px`;
        div.style.height = `${l.h}px`;
        div.style.transform = `translate(${l.x - l.w / 2}px, ${l.y - l.h / 2}px)`;
      } else div.style.transform = `translate(${l.x}px, ${l.y}px) translateX(-50%)`;
    }
    for (const [key, div] of this.items) {
      if (seen.has(key)) continue;
      div.remove();
      this.items.delete(key);
    }
  }
}

/**
 * Keep the labels that do not cover one another: frames always, then the selected actor, the Player Starts, then the
 * rest from the nearest (lowest on the screen) up. A crowded level seen from afar shows a few names, not a heap.
 */
export function declutter(labels: readonly Label[]): Label[] {
  const rank = (l: Label) => (l.w !== undefined ? 0 : l.cls === 'selected' ? 1 : l.cls === 'ref' ? 2 : l.cls === 'start' ? 3 : 4);
  const sorted = [...labels].sort((a, b) => rank(a) - rank(b) || b.y - a.y);
  const kept: Label[] = [];
  const boxes: { x0: number; y0: number; x1: number; y1: number }[] = [];
  for (const l of sorted) {
    if (l.w !== undefined) {
      kept.push(l);
      continue;
    }
    const w = l.text.length * 6.6 + 6;
    const box = { x0: l.x - w / 2, y0: l.y, x1: l.x + w / 2, y1: l.y + 15 };
    if (boxes.some((b) => b.x0 < box.x1 && box.x0 < b.x1 && b.y0 < box.y1 && box.y0 < b.y1)) continue;
    boxes.push(box);
    kept.push(l);
  }
  return kept;
}
