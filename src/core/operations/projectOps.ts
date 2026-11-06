/** Project-level mutators: Blueprint classes. */
import { createClass, uniqueName, type BlueprintClass, type ParentClass, type Project } from '../model/project';
import { contextFor } from '../nodes/registry';
import { validateName } from './classOps';
import { pruneAllGraphs, type OpResult } from './graphOps';

const BUILTIN_NAMES = ['Object', 'Actor', 'Pawn', 'Self'];

export function addClass(p: Project, name = 'BP_NewBlueprint', parent: ParentClass = 'Actor'): OpResult<BlueprintClass> {
  const taken = [...p.classes.map((c) => c.name), ...BUILTIN_NAMES];
  const finalName = uniqueName(name.trim() || 'BP_NewBlueprint', taken);
  const err = validateName(finalName, taken);
  if (err) return { ok: false, reason: err };
  const cls = createClass(finalName, parent);
  p.classes.push(cls);
  return { ok: true, value: cls };
}

export function renameClass(p: Project, id: string, name: string): OpResult {
  const cls = p.classes.find((c) => c.id === id);
  if (!cls) return { ok: false, reason: 'Blueprint introuvable.' };
  const taken = [...p.classes.filter((c) => c.id !== id).map((c) => c.name), ...BUILTIN_NAMES];
  const err = validateName(name, taken);
  if (err) return { ok: false, reason: err };
  if (/\s/.test(name.trim())) return { ok: false, reason: "Un nom de Blueprint ne peut pas contenir d'espace." };
  const oldName = cls.name;
  cls.name = name.trim();
  // Object references name their class: follow the rename everywhere.
  for (const c of p.classes) {
    for (const v of c.variables) if (v.type.subtype === oldName) v.type = { ...v.type, subtype: cls.name };
  }
  for (const c of p.classes) pruneAllGraphs(c, contextFor(c));
  return { ok: true, value: undefined };
}

export function removeClass(p: Project, id: string): OpResult {
  if (p.classes.length <= 1) return { ok: false, reason: 'Le projet doit garder au moins un Blueprint.' };
  p.classes = p.classes.filter((c) => c.id !== id);
  return { ok: true, value: undefined };
}
