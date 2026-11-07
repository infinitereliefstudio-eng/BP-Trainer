/** Maths and logic behaviours, matching the tables of nodes/library/math. */
import type { Vec3 } from '../../types/values';
import type { RValue } from '../world';
import { sameValue } from '../values';
import type { Behavior, ValueCx } from './types';

const int = (n: number) => Math.trunc(n) | 0;
const vec = (v: RValue): Vec3 => {
  const p = (v ?? {}) as Partial<Vec3>;
  return { x: Number(p.x) || 0, y: Number(p.y) || 0, z: Number(p.z) || 0 };
};

function binary(fn: (a: number, b: number, cx: ValueCx) => number | boolean, asInt = false): Behavior {
  return {
    pure: (cx) => {
      const a = asInt ? int(cx.num('a')) : cx.num('a');
      const b = asInt ? int(cx.num('b')) : cx.num('b');
      const r = fn(a, b, cx);
      return { result: typeof r === 'number' && asInt ? int(r) : r };
    },
  };
}

/** Division by zero: UE logs "Divide by zero" and returns 0. */
const divide = (a: number, b: number, cx: ValueCx, asInt: boolean) => {
  if (b === 0) {
    cx.world.runtimeError('Divide by zero');
    return 0;
  }
  return asInt ? Math.trunc(a / b) : a / b;
};

const ops = (asInt: boolean): Record<string, (a: number, b: number, cx: ValueCx) => number | boolean> => ({
  add: (a, b) => a + b,
  subtract: (a, b) => a - b,
  multiply: (a, b) => a * b,
  divide: (a, b, cx) => divide(a, b, cx, asInt),
  equal: (a, b) => (asInt ? a === b : Math.abs(a - b) <= 1e-4),
  notEqual: (a, b) => (asInt ? a !== b : Math.abs(a - b) > 1e-4),
  less: (a, b) => a < b,
  lessEqual: (a, b) => a <= b,
  greater: (a, b) => a > b,
  greaterEqual: (a, b) => a >= b,
  min: (a, b) => Math.min(a, b),
  max: (a, b) => Math.max(a, b),
});

const families: Record<string, Behavior> = {};
for (const k of ['Int', 'Float'] as const) {
  const asInt = k === 'Int';
  for (const [op, fn] of Object.entries(ops(asInt))) families[`math.${op}${k}`] = binary(fn, asInt);
  families[`math.clamp${k}`] = {
    pure: (cx) => {
      const n = (p: string) => (asInt ? int(cx.num(p)) : cx.num(p));
      return { result: Math.min(Math.max(n('value'), n('min')), n('max')) };
    },
  };
  families[`math.abs${k}`] = { pure: (cx) => ({ result: Math.abs(asInt ? int(cx.num('a')) : cx.num('a')) }) };
}

export const mathBehaviors: Record<string, Behavior> = {
  ...families,
  'math.moduloInt': binary((a, b, cx) => {
    if (b === 0) {
      cx.world.runtimeError('Modulo by zero');
      return 0;
    }
    return a % b;
  }, true),
  // UE rounds half away from zero.
  'math.round': { pure: (cx) => ({ result: int(Math.sign(cx.num('a')) * Math.round(Math.abs(cx.num('a')))) }) },
  'math.floor': { pure: (cx) => ({ result: int(Math.floor(cx.num('a'))) }) },
  'math.ceil': { pure: (cx) => ({ result: int(Math.ceil(cx.num('a'))) }) },

  'math.randomIntInRange': {
    pure: (cx) => {
      const lo = int(cx.num('min'));
      const hi = int(cx.num('max'));
      const [a, b] = lo <= hi ? [lo, hi] : [hi, lo];
      return { result: a + Math.floor(cx.world.random() * (b - a + 1)) };
    },
  },
  'math.randomFloatInRange': {
    pure: (cx) => ({ result: cx.num('min') + cx.world.random() * (cx.num('max') - cx.num('min')) }),
  },
  'math.randomBool': { pure: (cx) => ({ result: cx.world.random() < 0.5 }) },

  'logic.and': { pure: (cx) => ({ result: cx.bool('a') && cx.bool('b') }) },
  'logic.or': { pure: (cx) => ({ result: cx.bool('a') || cx.bool('b') }) },
  'logic.xor': { pure: (cx) => ({ result: cx.bool('a') !== cx.bool('b') }) },
  'logic.equalBool': { pure: (cx) => ({ result: cx.bool('a') === cx.bool('b') }) },
  'logic.not': { pure: (cx) => ({ result: !cx.bool('a') }) },
  'logic.equalObject': { pure: (cx) => ({ result: sameValue(cx.in('a'), cx.in('b')) }) },
  'logic.notEqualObject': { pure: (cx) => ({ result: !sameValue(cx.in('a'), cx.in('b')) }) },
  'logic.equalEnum': { pure: (cx) => ({ result: int(cx.num('a')) === int(cx.num('b')) }) },

  'math.makeVector': { pure: (cx) => ({ result: { x: cx.num('x'), y: cx.num('y'), z: cx.num('z') } }) },
  'math.breakVector': {
    pure: (cx) => {
      const v = vec(cx.in('in'));
      return { x: v.x, y: v.y, z: v.z };
    },
  },
  'math.addVector': {
    pure: (cx) => {
      const a = vec(cx.in('a')),
        b = vec(cx.in('b'));
      return { result: { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z } };
    },
  },
  'math.subtractVector': {
    pure: (cx) => {
      const a = vec(cx.in('a')),
        b = vec(cx.in('b'));
      return { result: { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z } };
    },
  },
  'math.multiplyVectorFloat': {
    pure: (cx) => {
      const a = vec(cx.in('a')),
        k = cx.num('b');
      return { result: { x: a.x * k, y: a.y * k, z: a.z * k } };
    },
  },
  'math.vectorLength': {
    pure: (cx) => {
      const a = vec(cx.in('a'));
      return { result: Math.hypot(a.x, a.y, a.z) };
    },
  },
  'math.vectorDistance': {
    pure: (cx) => {
      const a = vec(cx.in('a')),
        b = vec(cx.in('b'));
      return { result: Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) };
    },
  },
  'math.makeRotator': { pure: (cx) => ({ result: { x: cx.num('roll'), y: cx.num('pitch'), z: cx.num('yaw') } }) },
  'math.breakRotator': {
    pure: (cx) => {
      const r = vec(cx.in('in'));
      return { roll: r.x, pitch: r.y, yaw: r.z };
    },
  },
};
