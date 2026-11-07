/**
 * Enum assets and the type references that follow renames (enum and
 * Blueprint names are the subtypes of pin types, as in UE).
 */
import { newId } from '../model/ids';
import { uniqueName, type Project, type UserEnum } from '../model/project';
import type { PinCategory, PinType } from '../types/pins';
import { BUILTIN_ENUMS } from '../types/enums';
import { decodeType, encodeType } from '../types/wildcard';
import { validateName } from './classOps';
import type { OpResult } from './graphOps';

/** Every pin type the project stores: variables, function and dispatcher parameters. */
function eachType(p: Project, fn: (t: PinType) => PinType): void {
  for (const c of p.classes) {
    for (const v of c.variables) v.type = fn(v.type);
    for (const d of c.dispatchers) for (const prm of d.params) prm.type = fn(prm.type);
    for (const g of c.graphs) {
      if (g.fn) {
        for (const prm of g.fn.inputs) prm.type = fn(prm.type);
        for (const prm of g.fn.outputs) prm.type = fn(prm.type);
      }
      // Generic nodes remember the type they adopted.
      for (const n of Object.values(g.nodes)) {
        for (const [k, v] of Object.entries(n.config)) {
          if ((k === 'wild' || k.startsWith('wild:')) && typeof v === 'string') n.config[k] = encodeType(fn(decodeType(v)));
        }
      }
    }
  }
}

/** Follow a rename of a class or enum in every stored type. */
export function renameTypeRefs(p: Project, categories: PinCategory[], oldName: string, newName: string): void {
  eachType(p, (t) => (categories.includes(t.category) && t.subtype === oldName ? { ...t, subtype: newName } : t));
}

/** Is an enum used by a type or a Switch on Enum anywhere? */
export function enumUsage(p: Project, name: string): number {
  let count = 0;
  eachType(p, (t) => {
    if (t.category === 'enum' && t.subtype === name) count++;
    return t;
  });
  for (const c of p.classes) for (const g of c.graphs) for (const n of Object.values(g.nodes)) if (n.def === 'flow.switchEnum' && n.config.enum === name) count++;
  return count;
}

function takenNames(p: Project, except?: string): string[] {
  return [
    ...p.enums.filter((e) => e.id !== except).map((e) => e.name),
    ...p.classes.map((c) => c.name),
    ...p.interfaces.map((i) => i.name),
    ...Object.keys(BUILTIN_ENUMS),
  ];
}

export function addEnum(p: Project, name = 'E_NewEnum'): OpResult<UserEnum> {
  const e: UserEnum = { id: newId('e'), name: uniqueName(name.trim() || 'E_NewEnum', takenNames(p)), entries: ['NewEnumerator0'] };
  const err = validateName(e.name, takenNames(p));
  if (err) return { ok: false, reason: err };
  p.enums.push(e);
  return { ok: true, value: e };
}

export function renameEnum(p: Project, id: string, name: string): OpResult {
  const e = p.enums.find((x) => x.id === id);
  if (!e) return { ok: false, reason: 'Enum introuvable.' };
  const err = validateName(name, takenNames(p, id));
  if (err) return { ok: false, reason: err };
  if (/\s/.test(name.trim())) return { ok: false, reason: "Un nom d'Enum ne peut pas contenir d'espace." };
  const old = e.name;
  e.name = name.trim();
  renameTypeRefs(p, ['enum'], old, e.name);
  for (const c of p.classes) for (const g of c.graphs) for (const n of Object.values(g.nodes)) if (n.def === 'flow.switchEnum' && n.config.enum === old) n.config.enum = e.name;
  return { ok: true, value: undefined };
}

/** UE refuses to delete an asset still referenced; so do we. */
export function removeEnum(p: Project, id: string): OpResult {
  const e = p.enums.find((x) => x.id === id);
  if (!e) return { ok: false, reason: 'Enum introuvable.' };
  const used = enumUsage(p, e.name);
  if (used) return { ok: false, reason: `${e.name} est encore utilisé à ${used} endroit(s) : retire d'abord ces variables, paramètres et Switch.` };
  p.enums = p.enums.filter((x) => x.id !== id);
  return { ok: true, value: undefined };
}

export function setEnumEntry(p: Project, id: string, index: number, name: string): OpResult {
  const e = p.enums.find((x) => x.id === id);
  if (!e || index < 0 || index >= e.entries.length) return { ok: false, reason: 'Entrée introuvable.' };
  const err = validateName(name, e.entries.filter((_, i) => i !== index));
  if (err) return { ok: false, reason: err };
  e.entries[index] = name.trim();
  return { ok: true, value: undefined };
}

export function addEnumEntry(p: Project, id: string): void {
  const e = p.enums.find((x) => x.id === id);
  if (e) e.entries.push(uniqueName(`NewEnumerator${e.entries.length}`, e.entries));
}

/** Removing an entry shifts the ones after it, like UE (values are indices). */
export function removeEnumEntry(p: Project, id: string, index: number): OpResult {
  const e = p.enums.find((x) => x.id === id);
  if (!e) return { ok: false, reason: 'Enum introuvable.' };
  if (e.entries.length <= 1) return { ok: false, reason: 'Un Enum garde au moins une entrée.' };
  e.entries.splice(index, 1);
  return { ok: true, value: undefined };
}

export function moveEnumEntry(p: Project, id: string, index: number, delta: -1 | 1): void {
  const e = p.enums.find((x) => x.id === id);
  const j = index + delta;
  if (!e || j < 0 || j >= e.entries.length) return;
  [e.entries[index], e.entries[j]] = [e.entries[j], e.entries[index]];
}
