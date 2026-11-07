/**
 * The step-4 node library, run for real in the simulation: generic pins,
 * arrays by reference, timers, spawning, switches and the rest.
 */
import { describe, expect, it } from 'vitest';
import { ClassBuilder, ProjectBuilder } from '../src/core/lessons/builder';
import { contextFor, findPin } from '../src/core/nodes/registry';
import { connect, disconnectPin } from '../src/core/operations/graphOps';
import { releaseClassWildcards } from '../src/core/operations/wildcardOps';
import { compileClass } from '../src/core/compiler/validate';
import { addFunction, addFunctionParam } from '../src/core/operations/functionOps';
import { setPlayerClass } from '../src/core/operations/projectOps';
import { Simulation } from '../src/core/runtime/simulation';
import { T } from '../src/core/types/pins';
import type { Value } from '../src/core/types/values';

/** One Blueprint placed at the origin, the player far away. */
function world(setup: (b: ClassBuilder, pb: ProjectBuilder) => void) {
  const pb = new ProjectBuilder('t');
  const b = pb.blueprint('BP_Test');
  setup(b, pb);
  pb.place(b, 0, 0);
  pb.playerStart(2000, 0);
  return { pb, b, p: pb.project };
}

function run(p: ProjectBuilder['project'], seconds = 0.1) {
  const s = new Simulation(p);
  s.start();
  for (let i = 0; i < Math.round(seconds * 60); i++) s.step();
  return s;
}

const prints = (s: Simulation) => s.log.filter((l) => l.message !== undefined).map((l) => l.message);
const errors = (s: Simulation) => s.log.filter((l) => l.level === 'error').map((l) => l.text);

/** BeginPlay → each node in turn (exec chain), then Print of the last string. */
function chain(b: ClassBuilder, ...nodes: string[]): string {
  const begin = b.node('event.beginPlay');
  let prev = begin;
  let pin = 'then';
  for (const n of nodes) {
    b.link(prev, pin, n, 'exec');
    prev = n;
    pin = 'then';
  }
  return prev;
}

function printOf(b: ClassBuilder, after: string, from: string, fromPin: string, afterPin = 'then'): string {
  const pr = b.node('debug.printString');
  b.link(after, afterPin, pr, 'exec').link(from, fromPin, pr, 'text');
  return pr;
}

describe('generic (wildcard) pins', () => {
  it('a node takes the type of the first wire, and loses it with the last', () => {
    world((b) => {
      const arr = b.variable('Liste', T.array(T.int), [1, 2]);
      const get = b.node('var.get', { variable: arr });
      const find = b.node('array.find');
      const ctx = contextFor(b.cls, b.project);
      b.link(get, 'value', find, 'array');
      expect(findPin(b.graph.nodes[find], 'item', ctx)?.type).toEqual(T.int);
      disconnectPin(b.graph, { node: find, pin: 'array' });
      releaseClassWildcards(b.cls, b.project!);
      expect(findPin(b.graph.nodes[find], 'item', ctx)?.type.category).toBe('wildcard');
    });
  });

  it('refuses an array on a single wildcard and a single value on an array one', () => {
    world((b) => {
      const n = b.variable('N', T.int, 0);
      const get = b.node('var.get', { variable: n });
      const len = b.node('array.length');
      const r = connect(b.graph, { node: get, pin: 'value' }, { node: len, pin: 'array' }, contextFor(b.cls, b.project));
      expect(r.ok).toBe(false);
    });
  });

  it('a Reroute carries data and execution', () => {
    const { p } = world((b) => {
      const begin = b.node('event.beginPlay');
      const knotExec = b.node('util.reroute');
      const pr = b.node('debug.printString');
      const knotData = b.node('util.reroute');
      const text = b.node('string.append', {}, { in0: 'via ', in1: 'reroute' });
      b.link(begin, 'then', knotExec, 'in').link(knotExec, 'out', pr, 'exec');
      b.link(text, 'result', knotData, 'in').link(knotData, 'out', pr, 'text');
    });
    expect(prints(run(p))).toEqual(['via reroute']);
  });
});

describe('arrays and pass-by-reference', () => {
  it('Add, Remove Index, Find and Length change the variable itself', () => {
    const { p } = world((b) => {
      const arr = b.variable('Liste', T.array(T.string), ['a']);
      const g = () => b.node('var.get', { variable: arr });
      const add = b.node('array.add', {}, { item: 'b' });
      const add2 = b.node('array.add', {}, { item: 'c' });
      const rem = b.node('array.removeIndex', {}, { index: 0 });
      b.link(g(), 'value', add, 'array').link(g(), 'value', add2, 'array').link(g(), 'value', rem, 'array');
      const last = chain(b, add, add2, rem);
      const len = b.node('array.length');
      b.link(g(), 'value', len, 'array');
      const find = b.node('array.find', {}, { item: 'c' });
      b.link(g(), 'value', find, 'array');
      const p1 = printOf(b, last, len, 'result');
      printOf(b, p1, find, 'index');
    });
    expect(prints(run(p))).toEqual(['2', '1']);
  });

  it('Get out of range logs UE’s message', () => {
    const { p } = world((b) => {
      const arr = b.variable('Liste', T.array(T.int), []);
      const get = b.node('array.get', {}, { index: 3 });
      b.link(b.node('var.get', { variable: arr }), 'value', get, 'array');
      printOf(b, b.node('event.beginPlay'), get, 'item');
    });
    expect(errors(run(p)).join()).toContain('Attempted to access index 3 from array of length 0');
  });

  it('Increment Int writes back into the variable', () => {
    const { p } = world((b) => {
      const n = b.variable('Compteur', T.int, 5);
      const inc = b.node('var.incrementInt');
      const inc2 = b.node('var.incrementInt');
      b.link(b.node('var.get', { variable: n }), 'value', inc, 'value').link(b.node('var.get', { variable: n }), 'value', inc2, 'value');
      const last = chain(b, inc, inc2);
      printOf(b, last, b.node('var.get', { variable: n }), 'value');
    });
    expect(prints(run(p))).toEqual(['7']);
  });

  it('the compiler wants a variable on a reference pin', () => {
    const { b } = world((b) => {
      chain(b, b.node('var.incrementInt'));
    });
    expect(compileClass(b.cls, b.project).messages.some((m) => m.severity === 'error' && m.text.includes('Value'))).toBe(true);
  });

  it('Set copies an array: the two variables stay independent', () => {
    const { p } = world((b) => {
      const a = b.variable('A', T.array(T.int), [1]);
      const c = b.variable('B', T.array(T.int), []);
      const set = b.node('var.set', { variable: c });
      b.link(b.node('var.get', { variable: a }), 'value', set, 'value');
      const add = b.node('array.add', {}, { item: 9 });
      b.link(b.node('var.get', { variable: c }), 'value', add, 'array');
      const last = chain(b, set, add);
      const len = b.node('array.length');
      b.link(b.node('var.get', { variable: a }), 'value', len, 'array');
      printOf(b, last, len, 'result');
    });
    expect(prints(run(p))).toEqual(['1']);
  });
});

describe('timers', () => {
  function timerWorld(looping: boolean, clearAfter?: number) {
    return world((b) => {
      const handle = b.variable('Handle', T.struct('TimerHandle'));
      const ev = b.node('event.custom', { name: 'Ping' });
      b.link(ev, 'then', b.node('debug.printString', {}, { text: 'ping' }), 'exec');
      const set = b.node('time.setTimerByEvent', {}, { time: 0.5, looping });
      b.link(ev, 'delegate', set, 'event');
      const store = b.node('var.set', { variable: handle });
      b.link(set, 'handle', store, 'value');
      chain(b, set, store);
      if (clearAfter !== undefined) {
        const delay = b.node('time.delay', {}, { duration: clearAfter });
        const clear = b.node('time.clearTimer');
        b.link(store, 'then', delay, 'exec').link(delay, 'completed', clear, 'exec');
        b.link(b.node('var.get', { variable: handle }), 'value', clear, 'handle');
      }
    });
  }

  it('a one-shot timer calls its event once, after Time', () => {
    const s = run(timerWorld(false).p, 0.4);
    expect(prints(s)).toEqual([]);
    for (let i = 0; i < 90; i++) s.step();
    expect(prints(s)).toEqual(['ping']);
  });

  it('a looping timer repeats until Clear and Invalidate', () => {
    const s = run(timerWorld(true, 1.6).p, 3);
    expect(prints(s)).toEqual(['ping', 'ping', 'ping']);
    const handle = s.actors[0].vars[s.project.classes[0].variables[0].id];
    expect(handle).toBe(null);
  });
});

describe('actors', () => {
  it('Spawn Actor runs the new actor’s BeginPlay before continuing', () => {
    const pb = new ProjectBuilder('t');
    const spawned = pb.blueprint('BP_Fusible');
    spawned.link(spawned.node('event.beginPlay'), 'then', spawned.node('debug.printString', {}, { text: 'né' }), 'exec');
    const b = pb.blueprint('BP_Usine');
    const spawn = b.node('actor.spawn', {}, { class: spawned.cls.id, location: { x: 300, y: 0, z: 0 } });
    const after = b.node('debug.printString', {}, { text: 'après' });
    b.link(b.node('event.beginPlay'), 'then', spawn, 'exec').link(spawn, 'then', after, 'exec');
    expect(findPin(b.graph.nodes[spawn], 'result', contextFor(b.cls, pb.project))?.type).toEqual(T.object('BP_Fusible'));
    pb.place(b, 0, 0);
    const s = run(pb.project);
    expect(prints(s)).toEqual(['né', 'après']);
    expect(s.actors.map((a) => [a.className, a.x])).toEqual([['BP_Usine', 0], ['BP_Fusible', 300]]);
  });

  it('Get All Actors Of Class lists them in level order', () => {
    const pb = new ProjectBuilder('t');
    const lamp = pb.blueprint('BP_Lampe');
    const b = pb.blueprint('BP_Compteur');
    const all = b.node('actor.getAllOfClass', {}, { class: lamp.cls.id });
    const len = b.node('array.length');
    b.link(all, 'actors', len, 'array');
    b.link(b.node('event.beginPlay'), 'then', all, 'exec');
    printOf(b, all, len, 'result');
    pb.place(b, 0, 0);
    pb.place(lamp, 100, 0);
    pb.place(lamp, 200, 0);
    expect(prints(run(pb.project))).toEqual(['2']);
  });

  it('Event Destroyed runs before the actor goes', () => {
    const pb = new ProjectBuilder('t');
    const victim = pb.blueprint('BP_Cible');
    victim.link(victim.node('event.destroyed'), 'then', victim.node('debug.printString', {}, { text: 'adieu' }), 'exec');
    const b = pb.blueprint('BP_Casseur');
    const getAll = b.node('actor.getOfClass', {}, { class: victim.cls.id });
    const destroy = b.node('actor.destroy');
    const after = b.node('debug.printString', {}, { text: 'détruit' });
    b.link(getAll, 'result', destroy, 'target');
    b.link(b.node('event.beginPlay'), 'then', getAll, 'exec').link(getAll, 'then', destroy, 'exec').link(destroy, 'then', after, 'exec');
    pb.place(b, 0, 0);
    pb.place(victim, 500, 0);
    const s = run(pb.project);
    expect(prints(s)).toEqual(['adieu', 'détruit']);
    expect(s.actors.map((a) => a.className)).toEqual(['BP_Casseur']);
  });

  it('Set Actor Location moves the actor; Hidden In Game keeps it colliding', () => {
    const { p } = world((b) => {
      b.component('StaticMesh', 'Mur', { sizeX: 100, sizeY: 400 });
      const move = b.node('actor.setLocation', {}, { location: { x: 300, y: 0, z: 0 } });
      const hide = b.node('actor.setHidden', {}, { hidden: true });
      chain(b, move, hide);
    });
    p.level.playerStart = { x: 0, y: 0, yaw: 0 };
    const s = run(p);
    expect([s.actors[0].x, s.actors[0].hidden]).toEqual([300, true]);
    s.move = { x: 1, y: 0 };
    for (let i = 0; i < 60; i++) s.step();
    expect(s.player.x).toBeLessThan(300 - 50);
  });

  it('Set Collision Enabled to No Collision stops overlaps and blocking', () => {
    const { p } = world((b) => {
      b.component('StaticMesh', 'Mur', { sizeX: 100, sizeY: 400 });
      b.component('BoxCollision', 'Zone', { sizeX: 400, sizeY: 400 });
      const off = b.node('component.setCollisionEnabled', {}, { collision: 0 });
      const off2 = b.node('component.setCollisionEnabled', {}, { collision: 0 });
      chain(b, off, off2);
      b.target('Mur', off).target('Zone', off2);
      b.link(b.node('event.actorBeginOverlap'), 'then', b.node('debug.printString', {}, { text: 'touché' }), 'exec');
    });
    p.level.playerStart = { x: -600, y: 0, yaw: 0 };
    const s = run(p);
    s.move = { x: 1, y: 0 };
    for (let i = 0; i < 120; i++) s.step();
    expect(s.player.x).toBeGreaterThan(300);
    expect(prints(s)).toEqual([]);
  });
});

describe('flow control', () => {
  const runPrints = (setup: (b: ClassBuilder) => void, seconds = 0.1) => prints(run(world(setup).p, seconds));

  it('Switch on Int picks the matching case, else Default', () => {
    expect(
      runPrints((b) => {
        const loop = b.node('flow.forLoop', {}, { first: 0, last: 3 });
        const sw = b.node('flow.switchInt', { start: 1, cases: 2 });
        b.link(b.node('event.beginPlay'), 'then', loop, 'exec').link(loop, 'body', sw, 'exec').link(loop, 'index', sw, 'selection');
        for (const [pin, text] of [['case1', 'un'], ['case2', 'deux'], ['default', 'autre']]) b.link(sw, pin, b.node('debug.printString', {}, { text }), 'exec');
      }),
    ).toEqual(['autre', 'un', 'deux', 'autre']);
  });

  it('Switch on String ignores case unless asked', () => {
    expect(
      runPrints((b) => {
        const sw = b.node('flow.switchString', { names: 'Rouge, Vert' }, { selection: 'vert' });
        b.link(b.node('event.beginPlay'), 'then', sw, 'exec');
        for (const [pin, text] of [['case0', 'R'], ['case1', 'V'], ['default', '?']]) b.link(sw, pin, b.node('debug.printString', {}, { text }), 'exec');
      }),
    ).toEqual(['V']);
  });

  it('Switch on Enum and Select follow a project Enum', () => {
    const pb = new ProjectBuilder('t');
    pb.project.enums.push({ id: 'e1', name: 'E_Etat', entries: ['Arret', 'Marche', 'Panne'] });
    const b = pb.blueprint('BP_Test');
    const etat = b.variable('Etat', T.enum('E_Etat'), 2);
    const sw = b.node('flow.switchEnum', { enum: 'E_Etat' });
    b.link(b.node('event.beginPlay'), 'then', sw, 'exec').link(b.node('var.get', { variable: etat }), 'value', sw, 'selection');
    const sel = b.node('util.select', {}, {});
    b.link(b.node('var.get', { variable: etat }), 'value', sel, 'index');
    const text = b.node('string.append', {}, { in0: 'x' });
    b.link(sel, 'result', text, 'in1');
    Object.assign(b.graph.nodes[sel].defaults, { option0: 'a', option1: 'b', option2: 'c' } as Record<string, Value>);
    expect(findPin(b.graph.nodes[sel], 'option2', contextFor(b.cls, pb.project))?.name).toBe('Panne');
    const pr = b.node('debug.printString');
    b.link(sw, 'case2', pr, 'exec').link(text, 'result', pr, 'text');
    b.link(sw, 'case0', b.node('debug.printString', {}, { text: 'arrêt' }), 'exec');
    pb.place(b, 0, 0);
    expect(prints(run(pb.project))).toEqual(['xc']);
  });

  it('DoN lets N passes through; MultiGate walks its outputs', () => {
    expect(
      runPrints((b) => {
        const loop = b.node('flow.forLoop', {}, { first: 1, last: 4 });
        const don = b.node('flow.doN', {}, { n: 2 });
        const mg = b.node('flow.multiGate', { outputs: 3 }, { loop: true });
        const seq = b.node('flow.sequence');
        b.link(b.node('event.beginPlay'), 'then', loop, 'exec').link(loop, 'body', seq, 'exec');
        b.link(seq, 'then0', don, 'enter').link(don, 'exit', b.node('debug.printString', {}, { text: 'N' }), 'exec');
        b.link(seq, 'then1', mg, 'exec');
        for (let i = 0; i < 3; i++) b.link(mg, `out${i}`, b.node('debug.printString', {}, { text: `M${i}` }), 'exec');
      }),
    ).toEqual(['N', 'M0', 'N', 'M1', 'M2', 'M0']);
  });

  it('For Loop with Break stops at Break; While Loop re-reads its condition', () => {
    expect(
      runPrints((b) => {
        const loop = b.node('flow.forLoopWithBreak', {}, { first: 0, last: 9 });
        const eq = b.node('math.equalInt', {}, { b: 2 });
        const br = b.node('flow.branch');
        b.link(b.node('event.beginPlay'), 'then', loop, 'exec').link(loop, 'body', br, 'exec');
        b.link(loop, 'index', eq, 'a').link(eq, 'result', br, 'condition');
        b.link(br, 'true', loop, 'break');
        printOf(b, br, loop, 'index', 'false');
        b.link(loop, 'completed', b.node('debug.printString', {}, { text: 'fin' }), 'exec');
      }),
    ).toEqual(['0', '1', 'fin']);
  });
});

describe('maths and text', () => {
  it('divide by zero logs an error and gives 0; Round goes half away from zero', () => {
    const s = run(
      world((b) => {
        const div = b.node('math.divideInt', {}, { a: 5, b: 0 });
        const round = b.node('math.round', {}, { a: -2.5 });
        const p1 = printOf(b, b.node('event.beginPlay'), div, 'result');
        printOf(b, p1, round, 'result');
      }).p,
    );
    expect(prints(s)).toEqual(['0', '-3']);
    expect(errors(s).join()).toContain('Divide by zero');
  });

  it('Clamp, Contains and Enum to String', () => {
    const pb = new ProjectBuilder('t');
    pb.project.enums.push({ id: 'e1', name: 'E_Etat', entries: ['Arret', 'Marche'] });
    const b = pb.blueprint('BP_Test');
    const etat = b.variable('Etat', T.enum('E_Etat'), 1);
    const clamp = b.node('math.clampFloat', {}, { value: 140, min: 0, max: 100 });
    const has = b.node('string.contains', {}, { in: 'Fusible', sub: 'FUS' });
    const p1 = printOf(b, b.node('event.beginPlay'), clamp, 'result');
    const p2 = printOf(b, p1, has, 'result');
    const pr = b.node('debug.printString');
    b.link(p2, 'then', pr, 'exec');
    const r = connect(b.graph, { node: b.node('var.get', { variable: etat }), pin: 'value' }, { node: pr, pin: 'text' }, contextFor(b.cls, pb.project));
    expect(r.ok).toBe(true);
    pb.place(b, 0, 0);
    expect(prints(run(pb.project))).toEqual(['100.000000', 'true', 'Marche']);
  });
});

describe('saved projects', () => {
  it('a format-3 For Each Loop is typed from its wires when loaded', async () => {
    const { parseProject, serializeProject } = await import('../src/core/serialization/serialize');
    const { b, p } = world((b) => {
      const arr = b.variable('Liste', T.array(T.int), [1]);
      const loop = b.node('flow.forEachLoop');
      b.link(b.node('var.get', { variable: arr }), 'value', loop, 'array');
      chain(b, loop);
    });
    const loop = Object.values(b.graph.nodes).find((n) => n.def === 'flow.forEachLoop')!;
    delete loop.config.wild;
    const file = JSON.parse(serializeProject(p));
    file.format = 3;
    file.project.format = 3;
    const loaded = parseProject(JSON.stringify(file));
    const again = Object.values(loaded.classes[0].graphs[0].nodes).find((n) => n.def === 'flow.forEachLoop')!;
    expect(findPin(again, 'element', contextFor(loaded.classes[0], loaded))?.type).toEqual(T.int);
    expect(compileClass(loaded.classes[0], loaded).status).toBe('ok');
  });
});

describe('function calls', () => {
  /** Fact(n) = n <= 1 ? 1 : n * Fact(n - 1), with an optional DoOnce printing in its body. */
  function factorial(withDoOnce = false) {
    return world((b, pb) => {
      const g = addFunction(b.cls, 'Fact');
      const n = addFunctionParam(pb.project, b.cls, g.id, 'inputs', T.int)!;
      const out = addFunctionParam(pb.project, b.cls, g.id, 'outputs', T.int)!;
      const f = b.inGraph(g.id);
      const entry = Object.values(g.nodes).find((x) => x.def === 'fn.entry')!.id;
      const le = f.node('math.lessEqualInt', {}, { b: 1 });
      const br = f.node('flow.branch');
      const one = f.node('fn.return', { graph: g.id }, { [out.id]: 1 });
      const minus = f.node('math.subtractInt', {}, { b: 1 });
      const call = f.node('call.function', { graph: g.id });
      const mul = f.node('math.multiplyInt');
      const ret = f.node('fn.return', { graph: g.id });
      let head = entry;
      if (withDoOnce) {
        const once = f.node('flow.doOnce');
        const pr = f.node('debug.printString', {}, { text: 'appel' });
        f.link(entry, 'then', once, 'exec').link(once, 'completed', pr, 'exec');
        head = pr;
      }
      f.link(head, 'then', br, 'exec').link(entry, n.id, le, 'a').link(le, 'result', br, 'condition');
      f.link(br, 'true', one, 'exec').link(br, 'false', call, 'exec');
      f.link(entry, n.id, minus, 'a').link(minus, 'result', call, n.id);
      f.link(call, 'then', ret, 'exec').link(entry, n.id, mul, 'a').link(call, out.id, mul, 'b').link(mul, 'result', ret, out.id);
      const c = b.node('call.function', { graph: g.id }, { [n.id]: 5 });
      b.link(b.node('event.beginPlay'), 'then', c, 'exec');
      printOf(b, c, c, out.id);
    });
  }

  it('a recursive function gets its own inputs at every call (5! = 120)', () => {
    expect(prints(run(factorial().p)).at(-1)).toBe('120');
  });

  it('a DoOnce inside a function starts anew at every call, as in UE', () => {
    expect(prints(run(factorial(true).p))).toEqual(['appel', 'appel', 'appel', 'appel', 'appel', '120']);
  });
});

describe('a Blueprint player', () => {
  it('its own Box Collision raises overlap events, on both sides', () => {
    const pb = new ProjectBuilder('t');
    const pl = pb.blueprint('BP_Joueur', 'Pawn');
    setPlayerClass(pb.project, pl.cls.id);
    pl.component('BoxCollision', 'Portee', { sizeX: 600, sizeY: 600 });
    pl.link(pl.node('event.componentBeginOverlap', { component: pl.componentId('Portee') }), 'then', pl.node('debug.printString', {}, { text: 'à portée' }), 'exec');
    const lamp = pb.blueprint('BP_Lampe');
    lamp.component('BoxCollision', 'Z', { sizeX: 50, sizeY: 50 });
    lamp.link(lamp.node('event.actorBeginOverlap'), 'then', lamp.node('debug.printString', {}, { text: 'joueur proche' }), 'exec');
    pb.place(lamp, 200, 0);
    pb.playerStart(0, 0);
    expect(prints(run(pb.project)).sort()).toEqual(['joueur proche', 'à portée']);
  });
});

describe('float comparison', () => {
  it('== is exact; Nearly Equal takes a tolerance', () => {
    const { p } = world((b) => {
      const eq = b.node('math.equalFloat', {}, { a: 0.10001, b: 0.1 });
      const near = b.node('math.nearlyEqualFloat', {}, { a: 0.10001, b: 0.1 });
      printOf(b, printOf(b, b.node('event.beginPlay'), eq, 'result'), near, 'result');
    });
    expect(prints(run(p))).toEqual(['false', 'true']);
  });
});
