/**
 * Helpers of the UMG steps (V7.36): build a Widget Blueprint's Designer in
 * code, find the Player Controller's BeginPlay chain, and read what the
 * screen shows (widgets in the viewport, their texts) for the checks.
 */
import type { BlueprintClass, ParentClass, Project } from '../../model/project';
import type { WidgetKind, WidgetNode, WidgetProps, WidgetSlot } from '../../model/widgets';
import { addClass } from '../../operations/projectOps';
import { addButtonEvent, addWidget, setWidgetIsVariable, updateWidgetProps, updateWidgetSlot } from '../../operations/widgetOps';
import { ClassBuilder, edit } from '../builder';
import type { CheckContext } from '../types';
import { PLAYER_CONTROLLER } from '../ue5Input';
import { nodeOf } from './kit';

export interface WidgetSpec {
  name?: string;
  isVariable?: boolean;
  props?: Partial<WidgetProps>;
  slot?: Partial<WidgetSlot>;
}

/** A new Blueprint in an existing project (a reference solution that creates one). */
export function newClass(p: Project, name: string, parent: ParentClass): ClassBuilder {
  const r = addClass(p, name, parent);
  if (!r.ok) throw new Error(r.reason);
  return new ClassBuilder(r.value, p);
}

/** Add a widget to a Widget Blueprint's Designer (inside `parent`, or as the root). */
export function addW(p: Project, cls: BlueprintClass, kind: WidgetKind, parent: string | undefined, spec: WidgetSpec = {}): WidgetNode {
  const r = addWidget(p, cls, kind, parent);
  if (!r.ok) throw new Error(r.reason);
  const w = r.value;
  if (spec.name) w.name = spec.name;
  if (spec.isVariable !== undefined) setWidgetIsVariable(cls, w.id, spec.isVariable);
  if (spec.props) updateWidgetProps(cls, w.id, spec.props);
  if (spec.slot) updateWidgetSlot(cls, w.id, spec.slot);
  return w;
}

/** A Canvas Panel slot anchored at the centre of the screen: `x, y` from the centre to the widget's centre. */
export const centred = (x: number, y: number, w: number, h: number): Partial<WidgetSlot> => ({
  anchors: { minX: 0.5, minY: 0.5, maxX: 0.5, maxY: 0.5 },
  offsets: [x, y, w, h],
  alignX: 0.5,
  alignY: 0.5,
});

/** A centred panel of a menu: a dark Image, a title and the Text inside a Button, as a Designer would place them. */
export function menuPanel(p: Project, cls: BlueprintClass, title: string, colors: { back: string; title?: string } = { back: '#111827' }): string {
  const canvas = addW(p, cls, 'CanvasPanel', undefined);
  addW(p, cls, 'Image', canvas.id, { name: 'Img_Fond', props: { color: colors.back }, slot: centred(0, 0, 520, 400) });
  addW(p, cls, 'TextBlock', canvas.id, {
    name: 'Txt_Titre',
    props: { text: title, fontSize: 34, justification: 'Center', ...(colors.title ? { color: colors.title } : {}) },
    slot: centred(0, -140, 480, 64),
  });
  return canvas.id;
}

/** A Button with a Text inside it, in a Canvas Panel, centred `x, y` from the screen's centre (size 280 × 72). */
export function button(p: Project, cls: BlueprintClass, canvas: string, name: string, label: string, x: number, y: number): WidgetNode {
  const btn = addW(p, cls, 'Button', canvas, { name, slot: centred(x, y, 280, 72) });
  addW(p, cls, 'TextBlock', btn.id, { name: `Txt_${name.replace(/^Btn_/, '')}`, props: { text: label, fontSize: 20, color: '#111827' } });
  return btn;
}

/** A widget of a class by name. */
export const widgetNamed = (cls: BlueprintClass, name: string): WidgetNode => {
  const w = (cls.widgets ?? []).find((x) => x.name === name);
  if (!w) throw new Error(`No widget ${name} in ${cls.name}`);
  return w;
};

/** On Clicked (or Pressed, Released) of a Button: the event node, in the class's Event Graph. */
export function onButton(b: ClassBuilder, buttonName: string, event: 'clicked' | 'pressed' | 'released' = 'clicked'): string {
  const r = addButtonEvent(b.cls, widgetNamed(b.cls, buttonName).id, event);
  if (!r.ok) throw new Error(r.reason);
  return r.value.nodeId;
}

/** The Get node of a widget ticked Is Variable. */
export const getW = (b: ClassBuilder, name: string, at: [number, number]): string => b.node('var.widget', { widget: widgetNamed(b.cls, name).id }, {}, at);

/** BP_PlayerController and the last node of its BeginPlay chain (Add Mapping Context), to go on from. */
export function controller(p: Project): { b: ClassBuilder; last: string } {
  const b = edit(p, PLAYER_CONTROLLER);
  return { b, last: nodeOf(b.graph, 'input.addMappingContext') };
}

/** The id of an Input Action by name. */
export function actionId(p: Project, name: string): string {
  const a = p.inputActions.find((x) => x.name === name);
  if (!a) throw new Error(`No Input Action ${name}`);
  return a.id;
}

// ----------------------------------------------------------------- checks

/** Widget objects of a class, created so far (on the screen or not). */
export const made = (cx: CheckContext, className: string) => cx.sim.umg.widgetObjects().filter((o) => o.className === className && !o.widget?.placedIn);

/** Widget objects of a class in the viewport now. */
export const shown = (cx: CheckContext, className: string) => cx.sim.umg.viewport().filter((o) => o.className === className);

/** Widget objects in the viewport, whatever their class. */
export const anyShown = (cx: CheckContext) => cx.sim.umg.viewport();

/** The texts the screen draws now, front to back order ignored. */
export function screenTexts(cx: CheckContext): string[] {
  return cx.sim.umg
    .layer(1280)
    .flatMap((s) => s.laid)
    .filter((l) => l.widget.kind === 'TextBlock' && l.drawn)
    .map((l) => String(l.props.text ?? ''));
}

/** The Widget Blueprints of the project. */
export const widgetClasses = (cx: CheckContext) => cx.project.classes.filter((c) => c.parent === 'UserWidget');

/** « 2 menus à l’écran » and the like. */
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;

/** Why a touch on a button was ignored, in the lesson's words, if one was. */
export function ignoredTouch(cx: CheckContext, button: string): string | undefined {
  const t = cx.sim.record.ignoredTouches.find((x) => x.button.endsWith(`/${button}`));
  if (!t) return undefined;
  if (t.reason === 'gameOnly')
    return `Le toucher sur ${button} a été ignoré : le jeu est en Game Only, les boutons ne reçoivent rien. Set Input Mode UI Only (ou Game and UI) en ouvrant le menu.`;
  if (t.reason === 'disabled') return `${button} est désactivé (Is Enabled décoché) : il prend le toucher sans répondre.`;
  return `Le toucher sur ${button} a été pris par un widget posé par-dessus (Visibility Visible).`;
}

/** Is the cursor shown and are the buttons reachable? « Game and UI », « UI Only ». */
export const modeLabel = (cx: CheckContext) => (cx.sim.inputMode === 'UIOnly' ? 'UI Only' : cx.sim.inputMode === 'GameAndUI' ? 'Game and UI' : 'Game Only');

/** A property of a widget of the Designer as the screen draws it now (the first one of that name on the screen). */
export function drawnProp(cx: CheckContext, widgetName: string): (WidgetProps & { drawn: boolean }) | undefined {
  for (const s of cx.sim.umg.layer(1280)) {
    const l = s.laid.find((x) => x.widget.name === widgetName);
    if (l) return { ...(l.props as WidgetProps), drawn: l.drawn };
  }
  return undefined;
}

/** « 60 % » for a Percent of 0.6. */
export const pct = (v: number | undefined) => (v === undefined ? '?' : `${Math.round(v * 100)} %`);

/** Does a Widget Blueprint update itself the UE way: no Binding, no Event Tick? Why not, if it does not. */
export function eventDriven(cx: CheckContext, className: string): true | string {
  const cls = cx.project.classes.find((c) => c.name === className);
  if (!cls) return `${className} a disparu.`;
  const bound = (cls.widgets ?? []).filter((w) => w.bindings && Object.keys(w.bindings).length);
  if (bound.length) {
    const calls = Object.entries(cx.sim.umg.bindingCalls)
      .filter(([k]) => bound.some((w) => k.includes(`:${w.id}:`)))
      .reduce((a, [, n]) => a + n, 0);
    return `${bound.map((w) => w.name).join(', ')} ${bound.length > 1 ? 'ont' : 'a'} encore un Binding : sa fonction a été appelée ${calls} fois pendant le test, à chaque image. Retire-le (menu Bind › Remove Binding) et mets à jour sur l’événement.`;
  }
  if (cls.graphs.some((g) => Object.values(g.nodes).some((n) => n.def === 'event.widgetTick')))
    return `${className} utilise Event Tick : la mise à jour tourne à chaque image, même quand rien ne change. Abonne-toi plutôt à l’Event Dispatcher.`;
  return true;
}
