/**
 * V7.35: buttons and input modes, as in UE. On Pressed, On Released, On
 * Clicked; Game Only keeps touches from the widgets, UI Only keeps keys,
 * actions and the joystick from the game, Game and UI gives both; buttons
 * and a widget's Event Tick go on during the pause, its Delay waits; what
 * takes a touch (Visible over a button, Not Hit-Testable, Is Enabled).
 */
import { describe, expect, it } from 'vitest';
import { compileClass } from '../src/core/compiler/validate';
import { ProjectBuilder, type ClassBuilder } from '../src/core/lessons/builder';
import { runLesson } from '../src/core/lessons/runner';
import type { Lesson } from '../src/core/lessons/types';
import { PROJECT_FORMAT } from '../src/core/model/project';
import { VIS_HIT_TEST_INVISIBLE, VIS_SELF_HIT_TEST_INVISIBLE, VIS_VISIBLE, widgetPropsDefaults, type WidgetNode } from '../src/core/model/widgets';
import { paletteEntries } from '../src/core/nodes/palette';
import { contextFor } from '../src/core/nodes/registry';
import { addNode } from '../src/core/operations/graphOps';
import { addButtonEvent, addWidget, setWidgetIsVariable, updateWidgetProps, updateWidgetSlot } from '../src/core/operations/widgetOps';
import { Simulation } from '../src/core/runtime/simulation';
import { parseProject, serializeProject } from '../src/core/serialization/serialize';
import { T } from '../src/core/types/pins';

const prints = (sim: Simulation) => sim.log.filter((l) => l.message !== undefined).map((l) => l.message);

/**
 * WBP_Menu: a Canvas Panel with Btn_OK (its three events print), shown by
 * BP_Jeu at BeginPlay; BP_Jeu sets the input mode `mode` and prints "E" on
 * the E key.
 */
function menu(mode: 'none' | 'input.setModeUIOnly' | 'input.setModeGameAndUI' | 'input.setModeGameOnly' = 'input.setModeUIOnly') {
  const pb = new ProjectBuilder('umg-input');
  const w = pb.blueprint('WBP_Menu', 'UserWidget');
  const game = pb.blueprint('BP_Jeu');
  game.component('StaticMesh', 'Socle');
  game.cls.autoReceiveInput = true;
  pb.place(game, 300, 0);
  const add = (kind: WidgetNode['kind'], target?: string, b: ClassBuilder = w) => {
    const r = addWidget(pb.project, b.cls, kind, target);
    if (!r.ok) throw new Error(r.reason);
    return r.value;
  };
  const root = add('CanvasPanel');
  const btn = add('Button', root.id);
  btn.name = 'Btn_OK';
  updateWidgetSlot(w.cls, btn.id, { offsets: [400, 300, 200, 80] });
  for (const e of ['pressed', 'released', 'clicked'] as const) {
    const r = addButtonEvent(w.cls, btn.id, e);
    if (!r.ok) throw new Error(r.reason);
    const pr = w.node('debug.printString', {}, { text: e });
    w.link(r.value.nodeId, 'then', pr, 'exec');
  }
  const begin = game.node('event.beginPlay');
  const create = game.node('widget.create', {}, { class: w.cls.id });
  const pc = game.node('player.getController');
  const show = game.node('widget.addToViewport');
  game.link(begin, 'then', create, 'exec').link(pc, 'result', create, 'owner').link(create, 'then', show, 'exec').link(create, 'result', show, 'target');
  let last = show;
  if (mode !== 'none') {
    const m = game.node(mode);
    game.link(show, 'then', m, 'exec').link(game.node('player.getController'), 'result', m, 'controller');
    last = m;
  }
  const key = game.node('event.inputKey', { key: 'E' });
  const pr = game.node('debug.printString', {}, { text: 'E' });
  game.link(key, 'pressed', pr, 'exec');
  return { pb, p: pb.project, w, game, root, btn, add, last };
}

/** Centre of Btn_OK on the reference screen. */
const centre = (sim: Simulation) => {
  const l = sim.umg.layer(1280)[0].laid.find((x) => x.widget.name === 'Btn_OK')!;
  return [l.rect.x + l.rect.w / 2, l.rect.y + l.rect.h / 2] as const;
};

describe('a Button', () => {
  it('answers in UI Only: On Pressed, then On Released and On Clicked when the finger leaves it', () => {
    const t = menu();
    const sim = new Simulation(t.p);
    sim.start();
    sim.step();
    expect(sim.inputMode).toBe('UIOnly');
    expect(sim.tapButton('WBP_Menu', 'Btn_OK')).toEqual({ kind: 'button', button: 'WBP_Menu/Btn_OK' });
    expect(prints(sim)).toEqual(['pressed', 'released', 'clicked']);
    expect(sim.record.buttons).toEqual(['WBP_Menu/Btn_OK']);
  });

  it('released away from it: On Released, no On Clicked', () => {
    const t = menu();
    const sim = new Simulation(t.p);
    sim.start();
    sim.step();
    const [x, y] = centre(sim);
    sim.touchDown(x, y, 1280);
    expect(sim.umg.pressed).toBeDefined();
    sim.touchUp(x + 400, y, 1280);
    expect(prints(sim)).toEqual(['pressed', 'released']);
    expect(sim.umg.pressed).toBeUndefined();
  });

  it('is not touched in Game Only, the mode the game starts in: the touch is ignored, and said why', () => {
    const t = menu('none');
    const sim = new Simulation(t.p);
    sim.start();
    sim.step();
    expect(sim.inputMode).toBe('GameOnly');
    const out = sim.tapButton('WBP_Menu', 'Btn_OK');
    expect(out).toMatchObject({ kind: 'ignored', reason: 'gameOnly', button: 'WBP_Menu/Btn_OK' });
    expect(prints(sim)).toEqual([]);
    expect(sim.record.ignoredTouches).toEqual([{ button: 'WBP_Menu/Btn_OK', reason: 'gameOnly' }]);
  });

  it('works while the game is paused; a Delay in the widget waits for the pause to end', () => {
    const t = menu();
    const later = t.w.node('time.delay', {}, { duration: 0.5 });
    const ev = Object.values(t.w.graph.nodes).find((n) => n.def === 'event.widgetButton' && n.config.event === 'clicked')!;
    const pr = Object.values(t.w.graph.links).find((l) => l.from.node === ev.id)!.to.node;
    t.w.link(pr, 'then', later, 'exec');
    t.w.link(later, 'completed', t.w.node('debug.printString', {}, { text: 'après le Delay' }), 'exec');
    const sim = new Simulation(t.p);
    sim.start();
    sim.step();
    sim.setGamePaused(true);
    sim.tapButton('WBP_Menu', 'Btn_OK');
    expect(prints(sim)).toEqual(['pressed', 'released', 'clicked']);
    for (let i = 0; i < 60; i++) sim.step();
    expect(prints(sim)).not.toContain('après le Delay');
    sim.setGamePaused(false);
    for (let i = 0; i < 40; i++) sim.step();
    expect(prints(sim)).toContain('après le Delay');
  });

  it('disabled (Is Enabled off on its panel, or Set Is Enabled false on the widget), takes the touch and answers nothing', () => {
    const t = menu();
    updateWidgetProps(t.w.cls, t.root.id, { enabled: false });
    const sim = new Simulation(t.p);
    sim.start();
    sim.step();
    expect(sim.tapButton('WBP_Menu', 'Btn_OK')).toMatchObject({ kind: 'ignored', reason: 'disabled' });
    expect(prints(sim)).toEqual([]);
    const t2 = menu();
    const off = t2.game.node('widget.setIsEnabled', {}, { enabled: false });
    const create = Object.values(t2.game.graph.nodes).find((n) => n.def === 'widget.create')!;
    t2.game.link(t2.last, 'then', off, 'exec').link(create.id, 'result', off, 'target');
    const sim2 = new Simulation(t2.p);
    sim2.start();
    sim2.step();
    expect(sim2.runtimeErrors).toBe(0);
    expect(sim2.tapButton('WBP_Menu', 'Btn_OK')).toMatchObject({ kind: 'ignored', reason: 'disabled' });
  });
});

describe('what takes a touch', () => {
  it('a Canvas Panel and a Text are Not Hit-Testable (Self Only) by default; an Image is Visible', () => {
    expect(widgetPropsDefaults('CanvasPanel').visibility).toBe(VIS_SELF_HIT_TEST_INVISIBLE);
    expect(widgetPropsDefaults('TextBlock').visibility).toBe(VIS_SELF_HIT_TEST_INVISIBLE);
    expect(widgetPropsDefaults('UserWidget').visibility).toBe(VIS_SELF_HIT_TEST_INVISIBLE);
    expect(widgetPropsDefaults('Image').visibility).toBe(VIS_VISIBLE);
    expect(widgetPropsDefaults('Button').visibility).toBe(VIS_VISIBLE);
  });

  it('a Text inside the Button lets the touch go up to it', () => {
    const t = menu();
    t.add('TextBlock', t.btn.id);
    updateWidgetProps(t.w.cls, t.w.cls.widgets!.find((x) => x.kind === 'TextBlock')!.id, { visibility: VIS_VISIBLE });
    const sim = new Simulation(t.p);
    sim.start();
    sim.step();
    // Even Visible, a Text in the Button: the touch goes up its parents to the Button.
    expect(sim.tapButton('WBP_Menu', 'Btn_OK').kind).toBe('button');
  });

  it('an Image left Visible on top of the button takes its touch; Not Hit-Testable lets it through', () => {
    const t = menu();
    const img = t.add('Image', t.root.id);
    img.name = 'Img_Cadre';
    updateWidgetSlot(t.w.cls, img.id, { offsets: [380, 280, 260, 140] });
    const sim = new Simulation(t.p);
    sim.start();
    sim.step();
    expect(sim.tapButton('WBP_Menu', 'Btn_OK')).toMatchObject({ kind: 'ignored', reason: 'blocked', by: 'Img_Cadre', button: 'Btn_OK' });
    expect(prints(sim)).toEqual([]);
    updateWidgetProps(t.w.cls, img.id, { visibility: VIS_SELF_HIT_TEST_INVISIBLE });
    const sim2 = new Simulation(t.p);
    sim2.start();
    sim2.step();
    expect(sim2.tapButton('WBP_Menu', 'Btn_OK').kind).toBe('button');
  });

  it('Not Hit-Testable (Self & All Children) on the panel: nothing inside takes a touch', () => {
    const t = menu();
    updateWidgetProps(t.w.cls, t.root.id, { visibility: VIS_HIT_TEST_INVISIBLE });
    const sim = new Simulation(t.p);
    sim.start();
    sim.step();
    expect(sim.tapButton('WBP_Menu', 'Btn_OK').kind).toBe('none');
  });

  it('a HUD in front set Visible by Set Visibility covers the whole screen: the menu behind gets no touch', () => {
    const t = menu();
    const hud = t.pb.blueprint('WBP_HUD', 'UserWidget');
    t.add('CanvasPanel', undefined, hud);
    const mk = t.game.node('widget.create', {}, { class: hud.cls.id });
    const show = t.game.node('widget.addToViewport', {}, { zOrder: 5 });
    const vis = t.game.node('widget.setVisibility', {}, { visibility: VIS_VISIBLE });
    t.game.link(t.last, 'then', mk, 'exec').link(mk, 'then', show, 'exec').link(mk, 'result', show, 'target');
    t.game.link(show, 'then', vis, 'exec').link(mk, 'result', vis, 'target');
    const sim = new Simulation(t.p);
    sim.start();
    sim.step();
    expect(sim.tapButton('WBP_Menu', 'Btn_OK')).toMatchObject({ kind: 'ignored', reason: 'blocked', by: 'WBP_HUD_C_0' });
  });
});

describe('the input modes', () => {
  it('UI Only: no key, no movement for the game; Game and UI: both', () => {
    const t = menu();
    const sim = new Simulation(t.p);
    sim.start();
    sim.step();
    const x = sim.player.x;
    sim.move = { x: 1, y: 0 };
    for (let i = 0; i < 10; i++) sim.step();
    expect(sim.player.x).toBe(x);
    sim.pressKey('E');
    sim.step();
    sim.releaseKey('E');
    expect(prints(sim)).toEqual([]);
    expect(sim.record.uiOnlyBlocked.has('E')).toBe(true);
    sim.setInputMode('GameAndUI');
    for (let i = 0; i < 10; i++) sim.step();
    expect(sim.player.x).toBeGreaterThan(x);
    sim.pressKey('E');
    sim.step();
    expect(prints(sim)).toEqual(['E']);
    sim.move = { x: 0, y: 0 };
    expect(sim.tapButton('WBP_Menu', 'Btn_OK').kind).toBe('button');
  });

  it('Set Show Mouse Cursor sets the controller’s property; Set Input Mode needs a Player Controller', () => {
    const t = menu('none');
    const cur = t.game.node('input.setShowMouseCursor', {}, { show: true });
    t.game.link(t.last, 'then', cur, 'exec').link(t.game.node('player.getController'), 'result', cur, 'target');
    const ui = t.game.node('input.setModeUIOnly');
    t.game.link(cur, 'then', ui, 'exec');
    const sim = new Simulation(t.p);
    sim.start();
    sim.step();
    expect(sim.showMouseCursor).toBe(true);
    // Player Controller left empty: Accessed None, and the mode stays Game Only.
    expect(sim.inputMode).toBe('GameOnly');
    expect(sim.runtimeErrors).toBe(1);
    expect(compileClass(t.game.cls, t.p).messages.some((m) => m.severity === 'error' && m.text.includes('Player Controller'))).toBe(true);
  });

  it('a lesson scenario taps a button with { click }', () => {
    const t = menu();
    const lesson = {
      id: 'x',
      title: 'x',
      scenario: [{ wait: 0.1 }, { click: 'WBP_Menu/Btn_OK' }],
      checks: [{ id: 'c', label: 'clic', test: (cx: { prints(): string[] }) => (cx.prints().includes('clicked') ? true : 'pas de clic') }],
    } as unknown as Lesson;
    const r = runLesson(lesson, t.p);
    expect(r.compileErrors).toEqual([]);
    expect(r.passed).toBe(true);
  });
});

describe('a Button’s events in the Graph', () => {
  it('come from Details (+) or the palette, once each, and need Is Variable', () => {
    const t = menu();
    const g = t.w.graph;
    expect(addNode(g, 'event.widgetButton', 0, 0, { widget: t.btn.id, event: 'clicked' }).ok).toBe(false);
    const again = addButtonEvent(t.w.cls, t.btn.id, 'clicked');
    expect(again.ok && g.nodes[again.value.nodeId].config.event).toBe('clicked');
    const titles = paletteEntries(contextFor(t.w.cls, t.p), g).filter((e) => e.def === 'event.widgetButton').map((e) => e.title);
    expect(titles).toEqual(['On Clicked (Btn_OK)', 'On Pressed (Btn_OK)', 'On Released (Btn_OK)']);
    setWidgetIsVariable(t.w.cls, t.btn.id, false);
    const errors = compileClass(t.w.cls, t.p).messages.filter((m) => m.code === 'widgetGone');
    expect(errors).toHaveLength(3);
    expect(addButtonEvent(t.w.cls, t.btn.id, 'pressed').ok).toBe(false);
  });
});

describe('format 13', () => {
  it('turns the old Visible default of Canvas Panels and Texts into Not Hit-Testable (Self Only)', () => {
    const t = menu();
    const text = t.add('TextBlock', t.root.id);
    const img = t.add('Image', t.root.id);
    const file = JSON.parse(serializeProject(t.p));
    file.format = 12;
    file.project.format = 12;
    for (const w of file.project.classes.find((c: { name: string }) => c.name === 'WBP_Menu').widgets) w.props.visibility = 0;
    const back = parseProject(JSON.stringify(file));
    expect(PROJECT_FORMAT).toBe(13);
    const ws = back.classes.find((c) => c.name === 'WBP_Menu')!.widgets!;
    expect(ws.find((x) => x.id === t.root.id)!.props.visibility).toBe(VIS_SELF_HIT_TEST_INVISIBLE);
    expect(ws.find((x) => x.id === text.id)!.props.visibility).toBe(VIS_SELF_HIT_TEST_INVISIBLE);
    expect(ws.find((x) => x.id === img.id)!.props.visibility).toBe(VIS_VISIBLE);
    expect(ws.find((x) => x.id === t.btn.id)!.props.enabled).toBe(true);
  });
});

void T;
