/**
 * What the « Aujourd'hui » page offers (UI-2, V7.84), worked out without the DOM: the step to continue (with its
 * milestone and the time left), the questions of the spaced review and the notions « À retravailler en Blueprint »,
 * each with a rough duration.
 */
import { getLesson, LESSONS } from '@core/lessons';
import { availability } from '@core/lessons/chain';
import { estimatedMinutes, milestoneMinutes } from '@core/lessons/duration';
import type { Lesson } from '@core/lessons/types';
import type { Progress } from '@core/progress/progress';
import { QUIZ } from '@core/review';
import { dueDate, dueQuestions, unlocked } from '@core/review/schedule';
import { nextRework } from '@core/rework/schedule';
import { reworkCards } from '@core/rework/suggest';

/** Questions per review session: short enough to finish on a phone. */
export const REVIEW_SESSION = 8;
/** About 25 seconds a question: read it, answer, read why. */
const SECONDS_PER_QUESTION = 25;

/** The first step not passed yet that is offered now (a delayed step waits its day). */
export function nextStep(p: Progress, now = Date.now()): Lesson | undefined {
  const done = new Set(p.done);
  return LESSONS.find((l) => !done.has(l.id) && availability(l, p.done, p.doneAt, now).ready);
}

export interface ContinuePlan {
  lesson: Lesson;
  /** « Commencer » the very first time, « Reprendre » the step left last, « Continuer » the next one. */
  how: 'start' | 'resume' | 'continue';
  /** A project in milestones: the one open (from 1) and how many. */
  milestone?: { at: number; of: number };
  /** Minutes left: the whole step, or the milestones not passed yet. */
  minutesLeft: number;
}

/** The milestone open and the minutes left of a step. */
function timeLeft(lesson: Lesson, p: Progress): Pick<ContinuePlan, 'milestone' | 'minutesLeft'> {
  const each = milestoneMinutes(lesson);
  if (each.length < 2) return { minutesLeft: estimatedMinutes(lesson) };
  const at = Math.min(p.milestones?.[lesson.id] ?? 0, each.length - 1);
  return { milestone: { at: at + 1, of: each.length }, minutesLeft: each.slice(at).reduce((a, b) => a + b, 0) };
}

/**
 * The step to go on with: the one left last when it is not passed (a project halfway through its milestones
 * counts), otherwise the next one of the path. `next` is the next one of the path when it is another step.
 */
export function continuePlan(p: Progress, now = Date.now()): { main?: ContinuePlan; next?: Lesson } {
  const next = nextStep(p, now);
  const last = p.last?.kind === 'lesson' ? getLesson(p.last.lessonId) : undefined;
  const left = last && !p.done.includes(last.id) && !last.drill ? last : undefined;
  if (left) return { main: { lesson: left, how: 'resume', ...timeLeft(left, p) }, next: next && next !== left ? next : undefined };
  if (!next) return {};
  return { main: { lesson: next, how: p.done.length ? 'continue' : 'start', ...timeLeft(next, p) } };
}

export interface ReviewPlan {
  /** Questions in the next session (at most REVIEW_SESSION). */
  questions: number;
  /** All the questions due. */
  due: number;
  minutes: number;
  /** When nothing is due: when the next question comes back. */
  nextDue?: number;
  /** Whether any question is unlocked yet. */
  any: boolean;
}

export function reviewPlan(p: Progress, now = Date.now()): ReviewPlan {
  const due = dueQuestions(QUIZ, p, now).length;
  const questions = Math.min(due, REVIEW_SESSION);
  const open = QUIZ.filter((q) => unlocked(q, p));
  const nextDue = due ? undefined : open.map((q) => dueDate(q, p)).filter((t) => t > now).sort((a, b) => a - b)[0];
  return { questions, due, minutes: Math.max(1, Math.round((questions * SECONDS_PER_QUESTION) / 60)), nextDue, any: open.length > 0 };
}

export interface ReworkPlan {
  /** Cards of the queue (a card groups notions practised by the same step). */
  cards: number;
  notions: number;
  /** The first suggestion of each card. */
  minutes: number;
  /** When nothing is due: the next notion and when. */
  next?: { notion: string; due: number };
}

export function reworkPlan(p: Progress, now = Date.now()): ReworkPlan {
  const cards = reworkCards(p, now);
  const minutes = cards.reduce((sum, c) => sum + estimatedMinutes(c.steps[0]), 0);
  const notions = cards.reduce((sum, c) => sum + c.notions.length, 0);
  const next = cards.length ? undefined : nextRework(p, now);
  return { cards: cards.length, notions, minutes, next: next && { notion: next.notion, due: next.due } };
}
