/** V7.33: Widget Blueprints (UMG), their Designer tree, its layout and the rules of their Graph. */
import { describe, expect, it } from 'vitest';
import { compileClass } from '../src/core/compiler/validate';
import { ProjectBuilder, type ClassBuilder } from '../src/core/lessons/builder';
import { createClass, PROJECT_FORMAT } from '../src/core/model/project';
import { widgetTree, type WidgetNode } from '../src/core/model/widgets';
import { paletteEntries } from '../src/core/nodes/palette';
import { contextFor, resolvePins } from '../src/core/nodes/registry';
import { addActorComponent } from '../src/core/operations/classOps';
import { placeActor } from '../src/core/operations/levelOps';
import { removeClass, setParentClass } from '../src/core/operations/projectOps';
import {
  addWidget,
  moveWidgetBy,
  moveWidgetInto,
  moveWidgetOrder,
  removeWidget,
  renameWidget,
  setWidgetAnchors,
  setWidgetIsVariable,
  updateWidgetProps,
  updateWidgetSlot,
  wrapWidget,
} from '../src/core/operations/widgetOps';
import { parseProject, serializeProject } from '../src/core/serialization/serialize';
import { DESIGN_H, DESIGN_W, layoutWidgets } from '../src/core/umg/layout';
import { Simulation } from '../src/core/runtime/simulation';

const errors = (pb: ProjectBuilder, b: ClassBuilder) =>
  compileClass(b.cls, pb.project)
    .messages.filter((m) => m.severity === 'error')
    .map((m) => m.text);

function hud() {
  const pb = new ProjectBuilder('umg');
  pb.blueprint('BP_Joueur', 'Pawn');
  const b = pb.blueprint('WBP_HUD', 'UserWidget');
  return { pb, b, p: pb.project, cls: b.cls };
}

function add(t: ReturnType<typeof hud>, kind: WidgetNode['kind'], target?: string): WidgetNode {
  const r = addWidget(t.p, t.cls, kind, target);
  if (!r.ok) throw new Error(r.reason);
  return r.value;
}

const rectOf = (cls: ReturnType<typeof hud>['cls'], id: string, w = DESIGN_W, h = DESIGN_H) => layoutWidgets(cls, w, h).find((l) => l.widget.id === id)!.rect;

describe('the Widget Blueprint', () => {
  it('is a class of its own: no components, a widget tree, never in the level', () => {
    const t = hud();
    expect(t.cls.parent).toBe('UserWidget');
    expect(t.cls.components).toEqual([]);
    expect(t.cls.widgets).toEqual([]);
    expect(createClass('BP_Lampe').widgets).toBeUndefined();
    const placed = placeActor(t.p, t.cls.id, 0, 0);
    expect(placed.ok).toBe(false);
    if (!placed.ok) expect(placed.reason).toContain('Create Widget');
    expect(setParentClass(t.p, t.cls.id, 'Actor').ok).toBe(false);
    const actor = t.p.classes.find((c) => c.name === 'BP_Joueur')!;
    expect(setParentClass(t.p, actor.id, 'UserWidget').ok).toBe(false);
  });

  it('starts with no root, as in UE5: the first widget placed becomes it', () => {
    const t = hud();
    const text = add(t, 'TextBlock');
    expect(text.parent).toBeUndefined();
    // A Text holds nothing: the next one has nowhere to go until the root is wrapped.
    const refused = addWidget(t.p, t.cls, 'ProgressBar');
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.reason).toContain('Wrap With');
    const wrap = wrapWidget(t.cls, text.id, 'CanvasPanel');
    expect(wrap.ok).toBe(true);
    if (!wrap.ok) return;
    expect(text.parent).toBe(wrap.value.id);
    const bar = add(t, 'ProgressBar');
    expect(bar.parent).toBe(wrap.value.id);
    expect(widgetTree(t.cls.widgets!).map((x) => x.depth)).toEqual([0, 1, 1]);
  });

  it('names widgets as UE does and keeps names unique with the variables', () => {
    const t = hud();
    const canvas = add(t, 'CanvasPanel');
    const a = add(t, 'TextBlock', canvas.id);
    const b = add(t, 'TextBlock', canvas.id);
    expect([a.name, b.name]).toEqual(['TextBlock', 'TextBlock_0']);
    expect(renameWidget(t.cls, b.id, 'TextBlock').ok).toBe(false);
    expect(renameWidget(t.cls, b.id, 'Texte Score').ok).toBe(false);
    expect(renameWidget(t.cls, b.id, 'TexteScore').ok).toBe(true);
    // A Button is a variable from the start (it has events); a Text is not.
    expect(a.isVariable).toBe(false);
    expect(add(t, 'Button', canvas.id).isVariable).toBe(true);
  });

  it('a Button takes one child; a widget goes next to a leaf it was dropped on', () => {
    const t = hud();
    const box = add(t, 'VerticalBox');
    const button = add(t, 'Button', box.id);
    const label = add(t, 'TextBlock', button.id);
    expect(label.parent).toBe(button.id);
    // Dropped on the Button's Text: it goes in the Text's parent? A Button is full, so it is refused.
    expect(addWidget(t.p, t.cls, 'Image', label.id).ok).toBe(false);
    // Dropped on the Button itself (full): next to it, in the box.
    const img = add(t, 'Image', button.id);
    expect(img.parent).toBe(box.id);
  });

  it('moves, reorders, re-parents and deletes, with the Graph nodes that read a deleted widget', () => {
    const t = hud();
    const canvas = add(t, 'CanvasPanel');
    const a = add(t, 'TextBlock', canvas.id);
    const box = add(t, 'VerticalBox', canvas.id);
    const c = add(t, 'TextBlock', box.id);
    expect(moveWidgetOrder(t.cls, box.id, -1).ok).toBe(true);
    expect(widgetTree(t.cls.widgets!).map((x) => x.w.id)).toEqual([canvas.id, box.id, c.id, a.id]);
    expect(moveWidgetInto(t.cls, box.id, c.id).ok).toBe(false);
    expect(moveWidgetInto(t.cls, a.id, box.id).ok).toBe(true);
    expect(widgetTree(t.cls.widgets!).map((x) => x.w.id)).toEqual([canvas.id, box.id, c.id, a.id]);
    expect(a.parent).toBe(box.id);
    setWidgetIsVariable(t.cls, c.id, true);
    const get = t.b.node('var.widget', { widget: c.id });
    expect(errors(t.pb, t.b)).toEqual([]);
    removeWidget(t.cls, box.id);
    expect(t.cls.widgets!.map((w) => w.id)).toEqual([canvas.id]);
    expect(t.b.graph.nodes[get]).toBeUndefined();
  });

  it('refuses a User Widget that would contain itself', () => {
    const t = hud();
    const bar = t.pb.blueprint('WBP_Barre', 'UserWidget');
    const canvas = add(t, 'CanvasPanel');
    expect(addWidget(t.p, t.cls, 'UserWidget', canvas.id, bar.cls.id).ok).toBe(true);
    const barRoot = addWidget(t.p, bar.cls, 'Overlay');
    expect(barRoot.ok).toBe(true);
    if (!barRoot.ok) return;
    expect(addWidget(t.p, bar.cls, 'UserWidget', barRoot.value.id, t.cls.id).ok).toBe(false);
    expect(addWidget(t.p, t.cls, 'UserWidget', canvas.id, t.cls.id).ok).toBe(false);
    // Still placed in WBP_HUD: it cannot be deleted.
    expect(removeClass(t.p, bar.cls.id).ok).toBe(false);
  });
});

describe('the layout, as Slate places widgets', () => {
  it('a Canvas Panel child: anchor, position, size, alignment', () => {
    const t = hud();
    const canvas = add(t, 'CanvasPanel');
    const bar = add(t, 'ProgressBar', canvas.id);
    updateWidgetSlot(t.cls, bar.id, { anchors: { minX: 0, minY: 0, maxX: 0, maxY: 0 }, offsets: [20, 30, 200, 24] });
    expect(rectOf(t.cls, canvas.id)).toEqual({ x: 0, y: 0, w: 1280, h: 720 });
    expect(rectOf(t.cls, bar.id)).toEqual({ x: 20, y: 30, w: 200, h: 24 });
    // Bottom right, pivot at its own bottom right: stuck to the corner whatever the screen.
    updateWidgetSlot(t.cls, bar.id, { anchors: { minX: 1, minY: 1, maxX: 1, maxY: 1 }, offsets: [-20, -20, 200, 24], alignX: 1, alignY: 1 });
    expect(rectOf(t.cls, bar.id)).toEqual({ x: 1060, y: 676, w: 200, h: 24 });
    expect(rectOf(t.cls, bar.id, 800, 400)).toEqual({ x: 580, y: 356, w: 200, h: 24 });
  });

  it('a stretched anchor: the offsets are margins', () => {
    const t = hud();
    const canvas = add(t, 'CanvasPanel');
    const img = add(t, 'Image', canvas.id);
    updateWidgetSlot(t.cls, img.id, { anchors: { minX: 0, minY: 0, maxX: 1, maxY: 1 }, offsets: [10, 10, 10, 10] });
    expect(rectOf(t.cls, img.id)).toEqual({ x: 10, y: 10, w: 1260, h: 700 });
  });

  it('picking an anchor preset keeps the widget in place', () => {
    const t = hud();
    const canvas = add(t, 'CanvasPanel');
    const img = add(t, 'Image', canvas.id);
    updateWidgetSlot(t.cls, img.id, { offsets: [100, 50, 80, 60] });
    const before = rectOf(t.cls, img.id);
    setWidgetAnchors(t.cls, img.id, { minX: 1, minY: 0, maxX: 1, maxY: 0 }, before, rectOf(t.cls, canvas.id));
    expect(rectOf(t.cls, img.id)).toEqual(before);
    setWidgetAnchors(t.cls, img.id, { minX: 0, minY: 0, maxX: 1, maxY: 1 }, before, rectOf(t.cls, canvas.id));
    expect(rectOf(t.cls, img.id)).toEqual(before);
    moveWidgetBy(t.cls, img.id, 10, -5);
    expect(rectOf(t.cls, img.id)).toEqual({ ...before, x: before.x + 10, y: before.y - 5 });
  });

  it('a Vertical Box: Auto takes what the child wants, Fill shares the rest', () => {
    const t = hud();
    const box = add(t, 'VerticalBox');
    const a = add(t, 'Spacer', box.id);
    updateWidgetProps(t.cls, a.id, { sizeX: 50, sizeY: 100 });
    const b = add(t, 'Image', box.id);
    updateWidgetSlot(t.cls, b.id, { sizeRule: 'Fill', padding: [10, 10, 10, 10] });
    const c = add(t, 'Image', box.id);
    updateWidgetSlot(t.cls, c.id, { sizeRule: 'Fill', fill: 3, hAlign: 'Center' });
    updateWidgetProps(t.cls, c.id, { sizeX: 40 });
    // 720 - 100 = 620 to share: 155 and 465.
    expect(rectOf(t.cls, a.id)).toEqual({ x: 0, y: 0, w: 1280, h: 100 });
    expect(rectOf(t.cls, b.id)).toEqual({ x: 10, y: 110, w: 1260, h: 135 });
    expect(rectOf(t.cls, c.id)).toEqual({ x: 620, y: 255, w: 40, h: 465 });
  });

  it('Collapsed takes no room, Hidden keeps its room; neither is drawn', () => {
    const t = hud();
    const box = add(t, 'HorizontalBox');
    const a = add(t, 'Spacer', box.id);
    updateWidgetProps(t.cls, a.id, { sizeX: 100 });
    const b = add(t, 'Image', box.id);
    updateWidgetProps(t.cls, a.id, { visibility: 2 });
    expect(rectOf(t.cls, b.id).x).toBe(100);
    expect(layoutWidgets(t.cls, DESIGN_W, DESIGN_H).find((l) => l.widget.id === a.id)!.drawn).toBe(false);
    updateWidgetProps(t.cls, a.id, { visibility: 1 });
    expect(rectOf(t.cls, b.id).x).toBe(0);
  });

  it('a Button centres its Text with its padding; Size To Content follows the text', () => {
    const t = hud();
    const canvas = add(t, 'CanvasPanel');
    const button = add(t, 'Button', canvas.id);
    updateWidgetSlot(t.cls, button.id, { offsets: [0, 0, 300, 100] });
    const label = add(t, 'TextBlock', button.id);
    const r = rectOf(t.cls, label.id);
    expect(r.x + r.w / 2).toBeCloseTo(150, 5);
    expect(r.y + r.h / 2).toBeCloseTo(50, 5);
    updateWidgetSlot(t.cls, button.id, { autoSize: true });
    const before = rectOf(t.cls, button.id).w;
    updateWidgetProps(t.cls, label.id, { text: 'Reprendre la partie' });
    expect(rectOf(t.cls, button.id).w).toBeGreaterThan(before);
  });

  it('a User Widget draws its own Widget Blueprint inside its slot', () => {
    const t = hud();
    const bar = t.pb.blueprint('WBP_Barre', 'UserWidget');
    const overlay = addWidget(t.p, bar.cls, 'Overlay');
    if (!overlay.ok) throw new Error(overlay.reason);
    const fill = addWidget(t.p, bar.cls, 'ProgressBar', overlay.value.id);
    if (!fill.ok) throw new Error(fill.reason);
    updateWidgetSlot(bar.cls, fill.value.id, { hAlign: 'Fill', vAlign: 'Fill' });
    const canvas = add(t, 'CanvasPanel');
    const placed = addWidget(t.p, t.cls, 'UserWidget', canvas.id, bar.cls.id);
    if (!placed.ok) throw new Error(placed.reason);
    updateWidgetSlot(t.cls, placed.value.id, { offsets: [100, 100, 400, 40] });
    const laid = layoutWidgets(t.cls, DESIGN_W, DESIGN_H, t.p);
    const inner = laid.find((l) => l.widget.id === fill.value.id)!;
    expect(inner.path).toBe(`${placed.value.id}/${fill.value.id}`);
    expect(inner.classId).toBe(bar.cls.id);
    expect(inner.rect).toEqual({ x: 100, y: 100, w: 400, h: 40 });
  });
});

describe('the Graph of a Widget Blueprint', () => {
  it('has its own events, and none of an actor', () => {
    const t = hud();
    const ctx = contextFor(t.cls, t.p);
    const keys = paletteEntries(ctx, t.b.graph).map((e) => e.def);
    expect(keys).toContain('event.construct');
    expect(keys).toContain('event.widgetTick');
    expect(keys).not.toContain('event.beginPlay');
    expect(keys).not.toContain('event.tick');
    expect(keys).not.toContain('timeline.node');
    const actor = t.pb.blueprint('BP_Lampe');
    const actorKeys = paletteEntries(contextFor(actor.cls, t.p), actor.graph).map((e) => e.def);
    expect(actorKeys).not.toContain('event.construct');
    expect(actorKeys).toContain('event.beginPlay');
  });

  it('Compile refuses an actor event in a widget and a widget event in an actor', () => {
    const t = hud();
    t.b.node('event.beginPlay');
    expect(errors(t.pb, t.b).join(' ')).toContain('Event Construct');
    const actor = t.pb.blueprint('BP_Lampe');
    actor.node('event.construct');
    expect(errors(t.pb, actor).join(' ')).toContain('Widget Blueprint');
  });

  it('a widget ticked Is Variable is a Get in the palette, typed by its class', () => {
    const t = hud();
    const canvas = add(t, 'CanvasPanel');
    const text = add(t, 'TextBlock', canvas.id);
    const ctx = () => contextFor(t.cls, t.p);
    expect(paletteEntries(ctx(), t.b.graph).some((e) => e.key === `widget:${text.id}`)).toBe(false);
    setWidgetIsVariable(t.cls, text.id, true);
    expect(paletteEntries(ctx(), t.b.graph).find((e) => e.key === `widget:${text.id}`)?.title).toBe('Get TextBlock');
    const get = t.b.node('var.widget', { widget: text.id });
    const pin = resolvePins(t.b.graph.nodes[get], ctx())[0];
    expect(pin.type).toEqual({ category: 'object', subtype: 'TextBlock' });
    setWidgetIsVariable(t.cls, text.id, false);
    expect(errors(t.pb, t.b).join(' ')).toContain('Is Variable');
  });

  it('Get Owning Player needs no Target in a widget, a wire elsewhere', () => {
    const t = hud();
    t.b.node('widget.getOwningPlayerPawn');
    expect(errors(t.pb, t.b)).toEqual([]);
    const actor = t.pb.blueprint('BP_Lampe');
    actor.node('widget.getOwningPlayerPawn');
    expect(errors(t.pb, actor).length).toBeGreaterThan(0);
  });

  it('cannot carry Actor Components', () => {
    const t = hud();
    const sante = t.pb.blueprint('BP_Sante', 'ActorComponent');
    expect(addActorComponent(t.p, t.cls, sante.cls.id).ok).toBe(false);
  });
});

describe('a Widget Blueprint in a game', () => {
  it('does not stop a game from running: it is not an actor of the level', () => {
    const t = hud();
    const canvas = add(t, 'CanvasPanel');
    add(t, 'TextBlock', canvas.id);
    t.b.node('event.construct');
    const s = new Simulation(t.p);
    for (let i = 0; i < 10; i++) s.step();
    expect(s.log.filter((l) => l.level === 'error')).toEqual([]);
    expect(s.actors.some((a) => a.classId === t.cls.id)).toBe(false);
  });
});

describe('saving a Widget Blueprint', () => {
  it('survives a save and a load (format 12, then 13)', () => {
    const t = hud();
    const canvas = add(t, 'CanvasPanel');
    add(t, 'TextBlock', canvas.id);
    const back = parseProject(serializeProject(t.p));
    expect(PROJECT_FORMAT).toBeGreaterThanOrEqual(12);
    expect(back.classes.find((c) => c.name === 'WBP_HUD')!.widgets).toEqual(t.cls.widgets);
  });

  it('repairs a damaged tree: orphans and second roots go, missing properties come back', () => {
    const t = hud();
    const canvas = add(t, 'CanvasPanel');
    const text = add(t, 'TextBlock', canvas.id);
    const file = JSON.parse(serializeProject(t.p));
    const w = file.project.classes.find((c: { name: string }) => c.name === 'WBP_HUD').widgets;
    delete w[1].props.fontSize;
    w.push({ id: 'x1', name: 'Orphelin', kind: 'Image', parent: 'nope', props: {}, slot: {} });
    w.push({ id: 'x2', name: 'Racine2', kind: 'Image', props: {}, slot: {} });
    const back = parseProject(JSON.stringify(file)).classes.find((c) => c.name === 'WBP_HUD')!;
    expect(back.widgets!.map((x) => x.id)).toEqual([canvas.id, text.id]);
    expect(back.widgets![1].props.fontSize).toBe(24);
  });

  it('opens a project of format 11 unchanged', () => {
    const t = hud();
    const file = JSON.parse(serializeProject(t.p));
    file.format = 11;
    file.project.format = 11;
    file.project.classes = file.project.classes.filter((c: { parent: string }) => c.parent !== 'UserWidget');
    expect(parseProject(JSON.stringify(file)).format).toBe(PROJECT_FORMAT);
  });
});
