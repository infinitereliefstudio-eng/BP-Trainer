/**
 * A small seeded generator (mulberry32): the same seed always gives the same
 * numbers, so a drill id (family + seed) always rebuilds the same exercise,
 * on the phone as in the tests.
 */
export interface Rng {
  /** A number in [0, 1). */
  next(): number;
  /** An integer in [min, max]. */
  int(min: number, max: number): number;
  pick<T>(list: readonly T[]): T;
}

export function rng(seed: number): Rng {
  let a = (seed * 2654435761) >>> 0 || 1;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (list) => list[Math.floor(next() * list.length)],
  };
}
