/**
 * The project model: plain, JSON-serialisable data.
 *
 * Nothing here knows about the screen or the interpreter. Every change goes
 * through `operations` (pure mutators) wrapped by the history, so undo/redo
 * and saving work the same way for every feature.
 */
import type { PinType } from '../types/pins';
import type { Value } from '../types/values';
import { newId } from './ids';

export interface PinRef {
  node: string;
  pin: string;
}

/** A link always goes from an output pin to an input pin. */
export interface Link {
  id: string;
  from: PinRef;
  to: PinRef;
}

export interface NodeInstance {
  id: string;
  /** Id of the NodeDefinition in the library, e.g. "flow.branch". */
  def: string;
  x: number;
  y: number;
  /** Per-node settings: variable id, custom event name, number of outputs… */
  config: Record<string, Value>;
  /** Literal values typed on unconnected input pins, keyed by pin id. */
  defaults: Record<string, Value>;
}

export type GraphKind = 'event' | 'function';

export interface Graph {
  id: string;
  name: string;
  kind: GraphKind;
  nodes: Record<string, NodeInstance>;
  links: Record<string, Link>;
}

export interface Variable {
  id: string;
  name: string;
  type: PinType;
  defaultValue: Value;
  instanceEditable: boolean;
  category: string;
  tooltip: string;
}

export type ComponentKind =
  | 'Scene'
  | 'StaticMesh'
  | 'PointLight'
  | 'BoxCollision'
  | 'TextRender';

export interface Component {
  id: string;
  name: string;
  kind: ComponentKind;
  /** Parent component id; the root has none. */
  parent?: string;
}

export type ParentClass = 'Actor' | 'Pawn';

export interface BlueprintClass {
  id: string;
  name: string;
  parent: ParentClass;
  components: Component[];
  variables: Variable[];
  graphs: Graph[];
}

export interface Project {
  /** Format version of the saved file, see serialization/migrate. */
  format: number;
  id: string;
  name: string;
  classes: BlueprintClass[];
  createdAt: number;
  updatedAt: number;
}

export const PROJECT_FORMAT = 1;

/** Engine class each component kind maps to (used for reference pins). */
export const COMPONENT_CLASS: Record<ComponentKind, string> = {
  Scene: 'SceneComponent',
  StaticMesh: 'StaticMeshComponent',
  PointLight: 'PointLightComponent',
  BoxCollision: 'BoxComponent',
  TextRender: 'TextRenderComponent',
};

export const COMPONENT_LABEL: Record<ComponentKind, string> = {
  Scene: 'Scene',
  StaticMesh: 'Static Mesh',
  PointLight: 'Point Light',
  BoxCollision: 'Box Collision',
  TextRender: 'Text Render',
};

// ---------------------------------------------------------------- factories

export function createGraph(name: string, kind: GraphKind = 'event'): Graph {
  return { id: newId('g'), name, kind, nodes: {}, links: {} };
}

export function createClass(name: string, parent: ParentClass = 'Actor'): BlueprintClass {
  return {
    id: newId('c'),
    name,
    parent,
    components: [{ id: newId('cmp'), name: 'DefaultSceneRoot', kind: 'Scene' }],
    variables: [],
    graphs: [createGraph('EventGraph', 'event')],
  };
}

export function createProject(name = 'Mon projet'): Project {
  const now = Date.now();
  return {
    format: PROJECT_FORMAT,
    id: newId('p'),
    name,
    classes: [],
    createdAt: now,
    updatedAt: now,
  };
}

// ------------------------------------------------------------------ lookups

export function findClass(p: Project, id: string): BlueprintClass | undefined {
  return p.classes.find((c) => c.id === id);
}

export function findGraph(c: BlueprintClass, id: string): Graph | undefined {
  return c.graphs.find((g) => g.id === id);
}

export function findVariable(c: BlueprintClass, id: string): Variable | undefined {
  return c.variables.find((v) => v.id === id);
}

export function findComponent(c: BlueprintClass, id: string): Component | undefined {
  return c.components.find((k) => k.id === id);
}

export function linksOfPin(g: Graph, ref: PinRef): Link[] {
  return Object.values(g.links).filter(
    (l) =>
      (l.from.node === ref.node && l.from.pin === ref.pin) ||
      (l.to.node === ref.node && l.to.pin === ref.pin),
  );
}

export function linksOfNode(g: Graph, nodeId: string): Link[] {
  return Object.values(g.links).filter((l) => l.from.node === nodeId || l.to.node === nodeId);
}

/** UE-style unique naming: "NewVar", "NewVar_0", "NewVar_1"… */
export function uniqueName(base: string, taken: Iterable<string>): string {
  const set = new Set(taken);
  if (!set.has(base)) return base;
  for (let i = 0; ; i++) {
    const candidate = `${base}_${i}`;
    if (!set.has(candidate)) return candidate;
  }
}
