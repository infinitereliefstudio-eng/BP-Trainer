/**
 * Scale, as in UE (S1, V7.83): every scene component has a Relative Scale 3D (1, 1, 1 by default), relative to its
 * parent. A parent's scale stretches its children: their size, and their Location (UE applies the parent's scale before
 * its rotation). The actor's Scale, in the level's Details, is its root component's. The app's level has no height
 * yet: Z only stretches what is drawn.
 *
 * A component without a parent that is not the root (older lessons) stands on the actor's origin as before, but takes
 * the root's scale, as it would under the root in UE.
 */
import type { ComponentProps } from './project';

export interface Scale3 {
  x: number;
  y: number;
  z: number;
}

export const ONE: Scale3 = { x: 1, y: 1, z: 1 };

/** A component's Relative Scale 3D (1 when it was never set: projects made before V7.83). */
export function scaleOf(p: Pick<ComponentProps, 'scaleX' | 'scaleY' | 'scaleZ'>): Scale3 {
  return { x: p.scaleX ?? 1, y: p.scaleY ?? 1, z: p.scaleZ ?? 1 };
}

/** Write a Relative Scale 3D; a scale of 1 is left out, so that projects made before V7.83 do not change. */
export function writeScale(p: Pick<ComponentProps, 'scaleX' | 'scaleY' | 'scaleZ'>, s: Scale3): void {
  for (const [k, v] of [
    ['scaleX', s.x],
    ['scaleY', s.y],
    ['scaleZ', s.z],
  ] as const) {
    if (v === 1) delete p[k];
    else p[k] = v;
  }
}

/** A placed actor's Scale: its own for each axis it sets, otherwise its Blueprint root's (`root`). */
export function levelActorScale(
  a: { scaleX?: number; scaleY?: number; scaleZ?: number },
  root: Pick<ComponentProps, 'scaleX' | 'scaleY' | 'scaleZ'> | undefined,
): Scale3 {
  const r = root ? scaleOf(root) : ONE;
  return { x: a.scaleX ?? r.x, y: a.scaleY ?? r.y, z: a.scaleZ ?? r.z };
}

/** Is it the identity (nothing to write in a saved project)? */
export const isOne = (s: Scale3): boolean => s.x === 1 && s.y === 1 && s.z === 1;

export interface ChainLink {
  id: string;
  parent?: string;
  props: Pick<ComponentProps, 'x' | 'y' | 'yaw' | 'scaleX' | 'scaleY' | 'scaleZ'>;
  /** A Widget Component's Location never turns with its parent (it stands on the screen). */
  kind?: string;
}

/** A transform in the actor's or the level's plane, with the world scale. */
export interface FrameTransform {
  x: number;
  y: number;
  yaw: number;
  sx: number;
  sy: number;
  sz: number;
}

const DEG = Math.PI / 180;

/** The actor's root: its first scene component without a parent (UE's RootComponent). */
export function rootComponent<C extends { parent?: string }>(components: readonly C[]): C | undefined {
  return components.find((c) => !c.parent);
}

/** The chain of a component, from the top: its parents first. */
export function chainOf<C extends ChainLink>(list: readonly C[], comp: C): C[] {
  const chain: C[] = [];
  let cur: C | undefined = comp;
  for (let guard = 0; cur && guard < 32; guard++) {
    chain.unshift(cur);
    const parentId: string | undefined = cur.parent;
    cur = parentId ? list.find((c) => c.id === parentId) : undefined;
  }
  return chain;
}

/**
 * Compose `chain` (from `chainOf`) from `start`. `root` is the actor's root component: a chain that does not start with
 * it still takes its scale.
 */
export function compose<C extends ChainLink>(chain: readonly C[], start: { x: number; y: number; yaw: number }, root?: C): FrameTransform {
  let t: FrameTransform = { ...start, sx: 1, sy: 1, sz: 1 };
  if (root && chain.length && chain[0] !== root) {
    const r = scaleOf(root.props);
    t = { ...t, sx: r.x, sy: r.y, sz: r.z };
  }
  for (const c of chain) {
    const r = c.kind === 'Widget' ? 0 : t.yaw * DEG;
    const lx = c.props.x * t.sx,
      ly = c.props.y * t.sy;
    const s = scaleOf(c.props);
    t = {
      x: t.x + lx * Math.cos(r) - ly * Math.sin(r),
      y: t.y + lx * Math.sin(r) + ly * Math.cos(r),
      yaw: t.yaw + c.props.yaw,
      sx: t.sx * s.x,
      sy: t.sy * s.y,
      sz: t.sz * s.z,
    };
  }
  return t;
}
