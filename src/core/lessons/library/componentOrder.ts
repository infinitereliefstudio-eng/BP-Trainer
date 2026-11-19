/**
 * V7.20, the Actor Components steps, first rung (discover): P15 « Qui
 * commence ? ». A robot carries a health component; the component fills
 * its Vie in its own BeginPlay, the robot reads it in its BeginPlay. Between
 * two actors the order is not guaranteed (« L’ordre des BeginPlay »), but
 * between an actor and its components it is: the components first.
 */
import { T } from '../../types/pins';
import { ProjectBuilder } from '../builder';
import type { Lesson } from '../types';
import { PREDICT_METHOD } from './kit';
import { predictLesson } from './predicts';

const SAY = ['Santé prête', 'Robot démarre', '100'];

export const predictComponentOrder: Lesson = predictLesson({
  id: 'p15-qui-commence',
  code: 'P15',
  module: 'Composition',
  level: 'avance',
  title: 'Qui commence ?',
  situation:
    'BP_Robot porte un Actor Component, BP_Sante. Au lancement, le composant remplit sa Vie, puis le robot la lit et l’affiche. Le composant a-t-il déjà rempli sa Vie quand le robot la lit ?',
  chain: { notion: 'actor-components', step: 'discover' },
  notions: ['Actor Component', 'BeginPlay d’un composant', 'Ordre des BeginPlay'],
  remember:
    'Un Actor Component reçoit son BeginPlay avant l’acteur qui le porte : l’acteur peut compter sur ce que ses composants préparent. Entre deux acteurs différents, l’ordre n’est toujours pas garanti.',
  cards: [
    {
      title: 'Ce qui est nouveau : un Actor Component',
      body:
        'Un **Actor Component** est un Blueprint de parent **ActorComponent**. On l’ajoute à un acteur comme un Static Mesh (Components › + Add), mais il n’a **ni position ni forme** : seulement des variables, des fonctions et des événements.\n\n' +
        'Il a son **propre Event Graph**, avec son propre **Event BeginPlay**. Chaque acteur qui le porte a sa copie, avec ses propres variables.',
    },
    {
      title: 'À lire',
      body:
        '**BP_Sante** (Actor Component) a deux variables : **Vie** (0 au départ) et **VieMax** (100). Son **BeginPlay** : Set Vie = VieMax, puis Print String « Santé prête ».\n\n' +
        '**BP_Robot** porte un BP_Sante, nommé **Sante**. Son **BeginPlay** : Print String « Robot démarre », puis Print String de **Get Vie** lu sur Sante.\n\n' +
        'Un seul robot est posé. Ouvre les deux Blueprints et suis les fils.',
    },
    {
      title: 'La question',
      body:
        'Tu as vu dans « L’ordre des BeginPlay » qu’UE ne garantit pas l’ordre entre deux acteurs. Le robot et son composant sont-ils deux acteurs ? Le robot lit-il 100, ou la Vie de départ, 0 ?',
    },
    PREDICT_METHOD,
  ],
  hints: [
    'Un composant n’est pas un acteur : il fait partie du robot. UE lance-t-il le BeginPlay d’un acteur avant ou après ceux de ses composants ?',
    'UE fait commencer les composants d’un acteur, puis l’Event BeginPlay de l’acteur lui-même.',
    `Réponse : ${SAY[0]}, ${SAY[1]}, puis ${SAY[2]}.`,
  ],
  setup() {
    const pb = new ProjectBuilder('Prédis P15');
    const sante = pb.blueprint('BP_Sante', 'ActorComponent');
    const vie = sante.variable('Vie', T.int, 0);
    const max = sante.variable('VieMax', T.int, 100);
    const set = sante.node('var.set', { variable: vie }, {}, [340, 96]);
    const ready = sante.node('debug.printString', {}, { text: SAY[0] }, [640, 96]);
    sante.link(sante.node('event.beginPlay', {}, {}, [64, 96]), 'then', set, 'exec').link(sante.node('var.get', { variable: max }, {}, [160, 300]), 'value', set, 'value');
    sante.link(set, 'then', ready, 'exec');

    const robot = pb.blueprint('BP_Robot');
    robot.component('StaticMesh', 'Corps', { shape: 'cylinder', sizeX: 70, sizeY: 70, color: '#64748b', blocks: false });
    const comp = robot.logic(sante, 'Sante');
    const start = robot.node('debug.printString', {}, { text: SAY[1] }, [340, 96]);
    const read = robot.node('var.getExternal', { owner: sante.cls.id, variable: vie }, {}, [500, 320]);
    const text = robot.node('conv.intToString', {}, {}, [760, 320]);
    const show = robot.node('debug.printString', {}, {}, [900, 96]);
    robot.link(robot.node('event.beginPlay', {}, {}, [64, 96]), 'then', start, 'exec').link(start, 'then', show, 'exec');
    robot.link(robot.node('var.component', { component: comp }, {}, [340, 320]), 'value', read, 'target').link(read, 'value', text, 'in').link(text, 'result', show, 'text');
    pb.place(robot, 0, 0);
    pb.playerStart(-400, 0);
    return pb.project;
  },
  scenario: [{ wait: 0.2 }],
  predict: {
    question: 'Quels messages s’affichent, dans quel ordre ?',
    options: [
      `${SAY[0]}, ${SAY[1]}, 100`,
      `${SAY[1]}, 0, ${SAY[0]}`,
      `${SAY[1]}, ${SAY[0]}, 100`,
      'Ça change d’une partie à l’autre : l’ordre des BeginPlay n’est pas garanti',
    ],
    answer: 0,
    explanation:
      'Le composant fait partie du robot : UE lance d’abord le BeginPlay des composants d’un acteur, puis l’Event BeginPlay de l’acteur. Sante a donc rempli sa Vie (« Santé prête ») avant que le robot démarre et la lise : 100. L’ordre n’est pas garanti entre deux acteurs différents, mais il l’est entre un acteur et ses composants.',
    verify: (p) => p.join('|') === SAY.join('|'),
  },
});
