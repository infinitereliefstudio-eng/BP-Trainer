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
  {
    id: 'component.setRelativeRotation',
    title: 'Set Relative Rotation',
    category: 'Transformation',
    kind: 'function',
    description:
      "Tourne un composant par rapport à son parent. En 2D, seul Yaw compte : c'est la rotation vue de dessus, en degrés.",
    keywords: ['rotation', 'rotate', 'tourner', 'yaw', 'porte', 'ouvrir'],
    pins: [
      execIn(),
      dataIn('target', 'Target', T.object('SceneComponent'), { required: true }),
      dataIn('rotation', 'New Rotation', T.rotator),
      execOut(),
    ],
  },
  {
    id: 'component.setRelativeLocation',
    title: 'Set Relative Location',
    category: 'Transformation',
    kind: 'function',
    description: 'Déplace un composant par rapport à son parent, en centimètres. En 2D, Z est ignoré.',
    keywords: ['location', 'position', 'move', 'deplacer'],
    pins: [
      execIn(),
      dataIn('target', 'Target', T.object('SceneComponent'), { required: true }),
      dataIn('location', 'New Location', T.vector),
      execOut(),
    ],
  },
  {
    id: 'component.setIntensity',
    title: 'Set Intensity',
    category: 'Rendering|Lighting',
    kind: 'function',
    description: "Change l'intensité d'une lumière. 0 l'éteint sans la cacher.",
    keywords: ['intensity', 'intensite', 'lumiere', 'light'],
    pins: [
      execIn(),
      dataIn('target', 'Target', T.object('PointLightComponent'), { required: true }),
      dataIn('intensity', 'New Intensity', T.float, { default: 5000 }),
      execOut(),
    ],
  },
  {
    id: 'component.setText',
    title: 'Set Text',
    category: 'Rendering|Components|TextRender',
    kind: 'function',
    description: "Change le texte affiché par un composant Text Render.",
    keywords: ['text', 'texte', 'afficher', 'ecrire'],
    pins: [
      execIn(),
      dataIn('target', 'Target', T.object('TextRenderComponent'), { required: true }),
      dataIn('value', 'Value', T.string, { default: '' }),
      execOut(),
    ],
  },
];
