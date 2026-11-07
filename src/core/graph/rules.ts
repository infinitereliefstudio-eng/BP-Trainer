/**
 * Connection rules, as in UE:
 * - a link goes from an output to an input;
 * - a data input accepts one link (a new one replaces it);
 * - an exec output drives one link (a new one replaces it);
 * - data outputs and exec inputs accept many links;
 * - types must be assignable (object references accept subclasses).
 */
import type { Graph, PinRef } from '../model/project';
import type { NodeContext, PinSpec } from '../nodes/definition';
import { findPin } from '../nodes/registry';
import { isAssignable, typeLabel } from '../types/pins';

export type ConnectCheck =
  | { ok: true; from: PinRef; to: PinRef; replaces: string[] }
  | { ok: false; reason: string };

export function pinSpec(graph: Graph, ref: PinRef, ctx: NodeContext): PinSpec | undefined {
  const node = graph.nodes[ref.node];
  return node ? findPin(node, ref.pin, ctx) : undefined;
}

export function checkConnection(graph: Graph, a: PinRef, b: PinRef, ctx: NodeContext): ConnectCheck {
  const pa = pinSpec(graph, a, ctx);
  const pb = pinSpec(graph, b, ctx);
  if (!pa || !pb) return { ok: false, reason: 'Pin introuvable.' };
  if (a.node === b.node) return { ok: false, reason: 'Un nœud ne peut pas être relié à lui-même.' };
  if (pa.dir === pb.dir) {
    return {
      ok: false,
      reason: pa.dir === 'in' ? 'Les deux pins sont des entrées.' : 'Les deux pins sont des sorties.',
    };
  }
  const [from, to, pFrom, pTo] = pa.dir === 'out' ? [a, b, pa, pb] : [b, a, pb, pa];
  const fromExec = pFrom.type.category === 'exec';
  const toExec = pTo.type.category === 'exec';
  if (fromExec !== toExec) {
    return { ok: false, reason: "Un fil d'exécution (blanc) ne se relie qu'à une pin d'exécution." };
  }
  for (const [p, other] of [[pFrom, pTo], [pTo, pFrom]] as const) {
    if (p.accepts && !p.accepts.includes(other.type.category) && other.type.category !== 'wildcard') {
      return { ok: false, reason: `${p.name} n'accepte que : ${p.accepts.map((c) => typeLabel({ category: c })).join(', ')}.` };
    }
  }
  if (!isAssignable(pFrom.type, pTo.type, ctx.hierarchy)) {
    return {
      ok: false,
      reason: `${typeLabel(pFrom.type)} n'est pas compatible avec ${typeLabel(pTo.type)}.`,
    };
  }
  const replaces: string[] = [];
  for (const l of Object.values(graph.links)) {
    const sameFrom = l.from.node === from.node && l.from.pin === from.pin;
    const sameTo = l.to.node === to.node && l.to.pin === to.pin;
    if (sameFrom && sameTo) return { ok: false, reason: 'Ces deux pins sont déjà reliées.' };
    if (!toExec && sameTo) replaces.push(l.id); // data input: single source
    if (fromExec && sameFrom) replaces.push(l.id); // exec output: single target
  }
  return { ok: true, from, to, replaces };
}
