/** Equality used by container functions: Strings and Names ignore case, as UE's == and hashing do. */
import { resolvePins } from '../../nodes/registry';
import { sameValue } from '../values';
import type { RValue } from '../world';
import type { ValueCx } from './types';

export function keyEq(cx: ValueCx, pin: string): (a: RValue, b: RValue) => boolean {
  const cat = resolvePins(cx.node, cx.ctx).find((p) => p.id === pin)?.type.category;
  if (cat === 'string' || cat === 'name') return (a, b) => String(a ?? '').toLowerCase() === String(b ?? '').toLowerCase();
  return sameValue;
}
