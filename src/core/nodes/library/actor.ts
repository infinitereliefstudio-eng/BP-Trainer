import { inheritedView } from '../../model/inheritance';
import { findClass, spawnPins } from '../../model/project';
import { T } from '../../types/pins';
import { dataIn, dataOut, execIn, execOut, type NodeContext, type NodeDefinition } from '../definition';

const ACTOR = 'Actor';
const TRANSFORM = 'Transformation';

/**
 * Class picked on a Class pin left unwired: its literal is a class id.
 * Spawn Actor and Get All Actors of Class type their result by it, like UE.
 */
function pickedClass(n: { defaults: Record<string, unknown> }, ctx: NodeContext): string {
  const id = n.defaults.class;
  return (typeof id === 'string' && ctx.project && findClass(ctx.project, id)?.name) || 'Actor';
}

export const actorNodes: NodeDefinition[] = [
  {
    id: 'actor.self',
    title: 'Self',
    category: 'Variables',
    kind: 'variable',
    style: 'getter',
    description: "Une référence vers l'instance de ce Blueprint elle-même.",
    keywords: ['self', 'this', 'moi', 'reference'],
    pins: (_n, ctx) => [dataOut('self', 'Self', T.object(ctx.cls.name), { hideName: true })],
  },
  {
    id: 'actor.destroy',
    title: 'Destroy Actor',
    category: ACTOR,
    kind: 'function',
    description:
      "Retire l'acteur du niveau. Son Event Destroyed s'exécute d'abord. Sans rien relier à Target, c'est cet acteur (self) qui est détruit.",
    keywords: ['destroy', 'detruire', 'supprimer', 'kill'],
    pins: [execIn(), dataIn('target', 'Target', T.object('Actor'), { defaultsToSelf: true }), execOut()],
  },
  {
    id: 'actor.spawn',
    title: (n, ctx) => `SpawnActor ${pickedClass(n, ctx) === 'Actor' ? 'NONE' : pickedClass(n, ctx)}`,
    category: 'Game',
    kind: 'function',
    description:
      "Crée un nouvel acteur de la classe choisie à la position donnée. Son BeginPlay s'exécute tout de suite, avant que la suite continue. Return Value est la référence vers lui. Les variables cochées Expose on Spawn deviennent des pins : leur valeur est donnée avant le BeginPlay.",
    keywords: ['spawn', 'creer', 'faire apparaitre', 'instancier', 'ajouter'],
    pins: (n, ctx) => {
      const id = n.defaults.class;
      const own = typeof id === 'string' && ctx.project ? findClass(ctx.project, id) : undefined;
      const cls = own && inheritedView(own, ctx.project);
      return [
        execIn(),
        dataIn('class', 'Class', T.class('Actor')),
        dataIn('location', 'Spawn Transform Location', T.vector),
        dataIn('rotation', 'Spawn Transform Rotation', T.rotator),
        ...(cls ? spawnPins(cls).map((v) => dataIn(`expose:${v.id}`, v.name, v.type, { default: v.defaultValue })) : []),
        execOut(),
        dataOut('result', 'Return Value', T.object(pickedClass(n, ctx))),
      ];
    },
  },
  {
    id: 'actor.getAllOfClass',
    title: 'Get All Actors Of Class',
    category: 'Utilities',
    kind: 'function',
    description:
      "Remplit un tableau avec tous les acteurs de la classe choisie présents dans le niveau, dans l'ordre du niveau. Coûteux dans UE : à faire au BeginPlay plutôt qu'à chaque Tick.",
    keywords: ['all actors', 'tous', 'liste', 'chercher', 'trouver', 'classe'],
    pins: (n, ctx) => [
      execIn(),
      dataIn('class', 'Actor Class', T.class('Actor')),
      execOut(),
      dataOut('actors', 'Out Actors', T.array(T.object(pickedClass(n, ctx)))),
    ],
  },
  {
    id: 'actor.getOfClass',
    title: 'Get Actor Of Class',
    category: 'Utilities',
    kind: 'function',
    description: 'Le premier acteur de la classe choisie trouvé dans le niveau, ou None s’il n’y en a aucun.',
    keywords: ['actor of class', 'trouver', 'chercher', 'premier', 'classe'],
    pins: (n, ctx) => [
      execIn(),
      dataIn('class', 'Actor Class', T.class('Actor')),
      execOut(),
      dataOut('result', 'Return Value', T.object(pickedClass(n, ctx))),
    ],
  },
  {
    id: 'actor.setHidden',
    title: 'Set Actor Hidden In Game',
    category: 'Rendering',
    kind: 'function',
    description: "Cache ou montre tout l'acteur pendant la partie. Comme dans UE, un acteur caché bloque et détecte toujours les collisions.",
    keywords: ['hidden', 'cacher', 'montrer', 'invisible', 'masquer'],
    pins: [execIn(), dataIn('target', 'Target', T.object('Actor'), { defaultsToSelf: true }), dataIn('hidden', 'New Hidden', T.bool, { default: true }), execOut()],
  },
  {
    id: 'actor.getLocation',
    title: 'Get Actor Location',
    category: TRANSFORM,
    kind: 'pure',
    description: "La position de l'acteur dans le monde, en cm. Vue de dessus : X vers la droite, Y vers le bas.",
    keywords: ['location', 'position', 'ou', 'coordonnees'],
    pins: [dataIn('target', 'Target', T.object('Actor'), { defaultsToSelf: true }), dataOut('result', 'Return Value', T.vector)],
  },
  {
    id: 'actor.setLocation',
    title: 'Set Actor Location',
    category: TRANSFORM,
    kind: 'function',
    description: "Téléporte l'acteur à New Location (Z ignoré). Les overlaps sont mis à jour à la frame suivante.",
    keywords: ['location', 'position', 'deplacer', 'teleporter', 'move'],
    pins: [
      execIn(),
      dataIn('target', 'Target', T.object('Actor'), { defaultsToSelf: true }),
      dataIn('location', 'New Location', T.vector),
      execOut(),
      dataOut('result', 'Return Value', T.bool),
    ],
  },
  {
    id: 'actor.addOffset',
    title: 'Add Actor World Offset',
    category: TRANSFORM,
    kind: 'function',
    description: "Déplace l'acteur de Delta Location par rapport à sa position actuelle. Sur Tick, multiplie par Delta Seconds pour une vitesse en cm/s.",
    keywords: ['offset', 'deplacer', 'bouger', 'move', 'avancer'],
    pins: [execIn(), dataIn('target', 'Target', T.object('Actor'), { defaultsToSelf: true }), dataIn('delta', 'Delta Location', T.vector), execOut()],
  },
  {
    id: 'actor.getRotation',
    title: 'Get Actor Rotation',
    category: TRANSFORM,
    kind: 'pure',
    description: "La rotation de l'acteur ; vue de dessus, seul Yaw (Z) compte.",
    keywords: ['rotation', 'yaw', 'orientation'],
    pins: [dataIn('target', 'Target', T.object('Actor'), { defaultsToSelf: true }), dataOut('result', 'Return Value', T.rotator)],
  },
  {
    id: 'actor.setRotation',
    title: 'Set Actor Rotation',
    category: TRANSFORM,
    kind: 'function',
    description: "Tourne tout l'acteur ; vue de dessus, seul Yaw (Z) compte.",
    keywords: ['rotation', 'tourner', 'yaw', 'orienter'],
    pins: [
      execIn(),
      dataIn('target', 'Target', T.object('Actor'), { defaultsToSelf: true }),
      dataIn('rotation', 'New Rotation', T.rotator),
      execOut(),
      dataOut('result', 'Return Value', T.bool),
    ],
  },
  {
    id: 'actor.getForward',
    title: 'Get Actor Forward Vector',
    category: TRANSFORM,
    kind: 'pure',
    description: "Le vecteur de longueur 1 vers lequel l'acteur regarde (son axe X).",
    keywords: ['forward', 'devant', 'direction', 'avant'],
    pins: [dataIn('target', 'Target', T.object('Actor'), { defaultsToSelf: true }), dataOut('result', 'Return Value', T.vector)],
  },
  {
    id: 'actor.distanceTo',
    title: 'Get Distance To',
    category: TRANSFORM,
    kind: 'pure',
    description: "La distance entre cet acteur et Other Actor, en cm. 0 si Other Actor vaut None.",
    keywords: ['distance', 'loin', 'proche', 'ecart'],
    pins: [
      dataIn('target', 'Target', T.object('Actor'), { defaultsToSelf: true }),
      dataIn('other', 'Other Actor', T.object('Actor')),
      dataOut('result', 'Return Value', T.float),
    ],
  },
  {
    id: 'actor.getClassName',
    title: 'Get Class',
    category: 'Utilities',
    kind: 'pure',
    description: "La classe de l'objet (Class Reference), par exemple pour la comparer ou la passer à Spawn Actor.",
    keywords: ['class', 'classe', 'type'],
    pins: [dataIn('object', 'Object', T.object('Object')), dataOut('result', 'Return Value', T.class('Object'))],
  },
];
