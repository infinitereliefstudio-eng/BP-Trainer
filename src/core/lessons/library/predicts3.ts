/**
 * Lot 3b of the path plan: « Ordre et cycle de vie », a hard notion
 * introduced by the false idea. P14: a spawned actor is built and begins
 * playing inside the Spawn Actor node, before the chain that spawned it
 * goes on (not « next frame », not « with the level »).
 */
import { ProjectBuilder } from '../builder';
import type { Lesson } from '../types';
import { PREDICT_METHOD } from './kit';
import { predictLesson } from './predicts';

const SAY = ['Le hangar commence', 'Construction du drone', 'BeginPlay du drone', 'Le hangar a fini'];

export const predictSpawnOrder: Lesson = predictLesson({
  id: 'p14-cycle-de-vie',
  code: 'P14',
  module: 'Le temps',
  level: 'confirme',
  title: 'Qui parle en premier ?',
  situation: 'Au lancement, le hangar fait apparaître un drone. Le hangar, le Construction Script du drone et son BeginPlay affichent chacun un message. Dans quel ordre ?',
  notions: ['Spawn Actor', 'Construction Script', 'BeginPlay'],
  remember:
    'Spawn Actor construit l’acteur (Construction Script) et lance son BeginPlay avant de rendre la main : quand la pin blanche de sortie part, le nouvel acteur a déjà commencé à jouer.',
  cards: [
    {
      title: 'À lire',
      body:
        '**BP_Hangar** est posé dans le niveau. Son **BeginPlay** fait :\n\n' +
        '1. Print String « Le hangar commence » ;\n2. **Spawn Actor** de BP_Drone ;\n3. Print String « Le hangar a fini ».\n\n' +
        '**BP_Drone** n’est pas posé dans le niveau. Son **Construction Script** affiche « Construction du drone », son **BeginPlay** affiche « BeginPlay du drone ».',
    },
    {
      title: 'La question',
      body:
        'Trois idées circulent, une seule est juste :\n\n' +
        '- le drone n’existe qu’à l’image suivante, donc le hangar finit d’abord ;\n' +
        '- un Construction Script tourne au chargement du niveau, avant tout le reste ;\n' +
        '- Spawn Actor fait naître le drone en entier avant de passer à la suite.\n\n' +
        'Rappelle-toi « Avant ou après ? » et « Les vagues » : quand un Set fait après Spawn Actor arrive-t-il trop tard ?',
    },
    PREDICT_METHOD,
  ],
  hints: [
    'Le drone n’est pas dans le niveau : son Construction Script ne peut pas tourner avant qu’on le crée.',
    'Spawn Actor ne sort par sa pin blanche qu’une fois l’acteur construit et son BeginPlay exécuté.',
    `Réponse : ${SAY.join(', ')}.`,
  ],
  setup() {
    const pb = new ProjectBuilder('Prédis P14');
    const drone = pb.blueprint('BP_Drone');
    drone.component('StaticMesh', 'Corps', { shape: 'cylinder', sizeX: 40, sizeY: 40, color: '#0ea5e9', blocks: false });
    const { b: cs, entry } = drone.construction();
    cs.link(entry, 'then', cs.node('debug.printString', {}, { text: SAY[1] }, [360, 96]), 'exec');
    drone.link(drone.node('event.beginPlay', {}, {}, [64, 96]), 'then', drone.node('debug.printString', {}, { text: SAY[2] }, [360, 96]), 'exec');
    const hangar = pb.blueprint('BP_Hangar');
    hangar.component('StaticMesh', 'Socle', { sizeX: 160, sizeY: 120, color: '#4b5563', blocks: false });
    const begin = hangar.node('event.beginPlay', {}, {}, [64, 96]);
    const first = hangar.node('debug.printString', {}, { text: SAY[0] }, [340, 96]);
    const spawn = hangar.node('actor.spawn', {}, { class: drone.cls.id, location: { x: 200, y: 0, z: 0 } }, [640, 96]);
    const last = hangar.node('debug.printString', {}, { text: SAY[3] }, [980, 96]);
    hangar.link(begin, 'then', first, 'exec').link(first, 'then', spawn, 'exec').link(spawn, 'then', last, 'exec');
    pb.place(hangar, 0, 0);
    pb.playerStart(-400, 0);
    return pb.project;
  },
  scenario: [{ wait: 0.2 }],
  predict: {
    question: 'Dans quel ordre les quatre messages s’affichent-ils ?',
    options: [
      `${SAY[0]}, ${SAY[3]}, ${SAY[1]}, ${SAY[2]}`,
      `${SAY[0]}, ${SAY[1]}, ${SAY[2]}, ${SAY[3]}`,
      `${SAY[1]}, ${SAY[0]}, ${SAY[2]}, ${SAY[3]}`,
      `${SAY[0]}, ${SAY[1]}, ${SAY[3]}, ${SAY[2]}`,
    ],
    answer: 1,
    explanation:
      'Le drone n’existe pas avant le Spawn Actor : son Construction Script ne tourne pas au chargement. Spawn Actor le crée, exécute son Construction Script, puis son BeginPlay, et seulement ensuite sort par sa pin blanche : « Le hangar a fini » arrive en dernier. C’est pour cela qu’une valeur de naissance se donne par Expose on Spawn, et non par un Set après.',
    verify: (p) => p.join('|') === SAY.join('|'),
  },
});
