/**
 * "Why did this node not run?": each silent case of UE gets its own reason,
 * computed from what the play session recorded.
 */
import { describe, expect, it } from 'vitest';
import { diagnoseNode } from '../src/core/explain/diagnose';
import { ProjectBuilder, type ClassBuilder } from '../src/core/lessons/builder';
import { addDispatcher, implementInterface } from '../src/core/operations/classOps';
import { addInterface, addInterfaceFunction } from '../src/core/operations/projectOps';
import { Simulation } from '../src/core/runtime/simulation';
import { T } from '../src/core/types/pins';

function run(pb: ProjectBuilder, play: (s: Simulation) => void = (s) => s.step(), order: 'level' | 'reversed' = 'level') {
  const s = new Simulation(pb.project, { order });
  play(s);
  return s;
}

function why(s: Simulation, b: ClassBuilder, nodeId: string) {
  const d = diagnoseNode({ project: s.project, record: s.record, label: (id) => s.allActors().find((a) => a.id === id)?.label ?? id }, b.graph.id, nodeId);
  return { ran: d.ran, text: d.steps.map((x) => x.text).join('\n') };
}

function refVar(pb: ProjectBuilder, from: ClassBuilder, fromActor: string, name: string, to: ClassBuilder, toActor: string): string {
  const id = from.variable(name, T.object(to.cls.name));
  from.cls.variables.find((v) => v.id === id)!.instanceEditable = true;
  pb.project.level.actors.find((a) => a.id === fromActor)!.overrides[id] = `actor:${toActor}`;
  return id;
}

describe('why a node did not run', () => {
  it('a Blueprint with no actor in the level', () => {
    const pb = new ProjectBuilder('t');
    const a = pb.blueprint('BP_Seul');
    const pr = a.node('debug.printString');
    a.link(a.node('event.beginPlay'), 'then', pr, 'exec');
    expect(why(run(pb), a, pr).text).toContain('Aucun acteur BP_Seul');
  });

  it('a Branch whose condition stayed false', () => {
    const pb = new ProjectBuilder('t');
    const a = pb.blueprint('BP_A');
    pb.place(a, 0, 0);
    const br = a.node('flow.branch', {}, { condition: false });
    const pr = a.node('debug.printString');
    a.link(a.node('event.beginPlay'), 'then', br, 'exec').link(br, 'true', pr, 'exec');
    const d = why(run(pb), a, pr);
    expect(d.ran).toBe(false);
    expect(d.text).toContain('Condition valait false');
  });

  it('a chain that waits on an input key with Auto Receive Input off', () => {
    const pb = new ProjectBuilder('t');
    const a = pb.blueprint('BP_A');
    pb.place(a, 0, 0);
    const key = a.node('event.inputKey', { key: 'E' });
    const p1 = a.node('debug.printString');
    const p2 = a.node('debug.printString');
    a.link(key, 'pressed', p1, 'exec').link(p1, 'then', p2, 'exec');
    const s = run(pb, (sim) => {
      sim.pressKey('E');
      sim.step();
    });
    const t = why(s, a, p2).text;
    expect(t).toContain('qui ne s’est pas exécuté non plus');
    expect(t).toContain('Auto Receive Input est sur Disabled');
  });

  it('a Delay that ignored a second call', () => {
    const pb = new ProjectBuilder('t');
    const a = pb.blueprint('BP_A');
    a.cls.autoReceiveInput = true;
    pb.place(a, 0, 0);
    const key = a.node('event.inputKey', { key: 'E' });
    const delay = a.node('time.delay', {}, { duration: 2 });
    a.link(key, 'pressed', delay, 'exec');
    const s = run(pb, (sim) => {
      sim.pressKey('E');
      sim.step();
      sim.pressKey('E');
      sim.step();
    });
    const d = why(s, a, delay);
    expect(d.ran).toBe(true);
    expect(d.text).toContain('a été ignoré');
  });

  it('a Dispatcher called before the Bind', () => {
    const pb = new ProjectBuilder('t');
    const gen = pb.blueprint('BP_Generateur');
    const lamp = pb.blueprint('BP_Lampe');
    const d = addDispatcher(gen.cls, 'OnAlimente');
    const gId = pb.place(gen, 0, 0);
    const lId = pb.place(lamp, 300, 0);
    const call = gen.node('dispatcher.call', { owner: gen.cls.id, dispatcher: d.id });
    gen.link(gen.node('event.beginPlay'), 'then', call, 'exec');
    const v = refVar(pb, lamp, lId, 'Generateur', gen, gId);
    const bind = lamp.node('dispatcher.bind', { owner: gen.cls.id, dispatcher: d.id });
    const ce = lamp.node('event.custom', { name: 'Allumer', signature: d.id, signatureOwner: gen.cls.id });
    const pr = lamp.node('debug.printString');
    lamp.link(lamp.node('event.beginPlay'), 'then', bind, 'exec').link(lamp.node('var.get', { variable: v }), 'value', bind, 'target');
    lamp.link(ce, 'delegate', bind, 'event').link(ce, 'then', pr, 'exec');
    const s = run(pb, (sim) => sim.step());
    expect(why(s, gen, call).text).toContain('personne n’écoutait');
    // Both in BeginPlay at 0 s: the generator, placed first, called before the lamp bound.
    expect(why(s, lamp, pr).text).toContain('avant le Bind');
  });

  it('an interface message sent to an actor that does not implement it', () => {
    const pb = new ProjectBuilder('t');
    const iface = addInterface(pb.project, 'BPI_Interactif');
    if (!iface.ok) throw new Error();
    addInterfaceFunction(pb.project, iface.value.id, 'Interagir');
    const fn = iface.value.functions[0].id;
    const caller = pb.blueprint('BP_Joueur');
    const door = pb.blueprint('BP_Porte');
    const cId = pb.place(caller, 0, 0);
    const dId = pb.place(door, 300, 0);
    const ie = door.node('event.interface', { interface: iface.value.id, fn });
    const pr = door.node('debug.printString');
    door.link(ie, 'then', pr, 'exec');
    const vd = refVar(pb, caller, cId, 'Porte', door, dId);
    const m = caller.node('iface.message', { interface: iface.value.id, fn });
    caller.link(caller.node('event.beginPlay'), 'then', m, 'exec').link(caller.node('var.get', { variable: vd }), 'value', m, 'target');
    let t = why(run(pb), door, pr).text;
    expect(t).toContain('n’implémente pas l’interface');
    implementInterface(door.cls, iface.value.id);
    t = why(run(pb), door, pr).text;
    expect(t).toContain('s’est exécuté une fois');
  });

  it('a Set on another Blueprint that nobody read afterwards', () => {
    const pb = new ProjectBuilder('t');
    const a = pb.blueprint('BP_A');
    const b = pb.blueprint('BP_B');
    const valeur = b.variable('Valeur', T.int, 0);
    const aId = pb.place(a, 0, 0);
    const bId = pb.place(b, 400, 0);
    const cible = refVar(pb, a, aId, 'Cible', b, bId);
    const set = a.node('var.setExternal', { owner: b.cls.id, variable: valeur }, { value: 5 });
    a.link(a.node('event.beginPlay'), 'then', set, 'exec').link(a.node('var.get', { variable: cible }), 'value', set, 'target');
    const pr = b.node('debug.printString');
    b.link(b.node('event.beginPlay'), 'then', pr, 'exec').link(b.node('var.get', { variable: valeur }), 'value', pr, 'text');
    const late = why(run(pb, (s) => s.step(), 'reversed'), a, set);
    expect(late.text).toContain('aucun Blueprint ne l’a relue ensuite');
    expect(why(run(pb, (s) => s.step(), 'level'), a, set).text).toContain('a été relue après ce Set');
  });

  it('a pure node nobody reads', () => {
    const pb = new ProjectBuilder('t');
    const a = pb.blueprint('BP_A');
    pb.place(a, 0, 0);
    const add = a.node('math.addInt');
    expect(why(run(pb), a, add).text).toContain('Aucun nœud exécuté ne lit sa sortie');
  });

  it('a Cast that always failed', () => {
    const pb = new ProjectBuilder('t');
    const a = pb.blueprint('BP_A');
    const b = pb.blueprint('BP_B');
    pb.place(a, 0, 0);
    const cast = a.node('cast.to', { class: b.cls.id });
    const pr = a.node('debug.printString');
    a.link(a.node('event.beginPlay'), 'then', cast, 'exec').link(a.node('actor.getPlayerPawn'), 'result', cast, 'object').link(cast, 'then', pr, 'exec');
    expect(why(run(pb), a, pr).text).toContain('sort par Cast Failed sans rien dire');
  });
});
