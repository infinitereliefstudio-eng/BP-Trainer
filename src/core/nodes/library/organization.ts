/**
 * Graph organisation: Reroute (a dot to route a wire, white or coloured)
 * and Comment (a titled box behind nodes, moving them with it).
 */
import { T } from '../../types/pins';
import { dataIn, dataOut, type NodeDefinition } from '../definition';

export const COMMENT_MIN = { w: 160, h: 90 };

export const organizationNodes: NodeDefinition[] = [
  {
    id: 'util.reroute',
    title: 'Reroute Node',
    category: 'Utilities',
    kind: 'pure',
    style: 'knot',
    description:
      "Un point de passage pour ranger un fil, d'exécution ou de données. Il prend le type du fil qu'on y branche. Double-touche un fil pour en ajouter un.",
    keywords: ['reroute', 'knot', 'point', 'fil', 'ranger'],
    pins: [dataIn('in', '', T.wildcard, { hideName: true }), dataOut('out', '', T.wildcard, { hideName: true })],
  },
  {
    id: 'util.comment',
    title: (n) => String(n.config.text || 'Comment'),
    category: 'Utilities',
    kind: 'comment',
    style: 'comment',
    description:
      "Un cadre titré derrière les nœuds, pour expliquer une partie du graphe. Déplacer le cadre déplace les nœuds qu'il contient ; la poignée en bas à droite le redimensionne.",
    keywords: ['comment', 'commentaire', 'cadre', 'note', 'ranger'],
    config: [{ key: 'text', label: 'Texte', kind: 'string' }],
    defaultConfig: { text: 'Comment', w: 480, h: 280, color: '#ffffff' },
    pins: [],
  },
];
