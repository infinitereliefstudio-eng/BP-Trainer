/**
 * The player's controller. In UE a PlayerController is made by the game for
 * each player: it possesses the pawn, sits on the input stack between the
 * actors and the pawn, and owns the Enhanced Input Local Player Subsystem.
 */
import { T } from '../../types/pins';
import { dataIn, dataOut, type NodeDefinition } from '../definition';

export const controllerNodes: NodeDefinition[] = [
  {
    id: 'player.getController',
    title: 'Get Player Controller',
    category: 'Game',
    kind: 'pure',
    description:
      'Renvoie le Player Controller du joueur : l’objet qui le représente pendant toute la partie, même si son pion change. C’est par lui qu’on atteint l’Enhanced Input Local Player Subsystem.',
    keywords: ['player controller', 'controller', 'contrôleur', 'joueur', 'get player controller'],
    pins: [dataIn('index', 'Player Index', T.int, { default: 0 }), dataOut('result', 'Return Value', T.object('PlayerController'))],
  },
  {
    id: 'pawn.getController',
    title: 'Get Controller',
    category: 'Pawn',
    kind: 'pure',
    description:
      'Renvoie le Controller qui possède ce pion (None s’il n’est possédé par personne). Le type est Controller : pour s’en servir comme Player Controller, il faut un Cast To PlayerController.',
    keywords: ['get controller', 'controller', 'contrôleur', 'possess', 'pawn'],
    // Self is a Pawn only in a Pawn Blueprint: elsewhere the Target must be connected, as in UE.
    pins: (_n, ctx) => [
      dataIn('target', 'Target', T.object('Pawn'), ctx.cls.parent === 'Pawn' ? { defaultsToSelf: true } : { required: true }),
      dataOut('result', 'Return Value', T.object('Controller')),
    ],
  },
];
