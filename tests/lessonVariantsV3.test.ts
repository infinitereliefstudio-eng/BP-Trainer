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
import { lessonCrate, lessonLook, refactor3, solveCrate, traceAndInteract } from '../src/core/lessons/library/interaction';
import { complete3, lessonLampRow, lessonSlidingDoor, solveLampRow, solveSlidingDoor } from '../src/core/lessons/library/motion';

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

describe('V3 lesson traps, step C', () => {
  it('La porte qui glisse: the starting project jumps open', () => {
    const r = reasons(runLesson(lessonSlidingDoor, lessonSlidingDoor.setup()));
    expect(r.slides).toMatch(/sauté au lieu de glisser/);
  });

  it('La porte qui glisse: Play on the way out does nothing, the Timeline is already at its end', () => {
    const p = lessonSlidingDoor.setup();
    solveSlidingDoor(p, 'play', 'play');
    const r = reasons(runLesson(lessonSlidingDoor, p));
    expect(Object.keys(r)[0]).toBe('closing');
    expect(r.closing).toMatch(/déjà à la fin.*Reverse/s);
  });

  it('La porte qui glisse: Play from Start on the way in makes the door jump back', () => {
    const p = lessonSlidingDoor.setup();
    solveSlidingDoor(p, 'playFromStart', 'reverse');
    const r = reasons(runLesson(lessonSlidingDoor, p));
    expect(Object.keys(r)).toEqual(['resume']);
    expect(r.resume).toMatch(/Play from Start repart de 0/);
  });

  it('Complète C3: both FlipFlop outputs on Play leave the light on', () => {
    const p = complete3.setup();
    complete3.solve(p);
    const g = p.classes[0].graphs[0];
    for (const l of Object.values(g.links)) if (l.to.pin === 'reverse') l.to.pin = 'play';
    const r = reasons(runLesson(complete3, p));
    expect(r.down).toMatch(/Reverse/);
  });

  it('La rangée de lampes: done at BeginPlay, it shows in game but not in the editor', () => {
    const p = lessonLampRow.setup();
    solveLampRow(p, 'beginPlay');
    const r = reasons(runLesson(lessonLampRow, p));
    expect(Object.keys(r)).toEqual(['editor']);
    expect(r.editor).toMatch(/En jeu c’est bon, mais pas dans l’éditeur/);
    expect(r.editor).toMatch(/ConstructionScript/);
  });
});

describe('V3 lesson traps, step D', () => {
  it('Regarder et interagir: End given as a direction only never reaches the lever', () => {
    const p = lessonLook.setup();
    const b = edit(p, 'BP_Joueur');
    const key = Object.values(b.graph.nodes).find((n) => n.def === 'event.inputKey')!.id;
    traceAndInteract(b, { iface: p.interfaces[0].id, fn: p.interfaces[0].functions[0].id }, false, key);
    const run = runLesson(lessonLook, p);
    expect(run.runtimeErrors).toEqual([]);
    expect(reasons(run).lever).toMatch(/End = Start \+ Get Actor Forward Vector × 300/);
  });

  it('La caisse qu’on pousse: printing at every Hit shows the message dozens of times', () => {
    const p = lessonCrate.setup();
    solveCrate(p, { once: false });
    expect(reasons(runLesson(lessonCrate, p)).once).toMatch(/à chaque image/);
  });

  it('La caisse qu’on pousse: a Do Once never reopened stays closed for the second push', () => {
    const p = lessonCrate.setup();
    solveCrate(p, { reopen: false });
    const r = reasons(runLesson(lessonCrate, p));
    expect(Object.keys(r)).toEqual(['again']);
    expect(r.again).toMatch(/Retriggerable Delay/);
  });

  it('La caisse qu’on pousse: a fixed distance per Hit is too slow at 30 images per second', () => {
    const p = lessonCrate.setup();
    solveCrate(p, { perSecond: false });
    const r = reasons(runLesson(lessonCrate, p));
    expect(Object.keys(r)).toEqual(['slow']);
    expect(r.slow).toMatch(/Get World Delta Seconds/);
  });

  it('Refactor R3: the starting project lights both buttons at once', () => {
    const r = reasons(runLesson(refactor3, refactor3.setup()));
    expect(r.top).toMatch(/deux zones/);
    expect(r['no-cast']).toBeDefined();
  });
});
