/** Class-level mutators: variables and components. */
import { newId } from '../model/ids';
import {
  COMPONENT_LABEL,
  uniqueName,
  type BlueprintClass,
  type Component,
  type ComponentKind,
  type Variable,
} from '../model/project';
import { contextFor } from '../nodes/registry';
import type { PinType } from '../types/pins';
import { defaultValueFor, type Value } from '../types/values';
import { pruneAllGraphs, removeNodes, type OpResult } from './graphOps';

const MAX_NAME = 64;

export function validateName(name: string, taken: string[]): string | null {
  const n = name.trim();
  if (!n) return 'Le nom ne peut pas être vide.';
  if (n.length > MAX_NAME) return `Le nom ne peut pas dépasser ${MAX_NAME} caractères.`;
  if (taken.some((t) => t.toLowerCase() === n.toLowerCase())) return 'Ce nom est déjà utilisé.';
  return null;
}

function namesInUse(cls: BlueprintClass, exceptId?: string): string[] {
  return [
    ...cls.variables.filter((v) => v.id !== exceptId).map((v) => v.name),
    ...cls.components.filter((c) => c.id !== exceptId).map((c) => c.name),
  ];
}

// ---------------------------------------------------------------- variables

export function addVariable(cls: BlueprintClass, type: PinType = { category: 'bool' }, name = 'NewVar'): Variable {
  const v: Variable = {
    id: newId('v'),
    name: uniqueName(name, namesInUse(cls)),
    type,
    defaultValue: defaultValueFor(type),
    instanceEditable: false,
    category: 'Default',
    tooltip: '',
  };
  cls.variables.push(v);
  return v;
}

export function renameVariable(cls: BlueprintClass, id: string, name: string): OpResult {
  const v = cls.variables.find((x) => x.id === id);
  if (!v) return { ok: false, reason: 'Variable introuvable.' };
  const err = validateName(name, namesInUse(cls, id));
  if (err) return { ok: false, reason: err };
  v.name = name.trim();
  return { ok: true, value: undefined };
}

/** Changing the type resets the default and breaks now-invalid links, like UE. */
export function setVariableType(cls: BlueprintClass, id: string, type: PinType): void {
  const v = cls.variables.find((x) => x.id === id);
  if (!v) return;
  v.type = type;
  v.defaultValue = defaultValueFor(type);
  for (const g of cls.graphs) {
    for (const n of Object.values(g.nodes)) {
      if (n.def === 'var.set' && n.config.variable === id) delete n.defaults.value;
    }
  }
  pruneAllGraphs(cls, contextFor(cls));
}

export function updateVariable(
  cls: BlueprintClass,
  id: string,
  patch: Partial<Pick<Variable, 'defaultValue' | 'instanceEditable' | 'category' | 'tooltip'>>,
): void {
  const v = cls.variables.find((x) => x.id === id);
  if (v) Object.assign(v, patch);
}

/** Deleting a variable also deletes its Get/Set nodes, as UE does. */
export function removeVariable(cls: BlueprintClass, id: string): number {
  cls.variables = cls.variables.filter((v) => v.id !== id);
  let removed = 0;
  for (const g of cls.graphs) {
    const ids = Object.values(g.nodes)
      .filter((n) => (n.def === 'var.get' || n.def === 'var.set') && n.config.variable === id)
      .map((n) => n.id);
    removed += ids.length;
    removeNodes(g, ids);
  }
  return removed;
}

export function variableUsage(cls: BlueprintClass, id: string): number {
  let count = 0;
  for (const g of cls.graphs) {
    for (const n of Object.values(g.nodes)) {
      if ((n.def === 'var.get' || n.def === 'var.set') && n.config.variable === id) count++;
    }
  }
  return count;
}

// --------------------------------------------------------------- components

const DEFAULT_COMPONENT_NAME: Record<ComponentKind, string> = {
  Scene: 'Scene',
  StaticMesh: 'StaticMesh',
  PointLight: 'PointLight',
  BoxCollision: 'Box',
  TextRender: 'TextRender',
};

export function addComponent(cls: BlueprintClass, kind: ComponentKind): Component {
  const root = cls.components.find((c) => !c.parent);
  const c: Component = {
    id: newId('cmp'),
    name: uniqueName(DEFAULT_COMPONENT_NAME[kind], namesInUse(cls)),
    kind,
    parent: root?.id,
  };
  cls.components.push(c);
  return c;
}

export function renameComponent(cls: BlueprintClass, id: string, name: string): OpResult {
  const c = cls.components.find((x) => x.id === id);
  if (!c) return { ok: false, reason: 'Composant introuvable.' };
  const err = validateName(name, namesInUse(cls, id));
  if (err) return { ok: false, reason: err };
  c.name = name.trim();
  return { ok: true, value: undefined };
}

export function removeComponent(cls: BlueprintClass, id: string): OpResult {
  const c = cls.components.find((x) => x.id === id);
  if (!c) return { ok: false, reason: 'Composant introuvable.' };
  if (!c.parent) return { ok: false, reason: `Le composant racine (${COMPONENT_LABEL[c.kind]}) ne peut pas être supprimé.` };
  // Children move up to the removed component's parent.
  for (const child of cls.components) if (child.parent === id) child.parent = c.parent;
  cls.components = cls.components.filter((x) => x.id !== id);
  for (const g of cls.graphs) {
    const ids = Object.values(g.nodes)
      .filter((n) => n.def === 'var.component' && n.config.component === id)
      .map((n) => n.id);
    removeNodes(g, ids);
  }
  return { ok: true, value: undefined };
}

export function setVariableDefault(cls: BlueprintClass, id: string, value: Value): void {
  updateVariable(cls, id, { defaultValue: value });
}
