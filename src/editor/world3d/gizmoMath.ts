/**
 * The arithmetic of the transform gizmo (3D-2, V7.79), measured on the screen so that it works the same in
 * Perspective and in the orthographic views: how far along an axis a finger went, by what angle it turned around the
 * gizmo, and UE's snapping. No three.js, no DOM: tested in tests/gizmo3d.test.ts.
 */
import type { Point } from '../camera';

export interface Projector {
  toScreen(x: number, y: number, h?: number): Point;
}

export type Handle = 'x' | 'y' | 'xy' | 'rot' | 'sx' | 'sy' | 'sxy';

/** The transform tools and snaps of the viewport bar, as the views need them (a snap of 0 is off). */
export interface GizmoSettings {
  tool: 'Select' | 'Move' | 'Rotate' | 'Scale';
  space: 'World' | 'Local';
  grid: number;
  rotation: number;
  scale: number;
}

const DEG = Math.PI / 180;

/** The gizmo's length on the screen, in px. */
export const GIZMO_PX = 90;

/** An axis of the level (X or Y), turned by `yaw` degrees in Local space. */
export function axisOf(handle: 'x' | 'y' | 'sx' | 'sy', yaw: number): Point {
  const a = (handle === 'x' || handle === 'sx' ? 0 : 90) * DEG + yaw * DEG;
  return { x: Math.cos(a), y: Math.sin(a) };
}

/**
 * How many cm along `axis` (from the point `o` of the level, at height `h`) a finger moved by (dx, dy) screen
 * pixels: the drag projected on the axis as the screen shows it. 0 when the axis points at the camera.
 */
export function alongAxis(p: Projector, o: Point, h: number, axis: Point, dx: number, dy: number): number {
  const a = p.toScreen(o.x, o.y, h);
  const b = p.toScreen(o.x + axis.x * 100, o.y + axis.y * 100, h);
  const vx = b.x - a.x,
    vy = b.y - a.y;
  const l2 = vx * vx + vy * vy;
  if (l2 < 9) return 0;
  return (100 * (dx * vx + dy * vy)) / l2;
}

/**
 * How many screen pixels a finger moved by (dx, dy) along `axis` as the screen shows it (from the point `o`, at height
 * `h`). 0 when the axis points at the camera. The Scale handles use it: like UE's, they change the scale by how far the
 * finger goes, whatever the size of the object.
 */
export function alongScreenAxis(p: Projector, o: Point, h: number, axis: Point, dx: number, dy: number): number {
  const a = p.toScreen(o.x, o.y, h);
  const b = p.toScreen(o.x + axis.x * 100, o.y + axis.y * 100, h);
  const vx = b.x - a.x,
    vy = b.y - a.y;
  const l = Math.hypot(vx, vy);
  if (l < 3) return 0;
  return (dx * vx + dy * vy) / l;
}

/**
 * UE's Scale Snap (a factor: 0.25 by default): the scale lands on the step; without snap, on the thousandth. Never 0 or
 * less here: the app's shapes need a size (UE would let a scale go negative and mirror the mesh).
 */
export function snapScale(v: number, step: number): number {
  const r = step > 0 ? Math.round(v / step) * step : Math.round(v * 1000) / 1000;
  return r > 0 ? r : step > 0 ? step : 0.001;
}

/** UE's snapping: to the step when it is on; to the whole unit otherwise (no 213,47 from a finger). */
export function snap(v: number, step: number): number {
  const r = step > 0 ? Math.round(v / step) * step : Math.round(v);
  return r || 0;
}

/** The angle of a screen point around a screen centre, in degrees. */
export function screenAngle(c: Point, p: Point): number {
  return Math.atan2(p.y - c.y, p.x - c.x) / DEG;
}

/** The smallest turn from one angle to another, in degrees, in [-180, 180). */
export function turn(from: number, to: number): number {
  let d = (to - from) % 360;
  if (d >= 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

/** Keep a Yaw in (-180, 180], as the Details show it. */
export function normalizeYaw(yaw: number): number {
  let y = yaw % 360;
  if (y > 180) y -= 360;
  if (y <= -180) y += 360;
  return y || 0;
}
