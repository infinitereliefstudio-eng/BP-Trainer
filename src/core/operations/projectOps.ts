/** Project-level mutators: Blueprint classes. */
import { descendants, inheritedView, isA, rootParent } from '../model/inheritance';
import { newId } from '../model/ids';
import { componentDefaults, createClass, uniqueName, type BlueprintClass, type BlueprintInterface, type ParentClass, type Project } from '../model/project';
import { contextFor } from '../nodes/registry';
import { validateName } from './classOps';
import { renameTypeRefs } from './enumOps';
import { pruneAllGraphs, removeNodes, type OpResult } from './graphOps';

/** Drop links that no longer fit after a signature or type change, everywhere. */
export function pruneProject(p: Project): void {
  for (const c of p.classes) pruneAllGraphs(c, contextFor(c, p));
}

const BUILTIN_NAMES = ['Object', 'Actor', 'Pawn', 'Self'];

export function addClass(p: Project, name = 'BP_NewBlueprint', parent: ParentClass = 'Actor'): OpResult<BlueprintClass> {
  const taken = [...p.classes.map((c) => c.name), ...(p.enums ?? []).map((e) => e.name), ...BUILTIN_NAMES];
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
  // Object and class references name their class: follow the rename everywhere.
  renameTypeRefs(p, ['object', 'class'], oldName, cls.name);
  pruneProject(p);
  return { ok: true, value: undefined };
}

export function removeClass(p: Project, id: string): OpResult {
  if (p.classes.length <= 1) return { ok: false, reason: 'Le projet doit garder au moins un Blueprint.' };
  const child = p.classes.find((c) => c.parentClassId === id);
  if (child) return { ok: false, reason: `${child.name} hérite de ce Blueprint : change d’abord sa classe parente (Class Settings).` };
  p.classes = p.classes.filter((c) => c.id !== id);
  p.level.actors = p.level.actors.filter((a) => a.classId !== id);
  if (p.playerClassId === id) delete p.playerClassId;
  return { ok: true, value: undefined };
}

/**
 * Parent Class: Actor, Pawn, or another Blueprint (by id). A Blueprint cannot
 * inherit from itself or from one of its children.
 */
export function setParentClass(p: Project, classId: string, parent: string): OpResult {
  const cls = p.classes.find((c) => c.id === classId);
  if (!cls) return { ok: false, reason: 'Blueprint introuvable.' };
  if (parent === 'Actor' || parent === 'Pawn') {
    delete cls.parentClassId;
    cls.parent = parent;
  } else {
    const base = p.classes.find((c) => c.id === parent);
    if (!base) return { ok: false, reason: 'Blueprint parent introuvable.' };
    if (isA(p, base.id, cls.id)) return { ok: false, reason: `${base.name} hérite déjà de ${cls.name} : il ne peut pas être sa classe parente.` };
    cls.parentClassId = base.id;
    // As in UE, a child has no root of its own: it uses the parent's. Its own components hang under it.
    const baseRoot = inheritedView(base, p).components.find((c) => !c.parent);
    if (baseRoot) {
      for (const root of cls.components.filter((c) => !c.parent)) {
        if (root.kind === 'Scene') {
          for (const c of cls.components) if (c.parent === root.id) c.parent = baseRoot.id;
          cls.components = cls.components.filter((c) => c.id !== root.id);
        } else root.parent = baseRoot.id;
      }
    }
  }
  if (!cls.parentClassId && cls.components.every((c) => !!c.parent)) {
    // Back to a native parent: a root of its own again.
    const root = { id: newId('cmp'), name: 'DefaultSceneRoot', kind: 'Scene' as const, props: componentDefaults('Scene') };
    for (const c of cls.components) if (!cls.components.some((o) => o.id === c.parent)) c.parent = root.id;
    cls.components.unshift(root);
  }
  // The native class at the top follows the new chain, for this class and its children.
  for (const c of [cls, ...descendants(p, cls)]) c.parent = rootParent(p, c);
  if (p.playerClassId && rootParent(p, p.classes.find((c) => c.id === p.playerClassId) ?? cls) !== 'Pawn') delete p.playerClassId;
  pruneProject(p);
  return { ok: true, value: undefined };
}

// --------------------------------------------------------------- interfaces

export function addInterface(p: Project, name = 'BPI_NewInterface'): OpResult<BlueprintInterface> {
  const taken = [...p.interfaces.map((i) => i.name), ...p.classes.map((c) => c.name)];
  const iface: BlueprintInterface = { id: newId('i'), name: uniqueName(name.trim() || 'BPI_NewInterface', taken), functions: [] };
  p.interfaces.push(iface);
  return { ok: true, value: iface };
}

export function renameInterface(p: Project, id: string, name: string): OpResult {
  const iface = p.interfaces.find((i) => i.id === id);
  if (!iface) return { ok: false, reason: 'Interface introuvable.' };
  const err = validateName(name, [...p.interfaces.filter((i) => i.id !== id).map((i) => i.name), ...p.classes.map((c) => c.name)]);
  if (err) return { ok: false, reason: err };
  iface.name = name.trim();
  return { ok: true, value: undefined };
}

export function addInterfaceFunction(p: Project, id: string, name = 'NewFunction'): void {
  const iface = p.interfaces.find((i) => i.id === id);
  if (iface) iface.functions.push({ id: newId('if'), name: uniqueName(name, iface.functions.map((f) => f.name)) });
}

export function renameInterfaceFunction(p: Project, id: string, fnId: string, name: string): OpResult {
  const iface = p.interfaces.find((i) => i.id === id);
  const fn = iface?.functions.find((f) => f.id === fnId);
  if (!iface || !fn) return { ok: false, reason: 'Fonction introuvable.' };
  const err = validateName(name, iface.functions.filter((f) => f.id !== fnId).map((f) => f.name));
  if (err) return { ok: false, reason: err };
  fn.name = name.trim();
  return { ok: true, value: undefined };
}

const INTERFACE_NODES = ['event.interface', 'iface.message'];

/** Remove an interface function, and the nodes that use it, everywhere. */
export function removeInterfaceFunction(p: Project, id: string, fnId: string): void {
  const iface = p.interfaces.find((i) => i.id === id);
  if (!iface) return;
  iface.functions = iface.functions.filter((f) => f.id !== fnId);
  for (const c of p.classes) {
    for (const g of c.graphs) {
      removeNodes(
        g,
        Object.values(g.nodes)
          .filter((n) => INTERFACE_NODES.includes(n.def) && n.config.interface === id && n.config.fn === fnId)
          .map((n) => n.id),
      );
    }
  }
}

export function removeInterface(p: Project, id: string): void {
  p.interfaces = p.interfaces.filter((i) => i.id !== id);
  for (const c of p.classes) {
    c.interfaces = c.interfaces.filter((i) => i !== id);
    for (const g of c.graphs) {
      removeNodes(
        g,
        Object.values(g.nodes)
          .filter((n) => (INTERFACE_NODES.includes(n.def) || n.def === 'iface.doesImplement') && n.config.interface === id)
          .map((n) => n.id),
      );
    }
  }
}

/**
 * Rename a Custom Event and every "call" node that calls it by name, in all
 * Blueprints (UE follows renames the same way).
 */
export function renameCustomEvent(p: Project, classId: string, nodeId: string, name: string): OpResult {
  const cls = p.classes.find((c) => c.id === classId);
  const node = cls?.graphs.map((g) => g.nodes[nodeId]).find(Boolean);
  if (!cls || !node || node.def !== 'event.custom') return { ok: false, reason: 'Événement introuvable.' };
  const taken = cls.graphs.flatMap((g) => Object.values(g.nodes).filter((n) => n.def === 'event.custom' && n.id !== nodeId).map((n) => String(n.config.name)));
  const err = validateName(name, taken);
  if (err) return { ok: false, reason: err };
  const oldName = String(node.config.name);
  node.config.name = name.trim();
  for (const c of p.classes) {
    for (const g of c.graphs) {
      for (const n of Object.values(g.nodes)) {
        if (n.def === 'call.custom' && (n.config.owner ?? c.id) === classId && n.config.event === oldName) n.config.event = node.config.name;
      }
    }
  }
  return { ok: true, value: undefined };
}

/** UE's Default Pawn Class: which Blueprint the player is. */
export function setPlayerClass(p: Project, classId: string | undefined): OpResult {
  if (classId === undefined) {
    delete p.playerClassId;
    return { ok: true, value: undefined };
  }
  const cls = p.classes.find((c) => c.id === classId);
  if (!cls) return { ok: false, reason: 'Blueprint introuvable.' };
  if (rootParent(p, cls) !== 'Pawn') return { ok: false, reason: 'Le joueur doit être un Blueprint de classe parente Pawn.' };
  p.playerClassId = classId;
  return { ok: true, value: undefined };
}
