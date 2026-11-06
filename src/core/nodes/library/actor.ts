import { T } from '../../types/pins';
import { dataIn, dataOut, execIn, execOut, type NodeDefinition } from '../definition';

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
    category: 'Actor',
    kind: 'function',
    description: "Retire l'acteur du niveau. Sans rien relier à Target, c'est cet acteur (self) qui est détruit.",
    keywords: ['destroy', 'detruire', 'supprimer', 'kill'],
    pins: [execIn(), dataIn('target', 'Target', T.object('Actor'), { defaultsToSelf: true }), execOut()],
  },
];
