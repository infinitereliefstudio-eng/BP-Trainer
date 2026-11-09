/**
 * User functions: the entry and return nodes of a function graph, and the
 * node that calls a function (impure, or pure without exec pins).
 */
import { eventKey, lineage, parentOf } from '../../model/inheritance';
import { findGraph, type Graph, type NodeInstance } from '../../model/project';
import { T } from '../../types/pins';
import { defaultValueFor } from '../../types/values';
import { dataIn, dataOut, execIn, execOut, type NodeContext, type NodeDefinition, type PinSpec } from '../definition';
import { classById, customEventParams } from './communication';

/** The function graph a node refers to (config.graph, in config.owner or this class). */
export function functionGraph(ctx: NodeContext, n: NodeInstance): Graph | undefined {
  const owner = classById(ctx, n.config.owner) ?? ctx.cls;
  let g = findGraph(owner, String(n.config.graph));
  // "Parent: Fn" points at a parent's function that this class overrides (so not in its inherited view).
  if (!g && ctx.project) g = lineage(ctx.project, owner).flatMap((c) => c.graphs).find((x) => x.id === n.config.graph);
  return g?.kind === 'function' ? g : undefined;
}

/** How UE names an event in "Parent: …". */
function eventLabel(n: NodeInstance): string {
  if (n.def === 'event.custom') return String(n.config.name ?? 'CustomEvent');
  if (n.def === 'event.inputKey') return String(n.config.key === 'SpaceBar' ? 'Space Bar' : (n.config.key ?? 'E'));
  return n.def.replace(/^event\./, '').replace(/^./, (c) => c.toUpperCase());
}

/** Data an event hands to its chain, which "Parent:" passes on. */
function eventOutputs(ctx: NodeContext, n: NodeInstance): PinSpec[] {
  if (n.def === 'event.tick') return [dataOut('delta', 'Delta Seconds', T.float)];
  if (n.def.includes('Overlap')) return [dataOut('other', 'Other Actor', T.object('Actor'))];
  if (n.def === 'event.custom') return customEventParams(ctx, n).map((p) => dataOut(p.id, p.name, p.type));
  return [];
}

/** The overridden event a "Parent:" node calls: the nearest ancestor's event node with that key. */
export function parentEvent(ctx: NodeContext, key: unknown): { node: NodeInstance; ctxCls: string } | undefined {
  const parent = parentOf(ctx.project, ctx.cls);
  if (!parent || !ctx.project) return undefined;
  for (const c of lineage(ctx.project, parent)) {
    for (const g of c.graphs) {
      if (g.kind !== 'event') continue;
      const node = Object.values(g.nodes).find((x) => eventKey(x) === key);
      if (node) return { node, ctxCls: c.id };
    }
  }
  return undefined;
}

function callPins(n: NodeInstance, ctx: NodeContext, pure: boolean): PinSpec[] {
  const owner = classById(ctx, n.config.owner);
  const g = functionGraph(ctx, n);
  const own = !owner || owner.id === ctx.cls.id;
  const target = dataIn('target', 'Target', T.object(owner?.name ?? ctx.cls.name), own ? { defaultsToSelf: true } : { required: true });
  const ins = (g?.fn?.inputs ?? []).map((p) => dataIn(p.id, p.name, p.type, { default: defaultValueFor(p.type) }));
  const outs = (g?.fn?.outputs ?? []).map((p) => dataOut(p.id, p.name, p.type));
  return pure ? [target, ...ins, ...outs] : [execIn(), target, ...ins, execOut(), ...outs];
}

export const functionNodes: NodeDefinition[] = [
  {
    id: 'fn.entry',
    title: (n, ctx) => functionGraph(ctx, n)?.name ?? 'Function',
    category: 'Functions',
    kind: 'entry',
    unique: true,
    allowedIn: ['function'],
    hiddenFromPalette: true,
    description: "Point d'entrée de la fonction. Ses sorties sont les paramètres d'entrée (Inputs) réglés dans Details.",
    pins: (n, ctx) => {
      const g = findGraph(ctx.cls, String(n.config.graph));
      return [execOut(), ...(g?.fn?.inputs ?? []).map((p) => dataOut(p.id, p.name, p.type))];
    },
  },
  {
    id: 'fn.return',
    title: 'Return Node',
    category: 'Functions',
    kind: 'entry',
    allowedIn: ['function'],
    description: 'Termine la fonction et renvoie ses sorties (Outputs) au nœud qui l’a appelée.',
    keywords: ['return', 'retour', 'sortie', 'output'],
    pins: (n, ctx) => {
      const g = findGraph(ctx.cls, String(n.config.graph));
      return [execIn(), ...(g?.fn?.outputs ?? []).map((p) => dataIn(p.id, p.name, p.type, { default: defaultValueFor(p.type) }))];
    },
  },
  {
    id: 'call.function',
    title: (n, ctx) => `${n.config.parent ? 'Parent: ' : ''}${functionGraph(ctx, n)?.name ?? '?'}`,
    category: 'Call Function',
    kind: 'function',
    hiddenFromPalette: true,
    description: 'Appelle une fonction : elle s’exécute entièrement, puis l’exécution continue avec ses sorties.',
    pins: (n, ctx) => callPins(n, ctx, false),
  },
  {
    id: 'call.pureFunction',
    title: (n, ctx) => functionGraph(ctx, n)?.name ?? '?',
    category: 'Call Function',
    kind: 'pure',
    hiddenFromPalette: true,
    description: 'Fonction pure : pas de pin d’exécution, elle est recalculée à chaque lecture de ses sorties.',
    pins: (n, ctx) => callPins(n, ctx, true),
  },
  {
    id: 'call.parentEvent',
    title: (n, ctx) => {
      const ev = parentEvent(ctx, n.config.event);
      return `Parent: ${ev ? eventLabel(ev.node) : String(n.config.event ?? '?').replace(/^event\./, '')}`;
    },
    category: 'Call Function',
    kind: 'function',
    hiddenFromPalette: true,
    description:
      'Exécute la version de la classe parente de cet événement. Un événement redéfini dans un Blueprint enfant remplace celui du parent : sans ce nœud, la logique du parent ne tourne pas.',
    pins: (n, ctx) => {
      const ev = parentEvent(ctx, n.config.event);
      const outs = ev ? eventOutputs(ctx, ev.node) : [];
      return [execIn(), ...outs.map((p) => dataIn(p.id, p.name, p.type, { default: defaultValueFor(p.type) })), execOut()];
    },
  },
];
