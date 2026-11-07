/** String functions, with UE's titles. */
import { T } from '../../types/pins';
import { dataIn, dataOut, type NodeDefinition, type PinSpec } from '../definition';

const CAT = 'Utilities|String';
export const MAX_APPEND = 8;

export const textNodes: NodeDefinition[] = [
  {
    id: 'string.append',
    title: 'Append',
    category: CAT,
    kind: 'pure',
    description: 'Colle les textes A, B… bout à bout, sans espace. Ajoute des entrées dans Details.',
    keywords: ['append', 'concat', 'coller', 'joindre', 'texte', '+'],
    config: [{ key: 'inputs', label: "Nombre d'entrées", kind: 'int', min: 2, max: MAX_APPEND }],
    defaultConfig: { inputs: 2 },
    pins: (n) => {
      const count = Math.max(2, Math.min(MAX_APPEND, Number(n.config.inputs ?? 2)));
      const ins: PinSpec[] = [];
      for (let i = 0; i < count; i++) ins.push(dataIn(`in${i}`, String.fromCharCode(65 + i), T.string, { default: '' }));
      return [...ins, dataOut('result', 'Return Value', T.string)];
    },
  },
  {
    id: 'string.contains',
    title: 'Contains',
    category: CAT,
    kind: 'pure',
    description: 'Vrai si Search In contient Substring. Use Case : majuscules et minuscules comptent.',
    keywords: ['contains', 'contient', 'chercher', 'texte'],
    pins: [
      dataIn('in', 'Search In', T.string, { default: '' }),
      dataIn('sub', 'Substring', T.string, { default: '' }),
      dataIn('useCase', 'Use Case', T.bool, { default: false }),
      dataIn('fromEnd', 'Search from End', T.bool, { default: false }),
      dataOut('result', 'Return Value', T.bool),
    ],
  },
  {
    id: 'string.len',
    title: 'Len',
    category: CAT,
    kind: 'pure',
    description: 'Le nombre de caractères du texte.',
    keywords: ['len', 'length', 'longueur', 'taille', 'texte'],
    pins: [dataIn('in', 'S', T.string, { default: '' }), dataOut('result', 'Return Value', T.int)],
  },
  {
    id: 'string.equal',
    title: 'Equal (String)',
    symbol: '==',
    category: CAT,
    kind: 'pure',
    style: 'compact',
    description: 'Vrai si les deux textes sont égaux, sans tenir compte des majuscules (comme le == de UE).',
    keywords: ['equal', 'egal', 'compare', 'texte', '=='],
    pins: [
      dataIn('a', 'A', T.string, { default: '', hideName: true }),
      dataIn('b', 'B', T.string, { default: '', hideName: true }),
      dataOut('result', 'Return Value', T.bool, { hideName: true }),
    ],
  },
  {
    id: 'string.equalExactly',
    title: 'Equal, Case Sensitive (String)',
    symbol: '===',
    category: CAT,
    kind: 'pure',
    style: 'compact',
    description: 'Vrai si les deux textes sont strictement identiques, majuscules comprises.',
    keywords: ['equal', 'egal', 'case', 'sensitive', 'texte', '==='],
    pins: [
      dataIn('a', 'A', T.string, { default: '', hideName: true }),
      dataIn('b', 'B', T.string, { default: '', hideName: true }),
      dataOut('result', 'Return Value', T.bool, { hideName: true }),
    ],
  },
  {
    id: 'string.notEqual',
    title: 'Not Equal (String)',
    symbol: '!=',
    category: CAT,
    kind: 'pure',
    style: 'compact',
    description: 'Vrai si les deux textes sont différents (sans tenir compte des majuscules).',
    keywords: ['not equal', 'different', 'texte', '!='],
    pins: [
      dataIn('a', 'A', T.string, { default: '', hideName: true }),
      dataIn('b', 'B', T.string, { default: '', hideName: true }),
      dataOut('result', 'Return Value', T.bool, { hideName: true }),
    ],
  },
  {
    id: 'string.toUpper',
    title: 'To Upper',
    category: CAT,
    kind: 'pure',
    description: 'Le texte en majuscules.',
    keywords: ['upper', 'majuscules'],
    pins: [dataIn('in', 'Source String', T.string, { default: '' }), dataOut('result', 'Return Value', T.string)],
  },
];
