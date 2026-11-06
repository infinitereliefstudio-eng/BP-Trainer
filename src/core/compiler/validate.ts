/**
 * The "Compile" step: checks a class the way UE's compiler would and
 * returns messages for the Compiler Results panel. Step 2 will turn a
 * validated class into an executable form; the checks stay here.
 */
import { findComponent, findVariable, type BlueprintClass, type Graph } from '../model/project';
import type { NodeContext } from '../nodes/definition';
import { contextFor, getDefinition, nodeTitle, resolvePins } from '../nodes/registry';
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

export function compileClass(cls: BlueprintClass): CompileResult {
  const ctx = contextFor(cls);
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
    if (n.def === 'var.component' && !findComponent(cls, String(n.config.component))) {
      out.push({ severity: 'error', text: `${title} : le composant n'existe plus.`, ...at });
    }
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
    if (!def || def.kind === 'event' || def.kind === 'pure' || def.style === 'getter') return false;
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
