/**
 * Structure assets (Content Browser › Structure) and their members. A
 * structure is named in pin types like an Enum; Make, Break and Set Members
 * nodes name it in `config.struct`. Members are found by id, so renaming one
 * keeps every wire.
 */
import { newId } from '../model/ids';
import { uniqueName, type Project, type StructMember, type UserStruct } from '../model/project';
import { isBuiltinStruct, type PinType } from '../types/pins';
import { defaultValueFor, type Value } from '../types/values';
import { validateName } from './classOps';
import { eachType, renameTypeRefs, takenNames } from './enumOps';
import type { OpResult } from './graphOps';
import { pruneProject } from './projectOps';

export const STRUCT_NODES = ['struct.make', 'struct.break', 'struct.setMembers'];

function eachStructNode(p: Project, name: string, fn: (n: { config: Record<string, Value> }) => void): void {
  for (const c of p.classes) for (const g of c.graphs) for (const n of Object.values(g.nodes)) if (STRUCT_NODES.includes(n.def) && n.config.struct === name) fn(n);
}

export function structUsage(p: Project, name: string): number {
  let count = 0;
  eachType(p, (t) => {
    if (t.category === 'struct' && t.subtype === name) count++;
    return t;
  });
  eachStructNode(p, name, () => count++);
  return count;
}

export function addStruct(p: Project, name = 'S_NewStruct'): OpResult<UserStruct> {
  const s: UserStruct = { id: newId('s'), name: uniqueName(name.trim() || 'S_NewStruct', takenNames(p)), members: [] };
  const err = validateName(s.name, takenNames(p));
  if (err) return { ok: false, reason: err };
  p.structs.push(s);
  addStructMember(p, s.id, { category: 'bool' });
  return { ok: true, value: s };
}

export function renameStruct(p: Project, id: string, name: string): OpResult {
  const s = p.structs.find((x) => x.id === id);
  if (!s) return { ok: false, reason: 'Structure introuvable.' };
  if (/\s/.test(name.trim())) return { ok: false, reason: "Un nom de structure ne peut pas contenir d'espace." };
  if (isBuiltinStruct(name.trim())) return { ok: false, reason: 'Ce nom est celui d’une structure du moteur.' };
  const err = validateName(name, takenNames(p, id));
  if (err) return { ok: false, reason: err };
  const old = s.name;
  s.name = name.trim();
  renameTypeRefs(p, ['struct'], old, s.name);
  eachStructNode(p, old, (n) => {
    n.config.struct = s.name;
  });
  return { ok: true, value: undefined };
}

/** UE refuses to delete an asset still referenced; so do we. */
export function removeStruct(p: Project, id: string): OpResult {
  const s = p.structs.find((x) => x.id === id);
  if (!s) return { ok: false, reason: 'Structure introuvable.' };
  const used = structUsage(p, s.name);
  if (used) return { ok: false, reason: `${s.name} est encore utilisée à ${used} endroit(s) : retire d'abord ces variables, paramètres et nœuds.` };
  p.structs = p.structs.filter((x) => x.id !== id);
  return { ok: true, value: undefined };
}

/** Does `type` contain the structure `name`, directly or through another structure's members? */
function contains(p: Project, type: PinType, name: string, seen = new Set<string>()): boolean {
  for (const t of [type, ...(type.value ? [type.value] : [])]) {
    if (t.category !== 'struct' || !t.subtype) continue;
    if (t.subtype === name) return true;
    if (seen.has(t.subtype)) continue;
    seen.add(t.subtype);
    const inner = p.structs.find((x) => x.name === t.subtype);
    if (inner?.members.some((m) => contains(p, m.type, name, seen))) return true;
  }
  return false;
}

export function addStructMember(p: Project, id: string, type: PinType = { category: 'bool' }): StructMember | undefined {
  const s = p.structs.find((x) => x.id === id);
  if (!s) return undefined;
  const m: StructMember = { id: newId('sm'), name: uniqueName('MemberVar', s.members.map((x) => x.name)), type, defaultValue: defaultValueFor(type) };
  s.members.push(m);
  pruneProject(p);
  return m;
}

export function updateStructMember(p: Project, id: string, memberId: string, patch: { name?: string; type?: PinType; defaultValue?: Value }): OpResult {
  const s = p.structs.find((x) => x.id === id);
  const m = s?.members.find((x) => x.id === memberId);
  if (!s || !m) return { ok: false, reason: 'Membre introuvable.' };
  if (patch.name !== undefined) {
    if (/\s/.test(patch.name.trim())) return { ok: false, reason: "Un nom de membre ne peut pas contenir d'espace." };
    const err = validateName(patch.name, s.members.filter((x) => x.id !== memberId).map((x) => x.name));
    if (err) return { ok: false, reason: err };
    m.name = patch.name.trim();
  }
  if (patch.type) {
    if (contains(p, patch.type, s.name)) return { ok: false, reason: `${s.name} ne peut pas se contenir elle-même.` };
    m.type = patch.type;
    m.defaultValue = defaultValueFor(patch.type);
    pruneProject(p);
  }
  if (patch.defaultValue !== undefined) m.defaultValue = patch.defaultValue;
  return { ok: true, value: undefined };
}

export function removeStructMember(p: Project, id: string, memberId: string): OpResult {
  const s = p.structs.find((x) => x.id === id);
  if (!s) return { ok: false, reason: 'Structure introuvable.' };
  if (s.members.length <= 1) return { ok: false, reason: 'Une structure garde au moins un membre.' };
  s.members = s.members.filter((x) => x.id !== memberId);
  pruneProject(p);
  return { ok: true, value: undefined };
}
