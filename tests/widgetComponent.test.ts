/**
 * V7.42: the Widget Component. One widget object per actor, made as the
 * component begins play (On Initialized, before the actor's BeginPlay),
 * constructed at the next frame, gone with its actor; Get User Widget Object
 * gives it (None without a Widget Class), typed User Widget, so a Cast To
 * reaches its variables.
 */
import { describe, expect, it } from 'vitest';
import { ProjectBuilder } from '../src/core/lessons/builder';
import { removeClass } from '../src/core/operations/projectOps';
import { setWidgetClass } from '../src/core/operations/classOps';
import { addWidget } from '../src/core/operations/widgetOps';
import { parseProject, serializeProject } from '../src/core/serialization/serialize';
import { compileClass } from '../src/core/compiler/validate';
import { Simulation } from '../src/core/runtime/simulation';
import { T } from '../src/core/types/pins';

function setup(opts: { widgetClass?: boolean } = {}) {
  const pb = new ProjectBuilder('widget-component');
  const w = pb.blueprint('WBP_Barre', 'UserWidget');
  const canvas = addWidget(pb.project, w.cls, 'CanvasPanel');
  if (!canvas.ok) throw new Error(canvas.reason);
  addWidget(pb.project, w.cls, 'ProgressBar', canvas.value.id);
  const valeur = w.variable('Valeur', T.float, 0);
  const say = (event: string, text: string) => {
    const print = w.node('debug.printString', {}, { text });
    w.link(w.node(event), 'then', print, 'exec');
  };
  say('event.onInitialized', 'init');
  say('event.construct', 'construct');
  say('event.destruct', 'destruct');
  const enemy = pb.blueprint('BP_Ennemi');
  enemy.component('StaticMesh', 'Corps');
  enemy.widgetComponent('Barre', opts.widgetClass === false ? undefined : w, { y: -80, sizeX: 150, sizeY: 20 });
  // BeginPlay: Get User Widget Object › Cast To WBP_Barre › Set Valeur 0.5, then print what Get gave.
  const begin = enemy.node('event.beginPlay');
  const get = enemy.node('widgetComponent.getUserWidgetObject');
  enemy.target('Barre', get);
  const cast = enemy.node('cast.to', { class: w.cls.id });
  enemy.link(begin, 'then', cast, 'exec').link(get, 'result', cast, 'object');
  const set = enemy.node('var.setExternal', { owner: w.cls.id, variable: valeur }, { value: 0.5 });
  enemy.link(cast, 'then', set, 'exec').link(cast, 'as', set, 'target');
  const failed = enemy.node('debug.printString', {}, { text: 'cast failed' });
  enemy.link(cast, 'failed', failed, 'exec');
  const a1 = pb.place(enemy, 0, 0);
  const a2 = pb.place(enemy, 400, 0);
  return { pb, p: pb.project, w, enemy, valeur, a1, a2 };
}

const prints = (sim: Simulation) => sim.log.filter((l) => l.message !== undefined).map((l) => l.message);

describe('the Widget Component (V7.42)', () => {
  it('makes one widget per actor, owned by the player, before the actor’s BeginPlay', () => {
    const t = setup();
    const sim = new Simulation(t.p);
    sim.start();
    const objs = sim.umg.componentWidgets();
    expect(objs).toHaveLength(2);
    expect(new Set(objs.map((o) => o.id)).size).toBe(2);
    for (const o of objs) {
      expect(o.widget!.owner).toBe('controller');
      // The actor's BeginPlay reached its own widget through Get User Widget Object and Cast To.
      expect(o.vars[t.valeur]).toBe(0.5);
    }
    // On Initialized at once; Construct only at the first frame.
    expect(prints(sim)).toEqual(['init', 'init']);
    sim.step();
    expect(prints(sim)).toEqual(['init', 'init', 'construct', 'construct']);
    expect(sim.umg.componentLayer()).toHaveLength(2);
    expect(sim.umg.componentLayer()[0]).toMatchObject({ w: 150, h: 20 });
    // Not in the viewport: Is In Viewport is false for them, as in UE.
    expect(objs.every((o) => !sim.umg.isInViewport(o))).toBe(true);
  });

  it('is gone with its actor (Destruct), and hidden with its component or its actor', () => {
    const t = setup();
    const sim = new Simulation(t.p);
    sim.start();
    sim.step();
    const actor = sim.actors.find((a) => a.id === t.a1)!;
    actor.components.find((c) => c.name === 'Barre')!.props.visible = false;
    expect(sim.umg.componentLayer()).toHaveLength(1);
    actor.components.find((c) => c.name === 'Barre')!.props.visible = true;
    actor.hidden = true;
    expect(sim.umg.componentLayer()).toHaveLength(1);
    actor.hidden = false;
    sim.destroy(actor);
    sim.step();
    expect(prints(sim).filter((m) => m === 'destruct')).toHaveLength(1);
    expect(sim.umg.componentLayer()).toHaveLength(1);
  });

  it('stays above its actor whatever the actor’s yaw: its Location never turns (V7.44)', async () => {
    const { componentTransform } = await import('../src/core/runtime/world');
    const t = setup();
    const sim = new Simulation(t.p);
    sim.start();
    for (const yaw of [0, 90, 180, -45]) {
      const actor = sim.actors.find((a) => a.id === t.a1)!;
      actor.yaw = yaw;
      const at = componentTransform(actor, actor.components.find((c) => c.kind === 'Widget')!);
      expect(at.x - actor.x).toBeCloseTo(0);
      expect(at.y - actor.y).toBeCloseTo(-80);
    }
  });

  it('gives None without a Widget Class: the Cast fails, nothing is drawn', () => {
    const t = setup({ widgetClass: false });
    const sim = new Simulation(t.p);
    sim.start();
    sim.step();
    expect(sim.umg.componentWidgets()).toHaveLength(0);
    expect(prints(sim)).toEqual(['cast failed', 'cast failed']);
  });

  it('makes the widget of a spawned actor before its BeginPlay too', () => {
    const t = setup();
    const spawner = t.pb.blueprint('BP_Usine');
    const spawn = spawner.node('actor.spawn', {}, { class: t.enemy.cls.id });
    spawner.link(spawner.node('event.beginPlay'), 'then', spawn, 'exec');
    t.pb.place(spawner, 0, 400);
    const sim = new Simulation(t.p);
    sim.start();
    const objs = sim.umg.componentWidgets();
    expect(objs).toHaveLength(3);
    expect(objs.every((o) => o.vars[t.valeur] === 0.5)).toBe(true);
  });

  it('keeps its place when its Widget Blueprint cannot be found, with None; the Widget Blueprint cannot be deleted while used', () => {
    const t = setup();
    expect(removeClass(t.p, t.w.cls.id).ok).toBe(false);
    const comp = t.enemy.cls.components.find((c) => c.kind === 'Widget')!;
    expect(setWidgetClass(t.p, t.enemy.cls, comp.id, t.enemy.cls.id).ok).toBe(false);
    const text = serializeProject(t.p).replace(new RegExp(`"classId": "${t.w.cls.id}"`, 'g'), '"classId": "gone"');
    const back = parseProject(text);
    const kept = back.classes.find((c) => c.name === 'BP_Ennemi')!.components.find((c) => c.kind === 'Widget')!;
    expect(kept.classId).toBeUndefined();
    expect(kept.props.sizeX).toBe(150);
  });

  it('compiles: Get User Widget Object takes the component, and gives a User Widget', () => {
    const t = setup();
    const r = compileClass(t.enemy.cls, t.p);
    expect(r.messages.filter((m) => m.severity === 'error')).toEqual([]);
    expect(r.status).not.toBe('error');
  });
});

describe('Widget Component: advice and touches (V7.42)', () => {
  it('advises when Get User Widget Object reads a component with no Widget Class', async () => {
    const { adviceFor } = await import('../src/core/quality/advice');
    expect(adviceFor(setup({ widgetClass: false }).p).map((a) => a.rule)).toContain('widget-component-no-class');
    expect(adviceFor(setup().p).map((a) => a.rule)).not.toContain('widget-component-no-class');
  });

  it('its Buttons answer the finger as the input mode allows', async () => {
    const { addButtonEvent } = await import('../src/core/operations/widgetOps');
    const t = setup();
    const canvas = t.w.cls.widgets!.find((w) => w.kind === 'CanvasPanel')!;
    const btn = addWidget(t.p, t.w.cls, 'Button', canvas.id);
    if (!btn.ok) throw new Error(btn.reason);
    btn.value.slot.offsets = [0, 0, 150, 20];
    const ev = addButtonEvent(t.w.cls, btn.value.id, 'clicked');
    if (!ev.ok) throw new Error(ev.reason);
    t.w.link(ev.value.nodeId, 'then', t.w.node('debug.printString', {}, { text: 'clic' }), 'exec');
    const sim = new Simulation(t.p);
    sim.start();
    sim.step();
    const obj = sim.umg.componentWidgets()[0];
    // Game Only, the mode the game starts in: the touch goes to the game.
    expect(sim.touchDownOn(obj.id, 75, 10)).toMatchObject({ kind: 'ignored', reason: 'gameOnly' });
    sim.setInputMode('GameAndUI');
    expect(sim.touchDownOn(obj.id, 75, 10)).toMatchObject({ kind: 'button' });
    sim.touchUpOn(obj.id, 75, 10);
    expect(prints(sim)).toContain('clic');
  });
});
