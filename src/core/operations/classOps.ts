/** Class-level mutators: variables and components. */
import { newId } from '../model/ids';
import {
  COMPONENT_LABEL,
  componentDefaults,
  type ComponentProps,
  type Dispatcher,
  type Param,
  type Project,
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

/** Nodes that point to a component of the class. */
const COMPONENT_NODES = ['var.component', 'event.componentBeginOverlap', 'event.componentEndOverlap'];

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
  patch: Partial<Pick<Variable, 'defaultValue' | 'instanceEditable' | 'private' | 'exposeOnSpawn' | 'category' | 'tooltip'>>,
): void {
  const v = cls.variables.find((x) => x.id === id);
  if (!v) return;
  Object.assign(v, patch);
  // Expose on Spawn needs Instance Editable: ticking it ticks Instance Editable (as UE does), untick goes the other way.
  if (patch.exposeOnSpawn) v.instanceEditable = true;
  if (patch.instanceEditable === false) v.exposeOnSpawn = false;
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
    props: componentDefaults(kind),
  };
  cls.components.push(c);
  return c;
}

export function updateComponentProps(cls: BlueprintClass, id: string, patch: Partial<ComponentProps>): void {
  const c = cls.components.find((x) => x.id === id);
  if (c) Object.assign(c.props, patch);
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
      .filter((n) => COMPONENT_NODES.includes(n.def) && n.config.component === id)
      .map((n) => n.id);
    removeNodes(g, ids);
  }
  return { ok: true, value: undefined };
}

export function setVariableDefault(cls: BlueprintClass, id: string, value: Value): void {
  updateVariable(cls, id, { defaultValue: value });
}

// -------------------------------------------------------------- dispatchers

/** Nodes that point to a dispatcher of a class (in any class of the project). */
const DISPATCHER_NODES = ['dispatcher.call', 'dispatcher.bind', 'dispatcher.unbind', 'dispatcher.unbindAll'];

export function addDispatcher(cls: BlueprintClass, name = 'NewEventDispatcher'): Dispatcher {
  const d: Dispatcher = {
    id: newId('d'),
    name: uniqueName(name, [...namesInUse(cls), ...cls.dispatchers.map((x) => x.name)]),
    params: [],
  };
  cls.dispatchers.push(d);
  return d;
}

export function renameDispatcher(cls: BlueprintClass, id: string, name: string): OpResult {
  const d = cls.dispatchers.find((x) => x.id === id);
  if (!d) return { ok: false, reason: 'Event Dispatcher introuvable.' };
  const err = validateName(name, [...namesInUse(cls), ...cls.dispatchers.filter((x) => x.id !== id).map((x) => x.name)]);
  if (err) return { ok: false, reason: err };
  d.name = name.trim();
  return { ok: true, value: undefined };
}

export function addDispatcherParam(cls: BlueprintClass, id: string, type: PinType = { category: 'bool' }): void {
  const d = cls.dispatchers.find((x) => x.id === id);
  if (!d) return;
  d.params.push({ id: newId('pa'), name: uniqueName('NewParam', d.params.map((p) => p.name)), type });
}

export function updateDispatcherParam(cls: BlueprintClass, id: string, paramId: string, patch: Partial<Pick<Param, 'name' | 'type'>>): void {
  const p = cls.dispatchers.find((x) => x.id === id)?.params.find((x) => x.id === paramId);
  if (p) Object.assign(p, patch);
}

export function removeDispatcherParam(cls: BlueprintClass, id: string, paramId: string): void {
  const d = cls.dispatchers.find((x) => x.id === id);
  if (d) d.params = d.params.filter((p) => p.id !== paramId);
}

/** Removes the dispatcher and every node that refers to it, in all classes. */
export function removeDispatcher(p: Project, cls: BlueprintClass, id: string): void {
  cls.dispatchers = cls.dispatchers.filter((d) => d.id !== id);
  for (const c of p.classes) {
    for (const g of c.graphs) {
      const ids = Object.values(g.nodes)
        .filter((n) => DISPATCHER_NODES.includes(n.def) && n.config.dispatcher === id)
        .map((n) => n.id);
      removeNodes(g, ids);
      for (const n of Object.values(g.nodes)) if (n.def === 'event.custom' && n.config.signature === id) delete n.config.signature;
    }
  }
}

// --------------------------------------------------------------- interfaces

export function implementInterface(cls: BlueprintClass, interfaceId: string): void {
  if (!cls.interfaces.includes(interfaceId)) cls.interfaces.push(interfaceId);
}

/** Removing an interface from Class Settings also removes its event nodes, like UE. */
export function removeImplementedInterface(cls: BlueprintClass, interfaceId: string): void {
  cls.interfaces = cls.interfaces.filter((i) => i !== interfaceId);
  for (const g of cls.graphs) {
    removeNodes(
      g,
      Object.values(g.nodes)
        .filter((n) => n.def === 'event.interface' && n.config.interface === interfaceId)
        .map((n) => n.id),
    );
  }
}
