/**
 * User functions: the entry and return nodes of a function graph, and the
 * node that calls a function (impure, or pure without exec pins).
 */
import { findGraph, type Graph, type NodeInstance } from '../../model/project';
import { T } from '../../types/pins';
import { defaultValueFor } from '../../types/values';
import { dataIn, dataOut, execIn, execOut, type NodeContext, type NodeDefinition, type PinSpec } from '../definition';
import { classById } from './communication';

/** The function graph a node refers to (config.graph, in config.owner or this class). */
export function functionGraph(ctx: NodeContext, n: NodeInstance): Graph | undefined {
  const owner = classById(ctx, n.config.owner) ?? ctx.cls;
  const g = findGraph(owner, String(n.config.graph));
  return g?.kind === 'function' ? g : undefined;
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
    title: (n, ctx) => functionGraph(ctx, n)?.name ?? '?',
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
];
