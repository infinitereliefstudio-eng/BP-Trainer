import { T } from '../../types/pins';
import { dataIn, execIn, execOut, type NodeDefinition } from '../definition';

const CAT = 'Rendering';

export const componentNodes: NodeDefinition[] = [
  {
    id: 'component.setVisibility',
    title: 'Set Visibility',
    category: CAT,
    kind: 'function',
    description:
      'Rend un composant visible ou invisible. Pour une Point Light, cela revient à allumer ou éteindre la lumière.',
    keywords: ['visibility', 'visible', 'cacher', 'afficher', 'allumer', 'eteindre', 'lumiere'],
    pins: [
      execIn(),
      dataIn('target', 'Target', T.object('SceneComponent'), { required: true }),
      dataIn('visible', 'New Visibility', T.bool, { default: false }),
      dataIn('propagate', 'Propagate to Children', T.bool, { default: false }),
      execOut(),
    ],
  },
  {
    id: 'component.toggleVisibility',
    title: 'Toggle Visibility',
    category: CAT,
    kind: 'function',
    description: "Inverse la visibilité d'un composant : visible devient invisible et inversement.",
    keywords: ['toggle', 'visibility', 'inverser', 'allumer', 'eteindre', 'lumiere'],
    pins: [
      execIn(),
      dataIn('target', 'Target', T.object('SceneComponent'), { required: true }),
      dataIn('propagate', 'Propagate to Children', T.bool, { default: false }),
      execOut(),
    ],
  },
];
