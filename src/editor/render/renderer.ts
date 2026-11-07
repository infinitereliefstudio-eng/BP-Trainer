/**
 * Draws a full frame: grid, links, nodes, then the interaction overlays
 * (wire being dragged, selection rectangle, magnifier).
 */
import type { Graph, PinRef } from '@core/model/project';
import type { NodeContext, PinSpec } from '@core/nodes/definition';
import { isAssignable, type PinType } from '@core/types/pins';
import { Camera, type Point } from '../camera';
import { pinWorld, type NodeGeom } from '../layout';
import { GRAPH, METRICS } from '../theme';
import { drawNode } from './drawNode';
import { bezierPoint, pinColor, wirePath } from './primitives';

export interface WireDrag {
  from: PinRef;
  fromDir: 'in' | 'out';
  type: PinType;
  /** Finger position, screen px. */
  to: Point;
}

export interface Scene {
  graph: Graph;
  ctx: NodeContext;
  geoms: Map<string, NodeGeom>;
  selection: Set<string>;
  camera: Camera;
  width: number;
  height: number;
  wire?: WireDrag;
  pendingPin?: PinRef;
  rect?: { x0: number; y0: number; x1: number; y1: number };
  errorNodes: Set<string>;
  debug?: DebugOverlay;
}

/** What the debugger adds on top of a graph: breakpoints, paused node, exec glow. */
export interface DebugOverlay {
  breakpoints: Set<string>;
  /** Node where execution is stopped, if it is in this graph. */
  paused?: string;
  /** 1 when the wire / node just ran, fading to 0. */
  linkHeat(linkId: string): number;
  nodeHeat(nodeId: string): number;
}

export function renderScene(c: CanvasRenderingContext2D, s: Scene, dpr: number): void {
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.fillStyle = GRAPH.background;
  c.fillRect(0, 0, s.width, s.height);
  drawWorld(c, s, s.camera, dpr);

  if (s.rect) {
    const { x0, y0, x1, y1 } = s.rect;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = GRAPH.rect;
    c.strokeStyle = GRAPH.rectBorder;
    c.lineWidth = 1;
    c.fillRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
    c.strokeRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
  }
  if (s.wire) drawLoupe(c, s, dpr);
}

/** Everything that lives in graph space, drawn through a camera. */
function drawWorld(c: CanvasRenderingContext2D, s: Scene, cam: Camera, dpr: number, ox = 0, oy = 0): void {
  c.setTransform(dpr * cam.zoom, 0, 0, dpr * cam.zoom, dpr * (ox - cam.x * cam.zoom), dpr * (oy - cam.y * cam.zoom));
  const left = cam.x - ox / cam.zoom;
  const top = cam.y - oy / cam.zoom;
  drawGrid(c, cam.zoom, left, top, left + s.width / cam.zoom, top + s.height / cam.zoom);
  // Comments sit behind wires and nodes.
  for (const g of s.geoms.values()) {
    if (g.style === 'comment') drawNode(c, g, { selected: s.selection.has(g.node.id), error: s.errorNodes.has(g.node.id) });
  }
  drawLinks(c, s);

  const pinEnabled = s.wire ? compatibilityFilter(s) : undefined;
  const ordered = [...s.geoms.values()]
    .filter((g) => g.style !== 'comment')
    .sort((a, b) => Number(s.selection.has(a.node.id)) - Number(s.selection.has(b.node.id)));
  for (const g of ordered) {
    drawNode(c, g, {
      selected: s.selection.has(g.node.id),
      error: s.errorNodes.has(g.node.id),
      pendingPin: s.pendingPin?.node === g.node.id ? s.pendingPin.pin : undefined,
      pinEnabled: pinEnabled && ((p) => pinEnabled(g.node.id, p)),
      breakpoint: s.debug?.breakpoints.has(g.node.id),
      paused: s.debug?.paused === g.node.id,
      heat: s.debug?.nodeHeat(g.node.id) ?? 0,
    });
  }

  if (s.wire) {
    const start = s.geoms.get(s.wire.from.node);
    const a = start && pinWorld(start, s.wire.from.pin);
    if (a) {
      const b = { x: s.wire.to.x / s.camera.zoom + s.camera.x, y: s.wire.to.y / s.camera.zoom + s.camera.y };
      c.strokeStyle = pinColor(s.wire.type);
      c.lineWidth = s.wire.type.category === 'exec' ? 3 : 2;
      if (s.wire.fromDir === 'out') wirePath(c, a.x, a.y, b.x, b.y);
      else wirePath(c, b.x, b.y, a.x, a.y);
      c.stroke();
    }
  }
}

function drawGrid(c: CanvasRenderingContext2D, zoom: number, left: number, top: number, x1: number, y1: number): void {
  const step = METRICS.gridStep;
  const x0 = Math.floor(left / step) * step;
  const y0 = Math.floor(top / step) * step;
  const minor = zoom > 0.45;
  c.lineWidth = 1 / zoom;
  for (let pass = 0; pass < 2; pass++) {
    const major = pass === 1;
    if (!major && !minor) continue;
    c.strokeStyle = major ? GRAPH.gridMajor : GRAPH.gridMinor;
    c.beginPath();
    for (let x = x0; x <= x1; x += step) {
      if ((Math.round(x / step) % 8 === 0) !== major) continue;
      c.moveTo(x, top);
      c.lineTo(x, y1);
    }
    for (let y = y0; y <= y1; y += step) {
      if ((Math.round(y / step) % 8 === 0) !== major) continue;
      c.moveTo(left, y);
      c.lineTo(x1, y);
    }
    c.stroke();
  }
}

function drawLinks(c: CanvasRenderingContext2D, s: Scene): void {
  for (const l of Object.values(s.graph.links)) {
    const ga = s.geoms.get(l.from.node);
    const gb = s.geoms.get(l.to.node);
    if (!ga || !gb) continue;
    const a = pinWorld(ga, l.from.pin);
    const b = pinWorld(gb, l.to.pin);
    const spec = ga.pins.find((p) => p.spec.id === l.from.pin)?.spec;
    if (!a || !b || !spec) continue;
    const heat = spec.type.category === 'exec' ? (s.debug?.linkHeat(l.id) ?? 0) : 0;
    if (heat > 0) {
      // The wire that just carried execution glows, like in Play In Editor.
      c.strokeStyle = `rgba(255, 214, 90, ${0.8 * heat})`;
      c.lineWidth = 9;
      wirePath(c, a.x, a.y, b.x, b.y);
      c.stroke();
    }
    c.strokeStyle = pinColor(spec.type);
    c.lineWidth = spec.type.category === 'exec' ? 3 : 2;
    wirePath(c, a.x, a.y, b.x, b.y);
    c.stroke();
    if (heat > 0) {
      const p = bezierPoint(a.x, a.y, b.x, b.y, Math.min(1, (1 - heat) * 2.2));
      c.fillStyle = `rgba(255, 240, 180, ${heat})`;
      c.beginPath();
      c.arc(p.x, p.y, 5, 0, Math.PI * 2);
      c.fill();
    }
  }
}

/** While dragging a wire, dim the pins it cannot plug into. */
function compatibilityFilter(s: Scene): (nodeId: string, p: PinSpec) => boolean {
  const w = s.wire!;
  return (nodeId, p) => {
    if (nodeId === w.from.node) return p.id === w.from.pin;
    if (p.dir === w.fromDir) return false;
    return w.fromDir === 'out' ? isAssignable(w.type, p.type, s.ctx.hierarchy) : isAssignable(p.type, w.type, s.ctx.hierarchy);
  };
}

const LOUPE_R = 58;
const LOUPE_ZOOM = 2;

/** A magnifier above the finger, so the target pin stays visible. */
function drawLoupe(c: CanvasRenderingContext2D, s: Scene, dpr: number): void {
  const f = s.wire!.to;
  const cx = f.x;
  const cy = Math.max(LOUPE_R + 8, f.y - LOUPE_R - 56);
  const world = s.camera.toWorld(f.x, f.y);
  const zoom = Math.min(3, s.camera.zoom * LOUPE_ZOOM);
  const cam = new Camera();
  cam.zoom = zoom;
  cam.x = world.x;
  cam.y = world.y;

  c.save();
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.beginPath();
  c.arc(cx, cy, LOUPE_R, 0, Math.PI * 2);
  c.clip();
  c.fillStyle = GRAPH.background;
  c.fillRect(cx - LOUPE_R, cy - LOUPE_R, LOUPE_R * 2, LOUPE_R * 2);
  drawWorld(c, s, cam, dpr, cx, cy);
  c.restore();

  c.save();
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.strokeStyle = 'rgba(255,255,255,0.7)';
  c.lineWidth = 2;
  c.beginPath();
  c.arc(cx, cy, LOUPE_R, 0, Math.PI * 2);
  c.stroke();
  c.beginPath();
  c.moveTo(cx - 6, cy);
  c.lineTo(cx + 6, cy);
  c.moveTo(cx, cy - 6);
  c.lineTo(cx, cy + 6);
  c.stroke();
  c.restore();
}
