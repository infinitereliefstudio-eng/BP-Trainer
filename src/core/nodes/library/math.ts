import { T, type PinType } from '../../types/pins';
import { dataIn, dataOut, type NodeDefinition } from '../definition';

/** Compact binary operator node: two inputs, one Return Value. */
function binary(
  id: string,
  title: string,
  symbol: string,
  category: string,
  operand: PinType,
  result: PinType,
  description: string,
  keywords: string[] = [],
  defaults: [number | boolean, number | boolean] = [0, 0],
): NodeDefinition {
  return {
    id,
    title,
    symbol,
    category,
    kind: 'pure',
    style: 'compact',
    description,
    keywords,
    pins: [
      dataIn('a', 'A', operand, { default: defaults[0], hideName: true }),
      dataIn('b', 'B', operand, { default: defaults[1], hideName: true }),
      dataOut('result', 'Return Value', result, { hideName: true }),
    ],
  };
}

const INT = 'Math|Integer';
const FLOAT = 'Math|Float';
const BOOL = 'Math|Boolean';

export const mathNodes: NodeDefinition[] = [
  binary('math.addInt', 'Add (Integer)', '+', INT, T.int, T.int, 'Additionne A et B.', ['add', 'plus', 'addition'], [0, 1]),
  binary('math.subtractInt', 'Subtract (Integer)', '−', INT, T.int, T.int, 'Soustrait B à A.', ['subtract', 'moins', 'minus']),
  binary('math.equalInt', 'Equal (Integer)', '==', INT, T.int, T.bool, 'Vrai si A est égal à B.', ['equal', 'egal', 'compare']),
  binary('math.greaterInt', 'Greater (Integer)', '>', INT, T.int, T.bool, 'Vrai si A est strictement supérieur à B.', ['greater', 'superieur', 'compare']),
  binary('math.addFloat', 'Add (Float)', '+', FLOAT, T.float, T.float, 'Additionne A et B.', ['add', 'plus', 'addition'], [0, 1]),
  binary('math.multiplyFloat', 'Multiply (Float)', '×', FLOAT, T.float, T.float, 'Multiplie A par B.', ['multiply', 'fois', 'times'], [0, 1]),
  binary('math.lessFloat', 'Less (Float)', '<', FLOAT, T.float, T.bool, 'Vrai si A est strictement inférieur à B.', ['less', 'inferieur', 'compare']),
  binary('logic.and', 'AND Boolean', 'AND', BOOL, T.bool, T.bool, 'Vrai si A et B sont vrais tous les deux.', ['and', 'et'], [false, false]),
  binary('logic.or', 'OR Boolean', 'OR', BOOL, T.bool, T.bool, 'Vrai si A ou B (ou les deux) est vrai.', ['or', 'ou'], [false, false]),
  {
    id: 'logic.not',
    title: 'NOT Boolean',
    symbol: 'NOT',
    category: BOOL,
    kind: 'pure',
    style: 'compact',
    description: "Inverse un booléen : vrai devient faux et inversement.",
    keywords: ['not', 'non', 'inverser'],
    pins: [
      dataIn('a', 'A', T.bool, { default: false, hideName: true }),
      dataOut('result', 'Return Value', T.bool, { hideName: true }),
    ],
  },
  {
    id: 'math.randomIntInRange',
    title: 'Random Integer in Range',
    category: 'Math|Random',
    kind: 'pure',
    description:
      'Renvoie un entier au hasard entre Min et Max inclus. Attention : un nœud pur est recalculé pour chaque nœud qui le lit.',
    keywords: ['random', 'hasard', 'aleatoire'],
    pins: [
      dataIn('min', 'Min', T.int, { default: 0 }),
      dataIn('max', 'Max', T.int, { default: 10 }),
      dataOut('result', 'Return Value', T.int),
    ],
  },
];
