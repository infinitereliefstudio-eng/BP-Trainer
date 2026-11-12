/** What the construction rules look at: one graph, with its exec wiring indexed. */
import type { BlueprintClass, Graph, NodeInstance, Project } from '../model/project';
import type { NodeContext } from '../nodes/definition';
import { findPin } from '../nodes/registry';

export interface GraphView {
  cls: BlueprintClass;
  graph: Graph;
  ctx: NodeContext;
  project: Project;
  /** node id → exec successors, in wire order. */
  next: Map<string, string[]>;
  /** "node:pin" of every output pin that has a wire. */
  wiredOut: Set<string>;
  /** "node:pin" of every input pin that has a wire. */
  wiredIn: Set<string>;
}

export function view(cls: BlueprintClass, graph: Graph, ctx: NodeContext, project: Project): GraphView {
  const next = new Map<string, string[]>();
  const wiredOut = new Set<string>();
  const wiredIn = new Set<string>();
  for (const l of Object.values(graph.links)) {
    wiredOut.add(`${l.from.node}:${l.from.pin}`);
    wiredIn.add(`${l.to.node}:${l.to.pin}`);
    const from = graph.nodes[l.from.node];
    if (!from || findPin(from, l.from.pin, ctx)?.type.category !== 'exec') continue;
    next.set(l.from.node, [...(next.get(l.from.node) ?? []), l.to.node]);
  }
  return { cls, graph, ctx, project, next, wiredOut, wiredIn };
}

/** Every node an event's exec wires lead to, the event excluded. */
export function reach(v: GraphView, start: string): NodeInstance[] {
  const seen = new Set<string>();
  const todo = [...(v.next.get(start) ?? [])];
  while (todo.length) {
    const id = todo.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    todo.push(...(v.next.get(id) ?? []));
  }
  return [...seen].map((id) => v.graph.nodes[id]).filter(Boolean);
}

/** `subject` names what the advice is about when it is not the node itself (a variable). */
export type AddAdvice = (rule: string, node: NodeInstance, title: string, text: string, subject?: string) => void;
export type Rule = (v: GraphView, add: AddAdvice) => void;
