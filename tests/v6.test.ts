/**
 * V6: the nodes added for the exercise collection (Dot Product, Get
 * Reflection Vector, Snap To Grid, For Each Loop with Break, Random Stream,
 * Transform), arrays of level references, and the wrong-but-tempting answers
 * of the new lessons: each must fail, for the reason the lesson teaches.
 */
import { describe, expect, it } from 'vitest';
import { type ClassBuilder, edit, ProjectBuilder } from '../src/core/lessons/builder';
import { getLesson } from '../src/core/lessons';
import { runLesson } from '../src/core/lessons/runner';
import type { Project } from '../src/core/model/project';
import { compileClass } from '../src/core/compiler/validate';
import { removeNodes } from '../src/core/operations/graphOps';
import { inverseTransformLocation, transformLocation } from '../src/core/runtime/behaviors/transform';
import { Simulation } from '../src/core/runtime/simulation';
import { parseProject, serializeProject } from '../src/core/serialization/serialize';
import { T } from '../src/core/types/pins';

function world(setup: (b: ClassBuilder, pb: ProjectBuilder) => void, yaw = 0) {
  const pb = new ProjectBuilder('t');
  const b = pb.blueprint('BP_Test');
  setup(b, pb);
  pb.place(b, 100, 50, yaw);
  pb.playerStart(2000, 0);
  return pb.project;
}

function run(p: Project, seconds = 0.1) {
  const s = new Simulation(parseProject(serializeProject(p)));
  s.start();
  for (let i = 0; i < Math.round(seconds * 60); i++) s.step();
  return s;
}

const prints = (s: Simulation) => s.log.filter((l) => l.message !== undefined).map((l) => l.message);
const errors = (s: Simulation) => s.log.filter((l) => l.level === 'error').map((l) => l.text);

/** BeginPlay → Print of a pure node's output. */
function printPure(b: ClassBuilder, def: string, defaults: Record<string, unknown>, pin = 'result'): void {
  const begin = b.node('event.beginPlay');
  const say = b.node('debug.printString');
  const n = b.node(def, {}, defaults as never);
  b.link(begin, 'then', say, 'exec').link(n, pin, say, 'text');
}

describe('vector and grid nodes', () => {
  it('Dot Product', () => {
    const s = run(world((b) => printPure(b, 'math.dotProduct', { a: { x: 1, y: 2, z: 3 }, b: { x: 4, y: -5, z: 6 } })));
    expect(prints(s)).toEqual(['12.0']);
  });

  it('Get Reflection Vector mirrors a direction on a surface, whatever the length of the normal', () => {
    const s = run(world((b) => printPure(b, 'math.reflectionVector', { direction: { x: 1, y: -1, z: 0 }, normal: { x: 0, y: 5, z: 0 } })));
    expect(prints(s)).toEqual(['X=1.000 Y=1.000 Z=0.000']);
  });

  it('Snap To Grid (Float): nearest multiple, halves go up, a grid of 0 changes nothing', () => {
    for (const [loc, grid, want] of [
      [130, 50, '150.0'],
      [124, 50, '100.0'],
      [-70, 50, '-50.0'],
      [25, 50, '50.0'],
      [37, 0, '37.0'],
    ] as const) {
      const s = run(world((b) => printPure(b, 'math.snapToGridFloat', { location: loc, grid })));
      expect(prints(s), `${loc} / ${grid}`).toEqual([want]);
    }
  });
});

describe('For Each Loop with Break', () => {
  it('stops after the body that asked for it, then runs Completed', () => {
    const p = world((b) => {
      const list = b.variable('Liste', T.array(T.int), [5, 6, 7, 8]);
      const begin = b.node('event.beginPlay');
      const loop = b.node('flow.forEachLoopWithBreak');
      const say = b.node('debug.printString');
      const eq = b.node('math.equalInt', {}, { b: 6 });
      const br = b.node('flow.branch');
      const end = b.node('debug.printString', {}, { text: 'Fin' });
      b.link(begin, 'then', loop, 'exec').link(b.node('var.get', { variable: list }), 'value', loop, 'array');
      b.link(loop, 'body', say, 'exec').link(loop, 'element', say, 'text').link(say, 'then', br, 'exec');
      b.link(loop, 'element', eq, 'a').link(eq, 'result', br, 'condition').link(br, 'true', loop, 'break').link(loop, 'completed', end, 'exec');
    });
    const s = run(p);
    expect(errors(s)).toEqual([]);
    expect(prints(s)).toEqual(['5', '6', 'Fin']);
  });
});

describe('Random Stream', () => {
  /** Three draws printed at BeginPlay, from a stream variable or straight from Make Random Stream. */
  const draws = (fromVariable: boolean, seed = 42) =>
    world((b) => {
      const v = b.variable('Hasard', T.struct('RandomStream'));
      const begin = b.node('event.beginPlay');
      const set = b.node('random.setSeed', {}, { seed });
      b.link(begin, 'then', set, 'exec').link(b.node('var.get', { variable: v }), 'value', set, 'stream');
      let prev = set;
      for (let i = 0; i < 3; i++) {
        const say = b.node('debug.printString');
        const rnd = b.node('random.intInRangeFromStream', {}, { min: 0, max: 999 });
        const src = fromVariable ? b.node('var.get', { variable: v }) : b.node('random.makeStream', {}, { seed });
        b.link(src, fromVariable ? 'value' : 'result', rnd, 'stream').link(prev, 'then', say, 'exec').link(rnd, 'result', say, 'text');
        prev = say;
      }
    });

  it('the same seed gives the same draws, another seed gives others', () => {
    const a = prints(run(draws(true)));
    expect(a).toHaveLength(3);
    expect(new Set(a).size).toBe(3);
    expect(prints(run(draws(true)))).toEqual(a);
    expect(prints(run(draws(true, 7)))).not.toEqual(a);
  });

  it('a stream made anew for each draw always gives its first number', () => {
    const a = prints(run(draws(false)));
    expect(new Set(a).size).toBe(1);
    expect(a[0]).toBe(prints(run(draws(true)))[0]);
  });

  it('Reset Random Stream goes back to the Initial Seed, and its Stream pin must be a variable', () => {
    const p = world((b) => {
      const v = b.variable('Hasard', T.struct('RandomStream'), { initial: 5, seed: 5 });
      const begin = b.node('event.beginPlay');
      const one = b.node('debug.printString');
      const reset = b.node('random.reset');
      const two = b.node('debug.printString');
      const r1 = b.node('random.intInRangeFromStream', {}, { min: 0, max: 999 });
      const r2 = b.node('random.intInRangeFromStream', {}, { min: 0, max: 999 });
      for (const r of [r1, r2]) b.link(b.node('var.get', { variable: v }), 'value', r, 'stream');
      b.link(begin, 'then', one, 'exec').link(r1, 'result', one, 'text').link(one, 'then', reset, 'exec').link(b.node('var.get', { variable: v }), 'value', reset, 'stream');
      b.link(reset, 'then', two, 'exec').link(r2, 'result', two, 'text');
    });
    const out = prints(run(p));
    expect(out[0]).toBe(out[1]);
    const bad = world((b) => {
      const begin = b.node('event.beginPlay');
      b.link(begin, 'then', b.node('random.reset'), 'exec');
    });
    expect(compileClass(bad.classes[0], bad).messages.some((m) => m.severity === 'error')).toBe(true);
  });
});

describe('Transform', () => {
  it('local to world and back, for a moved and turned frame', () => {
    const t = { location: { x: 300, y: 200, z: 0 }, rotation: { x: 0, y: 0, z: 90 }, scale: { x: 1, y: 1, z: 1 } };
    const w = transformLocation(t, { x: 100, y: 0, z: 0 });
    expect([Math.round(w.x), Math.round(w.y)]).toEqual([300, 300]);
    const l = inverseTransformLocation(t, w);
    expect([Math.round(l.x), Math.round(l.y)]).toEqual([100, 0]);
  });

  it('Get Actor Transform and Inverse Transform Location see the world from the actor', () => {
    // The actor is at (100, 50), turned 90°: the world point (100, 250) is 200 cm in front of it.
    const p = world((b) => {
      const begin = b.node('event.beginPlay');
      const say = b.node('debug.printString');
      const frame = b.node('actor.getTransform');
      const local = b.node('math.inverseTransformLocation', {}, { location: { x: 100, y: 250, z: 0 } });
      b.link(frame, 'result', local, 't').link(begin, 'then', say, 'exec').link(local, 'result', say, 'text');
    }, 90);
    expect(prints(run(p))).toEqual(['X=200.000 Y=0.000 Z=0.000']);
  });
});

describe('a list of level references on an instance', () => {
  it('an Instance Editable array of placed actors arrives as references', () => {
    const pb = new ProjectBuilder('t');
    const lamp = pb.blueprint('BP_Lampe');
    const hub = pb.blueprint('BP_Hub');
    const list = hub.variable('Lampes', T.array(T.object('BP_Lampe')), []);
    hub.cls.variables[0].instanceEditable = true;
    const begin = hub.node('event.beginPlay');
    const loop = hub.node('flow.forEachLoop');
    const say = hub.node('debug.printString');
    const name = hub.node('conv.objectToString');
    hub.link(begin, 'then', loop, 'exec').link(hub.node('var.get', { variable: list }), 'value', loop, 'array').link(loop, 'body', say, 'exec').link(loop, 'element', name, 'in').link(name, 'result', say, 'text');
    const a = pb.place(lamp, 0, 0);
    const b = pb.place(lamp, 100, 0);
    const h = pb.place(hub, 0, 200);
    pb.project.level.actors.find((x) => x.id === h)!.overrides[list] = [`actor:${a}`, `actor:${b}`];
    pb.playerStart(2000, 0);
    const s = run(pb.project);
    expect(errors(s)).toEqual([]);
    expect(prints(s)).toEqual(['BP_Lampe', 'BP_Lampe2']);
  });
});

/** The reference solution of a lesson, changed by `spoil`, then verified. */
function spoiled(id: string, spoil: (p: Project) => void) {
  const lesson = getLesson(id)!;
  const p = lesson.setup();
  lesson.solve(p);
  spoil(p);
  return runLesson(lesson, parseProject(serializeProject(p)));
}
const reasons = (r: ReturnType<typeof runLesson>) => r.results.filter((x) => !x.ok && !x.check.notion).map((x) => x.reason ?? '').join(' | ');
const only = <N>(list: N[]): N => {
  expect(list).toHaveLength(1);
  return list[0];
};

describe('the traps of the new lessons', () => {
  it('Les cartes: the Random read by Get and by Remove Index draws a card twice', () => {
    const r = spoiled('l-cartes', (p) => {
      const b = edit(p, 'BP_Paquet');
      const g = b.graph;
      const rnd = only(Object.values(g.nodes).filter((n) => n.def === 'math.randomIntInRange')).id;
      const card = only(Object.values(g.nodes).filter((n) => n.def === 'array.get')).id;
      const remove = only(Object.values(g.nodes).filter((n) => n.def === 'array.removeIndex')).id;
      for (const l of Object.values(g.links)) if ((l.to.node === card || l.to.node === remove) && l.to.pin === 'index') delete g.links[l.id];
      b.link(rnd, 'result', card, 'index').link(rnd, 'result', remove, 'index');
    });
    expect(r.passed).toBe(false);
    expect(reasons(r)).toContain('nœud pur');
  });

  it('La même donne: a stream made by Make Random Stream at each draw is caught', () => {
    const r = spoiled('l-meme-donne', (p) => {
      const b = edit(p, 'BP_Paquet');
      const g = b.graph;
      const rnd = only(Object.values(g.nodes).filter((n) => n.def === 'random.intInRangeFromStream')).id;
      for (const l of Object.values(g.links)) if (l.to.node === rnd && l.to.pin === 'stream') delete g.links[l.id];
      b.link(b.node('random.makeStream', {}, { seed: 42 }), 'result', rnd, 'stream');
    });
    expect(r.passed).toBe(false);
    expect(reasons(r)).toContain('Make Random Stream');
  });

  it('Le rayon et les miroirs: a segment that starts on the mirror never leaves it', () => {
    const r = spoiled('l-miroirs', (p) => {
      const b = edit(p, 'BP_Emetteur');
      const g = b.graph;
      const move = Object.values(g.nodes).filter((n) => n.def === 'var.set').sort((x, y) => y.x - x.x)[0];
      const trace = only(Object.values(g.nodes).filter((n) => n.def === 'trace.lineByChannel')).id;
      for (const l of Object.values(g.links)) if (l.to.node === move.id && l.to.pin === 'value') delete g.links[l.id];
      b.link(trace, 'location', move.id, 'value');
    });
    expect(r.passed).toBe(false);
    expect(reasons(r)).toContain('récepteur est resté éteint');
  });

  it('Le standard: Add without Contains lets the second 102 replace the first, silently', () => {
    const r = spoiled('l-standard', (p) => {
      const b = edit(p, 'BP_Standard');
      const g = b.cls.graphs.find((x) => x.name === 'Inscrire')!;
      const br = only(Object.values(g.nodes).filter((n) => n.def === 'flow.branch')).id;
      const entry = only(Object.values(g.nodes).filter((n) => n.def === 'fn.entry')).id;
      const add = only(Object.values(g.nodes).filter((n) => n.def === 'map.add')).id;
      removeNodes(g, [br]);
      b.inGraph(g.id).link(entry, 'then', add, 'exec');
    });
    expect(r.passed).toBe(false);
    expect(reasons(r)).toContain('Contains');
  });

  it('La régie: without Unbind the mobile panel still obeys its first desk', () => {
    const r = spoiled('d12-regie', (p) => {
      const b = edit(p, 'BP_Panneau');
      const g = b.graph;
      const unbind = only(Object.values(g.nodes).filter((n) => n.def === 'dispatcher.unbind')).id;
      const from = Object.values(g.links).find((l) => l.to.node === unbind && l.to.pin === 'exec')!.from;
      const to = Object.values(g.links).find((l) => l.from.node === unbind && l.from.pin === 'then')!.to;
      removeNodes(g, [unbind]);
      b.link(from.node, from.pin, to.node, to.pin);
    });
    expect(r.passed).toBe(false);
    expect(reasons(r)).toContain('Unbind');
  });

  it('Le réseau: without the Set of seen nodes the loop N1–N2–N3 never ends', () => {
    const r = spoiled('l-reseau', (p) => {
      const b = edit(p, 'BP_Source');
      const g = b.graph;
      const fresh = Object.values(g.nodes).filter((n) => n.def === 'flow.branch').sort((x, y) => y.x - x.x)[0].id;
      const closed = Object.values(g.links).find((l) => l.to.node === Object.values(g.links).find((k) => k.to.node === fresh && k.to.pin === 'condition')!.from.node && l.to.pin === 'a')!.from;
      for (const l of Object.values(g.links)) if (l.to.node === fresh && l.to.pin === 'condition') delete g.links[l.id];
      b.link(closed.node, closed.pin, fresh, 'condition');
    });
    expect(r.passed).toBe(false);
    expect(reasons(r)).toContain('Infinite loop detected');
    // The scenario stops at the first runaway loop instead of paying for one at each of its four E presses.
    expect(r.runtimeErrors.filter((e) => e.includes('Infinite loop detected'))).toHaveLength(1);
  }, 20_000);

  it('Le four: a second E that restarts the timer delays the cooking', () => {
    const r = spoiled('d11-four', (p) => {
      const b = edit(p, 'BP_Four');
      const g = b.graph;
      const e = only(Object.values(g.nodes).filter((n) => n.def === 'event.inputKey' && n.config.key === 'E')).id;
      const guard = Object.values(g.links).find((l) => l.from.node === e)!.to.node;
      const next = Object.values(g.links).find((l) => l.from.node === guard && l.from.pin === 'true')!.to;
      for (const l of Object.values(g.links)) if (l.from.node === guard && l.from.pin === 'true') delete g.links[l.id];
      for (const l of Object.values(g.links)) if (l.from.node === e) delete g.links[l.id];
      b.link(e, 'pressed', next.node, next.pin);
    });
    expect(r.passed).toBe(false);
    expect(reasons(r)).toContain('second appui');
  });
});
