/**
 * Milestones of a long project (V7.65, chantier n° 5, docs/PLAN_EXPERT_FINAL.md).
 * An Expert project is found by stages, as a real one: each milestone has its
 * brief, its scenario and its checks. The learner sees the briefs of the
 * milestones passed and of the one open; Vérifier replays the milestones in
 * order up to the open one and stops at the first that fails, so a later
 * change that breaks an earlier stage is caught.
 *
 * The path holds the whole project (`withMilestones`): its solution is every
 * milestone's, and running it runs every milestone. The app opens a view at
 * the milestone reached (`milestoneView`), from the progress.
 */
import type { Project } from '../model/project';
import type { Lesson, LessonCard, Milestone } from './types';

/** The index of a project's last milestone (0 for a lesson without). */
export const lastMilestone = (l: Lesson): number => Math.max(0, (l.milestones?.length ?? 1) - 1);

/** « Jalon 2/4 « L'énergie » ». */
export const milestoneName = (l: Lesson, i: number): string => `Jalon ${i + 1}/${l.milestones?.length ?? 1} « ${l.milestones?.[i]?.title ?? ''} »`;

/** The briefs of milestones 0 to `upTo`, each title marked with its milestone (a project of one milestone keeps its titles: V7.66). */
function briefs(ms: Milestone[], upTo: number): LessonCard[] {
  return ms.slice(0, upTo + 1).flatMap((m, i) => m.cards.map((c) => (ms.length > 1 ? { ...c, title: `Jalon ${i + 1}/${ms.length} · ${c.title}` } : c)));
}

/** The reference solution up to milestone `upTo`, built in order. */
const solveUpTo = (ms: Milestone[], upTo: number) => (p: Project) => {
  for (const m of ms.slice(0, upTo + 1)) m.solve(p);
};

/**
 * A project in milestones, as the path lists it: every brief, every
 * objective, the whole solution. Its own scenario and checks are the last
 * milestone's; runLesson runs them all.
 */
export function withMilestones(base: Omit<Lesson, 'scenario' | 'checks' | 'objectives' | 'solve' | 'milestones'>, milestones: Milestone[]): Lesson {
  if (!milestones.length) throw new Error(`${base.id} : un projet en jalons en a au moins un`);
  const last = milestones.length - 1;
  return {
    ...base,
    milestones,
    cards: [...base.cards, ...briefs(milestones, last)],
    objectives: milestones.flatMap((m) => m.objectives),
    scenario: milestones[last].scenario,
    checks: milestones[last].checks,
    solve: solveUpTo(milestones, last),
  };
}

/** The project as the learner sees it at milestone `i`: the briefs up to it, its objectives, its scenario. */
export function milestoneView(lesson: Lesson, i: number): Lesson {
  const ms = lesson.milestones;
  if (!ms) return lesson;
  const at = Math.min(Math.max(0, i), ms.length - 1);
  const own = new Set(briefs(ms, ms.length - 1).map((c) => c.title));
  return {
    ...lesson,
    atMilestone: at,
    cards: [...lesson.cards.filter((c) => !own.has(c.title)), ...briefs(ms, at)],
    objectives: ms.slice(0, at + 1).flatMap((m) => m.objectives),
    scenario: ms[at].scenario,
    checks: ms[at].checks,
    solve: solveUpTo(ms, at),
  };
}

/** One milestone alone, as a plain lesson: its scenario and checks. */
export function milestoneStep(lesson: Lesson, i: number): Lesson {
  const m = lesson.milestones![i];
  return { ...lesson, milestones: undefined, atMilestone: undefined, scenario: m.scenario, checks: m.checks };
}

/** What a run of a project in milestones says, besides the checks of the milestone it stopped at. */
export interface MilestoneRun<R> {
  run: R;
  /** The milestones passed in this run, from the first. */
  passed: number;
}

/**
 * Run milestones 0 to the open one (`lesson.atMilestone`, the last when unset),
 * each from a fresh Play on a copy of the project, stopping at the first that
 * fails. `play` is runLesson (passed in, so this file does not depend on the runner).
 */
export function runMilestones<R extends { passed: boolean; notes: string[] }>(lesson: Lesson, project: Project, play: (l: Lesson, p: Project) => R): MilestoneRun<R> {
  const upTo = lesson.atMilestone ?? lastMilestone(lesson);
  const notes: string[] = [];
  let run: R | undefined;
  for (let i = 0; i <= upTo; i++) {
    run = play(milestoneStep(lesson, i), structuredClone(project));
    if (!run.passed) {
      notes.push(`${milestoneName(lesson, i)} : pas encore réussi. Les vérifications ci-dessus sont les siennes.`);
      return { run: { ...run, notes: [...notes, ...run.notes] }, passed: i };
    }
    notes.push(`${milestoneName(lesson, i)} : réussi.`);
  }
  if (upTo < lastMilestone(lesson)) notes.push(`Le cahier du ${milestoneName(lesson, upTo + 1)} s’ouvre : c’est la suite du projet.`);
  // A project of one milestone (X2) reads as a plain project: no « Jalon 1/1 ».
  if ((lesson.milestones?.length ?? 0) < 2) return { run: run!, passed: upTo + 1 };
  return { run: { ...run!, notes: [...notes, ...run!.notes] }, passed: upTo + 1 };
}
