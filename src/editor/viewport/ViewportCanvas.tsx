/**
 * The Blueprint editor's Viewport, seen from above: the Blueprint's
 * components alone, the actor at the origin facing +X, as UE's Viewport tab
 * shows them before the actor is placed anywhere. Touch a component to
 * select it (its Details), drag it to change its Location, relative to its
 * parent; the root stays at the origin, as in UE.
 */
import { useEffect, useImperativeHandle, useRef } from 'preact/hooks';
import { forwardRef } from 'preact/compat';
import { inheritedView } from '@core/model/inheritance';
import { findClass } from '@core/model/project';
import { moveComponentBy, roundComponentLocation } from '@core/operations/viewportOps';
import { componentShape, overlaps } from '@core/runtime/physics';
import { createActor } from '@core/runtime/actorFactory';
import { componentTransform, type ActorRT } from '@core/runtime/world';
import type { EditorStore } from '@core/store/editorStore';
import { Camera } from '../camera';
import { GestureController, type GestureHost } from '../gestures';
import type { Hit } from '../hit';
import { haptic } from '../haptics';
import { renderWorld } from '../world/worldRender';

export interface ViewportRequests {
  openDetails(): void;
  /** A component that belongs to a parent Blueprint was dragged: say where to change it. */
  inherited(name: string, owner: string): void;
}

export interface ViewportHandle {
  fitView(): void;
}

interface Props {
  store: EditorStore;
  requests: ViewportRequests;
}

const noop = () => undefined;

export const ViewportCanvas = forwardRef<ViewportHandle, Props>(function ViewportCanvas({ store, requests }, ref) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const live = useRef({
    camera: undefined as Camera | undefined,
    size: { w: 0, h: 0, dpr: 1 },
    dragId: undefined as string | undefined,
    frame: 0,
    requests,
  });
  live.current.requests = requests;

  /** The class as one actor at the origin: its own components and those it inherits. */
  const actor = (): ActorRT => {
    const view = inheritedView(store.cls, store.project, true);
    const a = createActor('viewport', '', '', view, {});
    a.x = 0;
    a.y = 0;
    a.yaw = 0;
    return a;
  };

  const camera = (): Camera => {
    const l = live.current;
    if (!l.camera) {
      l.camera = new Camera();
      frameAll(l.camera);
    }
    return l.camera;
  };

  const frameAll = (cam: Camera) => {
    const { w, h } = live.current.size;
    if (!w) return;
    const a = actor();
    let x0 = -150,
      y0 = -150,
      x1 = 150,
      y1 = 150;
    for (const comp of a.components) {
      const t = componentTransform(a, comp);
      const ext = comp.kind === 'StaticMesh' || comp.kind === 'BoxCollision' ? Math.hypot(comp.props.sizeX, comp.props.sizeY) / 2 : comp.kind === 'PointLight' ? 40 : 30;
      x0 = Math.min(x0, t.x - ext);
      y0 = Math.min(y0, t.y - ext);
      x1 = Math.max(x1, t.x + ext);
      y1 = Math.max(y1, t.y + ext);
    }
    cam.fit({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, w, h - 60, 32);
    cam.zoom = Math.min(cam.zoom, 1.2);
    cam.x = (x0 + x1) / 2 - w / 2 / cam.zoom;
    cam.y = (y0 + y1) / 2 - (h - 60) / 2 / cam.zoom;
  };

  const draw = () => {
    const l = live.current;
    l.frame = 0;
    const c = canvasRef.current?.getContext('2d');
    if (!c || !l.size.w) return;
    const f = store.focus;
    renderWorld(
      c,
      {
        actors: [actor()],
        camera: camera(),
        width: l.size.w,
        height: l.size.h,
        playing: false,
        viewport: { selectedComponent: f.kind === 'component' ? f.id : undefined },
      },
      l.size.dpr,
    );
  };

  const invalidate = () => {
    if (!live.current.frame) live.current.frame = requestAnimationFrame(draw);
  };

  useImperativeHandle(ref, () => ({
    fitView() {
      frameAll(camera());
      invalidate();
    },
  }));

  /**
   * The component under a point. Small ones first (lights, texts, scene
   * components), then meshes, then collision boxes, which often surround the rest.
   */
  const componentAt = (wx: number, wy: number): string | undefined => {
    const a = actor();
    const z = camera().zoom;
    const probe = { kind: 'circle' as const, cx: wx, cy: wy, r: 10 / z };
    const point = a.components.filter((c) => c.kind !== 'StaticMesh' && c.kind !== 'BoxCollision');
    let best: { id: string; d: number } | undefined;
    for (const comp of point) {
      const t = componentTransform(a, comp);
      const d = Math.hypot(wx - t.x, wy - t.y);
      if (d < 22 / z && (!best || d < best.d)) best = { id: comp.id, d };
    }
    if (best) return best.id;
    for (const kind of ['StaticMesh', 'BoxCollision']) {
      for (const comp of [...a.components].reverse()) {
        if (comp.kind !== kind) continue;
        const shape = componentShape(a, comp);
        if (shape && overlaps(probe, shape)) return comp.id;
      }
    }
    return undefined;
  };

  /** A component of a parent Blueprint: shown, not editable here (UE edits it in the parent, or overrides it). */
  const ownerOf = (id: string): string | undefined => {
    if (store.cls.components.some((c) => c.id === id)) return undefined;
    let cls = store.cls.parentClassId ? findClass(store.project, store.cls.parentClassId) : undefined;
    for (let guard = 0; cls && guard < 32; guard++) {
      if (cls.components.some((c) => c.id === id)) return cls.name;
      cls = cls.parentClassId ? findClass(store.project, cls.parentClassId) : undefined;
    }
    return '?';
  };

  useEffect(() => {
    const wrap = wrapRef.current!;
    const canvas = canvasRef.current!;
    const ro = new ResizeObserver(() => {
      const r = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const first = live.current.size.w === 0;
      live.current.size = { w: r.width, h: r.height, dpr };
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      canvas.style.width = `${r.width}px`;
      canvas.style.height = `${r.height}px`;
      if (first && live.current.camera) frameAll(live.current.camera);
      invalidate();
    });
    ro.observe(wrap);
    const unsub = store.subscribe(() => invalidate());

    const select = (id: string) => {
      const owner = ownerOf(id);
      if (owner) {
        const comp = actor().components.find((c) => c.id === id);
        live.current.requests.inherited(comp?.name ?? '?', owner);
        return false;
      }
      store.setFocus({ kind: 'component', id });
      return true;
    };

    const host: GestureHost = {
      hitAt(sx, sy): Hit {
        const w = camera().toWorld(sx, sy);
        const id = componentAt(w.x, w.y);
        return id ? { kind: 'node', node: id } : { kind: 'empty' };
      },
      selectionMode: () => false,
      onTap(hit) {
        if (hit.kind !== 'node') return store.setFocus({ kind: 'none' });
        if (select(hit.node)) haptic('tap');
      },
      onDoubleTap(hit) {
        if (hit.kind === 'node' && select(hit.node)) live.current.requests.openDetails();
      },
      onLongPress(hit) {
        if (hit.kind === 'node' && select(hit.node)) live.current.requests.openDetails();
      },
      onPan(dx, dy) {
        camera().panBy(dx, dy);
        invalidate();
      },
      onPinch(cx, cy, factor, dx, dy) {
        const cam = camera();
        cam.zoomAt(cx, cy, factor);
        cam.panBy(dx, dy);
        invalidate();
      },
      onNodeDragStart(id) {
        if (!select(id)) return;
        // The root is the actor's origin: dragging it moves the view instead.
        if (!store.cls.components.find((c) => c.id === id)?.parent) return;
        live.current.dragId = id;
        store.begin('Déplacer un composant');
      },
      onNodeDrag(dsx, dsy) {
        const id = live.current.dragId;
        const z = camera().zoom;
        if (!id) {
          camera().panBy(dsx, dsy);
          invalidate();
          return;
        }
        moveComponentBy(store.cls, inheritedView(store.cls, store.project, true).components, id, dsx / z, dsy / z);
        store.touch();
      },
      onNodeDragEnd() {
        const id = live.current.dragId;
        live.current.dragId = undefined;
        if (!id) return;
        roundComponentLocation(store.cls, id);
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
    return () => {
      gestures.dispose();
      ro.disconnect();
      unsub();
      if (live.current.frame) cancelAnimationFrame(live.current.frame);
    };
  }, [store]);

  // Another Blueprint: frame its components.
  useEffect(() => {
    if (live.current.camera) frameAll(live.current.camera);
    invalidate();
  }, [store.classId]);

  return (
    <div class="graph-canvas world viewport" ref={wrapRef}>
      <canvas ref={canvasRef} />
    </div>
  );
});
