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

/**
 * The transform tools of UE's viewport bar (3D-2, V7.79): Select (Q), Move (W), Rotate (E), Scale (R); the coordinate
 * space (World, Local) and the three snaps, shared by the level and the Blueprint's Viewport as in UE. A snap of 0 is
 * off. The Blueprint's Viewport has its own view type, Perspective by default as in UE.
 */
export const TOOLS = ['Select', 'Move', 'Rotate', 'Scale'] as const;
export type Tool = (typeof TOOLS)[number];
export type Space = 'World' | 'Local';
export const GRID_SNAPS = [0, 1, 5, 10, 50, 100] as const;
export const ROTATION_SNAPS = [0, 5, 10, 15, 45, 90] as const;
export const SCALE_SNAPS = [0, 1, 5, 10, 50] as const;

const TOOL_KEY = 'bp-trainer.tool';
const SPACE_KEY = 'bp-trainer.space';
const GRID_KEY = 'bp-trainer.gridSnap';
const ROT_KEY = 'bp-trainer.rotationSnap';
const SCALE_KEY = 'bp-trainer.scaleSnap';
const BP_TYPE_KEY = 'bp-trainer.bpViewport';

function readNumber(key: string, all: readonly number[], fallback: number): number {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : (all.find((x) => x === Number(v)) ?? fallback);
  } catch {
    return fallback;
  }
}

export const tool = (): Tool => read(TOOL_KEY, TOOLS, 'Move');
export const setTool = (v: Tool): void => write(TOOL_KEY, v);
export const space = (): Space => read<Space>(SPACE_KEY, ['World', 'Local'], 'World');
export const setSpace = (v: Space): void => write(SPACE_KEY, v);
export const gridSnap = (): number => readNumber(GRID_KEY, GRID_SNAPS, 10);
export const setGridSnap = (v: number): void => write(GRID_KEY, String(v));
export const rotationSnap = (): number => readNumber(ROT_KEY, ROTATION_SNAPS, 10);
export const setRotationSnap = (v: number): void => write(ROT_KEY, String(v));
export const scaleSnap = (): number => readNumber(SCALE_KEY, SCALE_SNAPS, 10);
export const setScaleSnap = (v: number): void => write(SCALE_KEY, String(v));
export const bpViewType = (): ViewType => read(BP_TYPE_KEY, VIEW_TYPES, 'Perspective');
export const setBpViewType = (v: ViewType): void => write(BP_TYPE_KEY, v);

/** What the editors' views need to know of the bar: snapping and the transform tool. */
export interface Snapping {
  tool: Tool;
  space: Space;
  grid: number;
  rotation: number;
  scale: number;
}

export const snapping = (): Snapping => ({ tool: tool(), space: space(), grid: gridSnap(), rotation: rotationSnap(), scale: scaleSnap() });
