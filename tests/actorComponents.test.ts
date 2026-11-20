/** V7.19: Actor Components made in Blueprint, as UE runs them. */
import { describe, expect, it } from 'vitest';
import { compileClass } from '../src/core/compiler/validate';
import { ProjectBuilder, type ClassBuilder } from '../src/core/lessons/builder';
import { fnDef } from '../src/core/lessons/library/kit';
import { PROJECT_FORMAT } from '../src/core/model/project';
import { paletteEntries } from '../src/core/nodes/palette';
import { contextFor } from '../src/core/nodes/registry';
import { addActorComponent, removeComponent, removeDispatcher } from '../src/core/operations/classOps';
import { placeActor, setComponentOverride } from '../src/core/operations/levelOps';
import { addClass, removeClass, setParentClass } from '../src/core/operations/projectOps';
import { addInterface, addInterfaceFunction } from '../src/core/operations/projectOps';
import { Simulation } from '../src/core/runtime/simulation';
import { parseProject, serializeProject } from '../src/core/serialization/serialize';
import { T } from '../src/core/types/pins';

const prints = (s: Simulation) => s.log.filter((l) => l.message !== undefined).map((l) => l.message);
const errors = (s: Simulation) => s.log.filter((l) => l.level === 'error').map((l) => l.text);
const compileErrors = (pb: ProjectBuilder, b: ClassBuilder) =>
  compileClass(b.cls, pb.project)
    .messages.filter((m) => m.severity === 'error')
    .map((m) => m.text);
const say = (b: ClassBuilder, text: string) => b.node('debug.printString', {}, { text });

/**
 * BP_Sante: Vie (Instance Editable, 100), InfligerDegats(Montant) lowers it
 * and calls OnMort at 0. BeginPlay prints Vie.
 */
function health(pb: ProjectBuilder) {
  const sante = pb.blueprint('BP_Sante', 'ActorComponent');
  const vie = sante.variable('Vie', T.int, 100);
  sante.cls.variables.find((v) => v.id === vie)!.instanceEditable = true;
  const mort = sante.cls.dispatchers[sante.cls.dispatchers.push({ id: 'd_mort', name: 'OnMort', params: [] }) - 1];
  const hit = fnDef(pb.project, sante, 'InfligerDegats', [['Montant', T.int]], []);
  const get = hit.f.node('var.get', { variable: vie });
  const sub = hit.f.node('math.subtractInt');
  const set = hit.f.node('var.set', { variable: vie });
  const le = hit.f.node('math.lessEqualInt');
  const branch = hit.f.node('flow.branch');
  const call = hit.f.node('dispatcher.call', { owner: sante.cls.id, dispatcher: mort.id });
  hit.f
    .link(get, 'value', sub, 'a')
    .link(hit.entry, hit.pin.Montant, sub, 'b')
    .link(sub, 'result', set, 'value')
    .link(hit.entry, 'then', set, 'exec')
    .link(set, 'out', le, 'a')
    .link(le, 'result', branch, 'condition')
    .link(set, 'then', branch, 'exec')
    .link(branch, 'true', call, 'exec');
  const begin = sante.node('event.beginPlay');
  const text = sante.node('conv.intToString');
  const p = sante.node('debug.printString');
  sante.link(sante.node('var.get', { variable: vie }), 'value', text, 'in').link(text, 'result', p, 'text').link(begin, 'then', p, 'exec');
  return { sante, vie, mort, hit };
}

describe('Actor Components', () => {
  it('each actor gets its own copy, with the values set in its Blueprint, then on the placed actor', () => {
    const pb = new ProjectBuilder('t');
    const { sante, vie, hit } = health(pb);
    const caisse = pb.blueprint('BP_Caisse');
    const comp = caisse.logic(sante, 'Sante', { [vie]: 50 });
    // The crate's BeginPlay hits its own health by 20.
    const begin = caisse.node('event.beginPlay');
    const call = caisse.node('call.function', { owner: sante.cls.id, graph: hit.graph.id }, { [hit.pin.Montant]: 20 });
    caisse.link(begin, 'then', call, 'exec').link(caisse.node('var.component', { component: comp }), 'value', call, 'target');
    const a = pb.place(caisse, 0, 0);
    const b = pb.place(caisse, 300, 0);
    setComponentOverride(pb.project, b, comp, vie, 10);
    expect(compileErrors(pb, sante)).toEqual([]);
    expect(compileErrors(pb, caisse)).toEqual([]);
    const s = new Simulation(pb.project);
    s.step();
    expect(prints(s).sort()).toEqual(['10', '50']);
    const objs = s.objects.filter((o) => o.owner);
    expect(objs).toHaveLength(2);
    const of = (actor: string) => objs.find((o) => o.owner === actor)!;
    expect(of(a).vars[vie]).toBe(30);
    expect(of(b).vars[vie]).toBe(-10);
    expect(errors(s)).toEqual([]);
  });

  it('runs the components’ BeginPlay before their actor’s, whatever the actor order', () => {
    for (const order of ['level', 'reversed'] as const) {
      const pb = new ProjectBuilder('t');
      const comp = pb.blueprint('BP_Bavard', 'ActorComponent');
      comp.link(comp.node('event.beginPlay'), 'then', say(comp, 'composant'), 'exec');
      const actor = pb.blueprint('BP_Porteur');
      actor.logic(comp);
      actor.link(actor.node('event.beginPlay'), 'then', say(actor, 'acteur'), 'exec');
      pb.place(actor, 0, 0);
      const s = new Simulation(pb.project, { order });
      s.step();
      expect(prints(s)).toEqual(['composant', 'acteur']);
    }
  });

  it('Self is the component: Get Owner reaches the actor, and an actor node on self is refused by Compile', () => {
    const pb = new ProjectBuilder('t');
    const comp = pb.blueprint('BP_Cacheur', 'ActorComponent');
    const begin = comp.node('event.beginPlay');
    const hide = comp.node('actor.setHidden');
    comp.link(begin, 'then', hide, 'exec');
    expect(compileErrors(pb, comp).join(' ')).toMatch(/Self n’est pas un Actor ici.*Get Owner/);
    const owner = comp.node('component.getOwner');
    comp.link(owner, 'result', hide, 'target');
    expect(compileErrors(pb, comp)).toEqual([]);
    const actor = pb.blueprint('BP_Porteur');
    actor.logic(comp);
    pb.place(actor, 0, 0);
    const s = new Simulation(pb.project);
    s.step();
    expect(s.actors[0].hidden).toBe(true);
  });

  it('refuses what an Actor Component cannot have: overlap, input, Timeline; keeps them out of its palette', () => {
    const pb = new ProjectBuilder('t');
    const comp = pb.blueprint('BP_Logique', 'ActorComponent');
    comp.node('event.actorBeginOverlap');
    expect(compileErrors(pb, comp).join(' ')).toMatch(/pas permis dans un Actor Component/);
    const keys = paletteEntries(contextFor(comp.cls, pb.project), comp.cls.graphs[0]).map((e) => e.def);
    expect(keys).not.toContain('event.actorBeginOverlap');
    expect(keys).not.toContain('event.inputKey');
    expect(keys).not.toContain('timeline.node');
    expect(keys).toContain('event.tick');
    expect(keys).toContain('event.endPlay');
    expect(comp.cls.components).toEqual([]);
  });

  it('Get Component by Class finds a component without knowing the actor; None when it has none', () => {
    const pb = new ProjectBuilder('t');
    const { sante } = health(pb);
    const avec = pb.blueprint('BP_Avec');
    avec.logic(sante, 'Sante');
    const sans = pb.blueprint('BP_Sans');
    for (const b of [avec, sans]) {
      const begin = b.node('event.beginPlay');
      const find = b.node('actor.getComponentByClass', {}, { componentClass: sante.cls.id });
      const valid = b.node('flow.isValid');
      b.link(begin, 'then', valid, 'exec').link(find, 'result', valid, 'object');
      b.link(valid, 'valid', say(b, `${b.cls.name} a une santé`), 'exec');
      b.link(valid, 'notValid', say(b, `${b.cls.name} sans santé`), 'exec');
      pb.place(b, 0, 0);
    }
    const s = new Simulation(pb.project);
    s.step();
    expect(prints(s)).toContain('BP_Avec a une santé');
    expect(prints(s)).toContain('BP_Sans sans santé');
    // The output is typed by the class picked: its functions plug in directly.
    const find = Object.values(avec.cls.graphs[0].nodes).find((n) => n.def === 'actor.getComponentByClass')!;
    expect(contextFor(avec.cls, pb.project).hierarchy.isA('BP_Sante', 'ActorComponent')).toBe(true);
    expect(find.defaults.componentClass).toBe(sante.cls.id);
  });

  it('the actor reacts to its component’s dispatcher through « On … (Component) », without Bind', () => {
    const pb = new ProjectBuilder('t');
    const { sante, vie, mort, hit } = health(pb);
    const caisse = pb.blueprint('BP_Caisse');
    const comp = caisse.logic(sante, 'Sante', { [vie]: 5 });
    const begin = caisse.node('event.beginPlay');
    const call = caisse.node('call.function', { owner: sante.cls.id, graph: hit.graph.id }, { [hit.pin.Montant]: 20 });
    caisse.link(begin, 'then', call, 'exec').link(caisse.node('var.component', { component: comp }), 'value', call, 'target');
    const dead = caisse.node('event.componentDispatcher', { component: comp, dispatcher: mort.id });
    caisse.link(dead, 'then', say(caisse, 'caisse détruite'), 'exec');
    expect(compileErrors(pb, caisse)).toEqual([]);
    expect(paletteEntries(contextFor(caisse.cls, pb.project), caisse.cls.graphs[0]).some((e) => e.title === 'On OnMort (Sante)')).toBe(true);
    pb.place(caisse, 0, 0);
    const s = new Simulation(pb.project);
    s.step();
    expect(prints(s)).toEqual(['5', 'caisse détruite']);
    // Deleting the dispatcher deletes the events that answered to it, as Call and Bind.
    removeDispatcher(pb.project, sante.cls, mort.id);
    expect(Object.values(caisse.cls.graphs[0].nodes).some((n) => n.def === 'event.componentDispatcher')).toBe(false);
  });

  it('Destroy Actor: End Play of the actor, then of its components, then Event Destroyed; the components go with it', () => {
    const pb = new ProjectBuilder('t');
    const comp = pb.blueprint('BP_Temoin', 'ActorComponent');
    comp.link(comp.node('event.endPlay'), 'then', say(comp, 'fin composant'), 'exec');
    const actor = pb.blueprint('BP_Fragile');
    actor.logic(comp);
    actor.link(actor.node('event.endPlay'), 'then', say(actor, 'fin acteur'), 'exec');
    actor.link(actor.node('event.destroyed'), 'then', say(actor, 'détruit'), 'exec');
    const begin = actor.node('event.beginPlay');
    const destroy = actor.node('actor.destroy');
    actor.link(begin, 'then', destroy, 'exec').link(destroy, 'then', say(actor, 'suite'), 'exec');
    pb.place(actor, 0, 0);
    const s = new Simulation(pb.project);
    s.step();
    expect(prints(s)).toEqual(['fin acteur', 'fin composant', 'détruit', 'suite']);
    expect(s.actors).toHaveLength(0);
    expect(s.objects.filter((o) => o.owner)).toHaveLength(0);
  });

  it('a component runs its own Tick and timers', () => {
    const pb = new ProjectBuilder('t');
    const comp = pb.blueprint('BP_Compteur', 'ActorComponent');
    const n = comp.variable('N', T.int, 0);
    const tick = comp.node('event.tick');
    const inc = comp.node('var.incrementInt');
    comp.link(tick, 'then', inc, 'exec').link(comp.node('var.get', { variable: n }), 'value', inc, 'value');
    const actor = pb.blueprint('BP_Porteur');
    actor.logic(comp);
    pb.place(actor, 0, 0);
    const s = new Simulation(pb.project);
    for (let i = 0; i < 5; i++) s.step();
    expect(s.objects.find((o) => o.owner)!.vars[n]).toBe(5);
  });

  it('a component binds to its owner’s On Actor Begin Overlap', () => {
    const pb = new ProjectBuilder('t');
    const comp = pb.blueprint('BP_Detecteur', 'ActorComponent');
    const begin = comp.node('event.beginPlay');
    const bind = comp.node('dispatcher.bindNative', { dispatcher: 'OnActorBeginOverlap' });
    const ev = comp.node('event.custom', { name: 'Entree', signature: 'OnActorBeginOverlap', signatureOwner: 'Actor' });
    const name = comp.node('conv.objectToString');
    const p = comp.node('debug.printString');
    comp
      .link(begin, 'then', bind, 'exec')
      .link(comp.node('component.getOwner'), 'result', bind, 'target')
      .link(ev, 'delegate', bind, 'event')
      .link(ev, 'then', p, 'exec')
      .link(ev, 'other', name, 'in')
      .link(name, 'result', p, 'text');
    expect(compileErrors(pb, comp)).toEqual([]);
    const zone = pb.blueprint('BP_Zone');
    zone.component('BoxCollision', 'Zone', { sizeX: 200, sizeY: 200 });
    zone.logic(comp);
    pb.place(zone, 0, 0);
    const s = new Simulation(pb.project);
    s.step();
    expect(prints(s)).toEqual(['Joueur']);
  });

  it('a spawned actor gets its components; their BeginPlay runs before its own', () => {
    const pb = new ProjectBuilder('t');
    const comp = pb.blueprint('BP_Bavard', 'ActorComponent');
    comp.link(comp.node('event.beginPlay'), 'then', say(comp, 'composant'), 'exec');
    const spawned = pb.blueprint('BP_Nouveau');
    spawned.logic(comp);
    spawned.link(spawned.node('event.beginPlay'), 'then', say(spawned, 'nouveau'), 'exec');
    const maker = pb.blueprint('BP_Usine');
    const spawn = maker.node('actor.spawn', {}, { class: spawned.cls.id });
    maker.link(maker.node('event.beginPlay'), 'then', spawn, 'exec').link(spawn, 'then', say(maker, 'après'), 'exec');
    pb.place(maker, 0, 0);
    const s = new Simulation(pb.project);
    s.step();
    expect(prints(s)).toEqual(['composant', 'nouveau', 'après']);
  });

  it('an interface message sent to the actor does not reach its components', () => {
    const pb = new ProjectBuilder('t');
    const iface = addInterface(pb.project, 'BPI_Test');
    if (!iface.ok) throw new Error();
    addInterfaceFunction(pb.project, iface.value.id, 'Ping');
    const fn = { value: iface.value.functions[0] };
    const comp = pb.blueprint('BP_Ecoute', 'ActorComponent');
    comp.cls.interfaces.push(iface.value.id);
    comp.link(comp.node('event.interface', { interface: iface.value.id, fn: fn.value.id }), 'then', say(comp, 'composant'), 'exec');
    const actor = pb.blueprint('BP_Porteur');
    const compId = actor.logic(comp);
    const begin = actor.node('event.beginPlay');
    const toActor = actor.node('iface.message', { interface: iface.value.id, fn: fn.value.id });
    const toComp = actor.node('iface.message', { interface: iface.value.id, fn: fn.value.id });
    actor.link(begin, 'then', toActor, 'exec').link(toActor, 'then', toComp, 'exec');
    actor.link(actor.node('var.component', { component: compId }), 'value', toComp, 'target');
    pb.place(actor, 0, 0);
    const s = new Simulation(pb.project);
    s.step();
    expect(prints(s)).toEqual(['composant']);
  });

  it('keeps the families apart and protects a component in use', () => {
    const pb = new ProjectBuilder('t');
    const comp = pb.blueprint('BP_Comp', 'ActorComponent');
    const actor = pb.blueprint('BP_Acteur');
    expect(setParentClass(pb.project, actor.cls.id, comp.cls.id).ok).toBe(false);
    expect(setParentClass(pb.project, comp.cls.id, 'Actor').ok).toBe(false);
    const child = addClass(pb.project, 'BP_CompEnfant', 'ActorComponent');
    if (!child.ok) throw new Error();
    expect(setParentClass(pb.project, child.value.id, comp.cls.id).ok).toBe(true);
    expect(placeActor(pb.project, comp.cls.id, 0, 0).ok).toBe(false);
    expect(addActorComponent(pb.project, comp.cls, child.value.id).ok).toBe(false);
    const id = actor.logic(comp);
    expect(removeClass(pb.project, comp.cls.id).ok).toBe(false);
    expect(removeComponent(actor.cls, id).ok).toBe(true);
    expect(removeClass(pb.project, comp.cls.id).ok).toBe(false); // its child still inherits from it
  });

  it('saves and loads a project with components (format 11)', () => {
    const pb = new ProjectBuilder('t');
    const { sante, vie } = health(pb);
    const caisse = pb.blueprint('BP_Caisse');
    const comp = caisse.logic(sante, 'Sante', { [vie]: 50 });
    const a = pb.place(caisse, 0, 0);
    setComponentOverride(pb.project, a, comp, vie, 7);
    const back = parseProject(serializeProject(pb.project));
    expect(PROJECT_FORMAT).toBeGreaterThanOrEqual(11);
    expect(back.classes.find((c) => c.name === 'BP_Caisse')!.components.find((c) => c.id === comp)?.values?.[vie]).toBe(50);
    expect(back.levels[0].actors[0].componentOverrides?.[comp]?.[vie]).toBe(7);
    const s = new Simulation(back);
    s.step();
    expect(prints(s)).toEqual(['7']);
  });

  it('SpawnActor of a component class is refused at run time', () => {
    const pb = new ProjectBuilder('t');
    const comp = pb.blueprint('BP_Comp', 'ActorComponent');
    const maker = pb.blueprint('BP_Usine');
    const spawn = maker.node('actor.spawn', {}, { class: comp.cls.id });
    maker.link(maker.node('event.beginPlay'), 'then', spawn, 'exec');
    pb.place(maker, 0, 0);
    const s = new Simulation(pb.project);
    s.step();
    expect(errors(s).join(' ')).toMatch(/Actor Component, pas un acteur/);
  });
});
