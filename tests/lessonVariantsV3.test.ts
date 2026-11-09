/**
 * V3 lessons: each lesson's trap fails, with the explanation the lesson is about.
 */
import { describe, expect, it } from 'vitest';
import { edit } from '../src/core/lessons/builder';
import { lessonPureFunctions } from '../src/core/lessons/library/advanced';
import { lessonLocals, solveLocalsWithLocalTotal } from '../src/core/lessons/library/locals';
import { lessonTerminal, solveTerminalWithoutTest } from '../src/core/lessons/library/terminal';
import { runLesson } from '../src/core/lessons/runner';
import { lessonBadges, lessonCodes, solveCodes } from '../src/core/lessons/library/collections';
import { debug5, lessonRecord, solveRecord } from '../src/core/lessons/library/records';
import { addInterfaceParam } from '../src/core/operations/interfaceOps';
import { T } from '../src/core/types/pins';

const reasons = (run: ReturnType<typeof runLesson>) => Object.fromEntries(run.results.filter((r) => !r.ok).map((r) => [r.check.id, r.reason]));

describe('V3 lesson traps, step A', () => {
  it('Le ticket de caisse: a total kept in a local starts again at each line', () => {
    const p = lessonLocals.setup();
    solveLocalsWithLocalTotal(p);
    const run = runLesson(lessonLocals, p);
    expect(run.compileErrors).toEqual([]);
    expect(reasons(run).values).toMatch(/variable locale, remise à sa valeur par défaut/);
  });

  it('Le terminal: an answer printed without testing it shows an empty line for the rock', () => {
    const p = lessonTerminal.setup();
    solveTerminalWithoutTest(p);
    const r = reasons(runLesson(lessonTerminal, p));
    expect(Object.keys(r)).toEqual(['rocher']);
    expect(r.rocher).toMatch(/texte vide/);
  });

  it('Le terminal: once Interagir has an output, the old Event Interagir does not compile', () => {
    const p = lessonTerminal.setup();
    const iface = p.interfaces[0];
    addInterfaceParam(p, iface.id, iface.functions[0].id, 'outputs', T.string);
    const run = runLesson(lessonTerminal, p);
    expect(run.compileErrors.map((m) => m.code)).toContain('interfaceFunction');
  });

  it('Fonctions pures et impures: returning Montant instead of what PV really gained', () => {
    const p = lessonPureFunctions.setup();
    lessonPureFunctions.solve(p);
    const b = edit(p, 'BP_Personnage');
    const heal = b.cls.graphs.find((g) => g.name === 'Soigner')!;
    const entry = Object.values(heal.nodes).find((n) => n.def === 'fn.entry')!.id;
    const ret = Object.values(heal.nodes).find((n) => n.def === 'fn.return')!.id;
    const [amount, gain] = [heal.fn!.inputs[0].id, heal.fn!.outputs[0].id];
    for (const l of Object.values(heal.links)) if (l.to.node === ret && l.to.pin === gain) delete heal.links[l.id];
    b.inGraph(heal.id).link(entry, amount, ret, gain);
    expect(reasons(runLesson(lessonPureFunctions, p)).values).toMatch(/second soin affiche 15/);
  });
});

describe('V3 lesson traps, step B', () => {
  it('Les codes des portes: comparing Find’s Value without its Return Value opens the Cave', () => {
    const p = lessonCodes.setup();
    solveCodes(p, false);
    const r = reasons(runLesson(lessonCodes, p));
    expect(Object.keys(r)).toEqual(['cave']);
    expect(r.cave).toMatch(/Find renvoie Value = 0/);
  });

  it('La fiche de l’objet: a Make that only wires Charge empties the Nom', () => {
    const p = lessonRecord.setup();
    solveRecord(p, true);
    const r = reasons(runLesson(lessonRecord, p));
    expect(Object.keys(r)).toEqual(['fiche']);
    expect(r.fiche).toMatch(/Make S_Objet a reconstruit/);
  });

  it('Les badges and D5: the starting project fails for the reason the lesson is about', () => {
    expect(reasons(runLesson(lessonBadges, lessonBadges.setup())).count).toMatch(/compte double/);
    expect(reasons(runLesson(debug5, debug5.setup())).total).toMatch(/une copie de chaque lampe/);
  });
});
