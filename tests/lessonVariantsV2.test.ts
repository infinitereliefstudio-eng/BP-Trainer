/** V2 lessons: the trap each one is built around fails with its own explanation. */
import { describe, expect, it } from 'vitest';
import { lessonBarrier, lessonCounter } from '../src/core/lessons/library/beginner';
import { lessonDoorStates, lessonKeypad, refactor2 } from '../src/core/lessons/library/choices';
import { runLesson } from '../src/core/lessons/runner';
import type { Lesson } from '../src/core/lessons/types';
import { disconnectPin, removeNodes } from '../src/core/operations/graphOps';
import type { Project } from '../src/core/model/project';

/** The reference solution, then a change to one class's graph. */
function solvedWith(lesson: Lesson, className: string, change: (p: Project, nodes: (def: string) => string[]) => void) {
  const p = lesson.setup();
  lesson.solve(p);
  const g = p.classes.find((c) => c.name === className)!.graphs[0];
  change(p, (def) => Object.values(g.nodes).filter((n) => n.def === def).map((n) => n.id));
  return runLesson(lesson, p);
}

const reasons = (run: ReturnType<typeof runLesson>) => Object.fromEntries(run.results.filter((r) => !r.ok).map((r) => [r.check.id, r.reason]));

describe('V2 lesson traps', () => {
  it('Le compteur: an Increment off the white wire never runs', () => {
    const run = solvedWith(lessonCounter, 'BP_Compteur', (p, nodes) => {
      const g = p.classes.find((c) => c.name === 'BP_Compteur')!.graphs[0];
      disconnectPin(g, { node: nodes('var.incrementInt')[0], pin: 'exec' });
    });
    expect(reasons(run).count).toMatch(/fil blanc/);
  });

  it('Visible, caché, traversable: hiding alone keeps the collision', () => {
    const run = solvedWith(lessonBarrier, 'BP_Barriere', (p, nodes) => {
      removeNodes(p.classes.find((c) => c.name === 'BP_Barriere')!.graphs[0], nodes('component.setCollisionEnabled'));
    });
    expect(Object.keys(reasons(run))).toEqual(['through']);
    expect(reasons(run).through).toMatch(/cacher ne coupe pas la collision/);
  });

  it('Le digicode: an unwired Default leaves essais 4 and 5 silent', () => {
    const run = solvedWith(lessonKeypad, 'BP_Digicode', (p, nodes) => {
      disconnectPin(p.classes.find((c) => c.name === 'BP_Digicode')!.graphs[0], { node: nodes('flow.switchInt')[0], pin: 'default' });
    });
    expect(Object.keys(reasons(run))).toEqual(['default']);
    expect(reasons(run).default).toMatch(/Default/);
  });

  it('Les états de la porte: forgetting Set Etat repeats the same output', () => {
    const run = solvedWith(lessonDoorStates, 'BP_Porte', (p, nodes) => {
      removeNodes(p.classes.find((c) => c.name === 'BP_Porte')!.graphs[0], nodes('var.set'));
    });
    expect(reasons(run).open).toMatch(/sans Set Etat/);
  });

  it('R2: the clumsy starting graph works but fails the refactor constraint', () => {
    const run = runLesson(refactor2, refactor2.setup());
    expect(Object.keys(reasons(run))).toEqual(['no-branch', 'switch']);
  });
});
