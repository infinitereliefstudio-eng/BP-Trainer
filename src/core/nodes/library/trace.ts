/** Collision queries and events: Line Trace By Channel and Event Hit. */
import { T } from '../../types/pins';
import { dataIn, dataOut, execIn, execOut, type NodeDefinition } from '../definition';

const CAT = 'Collision';

export const traceNodes: NodeDefinition[] = [
  {
    id: 'trace.lineByChannel',
    title: 'Line Trace By Channel',
    category: CAT,
    kind: 'function',
    description:
      'Lance un rayon de Start à End (deux positions dans le monde) et s’arrête au premier objet qui bloque le canal. Return Value dit si quelque chose a été touché ; Out Hit décrit le contact (acteur, composant, position, distance). Draw Debug Type montre le rayon pendant Play.',
    keywords: ['line trace', 'raycast', 'rayon', 'viser', 'regarder', 'toucher', 'hit', 'interagir', 'tir'],
    pins: [
      execIn(),
      dataIn('start', 'Start', T.vector),
      dataIn('end', 'End', T.vector),
      dataIn('channel', 'Trace Channel', T.enum('ETraceTypeQuery'), { default: 0 }),
      dataIn('ignore', 'Actors to Ignore', T.array(T.object('Actor'))),
      dataIn('debug', 'Draw Debug Type', T.enum('EDrawDebugTrace'), { default: 0 }),
      dataIn('ignoreSelf', 'Ignore Self', T.bool, { default: true }),
      execOut(),
      dataOut('result', 'Return Value', T.bool),
      dataOut('hitActor', 'Out Hit Hit Actor', T.object('Actor')),
      dataOut('hitComponent', 'Out Hit Hit Component', T.object('PrimitiveComponent')),
      dataOut('location', 'Out Hit Location', T.vector),
      dataOut('normal', 'Out Hit Normal', T.vector),
      dataOut('distance', 'Out Hit Distance', T.float),
    ],
  },
  {
    id: 'event.hit',
    title: 'Event Hit',
    category: 'Events',
    kind: 'event',
    unique: true,
    allowedIn: ['event'],
    description:
      'Se déclenche quand cet acteur et un autre se bloquent : le joueur bute contre lui, ou lui contre un obstacle. Other est l’autre acteur, Hit Normal la direction de la poussée reçue. Tant que le contact dure, il se redéclenche à chaque image.',
    keywords: ['hit', 'collision', 'bloquer', 'cogner', 'pousser', 'contact', 'choc'],
    pins: [
      execOut(),
      dataOut('myComp', 'My Comp', T.object('PrimitiveComponent')),
      dataOut('other', 'Other', T.object('Actor')),
      dataOut('otherComp', 'Other Comp', T.object('PrimitiveComponent')),
      dataOut('location', 'Hit Location', T.vector),
      dataOut('normal', 'Hit Normal', T.vector),
    ],
  },
  {
    id: 'cs.entry',
    title: 'Construction Script',
    category: 'Events',
    kind: 'event',
    unique: true,
    hiddenFromPalette: true,
    allowedIn: ['construction'],
    description:
      'S’exécute dans l’éditeur chaque fois qu’une instance est placée, déplacée ou qu’une de ses variables Instance Editable change, puis une fois quand l’acteur apparaît en jeu, avant BeginPlay. Sert à préparer l’acteur à partir de ses réglages.',
    pins: [execOut()],
  },
];
