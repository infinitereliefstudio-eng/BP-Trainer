/**
 * Review of chantier n° 5 (docs/REVUE_EXPERT_FINAL.md), lot 1 (V7.73): what
 * the projects' checks and notes got wrong besides the input mode (G1,
 * tests/inputModeTravel.test.ts).
 */
import { describe, expect, it } from 'vitest';
import { getLesson } from '../src/core/lessons';
import { edit } from '../src/core/lessons/builder';
import { milestoneView } from '../src/core/lessons/milestones';
import { runLesson } from '../src/core/lessons/runner';
import { T } from '../src/core/types/pins';

describe('X2 « L’atelier des machines »', () => {
  const x2 = getLesson('x2-atelier')!;

  it('V1: a variable that refers to the reservoir component is not taken for fuel left in the machine', () => {
    const p = x2.setup();
    x2.solve(p);
    const reservoir = p.classes.find((c) => c.name === 'BP_Reservoir')!.name;
    edit(p, 'BP_Machine').variable('Reservoir', T.object(reservoir));
    expect(runLesson(x2, p).passed).toBe(true);
  });

  it('V1: a number named like the fuel, left in a machine, is still refused', () => {
    const p = x2.setup();
    x2.solve(p);
    edit(p, 'BP_Pompe').variable('Carburant', T.float, 3);
    const run = runLesson(x2, p);
    expect(run.results.find((r) => r.check.id === 'component')?.ok).toBe(false);
  });

  it('J1: failed, its notes never speak of « Jalon 1/1 »', () => {
    const run = runLesson(milestoneView(x2, 0), x2.setup());
    expect(run.passed).toBe(false);
    expect(run.notes.some((n) => n.includes('Jalon'))).toBe(false);
  });
});

describe('titles and texts', () => {
  it('N1: La ronde names its milestones once each: the vision, then the alert', () => {
    expect(getLesson('x4-ronde')!.milestones!.map((m) => m.title)).toEqual(['Les gardes', 'La vision', 'L’alerte', 'Le casse']);
  });

  it('F1: L’arène no longer says a Static Mesh cannot overlap', () => {
    const arena = getLesson('x3-arene')!;
    expect(arena.cards.some((c) => c.body.includes('Static Mesh ne déclenche pas'))).toBe(false);
  });
});
