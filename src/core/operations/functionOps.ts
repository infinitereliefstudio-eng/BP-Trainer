/** Mutators for user functions: graphs with a signature, and their callers. */
import { newId } from '../model/ids';
import { createGraph, findGraph, uniqueName, type BlueprintClass, type Graph, type Param, type Project } from '../model/project';
import { contextFor } from '../nodes/registry';
import type { PinType } from '../types/pins';
import { validateName } from './classOps';
import { addNode, connect, removeNodes, type OpResult } from './graphOps';
import { pruneProject } from './projectOps';

const CALLS = ['call.function', 'call.pureFunction'];

function fnGraph(cls: BlueprintClass, graphId: string): Graph | undefined {
  const g = findGraph(cls, graphId);
  return g?.kind === 'function' && g.fn ? g : undefined;
}

/** Every call node of a function, in every Blueprint. */
function callers(p: Project, cls: BlueprintClass, graphId: string): { graph: Graph; ids: string[] }[] {
  const out: { graph: Graph; ids: string[] }[] = [];
  for (const c of p.classes) {
    for (const g of c.graphs) {
      const ids = Object.values(g.nodes)
        .filter((n) => CALLS.includes(n.def) && n.config.graph === graphId && (n.config.owner ?? c.id) === cls.id)
        .map((n) => n.id);
      if (ids.length) out.push({ graph: g, ids });
    }
  }
  return out;
}

export function addFunction(cls: BlueprintClass, name = 'NewFunction'): Graph {
  const g = createGraph(uniqueName(name, cls.graphs.map((x) => x.name)), 'function');
  cls.graphs.push(g);
  addNode(g, 'fn.entry', 0, 0, { graph: g.id });
  return g;
}

export function renameFunction(cls: BlueprintClass, graphId: string, name: string): OpResult {
  const g = fnGraph(cls, graphId);
  if (!g) return { ok: false, reason: 'Fonction introuvable.' };
  if (/\s/.test(name.trim())) return { ok: false, reason: "Un nom de fonction ne peut pas contenir d'espace." };
  const err = validateName(name, cls.graphs.filter((x) => x.id !== graphId).map((x) => x.name));
  if (err) return { ok: false, reason: err };
  g.name = name.trim();
  return { ok: true, value: undefined };
}

export function setFunctionDescription(cls: BlueprintClass, graphId: string, text: string): void {
  const g = fnGraph(cls, graphId);
  if (g?.fn) g.fn.description = text;
}

/** Pure ↔ impure: call nodes change kind, and lose their exec wires. */
export function setFunctionPure(p: Project, cls: BlueprintClass, graphId: string, pure: boolean): OpResult {
  const g = fnGraph(cls, graphId);
  if (!g?.fn) return { ok: false, reason: 'Fonction introuvable.' };
  g.fn.pure = pure;
  for (const { graph, ids } of callers(p, cls, graphId)) {
    for (const id of ids) graph.nodes[id].def = pure ? 'call.pureFunction' : 'call.function';
  }
  pruneProject(p);
  return { ok: true, value: undefined };
}

export type ParamSide = 'inputs' | 'outputs';

/** Add a parameter. The first output also creates a Return Node, like UE. */
export function addFunctionParam(p: Project, cls: BlueprintClass, graphId: string, side: ParamSide, type: PinType = { category: 'bool' }): Param | undefined {
  const g = fnGraph(cls, graphId);
  if (!g?.fn) return undefined;
  const all = [...g.fn.inputs, ...g.fn.outputs];
  const param: Param = { id: newId('pa'), name: uniqueName(side === 'inputs' ? 'NewParam' : 'ReturnValue', all.map((x) => x.name)), type };
  g.fn[side].push(param);
  if (side === 'outputs' && !Object.values(g.nodes).some((n) => n.def === 'fn.return')) {
    const entry = Object.values(g.nodes).find((n) => n.def === 'fn.entry');
    const ret = addNode(g, 'fn.return', (entry?.x ?? 0) + 420, entry?.y ?? 0, { graph: g.id });
    const entryBusy = entry && Object.values(g.links).some((l) => l.from.node === entry.id && l.from.pin === 'then');
    if (ret.ok && entry && !entryBusy) connect(g, { node: entry.id, pin: 'then' }, { node: ret.value.id, pin: 'exec' }, contextFor(cls, p));
  }
  return param;
}

export function updateFunctionParam(
  p: Project,
  cls: BlueprintClass,
  graphId: string,
  paramId: string,
  patch: { name?: string; type?: PinType },
): OpResult {
  const g = fnGraph(cls, graphId);
  const list = g?.fn ? [...g.fn.inputs, ...g.fn.outputs] : [];
  const param = list.find((x) => x.id === paramId);
  if (!param) return { ok: false, reason: 'Paramètre introuvable.' };
  if (patch.name !== undefined) {
    const err = validateName(patch.name, list.filter((x) => x.id !== paramId).map((x) => x.name));
    if (err) return { ok: false, reason: err };
    param.name = patch.name.trim();
  }
  if (patch.type) {
    param.type = patch.type;
    pruneProject(p);
  }
  return { ok: true, value: undefined };
}

export function removeFunctionParam(p: Project, cls: BlueprintClass, graphId: string, paramId: string): void {
  const g = fnGraph(cls, graphId);
  if (!g?.fn) return;
  g.fn.inputs = g.fn.inputs.filter((x) => x.id !== paramId);
  g.fn.outputs = g.fn.outputs.filter((x) => x.id !== paramId);
  pruneProject(p);
}

/** Delete a function and every node that calls it. */
export function removeFunction(p: Project, cls: BlueprintClass, graphId: string): void {
  for (const { graph, ids } of callers(p, cls, graphId)) removeNodes(graph, ids);
  cls.graphs = cls.graphs.filter((g) => g.id !== graphId);
}
