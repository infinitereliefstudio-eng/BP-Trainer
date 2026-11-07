/**
 * Node geometry in world units: size, pin anchors, inline value boxes.
 * Shared by the renderer and the hit-tester so they always agree.
 */
import type { Graph, NodeInstance } from '@core/model/project';
import type { NodeContext, NodeDefinition, NodeStyle, PinSpec } from '@core/nodes/definition';
import { COMMENT_MIN } from '@core/nodes/library/organization';
import { getDefinition, nodeTitle, pinValue, resolvePins } from '@core/nodes/registry';
import { formatValue } from '@core/types/values';
import { METRICS } from './theme';

export type Measure = (text: string, font: string) => number;

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PinGeom {
  spec: PinSpec;
  /** Anchor of the pin, relative to the node origin. */
  x: number;
  y: number;
  linked: boolean;
  /** Inline literal editor, relative to the node origin. */
  value?: Box & { text: string };
  labelX: number;
}

export interface NodeGeom {
  node: NodeInstance;
  def?: NodeDefinition;
  style: NodeStyle;
  title: string;
  w: number;
  h: number;
  headerH: number;
  pins: PinGeom[];
}

const { headerH, rowH, padX, minW } = METRICS;
/** Distance from the node edge to a pin anchor. */
export const PIN_INSET = 14;

/** Size of a Reroute node and the height of a Comment's title bar. */
export const KNOT = { w: 32, h: 20 };
export const COMMENT_HEADER = 30;

/** Inputs whose literal can be typed on the node. */
export function hasInlineValue(p: PinSpec): boolean {
  if (p.dir !== 'in' || p.byRef || p.type.container === 'array') return false;
  if (p.type.category === 'struct') return p.type.subtype === 'LinearColor';
  return ['bool', 'int', 'float', 'string', 'enum', 'class'].includes(p.type.category);
}

/** Text shown in an inline value box: enum entries and classes by name. */
export function inlineText(node: NodeInstance, p: PinSpec, ctx: NodeContext): string {
  const v = pinValue(node, p);
  if (p.type.category === 'class') {
    const cls = typeof v === 'string' ? ctx.project?.classes.find((c) => c.id === v) : undefined;
    return cls?.name ?? 'Choisir…';
  }
  if (p.type.category === 'struct') return String(v ?? '#ffffff');
  return formatValue(v, p.type, ctx.project);
}

function valueWidth(p: PinSpec, text: string, measure: Measure): number {
  if (p.type.category === 'bool') return 16;
  if (p.type.category === 'struct') return 34;
  if (p.type.category === 'string') return Math.min(140, Math.max(44, measure(text, METRICS.labelFont) + 14));
  return Math.min(80, Math.max(40, measure(text, METRICS.labelFont) + 14));
}

export function layoutNode(
  node: NodeInstance,
  ctx: NodeContext,
  measure: Measure,
  linkedPins: Set<string>,
): NodeGeom {
  const def = getDefinition(node.def);
  const style: NodeStyle = def?.style ?? 'standard';
  const title = nodeTitle(node, ctx);
  const pins = resolvePins(node, ctx);
  const isLinked = (p: PinSpec) => linkedPins.has(`${node.id}:${p.id}`);

  if (style === 'comment') {
    const w = Math.max(COMMENT_MIN.w, Number(node.config.w ?? 480));
    const h = Math.max(COMMENT_MIN.h, Number(node.config.h ?? 280));
    return { node, def, style, title, w, h, headerH: COMMENT_HEADER, pins: [] };
  }
  if (style === 'knot') {
    const geoms: PinGeom[] = pins.map((p) => ({ spec: p, x: p.dir === 'in' ? 6 : KNOT.w - 6, y: KNOT.h / 2, linked: isLinked(p), labelX: 0 }));
    return { node, def, style, title, w: KNOT.w, h: KNOT.h, headerH: 0, pins: geoms };
  }
  if (style === 'getter') return layoutGetter(node, def, title, pins, measure, isLinked);
  if (style === 'compact') return layoutCompact(node, def, title, pins, measure, isLinked, ctx);

  const ins = pins.filter((p) => p.dir === 'in');
  const outs = pins.filter((p) => p.dir === 'out');
  const rows = Math.max(ins.length, outs.length, 1);

  let leftW = 0;
  const inGeoms: PinGeom[] = ins.map((p, i) => {
    const y = headerH + 6 + i * rowH + rowH / 2;
    const linked = isLinked(p);
    const label = p.hideName ? 0 : measure(p.name, METRICS.labelFont);
    let w = 18 + label;
    let value: PinGeom['value'];
    if (!linked && hasInlineValue(p)) {
      const text = inlineText(node, p, ctx);
      const vw = valueWidth(p, text, measure);
      const vx = padX + w + (label ? 8 : 0);
      value = { x: vx, y: y - 9, w: vw, h: 18, text };
      w += vw + (label ? 8 : 0);
    } else if (!linked && p.defaultsToSelf) {
      w += measure('self', METRICS.labelFont) + 8;
    }
    leftW = Math.max(leftW, w);
    return { spec: p, x: PIN_INSET, y, linked, value, labelX: PIN_INSET + 14 };
  });

  let rightW = 0;
  for (const p of outs) rightW = Math.max(rightW, (p.hideName ? 0 : measure(p.name, METRICS.labelFont)) + 18);

  const latentExtra = def?.kind === 'latent' ? 22 : 0;
  const titleW = measure(title, METRICS.font) + padX * 2 + latentExtra;
  const w = Math.ceil(Math.max(minW, titleW, padX * 2 + leftW + rightW + 24));
  const h = headerH + 6 + rows * rowH + 8;

  const outGeoms: PinGeom[] = outs.map((p, i) => ({
    spec: p,
    x: w - PIN_INSET,
    y: headerH + 6 + i * rowH + rowH / 2,
    linked: isLinked(p),
    labelX: w - PIN_INSET - 14,
  }));
  return { node, def, style, title, w, h, headerH, pins: [...inGeoms, ...outGeoms] };
}

function layoutGetter(
  node: NodeInstance,
  def: NodeDefinition | undefined,
  title: string,
  pins: PinSpec[],
  measure: Measure,
  isLinked: (p: PinSpec) => boolean,
): NodeGeom {
  const h = 30;
  const w = Math.ceil(Math.max(70, measure(title, METRICS.font) + 40));
  const out = pins.find((p) => p.dir === 'out');
  const geoms: PinGeom[] = out ? [{ spec: out, x: w - PIN_INSET, y: h / 2, linked: isLinked(out), labelX: 0 }] : [];
  return { node, def, style: 'getter', title, w, h, headerH: 0, pins: geoms };
}

function layoutCompact(
  node: NodeInstance,
  def: NodeDefinition | undefined,
  title: string,
  pins: PinSpec[],
  measure: Measure,
  isLinked: (p: PinSpec) => boolean,
  ctx: NodeContext,
): NodeGeom {
  const ins = pins.filter((p) => p.dir === 'in');
  const outs = pins.filter((p) => p.dir === 'out');
  const rows = Math.max(ins.length, outs.length, 1);
  const h = Math.max(44, rows * rowH + 14);
  let leftW = 0;
  const inGeoms: PinGeom[] = ins.map((p, i) => {
    const y = 7 + i * rowH + rowH / 2 + (h - 14 - rows * rowH) / 2;
    const linked = isLinked(p);
    let value: PinGeom['value'];
    let w = 18;
    if (!linked && hasInlineValue(p)) {
      const text = inlineText(node, p, ctx);
      const vw = valueWidth(p, text, measure);
      value = { x: padX + 16, y: y - 9, w: vw, h: 18, text };
      w += vw + 4;
    }
    leftW = Math.max(leftW, w);
    return { spec: p, x: PIN_INSET, y, linked, value, labelX: PIN_INSET + 14 };
  });
  const symbol = def?.symbol ?? title;
  const w = Math.ceil(Math.max(76, padX * 2 + leftW + measure(symbol, METRICS.symbolFont) + 30));
  const outGeoms: PinGeom[] = outs.map((p) => ({ spec: p, x: w - PIN_INSET, y: h / 2, linked: isLinked(p), labelX: w - PIN_INSET - 14 }));
  return { node, def, style: 'compact', title, w, h, headerH: 0, pins: [...inGeoms, ...outGeoms] };
}

/** Lay out every node of a graph once per frame. */
export function layoutGraph(graph: Graph, ctx: NodeContext, measure: Measure): Map<string, NodeGeom> {
  const linked = new Set<string>();
  for (const l of Object.values(graph.links)) {
    linked.add(`${l.from.node}:${l.from.pin}`);
    linked.add(`${l.to.node}:${l.to.pin}`);
  }
  const out = new Map<string, NodeGeom>();
  for (const n of Object.values(graph.nodes)) out.set(n.id, layoutNode(n, ctx, measure, linked));
  return out;
}

export function pinWorld(g: NodeGeom, pinId: string): { x: number; y: number } | undefined {
  const p = g.pins.find((q) => q.spec.id === pinId);
  return p ? { x: g.node.x + p.x, y: g.node.y + p.y } : undefined;
}

export function graphBounds(geoms: Map<string, NodeGeom>): Box | undefined {
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  for (const g of geoms.values()) {
    x0 = Math.min(x0, g.node.x);
    y0 = Math.min(y0, g.node.y);
    x1 = Math.max(x1, g.node.x + g.w);
    y1 = Math.max(y1, g.node.y + g.h);
  }
  return Number.isFinite(x0) ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : undefined;
}
