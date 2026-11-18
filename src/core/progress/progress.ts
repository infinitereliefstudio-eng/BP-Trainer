/**
 * The learner's progress: passed lessons, review boxes, memo cards read,
 * active days. Plain data, saved as JSON under the key 'progress'.
 *
 * `checkProgress` lists what is wrong in a progress read from a file (a
 * backup to restore is refused if anything is); `sanitizeProgress` keeps
 * what is usable of a stored one, so that a damaged field does not cost
 * the rest.
 */
import { answered, dayKey, type ReviewState } from '../review/schedule';

/** What "Reprendre" reopens: free play or a lesson. */
export type ResumeRef = { kind: 'sandbox' } | { kind: 'lesson'; lessonId: string };

export interface Progress {
  done: string[];
  last?: ResumeRef;
  /** When each lesson was passed: its review question comes a day later. */
  doneAt?: Record<string, number>;
  /** Spaced review: the box and due date of each question already asked. */
  review?: ReviewState;
  /** Memo cards already read (their questions join the review). */
  read?: string[];
  /** Calendar days with some activity, for the streak (the last 400 are kept). */
  days?: string[];
}

export const emptyProgress = (): Progress => ({ done: [] });

/** The progress with today counted as an active day. */
export function withToday(p: Progress, now = Date.now()): Progress {
  const day = dayKey(now);
  if (p.days?.includes(day)) return p;
  return { ...p, days: [...(p.days ?? []), day].slice(-400) };
}

/** The progress once a lesson is passed (unchanged if it already was). */
export function withPassed(p: Progress, lessonId: string, now = Date.now()): Progress {
  if (p.done.includes(lessonId)) return p;
  return withToday({ ...p, done: [...p.done, lessonId], doneAt: { ...p.doneAt, [lessonId]: now } }, now);
}

/** The progress after answering a review question. */
export function withAnswer(p: Progress, questionId: string, right: boolean, now = Date.now()): Progress {
  return withToday({ ...p, review: { ...p.review, [questionId]: answered(p.review?.[questionId], right, now) } }, now);
}

/** The progress once a memo card has been read. */
export function withRead(p: Progress, memoId: string, now = Date.now()): Progress {
  if (p.read?.includes(memoId)) return p;
  return withToday({ ...p, read: [...(p.read ?? []), memoId] }, now);
}

// ------------------------------------------------------------- validation

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const strings = (v: unknown) => Array.isArray(v) && v.every((x) => typeof x === 'string');
const numbers = (v: unknown) => isObj(v) && Object.values(v).every(isNum);
const reviewState = (v: unknown) => isObj(v) && Object.values(v).every((c) => isObj(c) && isNum(c.box) && isNum(c.due));
const resumeRef = (v: unknown) =>
  isObj(v) && (v.kind === 'sandbox' || (v.kind === 'lesson' && typeof v.lessonId === 'string'));

/** Each optional field, and how to tell it is well formed. */
const FIELDS: [keyof Progress, (v: unknown) => boolean][] = [
  ['last', resumeRef],
  ['doneAt', numbers],
  ['review', reviewState],
  ['read', strings],
  ['days', strings],
];

/** What is wrong in a progress, field by field (empty when nothing is). */
export function checkProgress(value: unknown): string[] {
  if (!isObj(value)) return ['la progression n’est pas un objet'];
  const problems: string[] = [];
  if (!strings(value.done)) problems.push('« done » n’est pas une liste de leçons');
  for (const [key, ok] of FIELDS) if (value[key] !== undefined && !ok(value[key])) problems.push(`« ${key} » est mal formé`);
  return problems;
}

/** The usable part of a stored progress, and whether anything had to be left out. */
export function sanitizeProgress(value: unknown): { progress: Progress; complete: boolean } {
  if (!isObj(value)) return { progress: emptyProgress(), complete: false };
  const progress: Progress = { done: strings(value.done) ? [...(value.done as string[])] : [] };
  let complete = strings(value.done);
  for (const [key, ok] of FIELDS) {
    if (value[key] === undefined) continue;
    if (ok(value[key])) (progress as unknown as Obj)[key] = value[key];
    else complete = false;
  }
  return { progress, complete };
}
