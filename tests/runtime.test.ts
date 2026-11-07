import { describe, expect, it } from 'vitest';
import { createProject, type BlueprintClass, type Project } from '../src/core/model/project';
import { contextFor } from '../src/core/nodes/registry';
import { addComponent, addVariable, updateComponentProps } from '../src/core/operations/classOps';
import { addNode, connect } from '../src/core/operations/graphOps';
import { placeActor } from '../src/core/operations/levelOps';
import { addClass } from '../src/core/operations/projectOps';
import { Simulation } from '../src/core/runtime/simulation';
import { T } from '../src/core/types/pins';
import type { Value } from '../src/core/types/values';
import { ProjectBuilder } from '../src/core/lessons/builder';

/** Tiny DSL to build graphs in tests. */
function build(setup: (b: Builder) => void): { p: Project; cls: BlueprintClass } {
  const p = createProject();
  const r = addClass(p, 'BP_Test');
  if (!r.ok) throw new Error();
  const cls = r.value;
  setup(new Builder(cls));
  placeActor(p, cls.id, 0, 0);
  p.level.playerStart = { x: 1000, y: 0, yaw: 0 };
  return { p, cls };
}

class Builder {
  constructor(readonly cls: BlueprintClass) {}
  get g() {
    return this.cls.graphs[0];
  }
  node(def: string, config: Record<string, Value> = {}, defaults: Record<string, Value> = {}): string {
    const r = addNode(this.g, def, 0, 0, config);
    if (!r.ok) throw new Error(r.reason);
    Object.assign(r.value.defaults, defaults);
    return r.value.id;
  }
  link(a: string, pa: string, b: string, pb: string): void {
    const r = connect(this.g, { node: a, pin: pa }, { node: b, pin: pb }, contextFor(this.cls));
    if (!r.ok) throw new Error(r.reason);
  }
  print(text: string): string {
    return this.node('debug.printString', {}, { text });
  }
}

const prints = (s: Simulation) => s.log.filter((l) => l.message !== undefined).map((l) => l.message);

function runFor(s: Simulation, seconds: number) {
  const steps = Math.round(seconds * 60);
  for (let i = 0; i < steps; i++) s.step();
}

describe('interpreter', () => {
  it('BeginPlay runs a chain once', () => {
    const { p } = build((b) => {
      const e = b.node('event.beginPlay');
      const pr = b.print('Bonjour');
      b.link(e, 'then', pr, 'exec');
    });
    const s = new Simulation(p);
    runFor(s, 0.5);
    expect(prints(s)).toEqual(['Bonjour']);
    expect(s.log[0].text).toBe('LogBlueprintUserMessages: [BP_Test_C_0] Bonjour');
  });

  it('Sequence does not wait for a Delay on Then 0', () => {
    const { p } = build((b) => {
      const e = b.node('event.beginPlay');
      const seq = b.node('flow.sequence');
      const d = b.node('time.delay', {}, { duration: 1 });
      const a = b.print('A');
      const bb = b.print('B');
      b.link(e, 'then', seq, 'exec');
      b.link(seq, 'then0', d, 'exec');
      b.link(d, 'completed', a, 'exec');
      b.link(seq, 'then1', bb, 'exec');
    });
    const s = new Simulation(p);
    runFor(s, 0.5);
    expect(prints(s)).toEqual(['B']);
    runFor(s, 0.6);
    expect(prints(s)).toEqual(['B', 'A']);
  });

  it('ForLoop through a Delay prints only the last index', () => {
    const { p } = build((b) => {
      const e = b.node('event.beginPlay');
      const loop = b.node('flow.forLoop', {}, { first: 0, last: 2 });
      const d = b.node('time.delay', {}, { duration: 0.5 });
      const pr = b.node('debug.printString');
      b.link(e, 'then', loop, 'exec');
      b.link(loop, 'body', d, 'exec');
      b.link(d, 'completed', pr, 'exec');
      b.link(loop, 'index', pr, 'text');
    });
    const s = new Simulation(p);
    runFor(s, 1);
    expect(prints(s)).toEqual(['2']);
  });

  it('ForLoop iterates in order and then Completed', () => {
    const { p } = build((b) => {
      const e = b.node('event.beginPlay');
      const loop = b.node('flow.forLoop', {}, { first: 1, last: 3 });
      const pr = b.node('debug.printString');
      const done = b.print('fin');
      b.link(e, 'then', loop, 'exec');
      b.link(loop, 'body', pr, 'exec');
      b.link(loop, 'index', pr, 'text');
      b.link(loop, 'completed', done, 'exec');
    });
    const s = new Simulation(p);
    s.step();
    expect(prints(s)).toEqual(['1', '2', '3', 'fin']);
  });

  it('FlipFlop and a Boolean variable toggle on key presses', () => {
    const { p, cls } = build((b) => {
      const v = addVariable(b.cls, T.bool, 'bOn');
      const key = b.node('event.inputKey', { key: 'E' });
      const ff = b.node('flow.flipFlop');
      const setA = b.node('var.set', { variable: v.id }, { value: true });
      const setB = b.node('var.set', { variable: v.id }, { value: false });
      b.link(key, 'pressed', ff, 'exec');
      b.link(ff, 'a', setA, 'exec');
      b.link(ff, 'b', setB, 'exec');
    });
    cls.autoReceiveInput = true;
    const s = new Simulation(p);
    const varId = cls.variables[0].id;
    s.step();
    s.pressKey('E');
    expect(s.actors[0].vars[varId]).toBe(true);
    s.pressKey('E');
    expect(s.actors[0].vars[varId]).toBe(false);
  });

  it('input events need Auto Receive Input', () => {
    const { p } = build((b) => {
      const key = b.node('event.inputKey', { key: 'E' });
      const pr = b.print('E !');
      b.link(key, 'pressed', pr, 'exec');
    });
    const s = new Simulation(p);
    s.pressKey('E');
    expect(prints(s)).toEqual([]);
    expect(s.deafActors('E')).toHaveLength(1);
  });

  it('DoOnce passes once until Reset', () => {
    const { p, cls } = build((b) => {
      const key = b.node('event.inputKey', { key: 'E' });
      const once = b.node('flow.doOnce');
      const pr = b.print('ouvert');
      const reset = b.node('event.inputKey', { key: 'F' });
      b.link(key, 'pressed', once, 'exec');
      b.link(once, 'completed', pr, 'exec');
      b.link(reset, 'pressed', once, 'reset');
    });
    cls.autoReceiveInput = true;
    const s = new Simulation(p);
    s.pressKey('E');
    s.pressKey('E');
    s.pressKey('F');
    s.pressKey('E');
    expect(prints(s)).toEqual(['ouvert', 'ouvert']);
  });

  it('a pure Random node read twice gives two values', () => {
    const { p } = build((b) => {
      const e = b.node('event.beginPlay');
      const r = b.node('math.randomIntInRange', {}, { min: 0, max: 1_000_000 });
      const p1 = b.node('debug.printString');
      const p2 = b.node('debug.printString');
      b.link(e, 'then', p1, 'exec');
      b.link(p1, 'then', p2, 'exec');
      b.link(r, 'result', p1, 'text');
      b.link(r, 'result', p2, 'text');
    });
    const s = new Simulation(p);
    s.step();
    const [a, c] = prints(s);
    expect(a).not.toBe(c);
  });

  it('overlap events fire when the player walks into a box', () => {
    const { p, cls } = build((b) => {
      const begin = b.node('event.actorBeginOverlap');
      const end = b.node('event.actorEndOverlap');
      const p1 = b.print('entre');
      const p2 = b.print('sort');
      b.link(begin, 'then', p1, 'exec');
      b.link(end, 'then', p2, 'exec');
    });
    const box = addComponent(cls, 'BoxCollision');
    updateComponentProps(cls, box.id, { sizeX: 200, sizeY: 200 });
    const s = new Simulation(p);
    s.step();
    expect(prints(s)).toEqual([]);
    s.teleportPlayer(0, 0);
    s.step();
    s.teleportPlayer(1000, 0);
    s.step();
    expect(prints(s)).toEqual(['entre', 'sort']);
  });

  it('Set Visibility on a light component, and Accessed None on an empty Target', () => {
    const { p, cls } = build((b) => {
      const light = addComponent(b.cls, 'PointLight');
      updateComponentProps(b.cls, light.id, { visible: false });
      const e = b.node('event.beginPlay');
      const get = b.node('var.component', { component: light.id });
      const set = b.node('component.setVisibility', {}, { visible: true });
      b.link(e, 'then', set, 'exec');
      b.link(get, 'value', set, 'target');
    });
    const s = new Simulation(p);
    s.step();
    const light = s.actors[0].components.find((c) => c.kind === 'PointLight')!;
    expect(light.props.visible).toBe(true);
    expect(s.runtimeErrors).toBe(0);
    // The class itself is untouched by the play session.
    expect(cls.components.find((c) => c.kind === 'PointLight')!.props.visible).toBe(false);
  });

  it('stops an infinite WhileLoop-like chain with an error', () => {
    const { p } = build((b) => {
      const key = b.node('event.beginPlay');
      const seq = b.node('flow.sequence');
      b.link(key, 'then', seq, 'exec');
      // A node cannot link to itself in the editor; force the loop in the model.
      b.g.links.loop = { id: 'loop', from: { node: seq, pin: 'then0' }, to: { node: seq, pin: 'exec' } };
    });
    const s = new Simulation(p);
    s.step();
    expect(s.runtimeErrors).toBeGreaterThan(0);
  });

  it('the player is blocked by a static mesh', () => {
    const { p, cls } = build(() => undefined);
    const wall = addComponent(cls, 'StaticMesh');
    updateComponentProps(cls, wall.id, { sizeX: 100, sizeY: 1000 });
    p.level.playerStart = { x: -300, y: 0, yaw: 0 };
    const s = new Simulation(p);
    s.move = { x: 1, y: 0 };
    runFor(s, 1);
    expect(s.player.x).toBeLessThanOrEqual(-50 - 34 + 0.5);
  });
});

describe('component visibility', () => {
  /** A lamp: root, mesh, light (siblings under the root), one call at BeginPlay. */
  function lamp(target: 'Pied' | 'DefaultSceneRoot', propagate: boolean) {
    const pb = new ProjectBuilder('t');
    const b = pb.blueprint('BP_Lampe');
    b.component('StaticMesh', 'Pied', { shape: 'cylinder', sizeX: 40, sizeY: 40 });
    b.component('PointLight', 'Lumiere');
    const e = b.node('event.beginPlay');
    const sv = b.node('component.setVisibility', {}, { visible: false, propagate });
    b.link(e, 'then', sv, 'exec').target(target, sv);
    pb.place(b, 0, 0);
    const s = new Simulation(pb.project);
    runFor(s, 0.1);
    const vis = (name: string) => s.actors[0].components.find((c) => c.name === name)!.props.visible;
    return { s, vis };
  }

  it('hides only the targeted mesh: its sibling light stays on', () => {
    const { s, vis } = lamp('Pied', false);
    expect([vis('Pied'), vis('Lumiere')]).toEqual([false, true]);
    expect(s.runtimeErrors).toBe(0);
  });

  it('on the root, hides nothing else unless Propagate to Children is ticked', () => {
    expect(lamp('DefaultSceneRoot', false).vis('Pied')).toBe(true);
    const { vis } = lamp('DefaultSceneRoot', true);
    expect([vis('Pied'), vis('Lumiere')]).toEqual([false, false]);
  });
});
