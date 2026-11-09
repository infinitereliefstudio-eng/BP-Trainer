/**
 * Pin types, mirroring the Blueprint type system.
 *
 * A pin type is a category (exec, bool, int…) plus an optional subtype
 * (the class of an object reference, the name of an enum) and an optional
 * container (array). Colours live in the editor theme, not here: the core
 * knows nothing about rendering.
 */

export type PinCategory =
  | 'exec'
  | 'bool'
  | 'int'
  | 'float'
  | 'string'
  | 'text'
  | 'name'
  | 'vector'
  | 'rotator'
  | 'object'
  | 'class'
  | 'enum'
  | 'struct'
  | 'delegate'
  | 'wildcard';

export type PinDirection = 'in' | 'out';

export type Container = 'array' | 'set' | 'map';

export interface PinType {
  category: PinCategory;
  /** Class name for object/class pins, enum name for enum pins, struct name for structs. */
  subtype?: string;
  /** Array, Set or Map of this type. For a Map, this type is the key's. */
  container?: Container;
  /** A Map's value type (never a container itself). */
  value?: PinType;
}

/** Types a Set or a Map key may hold: UE needs them hashable. */
export const KEY_CATEGORIES: PinCategory[] = ['int', 'string', 'name', 'enum', 'object', 'class'];

export const T = {
  exec: { category: 'exec' } as PinType,
  bool: { category: 'bool' } as PinType,
  int: { category: 'int' } as PinType,
  float: { category: 'float' } as PinType,
  string: { category: 'string' } as PinType,
  text: { category: 'text' } as PinType,
  name: { category: 'name' } as PinType,
  vector: { category: 'vector' } as PinType,
  rotator: { category: 'rotator' } as PinType,
  wildcard: { category: 'wildcard' } as PinType,
  object: (subtype = 'Object'): PinType => ({ category: 'object', subtype }),
  class: (subtype = 'Object'): PinType => ({ category: 'class', subtype }),
  enum: (subtype: string): PinType => ({ category: 'enum', subtype }),
  struct: (subtype: string): PinType => ({ category: 'struct', subtype }),
  array: (inner: PinType): PinType => ({ ...inner, container: 'array' }),
  set: (inner: PinType): PinType => ({ ...inner, container: 'set' }),
  map: (key: PinType, value: PinType): PinType => ({ ...key, container: 'map', value: { category: value.category, subtype: value.subtype } }),
} as const;

/** Display names, as shown in UE's type picker. */
export const CATEGORY_LABEL: Record<PinCategory, string> = {
  exec: 'Exec',
  bool: 'Boolean',
  int: 'Integer',
  float: 'Float',
  string: 'String',
  text: 'Text',
  name: 'Name',
  vector: 'Vector',
  rotator: 'Rotator',
  object: 'Object Reference',
  class: 'Class Reference',
  enum: 'Enum',
  struct: 'Structure',
  delegate: 'Event',
  wildcard: 'Wildcard',
};

/** Types a user can pick for a new variable in V1. */
export const VARIABLE_CATEGORIES: PinCategory[] = [
  'bool',
  'int',
  'float',
  'string',
  'text',
  'name',
  'vector',
  'rotator',
  'object',
  'class',
  'enum',
  'struct',
];

/** Engine structures the app knows, with their UE display names. Project structures go by their own name. */
export type StructName = 'TimerHandle' | 'LinearColor';
export const STRUCT_LABEL: Record<StructName, string> = {
  TimerHandle: 'Timer Handle',
  LinearColor: 'Linear Color',
};

function baseLabel(t: PinType): string {
  if ((t.category === 'object' || t.category === 'class') && t.subtype) {
    return `${t.subtype} ${t.category === 'object' ? 'Object Reference' : 'Class Reference'}`;
  }
  if (t.category === 'enum' && t.subtype) return t.subtype;
  if (t.category === 'struct' && t.subtype) return STRUCT_LABEL[t.subtype as StructName] ?? t.subtype;
  return CATEGORY_LABEL[t.category];
}

export function typeLabel(t: PinType): string {
  const base = baseLabel(t);
  if (t.container === 'array') return `Array of ${base}`;
  if (t.container === 'set') return `Set of ${base}`;
  if (t.container === 'map') return `Map of ${base} to ${t.value ? baseLabel(t.value) : 'Wildcard'}`;
  return base;
}

export function isBuiltinStruct(name: string | undefined): boolean {
  return !!name && name in STRUCT_LABEL;
}

export function sameType(a: PinType, b: PinType): boolean {
  return (
    a.category === b.category &&
    (a.subtype ?? '') === (b.subtype ?? '') &&
    (a.container ?? '') === (b.container ?? '') &&
    (a.container !== 'map' || (!!a.value && !!b.value && sameType(a.value, b.value)))
  );
}

/**
 * Object classes known to the type system. A Blueprint class registers itself
 * with its parent so that "BP_Lamp is an Actor" checks work for references.
 */
export interface ClassHierarchy {
  isA(child: string, parent: string): boolean;
}

export const BUILTIN_HIERARCHY: Record<string, string | undefined> = {
  Object: undefined,
  Actor: 'Object',
  Pawn: 'Actor',
  ActorComponent: 'Object',
  SceneComponent: 'ActorComponent',
  PrimitiveComponent: 'SceneComponent',
  StaticMeshComponent: 'PrimitiveComponent',
  BoxComponent: 'PrimitiveComponent',
  PointLightComponent: 'SceneComponent',
  TextRenderComponent: 'PrimitiveComponent',
};

export function makeHierarchy(extra: Record<string, string> = {}): ClassHierarchy {
  const parents: Record<string, string | undefined> = { ...BUILTIN_HIERARCHY, ...extra };
  return {
    isA(child, parent) {
      let cur: string | undefined = child;
      for (let guard = 0; cur && guard < 64; guard++) {
        if (cur === parent) return true;
        cur = parents[cur];
      }
      return false;
    },
  };
}

/**
 * Can a value of type `from` (an output pin) flow into `to` (an input pin)?
 * Wildcards accept any data type. Object references accept subclasses.
 */
export function isAssignable(from: PinType, to: PinType, h: ClassHierarchy): boolean {
  if (from.category === 'exec' || to.category === 'exec') {
    return from.category === 'exec' && to.category === 'exec';
  }
  if (from.category === 'delegate' || to.category === 'delegate') {
    if (from.category !== to.category) return false;
  } else if (from.category === 'wildcard' || to.category === 'wildcard') {
    // A generic pin accepts any type, but an array stays an array.
    return (from.container ?? '') === (to.container ?? '');
  }
  if ((from.container ?? '') !== (to.container ?? '')) return false;
  // A Map's values must match too; a generic value (Map functions not yet typed) accepts any.
  if (from.container === 'map' && from.value && to.value && from.value.category !== 'wildcard' && to.value.category !== 'wildcard') {
    if (!isAssignable(from.value, to.value, h) || !isAssignable(to.value, from.value, h)) return false;
  }
  if (from.category !== to.category) return false;
  if (from.category === 'object' || from.category === 'class') {
    return h.isA(from.subtype ?? 'Object', to.subtype ?? 'Object');
  }
  if (from.category === 'enum' || from.category === 'struct') return (from.subtype ?? '') === (to.subtype ?? '');
  // An event fits a dispatcher when their parameter types match.
  if (from.category === 'delegate') return (from.subtype ?? '') === (to.subtype ?? '');
  return true;
}
