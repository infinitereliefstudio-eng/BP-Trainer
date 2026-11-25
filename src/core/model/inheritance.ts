/**
 * Blueprint inheritance, as in UE: a Blueprint can have another Blueprint as
 * its parent class. It then has the parent's components, variables (except
 * Private ones, which only the parent's own graphs use), functions, Event
 * Dispatchers and interfaces; it may override the parent's events and
 * functions, and call the parent's version with a "Parent:" node.
 *
 * The model keeps each class as written. `inheritedView` builds the merged
 * class that graphs, compilation and the runtime work with.
 */
import { sameType } from '../types/pins';
import { isSceneComponent, type BlueprintClass, type Component, type Graph, type NodeInstance, type ParentClass, type Project, type Variable } from './project';

/** An inherited variable as `cls` sees it: with the default `cls` gives it in its Class Defaults, if any (V7.67). */
function withOwnDefault(cls: BlueprintClass, v: Variable): Variable {
  const own = cls.inheritedDefaults?.[v.id];
  return own && sameType(own.type, v.type) ? { ...v, defaultValue: structuredClone(own.value) } : v;
}

/** The Blueprint parent of `cls`, if any. */
export function parentOf(p: Project | undefined, cls: BlueprintClass): BlueprintClass | undefined {
  return cls.parentClassId ? p?.classes.find((c) => c.id === cls.parentClassId) : undefined;
}

/** `cls`, then its parent, grandparent… (stops on a cycle). */
export function lineage(p: Project | undefined, cls: BlueprintClass): BlueprintClass[] {
  const out: BlueprintClass[] = [];
  for (let c: BlueprintClass | undefined = cls; c && !out.includes(c); c = parentOf(p, c)) out.push(c);
  return out;
}

/** Is `classId` the class `ancestorId`, or one of its children? */
export function isA(p: Project | undefined, classId: string | undefined, ancestorId: unknown): boolean {
  if (!classId) return false;
  if (classId === ancestorId) return true;
  const cls = p?.classes.find((c) => c.id === classId);
  return !!cls && lineage(p, cls).some((c) => c.id === ancestorId);
}

/** The native class at the top of the chain: Actor, Pawn, PlayerController, SaveGame or ActorComponent. */
export function rootParent(p: Project | undefined, cls: BlueprintClass): ParentClass {
  return lineage(p, cls).at(-1)!.parent;
}

/** Classes that inherit from `cls`, directly or not. */
export function descendants(p: Project, cls: BlueprintClass): BlueprintClass[] {
  return p.classes.filter((c) => c.id !== cls.id && isA(p, c.id, cls.id));
}

/**
 * The class as its graphs see it: inherited members first, then its own.
 * `withPrivate` keeps the parent's Private variables (the runtime needs them:
 * the parent's graphs still run on the child's actors).
 */
export function inheritedView(cls: BlueprintClass, p: Project | undefined, withPrivate = false): BlueprintClass {
  const parent = parentOf(p, cls);
  if (!parent) return cls;
  const chain = lineage(p, cls);
  if (chain.length < 2) return cls;
  const base = inheritedView(parent, p, withPrivate);
  const ownNames = new Set(cls.graphs.filter((g) => g.kind === 'function').map((g) => g.name));
  const parentRoot = base.components.find((c) => !c.parent && isSceneComponent(c));
  // A child's own scene components hang under the root it inherits; Actor Components are never attached.
  const ownComponents: Component[] = cls.components.map((c) => (c.parent || !parentRoot || !isSceneComponent(c) ? c : { ...c, parent: parentRoot.id }));
  return {
    ...cls,
    parent: base.parent,
    autoReceiveInput: cls.autoReceiveInput || base.autoReceiveInput,
    components: [...base.components, ...ownComponents],
    // An inherited variable starts with the child's own Class Default, if it set one for this type (V7.67).
    variables: [...base.variables.filter((v) => withPrivate || !v.private).map((v) => withOwnDefault(cls, v)), ...cls.variables],
    // Own graphs, then the parent's functions this class does not override (callable from here).
    graphs: [...cls.graphs, ...base.graphs.filter((g) => g.kind === 'function' && !ownNames.has(g.name))],
    dispatchers: [...base.dispatchers, ...cls.dispatchers],
    interfaces: [...new Set([...base.interfaces, ...cls.interfaces])],
  };
}

/**
 * What an event node answers to: two events with the same key in a parent
 * and a child are the same event, and the child's version overrides.
 */
export function eventKey(n: NodeInstance): string {
  const c = n.config;
  switch (n.def) {
    case 'event.inputKey':
      return `${n.def}:${c.key ?? 'E'}`;
    case 'event.componentBeginOverlap':
    case 'event.componentEndOverlap':
      return `${n.def}:${c.component}`;
    case 'event.custom':
      return `${n.def}:${c.name}`;
    case 'event.componentDispatcher':
      return `${n.def}:${c.component}:${c.dispatcher}`;
    case 'input.action':
      return `${n.def}:${c.action}`;
    case 'event.interface':
      return `${n.def}:${c.interface}:${c.fn}`;
    case 'event.widgetButton':
      return `${n.def}:${c.widget}:${c.event}`;
    default:
      return n.def;
  }
}

/**
 * The function graph implementing an interface function for `cls`: its own,
 * else the nearest parent's (UE implements a function with outputs as a
 * function graph, Graph.iface).
 */
export function interfaceImplementation(p: Project | undefined, cls: BlueprintClass, ifaceId: string, fnId: string): Graph | undefined {
  for (const c of lineage(p, cls)) {
    const g = c.graphs.find((x) => x.iface?.interface === ifaceId && x.iface.fn === fnId);
    if (g) return g;
  }
  return undefined;
}
