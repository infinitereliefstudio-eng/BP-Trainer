/**
 * Graph mutators. Each function changes the model in place; the store wraps
 * calls in a history transaction, so none of them deals with undo.
 */
import { newId } from '../model/ids';
import type { BlueprintClass, Graph, Link, NodeInstance, PinRef } from '../model/project';
import { checkConnection } from '../graph/rules';
import type { NodeContext } from '../nodes/definition';
import { getDefinition, resolvePins } from '../nodes/registry';
import { isAssignable } from '../types/pins';
import type { Value } from '../types/values';

export type OpResult<T = void> = { ok: true; value: T } | { ok: false; reason: string };

const ok = <T>(value: T): OpResult<T> => ({ ok: true, value });
const fail = (reason: string): OpResult<never> => ({ ok: false, reason });

export function addNode(
  graph: Graph,
  defId: string,
  x: number,
  y: number,
  config: Record<string, Value> = {},
): OpResult<NodeInstance> {
  const def = getDefinition(defId);
  if (!def) return fail(`Nœud inconnu : ${defId}`);
  if (def.allowedIn && !def.allowedIn.includes(graph.kind)) {
    return fail(`${typeof def.title === 'string' ? def.title : 'Ce nœud'} n'est pas autorisé dans une fonction.`);
  }
  if (def.unique) {
    const existing = Object.values(graph.nodes).find((n) => n.def === defId);
    if (existing) return fail('Cet événement existe déjà dans le graphe.');
  }
  const node: NodeInstance = {
    id: newId('n'),
    def: defId,
    x: Math.round(x),
    y: Math.round(y),
    config: { ...(def.defaultConfig ?? {}), ...config },
    defaults: {},
  };
  graph.nodes[node.id] = node;
  return ok(node);
}

export function removeNodes(graph: Graph, ids: Iterable<string>): void {
  const set = new Set(ids);
  for (const id of set) delete graph.nodes[id];
  for (const l of Object.values(graph.links)) {
    if (set.has(l.from.node) || set.has(l.to.node)) delete graph.links[l.id];
  }
}

export function moveNodes(graph: Graph, ids: Iterable<string>, dx: number, dy: number): void {
  for (const id of ids) {
    const n = graph.nodes[id];
    if (n) {
      n.x += dx;
      n.y += dy;
    }
  }
}

/** Round positions once a drag ends, so saved files stay tidy. */
export function snapNodes(graph: Graph, ids: Iterable<string>, grid = 8): void {
  for (const id of ids) {
    const n = graph.nodes[id];
    if (n) {
      n.x = Math.round(n.x / grid) * grid;
      n.y = Math.round(n.y / grid) * grid;
    }
  }
}

export function connect(graph: Graph, a: PinRef, b: PinRef, ctx: NodeContext): OpResult<Link> {
  const check = checkConnection(graph, a, b, ctx);
  if (!check.ok) return check;
  for (const id of check.replaces) delete graph.links[id];
  const link: Link = { id: newId('l'), from: { ...check.from }, to: { ...check.to } };
  graph.links[link.id] = link;
  return ok(link);
}

export function disconnectPin(graph: Graph, ref: PinRef): number {
  let count = 0;
  for (const l of Object.values(graph.links)) {
    const hit =
      (l.from.node === ref.node && l.from.pin === ref.pin) ||
      (l.to.node === ref.node && l.to.pin === ref.pin);
    if (hit) {
      delete graph.links[l.id];
      count++;
    }
  }
  return count;
}

export function disconnectNode(graph: Graph, nodeId: string): number {
  let count = 0;
  for (const l of Object.values(graph.links)) {
    if (l.from.node === nodeId || l.to.node === nodeId) {
      delete graph.links[l.id];
      count++;
    }
  }
  return count;
}

export function setPinDefault(graph: Graph, nodeId: string, pinId: string, value: Value): void {
  const n = graph.nodes[nodeId];
  if (n) n.defaults[pinId] = value;
}

export function setNodeConfig(
  graph: Graph,
  nodeId: string,
  key: string,
  value: Value,
  ctx: NodeContext,
): void {
  const n = graph.nodes[nodeId];
  if (!n) return;
  n.config[key] = value;
  pruneInvalidLinks(graph, ctx);
}

/** Copy nodes (and the links between them) with an offset. */
export function duplicateNodes(graph: Graph, ids: string[], dx = 32, dy = 32): string[] {
  const map = new Map<string, string>();
  for (const id of ids) {
    const src = graph.nodes[id];
    if (!src) continue;
    const def = getDefinition(src.def);
    if (def?.unique) continue; // UE refuses to duplicate BeginPlay & co.
    const copy: NodeInstance = structuredClone(src);
    copy.id = newId('n');
    copy.x += dx;
    copy.y += dy;
    graph.nodes[copy.id] = copy;
    map.set(id, copy.id);
  }
  for (const l of Object.values(graph.links)) {
    const from = map.get(l.from.node);
    const to = map.get(l.to.node);
    if (from && to) {
      const id = newId('l');
      graph.links[id] = { id, from: { node: from, pin: l.from.pin }, to: { node: to, pin: l.to.pin } };
    }
  }
  return [...map.values()];
}

/**
 * Remove links whose pins disappeared or became incompatible (after a
 * variable type change, fewer Sequence outputs, a deleted variable…).
 */
export function pruneInvalidLinks(graph: Graph, ctx: NodeContext): number {
  let removed = 0;
  for (const l of Object.values(graph.links)) {
    const fromNode = graph.nodes[l.from.node];
    const toNode = graph.nodes[l.to.node];
    const fromPin = fromNode && resolvePins(fromNode, ctx).find((p) => p.id === l.from.pin);
    const toPin = toNode && resolvePins(toNode, ctx).find((p) => p.id === l.to.pin);
    if (!fromPin || !toPin || !isAssignable(fromPin.type, toPin.type, ctx.hierarchy)) {
      delete graph.links[l.id];
      removed++;
    }
  }
  return removed;
}

export function pruneAllGraphs(cls: BlueprintClass, ctx: NodeContext): void {
  for (const g of cls.graphs) pruneInvalidLinks(g, ctx);
}
