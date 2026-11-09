/**
 * Inputs and outputs of Blueprint Interface functions, and the function
 * graphs that implement those with outputs.
 *
 * As in UE, an interface function without outputs is implemented as an event
 * (Event Interagir), one with outputs as a function graph listed under
 * My Blueprint › Interfaces. That graph's signature is a copy of the
 * interface's, kept equal by `syncInterfaceGraphs` after every change.
 */
import { newId } from '../model/ids';
import { createGraph, uniqueName, type BlueprintClass, type Graph, type InterfaceFunction, type Param, type Project } from '../model/project';
import { contextFor } from '../nodes/registry';
import type { PinType } from '../types/pins';
import { validateName } from './classOps';
import { addNode, connect, type OpResult } from './graphOps';
import { pruneProject } from './projectOps';

export type InterfaceSide = 'inputs' | 'outputs';

function interfaceFunction(p: Project, ifaceId: string, fnId: string): InterfaceFunction | undefined {
  return p.interfaces.find((i) => i.id === ifaceId)?.functions.find((f) => f.id === fnId);
}

export function addInterfaceParam(p: Project, ifaceId: string, fnId: string, side: InterfaceSide, type: PinType = { category: 'bool' }): Param | undefined {
  const fn = interfaceFunction(p, ifaceId, fnId);
  if (!fn) return undefined;
  const all = [...(fn.inputs ?? []), ...(fn.outputs ?? [])];
  const param: Param = { id: newId('pa'), name: uniqueName(side === 'inputs' ? 'NewParam' : 'ReturnValue', all.map((x) => x.name)), type };
  fn[side] = [...(fn[side] ?? []), param];
  syncAll(p);
  return param;
}

export function updateInterfaceParam(p: Project, ifaceId: string, fnId: string, paramId: string, patch: { name?: string; type?: PinType }): OpResult {
  const fn = interfaceFunction(p, ifaceId, fnId);
  const all = fn ? [...(fn.inputs ?? []), ...(fn.outputs ?? [])] : [];
  const param = all.find((x) => x.id === paramId);
  if (!param) return { ok: false, reason: 'Paramètre introuvable.' };
  if (patch.name !== undefined) {
    const err = validateName(patch.name, all.filter((x) => x.id !== paramId).map((x) => x.name));
    if (err) return { ok: false, reason: err };
    param.name = patch.name.trim();
  }
  if (patch.type) param.type = patch.type;
  syncAll(p);
  return { ok: true, value: undefined };
}

export function removeInterfaceParam(p: Project, ifaceId: string, fnId: string, paramId: string): void {
  const fn = interfaceFunction(p, ifaceId, fnId);
  if (!fn) return;
  fn.inputs = (fn.inputs ?? []).filter((x) => x.id !== paramId);
  fn.outputs = (fn.outputs ?? []).filter((x) => x.id !== paramId);
  syncAll(p);
}

function syncAll(p: Project): void {
  for (const c of p.classes) syncInterfaceGraphs(p, c);
  pruneProject(p);
}

/**
 * Make the class's interface function graphs match what it implements: one
 * graph per implemented function that has outputs, named and typed like it.
 * Graphs of interfaces or functions that are gone, or no longer implemented,
 * are removed. Local Variables and the graph's nodes are kept.
 */
export function syncInterfaceGraphs(p: Project, cls: BlueprintClass): void {
  const wanted = new Map<string, { iface: string; fn: InterfaceFunction }>();
  for (const ifaceId of cls.interfaces) {
    const iface = p.interfaces.find((i) => i.id === ifaceId);
    for (const fn of iface?.functions ?? []) if (fn.outputs?.length) wanted.set(`${ifaceId}:${fn.id}`, { iface: ifaceId, fn });
  }
  cls.graphs = cls.graphs.filter((g) => !g.iface || wanted.has(`${g.iface.interface}:${g.iface.fn}`));
  for (const [key, { iface, fn }] of wanted) {
    let g = cls.graphs.find((x) => x.iface && `${x.iface.interface}:${x.iface.fn}` === key);
    if (!g) g = createInterfaceGraph(p, cls, iface, fn);
    g.name = fn.name;
    g.fn ??= { inputs: [], outputs: [], pure: false, description: '' };
    g.fn.inputs = structuredClone(fn.inputs ?? []);
    g.fn.outputs = structuredClone(fn.outputs ?? []);
    g.fn.pure = false;
  }
}

/** A new implementation: entry wired to a Return Node, as UE creates it. */
function createInterfaceGraph(p: Project, cls: BlueprintClass, ifaceId: string, fn: InterfaceFunction): Graph {
  const g = createGraph(fn.name, 'function');
  g.iface = { interface: ifaceId, fn: fn.id };
  g.fn = { inputs: structuredClone(fn.inputs ?? []), outputs: structuredClone(fn.outputs ?? []), pure: false, description: '' };
  cls.graphs.push(g);
  const entry = addNode(g, 'fn.entry', 0, 0, { graph: g.id });
  const ret = addNode(g, 'fn.return', 420, 0, { graph: g.id });
  if (entry.ok && ret.ok) connect(g, { node: entry.value.id, pin: 'then' }, { node: ret.value.id, pin: 'exec' }, contextFor(cls, p));
  return g;
}

/**
 * UE's fix when a Custom Event has the name of an interface function the
 * Blueprint implements: the Custom Event becomes the interface event, its
 * wires kept. Only for functions without outputs (those are events).
 */
export function convertToInterfaceEvent(p: Project, cls: BlueprintClass, graph: Graph, nodeId: string): OpResult {
  const node = graph.nodes[nodeId];
  if (node?.def !== 'event.custom') return { ok: false, reason: 'Ce nœud n’est pas un Custom Event.' };
  const match = interfaceMatch(p, cls, String(node.config.name));
  if (!match) return { ok: false, reason: 'Aucune fonction d’interface implémentée ne porte ce nom.' };
  if (match.fn.outputs?.length) return { ok: false, reason: `${match.fn.name} a une sortie : elle s'implémente comme une fonction, pas comme un événement.` };
  if (cls.graphs.some((g) => Object.values(g.nodes).some((n) => n.def === 'event.interface' && n.config.interface === match.iface && n.config.fn === match.fn.id))) {
    return { ok: false, reason: `Event ${match.fn.name} existe déjà dans ce Blueprint.` };
  }
  // Parameters of the interface replace the Custom Event's (it had none, or a dispatcher's).
  const keep = new Set(['then', ...(match.fn.inputs ?? []).map((x) => x.id)]);
  for (const l of Object.values(graph.links)) if (l.from.node === nodeId && !keep.has(l.from.pin)) delete graph.links[l.id];
  node.def = 'event.interface';
  node.config = { interface: match.iface, fn: match.fn.id };
  return { ok: true, value: undefined };
}

/** The implemented interface function (without outputs) a Custom Event of this name could become. */
export function interfaceMatch(p: Project, cls: BlueprintClass, name: string): { iface: string; fn: InterfaceFunction } | undefined {
  for (const ifaceId of cls.interfaces) {
    const fn = p.interfaces.find((i) => i.id === ifaceId)?.functions.find((f) => f.name === name);
    if (fn) return { iface: ifaceId, fn };
  }
  return undefined;
}
