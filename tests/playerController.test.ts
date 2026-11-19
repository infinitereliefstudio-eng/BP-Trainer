/**
 * Player Controller and the real Enhanced Input chain (V7.7): the controller
 * the game makes, Get Player Controller / Get Controller, Cast To
 * PlayerController, the subsystem and the Target of Add Mapping Context, the
 * format 10 migration, and the traps of the new lesson.
 */
import { describe, expect, it } from 'vitest';
import { compileClass } from '../src/core/compiler/validate';
import { edit, ProjectBuilder } from '../src/core/lessons/builder';
import { lessonInputController } from '../src/core/lessons/library/enhancedInput';
import { runLesson } from '../src/core/lessons/runner';
import { createProject, type Project } from '../src/core/model/project';
import { contextFor } from '../src/core/nodes/registry';
import { compatiblePin, paletteEntries } from '../src/core/nodes/palette';
import { placeActor } from '../src/core/operations/levelOps';
import { addInputAction, addMapping, addMappingContext } from '../src/core/operations/inputOps';
import { addClass, removeClass, setParentClass, setPlayerClass, setPlayerControllerClass } from '../src/core/operations/projectOps';
import { Simulation } from '../src/core/runtime/simulation';
import { parseProject, serializeProject } from '../src/core/serialization/serialize';
import { T } from '../src/core/types/pins';

/** A player pawn and IA_Test / IMC_Test (E → IA_Test). */
function base() {
  const pb = new ProjectBuilder('pc');
  const pawn = pb.blueprint('BP_Joueur', 'Pawn');
  setPlayerClass(pb.project, pawn.cls.id);
  const a = addInputAction(pb.project, 'IA_Test');
  const c = addMappingContext(pb.project, 'IMC_Test');
  if (!a.ok || !c.ok) throw new Error('assets');
  addMapping(pb.project, c.value.id, a.value.id, 'E');
  return { pb, p: pb.project, pawn, action: a.value.id, context: c.value.id };
}

const prints = (sim: Simulation) => sim.log.filter((l) => l.message !== undefined).map((l) => l.message);

/** Press E once and step, after BeginPlay. */
function pressE(p: Project): Simulation {
  const sim = new Simulation(p);
  sim.start();
  sim.step();
  sim.pressKey('E');
  sim.step();
  return sim;
}

describe('the Target of Add Mapping Context', () => {
  it('must be connected: UE’s « Target must have a connection »', () => {
    const { p, context } = base();
    const b = edit(p, 'BP_Joueur');
    b.link(b.node('event.beginPlay'), 'then', b.node('input.addMappingContext', { context }), 'exec');
    const msgs = compileClass(b.cls, p).messages;
    expect(msgs.some((m) => m.code === 'targetRequired' && m.text.includes('EnhancedInputLocalPlayerSubsystem'))).toBe(true);
  });

  it('takes the subsystem of Get Controller → Cast To PlayerController, as the UE5 template', () => {
    const { p, context, action } = base();
    const b = edit(p, 'BP_Joueur');
    const begin = b.node('event.beginPlay');
    const get = b.node('pawn.getController');
    const cast = b.node('cast.to', { class: 'PlayerController' });
    const sub = b.node('input.subsystem');
    const add = b.node('input.addMappingContext', { context });
    const ev = b.node('input.action', { action });
    const say = b.node('debug.printString', {}, { text: 'action' });
    b.link(begin, 'then', cast, 'exec').link(get, 'result', cast, 'object').link(cast, 'as', sub, 'controller');
    b.link(cast, 'then', add, 'exec').link(sub, 'result', add, 'target').link(ev, 'started', say, 'exec');
    expect(compileClass(b.cls, p).messages.filter((m) => m.severity === 'error')).toEqual([]);
    const cx = contextFor(b.cls, p);
    expect(b.graph.nodes[cast] && getTitle(cast, b, cx)).toBe('Cast To PlayerController');
    const sim = pressE(p);
    expect(prints(sim)).toContain('action');
    expect(sim.runtimeErrors).toBe(0);
  });

  it('on None (a pawn nobody possesses): Accessed None, and the context is not added', () => {
    const { pb, p, context, action } = base();
    const other = pb.blueprint('BP_Garde', 'Pawn');
    pb.place(other, 200, 0);
    const begin = other.node('event.beginPlay');
    const get = other.node('pawn.getController');
    const cast = other.node('cast.to', { class: 'PlayerController' });
    const sub = other.node('input.subsystem');
    const add = other.node('input.addMappingContext', { context });
    const failed = other.node('debug.printString', {}, { text: 'pas de contrôleur' });
    other.link(begin, 'then', cast, 'exec').link(get, 'result', cast, 'object').link(cast, 'failed', failed, 'exec');
    other.link(failed, 'then', add, 'exec').link(sub, 'result', add, 'target');
    const listen = edit(p, 'BP_Joueur');
    listen.link(listen.node('input.action', { action }), 'started', listen.node('debug.printString', {}, { text: 'action' }), 'exec');
    const sim = pressE(p);
    expect(prints(sim)).toContain('pas de contrôleur');
    expect(prints(sim)).not.toContain('action');
    expect(sim.runtimeErrors).toBe(1);
  });
});

/** Title of a node, as the editor shows it. */
function getTitle(id: string, b: ReturnType<typeof edit>, cx: ReturnType<typeof contextFor>): string {
  const entry = paletteEntries(cx, b.graph).find((e) => e.def === b.graph.nodes[id].def && e.config.class === b.graph.nodes[id].config.class);
  return entry?.title ?? '';
}

describe('the Player Controller', () => {
  /** BP_PlayerController, made the Player Controller Class, prints at BeginPlay and on E. */
  function withController(set = true) {
    const all = base();
    const r = addClass(all.p, 'BP_PlayerController', 'PlayerController');
    if (!r.ok) throw new Error(r.reason);
    if (set) expect(setPlayerControllerClass(all.p, r.value.id).ok).toBe(true);
    const b = edit(all.p, 'BP_PlayerController');
    const begin = b.node('event.beginPlay');
    const self = b.node('actor.self');
    const sub = b.node('input.subsystem');
    const add = b.node('input.addMappingContext', { context: all.context });
    const hello = b.node('debug.printString', {}, { text: 'contrôleur prêt' });
    b.link(begin, 'then', add, 'exec').link(self, 'self', sub, 'controller').link(sub, 'result', add, 'target').link(add, 'then', hello, 'exec');
    b.link(b.node('input.action', { action: all.action }), 'started', b.node('debug.printString', {}, { text: 'contrôleur' }), 'exec');
    return { ...all, pc: r.value };
  }

  it('runs only when it is the Player Controller Class', () => {
    expect(prints(pressE(withController(true).p))).toEqual(['contrôleur prêt', 'contrôleur']);
    expect(prints(pressE(withController(false).p))).toEqual([]);
  });

  it('sits on the input stack between the actors and the pawn', () => {
    const { pb, p, action } = withController();
    const pawn = edit(p, 'BP_Joueur');
    pawn.link(pawn.node('input.action', { action }), 'started', pawn.node('debug.printString', {}, { text: 'pion' }), 'exec');
    const lamp = pb.blueprint('BP_Lampe');
    lamp.cls.autoReceiveInput = true;
    pb.place(lamp, 100, 0);
    lamp.link(lamp.node('input.action', { action }), 'started', lamp.node('debug.printString', {}, { text: 'lampe' }), 'exec');
    const sim = pressE(p);
    // From the top of the stack down, and every actor that binds the action hears it (V7.24).
    expect(prints(sim)).toEqual(['contrôleur prêt', 'lampe', 'contrôleur', 'pion']);
    expect(sim.inputStack().map((a) => a.id)).toEqual([sim.inputStack()[0].id, 'controller', 'player']);
  });

  it('is the native PlayerController when no class is set: Cast To PlayerController still succeeds', () => {
    const { p } = base();
    const b = edit(p, 'BP_Joueur');
    const cast = b.node('cast.to', { class: 'PlayerController' });
    b.link(b.node('event.beginPlay'), 'then', cast, 'exec').link(b.node('player.getController'), 'result', cast, 'object');
    b.link(cast, 'then', b.node('debug.printString', {}, { text: 'ok' }), 'exec').link(cast, 'failed', b.node('debug.printString', {}, { text: 'raté' }), 'exec');
    expect(prints(pressE(p))).toEqual(['ok']);
  });

  it('is never placed, spawned or destroyed', () => {
    const { p, pc } = withController();
    expect(placeActor(p, pc.id, 0, 0).ok).toBe(false);
    const actor = addClass(p, 'BP_Objet');
    if (!actor.ok) throw new Error(actor.reason);
    expect(placeActor(p, actor.value.id, 0, 0).ok).toBe(true);
    // Becoming a Player Controller takes it out of the level.
    expect(setParentClass(p, actor.value.id, 'PlayerController').ok).toBe(true);
    expect(p.level.actors).toEqual([]);
    const b = edit(p, 'BP_Joueur');
    const destroy = b.node('actor.destroy');
    b.link(b.node('event.beginPlay'), 'then', destroy, 'exec').link(b.node('player.getController'), 'result', destroy, 'target');
    const sim = pressE(p);
    expect(sim.runtimeErrors).toBe(1);
    expect(prints(sim)).toContain('contrôleur');
  });

  it('Player Controller Class only takes a Player Controller, and is cleared with its Blueprint', () => {
    const { p, pawn, pc } = withController();
    expect(setPlayerControllerClass(p, pawn.cls.id).ok).toBe(false);
    expect(setParentClass(p, pc.id, 'Actor').ok).toBe(true);
    expect(p.playerControllerClassId).toBeUndefined();
    setParentClass(p, pc.id, 'PlayerController');
    setPlayerControllerClass(p, pc.id);
    expect(removeClass(p, pc.id).ok).toBe(true);
    expect(p.playerControllerClassId).toBeUndefined();
  });

  it('Get Controller gives None for a pawn nobody possesses', () => {
    const { pb, p } = base();
    const guard = pb.blueprint('BP_Garde', 'Pawn');
    pb.place(guard, 100, 0);
    const check = guard.node('flow.isValid');
    guard.link(guard.node('event.beginPlay'), 'then', check, 'exec').link(guard.node('pawn.getController'), 'result', check, 'object');
    guard.link(check, 'notValid', guard.node('debug.printString', {}, { text: 'personne' }), 'exec');
    expect(prints(pressE(p))).toEqual(['personne']);
  });

  it('Get Controller needs a Target outside a Pawn Blueprint', () => {
    const { pb, p } = base();
    const actor = pb.blueprint('BP_Objet');
    const get = actor.node('pawn.getController');
    const print = actor.node('debug.printString');
    actor.link(actor.node('event.beginPlay'), 'then', print, 'exec');
    const isValid = actor.node('util.isValid');
    actor.link(get, 'result', isValid, 'object');
    expect(compileClass(actor.cls, p).messages.some((m) => m.code === 'targetRequired')).toBe(true);
  });
});

describe('palette', () => {
  it('offers the controller nodes, Cast To PlayerController, and Add Mapping Context from the subsystem pin', () => {
    const { p, pawn } = base();
    const cx = contextFor(pawn.cls, p);
    const entries = paletteEntries(cx, pawn.graph);
    const titles = entries.map((e) => e.title);
    for (const t of ['Get Player Controller', 'Get Controller', 'Cast To PlayerController', 'Enhanced Input Local Player Subsystem', 'Add Mapping Context (IMC_Test)']) {
      expect(titles).toContain(t);
    }
    const add = entries.find((e) => e.title === 'Add Mapping Context (IMC_Test)')!;
    expect(compatiblePin(add, cx, { dir: 'out', type: T.object('EnhancedInputLocalPlayerSubsystem') })?.id).toBe('target');
    const sub = entries.find((e) => e.title === 'Enhanced Input Local Player Subsystem')!;
    expect(compatiblePin(sub, cx, { dir: 'out', type: T.object('Controller') })).toBeUndefined();
    expect(compatiblePin(sub, cx, { dir: 'out', type: T.object('PlayerController') })?.id).toBe('controller');
  });
});

describe('format 10', () => {
  it('a format 9 project gets Get Player Controller → Subsystem on each Add / Remove Mapping Context', () => {
    const { p, context, action } = base();
    const b = edit(p, 'BP_Joueur');
    b.link(b.node('event.beginPlay'), 'then', b.node('input.addMappingContext', { context }), 'exec');
    b.link(b.node('input.action', { action }), 'started', b.node('debug.printString', {}, { text: 'action' }), 'exec');
    const file = JSON.parse(serializeProject(p));
    file.format = 9;
    delete file.project.playerControllerClassId;
    const loaded = parseProject(JSON.stringify(file));
    const cls = loaded.classes.find((c) => c.name === 'BP_Joueur')!;
    const defs = Object.values(cls.graphs[0].nodes).map((n) => n.def);
    expect(defs.filter((d) => d === 'player.getController' || d === 'input.subsystem')).toHaveLength(2);
    expect(compileClass(cls, loaded).messages.filter((m) => m.severity === 'error')).toEqual([]);
    expect(prints(pressE(loaded))).toEqual(['action']);
  });

  it('an unknown Player Controller Class is dropped on load', () => {
    const p = createProject();
    p.classes.push(...base().p.classes);
    p.playerControllerClassId = 'nope';
    expect(parseProject(serializeProject(p)).playerControllerClassId).toBeUndefined();
  });
});

describe('lesson « Les contrôles au Player Controller »', () => {
  it('a Player Controller left out of Player Controller Class is pointed out', () => {
    const p = lessonInputController.setup();
    lessonInputController.solve(p);
    delete p.playerControllerClassId;
    const run = runLesson(lessonInputController, p);
    const fail = (id: string) => run.results.find((r) => r.check.id === id);
    expect(fail('pc-class')?.ok).toBe(false);
    expect(String(fail('on')?.reason)).toContain('Player Controller Class');
  });

  it('the context still added by the pawn is pointed out', () => {
    const done = lessonInputController.setup();
    const pawn = done.classes.find((c) => c.name === 'BP_Joueur')!;
    const keep = structuredClone(pawn.graphs);
    lessonInputController.solve(done);
    pawn.graphs = keep;
    expect(runLesson(lessonInputController, done).results.find((r) => r.check.id === 'pawn-clean')?.ok).toBe(false);
  });
});

describe('Get Player Controller (V7.8)', () => {
  it('Player Index 0 is the player’s controller; any other index gives None, as in UE with one player', () => {
    const { p } = base();
    const b = edit(p, 'BP_Joueur');
    const begin = b.node('event.beginPlay');
    const first = b.node('flow.isValid');
    const second = b.node('flow.isValid');
    const pc0 = b.node('player.getController', {}, { index: 0 });
    const pc1 = b.node('player.getController', {}, { index: 1 });
    const ok0 = b.node('debug.printString', {}, { text: 'index 0 valide' });
    const none1 = b.node('debug.printString', {}, { text: 'index 1 None' });
    b.link(begin, 'then', first, 'exec').link(pc0, 'result', first, 'object').link(first, 'valid', ok0, 'exec');
    b.link(ok0, 'then', second, 'exec').link(pc1, 'result', second, 'object').link(second, 'notValid', none1, 'exec');
    const sim = new Simulation(p);
    sim.start();
    sim.step();
    expect(prints(sim)).toEqual(['index 0 valide', 'index 1 None']);
  });

  it('Get Player Pawn too: index 1 is None', () => {
    const { p } = base();
    const b = edit(p, 'BP_Joueur');
    const valid = b.node('flow.isValid');
    const pawn1 = b.node('actor.getPlayerPawn', {}, { index: 1 });
    const none = b.node('debug.printString', {}, { text: 'pion 1 None' });
    b.link(b.node('event.beginPlay'), 'then', valid, 'exec').link(pawn1, 'result', valid, 'object').link(valid, 'notValid', none, 'exec');
    const sim = new Simulation(p);
    sim.start();
    sim.step();
    expect(prints(sim)).toEqual(['pion 1 None']);
  });
});
