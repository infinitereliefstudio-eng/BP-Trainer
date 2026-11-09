/**
 * Typing generic nodes as wires come and go (see types/wildcard).
 * `adoptWildcard` runs before a connection is checked; `releaseWildcards`
 * after links are removed.
 */
import type { BlueprintClass, Graph, NodeInstance, PinRef, Project } from '../model/project';
import type { NodeContext, PinSpec } from '../nodes/definition';
import { contextFor, findPin, resolvePins } from '../nodes/registry';
import { adopt, encodeType, groupOf, release } from '../types/wildcard';

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
  if (pa.valueGroup || pb.valueGroup) return adoptMap(na, pa, nb, pb);
  const open = (p: typeof pa) => p.type.category === 'wildcard';
  if (open(pa) === open(pb)) return () => {};
  const [node, pin, other] = open(pa) ? [na, pa, pb] : [nb, pb, pa];
  // An array wildcard only takes an array, a single one only a single value.
  if (other.type.category !== 'exec' && (pin.type.container ?? '') !== (other.type.container ?? '')) return () => {};
  if (other.type.category === 'exec' && (pin.type.container || node.def !== 'util.reroute')) return () => {};
  if (other.type.category === 'delegate') return () => {};
  if (pin.accepts && !pin.accepts.includes(other.type.category)) return () => {};
  adopt(node, pin.wildGroup, encodeType(other.type));
  return () => release(node, groupOf(pin.wildGroup));
}

/** A generic Map pin joined to a typed Map: its key group and its value group each take their part. */
function adoptMap(na: NodeInstance, pa: PinSpec, nb: NodeInstance, pb: PinSpec): () => void {
  const [node, pin, other] = pa.valueGroup ? [na, pa, pb] : [nb, pb, pa];
  if (other.type.container !== 'map' || other.valueGroup) return () => {};
  const undo: (() => void)[] = [];
  if (pin.type.category === 'wildcard' && other.type.category !== 'wildcard') {
    adopt(node, pin.wildGroup, encodeType(other.type));
    undo.push(() => release(node, groupOf(pin.wildGroup)));
  }
  const v = other.type.value;
  if (pin.valueGroup && pin.type.value?.category === 'wildcard' && v && v.category !== 'wildcard') {
    adopt(node, pin.valueGroup, encodeType(v));
    undo.push(() => release(node, pin.valueGroup!));
  }
  return () => {
    for (const u of undo) u();
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
    if (!node.wild) continue;
    const pins = resolvePins(node, ctx).filter((p) => p.wild);
    const inGroup = (p: (typeof pins)[number], group: string) => groupOf(p.wildGroup) === group || p.valueGroup === group;
    for (const group of Object.keys(node.wild)) {
      const inUse = pins.some((p) => inGroup(p, group) && used.has(`${node.id}:${p.id}`));
      if (!inUse) {
        release(node, group);
        // Literals typed for the old type no longer make sense.
        for (const p of pins) if (inGroup(p, group)) delete node.defaults[p.id];
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
