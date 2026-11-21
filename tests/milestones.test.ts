/**
 * V7.65, chantier n° 5: a long project in milestones. Vérifier replays the
 * milestones up to the open one and stops at the first that fails; the view
 * shows the briefs so far; the progress keeps how many are passed. Also, for
 * every project of the path in milestones: each one fails from where the
 * previous one ends, and passes with its own part of the solution.
 */
import { describe, expect, it } from 'vitest';
import { LESSONS } from '../src/core/lessons';
import { edit } from '../src/core/lessons/builder';
import { noRuntimeErrors, printed } from '../src/core/lessons/checks';
import { lesson1 } from '../src/core/lessons/library/module1';
import { lastMilestone, milestoneView, withMilestones as inMilestones } from '../src/core/lessons/milestones';
import { runLesson } from '../src/core/lessons/runner';
import type { Lesson } from '../src/core/lessons/types';
import { checkProgress, emptyProgress, withMilestones } from '../src/core/progress/progress';

/** Two milestones on lesson 1's project: say hello, then goodbye after it. */
const project: Lesson = inMilestones(
  { ...lesson1, id: 'x-test-jalons', level: 'expert', cards: [{ title: 'Le projet', body: 'Deux jalons.' }] },
  [
    {
      id: 'bonjour',
      title: 'Bonjour',
      cards: [{ title: 'Cahier des charges', body: 'Au lancement : « Bonjour ».' }],
      objectives: ['Au lancement : « Bonjour ».'],
      scenario: [{ wait: 0.5 }],
      checks: [printed('hello', 'Bonjour'), noRuntimeErrors()],
      solve: (p) => lesson1.solve(p),
    },
    {
      id: 'revoir',
      title: 'Au revoir',
      cards: [{ title: 'Cahier des charges', body: 'Après « Bonjour » : « Au revoir ».' }],
      objectives: ['Après « Bonjour » : « Au revoir ».'],
      scenario: [{ wait: 0.5 }],
      checks: [printed('bye', 'Au revoir'), noRuntimeErrors()],
      solve(p) {
        const b = edit(p, 'BP_Bonjour');
        const hello = Object.values(b.graph.nodes).find((n) => n.def === 'debug.printString')!.id;
        b.link(hello, 'then', b.node('debug.printString', {}, { text: 'Au revoir' }), 'exec');
      },
    },
  ],
);

const solvedUpTo = (l: Lesson, i: number) => {
  const p = l.setup();
  milestoneView(l, i).solve(p);
  return p;
};

describe('projects in milestones (V7.65)', () => {
  it('the whole project holds every brief and objective, and its solution passes every milestone', () => {
    expect(project.cards.map((c) => c.title)).toEqual(['Le projet', 'Jalon 1/2 · Cahier des charges', 'Jalon 2/2 · Cahier des charges']);
    expect(project.objectives).toHaveLength(2);
    const p = project.setup();
    project.solve(p);
    const run = runLesson(project, p);
    expect(run.passed).toBe(true);
    expect(run.notes.slice(0, 2)).toEqual(['Jalon 1/2 « Bonjour » : réussi.', 'Jalon 2/2 « Au revoir » : réussi.']);
  });

  it('the view at a milestone shows the briefs so far, not the next one', () => {
    const first = milestoneView(project, 0);
    expect(first.cards.map((c) => c.title)).toEqual(['Le projet', 'Jalon 1/2 · Cahier des charges']);
    expect(first.objectives).toEqual(['Au lancement : « Bonjour ».']);
    expect(milestoneView(project, 9).atMilestone).toBe(1);
  });

  it('passing a milestone short of the last says the next brief opens', () => {
    const run = runLesson(milestoneView(project, 0), solvedUpTo(project, 0));
    expect(run.passed).toBe(true);
    expect(run.notes.at(-1)).toContain('Le cahier du Jalon 2/2 « Au revoir » s’ouvre');
  });

  it('Vérifier stops at the first milestone that fails, with its own checks, even an earlier one broken since', () => {
    // At milestone 2, with milestone 1 undone: it stops there.
    const run = runLesson(milestoneView(project, 1), project.setup());
    expect(run.passed).toBe(false);
    expect(run.results.map((r) => r.check.id)).toContain('hello');
    expect(run.notes[0]).toContain('Jalon 1/2 « Bonjour » : pas encore réussi');
    // Milestone 1 done, 2 not: the checks shown are milestone 2's.
    const second = runLesson(milestoneView(project, 1), solvedUpTo(project, 0));
    expect(second.passed).toBe(false);
    expect(second.results.map((r) => r.check.id)).toEqual(['bye', 'no-errors']);
    expect(second.notes[0]).toBe('Jalon 1/2 « Bonjour » : réussi.');
  });

  it('the progress keeps how many milestones are passed, never fewer, and a backup with it is valid', () => {
    let p = withMilestones(emptyProgress(), 'x-test-jalons', 1);
    expect(p.milestones).toEqual({ 'x-test-jalons': 1 });
    expect(withMilestones(p, 'x-test-jalons', 0)).toBe(p);
    p = withMilestones(p, 'x-test-jalons', 2);
    expect(p.milestones?.['x-test-jalons']).toBe(2);
    expect(checkProgress(p)).toEqual([]);
    expect(checkProgress({ ...p, milestones: { a: 'deux' } })).not.toEqual([]);
  });

  it('every project of the path in milestones: each fails from where the previous ends, and passes with its own part', () => {
    for (const l of LESSONS.filter((x) => x.milestones)) {
      for (let i = 0; i <= lastMilestone(l); i++) {
        const view = milestoneView(l, i);
        const before = i ? solvedUpTo(l, i - 1) : l.setup();
        expect(runLesson(view, before).passed, `${l.id}, jalon ${i + 1} au départ`).toBe(false);
        expect(runLesson(view, solvedUpTo(l, i)).passed, `${l.id}, jalon ${i + 1} résolu`).toBe(true);
      }
    }
  });
});
