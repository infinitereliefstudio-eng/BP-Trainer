/**
 * Enhanced Input assets (Content Drawer › Input Action, Input Mapping
 * Context). Nodes name them by id in their config (`action`, `context`), so
 * renaming an asset keeps them, as UE keeps asset references.
 */
import { newId } from '../model/ids';
import { type InputAction, type InputMapping, type KeyName, type MappingContext, type Project, uniqueName } from '../model/project';
import { validateName } from './classOps';
import { takenNames } from './enumOps';
import type { OpResult } from './graphOps';

export const ACTION_EVENT = 'input.action';
export const CONTEXT_NODES = ['input.addMappingContext', 'input.removeMappingContext'];

export function findInputAction(p: Project, id: unknown): InputAction | undefined {
  return (p.inputActions ?? []).find((a) => a.id === id);
}

export function findMappingContext(p: Project, id: unknown): MappingContext | undefined {
  return (p.mappingContexts ?? []).find((c) => c.id === id);
}

function nodeUsage(p: Project, match: (def: string, config: Record<string, unknown>) => boolean): number {
  let n = 0;
  for (const c of p.classes) for (const g of c.graphs) for (const node of Object.values(g.nodes)) if (match(node.def, node.config)) n++;
  return n;
}

/** Action events of this action, and mapping lines that drive it. */
export function inputActionUsage(p: Project, id: string): { nodes: number; mappings: number } {
  return {
    nodes: nodeUsage(p, (def, cfg) => def === ACTION_EVENT && cfg.action === id),
    mappings: (p.mappingContexts ?? []).reduce((n, c) => n + c.mappings.filter((m) => m.action === id).length, 0),
  };
}

export function mappingContextUsage(p: Project, id: string): number {
  return nodeUsage(p, (def, cfg) => CONTEXT_NODES.includes(def) && cfg.context === id);
}

function checkName(p: Project, name: string, what: string, except?: string): string | undefined {
  if (/\s/.test(name.trim())) return `Un nom ${what} ne peut pas contenir d'espace.`;
  return validateName(name.trim(), takenNames(p, except)) ?? undefined;
}

export function addInputAction(p: Project, name = 'IA_NewAction'): OpResult<InputAction> {
  p.inputActions ??= [];
  const a: InputAction = { id: newId('ia'), name: uniqueName(name.trim() || 'IA_NewAction', takenNames(p)), valueType: 'Bool' };
  const err = checkName(p, a.name, "d'Input Action");
  if (err) return { ok: false, reason: err };
  p.inputActions.push(a);
  return { ok: true, value: a };
}

export function renameInputAction(p: Project, id: string, name: string): OpResult {
  const a = findInputAction(p, id);
  if (!a) return { ok: false, reason: 'Input Action introuvable.' };
  const err = checkName(p, name, "d'Input Action", id);
  if (err) return { ok: false, reason: err };
  a.name = name.trim();
  return { ok: true, value: undefined };
}

/** UE refuses to delete an asset still referenced; so do we. */
export function removeInputAction(p: Project, id: string): OpResult {
  const a = findInputAction(p, id);
  if (!a) return { ok: false, reason: 'Input Action introuvable.' };
  const used = inputActionUsage(p, id);
  if (used.nodes) return { ok: false, reason: `${a.name} a encore ${used.nodes} événement(s) dans les Blueprints : supprime-les d'abord.` };
  if (used.mappings) return { ok: false, reason: `${a.name} est encore utilisée par ${used.mappings} ligne(s) d'un Mapping Context : retire-les d'abord.` };
  p.inputActions = p.inputActions.filter((x) => x.id !== id);
  return { ok: true, value: undefined };
}

export function addMappingContext(p: Project, name = 'IMC_Default'): OpResult<MappingContext> {
  p.mappingContexts ??= [];
  const c: MappingContext = { id: newId('imc'), name: uniqueName(name.trim() || 'IMC_Default', takenNames(p)), mappings: [] };
  const err = checkName(p, c.name, 'de Mapping Context');
  if (err) return { ok: false, reason: err };
  p.mappingContexts.push(c);
  return { ok: true, value: c };
}

export function renameMappingContext(p: Project, id: string, name: string): OpResult {
  const c = findMappingContext(p, id);
  if (!c) return { ok: false, reason: 'Mapping Context introuvable.' };
  const err = checkName(p, name, 'de Mapping Context', id);
  if (err) return { ok: false, reason: err };
  c.name = name.trim();
  return { ok: true, value: undefined };
}

export function removeMappingContext(p: Project, id: string): OpResult {
  const c = findMappingContext(p, id);
  if (!c) return { ok: false, reason: 'Mapping Context introuvable.' };
  const used = mappingContextUsage(p, id);
  if (used) return { ok: false, reason: `${c.name} est encore utilisé par ${used} nœud(s) : supprime-les d'abord.` };
  p.mappingContexts = p.mappingContexts.filter((x) => x.id !== id);
  return { ok: true, value: undefined };
}

/** A new line: the first action of the project, key E, no trigger (Down). */
export function addMapping(p: Project, contextId: string, action?: string, key: KeyName = 'E'): OpResult<InputMapping> {
  const c = findMappingContext(p, contextId);
  if (!c) return { ok: false, reason: 'Mapping Context introuvable.' };
  const a = action ?? p.inputActions[0]?.id;
  if (!a) return { ok: false, reason: 'Crée d’abord une Input Action (Content Drawer › + Add › Input › Input Action).' };
  const m: InputMapping = { action: a, key, triggers: [] };
  c.mappings.push(m);
  return { ok: true, value: m };
}

export function setMapping(p: Project, contextId: string, index: number, change: Partial<InputMapping>): OpResult {
  const m = findMappingContext(p, contextId)?.mappings[index];
  if (!m) return { ok: false, reason: 'Ligne introuvable.' };
  Object.assign(m, change);
  return { ok: true, value: undefined };
}

export function removeMapping(p: Project, contextId: string, index: number): OpResult {
  const c = findMappingContext(p, contextId);
  if (!c?.mappings[index]) return { ok: false, reason: 'Ligne introuvable.' };
  c.mappings.splice(index, 1);
  return { ok: true, value: undefined };
}
