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
  | 'vector'
  | 'rotator'
  | 'object'
  | 'class'
  | 'enum'
  | 'wildcard';

export type PinDirection = 'in' | 'out';

export interface PinType {
  category: PinCategory;
  /** Class name for object/class pins, enum name for enum pins. */
  subtype?: string;
  container?: 'array';
}

export const T = {
  exec: { category: 'exec' } as PinType,
  bool: { category: 'bool' } as PinType,
  int: { category: 'int' } as PinType,
  float: { category: 'float' } as PinType,
  string: { category: 'string' } as PinType,
  vector: { category: 'vector' } as PinType,
  rotator: { category: 'rotator' } as PinType,
  wildcard: { category: 'wildcard' } as PinType,
  object: (subtype = 'Object'): PinType => ({ category: 'object', subtype }),
  class: (subtype = 'Object'): PinType => ({ category: 'class', subtype }),
  array: (inner: PinType): PinType => ({ ...inner, container: 'array' }),
} as const;

/** Display names, as shown in UE's type picker. */
export const CATEGORY_LABEL: Record<PinCategory, string> = {
  exec: 'Exec',
  bool: 'Boolean',
  int: 'Integer',
  float: 'Float',
  string: 'String',
  vector: 'Vector',
  rotator: 'Rotator',
  object: 'Object Reference',
  class: 'Class Reference',
  enum: 'Enum',
  wildcard: 'Wildcard',
};

/** Types a user can pick for a new variable in V1. */
export const VARIABLE_CATEGORIES: PinCategory[] = [
  'bool',
  'int',
  'float',
  'string',
  'vector',
  'rotator',
  'object',
];

export function typeLabel(t: PinType): string {
  let base = CATEGORY_LABEL[t.category];
  if ((t.category === 'object' || t.category === 'class') && t.subtype) {
    base = `${t.subtype} ${t.category === 'object' ? 'Object Reference' : 'Class Reference'}`;
  }
  return t.container === 'array' ? `Array of ${base}` : base;
}

export function sameType(a: PinType, b: PinType): boolean {
  return (
    a.category === b.category &&
    (a.subtype ?? '') === (b.subtype ?? '') &&
    (a.container ?? '') === (b.container ?? '')
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
  if (from.category === 'wildcard' || to.category === 'wildcard') return true;
  if ((from.container ?? '') !== (to.container ?? '')) return false;
  if (from.category !== to.category) return false;
  if (from.category === 'object' || from.category === 'class') {
    return h.isA(from.subtype ?? 'Object', to.subtype ?? 'Object');
  }
  if (from.category === 'enum') return (from.subtype ?? '') === (to.subtype ?? '');
  return true;
}
