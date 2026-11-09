/** Runtime value helpers shared by behaviours: conversions, copies and UE-style equality. */
import type { Vec3 } from '../types/values';
import { isRef, type RValue } from './world';

/** An Integer as UE stores it: 32 bits, truncated toward zero. */
export const toInt = (n: number) => Math.trunc(n) | 0;

/** A Vector or Rotator value, missing or broken parts read as 0. */
export function toVec(v: unknown): Vec3 {
  const p = (v ?? {}) as Partial<Vec3>;
  return { x: Number(p.x) || 0, y: Number(p.y) || 0, z: Number(p.z) || 0 };
}

/** A deep copy for containers, vectors and structures, as UE copies on Set; references stay shared. */
export function copyValue(v: RValue): RValue {
  if (Array.isArray(v)) return v.map(copyValue);
  if (v && typeof v === 'object' && !isRef(v)) {
    const out: Record<string, RValue> = {};
    for (const [k, x] of Object.entries(v as Record<string, RValue>)) out[k] = copyValue(x);
    return out as RValue;
  }
  return v;
}

/** Equality used by Contains, Find, Remove Item, Add Unique and ==. */
export function sameValue(a: RValue, b: RValue): boolean {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
    if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) < 1e-9;
    return false;
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => sameValue(x, b[i]));
  }
  const ka = Object.keys(a);
  return ka.length === Object.keys(b).length && ka.every((k) => sameValue((a as Record<string, RValue>)[k], (b as Record<string, RValue>)[k]));
}
