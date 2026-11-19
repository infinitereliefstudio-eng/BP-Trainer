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
import { type AttemptLog, type CheckOutcome, checkLog, closeAttempt, logCheck, sanitizeLog } from './attempts';
import { HELP_LEVELS, HELP_RANK, type HelpLevel } from './helpLevel';

/** What "Reprendre" reopens: free play or a lesson. */
export type ResumeRef = { kind: 'sandbox' } | { kind: 'lesson'; lessonId: string };

/**
 * The help used on a lesson since it was started (or started again):
 * `hints` shown (3 = the solution's text), `solution` opened in the editor,
 * `tried` once Vérifier was pressed, `fails` the checks that failed (from
 * Confirmé, the solution opens after some of them: lessons/helpPolicy.ts).
 */
export interface LessonHelp {
  hints: number;
  tried?: boolean;
  solution?: boolean;
  fails?: number;
}

export { type HelpLevel, HELP_LEVELS } from './helpLevel';

export function helpLevel(h: LessonHelp | undefined): HelpLevel {
  if (!h) return 'alone';
  if (h.solution || h.hints >= 3) return 'solution';
  return h.hints > 0 ? 'hints' : 'alone';
}

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
  /** Help used on each lesson, for the current attempt. */
  help?: Record<string, LessonHelp>;
  /** The least help each passed lesson was passed with. */
  passedWith?: Record<string, HelpLevel>;
  /** One line per attempt at a step (core/progress/attempts.ts). */
  log?: AttemptLog;
  /** The learner's choices on the « À retravailler en Blueprint » queue (core/rework). */
  rework?: ReworkChoices;
}

/** What the learner did with the « À retravailler en Blueprint » queue; the schedule itself is computed from the log. */
export interface ReworkChoices {
  /** Notions put off: not due before `until`, unless practised again after `at`. */
  postponed?: Record<string, { at: number; until: number }>;
  /** Steps being redone from scratch, not passed yet: reopened as they were left. */
  open?: string[];
}

/** The key of the help used while redoing a step from scratch, apart from the lesson's own. */
export const practiceHelpKey = (lessonId: string) => `practice:${lessonId}`;

export const emptyProgress = (): Progress => ({ done: [] });

/** The progress with today counted as an active day. */
export function withToday(p: Progress, now = Date.now()): Progress {
  const day = dayKey(now);
  if (p.days?.includes(day)) return p;
  return { ...p, days: [...(p.days ?? []), day].slice(-400) };
}

/**
 * The progress once a lesson is passed, with the help used this time. A lesson
 * passed again with less help (after starting it over) keeps the better result.
 */
export function withPassed(p: Progress, lessonId: string, now = Date.now()): Progress {
  const level = helpLevel(p.help?.[lessonId]);
  const before = p.passedWith?.[lessonId];
  const better = !before || HELP_RANK[level] < HELP_RANK[before];
  if (p.done.includes(lessonId)) return better ? { ...p, passedWith: { ...p.passedWith, [lessonId]: level } } : p;
  return withToday(
    { ...p, done: [...p.done, lessonId], doneAt: { ...p.doneAt, [lessonId]: now }, passedWith: { ...p.passedWith, [lessonId]: level } },
    now,
  );
}

/** The progress with the help of one lesson changed (unchanged when nothing changes). */
export function withHelp(p: Progress, lessonId: string, change: (h: LessonHelp) => LessonHelp): Progress {
  const before = p.help?.[lessonId] ?? { hints: 0 };
  const after = change(before);
  if (after.hints === before.hints && !!after.tried === !!before.tried && !!after.solution === !!before.solution && (after.fails ?? 0) === (before.fails ?? 0)) return p;
  return { ...p, help: { ...p.help, [lessonId]: after } };
}

/** Starting a lesson (or its practice) over starts its help count over too, and ends its attempt. */
export function withHelpReset(p: Progress, lessonId: string, practice = false): Progress {
  const log = closeAttempt(p.log, { lesson: lessonId, practice });
  const next = log === p.log ? p : { ...p, log };
  const key = practice ? practiceHelpKey(lessonId) : lessonId;
  if (!next.help?.[key]) return next;
  const help = { ...next.help };
  delete help[key];
  return { ...next, help };
}

/**
 * The progress once Vérifier was pressed on a step: the attempt log gets the
 * outcome, with the help used so far. Call it before the help changes for
 * this Vérifier and before the step is marked passed.
 */
export function withCheck(p: Progress, step: { lesson: string; rev: number; practice?: boolean }, outcome: CheckOutcome, now = Date.now()): Progress {
  const h = p.help?.[step.practice ? practiceHelpKey(step.lesson) : step.lesson];
  const log = logCheck(p.log, { ...step, wasDone: p.done.includes(step.lesson) }, outcome, { level: helpLevel(h), hints: h?.hints ?? 0 }, now);
  return log === p.log ? p : withToday({ ...p, log }, now);
}

/** A notion of the queue put off until `until`. */
export function withPostponed(p: Progress, notion: string, until: number, now = Date.now()): Progress {
  return { ...p, rework: { ...p.rework, postponed: { ...p.rework?.postponed, [notion]: { at: now, until } } } };
}

/** A step redone from scratch was started (true) or passed (false): whether it reopens as it was left. */
export function withPracticeOpen(p: Progress, lessonId: string, open: boolean): Progress {
  const list = p.rework?.open ?? [];
  if (list.includes(lessonId) === open) return p;
  const next = open ? [...list, lessonId] : list.filter((id) => id !== lessonId);
  return { ...p, rework: { ...p.rework, open: next } };
}

/** The progress with the attempt log emptied (the learner asked for it). */
export function withoutLog(p: Progress): Progress {
  if (!p.log) return p;
  const { log: _, ...rest } = p;
  return rest;
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
const lessonHelp = (v: unknown) =>
  isObj(v) &&
  Object.values(v).every(
    (h) => isObj(h) && isNum(h.hints) && (h.tried === undefined || typeof h.tried === 'boolean') && (h.solution === undefined || typeof h.solution === 'boolean') && (h.fails === undefined || isNum(h.fails)),
  );
const helpLevels = (v: unknown) => isObj(v) && Object.values(v).every((l) => HELP_LEVELS.includes(l as HelpLevel));
const reworkChoices = (v: unknown) =>
  isObj(v) &&
  (v.postponed === undefined || (isObj(v.postponed) && Object.values(v.postponed).every((x) => isObj(x) && isNum(x.at) && isNum(x.until)))) &&
  (v.open === undefined || strings(v.open));
const resumeRef = (v: unknown) =>
  isObj(v) && (v.kind === 'sandbox' || (v.kind === 'lesson' && typeof v.lessonId === 'string'));

/** Each optional field, and how to tell it is well formed. */
const FIELDS: [keyof Progress, (v: unknown) => boolean][] = [
  ['last', resumeRef],
  ['doneAt', numbers],
  ['review', reviewState],
  ['read', strings],
  ['days', strings],
  ['help', lessonHelp],
  ['passedWith', helpLevels],
  ['rework', reworkChoices],
];

/** What is wrong in a progress, field by field (empty when nothing is). */
export function checkProgress(value: unknown): string[] {
  if (!isObj(value)) return ['la progression n’est pas un objet'];
  const problems: string[] = [];
  if (!strings(value.done)) problems.push('« done » n’est pas une liste de leçons');
  for (const [key, ok] of FIELDS) if (value[key] !== undefined && !ok(value[key])) problems.push(`« ${key} » est mal formé`);
  if (value.log !== undefined) problems.push(...checkLog(value.log));
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
  if (value.log !== undefined) {
    const { log, complete: whole } = sanitizeLog(value.log);
    if (log) progress.log = log;
    complete &&= whole;
  }
  return { progress, complete };
}
