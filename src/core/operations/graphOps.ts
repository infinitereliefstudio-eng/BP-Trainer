/**
 * Graph mutators. Each function changes the model in place; the store wraps
 * calls in a history transaction, so none of them deals with undo.
 */
import { newId } from '../model/ids';
import type { BlueprintClass, Graph, Link, NodeInstance, PinRef } from '../model/project';
import { checkConnection, pinSpec } from '../graph/rules';
import { conversionFor } from '../nodes/library/conversions';
import type { NodeContext } from '../nodes/definition';
import { getDefinition, resolvePins } from '../nodes/registry';
import { isAssignable } from '../types/pins';
import type { Value } from '../types/values';
import { adoptWildcard, releaseWildcards } from './wildcardOps';

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
  if (defId === 'event.interface') {
    const dup = Object.values(graph.nodes).some((n) => n.def === defId && n.config.interface === config.interface && n.config.fn === config.fn);
    if (dup) return fail('Cette fonction d’interface est déjà implémentée dans le graphe.');
  }
  if (defId === 'event.componentBeginOverlap' || defId === 'event.componentEndOverlap') {
    const dup = Object.values(graph.nodes).some((n) => n.def === defId && n.config.component === config.component);
    if (dup) return fail('Cet événement existe déjà pour ce composant.');
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
  // A function always keeps its entry node, like in UE.
  const set = new Set([...ids].filter((id) => graph.nodes[id]?.def !== 'fn.entry'));
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
  const undoAdopt = adoptWildcard(graph, a, b, ctx);
  const check = checkConnection(graph, a, b, ctx);
  if (!check.ok) {
    undoAdopt();
    const converted = connectWithConversion(graph, a, b, ctx);
    return converted ?? check;
  }
  for (const id of check.replaces) delete graph.links[id];
  const link: Link = { id: newId('l'), from: { ...check.from }, to: { ...check.to } };
  graph.links[link.id] = link;
  if (check.replaces.length) releaseWildcards(graph, ctx);
  return ok(link);
}

/**
 * UE inserts a conversion node when two convertible types are joined
 * (Integer → String…). Returns undefined when no conversion applies.
 */
function connectWithConversion(graph: Graph, a: PinRef, b: PinRef, ctx: NodeContext): OpResult<Link> | undefined {
  const pa = pinSpec(graph, a, ctx);
  const pb = pinSpec(graph, b, ctx);
  if (!pa || !pb || pa.dir === pb.dir || a.node === b.node) return undefined;
  const [from, to, fromSpec, toSpec] = pa.dir === 'out' ? [a, b, pa, pb] : [b, a, pb, pa];
  const convId = conversionFor(fromSpec.type, toSpec.type);
  if (!convId) return undefined;
  const fromNode = graph.nodes[from.node];
  const toNode = graph.nodes[to.node];
  const conv = addNode(graph, convId, (fromNode.x + toNode.x) / 2, (fromNode.y + toNode.y) / 2 + 40);
  if (!conv.ok) return undefined;
  const first = connect(graph, from, { node: conv.value.id, pin: 'in' }, ctx);
  const second = connect(graph, { node: conv.value.id, pin: 'result' }, to, ctx);
  if (!first.ok || !second.ok) {
    removeNodes(graph, [conv.value.id]);
    return undefined;
  }
  return second;
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
  if (removed) releaseWildcards(graph, ctx);
  return removed;
}

export function pruneAllGraphs(cls: BlueprintClass, ctx: NodeContext): void {
  for (const g of cls.graphs) pruneInvalidLinks(g, ctx);
}
