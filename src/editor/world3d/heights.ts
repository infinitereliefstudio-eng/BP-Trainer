/**
 * Heights of the 3D view (3D-0, V7.77). The model has no Z yet (that is step B of the 3D roadmap): every
 * component stands on the floor, and its height is guessed from its shape and footprint, the way the level
 * designer of the lessons meant it. Pure functions, no DOM, no three.js: tested in tests/heights3d.test.ts.
 */
import type { ComponentRT } from '@core/runtime/world';

/** Height of UE's default character capsule (2 × 88 cm half-height, rounded). */
export const PLAYER_HEIGHT = 180;
/** A door, as in UE's starter content (SM_Door: 210 cm). */
export const DOOR_HEIGHT = 210;
/** A wall: high enough to read as a wall, low enough that the follow camera sees over it. */
export const WALL_HEIGHT = 250;
/** A lamp's post (a thin cylinder): its light sits on top. */
export const POST_HEIGHT = 150;
/** Box Collisions are drawn as wire boxes this high: the player's capsule fits in. */
export const ZONE_HEIGHT = 200;
/** A Point Light hangs this high when its actor has no post. */
export const LIGHT_HEIGHT = 200;
/** Text Render components float this high. */
export const TEXT_HEIGHT = 120;
/** Widget Components are drawn on the screen where this height of their actor is. */
export const WIDGET_HEIGHT = 160;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Height of a Static Mesh, in cm, from its shape and footprint. */
export function meshHeight(c: Pick<ComponentRT, 'props'>): number {
  const { shape, sizeX, sizeY, blocks } = c.props;
  if (shape === 'door') return DOOR_HEIGHT;
  const small = Math.min(sizeX, sizeY),
    big = Math.max(sizeX, sizeY);
  if (shape === 'cylinder') return small <= 50 ? POST_HEIGHT : clamp(Math.round(small * 1.1), 40, 160);
  // Thin and long: a wall.
  if (small <= 50 && big >= 120 && big >= small * 3) return WALL_HEIGHT;
  // Large and walked over (blocks off): a pad on the floor (pressure plate, rug, landing zone).
  if (!blocks && small >= 150) return 6;
  return clamp(Math.round(small * 0.9), 20, 140);
}

/** Height of a Point Light: on top of its actor's post if it has one, otherwise hung at LIGHT_HEIGHT. */
export function lightHeight(siblings: readonly Pick<ComponentRT, 'kind' | 'props'>[]): number {
  const post = siblings.find((s) => s.kind === 'StaticMesh' && s.props.shape === 'cylinder' && Math.min(s.props.sizeX, s.props.sizeY) <= 50);
  return post ? POST_HEIGHT + 25 : LIGHT_HEIGHT;
}
