/** Pure nodes: recomputed every time something reads them. */
import type { Behavior, ValueCx } from './types';

const int = (n: number) => Math.trunc(n) | 0;

/** UE prints floats with six decimals (1.500000). */
const formatFloat = (n: number) => n.toFixed(6);

function binary(fn: (a: number, b: number) => number | boolean, asInt = false): Behavior {
  return {
    pure: (cx: ValueCx) => {
      const r = fn(cx.num('a'), cx.num('b'));
      return { result: typeof r === 'number' && asInt ? int(r) : r };
    },
  };
}

export const pureBehaviors: Record<string, Behavior> = {
  'math.addInt': binary((a, b) => a + b, true),
  'math.subtractInt': binary((a, b) => a - b, true),
  'math.equalInt': binary((a, b) => int(a) === int(b)),
  'math.greaterInt': binary((a, b) => int(a) > int(b)),
  'math.addFloat': binary((a, b) => a + b),
  'math.multiplyFloat': binary((a, b) => a * b),
  'math.lessFloat': binary((a, b) => a < b),
  'logic.and': { pure: (cx) => ({ result: cx.bool('a') && cx.bool('b') }) },
  'logic.or': { pure: (cx) => ({ result: cx.bool('a') || cx.bool('b') }) },
  'logic.not': { pure: (cx) => ({ result: !cx.bool('a') }) },
  'math.makeRotator': {
    pure: (cx) => ({ result: { x: cx.num('roll'), y: cx.num('pitch'), z: cx.num('yaw') } }),
  },
  'conv.intToString': { pure: (cx) => ({ result: String(int(cx.num('in'))) }) },
  'conv.floatToString': { pure: (cx) => ({ result: formatFloat(cx.num('in')) }) },
  'conv.boolToString': { pure: (cx) => ({ result: cx.bool('in') ? 'true' : 'false' }) },
  'conv.intToFloat': { pure: (cx) => ({ result: cx.num('in') }) },
  'conv.floatToInt': { pure: (cx) => ({ result: int(cx.num('in')) }) },
  'conv.objectToString': { pure: (cx) => ({ result: cx.world.displayName(cx.in('in')) }) },
  'math.randomIntInRange': {
    pure: (cx) => {
      const lo = int(cx.num('min'));
      const hi = int(cx.num('max'));
      const [a, b] = lo <= hi ? [lo, hi] : [hi, lo];
      return { result: a + Math.floor(cx.world.random() * (b - a + 1)) };
    },
  },
};
