/** Maths and logic behaviours, matching the tables of nodes/library/math. */
import { sameValue, toInt, toVec } from '../values';
import type { Behavior, ValueCx } from './types';

function binary(fn: (a: number, b: number, cx: ValueCx) => number | boolean, asInt = false): Behavior {
  return {
    pure: (cx) => {
      const a = asInt ? toInt(cx.num('a')) : cx.num('a');
      const b = asInt ? toInt(cx.num('b')) : cx.num('b');
      const r = fn(a, b, cx);
      return { result: typeof r === 'number' && asInt ? toInt(r) : r };
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
  // Exact, as UE's == ; Nearly Equal (Float) is the tolerant one.
  equal: (a, b) => a === b,
  notEqual: (a, b) => a !== b,
  less: (a, b) => a < b,
  lessEqual: (a, b) => a <= b,
  greater: (a, b) => a > b,
  greaterEqual: (a, b) => a >= b,
  min: (a, b) => Math.min(a, b),
  max: (a, b) => Math.max(a, b),
});

/** Value moved from the In range to the Out range (UE's GetMappedRangeValue). */
function mapRange(cx: ValueCx, clamped: boolean): number {
  const inA = cx.num('inA'),
    inB = cx.num('inB'),
    outA = cx.num('outA'),
    outB = cx.num('outB');
  let k = inB === inA ? (cx.num('value') >= inB ? 1 : 0) : (cx.num('value') - inA) / (inB - inA);
  if (clamped) k = Math.min(Math.max(k, 0), 1);
  return outA + (outB - outA) * k;
}

const families: Record<string, Behavior> = {};
for (const k of ['Int', 'Float'] as const) {
  const asInt = k === 'Int';
  for (const [op, fn] of Object.entries(ops(asInt))) families[`math.${op}${k}`] = binary(fn, asInt);
  families[`math.clamp${k}`] = {
    pure: (cx) => {
      const n = (p: string) => (asInt ? toInt(cx.num(p)) : cx.num(p));
      return { result: Math.min(Math.max(n('value'), n('min')), n('max')) };
    },
  };
  families[`math.abs${k}`] = { pure: (cx) => ({ result: Math.abs(asInt ? toInt(cx.num('a')) : cx.num('a')) }) };
}

export const mathBehaviors: Record<string, Behavior> = {
  ...families,
  'math.nearlyEqualFloat': {
    pure: (cx) => ({ result: Math.abs(cx.num('a') - cx.num('b')) <= Math.abs(cx.num('tolerance')) }),
  },
  'math.moduloInt': binary((a, b, cx) => {
    if (b === 0) {
      cx.world.runtimeError('Modulo by zero');
      return 0;
    }
    return a % b;
  }, true),
  // UE rounds half away from zero.
  'math.round': { pure: (cx) => ({ result: toInt(Math.sign(cx.num('a')) * Math.round(Math.abs(cx.num('a')))) }) },
  'math.floor': { pure: (cx) => ({ result: toInt(Math.floor(cx.num('a'))) }) },
  'math.ceil': { pure: (cx) => ({ result: toInt(Math.ceil(cx.num('a'))) }) },

  'math.randomIntInRange': {
    pure: (cx) => {
      const lo = toInt(cx.num('min'));
      const hi = toInt(cx.num('max'));
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
  'logic.equalEnum': { pure: (cx) => ({ result: toInt(cx.num('a')) === toInt(cx.num('b')) }) },

  'math.makeVector': { pure: (cx) => ({ result: { x: cx.num('x'), y: cx.num('y'), z: cx.num('z') } }) },
  'math.breakVector': {
    pure: (cx) => {
      const v = toVec(cx.in('in'));
      return { x: v.x, y: v.y, z: v.z };
    },
  },
  'math.addVector': {
    pure: (cx) => {
      const a = toVec(cx.in('a')),
        b = toVec(cx.in('b'));
      return { result: { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z } };
    },
  },
  'math.subtractVector': {
    pure: (cx) => {
      const a = toVec(cx.in('a')),
        b = toVec(cx.in('b'));
      return { result: { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z } };
    },
  },
  'math.multiplyVectorFloat': {
    pure: (cx) => {
      const a = toVec(cx.in('a')),
        k = cx.num('b');
      return { result: { x: a.x * k, y: a.y * k, z: a.z * k } };
    },
  },
  'math.vectorLength': {
    pure: (cx) => {
      const a = toVec(cx.in('a'));
      return { result: Math.hypot(a.x, a.y, a.z) };
    },
  },
  'math.vectorDistance': {
    pure: (cx) => {
      const a = toVec(cx.in('a')),
        b = toVec(cx.in('b'));
      return { result: Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) };
    },
  },
  'math.lerp': { pure: (cx) => ({ result: cx.num('a') + (cx.num('b') - cx.num('a')) * cx.num('alpha') }) },
  'math.lerpVector': {
    pure: (cx) => {
      const a = toVec(cx.in('a')),
        b = toVec(cx.in('b')),
        k = cx.num('alpha');
      return { result: { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k } };
    },
  },
  'math.mapRangeClamped': { pure: (cx) => ({ result: mapRange(cx, true) }) },
  'math.mapRangeUnclamped': { pure: (cx) => ({ result: mapRange(cx, false) }) },
  // UE's FMath::FInterpTo: a step proportional to the distance left, never past the target.
  'math.fInterpTo': {
    pure: (cx) => {
      const cur = cx.num('current'),
        target = cx.num('target'),
        speed = cx.num('speed');
      if (speed <= 0) return { result: target };
      const dist = target - cur;
      if (dist * dist < 1e-8) return { result: target };
      return { result: cur + dist * Math.min(Math.max(cx.num('delta') * speed, 0), 1) };
    },
  },
  'math.fInterpToConstant': {
    pure: (cx) => {
      const cur = cx.num('current'),
        target = cx.num('target');
      const dist = target - cur;
      const step = Math.max(cx.num('delta') * cx.num('speed'), 0);
      return { result: Math.abs(dist) <= step ? target : cur + Math.sign(dist) * step };
    },
  },
  'math.vInterpTo': {
    pure: (cx) => {
      const cur = toVec(cx.in('current')),
        target = toVec(cx.in('target')),
        speed = cx.num('speed');
      if (speed <= 0) return { result: target };
      const d = { x: target.x - cur.x, y: target.y - cur.y, z: target.z - cur.z };
      if (d.x * d.x + d.y * d.y + d.z * d.z < 1e-8) return { result: target };
      const k = Math.min(Math.max(cx.num('delta') * speed, 0), 1);
      return { result: { x: cur.x + d.x * k, y: cur.y + d.y * k, z: cur.z + d.z * k } };
    },
  },
  'math.normalizeVector': {
    pure: (cx) => {
      const a = toVec(cx.in('a'));
      const len = Math.hypot(a.x, a.y, a.z);
      return { result: len < 1e-8 ? { x: 0, y: 0, z: 0 } : { x: a.x / len, y: a.y / len, z: a.z / len } };
    },
  },
  'time.getWorldDeltaSeconds': { pure: (cx) => ({ result: cx.world.deltaSeconds }) },
  'math.makeRotator': { pure: (cx) => ({ result: { x: cx.num('roll'), y: cx.num('pitch'), z: cx.num('yaw') } }) },
  'math.breakRotator': {
    pure: (cx) => {
      const r = toVec(cx.in('in'));
      return { roll: r.x, pitch: r.y, yaw: r.z };
    },
  },
};
