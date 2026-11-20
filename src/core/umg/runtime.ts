/**
 * UMG while the game runs: the widget objects made by Create Widget, the
 * viewport they are added to, and their life cycle, as in UE.
 *
 * - Create Widget makes the object (and one for each User Widget placed in
 *   its Designer): Event On Initialized runs once, there.
 * - Add to Viewport puts it on the screen: Event Pre Construct then Event
 *   Construct, children first, each time it is added. Remove from Parent
 *   takes it off: Event Destruct. The object stays valid and can come back.
 * - Each frame on the screen: its Event Tick (even while the game is paused),
 *   then its Bindings, polled like Slate does.
 *
 * Widgets ticked Is Variable get an object of their own (Target of Set
 * Text…); their properties, like everything the game changes, live in the
 * widget object's `state`, over the Designer's values. No DOM here: the UI
 * draws `layer()` with the layout of core/umg/layout.
 */
import { findClass, type BlueprintClass, type Project } from '../model/project';
import { bindableProps, isPanel, slotDefaults, VIS_COLLAPSED, VIS_HIDDEN, VIS_HIT_TEST_INVISIBLE, VIS_SELF_HIT_TEST_INVISIBLE, VIS_VISIBLE, WIDGET_CLASS, widgetChildren, widgetPropsDefaults, widgetRoot, type WidgetNode, type WidgetProps } from '../model/widgets';
import { blank, createActor } from '../runtime/actorFactory';
import { nextId } from '../runtime/journal';
import { isRef, type ActorRT, type RValue } from '../runtime/world';
import { DESIGN_H, layoutWidgets, type LaidOutWidget } from './layout';

/** An event to run on a widget object, in this order (the caller runs them as synchronous calls). */
export interface UmgEvent {
  obj: ActorRT;
  def: 'event.onInitialized' | 'event.preConstruct' | 'event.construct' | 'event.destruct';
  outputs: Record<string, RValue>;
}

/** What the runtime needs from the simulation. */
export interface UmgHost {
  readonly project: Project;
  readonly objects: ActorRT[];
  objectById(id: string): ActorRT | undefined;
  /** The next UE-style object name for a class (WBP_HUD_C_0…). */
  newObjectName(cls: BlueprintClass): string;
  /** A Warning line of the Output Log. */
  warning(text: string): void;
  /** Run a function graph of `obj` to its end and give its outputs (a Binding). */
  evaluate(obj: ActorRT, graphId: string): Record<string, RValue>;
  /** The Widget Blueprint of an object, as written (widgets are not inherited). */
  classOf(obj: ActorRT): BlueprintClass | undefined;
}

/** One widget added to the viewport, laid out on a screen 720 units high. */
export interface ScreenWidget {
  obj: ActorRT;
  laid: LaidOutWidget[];
}

type Target = { obj: ActorRT; id: string } | { obj: ActorRT; self: true };

/**
 * What is under a touch, as Slate finds it: the top widget that takes touches
 * (Visible), then up its parents to a Button. Not a Button: the touch stops
 * there all the same (an Image over a button takes its touch).
 */
export type WidgetHit =
  | { kind: 'none' }
  | { kind: 'button'; obj: ActorRT; id: string; name: string; path: string; enabled: boolean }
  /** Taken by a widget that is not a button, over a button (`under`). */
  | { kind: 'blocked'; by: string; under: string };

function lastIndex<T>(list: T[], ok: (x: T) => boolean): number {
  for (let i = list.length - 1; i >= 0; i--) if (ok(list[i])) return i;
  return -1;
}

const inside = (r: { x: number; y: number; w: number; h: number }, x: number, y: number) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

const ref = (o: ActorRT): RValue => ({ ref: 'actor', id: o.id });

export class Umg {
  /** Grows each time something on the screen may have changed, so the UI redraws only then. */
  version = 0;
  /** Calls of each Binding: "object:widget:prop" → count (shown by the debugger). */
  readonly bindingCalls: Record<string, number> = {};
  private added = 0;
  /** The Button held down by a finger: its widget object and id, and its layout path (drawn pressed). */
  pressed?: { obj: string; id: string; path: string };

  constructor(private readonly host: UmgHost) {}

  // ------------------------------------------------------------ objects

  /** Widget objects, the ones placed inside others included (not the Is Variable widgets). */
  widgetObjects(): ActorRT[] {
    return this.host.objects.filter((o) => o.widget);
  }

  /** The viewport, back to front: Z-Order, then the order of Add to Viewport. */
  viewport(): ActorRT[] {
    return this.widgetObjects()
      .filter((o) => o.widget!.inViewport)
      .sort((a, b) => a.widget!.zOrder - b.widget!.zOrder || a.widget!.addedAt - b.widget!.addedAt);
  }

  private get(id: string | undefined): ActorRT | undefined {
    return id ? this.host.objectById(id) : undefined;
  }

  private tree(obj: ActorRT): WidgetNode[] {
    return this.host.classOf(obj)?.widgets ?? [];
  }

  /**
   * Create Widget: the object of a Widget Blueprint, and one for each User
   * Widget placed in its Designer. Returns the events On Initialized to run
   * (the inner widgets first), or null when the class is not a Widget Blueprint.
   */
  create(classId: string, owner: string | null): { obj: ActorRT; events: UmgEvent[] } | null {
    const cls = findClass(this.host.project, classId);
    if (cls?.parent !== 'UserWidget') return null;
    const events: UmgEvent[] = [];
    const obj = this.make(cls, owner, events, 0);
    return { obj, events };
  }

  private make(cls: BlueprintClass, owner: string | null, events: UmgEvent[], depth: number): ActorRT {
    const name = this.host.newObjectName(cls);
    const obj = createActor(`wgt_${nextId()}`, name, name, cls, {});
    obj.widget = { owner, state: {}, nested: {}, children: {}, inViewport: false, zOrder: 0, addedAt: 0, onScreen: false, broken: {} };
    obj.widgetRefs = {};
    this.host.objects.push(obj);
    for (const w of cls.widgets ?? []) {
      if (w.kind === 'UserWidget') {
        const inner = w.classId && depth < 8 ? findClass(this.host.project, w.classId) : undefined;
        if (inner?.parent !== 'UserWidget') continue;
        const child = this.make(inner, owner, events, depth + 1);
        child.widget!.placedIn = { obj: obj.id, id: w.id };
        obj.widget.nested[w.id] = child.id;
        obj.widgetRefs[w.id] = ref(child);
      } else if (w.isVariable) {
        const el = blank(`wel_${nextId()}`, w.name, w.name, WIDGET_CLASS[w.kind]);
        el.widgetEl = { host: obj.id, id: w.id };
        this.host.objects.push(el);
        obj.widgetRefs[w.id] = ref(el);
      }
    }
    events.push({ obj, def: 'event.onInitialized', outputs: {} });
    return obj;
  }

  /** What a reference points at for a widget function: a widget of a Designer, or a widget object itself. */
  target(o: ActorRT): Target | undefined {
    if (o.widgetEl) {
      const host = this.get(o.widgetEl.host);
      return host ? { obj: host, id: o.widgetEl.id } : undefined;
    }
    return o.widget ? { obj: o, self: true } : undefined;
  }

  /** The Designer's widget behind a target ('self' of an object: none). */
  private node(t: Target): WidgetNode | undefined {
    return 'id' in t ? this.tree(t.obj).find((w) => w.id === t.id) : undefined;
  }

  // ------------------------------------------------------------ properties

  /** A property as the game sees it now: what was set, else the Designer's value. */
  prop<K extends keyof WidgetProps>(t: Target, key: K): WidgetProps[K] {
    const w = this.node(t);
    const st = 'id' in t ? t.obj.widget!.state[t.id] : t.obj.widget!.state[''];
    return (st?.[key] ?? (w ? w.props[key] : widgetPropsDefaults('UserWidget')[key])) as WidgetProps[K];
  }

  /**
   * Set a property (Set Text…). As in UE, a Set on a bound property stops
   * its Binding; a Binding writing its own value does not.
   */
  setProp(t: Target, patch: Partial<WidgetProps>, fromBinding = false): void {
    const w = this.node(t);
    // A User Widget placed in a Designer is an object of its own: its visibility is its own.
    if (w?.kind === 'UserWidget') {
      const inner = this.get(t.obj.widget!.nested[w.id]);
      if (inner) {
        this.setProp({ obj: inner, self: true }, patch, fromBinding);
        return;
      }
    }
    const key = 'id' in t ? t.id : '';
    t.obj.widget!.state[key] ??= {};
    const st = t.obj.widget!.state[key];
    for (const [k, v] of Object.entries(patch) as [keyof WidgetProps, WidgetProps[keyof WidgetProps]][]) {
      if (!fromBinding) t.obj.widget!.broken[`${key}:${k}`] = true;
      if (st[k] === v) continue;
      (st as Record<string, unknown>)[k] = v;
      this.version++;
    }
  }

  // ------------------------------------------------------------ screen

  /** Is the object on the screen: in the viewport, or inside a widget that is. */
  private shown(o: ActorRT, guard = 0): boolean {
    const w = o.widget;
    if (!w || guard > 16) return false;
    if (w.inViewport) return true;
    if (w.parent) {
      const p = this.get(w.parent.obj);
      return !!p && this.shown(p, guard + 1);
    }
    if (w.placedIn) {
      const p = this.get(w.placedIn.obj);
      return !!p && !p.widget!.state[w.placedIn.id]?.removed && this.shown(p, guard + 1);
    }
    return false;
  }

  /** The object then the widgets shown inside it (placed in its Designer, added to its panels), depth first. */
  subtree(o: ActorRT, out: ActorRT[] = [], guard = 0): ActorRT[] {
    if (!o.widget || guard > 16 || out.includes(o)) return out;
    out.push(o);
    for (const c of this.innerOf(o)) this.subtree(c, out, guard + 1);
    return out;
  }

  /** The widgets shown inside an object, then the object: the order Slate builds them in (inner first, siblings in tree order). */
  private built(o: ActorRT): ActorRT[] {
    const pre = this.subtree(o);
    const out: ActorRT[] = [];
    const visit = (x: ActorRT, guard: number) => {
      if (guard > 16) return;
      for (const c of this.innerOf(x)) if (pre.includes(c) && !out.includes(c)) visit(c, guard + 1);
      if (!out.includes(x)) out.push(x);
    };
    visit(o, 0);
    return out;
  }

  /** The widget objects shown directly inside an object: placed in its Designer, added to its panels, in tree order. */
  private innerOf(o: ActorRT): ActorRT[] {
    const out: ActorRT[] = [];
    if (!o.widget) return out;
    for (const w of this.tree(o)) {
      const inner = w.kind === 'UserWidget' ? this.get(o.widget.nested[w.id]) : undefined;
      if (inner) out.push(inner);
      for (const id of o.widget.children[w.id] ?? []) {
        const c = this.get(id);
        if (c) out.push(c);
      }
    }
    return out;
  }

  /**
   * After a change of the screen: Destruct for what left it (outer widget
   * first), Pre Construct then Construct for what came (inner widgets first,
   * siblings in tree order, as Slate builds them).
   */
  private sync(around: ActorRT[]): UmgEvent[] {
    const objs = [...new Set(around.flatMap((o) => this.subtree(o)))];
    const events: UmgEvent[] = [];
    const leaving = objs.filter((o) => o.widget!.onScreen && !this.shown(o));
    const coming = [...new Set(around.flatMap((o) => this.built(o)))].filter((o) => !o.widget!.onScreen && this.shown(o));
    for (const o of leaving) {
      o.widget!.onScreen = false;
      events.push({ obj: o, def: 'event.destruct', outputs: {} });
    }
    for (const o of coming) {
      o.widget!.onScreen = true;
      // A widget shown again polls its Bindings anew.
      events.push({ obj: o, def: 'event.preConstruct', outputs: { designTime: false } }, { obj: o, def: 'event.construct', outputs: {} });
    }
    if (leaving.length || coming.length) this.version++;
    return events;
  }

  /** Add to Viewport. A second add only warns, as UE does. */
  addToViewport(o: ActorRT, zOrder: number): UmgEvent[] {
    const w = o.widget!;
    if (w.inViewport) {
      this.host.warning(`The widget '${o.objectName}' was already added to the screen.`);
      return [];
    }
    if (w.parent || w.placedIn) {
      this.host.warning(`The widget '${o.objectName}' already has a parent widget. It can't also be added to the viewport!`);
      return [];
    }
    w.inViewport = true;
    w.zOrder = Math.trunc(zOrder);
    w.addedAt = ++this.added;
    this.version++;
    return this.sync([o]);
  }

  /** Remove from Parent: off the viewport, or out of the panel it was in. Nothing if it is nowhere. */
  removeFromParent(t: Target): UmgEvent[] {
    if ('id' in t) {
      // A widget of a Designer: it leaves its panel (UE removes it from the widget tree).
      t.obj.widget!.state[t.id] ??= {};
      const st = t.obj.widget!.state[t.id];
      if (st.removed) return [];
      st.removed = true;
      this.version++;
      const inner = this.get(t.obj.widget!.nested[t.id]);
      if (!inner) return [];
      // As in UE, the User Widget leaves the tree: no parent any more, it can go to the viewport or another panel.
      delete t.obj.widget!.nested[t.id];
      inner.widget!.placedIn = undefined;
      return this.sync([inner]);
    }
    const o = t.obj;
    const w = o.widget!;
    if (w.inViewport) {
      w.inViewport = false;
      this.version++;
      return this.sync([o]);
    }
    if (w.parent) return this.detach(o);
    if (w.placedIn) return this.removeFromParent({ obj: this.get(w.placedIn.obj)!, id: w.placedIn.id });
    return [];
  }

  private detach(o: ActorRT): UmgEvent[] {
    const p = o.widget!.parent!;
    const host = this.get(p.obj);
    if (host) host.widget!.children[p.panel] = (host.widget!.children[p.panel] ?? []).filter((id) => id !== o.id);
    o.widget!.parent = undefined;
    this.version++;
    return this.sync([o]);
  }

  isInViewport(o: ActorRT): boolean {
    return !!o.widget?.inViewport;
  }

  // ------------------------------------------------------------ panels

  /**
   * Add Child to Vertical Box (or Horizontal Box): `content` goes at the end
   * of the panel, leaving the viewport or the panel it was in, as UE's
   * AddChild does. Only widget objects (Create Widget) can be added here.
   */
  addChild(panel: Target, content: ActorRT): { ok: true; events: UmgEvent[] } | { ok: false; reason: string } {
    if (!('id' in panel)) return { ok: false, reason: 'Target doit être un panneau (Vertical Box…), pas un widget entier.' };
    if (!content.widget) return { ok: false, reason: `${content.label} est un widget d’un Designer : dans cette version, Add Child ne prend qu’un widget créé par Create Widget.` };
    if (content.id === panel.obj.id || this.subtree(content).includes(panel.obj)) return { ok: false, reason: `${content.objectName} ne peut pas être ajouté dans lui-même.` };
    const events: UmgEvent[] = [];
    const cw = content.widget;
    if (cw.inViewport) {
      cw.inViewport = false;
      events.push(...this.sync([content]));
    } else if (cw.parent) {
      events.push(...this.detach(content));
    } else if (cw.placedIn) {
      return { ok: false, reason: `${content.objectName} est placé dans le Designer d’un autre widget : dans cette version, il ne peut pas changer de parent.` };
    }
    panel.obj.widget!.children[panel.id] ??= [];
    panel.obj.widget!.children[panel.id].push(content.id);
    cw.parent = { obj: panel.obj.id, panel: panel.id };
    this.version++;
    events.push(...this.sync([content]));
    return { ok: true, events };
  }

  /** The children of a panel as the game sees them: its Designer's (not removed), then the added ones. */
  childrenOf(panel: Target): ActorRT[] | undefined {
    const w = this.node(panel);
    if (!('id' in panel) || !w || !isPanel(w.kind)) return undefined;
    const st = panel.obj.widget!.state;
    const own: ActorRT[] = [];
    for (const c of widgetChildren(this.tree(panel.obj), w.id)) {
      if (st[c.id]?.removed) continue;
      const r = panel.obj.widgetRefs?.[c.id];
      const o = isRef(r) && r.ref === 'actor' ? this.get(r.id) : undefined;
      // A widget not ticked Is Variable has no object: it still counts.
      own.push(o ?? blank('', c.name, c.name, WIDGET_CLASS[c.kind]));
    }
    const added = (panel.obj.widget!.children[panel.id] ?? []).map((id) => this.get(id)).filter((o): o is ActorRT => !!o);
    return [...own, ...added];
  }

  /** Remove Child: true if `content` was in the panel. */
  removeChild(panel: Target, content: ActorRT): { found: boolean; events: UmgEvent[] } {
    if (!('id' in panel)) return { found: false, events: [] };
    if (content.widget?.parent?.obj === panel.obj.id && content.widget.parent.panel === panel.id) return { found: true, events: this.detach(content) };
    const t = this.target(content);
    const w = t && this.node(t);
    if (t && 'id' in t && t.obj === panel.obj && w?.parent === panel.id && !t.obj.widget!.state[t.id]?.removed) {
      return { found: true, events: this.removeFromParent(t) };
    }
    return { found: false, events: [] };
  }

  /** Clear Children: the panel empties, its Designer's children included, as in UE. */
  clearChildren(panel: Target): UmgEvent[] {
    if (!('id' in panel)) return [];
    const events: UmgEvent[] = [];
    const w = this.node(panel);
    for (const c of w ? widgetChildren(this.tree(panel.obj), w.id) : []) events.push(...this.removeFromParent({ obj: panel.obj, id: c.id }));
    for (const id of [...(panel.obj.widget!.children[panel.id] ?? [])]) {
      const o = this.get(id);
      if (o) events.push(...this.detach(o));
    }
    return events;
  }

  // ------------------------------------------------------------ frame

  /** Widget objects on the screen now, outer widgets first. */
  onScreen(): ActorRT[] {
    return this.viewport().flatMap((o) => this.subtree(o)).filter((o) => o.widget!.onScreen);
  }

  /** The Visibility a widget of a Designer has now: set by the game, else the Designer's (a placed User Widget: its object's own). */
  private visibilityOf(o: ActorRT, w: WidgetNode): number {
    const inner = w.kind === 'UserWidget' ? this.get(o.widget!.nested[w.id]) : undefined;
    return inner?.widget?.state['']?.visibility ?? o.widget!.state[w.id]?.visibility ?? w.props.visibility;
  }

  /** A widget of a Designer and every parent up to the root are neither Collapsed nor Hidden, nor removed. */
  private nodeDrawn(o: ActorRT, id: string | undefined): boolean {
    const list = this.tree(o);
    for (let cur = id, guard = 0; cur && guard < 64; guard++) {
      const w = list.find((x) => x.id === cur);
      if (!w) return true;
      const v = this.visibilityOf(o, w);
      if (v === VIS_COLLAPSED || v === VIS_HIDDEN || o.widget!.state[cur]?.removed) return false;
      cur = w.parent;
    }
    return true;
  }

  /**
   * Is the widget object painted now: on the screen, and neither it, its
   * root, nor anything it sits in is Collapsed or Hidden. Slate does not
   * paint the others, so they do not tick and their Bindings are not read.
   */
  drawn(o: ActorRT, guard = 0): boolean {
    const w = o.widget;
    if (!w?.onScreen || guard > 16) return false;
    const self = w.state['']?.visibility;
    if (self === VIS_COLLAPSED || self === VIS_HIDDEN) return false;
    const root = widgetRoot(this.tree(o));
    if (root && !this.nodeDrawn(o, root.id)) return false;
    if (w.inViewport) return true;
    const host = this.get(w.parent?.obj ?? w.placedIn?.obj);
    return !!host && this.drawn(host, guard + 1) && this.nodeDrawn(host, w.parent?.panel ?? w.placedIn?.id);
  }

  /** Widget objects whose Event Tick runs this frame: the ones painted. */
  ticking(): ActorRT[] {
    return this.onScreen().filter((o) => this.drawn(o));
  }

  /**
   * Bindings: every frame, the function bound to each property of a painted
   * widget is called and its Return Value shown, unless a Set on that
   * property stopped it. A widget's own Visibility is read as long as its
   * parent is painted (that is how it can come back).
   */
  pollBindings(): void {
    for (const o of this.onScreen()) {
      if (!this.drawn(o)) continue;
      for (const w of this.tree(o)) {
        if (!w.bindings || o.widget!.state[w.id]?.removed) continue;
        const parentDrawn = this.nodeDrawn(o, w.parent);
        const selfDrawn = parentDrawn && this.nodeDrawn(o, w.id);
        for (const spec of bindableProps(w.kind)) {
          const graphId = w.bindings[spec.prop];
          if (!graphId || o.widget!.broken[`${w.id}:${spec.prop}`]) continue;
          if (!(spec.prop === 'visibility' ? parentDrawn : selfDrawn)) continue;
          const g = this.host.classOf(o)?.graphs.find((x) => x.id === graphId);
          const out = g?.fn?.outputs[0];
          if (!out) continue;
          const key = `${o.id}:${w.id}:${spec.prop}`;
          this.bindingCalls[key] = (this.bindingCalls[key] ?? 0) + 1;
          const value = this.host.evaluate(o, graphId)[out.id];
          this.setProp({ obj: o, id: w.id }, { [spec.prop]: bindingValue(spec.prop, value) }, true);
        }
      }
    }
  }

  // ------------------------------------------------------------ drawing

  /**
   * A layout path read back: "@a/u/@b/w" is widget w of the object b, which
   * was added to a panel of the User Widget u placed in a. Each "@" segment is
   * a widget object, each other segment a widget of the current object's
   * Designer (a placed User Widget leads to its own object). Gives the object
   * holding the last segment, and that segment.
   */
  private holder(path: string): { obj: ActorRT | undefined; last: string } {
    const segs = path.split('/');
    const last = segs[segs.length - 1];
    if (segs.length < 2 || !segs[0].startsWith('@')) return { obj: undefined, last };
    let cur = this.get(segs[0].slice(1));
    for (let i = 1; cur && i < segs.length - 1; i++) {
      const seg = segs[i];
      cur = seg.startsWith('@') ? this.get(seg.slice(1)) : this.get(cur.widget?.nested[seg]);
    }
    return { obj: cur, last };
  }

  /** The widget object a layout path is drawn in ("@a/u/@b/w" → b). */
  objectOf(path: string): ActorRT | undefined {
    return this.holder(path).obj;
  }

  /** What a running game changed on the widget at a layout path ("@obj/w1/w2…"). */
  override(path: string): (Partial<WidgetProps> & { removed?: boolean }) | undefined {
    const { obj, last } = this.holder(path);
    if (!obj) return undefined;
    if (last.startsWith('@')) return this.get(last.slice(1))?.widget?.state[''];
    const st = obj.widget?.state[last];
    // A placed User Widget: its object's own Visibility… over what its parent's Designer says.
    const inner = this.get(obj.widget?.nested[last]);
    return inner?.widget?.state[''] ? { ...st, ...inner.widget.state[''] } : st;
  }

  /** Widgets added to a panel at a layout path, as extra children for the layout. */
  extra(path: string, panel: WidgetNode): WidgetNode[] {
    const ids = this.holder(path).obj?.widget?.children[panel.id] ?? [];
    return ids
      .map((id) => this.get(id))
      .filter((o): o is ActorRT => !!o?.classId)
      .map((o) => ({
        id: `@${o.id}`,
        name: o.objectName,
        kind: 'UserWidget' as const,
        parent: panel.id,
        isVariable: false,
        props: widgetPropsDefaults('UserWidget'),
        slot: slotDefaults(panel.kind),
        classId: o.classId,
      }));
  }

  /** A widget of a Designer from its layout path ("@obj/…/id"). */
  private resolve(path: string): { obj: ActorRT; id: string } | undefined {
    const { obj, last } = this.holder(path);
    return obj && !last.startsWith('@') ? { obj, id: last } : undefined;
  }

  /** What a touch at (x, y) of a screen `width` × 720 reaches. */
  hit(x: number, y: number, width: number): WidgetHit {
    const layers = this.layer(width);
    // A button under the touch, whatever covers it: to say which one the touch missed.
    let under: string | undefined;
    for (let i = layers.length - 1; i >= 0 && !under; i--) {
      const k = lastIndex(layers[i].laid, (l) => l.drawn && l.widget.kind === 'Button' && inside(l.rect, x, y));
      if (k >= 0) under = layers[i].laid[k].widget.name;
    }
    for (let i = layers.length - 1; i >= 0; i--) {
      const { obj, laid } = layers[i];
      // A User Widget is Not Hit-Testable (Self Only) unless the game set it Visible: then all of it takes touches.
      const self = obj.widget!.state['']?.visibility ?? VIS_SELF_HIT_TEST_INVISIBLE;
      if (self === VIS_HIT_TEST_INVISIBLE) continue;
      const top = lastIndex(laid, (l) => l.hit && inside(l.rect, x, y));
      if (top >= 0) {
        for (let j: number | undefined = top; j !== undefined; j = laid[j].parent) {
          const l = laid[j];
          if (l.widget.kind !== 'Button') continue;
          const t = this.resolve(l.path);
          // Set Is Enabled on the widget object itself disables all of it.
          const enabled = l.enabled && obj.widget!.state['']?.enabled !== false;
          if (t) return { kind: 'button', obj: t.obj, id: t.id, name: l.widget.name, path: l.path, enabled };
        }
        return under ? { kind: 'blocked', by: laid[top].widget.name, under } : { kind: 'none' };
      }
      if (self === VIS_VISIBLE) return under ? { kind: 'blocked', by: obj.objectName, under } : { kind: 'none' };
    }
    return { kind: 'none' };
  }

  setPressed(p: Umg['pressed']): void {
    if (this.pressed?.path === p?.path) return;
    this.pressed = p;
    this.version++;
  }

  /**
   * The screen: each widget of the viewport laid out over all of it, back to
   * front, on a screen `width` wide and 720 high (the UI scales it to fit).
   */
  layer(width: number): ScreenWidget[] {
    const out: ScreenWidget[] = [];
    for (const o of this.viewport()) {
      const cls = this.host.classOf(o);
      const vis = o.widget!.state['']?.visibility;
      if (!cls || vis === VIS_COLLAPSED || vis === VIS_HIDDEN || !widgetRoot(cls.widgets ?? [])) continue;
      const laid = layoutWidgets(cls, width, DESIGN_H, this.host.project, (p) => this.override(p), `@${o.id}/`, (p, w) => this.extra(p, w));
      out.push({ obj: o, laid });
    }
    return out;
  }
}

/** A Binding's Return Value as the property takes it. */
function bindingValue(prop: string, v: RValue): string | number {
  if (prop === 'percent' || prop === 'visibility') return Number(v) || 0;
  return v === null || v === undefined ? '' : String(v);
}
