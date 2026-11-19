/** Small graph edits the typical mistakes are made of. */
import { contextFor } from '../nodes/registry';
import { addNode, connect, disconnectPin, removeNodes } from '../operations/graphOps';
import { edit } from '../lessons/builder';
import type { ScenarioStep } from '../lessons/types';
import type { Project } from '../model/project';
import type { Value } from '../types/values';

/** The learner's graph of a drill's class, to change it. */
export const graphOf = (p: Project, className: string) => edit(p, className);

/** Unplug every wire of a pin. */
export function cut(p: Project, className: string, node: string, pin: string): void {
  disconnectPin(edit(p, className).graph, { node, pin });
}

/** Plug a wire (throws if UE would refuse it: a mistake must still compile as a graph). */
export function wire(p: Project, className: string, a: string, pa: string, c: string, pc: string): void {
  edit(p, className).link(a, pa, c, pc);
}

/**
 * Put another node in the place of one, with the same wires on the pins they
 * share (an Increment where a Decrement was, a > where a >= was).
 */
export function replaceNode(p: Project, className: string, node: string, def: string, config: Record<string, Value> = {}, defaults?: Record<string, Value>): string {
  const b = edit(p, className);
  const g = b.graph;
  const old = g.nodes[node];
  const links = Object.values(g.links).filter((l) => l.from.node === node || l.to.node === node);
  const r = addNode(g, def, old.x, old.y, config);
  if (!r.ok) throw new Error(r.reason);
  Object.assign(r.value.defaults, defaults ?? old.defaults);
  removeNodes(g, [node]);
  const ctx = contextFor(b.cls, p);
  for (const l of links) {
    const from = l.from.node === node ? { node: r.value.id, pin: l.from.pin } : l.from;
    const to = l.to.node === node ? { node: r.value.id, pin: l.to.pin } : l.to;
    connect(g, from, to, ctx);
  }
  return r.value.id;
}

/** Walk into a zone at (x, y), stay a moment, and walk out to (-500, 0). */
export const passThrough = (x = 0, y = 0): ScenarioStep[] => [{ teleport: [x, y] }, { wait: 0.3 }, { teleport: [-500, 0] }, { wait: 0.3 }];

/** Count the prints containing a text (case and accents ignored). */
export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
