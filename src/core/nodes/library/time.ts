import { T } from '../../types/pins';
import { dataIn, execIn, execOut, type NodeDefinition } from '../definition';

const CAT = 'Utilities|Flow Control';

export const timeNodes: NodeDefinition[] = [
  {
    id: 'time.delay',
    title: 'Delay',
    category: CAT,
    kind: 'latent',
    allowedIn: ['event'],
    description:
      "Attend Duration secondes puis continue par Completed. S'il est rappelé pendant l'attente, l'appel est ignoré. Interdit dans une fonction.",
    keywords: ['wait', 'attendre', 'sleep', 'timer'],
    pins: [execIn(), dataIn('duration', 'Duration', T.float, { default: 0.2 }), execOut('completed', 'Completed')],
  },
  {
    id: 'time.retriggerableDelay',
    title: 'Retriggerable Delay',
    category: CAT,
    kind: 'latent',
    allowedIn: ['event'],
    description:
      "Comme Delay, mais chaque nouvel appel pendant l'attente remet le compte à zéro. Pratique pour « 3 s après le dernier passage ».",
    keywords: ['wait', 'attendre', 'reset', 'timer'],
    pins: [execIn(), dataIn('duration', 'Duration', T.float, { default: 0.2 }), execOut('completed', 'Completed')],
  },
];
