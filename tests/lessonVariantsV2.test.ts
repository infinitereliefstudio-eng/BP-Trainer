/** V2 lessons: the trap each one is built around fails with its own explanation. */
import { describe, expect, it } from 'vitest';
import { lessonBarrier, lessonCounter } from '../src/core/lessons/library/beginner';
import { lessonDoorStates, lessonKeypad, refactor2 } from '../src/core/lessons/library/choices';
import { edit } from '../src/core/lessons/builder';
import { complete2, lessonCleanDestroy, lessonPureFunctions } from '../src/core/lessons/library/advanced';
import { debug3, debug4, lessonBeginPlayOrder, lessonWhoChanges } from '../src/core/lessons/library/confirmed';
import { lessonControlRoom, refactor1 } from '../src/core/lessons/library/controlRoom';
import { lessonInheritance } from '../src/core/lessons/library/inheritance';
import { lessonLift, lessonWaves } from '../src/core/lessons/library/timing';
import { ORDER_NOTE, runLesson } from '../src/core/lessons/runner';
import { updateVariable } from '../src/core/operations/classOps';
import { pruneProject } from '../src/core/operations/projectOps';
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

describe('V2 lesson traps, step D', () => {
  const start = (lesson: Lesson) => runLesson(lesson, lesson.setup());

  it('Qui modifie quoi: the direct Set on a Private variable does not compile', () => {
    expect(start(lessonWhoChanges).compileErrors.map((m) => m.text).join()).toMatch(/Charge est Private/);
  });

  it('L’ordre des BeginPlay and D4: the starting level only works in one order', () => {
    for (const lesson of [lessonBeginPlayOrder, debug4]) {
      const run = start(lesson);
      expect(run.notes[0], lesson.id).toBe(ORDER_NOTE);
    }
    expect(reasons(start(lessonBeginPlayOrder)).count).toMatch(/avant qu’elles aient fait leur BeginPlay/);
  });

  it('Les vagues: a Set after Spawn Actor comes after the BeginPlay', () => {
    const p = lessonWaves.setup();
    lessonWaves.solve(p);
    const enemy = p.classes.find((c) => c.name === 'BP_Ennemi')!;
    updateVariable(enemy, enemy.variables[0].id, { exposeOnSpawn: false });
    pruneProject(p);
    const s = edit(p, 'BP_Spawner');
    const spawn = Object.values(s.graph.nodes).find((n) => n.def === 'actor.spawn')!.id;
    const br = Object.values(s.graph.nodes).find((n) => n.def === 'flow.branch')!.id;
    disconnectPin(s.graph, { node: spawn, pin: 'then' });
    const set = s.node('var.setExternal', { owner: enemy.id, variable: enemy.variables[0].id }, { value: 10 });
    s.link(spawn, 'then', set, 'exec').link(spawn, 'result', set, 'target').link(set, 'then', br, 'exec');
    const r = reasons(runLesson(lessonWaves, p));
    expect(r.life).toMatch(/Vie : 0/);
    expect(r.expose).toBeDefined();
  });

  it('L’ascenseur: a fixed step per Tick is too slow at 30 frames per second', () => {
    const p = lessonLift.setup();
    const b = edit(p, 'BP_Ascenseur');
    const tick = b.node('event.tick');
    const move = b.node('actor.addOffset', {}, { delta: { x: 200 / 60, y: 0, z: 0 } });
    b.link(tick, 'then', move, 'exec');
    expect(reasons(runLesson(lessonLift, p)).speed).toMatch(/30 images par seconde/);
  });

  it('Fonctions pures et impures: CalculerDegats must be pure', () => {
    const p = lessonPureFunctions.setup();
    lessonPureFunctions.solve(p);
    const cls = p.classes[0];
    cls.graphs.find((g) => g.name === 'CalculerDegats')!.fn!.pure = false;
    expect(reasons(runLesson(lessonPureFunctions, p)).pure).toMatch(/Coche Pure/);
  });

  it('Détruire proprement, C2, D3, R1: the starting project fails for the reason the lesson is about', () => {
    expect(reasons(start(lessonCleanDestroy)).list).toMatch(/dont une détruite/);
    expect(start(complete2).runtimeErrors[0]).toMatch(/Infinite loop detected/);
    expect(start(debug3).runtimeErrors[0]).toMatch(/Accessed None/);
    expect(reasons(start(refactor1)).once).toMatch(/à chaque Tick/);
    expect(Object.keys(reasons(start(lessonControlRoom)))).toContain('eco-mode');
  });
});

describe('V2 lesson traps, step E', () => {
  it('L’héritage: a BeginPlay in the child without Parent: BeginPlay loses the parent’s logic', () => {
    const p = lessonInheritance.setup();
    lessonInheritance.solve(p);
    const b = edit(p, 'BP_Clignotante');
    const up = Object.values(b.graph.nodes).find((n) => n.def === 'call.parentEvent')!;
    const begin = Object.values(b.graph.nodes).find((n) => n.def === 'event.beginPlay')!.id;
    const timer = Object.values(b.graph.nodes).find((n) => n.def === 'time.setTimerByEvent')!.id;
    removeNodes(b.graph, [up.id]);
    b.link(begin, 'then', timer, 'exec');
    const r = reasons(runLesson(lessonInheritance, p));
    expect(r.parent).toMatch(/remplace celui de BP_LampeBase/);
  });
});
