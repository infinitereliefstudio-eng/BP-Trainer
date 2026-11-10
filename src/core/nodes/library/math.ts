/**
 * Maths and logic. Operators are declared as tables: one row per node,
 * with UE's title and symbol. Ids from earlier versions are kept so saved
 * projects still load (math.addInt, math.lessFloat…).
 */
import { T, type PinType } from '../../types/pins';
import { dataIn, dataOut, type NodeDefinition } from '../definition';

const INT = 'Math|Integer';
const FLOAT = 'Math|Float';
const BOOL = 'Math|Boolean';
const VEC = 'Math|Vector';

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

/** A pure node with named pins (Clamp, Make Vector…). */
function fn(id: string, title: string, category: string, description: string, keywords: string[], ins: [string, string, PinType, unknown?][], outs: [string, string, PinType][]): NodeDefinition {
  return {
    id,
    title,
    category,
    kind: 'pure',
    description,
    keywords,
    pins: [
      ...ins.map(([pid, name, type, def]) => dataIn(pid, name, type, def === undefined ? {} : { default: def as number })),
      ...outs.map(([pid, name, type]) => dataOut(pid, name, type)),
    ],
  };
}

/** Arithmetic and comparisons, for Integer then Float. */
const OPS: { op: string; title: string; symbol: string; bool?: boolean; text: string; kw: string[]; b?: number }[] = [
  { op: 'add', title: 'Add', symbol: '+', text: 'Additionne A et B.', kw: ['add', 'plus', 'addition', '+'], b: 1 },
  { op: 'subtract', title: 'Subtract', symbol: '−', text: 'Soustrait B à A.', kw: ['subtract', 'moins', 'minus', '-'] },
  { op: 'multiply', title: 'Multiply', symbol: '×', text: 'Multiplie A par B.', kw: ['multiply', 'fois', 'times', '*'], b: 1 },
  { op: 'divide', title: 'Divide', symbol: '÷', text: 'Divise A par B. Diviser par 0 donne 0 et une erreur dans le log, comme dans UE.', kw: ['divide', 'diviser', '/'], b: 1 },
  { op: 'equal', title: 'Equal', symbol: '==', bool: true, text: 'Vrai si A est exactement égal à B. Pour des Float issus de calculs, préfère Nearly Equal (0,1 + 0,2 ne vaut pas exactement 0,3).', kw: ['equal', 'egal', 'compare', '=='] },
  { op: 'notEqual', title: 'Not Equal', symbol: '!=', bool: true, text: 'Vrai si A est différent de B.', kw: ['not equal', 'different', '!='] },
  { op: 'less', title: 'Less', symbol: '<', bool: true, text: 'Vrai si A est strictement inférieur à B.', kw: ['less', 'inferieur', 'compare', '<'] },
  { op: 'lessEqual', title: 'Less Equal', symbol: '<=', bool: true, text: 'Vrai si A est inférieur ou égal à B.', kw: ['less equal', 'inferieur ou egal', '<='] },
  { op: 'greater', title: 'Greater', symbol: '>', bool: true, text: 'Vrai si A est strictement supérieur à B.', kw: ['greater', 'superieur', 'compare', '>'] },
  { op: 'greaterEqual', title: 'Greater Equal', symbol: '>=', bool: true, text: 'Vrai si A est supérieur ou égal à B.', kw: ['greater equal', 'superieur ou egal', '>='] },
];

const arithmetic: NodeDefinition[] = (['Int', 'Float'] as const).flatMap((k) => {
  const t = k === 'Int' ? T.int : T.float;
  const label = k === 'Int' ? 'Integer' : 'Float';
  const rows = OPS.map((o) =>
    binary(`math.${o.op}${k}`, `${o.title} (${label})`, o.symbol, k === 'Int' ? INT : FLOAT, t, o.bool ? T.bool : t, o.text, o.kw, [0, o.b ?? 0]),
  );
  if (k === 'Int') {
    rows.push(binary('math.moduloInt', '% (Integer)', '%', INT, T.int, T.int, 'Le reste de la division de A par B (7 % 3 donne 1). Pratique pour un cycle : Index % Nombre.', ['modulo', 'reste', '%', 'cycle'], [0, 1]));
  }
  return rows;
});

const helpers: NodeDefinition[] = (['Int', 'Float'] as const).flatMap((k): NodeDefinition[] => {
  const t = k === 'Int' ? T.int : T.float;
  const label = k === 'Int' ? 'Integer' : 'Float';
  const cat = k === 'Int' ? INT : FLOAT;
  return [
    fn(`math.clamp${k}`, `Clamp (${label})`, cat, 'Ramène Value entre Min et Max : en dessous de Min donne Min, au-dessus de Max donne Max.', ['clamp', 'borner', 'limiter', 'entre'], [['value', 'Value', t, 0], ['min', 'Min', t, 0], ['max', 'Max', t, k === 'Int' ? 100 : 1]], [['result', 'Return Value', t]]),
    binary(`math.min${k}`, `Min (${label})`, 'MIN', cat, t, t, 'La plus petite des deux valeurs.', ['min', 'minimum', 'plus petit']),
    binary(`math.max${k}`, `Max (${label})`, 'MAX', cat, t, t, 'La plus grande des deux valeurs.', ['max', 'maximum', 'plus grand']),
    {
      id: `math.abs${k}`,
      title: `Absolute (${label})`,
      symbol: 'ABS',
      category: cat,
      kind: 'pure',
      style: 'compact',
      description: 'La valeur sans son signe : −3 donne 3.',
      keywords: ['abs', 'absolute', 'absolu', 'positif'],
      pins: [dataIn('a', 'A', t, { default: 0, hideName: true }), dataOut('result', 'Return Value', t, { hideName: true })],
    },
  ];
});

const rounding: NodeDefinition[] = [
  fn('math.nearlyEqualFloat', 'Nearly Equal (Float)', FLOAT, "Vrai si A et B diffèrent d'au plus Error Tolerance. Le bon test pour des Float issus de calculs.", ['nearly', 'presque', 'egal', 'tolerance', 'compare'], [['a', 'A', T.float, 0], ['b', 'B', T.float, 0], ['tolerance', 'Error Tolerance', T.float, 1e-4]], [['result', 'Return Value', T.bool]]),
  fn('math.round', 'Round', FLOAT, "Arrondit à l'entier le plus proche (2,5 donne 3).", ['round', 'arrondir'], [['a', 'A', T.float, 0]], [['result', 'Return Value', T.int]]),
  fn('math.floor', 'Floor', FLOAT, "Arrondit à l'entier inférieur (2,9 donne 2 ; −2,1 donne −3).", ['floor', 'arrondir', 'inferieur'], [['a', 'A', T.float, 0]], [['result', 'Return Value', T.int]]),
  fn('math.ceil', 'Ceil', FLOAT, "Arrondit à l'entier supérieur (2,1 donne 3).", ['ceil', 'arrondir', 'superieur'], [['a', 'A', T.float, 0]], [['result', 'Return Value', T.int]]),
];

const random: NodeDefinition[] = [
  fn(
    'math.randomIntInRange',
    'Random Integer in Range',
    'Math|Random',
    'Renvoie un entier au hasard entre Min et Max inclus. Attention : un nœud pur est recalculé pour chaque nœud qui le lit.',
    ['random', 'hasard', 'aleatoire'],
    [['min', 'Min', T.int, 0], ['max', 'Max', T.int, 10]],
    [['result', 'Return Value', T.int]],
  ),
  fn('math.randomFloatInRange', 'Random Float in Range', 'Math|Random', 'Renvoie un nombre décimal au hasard entre Min et Max. Recalculé à chaque lecture, comme tout nœud pur.', ['random', 'hasard', 'aleatoire', 'float'], [['min', 'Min', T.float, 0], ['max', 'Max', T.float, 1]], [['result', 'Return Value', T.float]]),
  fn('math.randomBool', 'Random Bool', 'Math|Random', 'Pile ou face : true ou false au hasard, recalculé à chaque lecture.', ['random', 'hasard', 'pile', 'face', 'bool'], [], [['result', 'Return Value', T.bool]]),
];

const logic: NodeDefinition[] = [
  binary('logic.and', 'AND Boolean', 'AND', BOOL, T.bool, T.bool, 'Vrai si A et B sont vrais tous les deux.', ['and', 'et'], [false, false]),
  binary('logic.or', 'OR Boolean', 'OR', BOOL, T.bool, T.bool, 'Vrai si A ou B (ou les deux) est vrai.', ['or', 'ou'], [false, false]),
  binary('logic.xor', 'XOR Boolean', 'XOR', BOOL, T.bool, T.bool, "Vrai si A ou B est vrai, mais pas les deux.", ['xor', 'ou exclusif'], [false, false]),
  binary('logic.equalBool', 'Equal (Boolean)', '==', BOOL, T.bool, T.bool, 'Vrai si A et B ont la même valeur.', ['equal', 'egal', '=='], [false, false]),
  {
    id: 'logic.not',
    title: 'NOT Boolean',
    symbol: 'NOT',
    category: BOOL,
    kind: 'pure',
    style: 'compact',
    description: 'Inverse un booléen : vrai devient faux et inversement.',
    keywords: ['not', 'non', 'inverser'],
    pins: [dataIn('a', 'A', T.bool, { default: false, hideName: true }), dataOut('result', 'Return Value', T.bool, { hideName: true })],
  },
  {
    id: 'logic.equalObject',
    title: 'Equal (Object)',
    symbol: '==',
    category: 'Utilities',
    kind: 'pure',
    style: 'compact',
    description: 'Vrai si A et B désignent le même objet (ou sont tous les deux None).',
    keywords: ['equal', 'egal', 'meme', 'object', '=='],
    pins: [
      dataIn('a', 'A', T.object('Object'), { hideName: true }),
      dataIn('b', 'B', T.object('Object'), { hideName: true }),
      dataOut('result', 'Return Value', T.bool, { hideName: true }),
    ],
  },
  {
    id: 'logic.notEqualObject',
    title: 'Not Equal (Object)',
    symbol: '!=',
    category: 'Utilities',
    kind: 'pure',
    style: 'compact',
    description: 'Vrai si A et B désignent deux objets différents.',
    keywords: ['not equal', 'different', 'object', '!='],
    pins: [
      dataIn('a', 'A', T.object('Object'), { hideName: true }),
      dataIn('b', 'B', T.object('Object'), { hideName: true }),
      dataOut('result', 'Return Value', T.bool, { hideName: true }),
    ],
  },
  {
    id: 'logic.equalEnum',
    title: 'Equal (Enum)',
    symbol: '==',
    category: 'Utilities',
    kind: 'pure',
    style: 'compact',
    description: "Vrai si les deux valeurs d'Enum sont les mêmes. Prend le type de l'Enum relié.",
    keywords: ['equal', 'egal', 'enum', 'etat', '=='],
    pins: [
      dataIn('a', 'A', T.wildcard, { hideName: true, accepts: ['enum'] }),
      dataIn('b', 'B', T.wildcard, { hideName: true, accepts: ['enum'] }),
      dataOut('result', 'Return Value', T.bool, { hideName: true }),
    ],
  },
];

const vectors: NodeDefinition[] = [
  fn('math.makeVector', 'Make Vector', VEC, 'Construit un vecteur à partir de X, Y et Z (en cm). Vue de dessus, Z est ignoré.', ['vector', 'vecteur', 'make', 'position'], [['x', 'X', T.float, 0], ['y', 'Y', T.float, 0], ['z', 'Z', T.float, 0]], [['result', 'Return Value', T.vector]]),
  fn('math.breakVector', 'Break Vector', VEC, 'Sépare un vecteur en X, Y et Z.', ['vector', 'vecteur', 'break', 'x', 'y'], [['in', 'In Vec', T.vector]], [['x', 'X', T.float], ['y', 'Y', T.float], ['z', 'Z', T.float]]),
  binary('math.addVector', 'Add (Vector)', '+', VEC, T.vector, T.vector, 'Additionne deux vecteurs, coordonnée par coordonnée : déplace une position.', ['add', 'plus', 'vector', 'deplacer']),
  binary('math.subtractVector', 'Subtract (Vector)', '−', VEC, T.vector, T.vector, 'A − B : le vecteur qui va de B vers A.', ['subtract', 'moins', 'vector', 'direction']),
  {
    id: 'math.multiplyVectorFloat',
    title: 'Multiply (Vector * Float)',
    symbol: '×',
    category: VEC,
    kind: 'pure',
    style: 'compact',
    description: 'Multiplie chaque coordonnée du vecteur par B : agrandit ou réduit une direction.',
    keywords: ['multiply', 'fois', 'vector', 'echelle'],
    pins: [dataIn('a', 'A', T.vector, { hideName: true }), dataIn('b', 'B', T.float, { default: 1, hideName: true }), dataOut('result', 'Return Value', T.vector, { hideName: true })],
  },
  fn('math.vectorLength', 'Vector Length', VEC, 'La longueur du vecteur, en cm.', ['length', 'longueur', 'taille', 'vector'], [['a', 'A', T.vector]], [['result', 'Return Value', T.float]]),
  fn('math.vectorDistance', 'Distance (Vector)', VEC, 'La distance entre deux positions, en cm.', ['distance', 'ecart', 'vector'], [['a', 'V1', T.vector], ['b', 'V2', T.vector]], [['result', 'Return Value', T.float]]),
  fn('math.makeRotator', 'Make Rotator', 'Math|Rotator', 'Construit une rotation à partir de Roll (X), Pitch (Y) et Yaw (Z), en degrés. Vue de dessus, seul Yaw se voit.', ['rotator', 'rotation', 'yaw', 'make'], [['roll', 'X (Roll)', T.float, 0], ['pitch', 'Y (Pitch)', T.float, 0], ['yaw', 'Z (Yaw)', T.float, 0]], [['result', 'Return Value', T.rotator]]),
  fn('math.breakRotator', 'Break Rotator', 'Math|Rotator', 'Sépare une rotation en Roll, Pitch et Yaw. Vue de dessus, seul Yaw compte.', ['rotator', 'rotation', 'yaw', 'break'], [['in', 'In Rot', T.rotator]], [['roll', 'X (Roll)', T.float], ['pitch', 'Y (Pitch)', T.float], ['yaw', 'Z (Yaw)', T.float]]),
];

const INTERP = 'Math|Interpolation';

const interpolation: NodeDefinition[] = [
  fn('math.lerp', 'Lerp', FLOAT, 'Le point entre A et B à la proportion Alpha : 0 donne A, 1 donne B, 0,5 le milieu. Alpha vient souvent d’un Timeline.', ['lerp', 'interpolation', 'melange', 'entre', 'progressif'], [['a', 'A', T.float, 0], ['b', 'B', T.float, 1], ['alpha', 'Alpha', T.float, 0]], [['result', 'Return Value', T.float]]),
  fn('math.lerpVector', 'Lerp (Vector)', VEC, 'La position entre A et B à la proportion Alpha : 0 donne A, 1 donne B.', ['lerp', 'interpolation', 'vector', 'deplacer', 'progressif'], [['a', 'A', T.vector], ['b', 'B', T.vector], ['alpha', 'Alpha', T.float, 0]], [['result', 'Return Value', T.vector]]),
  fn('math.mapRangeClamped', 'Map Range Clamped', FLOAT, 'Transpose Value de l’intervalle In (A à B) vers l’intervalle Out (A à B), sans jamais en sortir : 50 sur 0–100 vers 0–1 donne 0,5.', ['map range', 'remap', 'transposer', 'pourcentage', 'intervalle', 'clamp'], [['value', 'Value', T.float, 0], ['inA', 'In Range A', T.float, 0], ['inB', 'In Range B', T.float, 1], ['outA', 'Out Range A', T.float, 0], ['outB', 'Out Range B', T.float, 1]], [['result', 'Return Value', T.float]]),
  fn('math.mapRangeUnclamped', 'Map Range Unclamped', FLOAT, 'Comme Map Range Clamped, mais une Value hors de l’intervalle In donne un résultat hors de l’intervalle Out.', ['map range', 'remap', 'transposer', 'intervalle'], [['value', 'Value', T.float, 0], ['inA', 'In Range A', T.float, 0], ['inB', 'In Range B', T.float, 1], ['outA', 'Out Range A', T.float, 0], ['outB', 'Out Range B', T.float, 1]], [['result', 'Return Value', T.float]]),
  fn('math.fInterpTo', 'FInterp To', INTERP, 'Rapproche Current de Target à chaque appel, vite au début puis de plus en plus doucement. À appeler sur Tick avec Delta Seconds ; Interp Speed règle la vitesse.', ['interp', 'finterp', 'lisser', 'suivre', 'approcher', 'smooth'], [['current', 'Current', T.float, 0], ['target', 'Target', T.float, 0], ['delta', 'Delta Time', T.float, 0], ['speed', 'Interp Speed', T.float, 1]], [['result', 'Return Value', T.float]]),
  fn('math.fInterpToConstant', 'FInterp To Constant', INTERP, 'Rapproche Current de Target à vitesse constante : Interp Speed unités par seconde, sans jamais dépasser Target.', ['interp', 'constant', 'vitesse', 'approcher'], [['current', 'Current', T.float, 0], ['target', 'Target', T.float, 0], ['delta', 'Delta Time', T.float, 0], ['speed', 'Interp Speed', T.float, 1]], [['result', 'Return Value', T.float]]),
  fn('math.vInterpTo', 'VInterp To', INTERP, 'Rapproche la position Current de Target à chaque appel, de plus en plus doucement. À appeler sur Tick avec Delta Seconds.', ['interp', 'vinterp', 'lisser', 'suivre', 'vector', 'smooth'], [['current', 'Current', T.vector], ['target', 'Target', T.vector], ['delta', 'Delta Time', T.float, 0], ['speed', 'Interp Speed', T.float, 1]], [['result', 'Return Value', T.vector]]),
  fn('math.normalizeVector', 'Normalize', VEC, 'Le même vecteur ramené à la longueur 1 : il ne garde que la direction. Un vecteur nul reste nul.', ['normalize', 'direction', 'unitaire', 'vector'], [['a', 'A', T.vector]], [['result', 'Return Value', T.vector]]),
  fn('time.getWorldDeltaSeconds', 'Get World Delta Seconds', 'Utilities|Time', 'Le temps écoulé depuis l’image précédente, comme Delta Seconds d’Event Tick, mais utilisable dans n’importe quel événement.', ['delta', 'seconds', 'temps', 'image', 'frame'], [], [['result', 'Return Value', T.float]]),
];

export const mathNodes: NodeDefinition[] = [...interpolation, ...arithmetic, ...helpers, ...rounding, ...random, ...logic, ...vectors];
