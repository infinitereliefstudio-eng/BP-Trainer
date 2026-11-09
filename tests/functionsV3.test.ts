/**
 * V3 step A: Local Variables, interface functions with inputs and outputs,
 * and turning a Custom Event into the interface event of the same name.
 */
import { describe, expect, it } from 'vitest';
import { compileClass } from '../src/core/compiler/validate';
import { ProjectBuilder, type ClassBuilder } from '../src/core/lessons/builder';
import { implementInterface } from '../src/core/operations/classOps';
import { addFunction, addFunctionParam, setFunctionPure } from '../src/core/operations/functionOps';
import { addInterfaceParam, convertToInterfaceEvent, removeInterfaceParam, syncInterfaceGraphs } from '../src/core/operations/interfaceOps';
import { addLocalVariable, removeLocalVariable, renameLocalVariable } from '../src/core/operations/localOps';
import { addInterface, addInterfaceFunction } from '../src/core/operations/projectOps';
import { paletteEntries } from '../src/core/nodes/palette';
import { contextFor } from '../src/core/nodes/registry';
import { Simulation } from '../src/core/runtime/simulation';
import { T } from '../src/core/types/pins';

const prints = (s: Simulation) => s.log.filter((l) => l.message !== undefined).map((l) => l.message);
const errors = (s: Simulation) => s.log.filter((l) => l.level === 'error').map((l) => l.text);
const compileErrors = (pb: ProjectBuilder, b: ClassBuilder) =>
  compileClass(b.cls, pb.project)
    .messages.filter((m) => m.severity === 'error')
    .map((m) => m.code);

/** BP with a function Compter(): a local starting at 10, +1, printed; BeginPlay calls it twice. */
function counterProject(useLocal: boolean) {
  const pb = new ProjectBuilder('t');
  const b = pb.blueprint('BP');
  pb.place(b, 0, 0);
  const g = addFunction(b.cls, 'Compter');
  const f = b.inGraph(g.id);
  const entry = Object.values(g.nodes)[0].id;
  let getId: string;
  let setId: string;
  if (useLocal) {
    const l = addLocalVariable(pb.project, b.cls, g.id, T.int)!;
    l.defaultValue = 10;
    getId = f.node('var.getLocal', { variable: l.id });
    setId = f.node('var.setLocal', { variable: l.id });
  } else {
    const v = b.variable('Total', T.int, 10);
    getId = f.node('var.get', { variable: v });
    setId = f.node('var.set', { variable: v });
  }
  const add = f.node('math.addInt', {}, { b: 1 });
  const pr = f.node('debug.printString');
  f.link(entry, 'then', setId, 'exec').link(getId, 'value', add, 'a').link(add, 'result', setId, 'value');
  f.link(setId, 'then', pr, 'exec').link(setId, 'out', pr, 'text');
  const ev = b.node('event.beginPlay');
  const c1 = b.node('call.function', { graph: g.id });
  const c2 = b.node('call.function', { graph: g.id });
  b.link(ev, 'then', c1, 'exec').link(c1, 'then', c2, 'exec');
  return { pb, b, g };
}

describe('Local Variables', () => {
  it('start again from their default value at each call, unlike a member variable', () => {
    const local = counterProject(true);
    expect(compileErrors(local.pb, local.b)).toEqual([]);
    const s = new Simulation(local.pb.project);
    s.step();
    expect(prints(s)).toEqual(['11', '11']);

    const member = counterProject(false);
    const s2 = new Simulation(member.pb.project);
    s2.step();
    expect(prints(s2)).toEqual(['11', '12']);
  });

  it('are separate in each call of a recursive function', () => {
    const pb = new ProjectBuilder('t');
    const b = pb.blueprint('BP');
    pb.place(b, 0, 0);
    const g = addFunction(b.cls, 'Somme');
    const n = addFunctionParam(pb.project, b.cls, g.id, 'inputs', T.int)!;
    const r = addFunctionParam(pb.project, b.cls, g.id, 'outputs', T.int)!;
    setFunctionPure(pb.project, b.cls, g.id, true);
    const l = addLocalVariable(pb.project, b.cls, g.id, T.int)!;
    const f = b.inGraph(g.id);
    const nodes = Object.values(g.nodes);
    const entry = nodes.find((x) => x.def === 'fn.entry')!.id;
    const ret = nodes.find((x) => x.def === 'fn.return')!.id;
    // Somme(n) = n <= 0 ? 0 : n + Somme(n - 1), with n kept in a local across the recursive call.
    const keep = f.node('var.setLocal', { variable: l.id });
    const br = f.node('flow.branch');
    const le = f.node('math.lessEqualInt', {}, { b: 0 });
    const ret0 = f.node('fn.return', { graph: g.id });
    const sub = f.node('math.subtractInt', {}, { b: 1 });
    const rec = f.node('call.pureFunction', { graph: g.id });
    const add = f.node('math.addInt');
    for (const l of Object.values(g.links)) if (l.from.node === entry && l.from.pin === 'then') delete g.links[l.id];
    f.link(entry, 'then', keep, 'exec').link(entry, n.id, keep, 'value').link(keep, 'then', br, 'exec');
    f.link(entry, n.id, le, 'a').link(le, 'result', br, 'condition').link(br, 'true', ret0, 'exec');
    f.link(br, 'false', ret, 'exec').link(entry, n.id, sub, 'a').link(sub, 'result', rec, n.id);
    f.link(f.node('var.getLocal', { variable: l.id }), 'value', add, 'a').link(rec, r.id, add, 'b').link(add, 'result', ret, r.id);
    const ev = b.node('event.beginPlay');
    const call = b.node('call.pureFunction', { graph: g.id }, { [n.id]: 4 });
    const pr = b.node('debug.printString');
    b.link(ev, 'then', pr, 'exec').link(call, r.id, pr, 'text');
    expect(compileErrors(pb, b)).toEqual([]);
    const s = new Simulation(pb.project);
    s.step();
    expect(prints(s)).toEqual(['10']);
  });

  it('exist only in their own function: elsewhere it does not compile', () => {
    const { pb, b, g } = counterProject(true);
    const other = addFunction(b.cls, 'Autre');
    const local = g.fn!.locals![0];
    b.inGraph(other.id).node('var.getLocal', { variable: local.id });
    expect(compileErrors(pb, b)).toContain('localScope');
  });

  it('are listed in the palette of their function only, and deleting one deletes its nodes', () => {
    const { pb, b, g } = counterProject(true);
    const local = g.fn!.locals![0];
    const ctx = contextFor(b.cls, pb.project);
    expect(paletteEntries(ctx, g).some((e) => e.key === `lget:${local.id}`)).toBe(true);
    expect(paletteEntries(ctx, b.cls.graphs[0]).some((e) => e.key === `lget:${local.id}`)).toBe(false);
    expect(removeLocalVariable(b.cls, g.id, local.id)).toBe(2);
    expect(Object.values(g.nodes).some((n) => n.def === 'var.getLocal' || n.def === 'var.setLocal')).toBe(false);
  });

  it('cannot take the name of a member variable', () => {
    const { pb, b, g } = counterProject(true);
    b.variable('Total', T.int);
    expect(renameLocalVariable(pb.project, b.cls, g.id, g.fn!.locals![0].id, 'Total').ok).toBe(false);
  });
});

/** BPI_Interactif with Interagir(Force: Integer) → (Reponse: String). */
function terminalProject() {
  const pb = new ProjectBuilder('t');
  const r = addInterface(pb.project, 'BPI_Interactif');
  if (!r.ok) throw new Error(r.reason);
  const iface = r.value;
  addInterfaceFunction(pb.project, iface.id, 'Interagir');
  const fn = iface.functions[0];
  const force = addInterfaceParam(pb.project, iface.id, fn.id, 'inputs', T.int)!;
  const rep = addInterfaceParam(pb.project, iface.id, fn.id, 'outputs', T.string)!;
  return { pb, iface, fn, force, rep };
}

describe('interface functions with inputs and outputs', () => {
  it('a function with outputs is implemented as a function graph and returns to the message', () => {
    const { pb, iface, fn, force, rep } = terminalProject();
    const term = pb.blueprint('BP_Terminal');
    const rock = pb.blueprint('BP_Rocher');
    implementInterface(term.cls, iface.id);
    syncInterfaceGraphs(pb.project, term.cls);
    const impl = term.cls.graphs.find((g) => g.iface?.fn === fn.id)!;
    expect(impl.name).toBe('Interagir');
    const f = term.inGraph(impl.id);
    const entry = Object.values(impl.nodes).find((n) => n.def === 'fn.entry')!.id;
    const ret = Object.values(impl.nodes).find((n) => n.def === 'fn.return')!.id;
    const text = f.node('string.append', {}, { in0: 'Force ' });
    f.link(entry, force.id, text, 'in1').link(text, 'result', ret, rep.id);

    const player = pb.blueprint('BP_Joueur');
    const tId = pb.place(term, 0, 0);
    const rId = pb.place(rock, 300, 0);
    const pId = pb.place(player, 600, 0);
    const refs = [tId, rId].map((id, i) => {
      const v = player.variable(`Cible${i}`, T.object('Actor'));
      player.cls.variables.find((x) => x.id === v)!.instanceEditable = true;
      pb.project.level.actors.find((a) => a.id === pId)!.overrides[v] = `actor:${id}`;
      return v;
    });
    const ev = player.node('event.beginPlay');
    const m1 = player.node('iface.message', { interface: iface.id, fn: fn.id }, { [force.id]: 3 });
    const m2 = player.node('iface.message', { interface: iface.id, fn: fn.id }, { [force.id]: 3 });
    const p1 = player.node('debug.printString');
    const p2 = player.node('debug.printString');
    player.link(ev, 'then', m1, 'exec').link(player.node('var.get', { variable: refs[0] }), 'value', m1, 'target');
    player.link(m1, 'then', p1, 'exec').link(m1, rep.id, p1, 'text');
    player.link(p1, 'then', m2, 'exec').link(player.node('var.get', { variable: refs[1] }), 'value', m2, 'target');
    player.link(m2, 'then', p2, 'exec').link(m2, rep.id, p2, 'text');
    for (const c of [term, player]) expect(compileErrors(pb, c)).toEqual([]);
    const s = new Simulation(pb.project);
    s.step();
    // The rock does not implement it: no error, the output keeps its default (empty).
    expect(prints(s)).toEqual(['Force 3', '']);
    expect(errors(s)).toEqual([]);
  });

  it('a function without outputs is an event that receives the inputs', () => {
    const { pb, iface, fn, force, rep } = terminalProject();
    removeInterfaceParam(pb.project, iface.id, fn.id, rep.id);
    const door = pb.blueprint('BP_Porte');
    implementInterface(door.cls, iface.id);
    syncInterfaceGraphs(pb.project, door.cls);
    expect(door.cls.graphs.some((g) => g.iface)).toBe(false);
    pb.place(door, 0, 0);
    const ie = door.node('event.interface', { interface: iface.id, fn: fn.id });
    const pr = door.node('debug.printString');
    door.link(ie, 'then', pr, 'exec').link(ie, force.id, pr, 'text');
    const ev = door.node('event.beginPlay');
    const msg = door.node('iface.message', { interface: iface.id, fn: fn.id }, { [force.id]: 7 });
    door.link(ev, 'then', msg, 'exec');
    expect(compileErrors(pb, door)).toEqual([]);
    const s = new Simulation(pb.project);
    s.step();
    expect(prints(s)).toEqual(['7']);
  });

  it('an event for a function with outputs does not compile', () => {
    const { pb, iface, fn } = terminalProject();
    const door = pb.blueprint('BP_Porte');
    implementInterface(door.cls, iface.id);
    door.node('event.interface', { interface: iface.id, fn: fn.id });
    expect(compileErrors(pb, door)).toContain('interfaceFunction');
  });

  it('the implementation follows the interface: renamed params, removed outputs, removed interface', () => {
    const { pb, iface, fn, rep } = terminalProject();
    const term = pb.blueprint('BP_Terminal');
    implementInterface(term.cls, iface.id);
    syncInterfaceGraphs(pb.project, term.cls);
    const added = addInterfaceParam(pb.project, iface.id, fn.id, 'outputs', T.bool)!;
    const impl = () => term.cls.graphs.find((g) => g.iface);
    expect(impl()!.fn!.outputs.map((p) => p.id)).toEqual([rep.id, added.id]);
    removeInterfaceParam(pb.project, iface.id, fn.id, rep.id);
    removeInterfaceParam(pb.project, iface.id, fn.id, added.id);
    expect(impl()).toBeUndefined();
  });

  it('a child Blueprint inherits the implementation and may override it', () => {
    const { pb, iface, fn, rep } = terminalProject();
    const base = pb.blueprint('BP_Base');
    implementInterface(base.cls, iface.id);
    syncInterfaceGraphs(pb.project, base.cls);
    const impl = base.cls.graphs.find((g) => g.iface)!;
    const ret = Object.values(impl.nodes).find((n) => n.def === 'fn.return')!;
    ret.defaults[rep.id] = 'base';
    const child = pb.blueprint('BP_Enfant');
    child.cls.parentClassId = base.cls.id;
    pb.place(child, 0, 0);
    const ev = child.node('event.beginPlay');
    const msg = child.node('iface.message', { interface: iface.id, fn: fn.id });
    const pr = child.node('debug.printString');
    child.link(ev, 'then', msg, 'exec').link(msg, 'then', pr, 'exec').link(msg, rep.id, pr, 'text');
    const s = new Simulation(pb.project);
    s.step();
    expect(prints(s)).toEqual(['base']);
  });
});

describe('Custom Event → interface event', () => {
  it('keeps the wires and answers the message', () => {
    const pb = new ProjectBuilder('t');
    const r = addInterface(pb.project, 'BPI_Interactif');
    if (!r.ok) throw new Error();
    addInterfaceFunction(pb.project, r.value.id, 'Interagir');
    const door = pb.blueprint('BP_Porte');
    implementInterface(door.cls, r.value.id);
    pb.place(door, 0, 0);
    const ce = door.node('event.custom', { name: 'Interagir' });
    const pr = door.node('debug.printString', {}, { text: 'ouverte' });
    door.link(ce, 'then', pr, 'exec');
    expect(convertToInterfaceEvent(pb.project, door.cls, door.graph, ce).ok).toBe(true);
    expect(door.graph.nodes[ce].def).toBe('event.interface');
    const ev = door.node('event.beginPlay');
    const msg = door.node('iface.message', { interface: r.value.id, fn: r.value.functions[0].id });
    door.link(ev, 'then', msg, 'exec');
    expect(compileErrors(pb, door)).toEqual([]);
    const s = new Simulation(pb.project);
    s.step();
    expect(prints(s)).toEqual(['ouverte']);
  });
});
