import { T } from '../../types/pins';
import { dataIn, dataOut, execIn, execOut, type NodeDefinition, type PinSpec } from '../definition';

const CAT = 'Utilities|Flow Control';

export const MAX_SEQUENCE_OUTPUTS = 10;

export const flowNodes: NodeDefinition[] = [
  {
    id: 'flow.branch',
    title: 'Branch',
    category: CAT,
    kind: 'flow',
    description: "Choisit un chemin selon un booléen : True si la condition est vraie, False sinon. L'équivalent d'un « if ».",
    keywords: ['if', 'si', 'condition'],
    pins: [
      execIn(),
      dataIn('condition', 'Condition', T.bool, { default: true }),
      execOut('true', 'True'),
      execOut('false', 'False'),
    ],
  },
  {
    id: 'flow.sequence',
    title: 'Sequence',
    category: CAT,
    kind: 'flow',
    description:
      "Exécute ses sorties dans l'ordre, l'une après l'autre, sans attendre : un Delay sur Then 0 ne retarde pas Then 1.",
    keywords: ['sequence', 'ordre', 'then'],
    config: [{ key: 'outputs', label: 'Nombre de sorties', kind: 'int', min: 1, max: MAX_SEQUENCE_OUTPUTS }],
    defaultConfig: { outputs: 2 },
    pins: (n) => {
      const count = Math.max(1, Math.min(MAX_SEQUENCE_OUTPUTS, Number(n.config.outputs ?? 2)));
      const outs: PinSpec[] = [];
      for (let i = 0; i < count; i++) outs.push(execOut(`then${i}`, `Then ${i}`));
      return [execIn(), ...outs];
    },
  },
  {
    id: 'flow.doOnce',
    title: 'DoOnce',
    category: CAT,
    kind: 'flow',
    description:
      "Ne laisse passer l'exécution qu'une seule fois. Il faut passer par Reset pour qu'il laisse passer à nouveau.",
    keywords: ['once', 'une fois'],
    pins: [
      execIn(),
      execIn('reset', 'Reset'),
      dataIn('startClosed', 'Start Closed', T.bool, { default: false }),
      execOut('completed', 'Completed'),
    ],
  },
  {
    id: 'flow.flipFlop',
    title: 'FlipFlop',
    category: CAT,
    kind: 'flow',
    description: 'Alterne entre A et B à chaque passage : A, puis B, puis A… Is A indique la sortie utilisée.',
    keywords: ['toggle', 'alterner', 'interrupteur'],
    pins: [execIn(), execOut('a', 'A'), execOut('b', 'B'), dataOut('isA', 'Is A', T.bool)],
  },
  {
    id: 'flow.gate',
    title: 'Gate',
    category: CAT,
    kind: 'flow',
    description:
      "Une porte d'exécution : ce qui entre par Enter ne sort par Exit que si la porte est ouverte. Open, Close et Toggle changent son état.",
    keywords: ['porte', 'open', 'close'],
    pins: [
      execIn('enter', 'Enter'),
      execIn('open', 'Open'),
      execIn('close', 'Close'),
      execIn('toggle', 'Toggle'),
      dataIn('startClosed', 'Start Closed', T.bool, { default: false }),
      execOut('exit', 'Exit'),
    ],
  },
  {
    id: 'flow.forLoop',
    title: 'For Loop',
    category: CAT,
    kind: 'flow',
    description:
      "Exécute Loop Body pour chaque index de First Index à Last Index, puis Completed. Toute la boucle s'exécute dans la même frame.",
    keywords: ['loop', 'boucle', 'for', 'repeter'],
    pins: [
      execIn(),
      dataIn('first', 'First Index', T.int, { default: 0 }),
      dataIn('last', 'Last Index', T.int, { default: 0 }),
      execOut('body', 'Loop Body'),
      dataOut('index', 'Index', T.int),
      execOut('completed', 'Completed'),
    ],
  },
  {
    id: 'flow.forLoopWithBreak',
    title: 'For Loop with Break',
    category: CAT,
    kind: 'flow',
    description:
      'Comme For Loop, mais un passage par Break arrête la boucle : Completed est exécuté et les index restants sont sautés.',
    keywords: ['loop', 'boucle', 'for', 'break', 'arreter', 'sortir'],
    pins: [
      execIn(),
      execIn('break', 'Break'),
      dataIn('first', 'First Index', T.int, { default: 0 }),
      dataIn('last', 'Last Index', T.int, { default: 0 }),
      execOut('body', 'Loop Body'),
      dataOut('index', 'Index', T.int),
      execOut('completed', 'Completed'),
    ],
  },
  {
    id: 'flow.whileLoop',
    title: 'While Loop',
    category: CAT,
    kind: 'flow',
    description:
      "Exécute Loop Body tant que Condition est vraie, puis Completed. Condition est relue à chaque tour : si rien ne la rend fausse, la boucle tourne à l'infini (Infinite loop detected).",
    keywords: ['loop', 'boucle', 'while', 'tant que'],
    pins: [execIn(), dataIn('condition', 'Condition', T.bool, { default: false }), execOut('body', 'Loop Body'), execOut('completed', 'Completed')],
  },
  {
    id: 'flow.doN',
    title: 'DoN',
    category: CAT,
    kind: 'flow',
    description:
      "Laisse passer l'exécution N fois, puis plus rien jusqu'à un Reset. Counter donne le numéro du passage (1, 2, … N).",
    keywords: ['do n', 'fois', 'compter', 'limiter'],
    pins: [
      execIn('enter', 'Enter'),
      dataIn('n', 'N', T.int, { default: 1 }),
      execIn('reset', 'Reset'),
      execOut('exit', 'Exit'),
      dataOut('counter', 'Counter', T.int),
    ],
  },
  {
    id: 'flow.multiGate',
    title: 'MultiGate',
    category: CAT,
    kind: 'flow',
    description:
      "À chaque passage, sort par la sortie suivante (Out 0, Out 1…). Une fois toutes utilisées, il s'arrête, sauf si Loop est coché. Is Random tire les sorties au hasard, sans répétition.",
    keywords: ['multigate', 'sorties', 'tour', 'alterner', 'cycle'],
    config: [{ key: 'outputs', label: 'Nombre de sorties', kind: 'int', min: 1, max: MAX_SEQUENCE_OUTPUTS }],
    defaultConfig: { outputs: 2 },
    pins: (n) => {
      const count = Math.max(1, Math.min(MAX_SEQUENCE_OUTPUTS, Number(n.config.outputs ?? 2)));
      const outs: PinSpec[] = [];
      for (let i = 0; i < count; i++) outs.push(execOut(`out${i}`, `Out ${i}`));
      return [
        execIn(),
        execIn('reset', 'Reset'),
        dataIn('isRandom', 'Is Random', T.bool, { default: false }),
        dataIn('loop', 'Loop', T.bool, { default: false }),
        dataIn('startIndex', 'Start Index', T.int, { default: -1 }),
        ...outs,
      ];
    },
  },
];
