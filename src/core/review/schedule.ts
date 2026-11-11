/**
 * Spaced review (Leitner boxes): a question answered right comes back later
 * and later; answered wrong, it comes back tomorrow. Pure data, no DOM.
 */
import type { QuizQuestion } from './types';

/** Days before a question comes back, by box. */
export const INTERVALS = [1, 3, 7, 16, 35, 90];

export const DAY = 24 * 60 * 60 * 1000;

export interface CardState {
  /** Index in INTERVALS: grows with each right answer. */
  box: number;
  /** Timestamp from which the question is due again. */
  due: number;
}

export type ReviewState = Record<string, CardState>;

/** What the schedule needs to know about the learner. */
export interface Learner {
  /** Passed lessons. */
  done: readonly string[];
  /** When each lesson was passed (missing for lessons passed before reviews existed). */
  doneAt?: Readonly<Record<string, number>>;
  /** Memo cards already read. */
  read?: readonly string[];
  review?: Readonly<ReviewState>;
}

/** A question is unlocked once its lesson is passed, or its memo card read. */
export function unlocked(q: QuizQuestion, who: Learner): boolean {
  if (q.lesson) return who.done.includes(q.lesson);
  if (q.memo) return !!who.read?.includes(q.memo);
  return true;
}

/** When a question is due: a day after its lesson for the first time, then by its box. */
export function dueDate(q: QuizQuestion, who: Learner): number {
  const state = who.review?.[q.id];
  if (state) return state.due;
  const at = q.lesson ? who.doneAt?.[q.lesson] : undefined;
  return at ? at + DAY : 0;
}

/** Unlocked questions due now, the most overdue first. */
export function dueQuestions(all: readonly QuizQuestion[], who: Learner, now: number): QuizQuestion[] {
  return all
    .filter((q) => unlocked(q, who) && dueDate(q, who) <= now)
    .sort((a, b) => dueDate(a, who) - dueDate(b, who));
}

/** The state of a question after an answer. */
export function answered(prev: CardState | undefined, right: boolean, now: number): CardState {
  if (!right) return { box: 0, due: now + INTERVALS[0] * DAY };
  const box = Math.min((prev?.box ?? -1) + 1, INTERVALS.length - 1);
  return { box, due: now + INTERVALS[box] * DAY };
}

/** Questions answered right at least `box + 1` times in a row: considered known. */
export function knownCount(all: readonly QuizQuestion[], who: Learner, box = 2): number {
  return all.filter((q) => (who.review?.[q.id]?.box ?? -1) >= box).length;
}

/** Local calendar day, "2026-11-11". */
export function dayKey(t: number): string {
  const d = new Date(t);
  const two = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
}

/** Days in a row with some activity, ending today or yesterday. */
export function streak(days: readonly string[], now: number): number {
  const set = new Set(days);
  let t = now;
  if (!set.has(dayKey(t))) t -= DAY;
  let n = 0;
  // Noon avoids skipping or repeating a day when the clock changes.
  const noon = new Date(t);
  noon.setHours(12, 0, 0, 0);
  for (let cur = noon.getTime(); set.has(dayKey(cur)); cur -= DAY) n++;
  return n;
}

/** Deterministic shuffle (mulberry32), so a question's options keep their order while it is shown. */
export function shuffled<T>(items: readonly T[], seed: number): T[] {
  let s = seed >>> 0;
  const rnd = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
