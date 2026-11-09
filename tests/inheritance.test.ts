/** Plan V2, step E: Blueprint inheritance, as UE does it. */
import { describe, expect, it } from 'vitest';
import { compileClass } from '../src/core/compiler/validate';
import { ProjectBuilder, type ClassBuilder } from '../src/core/lessons/builder';
import { inheritedView } from '../src/core/model/inheritance';
import { addFunction, addFunctionParam } from '../src/core/operations/functionOps';
import { removeClass, setParentClass } from '../src/core/operations/projectOps';
import { Simulation } from '../src/core/runtime/simulation';
import { T } from '../src/core/types/pins';

const prints = (s: Simulation) => s.log.filter((l) => l.message !== undefined).map((l) => l.message);
const errors = (s: Simulation) => s.log.filter((l) => l.level === 'error').map((l) => l.text);
const compileErrors = (pb: ProjectBuilder, b: ClassBuilder) =>
  compileClass(b.cls, pb.project)
    .messages.filter((m) => m.severity === 'error')
    .map((m) => m.text);

/** BP_Parent: a Lumiere, a Puissance variable, BeginPlay → Print "parent" → Allumer(); Allumer prints "allumer parent". */
function family() {
  const pb = new ProjectBuilder('t');
  const parent = pb.blueprint('BP_Parent');
  parent.component('PointLight', 'Lumiere', { visible: false });
  const power = parent.variable('Puissance', T.int, 7);
  const fn = addFunction(parent.cls, 'Allumer');
  const f = parent.inGraph(fn.id);
  const entry = Object.values(fn.nodes).find((n) => n.def === 'fn.entry')!.id;
  f.link(entry, 'then', f.node('debug.printString', {}, { text: 'allumer parent' }), 'exec');
  const begin = parent.node('event.beginPlay');
  const say = parent.node('debug.printString', {}, { text: 'parent' });
  const call = parent.node('call.function', { graph: fn.id });
  parent.link(begin, 'then', say, 'exec').link(say, 'then', call, 'exec');
  const child = pb.blueprint('BP_Enfant');
  const r = setParentClass(pb.project, child.cls.id, parent.cls.id);
  if (!r.ok) throw new Error(r.reason);
  return { pb, parent, child, power, fn };
}

describe('Blueprint inheritance', () => {
  it('a child has its parent’s components and variables, and runs its parent’s events', () => {
    const { pb, parent, child, power } = family();
    const view = inheritedView(child.cls, pb.project);
    expect(view.components.some((c) => c.name === 'Lumiere')).toBe(true);
    expect(view.variables.some((v) => v.id === power)).toBe(true);
    pb.place(child, 0, 0);
    expect(compileErrors(pb, child)).toEqual([]);
    const s = new Simulation(pb.project);
    s.step();
    expect(prints(s)).toEqual(['parent', 'allumer parent']);
    expect(s.actors[0].vars[power]).toBe(7);
    expect(parent.cls.name).toBe('BP_Parent');
  });

  it('a child’s own BeginPlay replaces the parent’s, unless it calls Parent: BeginPlay', () => {
    const { pb, child } = family();
    pb.place(child, 0, 0);
    const begin = child.node('event.beginPlay');
    const say = child.node('debug.printString', {}, { text: 'enfant' });
    child.link(begin, 'then', say, 'exec');
    let s = new Simulation(pb.project);
    s.step();
    expect(prints(s)).toEqual(['enfant']);
    const up = child.node('call.parentEvent', { event: 'event.beginPlay' });
    child.link(say, 'then', up, 'exec');
    expect(compileErrors(pb, child)).toEqual([]);
    s = new Simulation(pb.project);
    s.step();
    expect(prints(s)).toEqual(['enfant', 'parent', 'allumer parent']);
  });

  it('a function overridden by the child runs instead, even when the parent’s graph calls it; Parent: calls the original', () => {
    const { pb, parent, child, fn } = family();
    pb.place(parent, 0, 0);
    pb.place(child, 300, 0);
    const over = addFunction(child.cls, 'Allumer');
    const f = child.inGraph(over.id);
    const entry = Object.values(over.nodes).find((n) => n.def === 'fn.entry')!.id;
    const say = f.node('debug.printString', {}, { text: 'allumer enfant' });
    const up = f.node('call.function', { graph: fn.id, parent: true });
    f.link(entry, 'then', say, 'exec').link(say, 'then', up, 'exec');
    expect(compileErrors(pb, child)).toEqual([]);
    const s = new Simulation(pb.project, { order: 'level' });
    s.step();
    expect(prints(s)).toEqual(['parent', 'allumer parent', 'parent', 'allumer enfant', 'allumer parent']);
  });

  it('a child is its parent: Cast To and Get All Actors Of Class accept it', () => {
    const { pb, parent, child } = family();
    const other = pb.blueprint('BP_Autre');
    pb.place(child, 0, 0);
    pb.place(other, 300, 0);
    const begin = other.node('event.beginPlay');
    const all = other.node('actor.getAllOfClass', {}, { class: parent.cls.id });
    const len = other.node('array.length');
    const say = other.node('debug.printString');
    other.link(begin, 'then', all, 'exec').link(all, 'then', say, 'exec').link(all, 'actors', len, 'array').link(len, 'result', say, 'text');
    const cast = other.node('cast.to', { class: parent.cls.id });
    const ok = other.node('debug.printString', {}, { text: 'cast ok' });
    other.link(say, 'then', cast, 'exec').link(all, 'actors', other.node('array.get'), 'array');
    const first = Object.values(other.graph.nodes).find((n) => n.def === 'array.get')!.id;
    other.link(first, 'item', cast, 'object').link(cast, 'then', ok, 'exec');
    expect(compileErrors(pb, other)).toEqual([]);
    const s = new Simulation(pb.project);
    s.step();
    expect(prints(s)).toContain('1');
    expect(prints(s)).toContain('cast ok');
    expect(errors(s)).toEqual([]);
  });

  it('compile errors: a name taken twice, a different override signature, a Private parent variable', () => {
    const { pb, parent, child, fn } = family();
    child.variable('Puissance', T.int);
    expect(compileErrors(pb, child).join()).toMatch(/Puissance existe déjà dans BP_Parent/);
    child.cls.variables = [];
    const over = addFunction(child.cls, 'Allumer');
    addFunctionParam(pb.project, child.cls, over.id, 'inputs', T.int);
    expect(compileErrors(pb, child).join()).toMatch(/Allumer redéfinit la fonction de BP_Parent/);
    child.cls.graphs = child.cls.graphs.filter((g) => g.id !== over.id);
    const secret = parent.variable('Secret', T.int);
    parent.cls.variables.find((v) => v.id === secret)!.private = true;
    child.node('var.get', { variable: secret });
    expect(compileErrors(pb, child).join()).toMatch(/Secret est Private dans la classe parente/);
    expect(fn.name).toBe('Allumer');
  });

  it('no cycle, and a parent cannot be deleted while a child uses it', () => {
    const { pb, parent, child } = family();
    expect(setParentClass(pb.project, parent.cls.id, child.cls.id).ok).toBe(false);
    expect(removeClass(pb.project, parent.cls.id).ok).toBe(false);
    expect(setParentClass(pb.project, child.cls.id, 'Pawn').ok).toBe(true);
    expect(child.cls.parentClassId).toBeUndefined();
    expect(removeClass(pb.project, parent.cls.id).ok).toBe(true);
  });
});
