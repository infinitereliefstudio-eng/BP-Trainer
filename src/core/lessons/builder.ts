/**
 * A small helper to build projects in code: lesson setups, their reference
 * solutions and tests all use it.
 */
import { createProject, type BlueprintClass, type ComponentKind, type ComponentProps, type ParentClass, type Project } from '../model/project';
import { contextFor } from '../nodes/registry';
import { addComponent, addVariable, updateComponentProps } from '../operations/classOps';
import { ensureConstructionScript } from '../operations/constructionOps';
import { addNode, connect } from '../operations/graphOps';
import { placeActor } from '../operations/levelOps';
import { addClass } from '../operations/projectOps';
import type { PinType } from '../types/pins';
import type { Value } from '../types/values';

export class ClassBuilder {
  private x = 64;
  constructor(
    readonly cls: BlueprintClass,
    readonly project?: Project,
    private readonly graphId?: string,
  ) {}

  get graph() {
    return this.cls.graphs.find((g) => g.id === this.graphId) ?? this.cls.graphs[0];
  }

  /** The same class, building in another of its graphs (a function). */
  inGraph(graphId: string): ClassBuilder {
    return new ClassBuilder(this.cls, this.project, graphId);
  }

  /** The same class, building in its Construction Script; `entry` is the script's first node. */
  construction(): { b: ClassBuilder; entry: string } {
    const g = ensureConstructionScript(this.cls);
    return { b: new ClassBuilder(this.cls, this.project, g.id), entry: Object.values(g.nodes).find((n) => n.def === 'cs.entry')!.id };
  }

  component(kind: ComponentKind, name: string, props: Partial<ComponentProps> = {}): string {
    const c = addComponent(this.cls, kind);
    c.name = name;
    updateComponentProps(this.cls, c.id, props);
    return c.id;
  }

  variable(name: string, type: PinType, defaultValue?: Value): string {
    const v = addVariable(this.cls, type, name);
    if (defaultValue !== undefined) v.defaultValue = defaultValue;
    return v.id;
  }

  componentId(name: string): string {
    const c = this.cls.components.find((k) => k.name === name);
    if (!c) throw new Error(`No component ${name}`);
    return c.id;
  }

  /** Add a node; positions advance left to right so solutions stay readable. */
  node(def: string, config: Record<string, Value> = {}, defaults: Record<string, Value> = {}, at?: [number, number]): string {
    const [x, y] = at ?? [this.x, 96];
    if (!at) this.x += 300;
    const r = addNode(this.graph, def, x, y, config);
    if (!r.ok) throw new Error(r.reason);
    Object.assign(r.value.defaults, defaults);
    return r.value.id;
  }

  link(a: string, pa: string, b: string, pb: string): this {
    const r = connect(this.graph, { node: a, pin: pa }, { node: b, pin: pb }, contextFor(this.cls, this.project));
    if (!r.ok) throw new Error(r.reason);
    return this;
  }

  /** Get node for a component, wired into a node's Target pin. */
  target(componentName: string, node: string, pin = 'target'): this {
    const n = this.graph.nodes[node];
    const get = this.node('var.component', { component: this.componentId(componentName) }, {}, [n.x - 40, n.y + 175]);
    return this.link(get, 'value', node, pin);
  }
}

export class ProjectBuilder {
  readonly project: Project;
  constructor(name: string) {
    this.project = createProject(name);
  }

  blueprint(name: string, parent: ParentClass = 'Actor'): ClassBuilder {
    const r = addClass(this.project, name, parent);
    if (!r.ok) throw new Error(r.reason);
    return new ClassBuilder(r.value, this.project);
  }

  place(cls: ClassBuilder, x: number, y: number, yaw = 0): string {
    const r = placeActor(this.project, cls.cls.id, x, y);
    if (!r.ok) throw new Error(r.reason);
    r.value.yaw = yaw;
    return r.value.id;
  }

  playerStart(x: number, y: number, yaw = 0): this {
    this.project.level.playerStart = { x, y, yaw };
    return this;
  }
}

/** Builder over an existing class (used by reference solutions). */
export function edit(p: Project, className: string): ClassBuilder {
  const cls = p.classes.find((c) => c.name === className);
  if (!cls) throw new Error(`No class ${className}`);
  return new ClassBuilder(cls, p);
}
