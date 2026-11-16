/** Transform nodes: a 2D world, so a rotation is a turn around Z (Yaw). */
import { IDENTITY_TRANSFORM, type TransformValue, type Vec3 } from '../../types/values';
import { toVec } from '../values';
import type { RValue } from '../world';
import type { Behavior } from './types';

const DEG = Math.PI / 180;

function toTransform(v: unknown): TransformValue {
  const t = (v ?? {}) as Partial<TransformValue>;
  return {
    location: toVec(t.location),
    rotation: toVec(t.rotation),
    scale: t.scale ? toVec(t.scale) : { ...IDENTITY_TRANSFORM.scale },
  };
}

/** Local to world: scale, turn, then move. */
export function transformLocation(t: TransformValue, p: Vec3): Vec3 {
  const r = t.rotation.z * DEG;
  const x = p.x * t.scale.x,
    y = p.y * t.scale.y;
  return { x: t.location.x + x * Math.cos(r) - y * Math.sin(r), y: t.location.y + x * Math.sin(r) + y * Math.cos(r), z: t.location.z + p.z * t.scale.z };
}

/** World to local: move back, turn back, unscale (a zero scale gives 0, as UE's safe reciprocal does). */
export function inverseTransformLocation(t: TransformValue, p: Vec3): Vec3 {
  const r = -t.rotation.z * DEG;
  const dx = p.x - t.location.x,
    dy = p.y - t.location.y;
  const inv = (s: number) => (Math.abs(s) < 1e-8 ? 0 : 1 / s);
  return { x: (dx * Math.cos(r) - dy * Math.sin(r)) * inv(t.scale.x), y: (dx * Math.sin(r) + dy * Math.cos(r)) * inv(t.scale.y), z: (p.z - t.location.z) * inv(t.scale.z) };
}

const out = (t: TransformValue) => t as unknown as RValue;

export const transformBehaviors: Record<string, Behavior> = {
  'actor.getTransform': {
    pure: (cx) => {
      const a = cx.world.actor(cx.in('target'), 'Target');
      return { result: out({ location: { x: a?.x ?? 0, y: a?.y ?? 0, z: 0 }, rotation: { x: 0, y: 0, z: a?.yaw ?? 0 }, scale: { x: 1, y: 1, z: 1 } }) };
    },
  },
  'math.makeTransform': {
    pure: (cx) => ({ result: out({ location: toVec(cx.in('location')), rotation: toVec(cx.in('rotation')), scale: cx.in('scale') ? toVec(cx.in('scale')) : { x: 1, y: 1, z: 1 } }) }),
  },
  'math.breakTransform': {
    pure: (cx) => {
      const t = toTransform(cx.in('in'));
      return { location: t.location, rotation: t.rotation, scale: t.scale };
    },
  },
  'math.transformLocation': { pure: (cx) => ({ result: transformLocation(toTransform(cx.in('t')), toVec(cx.in('location'))) }) },
  'math.inverseTransformLocation': { pure: (cx) => ({ result: inverseTransformLocation(toTransform(cx.in('t')), toVec(cx.in('location'))) }) },
};
