/**
 * Format 10: Add / Remove Mapping Context gained UE's Target pin (the
 * Enhanced Input Local Player Subsystem), which must be connected. Older
 * projects called them with no target, the app finding the subsystem for
 * them: this step writes that path into the graph instead, so they keep
 * working — Get Player Controller → Enhanced Input Local Player Subsystem →
 * Target.
 */
import { newId } from '../model/ids';
import type { Graph, NodeInstance } from '../model/project';

const TARGETED = new Set(['input.addMappingContext', 'input.removeMappingContext']);

function node(def: string, x: number, y: number): NodeInstance {
  return { id: newId('n'), def, x, y, config: {}, defaults: {} };
}

function link(g: Graph, from: NodeInstance, fromPin: string, to: NodeInstance, toPin: string): void {
  const id = newId('l');
  g.links[id] = { id, from: { node: from.id, pin: fromPin }, to: { node: to.id, pin: toPin } };
}

/** Give every Add / Remove Mapping Context without a Target its own subsystem chain. */
export function wireSubsystemTargets(graphs: Graph[]): void {
  for (const g of graphs) {
    if (!g?.nodes || !g.links) continue;
    const linked = new Set(Object.values(g.links).map((l) => `${l.to?.node}:${l.to?.pin}`));
    for (const n of Object.values(g.nodes)) {
      if (!TARGETED.has(n.def) || linked.has(`${n.id}:target`)) continue;
      const pc = node('player.getController', n.x - 560, n.y + 170);
      const sub = node('input.subsystem', n.x - 280, n.y + 170);
      g.nodes[pc.id] = pc;
      g.nodes[sub.id] = sub;
      link(g, pc, 'result', sub, 'controller');
      link(g, sub, 'result', n, 'target');
    }
  }
}
