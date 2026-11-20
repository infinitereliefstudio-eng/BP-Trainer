/**
 * The Widget Component (V7.42): a User Widget carried by an actor, one object
 * per actor. Its node reads that object, typed User Widget as in UE: a Cast To
 * the Widget Blueprint gives its variables and widgets.
 */
import { T } from '../../types/pins';
import { dataIn, dataOut, type NodeDefinition } from '../definition';

export const widgetComponentNodes: NodeDefinition[] = [
  {
    id: 'widgetComponent.getUserWidgetObject',
    title: 'Get User Widget Object',
    category: 'User Interface',
    kind: 'pure',
    description:
      'Le widget que ce Widget Component a créé pour cet acteur (un exemplaire par acteur). Il est typé User Widget : un Cast To vers ton Widget Blueprint donne accès à ses variables et à ses widgets. None si Widget Class est vide, ou avant le BeginPlay de l’acteur (le composant crée son widget en commençant la partie).',
    keywords: ['user widget object', 'widget component', 'widget', 'barre', 'au-dessus', 'acteur', 'umg', 'get widget'],
    pins: [dataIn('target', 'Target', T.object('WidgetComponent'), { required: true }), dataOut('result', 'Return Value', T.object('UserWidget'))],
  },
];
