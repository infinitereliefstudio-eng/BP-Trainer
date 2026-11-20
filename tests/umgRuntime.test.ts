/**
 * V7.34: widgets on the screen. Create Widget, Add to Viewport and Remove
 * from Parent with UE's life cycle (On Initialized once, Construct at each
 * add, Destruct at each removal), the Set nodes on widgets ticked Is
 * Variable, children added at runtime, Event Tick of a widget during the
 * pause, and Bindings polled every frame.
 */
import { describe, expect, it } from 'vitest';
import { ProjectBuilder, type ClassBuilder } from '../src/core/lessons/builder';
import { VIS_COLLAPSED, type WidgetNode } from '../src/core/model/widgets';
import { compileClass } from '../src/core/compiler/validate';
import { contextFor, resolvePins } from '../src/core/nodes/registry';
import { addFunction, addFunctionParam, removeFunction, setFunctionPure } from '../src/core/operations/functionOps';
import { addWidget, bindingCandidates, createWidgetBinding, setWidgetBinding, setWidgetIsVariable } from '../src/core/operations/widgetOps';
import { parseProject, serializeProject } from '../src/core/serialization/serialize';
import { Simulation } from '../src/core/runtime/simulation';
import { previewOverride } from '../src/core/umg/preview';
import { layoutWidgets } from '../src/core/umg/layout';
import { T } from '../src/core/types/pins';

const prints = (sim: Simulation) => sim.log.filter((l) => l.message !== undefined).map((l) => l.message);

function setup() {
  const pb = new ProjectBuilder('umg-run');
  const w = pb.blueprint('WBP_HUD', 'UserWidget');
  const game = pb.blueprint('BP_Jeu');
  game.component('StaticMesh', 'Socle');
  pb.place(game, 0, 0);
  const add = (kind: WidgetNode['kind'], target?: string, b: ClassBuilder = w) => {
    const r = addWidget(pb.project, b.cls, kind, target);
    if (!r.ok) throw new Error(r.reason);
    return r.value;
  };
  return { pb, p: pb.project, w, game, add };
}

/** A Print String with a fixed text, after `from`'s exec pin. */
function say(b: ClassBuilder, from: string, text: string, pin = 'then'): string {
  const n = b.node('debug.printString', {}, { text });
  b.link(from, pin, n, 'exec');
  return n;
}

/** In BP_Jeu: BeginPlay → Create Widget (owned by the player) → set HUD variable. Returns the nodes. */
function createOnBeginPlay(t: ReturnType<typeof setup>, owner = true) {
  const { game, w } = t;
  const hudVar = game.variable('HUD', T.object('WBP_HUD'));
  const begin = game.node('event.beginPlay');
  const create = game.node('widget.create', {}, { class: w.cls.id });
  game.link(begin, 'then', create, 'exec');
  if (owner) {
    const pc = game.node('player.getController');
    game.link(pc, 'result', create, 'owner');
  }
  const set = game.node('var.set', { variable: hudVar });
  game.link(create, 'then', set, 'exec').link(create, 'result', set, 'value');
  const get = () => game.node('var.get', { variable: hudVar });
  return { begin, create, set, get, hudVar };
}

/** Custom events of BP_Jeu, fired from a test by name. */
function custom(b: ClassBuilder, name: string): string {
  return b.node('event.custom', { name });
}
const fire = (sim: Simulation, name: string) => {
  const a = sim.actors.find((x) => x.label.startsWith('BP_Jeu'))!;
  // biome-ignore lint/suspicious/noExplicitAny: test access to the queue
  (sim as any).fire(a, (n: { def: string; config: { name?: string } }) => n.def === 'event.custom' && n.config.name === name, 'then');
  sim.step();
};

describe('the life cycle of a widget, as in UE', () => {
  it('On Initialized once; Construct at each Add to Viewport; Destruct at each Remove from Parent; the object stays valid', () => {
    const t = setup();
    const { w, game } = t;
    t.add('CanvasPanel');
    say(w, w.node('event.onInitialized'), 'init');
    say(w, w.node('event.preConstruct'), 'pre');
    say(w, w.node('event.construct'), 'construct');
    say(w, w.node('event.destruct'), 'destruct');
    const c = createOnBeginPlay(t);
    const show = custom(game, 'Show');
    const add = game.node('widget.addToViewport');
    game.link(show, 'then', add, 'exec').link(c.get(), 'value', add, 'target');
    const hide = custom(game, 'Hide');
    const rem = game.node('widget.removeFromParent');
    game.link(hide, 'then', rem, 'exec').link(c.get(), 'value', rem, 'target');
    const sim = new Simulation(t.p);
    sim.start();
    sim.step();
    expect(prints(sim)).toEqual(['init']);
    expect(sim.umg.viewport()).toHaveLength(0);
    fire(sim, 'Show');
    expect(prints(sim)).toEqual(['init', 'pre', 'construct']);
    expect(sim.umg.viewport()).toHaveLength(1);
    fire(sim, 'Hide');
    fire(sim, 'Hide');
    expect(prints(sim)).toEqual(['init', 'pre', 'construct', 'destruct']);
    const obj = sim.umg.widgetObjects()[0];
    expect(sim.isValid({ ref: 'actor', id: obj.id })).toBe(true);
    fire(sim, 'Show');
    expect(prints(sim)).toEqual(['init', 'pre', 'construct', 'destruct', 'pre', 'construct']);
    expect(sim.runtimeErrors).toBe(0);
  });

  it('a second Add to Viewport only warns, with UE’s words', () => {
    const t = setup();
    t.add('CanvasPanel');
    say(t.w, t.w.node('event.construct'), 'construct');
    const c = createOnBeginPlay(t);
    const a1 = t.game.node('widget.addToViewport');
    const a2 = t.game.node('widget.addToViewport');
    t.game.link(c.set, 'then', a1, 'exec').link(c.get(), 'value', a1, 'target').link(a1, 'then', a2, 'exec').link(c.get(), 'value', a2, 'target');
    const sim = new Simulation(t.p);
    sim.start();
    sim.step();
    expect(prints(sim)).toEqual(['construct']);
    expect(sim.log.some((l) => l.level === 'warning' && /The widget 'WBP_HUD_C_0' was already added to the screen\./.test(l.text))).toBe(true);
    expect(sim.runtimeErrors).toBe(0);
  });

  it('Expose on Spawn: On Initialized still sees the default, Construct the value given', () => {
    const t = setup();
    t.add('CanvasPanel');
    const title = t.w.variable('Titre', T.string, 'défaut');
    const v = t.w.cls.variables.find((x) => x.id === title)!;
    v.instanceEditable = true;
    v.exposeOnSpawn = true;
    for (const ev of ['event.onInitialized', 'event.construct']) {
      const e = t.w.node(ev);
      const pr = t.w.node('debug.printString');
      t.w.link(e, 'then', pr, 'exec').link(t.w.node('var.get', { variable: title }), 'value', pr, 'text');
    }
    const c = createOnBeginPlay(t);
    t.game.graph.nodes[c.create].defaults[`expose:${title}`] = 'donné';
    const add = t.game.node('widget.addToViewport');
    t.game.link(c.set, 'then', add, 'exec').link(c.get(), 'value', add, 'target');
    const sim = new Simulation(t.p);
    sim.start();
    sim.step();
    expect(prints(sim)).toEqual(['défaut', 'donné']);
  });

  it('a User Widget placed in the Designer is an object of its own, initialized and constructed before its parent', () => {
    const t = setup();
    const inner = t.pb.blueprint('WBP_Ligne', 'UserWidget');
    t.add('TextBlock', undefined, inner);
    say(inner, inner.node('event.onInitialized'), 'ligne init');
    say(inner, inner.node('event.construct'), 'ligne construct');
    const root = t.add('VerticalBox');
    const r = addWidget(t.p, t.w.cls, 'UserWidget', root.id, inner.cls.id);
    expect(r.ok).toBe(true);
    say(t.w, t.w.node('event.onInitialized'), 'hud init');
    say(t.w, t.w.node('event.construct'), 'hud construct');
    const c = createOnBeginPlay(t);
    const add = t.game.node('widget.addToViewport');
    t.game.link(c.set, 'then', add, 'exec').link(c.get(), 'value', add, 'target');
    const sim = new Simulation(t.p);
    sim.start();
    sim.step();
    expect(prints(sim)).toEqual(['ligne init', 'hud init', 'ligne construct', 'hud construct']);
  });

  it('Get Owning Player Pawn is None when Create Widget got no Owning Player', () => {
    const t = setup();
    t.add('CanvasPanel');
    const init = t.w.node('event.onInitialized');
    const valid = t.w.node('flow.isValid');
    t.w.link(init, 'then', valid, 'exec').link(t.w.node('widget.getOwningPlayerPawn'), 'result', valid, 'object');
    say(t.w, valid, 'pawn', 'valid');
    say(t.w, valid, 'pas de pawn', 'notValid');
    createOnBeginPlay(t, false);
    const sim = new Simulation(t.p);
    sim.start();
    sim.step();
    expect(prints(sim)).toEqual(['pas de pawn']);
  });
});

describe('changing widgets from the Graph', () => {
  function withText() {
    const t = setup();
    const root = t.add('CanvasPanel');
    const text = t.add('TextBlock', root.id);
    setWidgetIsVariable(t.w.cls, text.id, true);
    const bar = t.add('ProgressBar', root.id);
    setWidgetIsVariable(t.w.cls, bar.id, true);
    return { ...t, text, bar };
  }

  it('Set Text and Set Percent change what the screen draws; Percent keeps 1.5, the bar draws full', () => {
    const t = withText();
    const cons = t.w.node('event.construct');
    const st = t.w.node('widget.setText', {}, { text: 'Score : 3' });
    t.w.link(cons, 'then', st, 'exec').link(t.w.node('var.widget', { widget: t.text.id }), 'value', st, 'target');
    const sp = t.w.node('widget.setPercent', {}, { percent: 1.5 });
    t.w.link(st, 'then', sp, 'exec').link(t.w.node('var.widget', { widget: t.bar.id }), 'value', sp, 'target');
    const c = createOnBeginPlay(t);
    const add = t.game.node('widget.addToViewport');
    t.game.link(c.set, 'then', add, 'exec').link(c.get(), 'value', add, 'target');
    const sim = new Simulation(t.p);
    sim.start();
    sim.step();
    const layer = sim.umg.layer(1280);
    expect(layer).toHaveLength(1);
    const txt = layer[0].laid.find((l) => l.widget.id === t.text.id)!;
    expect(txt.props.text).toBe('Score : 3');
    expect(layer[0].laid.find((l) => l.widget.id === t.bar.id)!.props.percent).toBe(1.5);
    expect(sim.runtimeErrors).toBe(0);
  });

  it('Set Visibility Collapsed hides the widget object; Is In Viewport stays true', () => {
    const t = withText();
    const c = createOnBeginPlay(t);
    const add = t.game.node('widget.addToViewport');
    t.game.link(c.set, 'then', add, 'exec').link(c.get(), 'value', add, 'target');
    const vis = t.game.node('widget.setVisibility', {}, { visibility: VIS_COLLAPSED });
    t.game.link(add, 'then', vis, 'exec').link(c.get(), 'value', vis, 'target');
    const br = t.game.node('flow.branch');
    t.game.link(vis, 'then', br, 'exec');
    const isIn = t.game.node('widget.isInViewport');
    t.game.link(c.get(), 'value', isIn, 'target').link(isIn, 'result', br, 'condition');
    say(t.game, br, 'toujours dans le viewport', 'true');
    const sim = new Simulation(t.p);
    sim.start();
    sim.step();
    expect(prints(sim)).toEqual(['toujours dans le viewport']);
    expect(sim.umg.layer(1280)).toHaveLength(0);
  });

  it('a Set on a Text Block that was never created is Accessed None', () => {
    const t = withText();
    const begin = t.game.node('event.beginPlay');
    const hudVar = t.game.variable('HUD2', T.object('TextBlock'));
    const st = t.game.node('widget.setText', {}, { text: 'x' });
    t.game.link(begin, 'then', st, 'exec').link(t.game.node('var.get', { variable: hudVar }), 'value', st, 'target');
    const sim = new Simulation(t.p);
    sim.start();
    expect(sim.runtimeErrors).toBe(1);
    expect(sim.log.find((l) => l.level === 'error')!.text).toContain('Accessed None');
  });

  it('Add Child to Vertical Box shows the new widget in the list; Clear Children empties it', () => {
    const t = setup();
    const line = t.pb.blueprint('WBP_Ligne', 'UserWidget');
    t.add('TextBlock', undefined, line);
    const box = t.add('VerticalBox');
    setWidgetIsVariable(t.w.cls, box.id, true);
    const fill = custom(t.w, 'Remplir');
    const mk = t.w.node('widget.create', {}, { class: line.cls.id });
    const addC = t.w.node('widget.addChildToVerticalBox');
    t.w.link(fill, 'then', mk, 'exec').link(mk, 'then', addC, 'exec').link(mk, 'result', addC, 'content');
    t.w.link(t.w.node('var.widget', { widget: box.id }), 'value', addC, 'target');
    const cons = t.w.node('event.construct');
    const loop = t.w.node('flow.forLoop', {}, { first: 1, last: 3 });
    const callFill = t.w.node('call.custom', { event: 'Remplir' });
    t.w.link(cons, 'then', loop, 'exec').link(loop, 'body', callFill, 'exec');
    const c = createOnBeginPlay(t);
    const add = t.game.node('widget.addToViewport');
    t.game.link(c.set, 'then', add, 'exec').link(c.get(), 'value', add, 'target');
    const sim = new Simulation(t.p);
    sim.start();
    sim.step();
    expect(sim.runtimeErrors).toBe(0);
    const hud = sim.umg.viewport()[0];
    expect(hud.widget!.children[box.id]).toHaveLength(3);
    const laid = sim.umg.layer(1280)[0].laid;
    const rows = laid.filter((l) => l.path.split('/').length === 2 && l.path.includes('/@'));
    expect(rows).toHaveLength(3);
    // Stacked one under the other, as a Vertical Box does.
    expect(rows[1].rect.y).toBeGreaterThan(rows[0].rect.y);
    expect(sim.umg.childrenOf({ obj: hud, id: box.id })).toHaveLength(3);
    sim.umg.clearChildren({ obj: hud, id: box.id });
    expect(sim.umg.childrenOf({ obj: hud, id: box.id })).toHaveLength(0);
  });
});

describe('Event Tick of a widget', () => {
  it('keeps ticking while the game is paused', () => {
    const t = setup();
    t.add('CanvasPanel');
    const n = t.w.variable('Ticks', T.int, 0);
    const tick = t.w.node('event.widgetTick');
    const inc = t.w.node('var.incrementInt');
    t.w.link(tick, 'then', inc, 'exec').link(t.w.node('var.get', { variable: n }), 'value', inc, 'value');
    const c = createOnBeginPlay(t);
    const add = t.game.node('widget.addToViewport');
    t.game.link(c.set, 'then', add, 'exec').link(c.get(), 'value', add, 'target');
    const sim = new Simulation(t.p);
    sim.start();
    for (let i = 0; i < 5; i++) sim.step();
    const obj = sim.umg.viewport()[0];
    const before = obj.vars[n] as number;
    expect(before).toBeGreaterThan(0);
    sim.setGamePaused(true);
    for (let i = 0; i < 5; i++) sim.step();
    expect(obj.vars[n]).toBe(before + 5);
  });
});

describe('Bindings', () => {
  function bound() {
    const t = setup();
    const root = t.add('CanvasPanel');
    const text = t.add('TextBlock', root.id);
    setWidgetIsVariable(t.w.cls, text.id, true);
    const score = t.w.variable('Score', T.text, 'zéro');
    const g = addFunction(t.w.cls, 'GetText_0');
    setFunctionPure(t.p, t.w.cls, g.id, true);
    const out = addFunctionParam(t.p, t.w.cls, g.id, 'outputs', T.text)!;
    const fb = t.w.inGraph(g.id);
    const ret = Object.values(g.nodes).find((n) => n.def === 'fn.return')!;
    fb.link(fb.node('var.get', { variable: score }), 'value', ret.id, out.id);
    text.bindings = { text: g.id };
    const c = createOnBeginPlay(t);
    const add = t.game.node('widget.addToViewport');
    t.game.link(c.set, 'then', add, 'exec').link(c.get(), 'value', add, 'target');
    return { ...t, text, score };
  }

  it('the function is called every frame and its Return Value is drawn', () => {
    const t = bound();
    const sim = new Simulation(t.p);
    sim.start();
    for (let i = 0; i < 10; i++) sim.step();
    const hud = sim.umg.viewport()[0];
    expect(sim.umg.bindingCalls[`${hud.id}:${t.text.id}:text`]).toBe(10);
    expect(sim.umg.prop({ obj: hud, id: t.text.id }, 'text')).toBe('zéro');
    hud.vars[t.score] = 'trois';
    sim.step();
    expect(sim.umg.prop({ obj: hud, id: t.text.id }, 'text')).toBe('trois');
  });

  it('a Set Text on the bound property stops the Binding', () => {
    const t = bound();
    const later = custom(t.w, 'Fixer');
    const st = t.w.node('widget.setText', {}, { text: 'fixé' });
    t.w.link(later, 'then', st, 'exec').link(t.w.node('var.widget', { widget: t.text.id }), 'value', st, 'target');
    const sim = new Simulation(t.p);
    sim.start();
    sim.step();
    const hud = sim.umg.viewport()[0];
    // biome-ignore lint/suspicious/noExplicitAny: test access to the queue
    (sim as any).fire(hud, (n: { def: string }) => n.def === 'event.custom', 'then');
    sim.step();
    const calls = sim.umg.bindingCalls[`${hud.id}:${t.text.id}:text`];
    hud.vars[t.score] = 'ignoré';
    for (let i = 0; i < 5; i++) sim.step();
    expect(sim.umg.bindingCalls[`${hud.id}:${t.text.id}:text`]).toBe(calls);
    expect(sim.umg.prop({ obj: hud, id: t.text.id }, 'text')).toBe('fixé');
  });
});

describe('the Designer preview', () => {
  it('runs Event Pre Construct with Is Design Time true, and shows what it set', () => {
    const t = setup();
    const root = t.add('CanvasPanel');
    const text = t.add('TextBlock', root.id);
    setWidgetIsVariable(t.w.cls, text.id, true);
    const pre = t.w.node('event.preConstruct');
    const br = t.w.node('flow.branch');
    t.w.link(pre, 'then', br, 'exec').link(pre, 'designTime', br, 'condition');
    const st = t.w.node('widget.setText', {}, { text: 'aperçu' });
    t.w.link(br, 'true', st, 'exec').link(t.w.node('var.widget', { widget: text.id }), 'value', st, 'target');
    const o = previewOverride(t.p, t.w.cls.id);
    expect(o).toBeDefined();
    const laid = layoutWidgets(t.w.cls, 1280, 720, t.p, o!.override);
    expect(laid.find((l) => l.widget.id === text.id)!.props.text).toBe('aperçu');
    // Nothing to run without a Pre Construct.
    const t2 = setup();
    t2.add('CanvasPanel');
    expect(previewOverride(t2.p, t2.w.cls.id)).toBeUndefined();
  });
});

describe('the Bind menu', () => {
  it('Create Binding makes GetText_0 (pure, a Text Return Value), then GetText_1; a deleted function unbinds', () => {
    const t = setup();
    const root = t.add('CanvasPanel');
    const text = t.add('TextBlock', root.id);
    const r = createWidgetBinding(t.p, t.w.cls, text.id, 'text');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.name).toBe('GetText_0');
    expect(r.value.fn!.pure).toBe(true);
    expect(r.value.fn!.outputs[0].type.category).toBe('text');
    expect(text.bindings?.text).toBe(r.value.id);
    const r2 = createWidgetBinding(t.p, t.w.cls, text.id, 'text');
    expect(r2.ok && r2.value.name).toBe('GetText_1');
    // Only functions with no input and a Text Return Value are offered for Text.
    expect(bindingCandidates(t.w.cls, 'TextBlock', 'text').map((g) => g.name)).toEqual(['GetText_0', 'GetText_1']);
    expect(bindingCandidates(t.w.cls, 'TextBlock', 'visibility')).toEqual([]);
    expect(setWidgetBinding(t.w.cls, text.id, 'visibility', r.value.id).ok).toBe(false);
    if (r2.ok) removeFunction(t.p, t.w.cls, r2.value.id);
    expect(text.bindings).toBeUndefined();
  });

  it('a saved project keeps its Bindings and forgets one whose function is gone', () => {
    const t = setup();
    const root = t.add('CanvasPanel');
    const text = t.add('TextBlock', root.id);
    const r = createWidgetBinding(t.p, t.w.cls, text.id, 'text');
    const back = parseProject(serializeProject(t.p));
    const w = back.classes.find((c) => c.name === 'WBP_HUD')!.widgets!.find((x) => x.id === text.id)!;
    expect(w.bindings?.text).toBe(r.ok ? r.value.id : '');
    const raw = JSON.parse(serializeProject(t.p));
    raw.project.classes.find((c: { name: string }) => c.name === 'WBP_HUD').widgets.find((x: { id: string }) => x.id === text.id).bindings = { text: 'gone' };
    const repaired = parseProject(JSON.stringify(raw));
    expect(repaired.classes.find((c) => c.name === 'WBP_HUD')!.widgets!.find((x) => x.id === text.id)!.bindings).toBeUndefined();
  });

  it('Create Widget asks for a Widget Blueprint on its Class pin', () => {
    const t = setup();
    t.add('CanvasPanel');
    const begin = t.game.node('event.beginPlay');
    const cw = t.game.node('widget.create');
    t.game.link(begin, 'then', cw, 'exec');
    const msgs = compileClass(t.game.cls, t.p).messages.map((m) => m.text);
    expect(msgs.some((m) => m.includes('Widget Blueprint sur la pin Class'))).toBe(true);
    t.game.graph.nodes[cw].defaults.class = t.w.cls.id;
    expect(resolvePins(t.game.graph.nodes[cw], contextFor(t.game.cls, t.p)).find((p) => p.id === 'result')!.type.subtype).toBe('WBP_HUD');
    expect(compileClass(t.game.cls, t.p).messages.filter((m) => m.severity === 'error')).toEqual([]);
  });
});
