/**
 * The "Compile" step: checks a class the way UE's compiler would and
 * returns messages for the Compiler Results panel. Step 2 will turn a
 * validated class into an executable form; the checks stay here.
 */
import { inheritedView, lineage, parentOf } from '../model/inheritance';
import {
  findComponent,
  findDispatcher,
  findInterface,
  findLocal,
  findVariable,
  type BlueprintClass,
  type Graph,
  type NodeInstance,
  type Project,
} from '../model/project';
import { classById, findCustomEvent } from '../nodes/library/communication';
import { interfaceMatch } from '../operations/interfaceOps';
import { functionGraph } from '../nodes/library/functions';
import type { NodeContext } from '../nodes/definition';
import { contextFor, getDefinition, nodeTitle, resolvePins } from '../nodes/registry';
import { enumEntries } from '../types/enums';
import { findStruct } from '../types/structs';
import { isAssignable } from '../types/pins';

export type Severity = 'error' | 'warning' | 'info';

export type CompileCode =
  | 'unknownNode'
  | 'variableGone'
  | 'componentGone'
  | 'ownerGone'
  | 'memberGone'
  | 'private'
  | 'notImplemented'
  | 'duplicateEvent'
  | 'latentInFunction'
  | 'byRef'
  | 'wildcard'
  | 'pickClass'
  | 'pickEnum'
  | 'targetRequired'
  | 'badLink'
  | 'unreachable'
  | 'duplicateCustomEvent'
  | 'inheritedName'
  | 'overrideSignature'
  | 'noParentEvent'
  | 'localScope'
  | 'interfaceFunction'
  | 'interfaceName';

export interface CompileMessage {
  severity: Severity;
  /** What kind of problem, for its "Pourquoi ?" (core/explain/compile.ts). */
  code?: CompileCode;
  text: string;
  graphId?: string;
  nodeId?: string;
}

export type CompileStatus = 'dirty' | 'ok' | 'warning' | 'error';

export interface CompileResult {
  status: Exclude<CompileStatus, 'dirty'>;
  messages: CompileMessage[];
}

export function compileClass(cls: BlueprintClass, project?: Project): CompileResult {
  const ctx = contextFor(cls, project);
  const messages: CompileMessage[] = [];
  // Own graphs only, but looked at with everything the class inherits.
  for (const g of cls.graphs) checkGraph(g, ctx.cls, ctx, messages);
  checkInheritance(cls, project, messages);
  checkCustomEventNames(cls, messages);

  const errors = messages.filter((m) => m.severity === 'error').length;
  const warnings = messages.filter((m) => m.severity === 'warning').length;
  messages.push({
    severity: 'info',
    text: `Compilation de ${cls.name} : ${errors} erreur(s), ${warnings} avertissement(s).`,
  });
  return { status: errors ? 'error' : warnings ? 'warning' : 'ok', messages };
}

function checkGraph(g: Graph, cls: BlueprintClass, ctx: NodeContext, out: CompileMessage[]): void {
  const seenUnique = new Map<string, string>();
  const linkedInputs = new Set<string>();
  for (const l of Object.values(g.links)) linkedInputs.add(`${l.to.node}:${l.to.pin}`);

  for (const n of Object.values(g.nodes)) {
    const def = getDefinition(n.def);
    const at = { graphId: g.id, nodeId: n.id };
    if (!def) {
      out.push({ severity: 'error', code: 'unknownNode', text: `Nœud inconnu « ${n.def} ».`, ...at });
      continue;
    }
    const title = nodeTitle(n, ctx);

    if ((n.def === 'var.get' || n.def === 'var.set') && !findVariable(cls, String(n.config.variable))) {
      const hidden = ctx.project && lineage(ctx.project, cls).flatMap((c) => c.variables).find((v) => v.id === n.config.variable && v.private);
      if (hidden) out.push({ severity: 'error', code: 'private', text: `${hidden.name} est Private dans la classe parente : un Blueprint enfant ne peut pas l'utiliser.`, ...at });
      else out.push({ severity: 'error', code: 'variableGone', text: `${title} : la variable n'existe plus.`, ...at });
    }
    if (n.def === 'var.getLocal' || n.def === 'var.setLocal') {
      const found = findLocal(ctx.cls, String(n.config.variable));
      if (!found) out.push({ severity: 'error', code: 'variableGone', text: `${title} : la variable locale n'existe plus.`, ...at });
      else if (found.graph.id !== g.id) {
        out.push({
          severity: 'error',
          code: 'localScope',
          text: `${found.local.name} est une variable locale de ${found.graph.name} : elle n'existe pas dans ${g.name}.`,
          ...at,
        });
      }
    }
    if (n.def === 'event.custom' && ctx.project) {
      const match = interfaceMatch(ctx.project, ctx.cls, String(n.config.name));
      if (match && !match.fn.outputs?.length) {
        out.push({
          severity: 'warning',
          code: 'interfaceName',
          text: `${title} porte le nom de la fonction d'interface ${match.fn.name}, mais ce n'est pas elle : le message ${match.fn.name} ne le déclenche pas.`,
          ...at,
        });
      }
    }
    if (n.def.startsWith('event.component') && !findComponent(cls, String(n.config.component))) {
      out.push({ severity: 'error', code: 'componentGone', text: `${title} : le composant n'existe plus.`, ...at });
    }
    if (n.def === 'var.component' && !findComponent(cls, String(n.config.component))) {
      out.push({ severity: 'error', code: 'componentGone', text: `${title} : le composant n'existe plus.`, ...at });
    }
    const broken = brokenReference(n, cls, ctx);
    if (broken) out.push({ severity: 'error', code: broken[0], text: `${title} : ${broken[1]}`, ...at });
    if (def.unique) {
      if (seenUnique.has(n.def)) out.push({ severity: 'error', code: 'duplicateEvent', text: `${title} est présent deux fois.`, ...at });
      seenUnique.set(n.def, n.id);
    }
    if (def.allowedIn && !def.allowedIn.includes(g.kind) && n.def !== 'var.getLocal' && n.def !== 'var.setLocal') {
      out.push({
        severity: 'error',
        code: 'latentInFunction',
        text:
          g.kind === 'construction'
            ? `${title} n'est pas autorisé dans le Construction Script : il n'accepte ni événement, ni attente, ni Timeline.`
            : `${title} contient un appel latent, interdit hors de l'Event Graph (latent call outside of the event graph).`,
        ...at,
      });
    }
    for (const [code, msg] of nodeChecks(n, g, ctx)) out.push({ severity: 'error', code, text: `${title} : ${msg}`, ...at });
    for (const p of resolvePins(n, ctx)) {
      if (p.dir === 'in' && p.required && !linkedInputs.has(`${n.id}:${p.id}`)) {
        out.push({
          severity: 'error',
          code: 'targetRequired',
          text: `${title} : la pin ${p.name} doit être reliée (self n'est pas un ${p.type.subtype ?? 'objet'} — « Target must have a connection »).`,
          ...at,
        });
      }
    }
  }

  for (const l of Object.values(g.links)) {
    const a = g.nodes[l.from.node];
    const b = g.nodes[l.to.node];
    const pa = a && resolvePins(a, ctx).find((p) => p.id === l.from.pin);
    const pb = b && resolvePins(b, ctx).find((p) => p.id === l.to.pin);
    if (!pa || !pb || !isAssignable(pa.type, pb.type, ctx.hierarchy)) {
      out.push({ severity: 'error', code: 'badLink', text: 'Un fil relie deux pins incompatibles ou disparues.', graphId: g.id, nodeId: b?.id });
    }
  }

  const unreachable = Object.values(g.nodes).filter((n) => {
    const def = getDefinition(n.def);
    if (!def || def.kind === 'event' || def.kind === 'pure' || def.style === 'getter' || n.def === 'fn.entry') return false;
    const execIns = resolvePins(n, ctx).filter((p) => p.dir === 'in' && p.type.category === 'exec');
    return execIns.length > 0 && !execIns.some((p) => linkedInputs.has(`${n.id}:${p.id}`));
  });
  for (const n of unreachable) {
    out.push({
      severity: 'warning',
      code: 'unreachable',
      text: `${nodeTitle(n, ctx)} n'est relié à aucun fil d'exécution : il ne s'exécutera jamais.`,
      graphId: g.id,
      nodeId: n.id,
    });
  }
}

/** Nodes a pass-by-reference pin may be wired to: variables, and an array element by reference. */
const REF_SOURCES = ['var.get', 'var.getExternal', 'var.getLocal', 'array.getRef'];

/** Variable getters a pass-by-reference pin may be wired to (through Reroutes). */
function refSource(g: Graph, nodeId: string, pin: string): NodeInstance | undefined {
  let cur = { node: nodeId, pin };
  for (let guard = 0; guard < 64; guard++) {
    const l = Object.values(g.links).find((x) => x.to.node === cur.node && x.to.pin === cur.pin);
    const src = l && g.nodes[l.from.node];
    if (src?.def !== 'util.reroute') return src;
    cur = { node: src.id, pin: 'in' };
  }
  return undefined;
}

/** Checks of the step-4 library: references, generic pins, class and enum choices. */
function nodeChecks(n: NodeInstance, g: Graph, ctx: NodeContext): [CompileCode, string][] {
  const out: [CompileCode, string][] = [];
  const linked = (pin: string) => Object.values(g.links).some((l) => (l.to.node === n.id && l.to.pin === pin) || (l.from.node === n.id && l.from.pin === pin));
  for (const p of resolvePins(n, ctx)) {
    // Set Members in compiles on a copy too: UE accepts it, and only the copy changes (a classic trap).
    if (p.dir === 'in' && p.byRef && n.def !== 'struct.setMembers') {
      const src = refSource(g, n.id, p.id);
      if (!src || !REF_SOURCES.includes(src.def)) {
        out.push(['byRef', `la pin ${p.name} est passée par référence : relie-y un Get de la variable à modifier.`]);
      }
    }
  }
  if (n.def !== 'util.reroute' && n.def !== 'util.comment') {
    const open = resolvePins(n, ctx).filter((p) => p.wild && p.type.category === 'wildcard');
    if (open.length) out.push(['wildcard', `le type de ${open.map((p) => p.name || p.id).join(', ')} n'est pas déterminé : relie-y un fil (Wildcard).`]);
  }
  if ((n.def === 'actor.spawn' || n.def === 'actor.getAllOfClass' || n.def === 'actor.getOfClass') && !linked('class')) {
    const id = n.defaults.class;
    if (typeof id !== 'string' || !ctx.project?.classes.some((c) => c.id === id)) out.push(['pickClass', 'choisis une classe sur la pin Class.']);
  }
  if (n.def === 'flow.switchEnum' && !enumEntries(String(n.config.enum ?? ''), ctx.project)) out.push(['pickEnum', "choisis l'Enum dans Details."]);
  return out;
}

/** Why a node pointing at another Blueprint, dispatcher or interface is broken. */
function brokenReference(n: NodeInstance, cls: BlueprintClass, ctx: NodeContext): [CompileCode, string] | undefined {
  const c = n.config;
  const owner = () => classById(ctx, c.owner);
  switch (n.def) {
    case 'cast.to':
      return classById(ctx, c.class) ? undefined : ['ownerGone', "le Blueprint ciblé n'existe plus."];
    case 'struct.make':
    case 'struct.break':
    case 'struct.setMembers':
      return findStruct(ctx.project, String(c.struct ?? '')) ? undefined : ['memberGone', "la structure n'existe plus."];
    case 'var.getExternal':
    case 'var.setExternal': {
      const o = owner();
      if (!o) return ['ownerGone', "le Blueprint propriétaire n'existe plus."];
      const v = findVariable(o, String(c.variable));
      if (!v) return ['memberGone', `la variable n'existe plus dans ${o.name}.`];
      if (v.private && o.id !== cls.id) return ['private', `${v.name} est Private : seul ${o.name} peut la lire ou la modifier.`];
      return undefined;
    }
    case 'dispatcher.call':
    case 'dispatcher.bind':
    case 'dispatcher.unbind':
    case 'dispatcher.unbindAll': {
      const o = owner();
      if (!o) return ['ownerGone', "le Blueprint propriétaire n'existe plus."];
      return findDispatcher(o, String(c.dispatcher)) ? undefined : ['memberGone', `l'Event Dispatcher n'existe plus dans ${o.name}.`];
    }
    case 'call.function':
    case 'call.pureFunction': {
      if (c.owner && !owner()) return ['ownerGone', "le Blueprint propriétaire n'existe plus."];
      return functionGraph(ctx, n) ? undefined : ['memberGone', "la fonction n'existe plus."];
    }
    case 'call.custom': {
      const o = owner() ?? cls;
      return findCustomEvent(o, String(c.event)) ? undefined : ['memberGone', `aucun Custom Event « ${c.event} » dans ${o.name}.`];
    }
    case 'event.interface':
    case 'iface.message':
    case 'iface.doesImplement': {
      const iface = ctx.project && findInterface(ctx.project, String(c.interface));
      if (!iface) return ['memberGone', "l'interface n'existe plus."];
      if (n.def !== 'iface.doesImplement' && !iface.functions.some((f) => f.id === c.fn)) return ['memberGone', `la fonction n'existe plus dans ${iface.name}.`];
      if (n.def === 'event.interface' && !cls.interfaces.includes(iface.id)) {
        return ['notImplemented', `${cls.name} n'implémente pas ${iface.name} (Class Settings › Implemented Interfaces).`];
      }
      const fn = iface.functions.find((f) => f.id === c.fn);
      if (n.def === 'event.interface' && fn?.outputs?.length) {
        return ['interfaceFunction', `${fn.name} a une sortie : elle s'implémente comme une fonction (My Blueprint › Interfaces), pas comme un événement.`];
      }
      return undefined;
    }
  }
  return undefined;
}

/** A child Blueprint: no name taken twice, overrides that match, Parent: calls that exist. */
function checkInheritance(cls: BlueprintClass, project: Project | undefined, out: CompileMessage[]): void {
  const parent = parentOf(project, cls);
  if (!parent) return;
  const base = inheritedView(parent, project);
  for (const v of cls.variables) {
    if (base.variables.some((x) => x.name === v.name)) {
      out.push({ severity: 'error', code: 'inheritedName', text: `La variable ${v.name} existe déjà dans ${parent.name}, la classe parente : renomme-la.` });
    }
  }
  for (const g of cls.graphs) {
    const inherited = g.kind === 'function' && base.graphs.find((x) => x.kind === 'function' && x.name === g.name);
    if (!inherited || !g.fn || !inherited.fn) continue;
    const sig = (f: typeof g.fn) => JSON.stringify([f.inputs.map((p) => p.type), f.outputs.map((p) => p.type), f.pure]);
    if (sig(g.fn) !== sig(inherited.fn)) {
      out.push({ severity: 'error', code: 'overrideSignature', text: `${g.name} redéfinit la fonction de ${parent.name} : elle doit avoir les mêmes entrées, sorties et case Pure.`, graphId: g.id });
    }
  }
}

function checkCustomEventNames(cls: BlueprintClass, out: CompileMessage[]): void {
  const seen = new Map<string, boolean>();
  for (const g of cls.graphs) {
    for (const n of Object.values(g.nodes)) {
      if (n.def !== 'event.custom') continue;
      const name = String(n.config.name ?? '').trim().toLowerCase();
      if (seen.has(name)) {
        out.push({ severity: 'error', code: 'duplicateCustomEvent', text: `Deux Custom Events portent le nom « ${n.config.name} ».`, graphId: g.id, nodeId: n.id });
      }
      seen.set(name, true);
    }
  }
}
