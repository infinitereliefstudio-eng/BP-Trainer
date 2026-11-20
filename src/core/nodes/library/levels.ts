/**
 * Levels, as in UE's Gameplay Statics (category Game): travel to another
 * level, and the name of the one being played. The travel itself is done by
 * the Game (core/runtime/game.ts) at the start of the next frame.
 */
import { T } from '../../types/pins';
import { dataIn, dataOut, execIn, execOut, type NodeDefinition } from '../definition';

const CAT = 'Game';

export const levelNodes: NodeDefinition[] = [
  {
    id: 'level.open',
    title: 'Open Level (by Name)',
    category: CAT,
    kind: 'function',
    // A Construction Script also runs in the editor: travelling from there makes no sense.
    allowedIn: ['event', 'function'],
    description:
      'Quitte le niveau en cours pour celui qui porte ce nom (un asset Level du Content Drawer, sans « .umap »). Ce n’est pas immédiat : la suite de la chaîne s’exécute encore, puis, au début de l’image suivante, tout le monde du niveau reçoit Event End Play (Level Transition) et disparaît : acteurs, joueur, Player Controller, widgets, timers. Le nouveau niveau démarre comme au premier Play. Ce qu’il faut garder se note donc avant (GameInstance, Save Game). Options : texte ajouté à l’adresse du niveau (?porte=Nord), sans effet ici.',
    keywords: ['open level', 'ouvrir', 'niveau', 'level', 'map', 'carte', 'changer de niveau', 'travel', 'voyage'],
    pins: [
      execIn(),
      dataIn('level', 'Level Name', T.name, { default: '' }),
      dataIn('absolute', 'Absolute', T.bool, { default: true }),
      dataIn('options', 'Options', T.string, { default: '' }),
      execOut(),
    ],
  },
  {
    id: 'level.currentName',
    title: 'Get Current Level Name',
    category: CAT,
    kind: 'pure',
    description:
      'Le nom du niveau en cours (Lvl_Couloir). Remove Prefix String décoché : le nom tel que le donne le Play dans l’éditeur d’UE, avec son préfixe (UEDPIE_0_Lvl_Couloir). Pour comparer à un nom, on le laisse coché.',
    keywords: ['current level', 'level name', 'niveau', 'nom du niveau', 'map', 'ou suis-je'],
    pins: [dataIn('removePrefix', 'Remove Prefix String', T.bool, { default: true }), dataOut('result', 'Return Value', T.string)],
  },
];
