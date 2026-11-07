/** Graph organisation: Reroute nodes on wires, Comment boxes around nodes. */
import type { Graph, NodeInstance } from '../model/project';
import type { NodeContext } from '../nodes/definition';
import { COMMENT_MIN } from '../nodes/library/organization';
import { addNode, connect, type OpResult } from './graphOps';

/** Cut a wire with a Reroute at (x, y), keeping both halves connected. */
export function insertReroute(graph: Graph, linkId: string, x: number, y: number, ctx: NodeContext): OpResult<NodeInstance> {
  const link = graph.links[linkId];
  if (!link) return { ok: false, reason: 'Lien introuvable.' };
  const knot = addNode(graph, 'util.reroute', x - 16, y - 10);
  if (!knot.ok) return knot;
  delete graph.links[linkId];
  const a = connect(graph, link.from, { node: knot.value.id, pin: 'in' }, ctx);
  const b = a.ok ? connect(graph, { node: knot.value.id, pin: 'out' }, link.to, ctx) : a;
  if (!a.ok || !b.ok) {
    delete graph.nodes[knot.value.id];
    for (const l of Object.values(graph.links)) if (l.from.node === knot.value.id || l.to.node === knot.value.id) delete graph.links[l.id];
    graph.links[link.id] = link;
    return { ok: false, reason: b.ok ? 'Impossible de couper ce fil.' : b.reason };
  }
  return knot;
}

/** A Comment framing a box (the selected nodes' bounds), with a margin and room for its title. */
export function addCommentAround(graph: Graph, box: { x: number; y: number; w: number; h: number }, text = 'Comment'): OpResult<NodeInstance> {
  const m = 24;
  const w = Math.max(COMMENT_MIN.w, Math.round(box.w + m * 2));
  const h = Math.max(COMMENT_MIN.h, Math.round(box.h + m * 2 + 30));
  return addNode(graph, 'util.comment', box.x - m, box.y - m - 30, { text, w, h });
}

/** Nodes lying entirely inside a Comment: they move with it. */
export function nodesInComment(
  graph: Graph,
  comment: NodeInstance,
  size: (n: NodeInstance) => { w: number; h: number },
): string[] {
  const w = Number(comment.config.w ?? 0),
    h = Number(comment.config.h ?? 0);
  return Object.values(graph.nodes)
    .filter((n) => n.id !== comment.id)
    .filter((n) => {
      const s = size(n);
      return n.x >= comment.x && n.y >= comment.y && n.x + s.w <= comment.x + w && n.y + s.h <= comment.y + h;
    })
    .map((n) => n.id);
}
