/**
 * The graph canvas: owns the camera, draws on demand and turns gestures
 * into store actions. Anything that needs a panel (palette, menus, value
 * editor) is requested from the parent through `requests`.
 */
import { forwardRef } from 'preact/compat';
import { useEffect, useImperativeHandle, useRef } from 'preact/hooks';
import type { PinRef } from '@core/model/project';
import type { PinSpec } from '@core/nodes/definition';
import { findPin } from '@core/nodes/registry';
import { connect, moveNodes, setPinDefault, snapNodes } from '@core/operations/graphOps';
import type { EditorStore } from '@core/store/editorStore';
import { isAssignable, type PinType } from '@core/types/pins';
import { Camera, type Point } from './camera';
import { GestureController, type GestureHost } from './gestures';
import { hitTest, nodesInRect, type Hit } from './hit';
import { graphBounds, layoutGraph, type NodeGeom } from './layout';
import { renderScene, type WireDrag } from './render/renderer';

export interface WireSource {
  ref: PinRef;
  dir: 'in' | 'out';
  type: PinType;
}

export interface PaletteRequest {
  sx: number;
  sy: number;
  world: Point;
  from?: WireSource;
}

export interface CanvasRequests {
  openPalette(req: PaletteRequest): void;
  openNodeMenu(nodeId: string, sx: number, sy: number): void;
  openPinMenu(ref: PinRef, spec: PinSpec, sx: number, sy: number): void;
  openLinkMenu(linkId: string, sx: number, sy: number): void;
  editValue(nodeId: string, spec: PinSpec, sx: number, sy: number): void;
  openDetails(): void;
}

export interface GraphCanvasHandle {
  fitView(): void;
  /** World point at the centre of the visible area. */
  viewCenter(): Point;
  focusNode(nodeId: string): void;
}

interface Props {
  store: EditorStore;
  requests: CanvasRequests;
  selectionMode: boolean;
}

/** Height kept clear at the bottom for the floating buttons and the log handle. */
const FAB_BAND = 80;
/** Framing never zooms out below this, so node text stays readable on a phone. */
const READABLE_ZOOM = 0.6;

const textCache = new Map<string, number>();
let measureCtx: CanvasRenderingContext2D | null = null;
function measure(text: string, font: string): number {
  const key = `${font}|${text}`;
  const hit = textCache.get(key);
  if (hit !== undefined) return hit;
  measureCtx ??= document.createElement('canvas').getContext('2d');
  if (!measureCtx) return text.length * 7;
  measureCtx.font = font;
  const w = measureCtx.measureText(text).width;
  if (textCache.size > 4000) textCache.clear();
  textCache.set(key, w);
  return w;
}

export const GraphCanvas = forwardRef<GraphCanvasHandle, Props>(function GraphCanvas(
  { store, requests, selectionMode },
  ref,
) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const live = useRef({
    cameras: new Map<string, Camera>(),
    size: { w: 0, h: 0, dpr: 1 },
    wire: undefined as WireDrag | undefined,
    pending: undefined as (WireSource & { ref: PinRef }) | undefined,
    rect: undefined as { x0: number; y0: number; x1: number; y1: number } | undefined,
    dragIds: [] as string[],
    frame: 0,
    selectionMode,
    requests,
  });
  live.current.selectionMode = selectionMode;
  live.current.requests = requests;

  const camera = (): Camera => {
    const l = live.current;
    let cam = l.cameras.get(store.graphId);
    if (!cam) {
      cam = new Camera();
      l.cameras.set(store.graphId, cam);
      const b = graphBounds(geoms());
      const { w, h } = l.size;
      if (b && w > 0) cam.fit(b, w, h - FAB_BAND, 56, READABLE_ZOOM);
      else {
        cam.x = -40;
        cam.y = -40;
      }
    }
    return cam;
  };

  const geoms = (): Map<string, NodeGeom> => layoutGraph(store.graph, store.ctx, measure);

  const invalidate = () => {
    const l = live.current;
    if (l.frame) return;
    l.frame = requestAnimationFrame(draw);
  };

  const draw = () => {
    const l = live.current;
    l.frame = 0;
    const canvas = canvasRef.current;
    const c = canvas?.getContext('2d');
    if (!canvas || !c || l.size.w === 0) return;
    const errorNodes = new Set(
      store.compileMessages
        .filter((m) => m.severity === 'error' && m.graphId === store.graphId && m.nodeId)
        .map((m) => m.nodeId!),
    );
    renderScene(
      c,
      {
        graph: store.graph,
        ctx: store.ctx,
        geoms: geoms(),
        selection: store.selection,
        camera: camera(),
        width: l.size.w,
        height: l.size.h,
        wire: l.wire,
        pendingPin: l.pending?.ref,
        rect: l.rect,
        errorNodes,
      },
      l.size.dpr,
    );
  };

  /** Connect two pins in one undo step, reporting refusals. */
  const tryConnect = (a: PinRef, b: PinRef): boolean => {
    const res = store.apply('Relier', (_c, g) => connect(g, a, b, store.ctx));
    if (!res.ok) store.warn(res.reason);
    return res.ok;
  };

  /** First pin of a node that accepts a wire from `src`. */
  const compatiblePinOn = (nodeId: string, src: WireSource): string | undefined => {
    const g = geoms().get(nodeId);
    if (!g) return undefined;
    const h = store.ctx.hierarchy;
    const p = g.pins.find(
      (q) =>
        q.spec.dir !== src.dir &&
        (src.dir === 'out' ? isAssignable(src.type, q.spec.type, h) : isAssignable(q.spec.type, src.type, h)),
    );
    return p?.spec.id;
  };

  useImperativeHandle(ref, () => ({
    fitView() {
      const b = graphBounds(geoms());
      const { w, h } = live.current.size;
      if (b) camera().fit(b, w, h - FAB_BAND, 56, READABLE_ZOOM);
      invalidate();
    },
    viewCenter() {
      const { w, h } = live.current.size;
      return camera().toWorld(w / 2, h / 2);
    },
    focusNode(nodeId) {
      const g = geoms().get(nodeId);
      if (!g) return;
      const cam = camera();
      const { w, h } = live.current.size;
      cam.x = g.node.x + g.w / 2 - w / 2 / cam.zoom;
      cam.y = g.node.y + g.h / 2 - h / 2 / cam.zoom;
      store.selectNodes([nodeId]);
      invalidate();
    },
  }));

  useEffect(() => {
    const wrap = wrapRef.current!;
    const canvas = canvasRef.current!;
    const ro = new ResizeObserver(() => {
      const r = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      live.current.size = { w: r.width, h: r.height, dpr };
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      canvas.style.width = `${r.width}px`;
      canvas.style.height = `${r.height}px`;
      invalidate();
    });
    ro.observe(wrap);
    const unsub = store.subscribe(invalidate);

    const host: GestureHost = {
      hitAt(sx, sy) {
        const w = camera().toWorld(sx, sy);
        return hitTest(store.graph, geoms(), store.selection, w.x, w.y, camera().zoom);
      },
      selectionMode: () => live.current.selectionMode,

      onTap(hit, sx, sy) {
        const l = live.current;
        if (hit.kind === 'pin') {
          const src: WireSource & { ref: PinRef } = {
            ref: { node: hit.node, pin: hit.pin },
            dir: hit.spec.dir,
            type: hit.spec.type,
          };
          if (l.pending && l.pending.ref.node !== hit.node) {
            tryConnect(l.pending.ref, src.ref);
            l.pending = undefined;
          } else if (l.pending && l.pending.ref.pin === hit.pin) {
            l.pending = undefined;
          } else {
            l.pending = src;
            store.info('Touche une deuxième pin pour les relier.', false);
          }
          invalidate();
          return;
        }
        l.pending = undefined;
        if (hit.kind === 'value') {
          if (hit.spec.type.category === 'bool') {
            const node = store.graph.nodes[hit.node];
            const spec = node && findPin(node, hit.pin, store.ctx);
            const current = node && spec && (hit.pin in node.defaults ? node.defaults[hit.pin] : spec.default);
            store.apply('Modifier une valeur', (_c, g) => setPinDefault(g, hit.node, hit.pin, !current));
          } else {
            l.requests.editValue(hit.node, hit.spec, sx, sy);
          }
          if (!store.selection.has(hit.node)) store.selectNodes([hit.node]);
          return;
        }
        if (hit.kind === 'node') {
          if (l.selectionMode) store.toggleNode(hit.node);
          else store.selectNodes([hit.node]);
          return;
        }
        store.clearSelection();
        invalidate();
      },

      onDoubleTap(hit, sx, sy) {
        if (hit.kind === 'node' || hit.kind === 'value') {
          store.selectNodes([hit.node]);
          live.current.requests.openDetails();
        } else if (hit.kind === 'empty') {
          const w = camera().toWorld(sx, sy);
          live.current.requests.openPalette({ sx, sy, world: w });
        }
      },

      onLongPress(hit, sx, sy) {
        const r = live.current.requests;
        live.current.pending = undefined;
        if (hit.kind === 'pin') r.openPinMenu({ node: hit.node, pin: hit.pin }, hit.spec, sx, sy);
        else if (hit.kind === 'node' || hit.kind === 'value') {
          if (!store.selection.has(hit.node)) store.selectNodes([hit.node]);
          r.openNodeMenu(hit.node, sx, sy);
        } else if (hit.kind === 'link') r.openLinkMenu(hit.link, sx, sy);
        else r.openPalette({ sx, sy, world: camera().toWorld(sx, sy) });
        invalidate();
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

      onNodeDragStart(nodeId) {
        if (!store.selection.has(nodeId)) store.selectNodes([nodeId]);
        live.current.dragIds = [...store.selection];
        store.begin(live.current.dragIds.length > 1 ? 'Déplacer des nœuds' : 'Déplacer un nœud');
      },
      onNodeDrag(dsx, dsy) {
        const z = camera().zoom;
        moveNodes(store.graph, live.current.dragIds, dsx / z, dsy / z);
        store.touch();
      },
      onNodeDragEnd() {
        snapNodes(store.graph, live.current.dragIds);
        live.current.dragIds = [];
        store.commit();
      },

      onWireStart(hit, sx, sy) {
        live.current.pending = undefined;
        live.current.wire = {
          from: { node: hit.node, pin: hit.pin },
          fromDir: hit.spec.dir,
          type: hit.spec.type,
          to: { x: sx, y: sy },
        };
        invalidate();
      },
      onWireMove(sx, sy) {
        if (live.current.wire) live.current.wire.to = { x: sx, y: sy };
        invalidate();
      },
      onWireEnd(sx, sy) {
        const l = live.current;
        const w = l.wire;
        l.wire = undefined;
        invalidate();
        if (!w) return;
        const src: WireSource = { ref: w.from, dir: w.fromDir, type: w.type };
        const hit: Hit = host.hitAt(sx, sy);
        if (hit.kind === 'pin') {
          if (hit.node !== w.from.node || hit.pin !== w.from.pin) tryConnect(w.from, { node: hit.node, pin: hit.pin });
        } else if ((hit.kind === 'node' || hit.kind === 'value') && hit.node !== w.from.node) {
          const pin = compatiblePinOn(hit.node, src);
          if (pin) tryConnect(w.from, { node: hit.node, pin });
          else store.warn("Ce nœud n'a aucune pin compatible avec ce fil.");
        } else if (hit.kind === 'empty' || hit.kind === 'link') {
          l.requests.openPalette({ sx, sy, world: camera().toWorld(sx, sy), from: src });
        }
      },
      onWireCancel() {
        live.current.wire = undefined;
        invalidate();
      },

      onRectStart(sx, sy) {
        live.current.rect = { x0: sx, y0: sy, x1: sx, y1: sy };
        invalidate();
      },
      onRectMove(sx, sy) {
        const r = live.current.rect;
        if (r) {
          r.x1 = sx;
          r.y1 = sy;
        }
        invalidate();
      },
      onRectEnd() {
        const r = live.current.rect;
        live.current.rect = undefined;
        if (r) {
          const cam = camera();
          const a = cam.toWorld(r.x0, r.y0);
          const b = cam.toWorld(r.x1, r.y1);
          store.selectNodes(nodesInRect(geoms(), a.x, a.y, b.x, b.y), true);
        }
        invalidate();
      },
    };
    const gestures = new GestureController(canvas, host);
    return () => {
      gestures.dispose();
      ro.disconnect();
      unsub();
      if (live.current.frame) cancelAnimationFrame(live.current.frame);
    };
  }, [store]);

  return (
    <div class="graph-canvas" ref={wrapRef}>
      <canvas ref={canvasRef} />
    </div>
  );
});
