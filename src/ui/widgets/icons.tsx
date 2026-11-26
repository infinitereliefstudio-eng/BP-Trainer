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
  | 'arrow-down'
  | 'cap'
  | 'select'
  | 'move'
  | 'rotate'
  | 'scale'
  | 'globe'
  | 'cube'
  | 'grid'
  | 'angle'
  | 'size'
  | 'plus'
  | 'mode'
  | 'blueprint'
  | 'film'
  | 'platforms'
  | 'eject';

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
  select: { f: 'M5 3 L5 15.5 L8.4 12.3 L10.8 17.2 L12.9 16.2 L10.6 11.4 L15 11.4 Z' },
  move: { s: 'M10 2.5 V17.5 M2.5 10 H17.5 M7.8 4.7 L10 2.5 L12.2 4.7 M7.8 15.3 L10 17.5 L12.2 15.3 M4.7 7.8 L2.5 10 L4.7 12.2 M15.3 7.8 L17.5 10 L15.3 12.2' },
  rotate: { s: 'M15.6 7.2 A6.2 6.2 0 1 0 16.2 11 M16 3 V7.4 H11.6' },
  scale: { s: 'M3 9 V17 H11 M3 17 L16 4 M10.5 4 H16 V9.5' },
  globe: { s: 'M10 2.8 a7.2 7.2 0 1 0 0.01 0 Z M2.8 10 H17.2 M10 2.8 C6.8 6 6.8 14 10 17.2 M10 2.8 C13.2 6 13.2 14 10 17.2' },
  cube: { s: 'M10 2.5 L16.5 6 V14 L10 17.5 L3.5 14 V6 Z M3.5 6 L10 9.5 L16.5 6 M10 9.5 V17.5' },
  grid: { s: 'M3 3 H17 V17 H3 Z M7.7 3 V17 M12.3 3 V17 M3 7.7 H17 M3 12.3 H17' },
  angle: { s: 'M3 16 H17 M3 16 L13 4 M8.5 16 A5.5 5.5 0 0 0 6.4 11.8' },
  size: { s: 'M3 8 V3 H8 M17 12 V17 H12 M3 3 L17 17' },
  plus: { s: 'M10 4 V16 M4 10 H16' },
  mode: { s: 'M3 3 H11 M3 3 V11 M17 17 H11 M17 17 V11', f: 'M8 7 L8 15.5 L10.3 13.3 L11.9 16.6 L13.3 15.9 L11.8 12.7 L14.8 12.7 Z' },
  blueprint: { s: 'M3 4 H8 V8 H3 Z M12 12 H17 V16 H12 Z M8 6 H10 V14 H12' },
  film: { s: 'M3 5 H17 V15 H3 Z M6 5 V15 M14 5 V15 M3 8.3 H6 M3 11.7 H6 M14 8.3 H17 M14 11.7 H17' },
  platforms: { s: 'M3 4 H17 V13 H3 Z M7.5 16.5 H12.5 M10 13 V16.5' },
  eject: { f: 'M10 4 L16 11 H4 Z M4 13.5 H16 V16 H4 Z' },
  cap: { s: 'M2 8 L10 4.5 L18 8 L10 11.5 Z M5.5 9.6 V13.2 C7.5 15.2 12.5 15.2 14.5 13.2 V9.6 M18 8 V12.5' },
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
