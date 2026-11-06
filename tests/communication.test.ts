import { describe, expect, it } from 'vitest';
import { compileClass } from '../src/core/compiler/validate';
import { ProjectBuilder, type ClassBuilder } from '../src/core/lessons/builder';
import { addDispatcher, addDispatcherParam, implementInterface } from '../src/core/operations/classOps';
import { addFunction, addFunctionParam, removeFunction, setFunctionPure } from '../src/core/operations/functionOps';
import { addInterface, addInterfaceFunction, renameCustomEvent, setPlayerClass } from '../src/core/operations/projectOps';
import { Simulation } from '../src/core/runtime/simulation';
import { T } from '../src/core/types/pins';

const prints = (s: Simulation) => s.log.filter((l) => l.message !== undefined).map((l) => l.message);
const errors = (s: Simulation) => s.log.filter((l) => l.level === 'error').map((l) => l.text);

/** An instance-editable reference variable on `from`, pointing at `toActor` in the level. */
function refVar(pb: ProjectBuilder, from: ClassBuilder, fromActor: string, name: string, to: ClassBuilder, toActor: string): string {
  const id = from.variable(name, T.object(to.cls.name));
  from.cls.variables.find((v) => v.id === id)!.instanceEditable = true;
  pb.project.level.actors.find((a) => a.id === fromActor)!.overrides[id] = `actor:${toActor}`;
  return id;
}

function print(b: ClassBuilder, text: string): string {
  return b.node('debug.printString', {}, { text });
}

function compileAll(pb: ProjectBuilder) {
  for (const c of pb.project.classes) {
    const errs = compileClass(c, pb.project).messages.filter((m) => m.severity === 'error');
    expect(errs.map((m) => `${c.name}: ${m.text}`)).toEqual([]);
  }
}

describe('references and Cast', () => {
  it('Cast To succeeds on the right Blueprint and fails on others, without errors', () => {
    const pb = new ProjectBuilder('t');
    const a = pb.blueprint('BP_A');
    const b = pb.blueprint('BP_B');
    const aId = pb.place(a, 0, 0);
    const bId = pb.place(b, 500, 0);
    const v = refVar(pb, a, aId, 'Cible', b, bId);
    const ev = a.node('event.beginPlay');
    const get = a.node('var.get', { variable: v });
    const cast = a.node('cast.to', { class: b.cls.id });
    const ok = print(a, 'ok');
    const cast2 = a.node('cast.to', { class: b.cls.id });
    const pawn = a.node('actor.getPlayerPawn');
    const ko = print(a, 'ko');
    a.link(ev, 'then', cast, 'exec').link(get, 'value', cast, 'object').link(cast, 'then', ok, 'exec');
    a.link(ok, 'then', cast2, 'exec').link(pawn, 'result', cast2, 'object').link(cast2, 'failed', ko, 'exec');
    compileAll(pb);
    const s = new Simulation(pb.project);
    s.step();
    expect(prints(s)).toEqual(['ok', 'ko']);
    expect(errors(s)).toEqual([]);
  });

  it('reads and writes variables of another Blueprint through a reference', () => {
    const pb = new ProjectBuilder('t');
    const a = pb.blueprint('BP_Interrupteur');
    const lamp = pb.blueprint('BP_Lampe');
    const on = lamp.variable('bAllumee', T.bool, false);
    const aId = pb.place(a, 0, 0);
    const lId = pb.place(lamp, 500, 0);
    const v = refVar(pb, a, aId, 'Lampe', lamp, lId);
    const ev = a.node('event.beginPlay');
    const set = a.node('var.setExternal', { owner: lamp.cls.id, variable: on }, { value: true });
    const get1 = a.node('var.get', { variable: v });
    const get2 = a.node('var.get', { variable: v });
    const read = a.node('var.getExternal', { owner: lamp.cls.id, variable: on });
    const pr = a.node('debug.printString');
    a.link(ev, 'then', set, 'exec').link(get1, 'value', set, 'target');
    a.link(set, 'then', pr, 'exec').link(get2, 'value', read, 'target').link(read, 'value', pr, 'text');
    compileAll(pb);
    const s = new Simulation(pb.project);
    s.step();
    expect(s.actors.find((x) => x.id === lId)!.vars[on]).toBe(true);
    expect(prints(s)).toEqual(['true']);
  });

  it('an empty reference gives Accessed None, and Is Valid avoids it', () => {
    const pb = new ProjectBuilder('t');
    const a = pb.blueprint('BP_A');
    const b = pb.blueprint('BP_B');
    const x = b.variable('X', T.int, 3);
    pb.place(a, 0, 0);
    const v = a.variable('Cible', T.object('BP_B'));
    const ev = a.node('event.beginPlay');
    const valid = a.node('flow.isValid');
    const g1 = a.node('var.get', { variable: v });
    const g2 = a.node('var.get', { variable: v });
    const read = a.node('var.getExternal', { owner: b.cls.id, variable: x });
    const p1 = a.node('debug.printString');
    const p2 = print(a, 'pas de cible');
    a.link(ev, 'then', p1, 'exec').link(g1, 'value', read, 'target').link(read, 'value', p1, 'text');
    a.link(p1, 'then', valid, 'exec').link(g2, 'value', valid, 'object').link(valid, 'notValid', p2, 'exec');
    const s = new Simulation(pb.project);
    s.step();
    expect(errors(s)[0]).toMatch(/Accessed None/);
    expect(prints(s)).toEqual(['0', 'pas de cible']);
  });
});

describe('Event Dispatchers', () => {
  function generatorProject() {
    const pb = new ProjectBuilder('t');
    const gen = pb.blueprint('BP_Generateur');
    const lamp = pb.blueprint('BP_Lampe');
    const d = addDispatcher(gen.cls, 'OnAlimente');
    addDispatcherParam(gen.cls, d.id, T.bool);
    const param = d.params[0].id;
    gen.cls.autoReceiveInput = true;
    const gId = pb.place(gen, 0, 0);
    const l1 = pb.place(lamp, 300, 0);
    const l2 = pb.place(lamp, 600, 0);
    // Generator: E → Call OnAlimente(true) → Print "après"
    const key = gen.node('event.inputKey', { key: 'E' });
    const call = gen.node('dispatcher.call', { owner: gen.cls.id, dispatcher: d.id }, { [param]: true });
    const after = print(gen, 'après');
    gen.link(key, 'pressed', call, 'exec').link(call, 'then', after, 'exec');
    // Lamp: BeginPlay → Bind (Generateur) ← custom event Allumer(param) → Print param
    const v = lamp.variable('Generateur', T.object('BP_Generateur'));
    lamp.cls.variables.find((x) => x.id === v)!.instanceEditable = true;
    for (const id of [l1, l2]) pb.project.level.actors.find((a) => a.id === id)!.overrides[v] = `actor:${gId}`;
    const bp = lamp.node('event.beginPlay');
    const bind = lamp.node('dispatcher.bind', { owner: gen.cls.id, dispatcher: d.id });
    const get = lamp.node('var.get', { variable: v });
    const ce = lamp.node('event.custom', { name: 'Allumer', signature: d.id, signatureOwner: gen.cls.id });
    const pr = lamp.node('debug.printString');
    lamp.link(bp, 'then', bind, 'exec').link(get, 'value', bind, 'target').link(ce, 'delegate', bind, 'event');
    lamp.link(ce, 'then', pr, 'exec').link(ce, param, pr, 'text');
    return { pb, gen, lamp, d, gId, l1, l2, bind };
  }

  it('runs every bound event immediately, before the caller continues', () => {
    const { pb } = generatorProject();
    compileAll(pb);
    const s = new Simulation(pb.project);
    s.step();
    expect(prints(s)).toEqual([]);
    s.pressKey('E');
    expect(prints(s)).toEqual(['true', 'true', 'après']);
    expect(s.log.filter((l) => l.message === 'true').map((l) => l.actor)).toEqual(['l1', 'l2'].map(() => expect.any(String)));
  });

  it('nobody bound: Call does nothing, without error', () => {
    const { pb, lamp, bind } = generatorProject();
    delete lamp.graph.nodes[bind];
    for (const [id, l] of Object.entries(lamp.graph.links)) if (l.to.node === bind || l.from.node === bind) delete lamp.graph.links[id];
    const s = new Simulation(pb.project);
    s.step();
    s.pressKey('E');
    expect(prints(s)).toEqual(['après']);
    expect(errors(s)).toEqual([]);
  });

  it('binding twice has no effect, and destroyed listeners are dropped', () => {
    const { pb } = generatorProject();
    const s = new Simulation(pb.project);
    s.start();
    s.start(); // no-op
    const lamp1 = s.actors[1];
    s.destroy(lamp1);
    s.step();
    s.pressKey('E');
    expect(prints(s)).toEqual(['true', 'après']);
  });

  it('a Custom Event made for a dispatcher follows its signature when it changes', () => {
    const { pb, d, gen } = generatorProject();
    // The event's pins come from the dispatcher, so the link stays valid.
    addDispatcherParam(gen.cls, d.id, T.int);
    const lampCls = pb.project.classes.find((c) => c.name === 'BP_Lampe')!;
    expect(compileClass(lampCls, pb.project).status).toBe('ok');
  });
});

describe('Custom Event calls', () => {
  it('calls a Custom Event on another actor, synchronously, and follows renames', () => {
    const pb = new ProjectBuilder('t');
    const a = pb.blueprint('BP_A');
    const b = pb.blueprint('BP_B');
    const aId = pb.place(a, 0, 0);
    const bId = pb.place(b, 400, 0);
    const v = refVar(pb, a, aId, 'B', b, bId);
    const ce = b.node('event.custom', { name: 'Ouvrir' });
    const pb1 = print(b, 'B ouvre');
    b.link(ce, 'then', pb1, 'exec');
    const ev = a.node('event.beginPlay');
    const call = a.node('call.custom', { owner: b.cls.id, event: 'Ouvrir' });
    const get = a.node('var.get', { variable: v });
    const pa = print(a, 'A continue');
    a.link(ev, 'then', call, 'exec').link(get, 'value', call, 'target').link(call, 'then', pa, 'exec');
    expect(renameCustomEvent(pb.project, b.cls.id, ce, 'OuvrirPorte').ok).toBe(true);
    expect(a.graph.nodes[call].config.event).toBe('OuvrirPorte');
    compileAll(pb);
    const s = new Simulation(pb.project);
    s.step();
    expect(prints(s)).toEqual(['B ouvre', 'A continue']);
  });
});

describe('Blueprint Interfaces', () => {
  it('messages run only on implementers and never fail', () => {
    const pb = new ProjectBuilder('t');
    const iface = addInterface(pb.project, 'BPI_Interactif');
    if (!iface.ok) throw new Error();
    addInterfaceFunction(pb.project, iface.value.id, 'Interagir');
    const fn = iface.value.functions[0].id;
    const caller = pb.blueprint('BP_Joueur');
    const door = pb.blueprint('BP_Porte');
    const rock = pb.blueprint('BP_Rocher');
    implementInterface(door.cls, iface.value.id);
    const cId = pb.place(caller, 0, 0);
    const dId = pb.place(door, 300, 0);
    const rId = pb.place(rock, 600, 0);
    const ie = door.node('event.interface', { interface: iface.value.id, fn });
    const dp = print(door, 'La porte s’ouvre');
    door.link(ie, 'then', dp, 'exec');
    const vd = refVar(pb, caller, cId, 'Porte', door, dId);
    const vr = refVar(pb, caller, cId, 'Rocher', rock, rId);
    const ev = caller.node('event.beginPlay');
    const m1 = caller.node('iface.message', { interface: iface.value.id, fn });
    const m2 = caller.node('iface.message', { interface: iface.value.id, fn });
    const m3 = caller.node('iface.message', { interface: iface.value.id, fn });
    const g1 = caller.node('var.get', { variable: vd });
    const g2 = caller.node('var.get', { variable: vr });
    const none = caller.variable('Rien', T.object('Actor'));
    const g3 = caller.node('var.get', { variable: none });
    const does = caller.node('iface.doesImplement', { interface: iface.value.id });
    const g4 = caller.node('var.get', { variable: vr });
    const pr = caller.node('debug.printString');
    caller.link(ev, 'then', m1, 'exec').link(g1, 'value', m1, 'target');
    caller.link(m1, 'then', m2, 'exec').link(g2, 'value', m2, 'target');
    caller.link(m2, 'then', m3, 'exec').link(g3, 'value', m3, 'target');
    caller.link(m3, 'then', pr, 'exec').link(g4, 'value', does, 'object').link(does, 'result', pr, 'text');
    compileAll(pb);
    const s = new Simulation(pb.project);
    s.step();
    expect(prints(s)).toEqual(['La porte s’ouvre', 'false']);
    expect(errors(s)).toEqual([]);
  });

  it('an interface event in a class that does not implement it is a compile error', () => {
    const pb = new ProjectBuilder('t');
    const iface = addInterface(pb.project, 'BPI_X');
    if (!iface.ok) throw new Error();
    addInterfaceFunction(pb.project, iface.value.id, 'Faire');
    const a = pb.blueprint('BP_A');
    a.node('event.interface', { interface: iface.value.id, fn: iface.value.functions[0].id });
    expect(compileClass(a.cls, pb.project).status).toBe('error');
  });
});

describe('player Blueprint and arrays', () => {
  it('the player can be a Pawn Blueprint that receives input', () => {
    const pb = new ProjectBuilder('t');
    const pawn = pb.blueprint('BP_Joueur', 'Pawn');
    expect(setPlayerClass(pb.project, pawn.cls.id).ok).toBe(true);
    const key = pawn.node('event.inputKey', { key: 'F' });
    const pr = print(pawn, 'F !');
    pawn.link(key, 'pressed', pr, 'exec');
    const s = new Simulation(pb.project);
    s.step();
    s.pressKey('F');
    expect(prints(s)).toEqual(['F !']);
    expect(s.player.objectName).toBe('BP_Joueur_C_0');
  });

  it('For Each Loop over Get Overlapping Actors', () => {
    const pb = new ProjectBuilder('t');
    const zone = pb.blueprint('BP_Zone');
    zone.component('BoxCollision', 'Zone', { sizeX: 400, sizeY: 400 });
    const crate = pb.blueprint('BP_Caisse');
    crate.component('BoxCollision', 'Box', { sizeX: 40, sizeY: 40 });
    pb.place(zone, 0, 0);
    pb.place(crate, 50, 0);
    pb.place(crate, -50, 0);
    pb.playerStart(2000, 0);
    zone.cls.autoReceiveInput = true;
    const key = zone.node('event.inputKey', { key: 'E' });
    const over = zone.node('actor.getOverlappingActors');
    const loop = zone.node('flow.forEachLoop');
    const pr = zone.node('debug.printString');
    const done = print(zone, 'fini');
    zone.link(key, 'pressed', over, 'exec').link(over, 'then', loop, 'exec').link(over, 'actors', loop, 'array');
    zone.link(loop, 'body', pr, 'exec').link(loop, 'element', pr, 'text').link(loop, 'completed', done, 'exec');
    compileAll(pb);
    const s = new Simulation(pb.project);
    s.step();
    s.pressKey('E');
    expect(prints(s)).toEqual(['BP_Caisse', 'BP_Caisse2', 'fini']);
  });
});

describe('debugger', () => {
  function chain() {
    const pb = new ProjectBuilder('t');
    const a = pb.blueprint('BP_A');
    pb.place(a, 0, 0);
    const ev = a.node('event.beginPlay');
    const v = a.variable('N', T.int, 7);
    const p1 = print(a, 'un');
    const p2 = a.node('debug.printString');
    const get = a.node('var.get', { variable: v });
    const p3 = print(a, 'trois');
    a.link(ev, 'then', p1, 'exec').link(p1, 'then', p2, 'exec').link(get, 'value', p2, 'text').link(p2, 'then', p3, 'exec');
    return { pb, ev, p1, p2, p3 };
  }

  it('stops before a breakpoint node, shows its values, then continues', () => {
    const { pb, p2 } = chain();
    const s = new Simulation(pb.project);
    s.breakpoints.add(p2);
    s.step();
    expect(s.paused?.nodeId).toBe(p2);
    expect(prints(s)).toEqual(['un']);
    const frame = s.frame;
    s.advance(1); // frozen while paused
    expect(s.frame).toBe(frame);
    expect(s.watch().find((w) => w.pin === 'text')?.value).toBe('7');
    s.resume();
    expect(s.paused).toBeNull();
    expect(prints(s)).toEqual(['un', '7', 'trois']);
    s.step();
    expect(s.frame).toBe(frame + 1);
  });

  it('steps node by node and records the trace with the wires taken', () => {
    const { pb, ev, p1, p2, p3 } = chain();
    const s = new Simulation(pb.project);
    s.breakpoints.add(ev);
    s.start();
    expect(s.paused?.nodeId).toBe(ev);
    s.stepNode();
    expect(s.paused?.nodeId).toBe(p1);
    s.stepNode();
    expect(s.paused?.nodeId).toBe(p2);
    expect(prints(s)).toEqual(['un']);
    s.resume();
    expect(prints(s)).toEqual(['un', '7', 'trois']);
    expect(s.trace.map((t) => t.nodeId)).toEqual([ev, p1, p2, p3]);
    expect(s.trace[0].via).toBeUndefined();
    expect(s.trace[1].via).toBeTruthy();
  });
});

describe('user functions', () => {
  function withFunction(pure: boolean) {
    const pb = new ProjectBuilder('t');
    const a = pb.blueprint('BP_A');
    pb.place(a, 0, 0);
    const g = addFunction(a.cls, 'Doubler');
    const x = addFunctionParam(pb.project, a.cls, g.id, 'inputs', T.int)!;
    const r = addFunctionParam(pb.project, a.cls, g.id, 'outputs', T.int)!;
    const f = a.inGraph(g.id);
    const entry = Object.values(g.nodes).find((n) => n.def === 'fn.entry')!.id;
    const ret = Object.values(g.nodes).find((n) => n.def === 'fn.return')!.id;
    const add = f.node('math.addInt');
    const say = f.node('debug.printString', {}, { text: 'dans la fonction' });
    // Return is linked to Entry by addFunctionParam: insert Print between them.
    f.link(entry, 'then', say, 'exec').link(say, 'then', ret, 'exec');
    f.link(entry, x.id, add, 'a').link(entry, x.id, add, 'b').link(add, 'result', ret, r.id);
    if (pure) setFunctionPure(pb.project, a.cls, g.id, true);
    return { pb, a, g, x, r };
  }

  it('an impure function runs to its Return Node, then the caller continues with its outputs', () => {
    const { pb, a, g, x, r } = withFunction(false);
    const ev = a.node('event.beginPlay');
    const call = a.node('call.function', { graph: g.id }, { [x.id]: 21 });
    const pr = a.node('debug.printString');
    a.link(ev, 'then', call, 'exec').link(call, 'then', pr, 'exec').link(call, r.id, pr, 'text');
    compileAll(pb);
    const s = new Simulation(pb.project);
    s.step();
    expect(prints(s)).toEqual(['dans la fonction', '42']);
  });

  it('a pure function runs again at every read', () => {
    const { pb, a, g, x, r } = withFunction(true);
    const ev = a.node('event.beginPlay');
    const call = a.node('call.pureFunction', { graph: g.id }, { [x.id]: 5 });
    const p1 = a.node('debug.printString');
    const p2 = a.node('debug.printString');
    a.link(ev, 'then', p1, 'exec').link(p1, 'then', p2, 'exec').link(call, r.id, p1, 'text').link(call, r.id, p2, 'text');
    compileAll(pb);
    const s = new Simulation(pb.project);
    s.step();
    expect(prints(s)).toEqual(['dans la fonction', '10', 'dans la fonction', '10']);
  });

  it('a Delay inside a function is a compile error, and removing the function removes its calls', () => {
    const { pb, a, g } = withFunction(false);
    const call = a.node('call.function', { graph: g.id });
    expect(() => a.inGraph(g.id).node('time.delay')).toThrow();
    removeFunction(pb.project, a.cls, g.id);
    expect(a.graph.nodes[call]).toBeUndefined();
  });
});
