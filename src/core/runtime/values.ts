/** Runtime value helpers shared by behaviours: copies and UE-style equality. */
import { isRef, type RValue } from './world';

/** A deep copy for arrays and vectors, as UE copies on Set; references stay shared. */
export function copyValue(v: RValue): RValue {
  if (Array.isArray(v)) return v.map(copyValue);
  if (v && typeof v === 'object' && !isRef(v)) return { ...(v as object) } as RValue;
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
