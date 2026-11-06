import { T } from '../../types/pins';
import { dataIn, execIn, execOut, type NodeDefinition } from '../definition';

export const debugNodes: NodeDefinition[] = [
  {
    id: 'debug.printString',
    title: 'Print String',
    category: 'Development',
    kind: 'function',
    description:
      "Affiche un texte à l'écran pendant Duration secondes et l'écrit dans l'Output Log. L'outil de base pour vérifier ce qui se passe.",
    keywords: ['print', 'log', 'debug', 'afficher', 'message'],
    pins: [
      execIn(),
      dataIn('text', 'In String', T.string, { default: 'Hello' }),
      dataIn('toScreen', 'Print to Screen', T.bool, { default: true }),
      dataIn('toLog', 'Print to Log', T.bool, { default: true }),
      dataIn('duration', 'Duration', T.float, { default: 2 }),
      execOut(),
    ],
  },
];
