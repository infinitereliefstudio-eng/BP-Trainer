import { findComponent, signatureKey } from '../../model/project';
import { customEventParams } from './communication';
import { T } from '../../types/pins';
import { dataOut, execOut, type NodeDefinition } from '../definition';

const CAT = 'Events';

export const eventNodes: NodeDefinition[] = [
  {
    id: 'event.beginPlay',
    title: 'Event BeginPlay',
    category: CAT,
    kind: 'event',
    unique: true,
    allowedIn: ['event'],
    description: "Se déclenche une fois, au lancement du jeu ou quand l'acteur apparaît dans le niveau.",
    keywords: ['begin', 'start', 'demarrage', 'debut'],
    pins: [execOut()],
  },
  {
    id: 'event.tick',
    title: 'Event Tick',
    category: CAT,
    kind: 'event',
    unique: true,
    allowedIn: ['event'],
    description:
      "Se déclenche à chaque frame. Delta Seconds donne le temps écoulé depuis la frame précédente. À utiliser avec modération.",
    keywords: ['update', 'frame'],
    pins: [execOut(), dataOut('delta', 'Delta Seconds', T.float)],
  },
  {
    id: 'event.actorBeginOverlap',
    title: 'Event ActorBeginOverlap',
    category: CAT,
    kind: 'event',
    unique: true,
    allowedIn: ['event'],
    description: "Se déclenche quand un autre acteur commence à chevaucher cet acteur (une zone de collision est traversée).",
    keywords: ['overlap', 'collision', 'trigger', 'entrer'],
    pins: [execOut(), dataOut('other', 'Other Actor', T.object('Actor'))],
  },
  {
    id: 'event.actorEndOverlap',
    title: 'Event ActorEndOverlap',
    category: CAT,
    kind: 'event',
    unique: true,
    allowedIn: ['event'],
    description: 'Se déclenche quand un autre acteur cesse de chevaucher cet acteur.',
    keywords: ['overlap', 'collision', 'sortir'],
    pins: [execOut(), dataOut('other', 'Other Actor', T.object('Actor'))],
  },
  {
    id: 'event.componentBeginOverlap',
    title: (n, ctx) => `On Component Begin Overlap (${findComponent(ctx.cls, String(n.config.component))?.name ?? '?'})`,
    category: 'Collision',
    kind: 'event',
    allowedIn: ['event'],
    hiddenFromPalette: true,
    description:
      "Se déclenche quand un acteur entre dans cette zone de collision précise. Pratique quand un Blueprint a plusieurs zones.",
    pins: [execOut(), dataOut('other', 'Other Actor', T.object('Actor'))],
  },
  {
    id: 'event.componentEndOverlap',
    title: (n, ctx) => `On Component End Overlap (${findComponent(ctx.cls, String(n.config.component))?.name ?? '?'})`,
    category: 'Collision',
    kind: 'event',
    allowedIn: ['event'],
    hiddenFromPalette: true,
    description: 'Se déclenche quand un acteur sort de cette zone de collision précise.',
    pins: [execOut(), dataOut('other', 'Other Actor', T.object('Actor'))],
  },
  {
    id: 'event.actorOnClicked',
    title: 'Event ActorOnClicked',
    category: CAT,
    kind: 'event',
    unique: true,
    allowedIn: ['event'],
    description: "Se déclenche quand on touche l'acteur dans le niveau.",
    keywords: ['click', 'touch', 'toucher'],
    pins: [execOut()],
  },
  {
    id: 'event.inputKey',
    title: (n) => String(n.config.key === 'SpaceBar' ? 'Space Bar' : (n.config.key ?? 'E')),
    category: 'Input|Keyboard Events',
    kind: 'event',
    allowedIn: ['event'],
    description:
      "Se déclenche quand le joueur appuie (Pressed) ou relâche (Released) une touche. Dans l'appli, les touches sont des boutons à l'écran.",
    keywords: ['input', 'key', 'touche', 'clavier', 'e', 'f', 'espace'],
    config: [
      {
        key: 'key',
        label: 'Touche',
        kind: 'choice',
        choices: [
          { value: 'E', label: 'E' },
          { value: 'F', label: 'F' },
          { value: 'SpaceBar', label: 'Space Bar' },
        ],
      },
    ],
    defaultConfig: { key: 'E' },
    pins: [execOut('pressed', 'Pressed'), execOut('released', 'Released')],
  },
  {
    id: 'event.custom',
    title: (n) => String(n.config.name || 'CustomEvent'),
    category: 'Add Event',
    kind: 'event',
    allowedIn: ['event'],
    description:
      "Un événement que tu nommes et que tu déclenches toi-même, depuis ce Blueprint ou un autre. Il s'exécute immédiatement quand on l'appelle.",
    keywords: ['custom', 'event', 'evenement', 'personnalise'],
    config: [{ key: 'name', label: 'Nom', kind: 'string' }],
    defaultConfig: { name: 'CustomEvent' },
    // The red square is the event itself, to plug into a Bind Event node.
    pins: (n, ctx) => {
      const params = customEventParams(ctx, n);
      return [
        execOut(),
        dataOut('delegate', '', { category: 'delegate', subtype: signatureKey(params) }, { hideName: true }),
        ...params.map((p) => dataOut(p.id, p.name, p.type)),
      ];
    },
  },
];
