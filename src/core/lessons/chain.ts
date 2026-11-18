/**
 * When a delayed step of a chain (LessonChain.after) is offered: some days
 * after the step it follows was passed. Before that it stays open (the path
 * is never locked), but « Continuer » does not propose it.
 */
import type { Lesson } from './types';

const DAY = 24 * 60 * 60 * 1000;

export interface Availability {
  ready: boolean;
  /** The step to pass first, when it is not passed yet. */
  after?: string;
  /** From when it is offered, when it is waiting for the delay. */
  from?: number;
}

export function availability(lesson: Lesson, done: readonly string[], doneAt: Readonly<Record<string, number>> | undefined, now = Date.now()): Availability {
  const after = lesson.chain?.after;
  if (!after) return { ready: true };
  if (!done.includes(after.lesson)) return { ready: false, after: after.lesson };
  const passed = doneAt?.[after.lesson];
  // Passed before the dates were kept: nothing to wait for.
  if (passed === undefined) return { ready: true };
  const from = passed + after.days * DAY;
  return now >= from ? { ready: true } : { ready: false, from };
}
