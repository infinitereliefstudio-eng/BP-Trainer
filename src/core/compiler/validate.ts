/**
 * The "Compile" step: checks a class the way UE's compiler would and
 * returns messages for the Compiler Results panel. Step 2 will turn a
 * validated class into an executable form; the checks stay here.
 */
import {
  findComponent,
  findDispatcher,
  findInterface,
  findVariable,
  type BlueprintClass,
  type Graph,
  type NodeInstance,
  type Project,
} from '../model/project';
import { classById, findCustomEvent } from '../nodes/library/communication';
import { functionGraph } from '../nodes/library/functions';
import type { NodeContext } from '../nodes/definition';
import { contextFor, getDefinition, nodeTitle, resolvePins } from '../nodes/registry';
import { enumEntries } from '../types/enums';
import { isAssignable } from '../types/pins';

export type Severity = 'error' | 'warning' | 'info';

export interface CompileMessage {
  severity: Severity;
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
  for (const g of cls.graphs) checkGraph(g, cls, ctx, messages);
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
      out.push({ severity: 'error', text: `Nœud inconnu « ${n.def} ».`, ...at });
      continue;
    }
    const title = nodeTitle(n, ctx);

    if ((n.def === 'var.get' || n.def === 'var.set') && !findVariable(cls, String(n.config.variable))) {
      out.push({ severity: 'error', text: `${title} : la variable n'existe plus.`, ...at });
    }
    if (n.def.startsWith('event.component') && !findComponent(cls, String(n.config.component))) {
      out.push({ severity: 'error', text: `${title} : le composant n'existe plus.`, ...at });
    }
    if (n.def === 'var.component' && !findComponent(cls, String(n.config.component))) {
      out.push({ severity: 'error', text: `${title} : le composant n'existe plus.`, ...at });
    }
    const broken = brokenReference(n, cls, ctx);
    if (broken) out.push({ severity: 'error', text: `${title} : ${broken}`, ...at });
    if (def.unique) {
      if (seenUnique.has(n.def)) out.push({ severity: 'error', text: `${title} est présent deux fois.`, ...at });
      seenUnique.set(n.def, n.id);
    }
    if (def.allowedIn && !def.allowedIn.includes(g.kind)) {
      out.push({
        severity: 'error',
        text: `${title} contient un appel latent, interdit hors de l'Event Graph (latent call outside of the event graph).`,
        ...at,
      });
    }
    for (const msg of nodeChecks(n, g, ctx)) out.push({ severity: 'error', text: `${title} : ${msg}`, ...at });
    for (const p of resolvePins(n, ctx)) {
      if (p.dir === 'in' && p.required && !linkedInputs.has(`${n.id}:${p.id}`)) {
        out.push({
          severity: 'error',
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
      out.push({ severity: 'error', text: 'Un fil relie deux pins incompatibles ou disparues.', graphId: g.id, nodeId: b?.id });
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
      text: `${nodeTitle(n, ctx)} n'est relié à aucun fil d'exécution : il ne s'exécutera jamais.`,
      graphId: g.id,
      nodeId: n.id,
    });
  }
}

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
function nodeChecks(n: NodeInstance, g: Graph, ctx: NodeContext): string[] {
  const out: string[] = [];
  const linked = (pin: string) => Object.values(g.links).some((l) => (l.to.node === n.id && l.to.pin === pin) || (l.from.node === n.id && l.from.pin === pin));
  for (const p of resolvePins(n, ctx)) {
    if (p.dir === 'in' && p.byRef) {
      const src = refSource(g, n.id, p.id);
      if (src?.def !== 'var.get' && src?.def !== 'var.getExternal') {
        out.push(`la pin ${p.name} est passée par référence : relie-y un Get de la variable à modifier.`);
      }
    }
  }
  if (n.def !== 'util.reroute' && n.def !== 'util.comment') {
    const open = resolvePins(n, ctx).filter((p) => p.wild && p.type.category === 'wildcard');
    if (open.length) out.push(`le type de ${open.map((p) => p.name || p.id).join(', ')} n'est pas déterminé : relie-y un fil (Wildcard).`);
  }
  if ((n.def === 'actor.spawn' || n.def === 'actor.getAllOfClass' || n.def === 'actor.getOfClass') && !linked('class')) {
    const id = n.defaults.class;
    if (typeof id !== 'string' || !ctx.project?.classes.some((c) => c.id === id)) out.push('choisis une classe sur la pin Class.');
  }
  if (n.def === 'flow.switchEnum' && !enumEntries(String(n.config.enum ?? ''), ctx.project)) out.push("choisis l'Enum dans Details.");
  return out;
}

/** Why a node pointing at another Blueprint, dispatcher or interface is broken. */
function brokenReference(n: NodeInstance, cls: BlueprintClass, ctx: NodeContext): string | undefined {
  const c = n.config;
  const owner = () => classById(ctx, c.owner);
  switch (n.def) {
    case 'cast.to':
      return classById(ctx, c.class) ? undefined : "le Blueprint ciblé n'existe plus.";
    case 'var.getExternal':
    case 'var.setExternal': {
      const o = owner();
      if (!o) return "le Blueprint propriétaire n'existe plus.";
      return findVariable(o, String(c.variable)) ? undefined : `la variable n'existe plus dans ${o.name}.`;
    }
    case 'dispatcher.call':
    case 'dispatcher.bind':
    case 'dispatcher.unbind':
    case 'dispatcher.unbindAll': {
      const o = owner();
      if (!o) return "le Blueprint propriétaire n'existe plus.";
      return findDispatcher(o, String(c.dispatcher)) ? undefined : `l'Event Dispatcher n'existe plus dans ${o.name}.`;
    }
    case 'call.function':
    case 'call.pureFunction': {
      if (c.owner && !owner()) return "le Blueprint propriétaire n'existe plus.";
      return functionGraph(ctx, n) ? undefined : "la fonction n'existe plus.";
    }
    case 'call.custom': {
      const o = owner() ?? cls;
      return findCustomEvent(o, String(c.event)) ? undefined : `aucun Custom Event « ${c.event} » dans ${o.name}.`;
    }
    case 'event.interface':
    case 'iface.message':
    case 'iface.doesImplement': {
      const iface = ctx.project && findInterface(ctx.project, String(c.interface));
      if (!iface) return "l'interface n'existe plus.";
      if (n.def !== 'iface.doesImplement' && !iface.functions.some((f) => f.id === c.fn)) return `la fonction n'existe plus dans ${iface.name}.`;
      if (n.def === 'event.interface' && !cls.interfaces.includes(iface.id)) {
        return `${cls.name} n'implémente pas ${iface.name} (Class Settings › Implemented Interfaces).`;
      }
      return undefined;
    }
  }
  return undefined;
}

function checkCustomEventNames(cls: BlueprintClass, out: CompileMessage[]): void {
  const seen = new Map<string, boolean>();
  for (const g of cls.graphs) {
    for (const n of Object.values(g.nodes)) {
      if (n.def !== 'event.custom') continue;
      const name = String(n.config.name ?? '').trim().toLowerCase();
      if (seen.has(name)) {
        out.push({ severity: 'error', text: `Deux Custom Events portent le nom « ${n.config.name} ».`, graphId: g.id, nodeId: n.id });
      }
      seen.set(name, true);
    }
  }
}
