/**
 * The Blueprint editor's Viewport in 3D (3D-2, V7.79): the Blueprint's components alone, the actor at the origin
 * facing +X (its axes drawn there), in Perspective by default as in UE, or in an orthographic view. Same work as the
 * top view's Viewport (ViewportCanvas): tap a component to select it, double tap or long press for its Details, drag
 * it to change its Location relative to its parent; plus the gizmo of the viewport bar: Move, Rotate (its Yaw), Scale
 * (the size of a Static Mesh or a Box Collision). The root stays at the origin; an inherited component is changed in
 * its own Blueprint, as in UE.
 */
import { forwardRef } from 'preact/compat';
import { useEffect, useImperativeHandle, useRef } from 'preact/hooks';
import { inheritedView } from '@core/model/inheritance';
import { type Component, findClass } from '@core/model/project';
import { componentInActor, parentFrame, roundComponentLocation } from '@core/operations/viewportOps';
import { scaleOf } from '@core/model/scale';
import { createActor } from '@core/runtime/actorFactory';
import { componentShape } from '@core/runtime/physics';
import { componentTransform, type ActorRT } from '@core/runtime/world';
import type { EditorStore } from '@core/store/editorStore';
import { GestureController, type GestureHost } from '../gestures';
import { haptic } from '../haptics';
import type { ViewportHandle, ViewportRequests } from '../viewport/ViewportCanvas';
import { widgetNames } from '../world/worldRender';
import { Gizmo } from './gizmo';
import { GIZMO_HEIGHT, GizmoDrag, type Transform } from './gizmoDrag';
import { type GizmoSettings, type Handle, normalizeYaw, snap } from './gizmoMath';
import { meshHeight, WIDGET_HEIGHT } from './heights';
import { HtmlLabels, type Label } from './htmlLabels';
import { LevelScene, type ViewMode } from './levelScene';
import { dropRenderer, makeRenderer } from './renderer';
import { type Bounds, ViewCamera, type ViewKind } from './viewCamera';

interface Props {
  store: EditorStore;
  requests: ViewportRequests;
  kind: Exclude<ViewKind, 'Top'>;
  mode: ViewMode;
  gizmo: GizmoSettings;
  onUnavailable: () => void;
}

const noop = () => undefined;
const DEG = Math.PI / 180;
const ACTOR_ID = 'viewport';

export const Viewport3DEditor = forwardRef<ViewportHandle, Props>(function Viewport3DEditor({ store, requests, kind, mode, gizmo: settings, onUnavailable }, ref) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const live = useRef({ requests, onUnavailable, settings, kind, mode, invalidate: noop as () => void, fit: noop as () => void, cam: undefined as ViewCamera | undefined });
  live.current.requests = requests;
  live.current.onUnavailable = onUnavailable;
  live.current.settings = settings;

  useImperativeHandle(ref, () => ({ fitView: () => live.current.fit() }));

  useEffect(() => {
    const wrap = wrapRef.current!;
    const made = makeRenderer(wrap);
    if (!made) {
      live.current.onUnavailable();
      return;
    }
    const renderer = made;
    const canvas = renderer.domElement;
    const labels = new HtmlLabels();
    wrap.appendChild(labels.el);
    const scene = new LevelScene(true);
    scene.showAxes();
    const gizmo = new Gizmo();
    scene.scene.add(gizmo.group);
    const cam = new ViewCamera(live.current.kind);
    cam.yaw = 30;
    cam.pitch = 35;
    live.current.cam = cam;
    let raf = 0;
    let sized = false;
    let down = { x: 0, y: 0 };
    let drag: { id: string; handle?: GizmoDrag; at: { x: number; y: number }; from?: { x: number; y: number }; orig: Transform; props: Component['props'] } | undefined;

    /** Every component the class has, inherited ones included. */
    const all = (): Component[] => inheritedView(store.cls, store.project, true).components;
    /** The class as one actor at the origin. */
    const actor = (): ActorRT => {
      const a = createActor(ACTOR_ID, '', '', inheritedView(store.cls, store.project, true), {});
      a.x = 0;
      a.y = 0;
      a.yaw = 0;
      return a;
    };
    const own = (id: string) => store.cls.components.find((c) => c.id === id);
    const selectedId = () => (store.focus.kind === 'component' ? store.focus.id : undefined);

    const bounds = (a: ActorRT): Bounds => {
      const b = { x0: -100, y0: -100, x1: 100, y1: 100, h: 100 };
      for (const c of a.components) {
        const sh = componentShape(a, c);
        const t = componentTransform(a, c);
        const r = sh ? (sh.kind === 'circle' ? sh.r : Math.hypot(sh.hx, sh.hy)) : 30;
        const cx = sh ? sh.cx : t.x,
          cy = sh ? sh.cy : t.y;
        b.x0 = Math.min(b.x0, cx - r);
        b.y0 = Math.min(b.y0, cy - r);
        b.x1 = Math.max(b.x1, cx + r);
        b.y1 = Math.max(b.y1, cy + r);
        if (c.kind === 'StaticMesh') b.h = Math.max(b.h, meshHeight(c));
      }
      return b;
    };

    /** A component as the gizmo sees it: in the actor's frame, with its size. */
    const transformOf = (id: string): Transform | undefined => {
      const c = all().find((k) => k.id === id);
      if (!c) return undefined;
      const t = componentInActor(all(), id);
      const s = scaleOf(c.props);
      // The gizmo's Scale is the component's own Relative Scale 3D, as in UE.
      return { x: t.x, y: t.y, yaw: t.yaw, scaleX: s.x, scaleY: s.y, scaleZ: s.z };
    };

    const placeGizmo = () => {
      const id = selectedId();
      const c = id ? own(id) : undefined;
      const t = id ? transformOf(id) : undefined;
      const tool = live.current.settings.tool;
      let modeOf: 'Move' | 'Rotate' | 'Scale' | undefined = tool === 'Select' ? undefined : tool;
      // The root is the actor's origin. Every scene component has a Scale, as in UE (V7.83).
      if (modeOf === 'Move' && !c?.parent) modeOf = undefined;
      if (!c || !t || !modeOf) return gizmo.place(undefined, 0, 0, 0, 0, 1);
      const yaw = modeOf === 'Scale' || (modeOf === 'Move' && live.current.settings.space === 'Local') ? t.yaw : 0;
      gizmo.place(modeOf, t.x, t.y, GIZMO_HEIGHT, yaw, cam.cmPerPxAt(t.x, t.y, GIZMO_HEIGHT));
    };

    const draw = () => {
      raf = 0;
      if (!sized) return;
      const a = actor();
      const sel = selectedId();
      scene.mode = live.current.mode;
      scene.sync({ actors: [a], selectedComponent: sel ? `${ACTOR_ID}|${sel}` : undefined, focus: { x: 0, y: 0 } });
      placeGizmo();
      renderer.render(scene.scene, cam.three);
      labels.update(frames(a));
    };
    const invalidate = () => {
      if (!raf) raf = requestAnimationFrame(draw);
    };
    live.current.invalidate = invalidate;
    live.current.fit = () => {
      cam.frame(bounds(actor()));
      invalidate();
    };

    /** Widget Components: the frame of their Draw Size, as in the top view's Viewport. */
    const frames = (a: ActorRT): Label[] => {
      const names = widgetNames(store.project);
      const k = wrap.getBoundingClientRect().height / 720;
      const out: Label[] = [];
      for (const c of a.components) {
        if (c.kind !== 'Widget') continue;
        const t = componentTransform(a, c);
        const q = cam.toScreen(t.x, t.y, WIDGET_HEIGHT);
        if (q.behind) continue;
        const name = c.classId ? (names[c.classId] ?? c.name) : `${c.name} (Widget Class : None)`;
        out.push({ key: c.id, text: name, x: q.x, y: q.y, w: c.props.sizeX * k, h: c.props.sizeY * k, cls: 'frame', faded: !c.props.visible });
      }
      return out;
    };

    /** A component of a parent Blueprint is shown, not changed here: say where. */
    const ownerOf = (id: string): string | undefined => {
      if (own(id)) return undefined;
      let cls = store.cls.parentClassId ? findClass(store.project, store.cls.parentClassId) : undefined;
      for (let guard = 0; cls && guard < 32; guard++) {
        if (cls.components.some((c) => c.id === id)) return cls.name;
        cls = cls.parentClassId ? findClass(store.project, cls.parentClassId) : undefined;
      }
      return '?';
    };
    const select = (id: string): boolean => {
      const owner = ownerOf(id);
      if (owner) {
        live.current.requests.inherited(all().find((c) => c.id === id)?.name ?? '?', owner);
        return false;
      }
      store.setFocus({ kind: 'component', id });
      return true;
    };

    /** The component under a screen point: what the ray meets, or a component without a shape near the finger. */
    const componentAt = (sx: number, sy: number): string | undefined => {
      const hit = scene.pickComponent(cam.rayAt(sx, sy));
      if (hit) return hit;
      const a = actor();
      let best: { id: string; d: number } | undefined;
      for (const c of a.components) {
        if (c.kind === 'StaticMesh' || c.kind === 'BoxCollision') continue;
        const t = componentTransform(a, c);
        const p = cam.toScreen(t.x, t.y, c.kind === 'Widget' ? WIDGET_HEIGHT : 0);
        const d = Math.hypot(p.x - sx, p.y - sy);
        if (d < 26 && (!best || d < best.d)) best = { id: c.id, d };
      }
      return best?.id;
    };

    /** Write a transform from the gizmo, back into the component's relative Location, Rotation and size. */
    const apply = (d: NonNullable<typeof drag>, t: Transform) => {
      const c = own(d.id);
      if (!c) return;
      const g = live.current.settings.grid;
      // The move, turned back and unstretched into the parent's frame (its yaw and scale: V7.83).
      const f = parentFrame(all(), d.id);
      const r = -f.yaw * DEG;
      const dx = t.x - d.orig.x,
        dy = t.y - d.orig.y;
      if (dx || dy) {
        c.props.x = snap(d.props.x + (dx * Math.cos(r) - dy * Math.sin(r)) / (f.sx || 1), g);
        c.props.y = snap(d.props.y + (dx * Math.sin(r) + dy * Math.cos(r)) / (f.sy || 1), g);
      }
      c.props.yaw = normalizeYaw(d.props.yaw + t.yaw - d.orig.yaw);
      if (d.handle?.handle.startsWith('s')) {
        // A scale of 1 is not written: projects made before V7.83 stay as they were.
        for (const [k, v] of [['scaleX', t.scaleX], ['scaleY', t.scaleY], ['scaleZ', t.scaleZ]] as const) {
          if (v === 1) delete c.props[k];
          else c.props[k] = v;
        }
      }
      store.touch();
    };

    const ro = new ResizeObserver(() => {
      const r = wrap.getBoundingClientRect();
      if (!r.width || !r.height) return;
      renderer.setSize(r.width, r.height, true);
      cam.resize(r.width, r.height);
      if (!sized) cam.frame(bounds(actor()));
      sized = true;
      draw();
    });
    ro.observe(wrap);
    const unsub = store.subscribe(() => invalidate());

    const host: GestureHost = {
      hitAt(sx, sy) {
        down = { x: sx, y: sy };
        const handle = gizmo.pick(cam.rayAt(sx, sy));
        if (handle) return { kind: 'node', node: `gizmo:${handle}` };
        const id = componentAt(sx, sy);
        return id ? { kind: 'node', node: id } : { kind: 'empty' };
      },
      selectionMode: () => false,
      onTap(hit) {
        if (hit.kind === 'node' && hit.node.startsWith('gizmo:')) return;
        if (hit.kind !== 'node') return store.setFocus({ kind: 'none' });
        if (select(hit.node)) haptic('tap');
      },
      onDoubleTap(hit) {
        if (hit.kind === 'node' && !hit.node.startsWith('gizmo:') && select(hit.node)) live.current.requests.openDetails();
      },
      onLongPress(hit) {
        if (hit.kind === 'node' && !hit.node.startsWith('gizmo:') && select(hit.node)) live.current.requests.openDetails();
      },
      onPan(dx, dy) {
        if (cam.isOrtho) cam.pan(dx, dy);
        else cam.orbit(dx, dy);
        invalidate();
      },
      onPinch(cx, cy, factor, dx, dy) {
        cam.zoom(factor, cx, cy);
        cam.pan(dx, dy);
        invalidate();
      },
      onNodeDragStart(id) {
        const gizmoHandle = id.startsWith('gizmo:') ? (id.slice(6) as Handle) : undefined;
        const target = gizmoHandle ? selectedId() : id;
        if (!target || (!gizmoHandle && !select(target))) return;
        const c = own(target);
        const t = transformOf(target);
        if (!c || !t) return;
        // Without the gizmo, a drag moves the component on the floor; the root stays at the origin.
        if (!gizmoHandle && !c.parent) return;
        const view = { toScreen: (x: number, y: number, h?: number) => cam.toScreen(x, y, h), dragPoint: (x: number, y: number) => cam.dragPoint(x, y), verticalLook: () => cam.verticalLook() };
        drag = {
          id: target,
          handle: gizmoHandle ? new GizmoDrag(gizmoHandle, t, view, live.current.settings, down) : undefined,
          at: { ...down },
          from: gizmoHandle ? undefined : cam.dragPoint(down.x, down.y),
          orig: t,
          props: { ...c.props },
        };
        gizmo.setActive(gizmoHandle);
        store.begin(gizmoHandle === 'rot' ? 'Tourner un composant' : gizmoHandle?.startsWith('s') ? 'Redimensionner un composant' : 'Déplacer un composant');
      },
      onNodeDrag(dsx, dsy) {
        if (!drag) {
          host.onPan(dsx, dsy);
          return;
        }
        drag.at.x += dsx;
        drag.at.y += dsy;
        if (drag.handle) return apply(drag, drag.handle.at(drag.at));
        const now = cam.dragPoint(drag.at.x, drag.at.y);
        if (!now || !drag.from) return;
        apply(drag, { ...drag.orig, x: drag.orig.x + now.x - drag.from.x, y: drag.orig.y + now.y - drag.from.y });
      },
      onNodeDragEnd() {
        const d = drag;
        drag = undefined;
        gizmo.setActive(undefined);
        if (!d) return;
        roundComponentLocation(store.cls, d.id);
        store.commit();
      },
      onWireStart: noop,
      onWireMove: noop,
      onWireEnd: noop,
      onWireCancel: noop,
      onRectStart: noop,
      onRectMove: noop,
      onRectEnd: noop,
    };
    const gestures = new GestureController(canvas, host);

    // The smoke test (?e2e) asks where a component is on the screen.
    if (location.search.includes('e2e')) {
      (window as unknown as { bp3dViewport: unknown }).bp3dViewport = {
        screenOf: (name: string) => {
          const a = actor();
          const c = a.components.find((k) => k.name === name);
          if (!c) return undefined;
          const t = componentTransform(a, c);
          return cam.toScreen(t.x, t.y, c.kind === 'StaticMesh' ? meshHeight(c) / 2 : 20);
        },
        selection: () => {
          const id = selectedId();
          const t = id && transformOf(id);
          return t ? { ...t, cmPerPx: cam.cmPerPxAt(t.x, t.y, GIZMO_HEIGHT) } : undefined;
        },
        project: (x: number, y: number) => cam.toScreen(x, y, GIZMO_HEIGHT),
      };
    }

    return () => {
      gestures.dispose();
      ro.disconnect();
      unsub();
      if (raf) cancelAnimationFrame(raf);
      gizmo.dispose();
      scene.dispose();
      labels.el.remove();
      dropRenderer(renderer);
      live.current.invalidate = noop;
      live.current.fit = noop;
      live.current.cam = undefined;
    };
  }, [store]);

  useEffect(() => {
    live.current.kind = kind;
    live.current.mode = mode;
    const cam = live.current.cam;
    if (cam && cam.kind !== kind) {
      cam.kind = kind;
      live.current.fit();
    }
    live.current.invalidate();
  }, [kind, mode]);

  useEffect(() => live.current.invalidate(), [settings.tool, settings.space, settings.grid, settings.rotation, settings.scale]);

  // Another Blueprint: frame its components.
  useEffect(() => live.current.fit(), [store.classId]);

  return <div class="graph-canvas world world3d editor3d viewport3d" ref={wrapRef} data-view={kind} />;
});
