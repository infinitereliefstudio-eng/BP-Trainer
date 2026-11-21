/**
 * V7.59, review of the path's progression: what the player reads goes to the
 * screen. Set Text is logged (CheckContext.shown) through a restart and an
 * Open Level; « Le dialogue en Data Table » needs its box; « Le terminal »
 * and M2 accept Print String, with the screen as their aimed notion.
 */
import { describe, expect, it } from 'vitest';
import { getLesson } from '../src/core/lessons';
import { solveDialogue } from '../src/core/lessons/library/tables';
import { runLesson } from '../src/core/lessons/runner';
import type { Graph, Project } from '../src/core/model/project';

const reasons = (r: ReturnType<typeof runLesson>) => r.results.filter((x) => !x.ok).map((x) => `${x.check.id}: ${x.reason}`).join(' | ');

/** The learner's other way: every call of Afficher in `className` becomes a Print String of the same text. */
function printInstead(p: Project, className: string): void {
  const w = p.classes.find((c) => c.name === 'WBP_Messages')!;
  const fn = w.graphs.find((g) => g.name === 'Afficher')!;
  const texte = fn.fn!.inputs[0].id;
  const g: Graph = p.classes.find((c) => c.name === className)!.graphs[0];
  for (const n of Object.values(g.nodes)) {
    if (n.def !== 'call.function' || n.config.graph !== fn.id) continue;
    n.def = 'debug.printString';
    n.config = {};
    if (n.defaults[texte] !== undefined) n.defaults = { text: n.defaults[texte] };
    for (const l of Object.values(g.links)) {
      if (l.to.node === n.id && l.to.pin === 'target') delete g.links[l.id];
      else if (l.to.node === n.id && l.to.pin === texte) l.to = { node: n.id, pin: 'text' };
    }
  }
}

describe('messages on the screen (V7.59)', () => {
  it('Le dialogue en Data Table: the reference solution shows its lines in one box, then removes it', () => {
    const l = getLesson('l-dialogue-table')!;
    const p = l.setup();
    l.solve(p);
    const r = runLesson(l, p);
    expect(reasons(r)).toBe('');
  });

  it('Le dialogue en Data Table: the end tested too early loses the last line, and says so', () => {
    const l = getLesson('l-dialogue-table')!;
    const p = l.setup();
    solveDialogue(p, true);
    expect(reasons(runLesson(l, p))).toContain('jamais montrée');
  });

  it('Le dialogue en Data Table: the lines printed, not shown, fail on the box', () => {
    const l = getLesson('l-dialogue-table')!;
    const r = runLesson(l, l.setup());
    expect(r.passed).toBe(false);
    expect(reasons(r)).toContain('Aucune boîte');
  });

  it('Le terminal: Print String still works, with the screen left unchecked', () => {
    const l = getLesson('l-terminal')!;
    const p = l.setup();
    l.solve(p);
    expect(runLesson(l, p).results.find((x) => x.check.id === 'ecran')?.ok).toBe(true);
    printInstead(p, 'BP_Joueur');
    const r = runLesson(l, p);
    expect(r.passed, reasons(r)).toBe(true);
    expect(r.results.find((x) => x.check.id === 'ecran')?.ok).toBe(false);
  });

  it('M2 Le distributeur: Print String still works, with the screen left unchecked', () => {
    const l = getLesson('m2-distributeur')!;
    const p = l.setup();
    l.solve(p);
    expect(runLesson(l, p).results.find((x) => x.check.id === 'ecran')?.ok).toBe(true);
    printInstead(p, 'BP_Distributeur');
    const r = runLesson(l, p);
    expect(r.passed, reasons(r)).toBe(true);
    expect(r.results.find((x) => x.check.id === 'ecran')?.ok).toBe(false);
  });
});
