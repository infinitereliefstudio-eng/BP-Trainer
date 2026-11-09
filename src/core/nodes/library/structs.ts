/**
 * Nodes of project structures: Make, Break and Set Members in. The palette
 * lists them for each Structure asset (`config.struct` names it). Their pins
 * are the structure's members, by member id.
 */
import type { NodeInstance } from '../../model/project';
import { T } from '../../types/pins';
import { findStruct } from '../../types/structs';
import { dataIn, dataOut, execIn, execOut, type NodeContext, type NodeDefinition } from '../definition';

export const structOf = (ctx: NodeContext, n: NodeInstance) => findStruct(ctx.project, String(n.config.struct ?? ''));

/** Members shown on Set Members in: ids listed in `config.fields`, as UE shows only the pins you tick. */
export function shownMembers(ctx: NodeContext, n: NodeInstance) {
  const ids = String(n.config.fields ?? '')
    .split(',')
    .filter(Boolean);
  return (structOf(ctx, n)?.members ?? []).filter((m) => ids.includes(m.id));
}

const name = (ctx: NodeContext, n: NodeInstance) => structOf(ctx, n)?.name ?? String(n.config.struct ?? '?');

export const structNodes: NodeDefinition[] = [
  {
    id: 'struct.make',
    title: (n, ctx) => `Make ${name(ctx, n)}`,
    category: 'Structures',
    kind: 'pure',
    hiddenFromPalette: true,
    description: 'Construit une valeur de la structure à partir de ses membres.',
    pins: (n, ctx) => [
      ...(structOf(ctx, n)?.members ?? []).map((m) => dataIn(m.id, m.name, m.type, { default: m.defaultValue })),
      dataOut('struct', name(ctx, n), T.struct(name(ctx, n))),
    ],
  },
  {
    id: 'struct.break',
    title: (n, ctx) => `Break ${name(ctx, n)}`,
    category: 'Structures',
    kind: 'pure',
    hiddenFromPalette: true,
    description: 'Sépare une valeur de la structure en ses membres.',
    pins: (n, ctx) => [
      dataIn('struct', name(ctx, n), T.struct(name(ctx, n))),
      ...(structOf(ctx, n)?.members ?? []).map((m) => dataOut(m.id, m.name, m.type)),
    ],
  },
  {
    id: 'struct.setMembers',
    title: (n, ctx) => `Set Members in ${name(ctx, n)}`,
    category: 'Structures',
    kind: 'function',
    hiddenFromPalette: true,
    description:
      'Change certains membres de la structure reliée (pin en losange) et garde les autres. Choisis les membres à changer dans Details. Reliée à une copie (Get (a copy) d’un tableau), seule la copie change.',
    pins: (n, ctx) => [
      execIn(),
      dataIn('struct', 'Struct Ref', T.struct(name(ctx, n)), { byRef: true }),
      ...shownMembers(ctx, n).map((m) => dataIn(m.id, m.name, m.type, { default: m.defaultValue })),
      execOut(),
      dataOut('out', 'Struct Out', T.struct(name(ctx, n))),
    ],
  },
];
