/**
 * Random Stream nodes. The generator is FRandomStream's: a 32-bit linear
 * congruential step, then the top 23 bits as a fraction of 1.
 *
 * A stream wired from a variable is that variable's own value (a Get hands
 * it over as is): drawing moves it on. A stream wired from Make Random
 * Stream is made anew at every reading, so it always gives its first number,
 * as in UE.
 */
import type { RandomStreamValue } from '../../types/values';
import { toInt } from '../values';
import type { RValue } from '../world';
import type { Behavior, ValueCx } from './types';

const isStream = (v: unknown): v is RandomStreamValue => typeof v === 'object' && v !== null && 'seed' in (v as object) && 'initial' in (v as object);

/** The stream on the pin, or a throwaway one when nothing usable is wired. */
function streamOf(cx: ValueCx): RandomStreamValue {
  const v = cx.in('stream');
  return isStream(v) ? v : { initial: 0, seed: 0 };
}

/** One step of the generator: the next fraction in [0, 1), and the stream moved on. */
export function nextFraction(s: RandomStreamValue): number {
  s.seed = (Math.imul(s.seed, 196314165) + 907633515) >>> 0;
  return (s.seed >>> 9) / 8388608;
}

const fresh = (seed: number): RandomStreamValue => ({ initial: toInt(seed), seed: toInt(seed) >>> 0 });

export const randomStreamBehaviors: Record<string, Behavior> = {
  'random.makeStream': { pure: (cx) => ({ result: fresh(cx.num('seed')) as unknown as RValue }) },

  'random.intInRangeFromStream': {
    pure: (cx) => {
      const min = toInt(cx.num('min')),
        max = toInt(cx.num('max'));
      const span = max - min + 1;
      const f = nextFraction(streamOf(cx));
      return { result: min + (span > 0 ? Math.trunc(f * span) : 0) };
    },
  },

  'random.floatInRangeFromStream': {
    pure: (cx) => {
      const min = cx.num('min'),
        max = cx.num('max');
      return { result: min + (max - min) * nextFraction(streamOf(cx)) };
    },
  },

  'random.setSeed': {
    exec: (cx) => {
      cx.writeRef('stream', fresh(cx.num('seed')) as unknown as RValue);
      return ['then'];
    },
  },

  'random.reset': {
    exec: (cx) => {
      cx.writeRef('stream', fresh(streamOf(cx).initial) as unknown as RValue);
      return ['then'];
    },
  },
};
