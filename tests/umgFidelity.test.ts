/**
 * V7.38, from the review of the UMG work (docs/REVUE_UMG.md, lot 1): a
 * widget that is not painted does not tick and its Bindings are not read;
 * sibling User Widgets are constructed in tree order; a placed User Widget
 * removed from its parent can go elsewhere; a chain of calls that never
 * returns stops at UE's recursion depth instead of freezing the app; Create
 * Widget without Owning Player gets advice.
 */
import { describe, expect, it } from 'vitest';
import { ProjectBuilder, type ClassBuilder } from '../src/core/lessons/builder';
import { VIS_COLLAPSED, VIS_HIDDEN, VIS_VISIBLE, type WidgetNode } from '../src/core/model/widgets';
import { addFunction, addFunctionParam, setFunctionPure } from '../src/core/operations/functionOps';
import { addWidget, setWidgetIsVariable } from '../src/core/operations/widgetOps';
import { adviceFor } from '../src/core/quality/advice';
import { explainRuntime } from '../src/core/explain/runtime';
import { MAX_CALL_DEPTH } from '../src/core/runtime/interpreter';
import { Simulation } from '../src/core/runtime/simulation';
import { T } from '../src/core/types/pins';

function setup() {
  const pb = new ProjectBuilder('umg-fidelity');
  const w = pb.blueprint('WBP_HUD', 'UserWidget');
  const game = pb.blueprint('BP_Jeu');
  game.component('StaticMesh', 'Socle');
  pb.place(game, 0, 0);
  const add = (kind: WidgetNode['kind'], target?: string, b: ClassBuilder = w, classId?: string) => {
    const r = addWidget(pb.project, b.cls, kind, target, classId);
    if (!r.ok) throw new Error(r.reason);
    return r.value;
  };
  return { pb, p: pb.project, w, game, add };
}

/** BP_Jeu's BeginPlay: Create WBP_HUD (owned by the player), keep it, Add to Viewport. */
function show(t: ReturnType<typeof setup>, owner = true) {
  const { game, w } = t;
  const hud = game.variable('HUD', T.object('WBP_HUD'));
  const create = game.node('widget.create', {}, { class: w.cls.id });
  game.link(game.node('event.beginPlay'), 'then', create, 'exec');
  if (owner) game.link(game.node('player.getController'), 'result', create, 'owner');
  const set = game.node('var.set', { variable: hud });
  game.link(create, 'then', set, 'exec').link(create, 'result', set, 'value');
  const add = game.node('widget.addToViewport');
  game.link(set, 'then', add, 'exec').link(game.node('var.get', { variable: hud }), 'value', add, 'target');
  return create;
}

const prints = (sim: Simulation) => sim.log.filter((l) => l.message !== undefined).map((l) => l.message);

/** A widget counting its Event Ticks in a variable. */
function ticker(t: ReturnType<typeof setup>, b: ClassBuilder = t.w): string {
  const n = b.variable('Ticks', T.int, 0);
  const inc = b.node('var.incrementInt');
  b.link(b.node('event.widgetTick'), 'then', inc, 'exec').link(b.node('var.get', { variable: n }), 'value', inc, 'value');
  return n;
}

describe('a widget that is not painted (V7.38)', () => {
  it('Collapsed or Hidden: its Event Tick stops, and comes back when it is Visible again', () => {
    const t = setup();
    t.add('CanvasPanel');
    const n = ticker(t);
    show(t);
    const sim = new Simulation(t.p);
    sim.start();
    for (let i = 0; i < 3; i++) sim.step();
    const obj = sim.umg.viewport()[0];
    for (const vis of [VIS_COLLAPSED, VIS_HIDDEN]) {
      sim.umg.setProp({ obj, self: true }, { visibility: vis });
      const before = obj.vars[n] as number;
      for (let i = 0; i < 5; i++) sim.step();
      expect(obj.vars[n]).toBe(before);
    }
    sim.umg.setProp({ obj, self: true }, { visibility: VIS_VISIBLE });
    const before = obj.vars[n] as number;
    for (let i = 0; i < 5; i++) sim.step();
    expect(obj.vars[n]).toBe(before + 5);
  });

  it('a User Widget placed in a Collapsed panel does not tick; its parent does', () => {
    const t = setup();
    const inner = t.pb.blueprint('WBP_Ligne', 'UserWidget');
    t.add('CanvasPanel', undefined, inner);
    const innerTicks = ticker(t, inner);
    const root = t.add('CanvasPanel');
    const box = t.add('VerticalBox', root.id);
    t.add('UserWidget', box.id, t.w, inner.cls.id);
    box.props.visibility = VIS_COLLAPSED;
    const outerTicks = ticker(t);
    show(t);
    const sim = new Simulation(t.p);
    sim.start();
    for (let i = 0; i < 4; i++) sim.step();
    const hud = sim.umg.viewport()[0];
    const line = sim.umg.widgetObjects().find((o) => o.className === 'WBP_Ligne')!;
    expect(hud.vars[outerTicks]).toBeGreaterThan(0);
    expect(line.vars[innerTicks]).toBe(0);
  });

  it('the Binding of a Collapsed Text is not called; a Visibility Binding still is', () => {
    const t = setup();
    const root = t.add('CanvasPanel');
    const text = t.add('TextBlock', root.id);
    setWidgetIsVariable(t.w.cls, text.id, true);
    const fn = (name: string, type: typeof T.text) => {
      const g = addFunction(t.w.cls, name);
      setFunctionPure(t.p, t.w.cls, g.id, true);
      addFunctionParam(t.p, t.w.cls, g.id, 'outputs', type);
      return g.id;
    };
    text.bindings = { text: fn('GetText_0', T.text), visibility: fn('GetVisibility_0', T.enum('ESlateVisibility')) };
    text.props.visibility = VIS_COLLAPSED;
    show(t);
    const sim = new Simulation(t.p);
    sim.start();
    for (let i = 0; i < 3; i++) sim.step();
    const calls = (prop: string) => Object.entries(sim.umg.bindingCalls).find(([k]) => k.endsWith(`:${text.id}:${prop}`))?.[1] ?? 0;
    // The Visibility function returns Visible (0): the Text comes back, and from then on its Text is read too.
    expect(calls('visibility')).toBe(3);
    expect(calls('text')).toBe(2);
  });
});

describe('the order of a widget tree (V7.38)', () => {
  it('two placed User Widgets are constructed in tree order, before their parent', () => {
    const t = setup();
    const mk = (name: string) => {
      const b = t.pb.blueprint(name, 'UserWidget');
      t.add('CanvasPanel', undefined, b);
      const pr = b.node('debug.printString', {}, { text: `${name} construct` });
      b.link(b.node('event.construct'), 'then', pr, 'exec');
      return b;
    };
    const a = mk('WBP_A');
    const b = mk('WBP_B');
    const root = t.add('VerticalBox');
    t.add('UserWidget', root.id, t.w, a.cls.id);
    t.add('UserWidget', root.id, t.w, b.cls.id);
    const pr = t.w.node('debug.printString', {}, { text: 'hud construct' });
    t.w.link(t.w.node('event.construct'), 'then', pr, 'exec');
    show(t);
    const sim = new Simulation(t.p);
    sim.start();
    sim.step();
    expect(prints(sim)).toEqual(['WBP_A construct', 'WBP_B construct', 'hud construct']);
  });

  it('a placed User Widget removed from its parent can be added to the viewport', () => {
    const t = setup();
    const inner = t.pb.blueprint('WBP_Ligne', 'UserWidget');
    t.add('CanvasPanel', undefined, inner);
    const root = t.add('CanvasPanel');
    const u = t.add('UserWidget', root.id, t.w, inner.cls.id);
    show(t);
    const sim = new Simulation(t.p);
    sim.start();
    sim.step();
    const hud = sim.umg.viewport()[0];
    const line = sim.umg.widgetObjects().find((o) => o.className === 'WBP_Ligne')!;
    sim.umg.removeFromParent({ obj: hud, id: u.id });
    expect(line.widget!.onScreen).toBe(false);
    sim.umg.addToViewport(line, 1);
    expect(sim.log.filter((l) => l.level === 'warning')).toEqual([]);
    expect(sim.umg.viewport().map((o) => o.className)).toEqual(['WBP_HUD', 'WBP_Ligne']);
    expect(line.widget!.onScreen).toBe(true);
  });
});

describe('a chain of calls that never returns (V7.38)', () => {
  it('a Construct that creates and adds its own class stops at UE’s depth, quickly', () => {
    const t = setup();
    t.add('CanvasPanel');
    const cr = t.w.node('widget.create', {}, { class: t.w.cls.id });
    const add = t.w.node('widget.addToViewport');
    t.w.link(t.w.node('event.construct'), 'then', cr, 'exec').link(cr, 'then', add, 'exec').link(cr, 'result', add, 'target');
    show(t);
    const sim = new Simulation(t.p);
    const t0 = Date.now();
    sim.start();
    sim.step();
    expect(Date.now() - t0).toBeLessThan(1500);
    expect(sim.umg.widgetObjects().length).toBeLessThanOrEqual(MAX_CALL_DEPTH + 2);
    const err = sim.log.find((l) => l.level === 'error')!;
    expect(err.text).toContain(`Infinite script recursion (${MAX_CALL_DEPTH} calls) detected`);
    expect(explainRuntime(`Infinite script recursion (${MAX_CALL_DEPTH} calls) detected - aborting!`)?.why).toContain('250');
  });

  it('a Custom Event that calls itself stops there too; a function calling itself a few times still works', () => {
    const pb = new ProjectBuilder('recursion');
    const b = pb.blueprint('BP_Jeu');
    b.component('StaticMesh', 'Socle');
    pb.place(b, 0, 0);
    const ev = b.node('event.custom', { name: 'Encore' });
    const call = b.node('call.custom', { event: 'Encore' });
    b.link(ev, 'then', call, 'exec');
    const start = b.node('call.custom', { event: 'Encore' });
    b.link(b.node('event.beginPlay'), 'then', start, 'exec');
    const sim = new Simulation(pb.project);
    sim.start();
    sim.step();
    expect(sim.log.some((l) => l.level === 'error' && l.text.includes('Infinite script recursion'))).toBe(true);
  });
});

describe('Create Widget without Owning Player (V7.38)', () => {
  it('works as in UE (the first local player), with advice to wire it anyway', () => {
    const t = setup();
    t.add('CanvasPanel');
    show(t, false);
    expect(adviceFor(t.p, 'intermediaire').map((a) => a.rule)).toContain('widget-no-owner');
    const wired = setup();
    wired.add('CanvasPanel');
    show(wired);
    expect(adviceFor(wired.p, 'intermediaire').map((a) => a.rule)).not.toContain('widget-no-owner');
    expect(adviceFor(t.p, 'debutant').map((a) => a.rule)).not.toContain('widget-no-owner');
  });
});
