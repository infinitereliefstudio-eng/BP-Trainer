/**
 * The app's one icon set (UI-1, V7.75): line icons drawn in SVG, in place of text glyphs (✕ ⋮ ↶ ▾…) that do not
 * look the same on every phone. They take the text colour (`currentColor`) and scale with the text size setting
 * (`1.25em` by default). An icon alone in a button needs an `aria-label` on the button.
 */

export type IconName =
  | 'close'
  | 'more'
  | 'home'
  | 'undo'
  | 'redo'
  | 'focus'
  | 'reset'
  | 'chevron-down'
  | 'chevron-right'
  | 'chevron-up'
  | 'play'
  | 'pause'
  | 'step'
  | 'check'
  | 'error'
  | 'warning'
  | 'info'
  | 'settings'
  | 'stop'
  | 'search'
  | 'drawer'
  | 'list'
  | 'arrow-up'
  | 'arrow-down';

/** Each icon on a 20 × 20 grid: strokes (`s`) drawn 1.6 wide, and filled shapes (`f`). */
const PATHS: Record<IconName, { s?: string; f?: string }> = {
  close: { s: 'M5 5 L15 15 M15 5 L5 15' },
  more: { f: 'M10 3.2 a1.7 1.7 0 1 0 0.01 0 Z M10 8.3 a1.7 1.7 0 1 0 0.01 0 Z M10 13.4 a1.7 1.7 0 1 0 0.01 0 Z' },
  home: { s: 'M3.5 9.5 L10 3.8 L16.5 9.5 M5.5 8 V16 H8.5 V11.5 H11.5 V16 H14.5 V8' },
  undo: { s: 'M7.5 4.5 L3.8 8 L7.5 11.5 M4 8 H12 a4 4 0 0 1 0 8 H8.5' },
  redo: { s: 'M12.5 4.5 L16.2 8 L12.5 11.5 M16 8 H8 a4 4 0 0 0 0 8 H11.5' },
  focus: { s: 'M10 2.5 V6 M10 14 V17.5 M2.5 10 H6 M14 10 H17.5 M10 6 a4 4 0 1 0 0.01 0 Z' },
  reset: { s: 'M4.6 7.2 A6 6 0 1 1 4 11 M4.2 3.6 V7.6 H8.2' },
  'chevron-down': { s: 'M5 7.5 L10 12.5 L15 7.5' },
  'chevron-right': { s: 'M7.5 5 L12.5 10 L7.5 15' },
  'chevron-up': { s: 'M5 12.5 L10 7.5 L15 12.5' },
  play: { f: 'M6 4 L16 10 L6 16 Z' },
  pause: { f: 'M5.5 4 H8.5 V16 H5.5 Z M11.5 4 H14.5 V16 H11.5 Z' },
  step: { f: 'M4.5 4 L12.5 10 L4.5 16 Z M13.5 4 H16 V16 H13.5 Z' },
  check: { s: 'M4 10.5 L8.2 14.5 L16 5.8' },
  error: { s: 'M10 2.8 a7.2 7.2 0 1 0 0.01 0 Z M7.2 7.2 L12.8 12.8 M12.8 7.2 L7.2 12.8' },
  warning: { s: 'M10 3 L17.5 16.5 H2.5 Z M10 8 V11.8 M10 13.8 V14.2' },
  info: { s: 'M10 2.8 a7.2 7.2 0 1 0 0.01 0 Z M10 9 V14 M10 6.2 V6.6' },
  stop: { f: 'M5 5 H15 V15 H5 Z' },
  search: { s: 'M8.5 3.5 a5 5 0 1 0 0.01 0 Z M12.2 12.2 L16.5 16.5' },
  drawer: { s: 'M3 5.5 H17 V15.5 H3 Z M3 9 H17 M8.5 11.8 H11.5' },
  list: { s: 'M7 5.5 H16.5 M7 10 H16.5 M7 14.5 H16.5 M3.5 5.5 V5.6 M3.5 10 V10.1 M3.5 14.5 V14.6' },
  'arrow-up': { s: 'M10 16 V4.5 M5.5 9 L10 4.5 L14.5 9' },
  'arrow-down': { s: 'M10 4 V15.5 M5.5 11 L10 15.5 L14.5 11' },
  settings: {
    s: 'M10 7.2 a2.8 2.8 0 1 0 0.01 0 Z M10 2.5 V4.6 M10 15.4 V17.5 M2.5 10 H4.6 M15.4 10 H17.5 M4.7 4.7 L6.2 6.2 M13.8 13.8 L15.3 15.3 M4.7 15.3 L6.2 13.8 M13.8 6.2 L15.3 4.7',
  },
};

export function Icon({ name, size }: { name: IconName; size?: number | string }) {
  const p = PATHS[name];
  const s = size ?? '1.25em';
  return (
    <svg class={`icon icon-${name}`} width={s} height={s} viewBox="0 0 20 20" aria-hidden="true">
      {p.f && <path d={p.f} fill="currentColor" />}
      {p.s && <path d={p.s} fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />}
    </svg>
  );
}

/** Dashed frame with a pointer corner: the marquee selection mode of the graph. */
export function SelectionIcon() {
  return (
    <svg class="icon" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <rect x="2.5" y="3.5" width="12" height="10" rx="1" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="2.6 2" />
      <path d="M12 11 L18 13.4 L15.4 14.6 L14.2 17.4 Z" fill="currentColor" />
    </svg>
  );
}
