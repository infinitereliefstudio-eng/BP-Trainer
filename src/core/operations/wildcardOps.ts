/**
 * Typing generic nodes as wires come and go (see types/wildcard).
 * `adoptWildcard` runs before a connection is checked; `releaseWildcards`
 * after links are removed.
 */
import type { BlueprintClass, Graph, PinRef, Project } from '../model/project';
import type { NodeContext } from '../nodes/definition';
import { contextFor, findPin, resolvePins } from '../nodes/registry';
import { encodeType, wildKey } from '../types/wildcard';

/**
 * Joining an untyped wildcard pin to a typed pin types the wildcard's node.
 * Returns an undo function for when the connection is then refused.
 */
export function adoptWildcard(graph: Graph, a: PinRef, b: PinRef, ctx: NodeContext): () => void {
  const na = graph.nodes[a.node];
  const nb = graph.nodes[b.node];
  const pa = na && findPin(na, a.pin, ctx);
  const pb = nb && findPin(nb, b.pin, ctx);
  if (!pa || !pb) return () => {};
  const open = (p: typeof pa) => p.type.category === 'wildcard';
  if (open(pa) === open(pb)) return () => {};
  const [node, pin, other] = open(pa) ? [na, pa, pb] : [nb, pb, pa];
  // An array wildcard only takes an array, a single one only a single value.
  if (other.type.category !== 'exec' && (pin.type.container ?? '') !== (other.type.container ?? '')) return () => {};
  if (other.type.category === 'exec' && (pin.type.container || node.def !== 'util.reroute')) return () => {};
  if (other.type.category === 'delegate') return () => {};
  if (pin.accepts && !pin.accepts.includes(other.type.category)) return () => {};
  const key = wildKey(pin.wildGroup);
  node.config[key] = encodeType(other.type);
  return () => {
    delete node.config[key];
  };
}

/** A generic node with no wire left on a wildcard group becomes generic again. */
export function releaseWildcards(graph: Graph, ctx: NodeContext): void {
  const used = new Set<string>();
  for (const l of Object.values(graph.links)) {
    used.add(`${l.from.node}:${l.from.pin}`);
    used.add(`${l.to.node}:${l.to.pin}`);
  }
  for (const node of Object.values(graph.nodes)) {
    const keys = Object.keys(node.config).filter((k) => k === 'wild' || k.startsWith('wild:'));
    if (!keys.length) continue;
    const pins = resolvePins(node, ctx).filter((p) => p.wild);
    for (const key of keys) {
      const inUse = pins.some((p) => wildKey(p.wildGroup) === key && used.has(`${node.id}:${p.id}`));
      if (!inUse) {
        delete node.config[key];
        // Literals typed for the old type no longer make sense.
        for (const p of pins) if (wildKey(p.wildGroup) === key) delete node.defaults[p.id];
      }
    }
  }
}

/** releaseWildcards on every graph of a class. */
export function releaseClassWildcards(cls: BlueprintClass, project: Project): void {
  const ctx = contextFor(cls, project);
  for (const g of cls.graphs) releaseWildcards(g, ctx);
}

/** Type every generic node from the wires it already has (projects saved before format 4). */
export function adoptFromLinks(project: Project): void {
  for (const cls of project.classes) {
    const ctx = contextFor(cls, project);
    for (const g of cls.graphs) {
      for (const l of Object.values(g.links)) adoptWildcard(g, l.from, l.to, ctx);
    }
  }
}
