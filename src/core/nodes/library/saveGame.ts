/**
 * Save Game nodes, as in UE's Gameplay Statics: create a SaveGame object,
 * write it to a slot, read it back. A slot outlives the game (Stop, then
 * Play again): it is kept in the project, like a file on disk.
 */
import type { NodeInstance } from '../../model/project';
import { findClass } from '../../model/project';
import { T } from '../../types/pins';
import { dataIn, dataOut, execIn, execOut, type NodeContext, type NodeDefinition } from '../definition';

/** Create Save Game Object returns the class picked on its pin, as UE does (DeterminesOutputType). */
function pickedSaveGame(n: NodeInstance, ctx: NodeContext): string {
  const id = n.defaults.saveClass;
  return (typeof id === 'string' && ctx.project && findClass(ctx.project, id)?.name) || 'SaveGame';
}

const slot = () => [dataIn('slot', 'Slot Name', T.string, { default: '' }), dataIn('user', 'User Index', T.int, { default: 0 })];

export const saveGameNodes: NodeDefinition[] = [
  {
    id: 'save.create',
    title: 'Create Save Game Object',
    category: 'Game|Save Game',
    kind: 'function',
    description:
      'Crée un objet de la classe SaveGame choisie, ses variables à leur valeur par défaut. Il n’est écrit nulle part tant que Save Game to Slot ne l’a pas reçu.',
    keywords: ['save', 'sauvegarde', 'savegame', 'creer', 'create'],
    pins: (n, ctx) => [
      execIn(),
      dataIn('saveClass', 'Save Game Class', T.class('SaveGame')),
      execOut(),
      dataOut('result', 'Return Value', T.object(pickedSaveGame(n, ctx))),
    ],
  },
  {
    id: 'save.toSlot',
    title: 'Save Game to Slot',
    category: 'Game|Save Game',
    kind: 'function',
    description:
      'Écrit dans le slot une copie des variables du Save Game Object, telles qu’elles sont à cet instant. Ce qu’on change après n’est pas sauvé. Return Value : vrai si l’écriture a réussi.',
    keywords: ['save', 'sauver', 'sauvegarder', 'slot', 'ecrire'],
    pins: [execIn(), dataIn('object', 'Save Game Object', T.object('SaveGame')), ...slot(), execOut(), dataOut('result', 'Return Value', T.bool)],
  },
  {
    id: 'save.fromSlot',
    title: 'Load Game from Slot',
    category: 'Game|Save Game',
    kind: 'function',
    description:
      'Relit le slot et crée un nouvel objet avec ce qui y a été sauvé. Slot absent : Return Value vaut None, sans erreur. La référence est un simple SaveGame : il faut un Cast pour lire ses variables.',
    keywords: ['load', 'charger', 'lire', 'slot', 'sauvegarde'],
    pins: [execIn(), ...slot(), execOut(), dataOut('result', 'Return Value', T.object('SaveGame'))],
  },
  {
    id: 'save.exists',
    title: 'Does Save Game Exist',
    category: 'Game|Save Game',
    kind: 'function',
    description: 'Vrai si quelque chose a déjà été sauvé dans ce slot. À tester avant Load Game from Slot, pour savoir s’il faut créer une sauvegarde neuve.',
    keywords: ['exist', 'existe', 'slot', 'sauvegarde'],
    pins: [execIn(), ...slot(), execOut(), dataOut('result', 'Return Value', T.bool)],
  },
  {
    id: 'save.delete',
    title: 'Delete Game in Slot',
    category: 'Game|Save Game',
    kind: 'function',
    description: 'Efface le slot. Return Value : vrai s’il existait.',
    keywords: ['delete', 'effacer', 'supprimer', 'slot', 'sauvegarde'],
    pins: [execIn(), ...slot(), execOut(), dataOut('result', 'Return Value', T.bool)],
  },
];
