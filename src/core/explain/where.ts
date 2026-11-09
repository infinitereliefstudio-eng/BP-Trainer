/**
 * Finding nodes across a project for the diagnostics: which graph holds a
 * node, what feeds an exec input (through Reroutes), who reads a pure output.
 */
import { findVariable, type BlueprintClass, type Graph, type NodeInstance, type Project } from '../model/project';
import type { NodeContext, PinSpec } from '../nodes/definition';
import { contextFor, getDefinition, nodeTitle, resolvePins } from '../nodes/registry';

/** A node with everything needed to name it and follow its wires. */
export interface Site {
  cls: BlueprintClass;
  graph: Graph;
  node: NodeInstance;
  ctx: NodeContext;
}

export function locate(project: Project, graphId: string, nodeId: string): Site | undefined {
  for (const cls of project.classes) {
    const graph = cls.graphs.find((g) => g.id === graphId);
    const node = graph?.nodes[nodeId];
    if (graph && node) return { cls, graph, node, ctx: contextFor(cls, project) };
  }
  return undefined;
}

export function siteOf(s: Site, nodeId: string): Site | undefined {
  const node = s.graph.nodes[nodeId];
  return node ? { ...s, node } : undefined;
}

/** Every node of the project matching `match`, with its site. */
export function findNodes(project: Project, match: (n: NodeInstance, cls: BlueprintClass, g: Graph) => boolean): Site[] {
  const out: Site[] = [];
  for (const cls of project.classes) {
    const ctx = contextFor(cls, project);
    for (const graph of cls.graphs) {
      for (const node of Object.values(graph.nodes)) if (match(node, cls, graph)) out.push({ cls, graph, node, ctx });
    }
  }
  return out;
}

/** A node's name in a sentence. A variable node's title (SET, or nothing) is replaced by its variable. */
export function titleOf(s: Site): string {
  let t = nodeTitle(s.node, s.ctx);
  if (s.node.def === 'var.set' || s.node.def === 'var.get') {
    const v = findVariable(s.cls, String(s.node.config.variable));
    if (v) t = `${s.node.def === 'var.set' ? 'Set' : 'Get'} ${v.name}`;
  }
  return `«\u00a0${t}\u00a0»`;
}

export function pinsOf(s: Site): PinSpec[] {
  return resolvePins(s.node, s.ctx);
}

export function isExec(p: PinSpec): boolean {
  return p.type.category === 'exec';
}

/** A pin's name as shown on the node (an unnamed exec output is "la sortie"). */
export function pinLabel(s: Site, pin: string): string {
  const p = pinsOf(s).find((x) => x.id === pin);
  return p?.name ? `«\u00a0${p.name}\u00a0»` : 'sa sortie';
}

/** Is this node run through exec wires (as opposed to a pure node or a getter)? */
export function isImpure(s: Site): boolean {
  const def = getDefinition(s.node.def);
  if (!def || def.kind === 'pure' || def.style === 'getter') return false;
  return pinsOf(s).some(isExec) || def.kind === 'event';
}

export function isEntry(s: Site): boolean {
  return getDefinition(s.node.def)?.kind === 'event' || s.node.def === 'fn.entry';
}

/** Exec outputs wired into an exec input of `s`, Reroutes skipped. */
export function execSources(s: Site): { site: Site; pin: string }[] {
  const out: { site: Site; pin: string }[] = [];
  const seen = new Set<string>();
  const walk = (nodeId: string, pins: string[]) => {
    for (const l of Object.values(s.graph.links)) {
      if (l.to.node !== nodeId || !pins.includes(l.to.pin)) continue;
      const from = s.graph.nodes[l.from.node];
      if (!from || seen.has(`${from.id}:${l.from.pin}`)) continue;
      seen.add(`${from.id}:${l.from.pin}`);
      if (from.def === 'util.reroute') walk(from.id, ['in']);
      else out.push({ site: { ...s, node: from }, pin: l.from.pin });
    }
  };
  const execIns = pinsOf(s)
    .filter((p) => p.dir === 'in' && isExec(p))
    .map((p) => p.id);
  walk(s.node.id, execIns);
  return out;
}

/** Impure nodes that read a pure node's outputs, through other pure nodes and Reroutes. */
export function readers(s: Site): Site[] {
  const out: Site[] = [];
  const seen = new Set<string>([s.node.id]);
  const queue = [s.node.id];
  while (queue.length) {
    const id = queue.shift()!;
    for (const l of Object.values(s.graph.links)) {
      if (l.from.node !== id || seen.has(l.to.node)) continue;
      seen.add(l.to.node);
      const to = s.graph.nodes[l.to.node];
      if (!to) continue;
      const site = { ...s, node: to };
      if (to.def === 'util.reroute' || !isImpure(site)) queue.push(to.id);
      else out.push(site);
    }
  }
  return out;
}

/** The node whose `delegate` output feeds `pin` of `s` (Bind Event, Set Timer by Event). */
export function delegateSource(s: Site, pin = 'event'): NodeInstance | undefined {
  const l = Object.values(s.graph.links).find((x) => x.to.node === s.node.id && x.to.pin === pin);
  return l ? s.graph.nodes[l.from.node] : undefined;
}
