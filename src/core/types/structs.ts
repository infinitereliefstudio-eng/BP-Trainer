/**
 * Project structures (Structure assets): looking them up by name, as pin
 * types do, and reading a member of a structure value. A value is an object
 * keyed by member id; a member it does not hold has its default value.
 */
import type { Project, StructMember, UserStruct } from '../model/project';
import { isBuiltinStruct, type PinType } from './pins';
import { defaultValueFor, type StructValue, type Value } from './values';

export function findStruct(project: Project | undefined, name: string | undefined): UserStruct | undefined {
  if (!name || isBuiltinStruct(name)) return undefined;
  return project?.structs?.find((s) => s.name === name);
}

/** Is this the type of a project structure (not Timer Handle or Linear Color)? */
export function isUserStruct(t: PinType): boolean {
  return t.category === 'struct' && !t.container && !isBuiltinStruct(t.subtype);
}

/** A member's value in a structure value: its own, else the member's default. */
export function memberValue(v: unknown, m: StructMember): Value {
  const own = v && typeof v === 'object' && !Array.isArray(v) ? (v as StructValue)[m.id] : undefined;
  return own === undefined ? structuredClone(m.defaultValue ?? defaultValueFor(m.type)) : own;
}

/** A complete structure value: every member present (a member's default where the value has none). */
export function fullStruct(v: unknown, s: UserStruct): StructValue {
  const out: StructValue = {};
  for (const m of s.members) out[m.id] = memberValue(v, m);
  return out;
}
