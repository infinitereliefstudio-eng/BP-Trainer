/**
 * Widget Blueprint mutators: the Designer's actions on the widget tree (add
 * from the Palette, delete, rename, Is Variable, Wrap With, move in the
 * Hierarchy, Details) and the drag of a widget in a Canvas Panel.
 */
import { newId } from '../model/ids';
import { findClass, uniqueName, type BlueprintClass, type Graph, type Project } from '../model/project';
import {
  bindableProps,
  childCapacity,
  slotDefaults,
  stretchedX,
  stretchedY,
  widgetChildren,
  widgetPropsDefaults,
  widgetRoot,
  widgetSubtree,
  WIDGET_DEFAULT_NAME,
  WIDGET_LABEL,
  type BindableProp,
  type WidgetKind,
  type WidgetNode,
  type WidgetProps,
  type WidgetSlot,
} from '../model/widgets';
import { namesInUse, validateName } from './classOps';
import { addFunction, addFunctionParam } from './functionOps';
import { addNode, removeNodes, type OpResult } from './graphOps';

const ok = <T>(value: T): OpResult<T> => ({ ok: true, value });
const fail = (reason: string): OpResult<never> => ({ ok: false, reason });

export const widgetsOf = (cls: BlueprintClass): WidgetNode[] => (cls.widgets ??= []);

/** Size a new widget gets in a Canvas Panel (UE gives 100 × 30 to most). */
const CANVAS_SIZE: Partial<Record<WidgetKind, [number, number]>> = {
  TextBlock: [200, 40],
  ProgressBar: [200, 30],
  Button: [160, 50],
  Image: [100, 100],
  VerticalBox: [200, 200],
  HorizontalBox: [300, 60],
  Overlay: [200, 200],
  CanvasPanel: [300, 200],
  UserWidget: [300, 100],
};

/** Does Widget Blueprint `classId` show `target` somewhere in its tree (through User Widgets)? */
export function widgetClassContains(p: Project, classId: string, target: string, guard = 0): boolean {
  if (classId === target) return true;
  if (guard > 32) return true;
  const cls = findClass(p, classId);
  return (cls?.widgets ?? []).some((w) => w.kind === 'UserWidget' && !!w.classId && widgetClassContains(p, w.classId, target, guard + 1));
}

/**
 * Add a widget from the Palette. With no root yet it becomes the root, as in
 * UE5. Otherwise it goes into `target` when that is a panel (or an empty
 * Button), or next to `target` in its parent; with no target, into the root.
 */
export function addWidget(p: Project, cls: BlueprintClass, kind: WidgetKind, target?: string, classId?: string): OpResult<WidgetNode> {
  const list = widgetsOf(cls);
  if (kind === 'UserWidget') {
    const other = classId ? findClass(p, classId) : undefined;
    if (other?.parent !== 'UserWidget') return fail('Choisis un Widget Blueprint du projet.');
    if (widgetClassContains(p, other.id, cls.id)) return fail(`${other.name} ne peut pas être placé ici : il contient déjà ${cls.name} (ou c’est lui-même).`);
  }
  const name = uniqueName(kind === 'UserWidget' ? (findClass(p, classId ?? '')?.name ?? 'UserWidget') : WIDGET_DEFAULT_NAME[kind], namesInUse(cls));
  const make = (parent?: WidgetNode): WidgetNode => {
    const slot = slotDefaults(parent?.kind);
    if (parent?.kind === 'CanvasPanel') {
      const n = widgetChildren(list, parent.id).length;
      const [w, h] = CANVAS_SIZE[kind] ?? [100, 30];
      // One under the other, as they are touched in the Palette (UE places a widget where it is dropped).
      slot.offsets = [40, 40 + 70 * (n % 9), w, h];
    }
    return {
      id: newId('w'),
      name,
      kind,
      ...(parent ? { parent: parent.id } : {}),
      // UE ticks Is Variable on a new Button (it has events) and leaves it unticked on the others.
      isVariable: kind === 'Button',
      props: widgetPropsDefaults(kind),
      slot,
      ...(kind === 'UserWidget' ? { classId } : {}),
    };
  };
  const root = widgetRoot(list);
  if (!root) {
    const w = make();
    list.push(w);
    return ok(w);
  }
  const into = (parent: WidgetNode): OpResult<WidgetNode> | undefined => {
    const cap = childCapacity(parent.kind);
    if (cap === 'many' || (cap === 'one' && widgetChildren(list, parent.id).length === 0)) {
      const w = make(parent);
      // After the parent's last descendant: the list stays in tree order.
      const sub = widgetSubtree(list, parent.id);
      const last = sub[sub.length - 1];
      list.splice(list.indexOf(last) + 1, 0, w);
      return ok(w);
    }
    return undefined;
  };
  const t = target ? list.find((w) => w.id === target) : root;
  if (!t) return fail('Widget introuvable.');
  const inTarget = into(t);
  if (inTarget) return inTarget;
  // Next to the target, in its parent.
  const parent = t.parent ? list.find((w) => w.id === t.parent) : undefined;
  if (parent && childCapacity(parent.kind) === 'many') {
    const w = make(parent);
    const sub = widgetSubtree(list, t.id);
    list.splice(list.indexOf(sub[sub.length - 1]) + 1, 0, w);
    return ok(w);
  }
  if (t.kind === 'Button') return fail(`${t.name} contient déjà un enfant : un Button n’en prend qu’un. Mets d’abord une Horizontal Box dedans (Wrap With).`);
  if (!t.parent) return fail(`${t.name} est la racine et un ${WIDGET_LABEL[t.kind]} ne contient rien : enveloppe-le d’abord dans un panneau (Wrap With › Canvas Panel).`);
  return fail(`${WIDGET_LABEL[t.kind]} ne contient rien : choisis un panneau (Canvas Panel, Vertical Box…) dans la Hierarchy.`);
}

/** Delete a widget and its children; the Graph's nodes that read them go too. */
export function removeWidget(cls: BlueprintClass, id: string): OpResult {
  const list = widgetsOf(cls);
  const gone = new Set(widgetSubtree(list, id).map((w) => w.id));
  if (!gone.size) return fail('Widget introuvable.');
  cls.widgets = list.filter((w) => !gone.has(w.id));
  for (const g of cls.graphs) {
    removeNodes(
      g,
      Object.values(g.nodes)
        .filter((n) => (n.def === 'var.widget' || n.def === 'event.widgetButton') && gone.has(String(n.config.widget)))
        .map((n) => n.id),
    );
  }
  return ok(undefined);
}

export function renameWidget(cls: BlueprintClass, id: string, name: string): OpResult {
  const w = widgetsOf(cls).find((x) => x.id === id);
  if (!w) return fail('Widget introuvable.');
  const err = validateName(name, namesInUse(cls, id));
  if (err) return fail(err);
  if (/\s/.test(name.trim())) return fail("Un nom de widget ne peut pas contenir d'espace.");
  w.name = name.trim();
  return ok(undefined);
}

export function setWidgetIsVariable(cls: BlueprintClass, id: string, on: boolean): void {
  const w = widgetsOf(cls).find((x) => x.id === id);
  if (w) w.isVariable = on;
}

export function updateWidgetProps(cls: BlueprintClass, id: string, patch: Partial<WidgetProps>): void {
  const w = widgetsOf(cls).find((x) => x.id === id);
  if (w) Object.assign(w.props, patch);
}

export function updateWidgetSlot(cls: BlueprintClass, id: string, patch: Partial<WidgetSlot>): void {
  const w = widgetsOf(cls).find((x) => x.id === id);
  if (w) Object.assign(w.slot, patch);
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Anchors of a widget in a Canvas Panel. Given where it is now and its
 * panel, the offsets are rewritten so that it stays in place, as UE's
 * Designer does when an anchor preset is picked.
 */
export function setWidgetAnchors(cls: BlueprintClass, id: string, a: WidgetSlot['anchors'], rect?: Rect, panel?: Rect): void {
  const w = widgetsOf(cls).find((x) => x.id === id);
  if (!w) return;
  w.slot.anchors = { ...a };
  if (!rect || !panel) return;
  const o = w.slot.offsets;
  const ax0 = panel.x + a.minX * panel.w;
  const ax1 = panel.x + a.maxX * panel.w;
  const ay0 = panel.y + a.minY * panel.h;
  const ay1 = panel.y + a.maxY * panel.h;
  if (stretchedX(w.slot)) {
    o[0] = rect.x - ax0;
    o[2] = ax1 - (rect.x + rect.w);
  } else {
    o[0] = rect.x + w.slot.alignX * rect.w - ax0;
    o[2] = rect.w;
  }
  if (stretchedY(w.slot)) {
    o[1] = rect.y - ay0;
    o[3] = ay1 - (rect.y + rect.h);
  } else {
    o[1] = rect.y + w.slot.alignY * rect.h - ay0;
    o[3] = rect.h;
  }
  w.slot.offsets = o.map((v) => Math.round(v)) as WidgetSlot['offsets'];
}

/** The drag of a widget in a Canvas Panel, in design pixels. */
export function moveWidgetBy(cls: BlueprintClass, id: string, dx: number, dy: number): void {
  const w = widgetsOf(cls).find((x) => x.id === id);
  if (!w) return;
  const o = w.slot.offsets;
  o[0] += dx;
  if (stretchedX(w.slot)) o[2] -= dx;
  o[1] += dy;
  if (stretchedY(w.slot)) o[3] -= dy;
}

export function roundWidgetOffsets(cls: BlueprintClass, id: string): void {
  const w = widgetsOf(cls).find((x) => x.id === id);
  if (w) w.slot.offsets = w.slot.offsets.map((v) => Math.round(v)) as WidgetSlot['offsets'];
}

/** Up or down among its siblings (the Hierarchy's order is the drawing and layout order). */
export function moveWidgetOrder(cls: BlueprintClass, id: string, dir: -1 | 1): OpResult {
  const list = widgetsOf(cls);
  const w = list.find((x) => x.id === id);
  if (!w) return fail('Widget introuvable.');
  const sibs = widgetChildren(list, w.parent);
  const i = sibs.indexOf(w);
  const other = sibs[i + dir];
  if (!other) return fail(dir < 0 ? 'Déjà le premier.' : 'Déjà le dernier.');
  // Swap the two subtrees in the list.
  const a = widgetSubtree(list, (dir < 0 ? other : w).id);
  const b = widgetSubtree(list, (dir < 0 ? w : other).id);
  const start = list.indexOf(a[0]);
  list.splice(start, a.length + b.length, ...b, ...a);
  return ok(undefined);
}

/** Wrap With: a new panel takes the widget's place and slot, the widget goes inside it. */
export function wrapWidget(cls: BlueprintClass, id: string, kind: WidgetKind): OpResult<WidgetNode> {
  if (childCapacity(kind) === 'none') return fail(`${WIDGET_LABEL[kind]} ne peut rien contenir.`);
  const list = widgetsOf(cls);
  const w = list.find((x) => x.id === id);
  if (!w) return fail('Widget introuvable.');
  const panel: WidgetNode = {
    id: newId('w'),
    name: uniqueName(WIDGET_DEFAULT_NAME[kind], namesInUse(cls)),
    kind,
    ...(w.parent ? { parent: w.parent } : {}),
    isVariable: kind === 'Button',
    props: widgetPropsDefaults(kind),
    slot: w.slot,
  };
  list.splice(list.indexOf(w), 0, panel);
  w.parent = panel.id;
  w.slot = slotDefaults(kind);
  if (kind === 'CanvasPanel') w.slot.offsets = [0, 0, 100, 30];
  return ok(panel);
}

/** Move a widget into another panel (the Hierarchy's drag and drop). */
export function moveWidgetInto(cls: BlueprintClass, id: string, parentId: string): OpResult {
  const list = widgetsOf(cls);
  const w = list.find((x) => x.id === id);
  const parent = list.find((x) => x.id === parentId);
  if (!w || !parent) return fail('Widget introuvable.');
  if (widgetSubtree(list, id).some((x) => x.id === parentId)) return fail(`${w.name} ne peut pas aller dans un de ses propres enfants.`);
  const cap = childCapacity(parent.kind);
  if (cap === 'none') return fail(`${WIDGET_LABEL[parent.kind]} ne peut rien contenir.`);
  if (cap === 'one' && widgetChildren(list, parentId).some((x) => x.id !== id)) return fail(`${parent.name} contient déjà un enfant : un Button n’en prend qu’un.`);
  if (!w.parent) return fail('La racine ne se déplace pas : enveloppe-la plutôt (Wrap With).');
  const sub = widgetSubtree(list, id);
  for (const x of sub) list.splice(list.indexOf(x), 1);
  w.parent = parentId;
  w.slot = slotDefaults(parent.kind);
  if (parent.kind === 'CanvasPanel') {
    const [sw, sh] = CANVAS_SIZE[w.kind] ?? [100, 30];
    w.slot.offsets = [40, 40, sw, sh];
  }
  const after = widgetSubtree(list, parentId);
  list.splice(list.indexOf(after[after.length - 1]) + 1, 0, ...sub);
  return ok(undefined);
}

/** Widget Blueprints that place `classId` (User Widget): it cannot be deleted while they do. */
export function widgetUsers(p: Project, classId: string): BlueprintClass[] {
  return p.classes.filter((c) => (c.widgets ?? []).some((w) => w.kind === 'UserWidget' && w.classId === classId));
}

/**
 * Bindings whose function is gone, or no longer gives a value (no output),
 * are dropped, as UE shows them broken and clears them at compile.
 */
export function pruneBindings(cls: BlueprintClass): void {
  for (const w of cls.widgets ?? []) {
    if (!w.bindings) continue;
    for (const [prop, graphId] of Object.entries(w.bindings)) {
      const g = cls.graphs.find((x) => x.id === graphId);
      if (!g?.fn?.outputs.length) delete w.bindings[prop as keyof typeof w.bindings];
    }
    if (!Object.keys(w.bindings).length) delete w.bindings;
  }
}

/** Functions of the Widget Blueprint that a property can be bound to: no input, a Return Value of its type (UE's Bind menu). */
export function bindingCandidates(cls: BlueprintClass, kind: WidgetKind, prop: BindableProp): Graph[] {
  const spec = bindableProps(kind).find((s) => s.prop === prop);
  if (!spec) return [];
  return cls.graphs.filter((g) => {
    const out = g.fn?.outputs[0];
    return g.kind === 'function' && !g.iface && !g.fn!.inputs.length && out && out.type.category === spec.type.category && (out.type.subtype ?? undefined) === spec.type.subtype && !out.type.container;
  });
}

/** Bind a property to a function (or unbind it with undefined). */
export function setWidgetBinding(cls: BlueprintClass, id: string, prop: BindableProp, graphId: string | undefined): OpResult {
  const w = widgetsOf(cls).find((x) => x.id === id);
  if (!w) return { ok: false, reason: 'Widget introuvable.' };
  if (!bindableProps(w.kind).some((s) => s.prop === prop)) return { ok: false, reason: 'Cette propriété ne se lie pas.' };
  if (graphId === undefined) {
    if (w.bindings) delete w.bindings[prop];
    if (w.bindings && !Object.keys(w.bindings).length) delete w.bindings;
    return { ok: true, value: undefined };
  }
  if (!bindingCandidates(cls, w.kind, prop).some((g) => g.id === graphId)) return { ok: false, reason: 'Cette fonction ne convient pas : il lui faut une Return Value du bon type, et aucune entrée.' };
  w.bindings = { ...w.bindings, [prop]: graphId };
  return { ok: true, value: undefined };
}

/**
 * Create Binding, as UE's Bind menu: a pure function GetText_0 (Get +
 * property, numbered), its Return Node wired, then the property bound to it.
 */
export function createWidgetBinding(p: Project, cls: BlueprintClass, id: string, prop: BindableProp): OpResult<Graph> {
  const w = widgetsOf(cls).find((x) => x.id === id);
  const spec = w && bindableProps(w.kind).find((s) => s.prop === prop);
  if (!w || !spec) return { ok: false, reason: 'Cette propriété ne se lie pas.' };
  const names = cls.graphs.map((g) => g.name);
  let n = 0;
  while (names.includes(`${spec.fnName}_${n}`)) n++;
  const g = addFunction(cls, `${spec.fnName}_${n}`);
  g.fn!.pure = true;
  g.fn!.description = `Liaison (Binding) de ${spec.label} de ${w.name} : appelée à chaque image.`;
  addFunctionParam(p, cls, g.id, 'outputs', { category: spec.type.category, subtype: spec.type.subtype });
  const ret = Object.values(g.nodes).find((x) => x.def === 'fn.return');
  const param = g.fn!.outputs[0];
  // Start from the Designer's own value, as UE's generated function does.
  if (ret && param) ret.defaults[param.id] = prop === 'visibility' ? w.props.visibility : (w.props[prop] as string | number);
  w.bindings = { ...w.bindings, [prop]: g.id };
  return { ok: true, value: g };
}

/**
 * The + of a Button's event in Details (On Clicked…): the event node in the
 * Event Graph, made below the others if it is not there yet, as UE does.
 */
export function addButtonEvent(cls: BlueprintClass, id: string, event: 'clicked' | 'pressed' | 'released'): OpResult<{ graphId: string; nodeId: string }> {
  const w = widgetsOf(cls).find((x) => x.id === id);
  if (w?.kind !== 'Button') return { ok: false, reason: 'Ce widget n’est pas un Button.' };
  if (!w.isVariable) return { ok: false, reason: `Coche d’abord Is Variable sur ${w.name} : ses événements en dépendent.` };
  const g = cls.graphs.find((x) => x.kind === 'event');
  if (!g) return { ok: false, reason: 'Pas d’Event Graph.' };
  const found = Object.values(g.nodes).find((n) => n.def === 'event.widgetButton' && n.config.widget === id && n.config.event === event);
  if (found) return { ok: true, value: { graphId: g.id, nodeId: found.id } };
  const bottom = Math.max(0, ...Object.values(g.nodes).map((n) => n.y + 200));
  const r = addNode(g, 'event.widgetButton', 64, bottom, { widget: id, event });
  if (!r.ok) return r;
  return { ok: true, value: { graphId: g.id, nodeId: r.value.id } };
}
