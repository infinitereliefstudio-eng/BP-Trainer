/**
 * Local Variables of a function (My Blueprint › Local Variables): they live
 * in the function's signature and exist only during one call.
 */
import { newId } from '../model/ids';
import { findGraph, uniqueName, type BlueprintClass, type Graph, type LocalVariable, type Project } from '../model/project';
import { inheritedView } from '../model/inheritance';
import { contextFor } from '../nodes/registry';
import type { PinType } from '../types/pins';
import { defaultValueFor, type Value } from '../types/values';
import { validateName } from './classOps';
import { pruneAllGraphs, removeNodes, type OpResult } from './graphOps';

const LOCAL_NODES = ['var.getLocal', 'var.setLocal'];

function fnGraph(cls: BlueprintClass, graphId: string): Graph | undefined {
  const g = findGraph(cls, graphId);
  return g?.kind === 'function' && g.fn ? g : undefined;
}

/** Names a local may not take: other locals, the function's parameters, the Blueprint's variables and components. */
function namesTaken(p: Project | undefined, cls: BlueprintClass, g: Graph, exceptId?: string): string[] {
  const view = inheritedView(cls, p, true);
  return [
    ...(g.fn?.locals ?? []).filter((l) => l.id !== exceptId).map((l) => l.name),
    ...(g.fn?.inputs ?? []).map((x) => x.name),
    ...(g.fn?.outputs ?? []).map((x) => x.name),
    ...view.variables.map((v) => v.name),
    ...view.components.map((c) => c.name),
  ];
}

export function addLocalVariable(p: Project | undefined, cls: BlueprintClass, graphId: string, type: PinType = { category: 'bool' }, name = 'NewLocalVar'): LocalVariable | undefined {
  const g = fnGraph(cls, graphId);
  if (!g?.fn) return undefined;
  const local: LocalVariable = { id: newId('lv'), name: uniqueName(name, namesTaken(p, cls, g)), type, defaultValue: defaultValueFor(type) };
  g.fn.locals ??= [];
  g.fn.locals.push(local);
  return local;
}

export function renameLocalVariable(p: Project | undefined, cls: BlueprintClass, graphId: string, id: string, name: string): OpResult {
  const g = fnGraph(cls, graphId);
  const local = g?.fn?.locals?.find((l) => l.id === id);
  if (!g || !local) return { ok: false, reason: 'Variable locale introuvable.' };
  if (/\s/.test(name.trim())) return { ok: false, reason: "Un nom de variable ne peut pas contenir d'espace." };
  const err = validateName(name, namesTaken(p, cls, g, id));
  if (err) return { ok: false, reason: err };
  local.name = name.trim();
  return { ok: true, value: undefined };
}

/** Changing the type resets the default and breaks now-invalid links, like a member variable. */
export function setLocalVariableType(p: Project | undefined, cls: BlueprintClass, graphId: string, id: string, type: PinType): void {
  const g = fnGraph(cls, graphId);
  const local = g?.fn?.locals?.find((l) => l.id === id);
  if (!g || !local) return;
  local.type = type;
  local.defaultValue = defaultValueFor(type);
  for (const n of Object.values(g.nodes)) {
    if (n.def === 'var.setLocal' && n.config.variable === id) delete n.defaults.value;
  }
  pruneAllGraphs(cls, contextFor(cls, p));
}

export function setLocalVariableDefault(cls: BlueprintClass, graphId: string, id: string, value: Value): void {
  const local = fnGraph(cls, graphId)?.fn?.locals?.find((l) => l.id === id);
  if (local) local.defaultValue = value;
}

/** Deleting a local deletes its Get/Set nodes, as UE does. Returns how many. */
export function removeLocalVariable(cls: BlueprintClass, graphId: string, id: string): number {
  const g = fnGraph(cls, graphId);
  if (!g?.fn) return 0;
  g.fn.locals = (g.fn.locals ?? []).filter((l) => l.id !== id);
  const ids = Object.values(g.nodes)
    .filter((n) => LOCAL_NODES.includes(n.def) && n.config.variable === id)
    .map((n) => n.id);
  removeNodes(g, ids);
  return ids.length;
}

export function localUsage(cls: BlueprintClass, graphId: string, id: string): number {
  const g = findGraph(cls, graphId);
  return g ? Object.values(g.nodes).filter((n) => LOCAL_NODES.includes(n.def) && n.config.variable === id).length : 0;
}
