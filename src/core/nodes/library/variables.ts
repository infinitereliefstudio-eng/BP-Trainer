import { COMPONENT_CLASS, findComponent, findLocal, findVariable } from '../../model/project';
import { T } from '../../types/pins';
import { defaultValueFor } from '../../types/values';
import { dataIn, dataOut, execIn, execOut, type NodeDefinition } from '../definition';

/**
 * Variable and component nodes. They are hidden from the static palette:
 * the palette generates one Get / Set entry per variable of the class.
 */
export const variableNodes: NodeDefinition[] = [
  {
    id: 'var.get',
    title: (n, ctx) => findVariable(ctx.cls, String(n.config.variable))?.name ?? '(variable supprimée)',
    category: 'Variables',
    kind: 'variable',
    style: 'getter',
    hiddenFromPalette: true,
    description: "Lit la valeur actuelle d'une variable de ce Blueprint.",
    pins: (n, ctx) => {
      const v = findVariable(ctx.cls, String(n.config.variable));
      return [dataOut('value', v?.name ?? '?', v?.type ?? T.wildcard, { hideName: true })];
    },
  },
  {
    id: 'var.set',
    title: 'SET',
    category: 'Variables',
    kind: 'variable',
    hiddenFromPalette: true,
    description: "Donne une nouvelle valeur à une variable. La sortie renvoie la valeur qui vient d'être écrite.",
    pins: (n, ctx) => {
      const v = findVariable(ctx.cls, String(n.config.variable));
      const type = v?.type ?? T.wildcard;
      return [
        execIn(),
        dataIn('value', v?.name ?? '?', type, { default: defaultValueFor(type) }),
        execOut(),
        dataOut('out', '', type, { hideName: true }),
      ];
    },
  },
  {
    id: 'var.getLocal',
    title: (n, ctx) => findLocal(ctx.cls, String(n.config.variable))?.local.name ?? '(variable locale supprimée)',
    category: 'Variables|Local',
    kind: 'variable',
    style: 'getter',
    hiddenFromPalette: true,
    allowedIn: ['function'],
    description:
      "Lit une variable locale de la fonction. Elle n'existe que pendant un appel : chaque appel repart de sa valeur par défaut.",
    pins: (n, ctx) => {
      const l = findLocal(ctx.cls, String(n.config.variable))?.local;
      return [dataOut('value', l?.name ?? '?', l?.type ?? T.wildcard, { hideName: true })];
    },
  },
  {
    id: 'var.setLocal',
    title: 'SET',
    category: 'Variables|Local',
    kind: 'variable',
    hiddenFromPalette: true,
    allowedIn: ['function'],
    description: "Donne une valeur à une variable locale, pour la suite de cet appel de la fonction seulement.",
    pins: (n, ctx) => {
      const type = findLocal(ctx.cls, String(n.config.variable))?.local.type ?? T.wildcard;
      const name = findLocal(ctx.cls, String(n.config.variable))?.local.name ?? '?';
      return [
        execIn(),
        dataIn('value', name, type, { default: defaultValueFor(type) }),
        execOut(),
        dataOut('out', '', type, { hideName: true }),
      ];
    },
  },
  {
    id: 'var.component',
    title: (n, ctx) => findComponent(ctx.cls, String(n.config.component))?.name ?? '(composant supprimé)',
    category: 'Variables|Components',
    kind: 'variable',
    style: 'getter',
    hiddenFromPalette: true,
    description: "Donne une référence vers un composant de ce Blueprint, pour l'utiliser comme Target.",
    pins: (n, ctx) => {
      const c = findComponent(ctx.cls, String(n.config.component));
      return [dataOut('value', c?.name ?? '?', T.object(c ? COMPONENT_CLASS[c.kind] : 'SceneComponent'), { hideName: true })];
    },
  },
  ...(['Int', 'Float'] as const).flatMap((kind): NodeDefinition[] =>
    (['Increment', 'Decrement'] as const).map((op) => ({
      id: `var.${op.toLowerCase()}${kind}`,
      title: `${op} ${kind}`,
      category: 'Utilities|Operators',
      kind: 'function',
      description: `${op === 'Increment' ? 'Ajoute' : 'Retire'} 1 à la variable reliée (passée par référence) et renvoie sa nouvelle valeur. Relie un Get de la variable à modifier.`,
      keywords: op === 'Increment' ? ['increment', '++', 'plus un', 'compter', 'ajouter'] : ['decrement', '--', 'moins un', 'decompter', 'retirer'],
      pins: [
        execIn(),
        dataIn('value', 'Value', kind === 'Int' ? T.int : T.float, { byRef: true }),
        execOut(),
        dataOut('result', 'Return Value', kind === 'Int' ? T.int : T.float),
      ],
    })),
  ),
];
