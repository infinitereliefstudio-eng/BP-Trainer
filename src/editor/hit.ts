/**
 * Hit-testing in world space. Pins get a touch target much larger than
 * their drawing so they can be grabbed with a finger.
 */
import type { Graph } from '@core/model/project';
import type { PinSpec } from '@core/nodes/definition';
import { pinWorld, type NodeGeom } from './layout';
import { bezierPoint } from './render/primitives';

export type Hit =
  | { kind: 'pin'; node: string; pin: string; spec: PinSpec }
  | { kind: 'value'; node: string; pin: string; spec: PinSpec }
  | { kind: 'node'; node: string }
  | { kind: 'link'; link: string }
  | { kind: 'empty' };

/** Touch radius of a pin, in screen px. */
const PIN_TOUCH_PX = 22;
const LINK_TOUCH_PX = 12;

export function hitTest(
  graph: Graph,
  geoms: Map<string, NodeGeom>,
  selection: Set<string>,
  wx: number,
  wy: number,
  zoom: number,
): Hit {
  const pinR = Math.max(12, PIN_TOUCH_PX / zoom);
  // Topmost first: selected nodes are drawn last, so they are tested first.
  const list = [...geoms.values()].sort(
    (a, b) => Number(selection.has(b.node.id)) - Number(selection.has(a.node.id)),
  );

  // 1. Pins, nearest within reach (they may stick out of the node).
  let best: { d: number; hit: Hit } | undefined;
  for (const g of list) {
    for (const p of g.pins) {
      const ax = g.node.x + p.x;
      const ay = g.node.y + p.y;
      const d = Math.hypot(wx - ax, wy - ay);
      if (d <= pinR && (!best || d < best.d)) best = { d, hit: { kind: 'pin', node: g.node.id, pin: p.spec.id, spec: p.spec } };
    }
  }

  // 2. Inline values and node bodies.
  for (const g of list) {
    const { x, y } = g.node;
    if (wx < x || wx > x + g.w || wy < y || wy > y + g.h) continue;
    for (const p of g.pins) {
      const v = p.value;
      if (!v) continue;
      if (wx >= x + v.x - 4 && wx <= x + v.x + v.w + 4 && wy >= y + v.y - 4 && wy <= y + v.y + v.h + 4) {
        return { kind: 'value', node: g.node.id, pin: p.spec.id, spec: p.spec };
      }
    }
    if (best && best.d <= pinR * 0.7) return best.hit;
    return { kind: 'node', node: g.node.id };
  }
  if (best) return best.hit;

  // 3. Links.
  const linkR = LINK_TOUCH_PX / zoom;
  for (const l of Object.values(graph.links)) {
    const ga = geoms.get(l.from.node);
    const gb = geoms.get(l.to.node);
    const a = ga && pinWorld(ga, l.from.pin);
    const b = gb && pinWorld(gb, l.to.pin);
    if (!a || !b) continue;
    for (let i = 1; i < 24; i++) {
      const pt = bezierPoint(a.x, a.y, b.x, b.y, i / 24);
      if (Math.hypot(wx - pt.x, wy - pt.y) <= linkR) return { kind: 'link', link: l.id };
    }
  }
  return { kind: 'empty' };
}

/** Nodes whose box intersects a world rectangle. */
export function nodesInRect(geoms: Map<string, NodeGeom>, x0: number, y0: number, x1: number, y1: number): string[] {
  const [ax, bx] = x0 < x1 ? [x0, x1] : [x1, x0];
  const [ay, by] = y0 < y1 ? [y0, y1] : [y1, y0];
  const out: string[] = [];
  for (const g of geoms.values()) {
    if (g.node.x + g.w >= ax && g.node.x <= bx && g.node.y + g.h >= ay && g.node.y <= by) out.push(g.node.id);
  }
  return out;
}
