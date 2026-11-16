/**
 * Transform: a location, a rotation and a scale in one value, and the two
 * nodes that pass a position from one space to the other (local ↔ world).
 * Seen from above, only Yaw turns anything.
 */
import { T } from '../../types/pins';
import { dataIn, dataOut, type NodeDefinition } from '../definition';

const CAT = 'Math|Transform';
const TRANSFORM = T.struct('Transform');
const ONE = { x: 1, y: 1, z: 1 };

export const transformNodes: NodeDefinition[] = [
  {
    id: 'actor.getTransform',
    title: 'Get Actor Transform',
    category: 'Transformation',
    kind: 'pure',
    description: 'Le Transform de l’acteur dans le monde : sa position, sa rotation et son échelle réunies. C’est le « repère » de l’acteur.',
    keywords: ['transform', 'position', 'rotation', 'repere', 'espace'],
    pins: [dataIn('target', 'Target', T.object('Actor'), { defaultsToSelf: true }), dataOut('result', 'Return Value', TRANSFORM)],
  },
  {
    id: 'math.makeTransform',
    title: 'Make Transform',
    category: CAT,
    kind: 'pure',
    description: 'Construit un Transform à partir d’une position, d’une rotation et d’une échelle.',
    keywords: ['transform', 'make', 'position', 'rotation', 'scale'],
    pins: [dataIn('location', 'Location', T.vector), dataIn('rotation', 'Rotation', T.rotator), dataIn('scale', 'Scale', T.vector, { default: ONE }), dataOut('result', 'Return Value', TRANSFORM)],
  },
  {
    id: 'math.breakTransform',
    title: 'Break Transform',
    category: CAT,
    kind: 'pure',
    description: 'Sépare un Transform en position, rotation et échelle.',
    keywords: ['transform', 'break', 'position', 'rotation', 'scale'],
    pins: [dataIn('in', 'In Transform', TRANSFORM), dataOut('location', 'Location', T.vector), dataOut('rotation', 'Rotation', T.rotator), dataOut('scale', 'Scale', T.vector)],
  },
  {
    id: 'math.transformLocation',
    title: 'Transform Location',
    category: CAT,
    kind: 'pure',
    description: 'Passe une position du repère local de T au monde : « à 100 cm devant le sol » devient une position dans le niveau, quelle que soit la rotation du sol.',
    keywords: ['transform', 'local', 'world', 'monde', 'repere', 'espace', 'convertir'],
    pins: [dataIn('t', 'T', TRANSFORM), dataIn('location', 'Location', T.vector), dataOut('result', 'Return Value', T.vector)],
  },
  {
    id: 'math.inverseTransformLocation',
    title: 'Inverse Transform Location',
    category: CAT,
    kind: 'pure',
    description: 'Passe une position du monde au repère local de T : « où suis-je, vu depuis le sol ? ». L’inverse exact de Transform Location.',
    keywords: ['transform', 'inverse', 'local', 'world', 'monde', 'repere', 'espace', 'convertir'],
    pins: [dataIn('t', 'T', TRANSFORM), dataIn('location', 'Location', T.vector), dataOut('result', 'Return Value', T.vector)],
  },
];
