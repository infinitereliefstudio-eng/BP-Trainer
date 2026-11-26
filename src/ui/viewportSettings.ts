/**
 * The level editor's viewport (3D-1, V7.78), kept in this browser only: its view type, as UE's viewport menu
 * (Perspective, and the orthographic Top, Bottom, Left, Right, Front, Back) and its view mode (Lit, Unlit,
 * Wireframe). Top is the top view the app always had; it stays the default.
 */
export const VIEW_TYPES = ['Perspective', 'Top', 'Bottom', 'Left', 'Right', 'Front', 'Back'] as const;
export type ViewType = (typeof VIEW_TYPES)[number];
export const VIEW_MODES = ['Lit', 'Unlit', 'Wireframe'] as const;
export type ViewMode = (typeof VIEW_MODES)[number];

const TYPE_KEY = 'bp-trainer.levelView';
const MODE_KEY = 'bp-trainer.levelViewMode';
const listeners = new Set<() => void>();

function read<T extends string>(key: string, all: readonly T[], fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return all.find((x) => x === v) ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* not kept: the default applies next time */
  }
  for (const fn of listeners) fn();
}

export const viewType = (): ViewType => read(TYPE_KEY, VIEW_TYPES, 'Top');
export const setViewType = (v: ViewType): void => write(TYPE_KEY, v);
export const viewMode = (): ViewMode => read(MODE_KEY, VIEW_MODES, 'Lit');
export const setViewMode = (v: ViewMode): void => write(MODE_KEY, v);

/** Called after each change of the view type or mode. */
export function onViewportSettings(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
