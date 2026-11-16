/**
 * Random Stream: a sequence of random numbers that depends only on its
 * seed. The same seed and the same draws give the same numbers again, which
 * the global Random nodes cannot promise.
 */
import { T } from '../../types/pins';
import { dataIn, dataOut, execIn, execOut, type NodeDefinition } from '../definition';

const CAT = 'Math|Random';
const STREAM = T.struct('RandomStream');

export const randomStreamNodes: NodeDefinition[] = [
  {
    id: 'random.makeStream',
    title: 'Make Random Stream',
    category: CAT,
    kind: 'pure',
    description: 'Fabrique un Random Stream à partir d’une graine (Initial Seed). Deux streams de même graine donnent la même suite de nombres.',
    keywords: ['random', 'stream', 'seed', 'graine', 'hasard', 'reproductible'],
    pins: [dataIn('seed', 'Initial Seed', T.int, { default: 0 }), dataOut('result', 'Random Stream', STREAM)],
  },
  {
    id: 'random.intInRangeFromStream',
    title: 'Random Integer in Range from Stream',
    category: CAT,
    kind: 'pure',
    description: 'Un entier entre Min et Max inclus, tiré dans le Stream. Le tirage fait avancer le stream relié : le suivant donnera le nombre d’après.',
    keywords: ['random', 'stream', 'hasard', 'aleatoire', 'seed', 'graine'],
    pins: [dataIn('min', 'Min', T.int, { default: 0 }), dataIn('max', 'Max', T.int, { default: 10 }), dataIn('stream', 'Stream', STREAM), dataOut('result', 'Return Value', T.int)],
  },
  {
    id: 'random.floatInRangeFromStream',
    title: 'Random Float in Range from Stream',
    category: CAT,
    kind: 'pure',
    description: 'Un nombre décimal entre Min et Max, tiré dans le Stream, qui avance d’un cran.',
    keywords: ['random', 'stream', 'hasard', 'aleatoire', 'float', 'seed'],
    pins: [dataIn('min', 'Min', T.float, { default: 0 }), dataIn('max', 'Max', T.float, { default: 1 }), dataIn('stream', 'Stream', STREAM), dataOut('result', 'Return Value', T.float)],
  },
  {
    id: 'random.setSeed',
    title: 'Set Random Stream Seed',
    category: CAT,
    kind: 'function',
    description: 'Donne une nouvelle graine au Stream et le remet au début de la suite correspondante.',
    keywords: ['random', 'stream', 'seed', 'graine', 'set'],
    pins: [execIn(), dataIn('stream', 'Stream', STREAM, { byRef: true }), dataIn('seed', 'New Seed', T.int, { default: 0 }), execOut()],
  },
  {
    id: 'random.reset',
    title: 'Reset Random Stream',
    category: CAT,
    kind: 'function',
    description: 'Remet le Stream au début de sa suite : les prochains tirages redonnent les mêmes nombres, dans le même ordre.',
    keywords: ['random', 'stream', 'reset', 'recommencer', 'rejouer'],
    pins: [execIn(), dataIn('stream', 'Stream', STREAM, { byRef: true }), execOut()],
  },
];
