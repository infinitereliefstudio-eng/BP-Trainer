import { COMPONENT_CLASS, findComponent, findVariable } from '../../model/project';
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
];
