/**
 * « À retravailler en Blueprint » : when each notion should be practised
 * again as a graph, in days, from what the learner actually did. Questions
 * have their own queue (review/schedule.ts); this one is about building.
 *
 * Nothing is stored but the learner's choices (postpone, practice under
 * way): the schedule is replayed from the attempt log each time, so a change
 * of these rules applies to the past too, and nothing can drift.
 *
 * The rules, simple enough to be explained on screen:
 * - a notion enters the queue when a step that teaches it is passed (J0):
 *   it comes back the next day (J+1);
 * - passed alone when it was due: the next practice is further away
 *   (J+1, J+3, J+7, J+14, then J+21);
 * - passed alone before it was due: nothing moves (practising ahead is fine,
 *   it does not count as remembering a few days later);
 * - passed with hints: same interval again;
 * - passed with the solution seen, or an attempt ended without success
 *   (started over, or left for a while): back to J+1.
 * Only steps where a graph is built or repaired count: not the Prédis
 * (answered by choosing), not the syntheses and Expert projects (too long
 * to redo; they teach nothing new).
 */
import { drillNotions, isDrillId } from '../drills';
import { getLesson, LESSONS } from '../lessons';
import type { Lesson } from '../lessons/types';
import { LESSON_NOTIONS } from '../notions/lessonNotions';
import { type Attempt, attemptOver, readableLog } from '../progress/attempts';
import type { HelpLevel } from '../progress/helpLevel';
import type { Progress } from '../progress/progress';
import { DAY } from '../review/schedule';

/** Days before the next practice, by box. */
export const REWORK_INTERVALS = [1, 3, 7, 14, 21];

/** A practice on the day it falls due counts as on time, whatever the hour. */
const EARLY = DAY / 2;

export type PracticeResult = HelpLevel | 'failed';

/** One finished attempt at a step, as the schedule sees it. */
export interface PracticeEvent {
  t: number;
  step: string;
  result: PracticeResult;
  /** Redone from the queue, from scratch. */
  practice: boolean;
}

export interface NotionSchedule {
  notion: string;
  /** Index in REWORK_INTERVALS. */
  box: number;
  due: number;
  /** When it was first passed. */
  introduced: number;
  /** The last practice that counted, and how it went. */
  last: PracticeEvent;
  /** Put off by the learner until this time. */
  postponedUntil?: number;
}

/** Steps whose attempts count: a graph is built or repaired, in a sitting. */
export function countsForRework(lesson: Lesson): boolean {
  return lesson.kind !== 'predict' && lesson.kind !== 'synthesis' && !lesson.code?.startsWith('X');
}

/** The notions a step practises, for the queue (none for steps that do not count). */
export function reworkNotions(stepId: string): string[] {
  // A drill practises the notions of its family.
  if (isDrillId(stepId)) return drillNotions(stepId);
  const lesson = getLesson(stepId);
  if (!lesson || !countsForRework(lesson)) return [];
  return LESSON_NOTIONS[stepId]?.teaches ?? [];
}

const resultOf = (a: Attempt): PracticeResult => (a.passed ? a.help : 'failed');

/**
 * The finished attempts, oldest first. A step passed before the log existed
 * (V7.27) counts as one success, on the day it was passed, with the help it
 * was passed with; the first lessons passed before that day was recorded
 * count as passed long ago.
 */
export function practiceEvents(p: Pick<Progress, 'done' | 'doneAt' | 'passedWith' | 'log'>, now: number): PracticeEvent[] {
  const attempts = readableLog(p.log) ? p.log.attempts : [];
  const events: PracticeEvent[] = attempts
    .filter((a) => attemptOver(a, now))
    .map((a) => ({ t: a.end, step: a.lesson, result: resultOf(a), practice: !!a.practice }));
  const logged = new Set(attempts.filter((a) => a.passed && !a.again && !a.practice).map((a) => a.lesson));
  for (const id of p.done) {
    if (!logged.has(id)) events.push({ t: p.doneAt?.[id] ?? 0, step: id, result: p.passedWith?.[id] ?? 'alone', practice: false });
  }
  return events.sort((a, b) => a.t - b.t);
}

function apply(s: NotionSchedule | undefined, notion: string, e: PracticeEvent): NotionSchedule | undefined {
  const at = (box: number): NotionSchedule => ({ notion, box, due: e.t + REWORK_INTERVALS[box] * DAY, introduced: s?.introduced ?? e.t, last: e });
  if (!s) return e.result === 'failed' ? undefined : at(0);
  if (e.result === 'failed' || e.result === 'solution') return at(0);
  if (e.result === 'hints') return at(s.box);
  // Alone: further away only when it was remembered after a while.
  if (e.t < s.due - EARLY) return { ...s, last: e };
  return at(Math.min(s.box + 1, REWORK_INTERVALS.length - 1));
}

/** Each notion met so far, with its next practice. */
export function reworkSchedule(p: Progress, now: number): NotionSchedule[] {
  const byNotion = new Map<string, NotionSchedule>();
  for (const e of practiceEvents(p, now)) {
    for (const notion of reworkNotions(e.step)) {
      const next = apply(byNotion.get(notion), notion, e);
      if (next) byNotion.set(notion, next);
    }
  }
  const postponed = p.rework?.postponed ?? {};
  return [...byNotion.values()].map((s) => {
    const off = postponed[s.notion];
    // A postponement holds until the notion is practised again.
    if (!off || off.at < s.last.t || off.until <= s.due) return s;
    return { ...s, due: off.until, postponedUntil: off.until };
  });
}

/** The steps that can be redone for a notion: passed, and counting for the queue. */
export function stepsFor(notion: string, done: readonly string[]): Lesson[] {
  return LESSONS.filter((l) => done.includes(l.id) && countsForRework(l) && (LESSON_NOTIONS[l.id]?.teaches ?? []).includes(notion));
}

/** Notions due now that have a step to redo, the most overdue first. */
export function dueRework(p: Progress, now: number): NotionSchedule[] {
  return reworkSchedule(p, now)
    .filter((s) => s.due <= now && stepsFor(s.notion, p.done).length > 0)
    .sort((a, b) => a.due - b.due);
}

/** When the next notion falls due, if none is due now. */
export function nextRework(p: Progress, now: number): NotionSchedule | undefined {
  return reworkSchedule(p, now)
    .filter((s) => s.due > now && stepsFor(s.notion, p.done).length > 0)
    .sort((a, b) => a.due - b.due)[0];
}
