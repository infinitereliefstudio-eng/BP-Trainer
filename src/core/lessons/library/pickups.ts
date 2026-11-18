/**
 * Lot 2b of the path plan (docs/PLAN_PARCOURS.md): the Cast To, one notion at
 * a time. « Les pièces » teaches Destroy Actor alone; P13 « Qui est entré ? »
 * puts the usual wrong idea about Cast To in front of the learner before
 * « Ramasser un objet » uses it.
 */
import type { Project } from '../../model/project';
import { edit, ProjectBuilder } from '../builder';
import { noRuntimeErrors, normText, notion, usesNode } from '../checks';
import type { Check, CheckContext, Lesson } from '../types';
import { PREDICT_METHOD } from './kit';
import { predictLesson } from './predicts';
import { playerBlueprint } from './props';

// ------------------------------------------------------- Les pièces

const COINS: [number, number][] = [
  [0, -200],
  [150, 120],
  [320, -40],
];

function coinsProject(): Project {
  const pb = new ProjectBuilder('Les pièces');
  const coin = pb.blueprint('BP_Piece');
  coin.component('StaticMesh', 'Piece', { shape: 'cylinder', sizeX: 30, sizeY: 30, color: '#f5c542', blocks: false });
  coin.component('BoxCollision', 'Zone', { sizeX: 80, sizeY: 80 });
  for (const [x, y] of COINS) pb.place(coin, x, y);
  pb.playerStart(-400, 0);
  return pb.project;
}

/** Coins still in the level. */
function coinsLeft(cx: CheckContext): number {
  const cls = cx.project.classes.find((c) => c.name === 'BP_Piece');
  return cx.sim.actors.filter((a) => a.classId === cls?.id && !a.destroyed).length;
}

const pickedMessages = (cx: CheckContext) => cx.prints().filter((t) => normText(t).includes('piece'));

const coinChecks: Check[] = [
  {
    id: 'first',
    label: 'La première pièce touchée disparaît, les autres restent',
    at: 'une',
    test: (cx) => {
      const n = coinsLeft(cx);
      if (n === 2) return true;
      return n === 3 ? 'La pièce touchée est toujours là : Destroy Actor doit être traversé par le fil blanc de l’overlap.' : `Il reste ${n} pièce(s) après une seule touchée : chacune ne doit détruire qu’elle-même.`;
    },
  },
  {
    id: 'all',
    label: 'À la fin, plus aucune pièce',
    test: (cx) => (coinsLeft(cx) === 0 ? true : `Il reste ${coinsLeft(cx)} pièce(s) dans le niveau.`),
  },
  {
    id: 'said',
    label: 'Chaque pièce affiche un message avec le mot « pièce »',
    test: (cx) => {
      const n = pickedMessages(cx).length;
      return n >= 3 ? true : `${n} message(s) avec le mot « pièce » pour 3 pièces ramassées. Un Print String par pièce, avant ou après Destroy Actor.`;
    },
  },
  notion(usesNode('destroy', 'BP_Piece', ['actor.destroy'], 'Le graphe utilise Destroy Actor', 'Retire la pièce du niveau avec Destroy Actor.')),
  noRuntimeErrors(),
];

export const lessonCoins: Lesson = {
  id: 'l-pieces',
  module: 'Portes et objets',
  level: 'intermediaire',
  number: 0,
  title: 'Les pièces',
  situation: 'Trois pièces au sol. Quand le joueur en touche une, elle affiche « Pièce ramassée » et disparaît du niveau.',
  recalls: ['overlap', 'print'],
  notions: ['Destroy Actor'],
  remember:
    'Destroy Actor retire un acteur du niveau ; sans Target relié, c’est l’acteur lui-même (self). Chaque instance exécute son propre graphe : une pièce touchée ne détruit qu’elle.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        '**BP_Piece** : une pièce dorée (**Piece**) et une **Zone** (Box Collision) autour. Trois pièces sont posées dans le niveau. Le graphe est vide.\n\n' +
        'Le test amène le joueur sur chaque pièce, l’une après l’autre.',
    },
    {
      title: 'Destroy Actor',
      body:
        '**Destroy Actor** retire un acteur du niveau : il n’est plus affiché, n’a plus de collision, et son graphe ne réagit plus.\n\n' +
        '- **Target** : l’acteur à détruire. Non reliée, elle vaut **self** : l’acteur dont le graphe s’exécute. Ici, la pièce touchée.\n\n' +
        'Les trois pièces sont trois **instances** du même Blueprint. Quand le joueur en touche une, c’est le graphe de **celle-là** qui s’exécute : les deux autres ne bougent pas.',
    },
    {
      title: 'Avant ou après ?',
      body:
        'Le Print String peut venir avant ou après Destroy Actor. Dans UE, la suite du fil blanc en cours s’exécute encore : l’acteur ne disparaît vraiment qu’en fin d’image.\n\n' +
        'Mais rien ne reprendra **plus tard** : un Delay placé après Destroy Actor n’arrive jamais au bout. Par habitude, Destroy Actor se met en dernier.',
    },
    {
      title: 'Le plan',
      body: '**Event ActorBeginOverlap** → **Print String** « Pièce ramassée » → **Destroy Actor** (Target non reliée).',
    },
  ],
  objectives: ['Quand le joueur touche une pièce, elle affiche un message avec le mot « pièce ».', 'Puis elle disparaît du niveau.', 'Touche Vérifier.'],
  hints: [
    'Le même événement que pour l’interrupteur : quelqu’un entre dans la Zone. Ce qui est nouveau, c’est le nœud qui retire l’acteur.',
    'Nœuds : Event ActorBeginOverlap, Print String, Destroy Actor.',
    'Solution : ActorBeginOverlap → Print String « Pièce ramassée » → Destroy Actor, sans rien relier à Target.',
  ],
  challenge: 'Pose une caisse sur une des pièces dans le niveau, puis lance Play. Que se passe-t-il ? C’est le sujet de l’étape suivante.',
  setup: coinsProject,
  scenario: [
    { wait: 0.2 },
    { teleport: COINS[0] },
    { wait: 0.3 },
    { checkpoint: 'une' },
    { teleport: COINS[1] },
    { wait: 0.3 },
    { teleport: COINS[2] },
    { wait: 0.3 },
  ],
  checks: coinChecks,
  solve(p) {
    const b = edit(p, 'BP_Piece');
    const e = b.node('event.actorBeginOverlap', {}, {}, [64, 96]);
    const say = b.node('debug.printString', {}, { text: 'Pièce ramassée' }, [380, 96]);
    const kill = b.node('actor.destroy', {}, {}, [700, 96]);
    b.link(e, 'then', say, 'exec').link(say, 'then', kill, 'exec');
  },
};

// ------------------------------------------------------- P13 Qui est entré ?

export const predictWhoEntered: Lesson = predictLesson({
  id: 'p13-qui-entre',
  code: 'P13',
  chain: { notion: 'cast', step: 'discover' },
  module: 'Portes et objets',
  level: 'intermediaire',
  title: 'Qui est entré ?',
  situation:
    'Un détecteur répond « Le joueur » si c’est le joueur qui entre dans sa zone, « Autre chose » sinon. Une caisse y est posée dès le départ, puis le joueur arrive. Qu’affiche-t-il ?',
  notions: ['Cast To', 'Cast Failed'],
  remember:
    'Cast To ne cherche rien dans le niveau : il teste l’objet qu’on lui donne. Si ce n’est pas le bon type, il sort par Cast Failed, sans erreur. Chaque overlap a sa réponse.',
  cards: [
    {
      title: 'À lire',
      body:
        '**BP_Detecteur** a une grande **Zone**. Une **caisse** (BP_Caisse) est posée dedans dès le lancement ; le joueur part à gauche et y entre ensuite.\n\n' +
        'Son graphe :\n\n' +
        '- **Event ActorBeginOverlap** : quelqu’un vient d’entrer, c’est **Other Actor** ;\n' +
        '- **Cast To BP_Joueur**, Object = Other Actor ;\n' +
        '- sortie du haut (le Cast a réussi) → **Print String** « Le joueur » ;\n' +
        '- **Cast Failed** → **Print String** « Autre chose ».',
    },
    {
      title: 'Ce que fait un Cast',
      body:
        'Other Actor est de type **Actor**, le plus général : ce peut être le joueur, une caisse, un projectile. **Cast To BP_Joueur** pose une question sur cet objet-là : « es-tu un BP_Joueur ? ».\n\n' +
        'L’idée fausse la plus courante : croire que le Cast **va chercher** le joueur dans le niveau. Avant de répondre, demande-toi combien de fois l’événement part, et avec quel Other Actor à chaque fois.',
    },
    PREDICT_METHOD,
  ],
  hints: [
    'Compte les overlaps : combien d’acteurs entrent dans la Zone, et dans quel ordre ?',
    'La caisse est dans la Zone dès le lancement : elle entre la première. Est-ce un BP_Joueur ?',
    'Réponse : « Autre chose », puis « Le joueur ». Deux overlaps, deux réponses : la caisse fait échouer le Cast (Cast Failed), puis le joueur le réussit.',
  ],
  setup() {
    const pb = new ProjectBuilder('Prédis P13');
    const { b: player } = playerBlueprint(pb);
    const d = pb.blueprint('BP_Detecteur');
    d.component('StaticMesh', 'Socle', { sizeX: 40, sizeY: 40, color: '#64748b', blocks: false });
    d.component('BoxCollision', 'Zone', { sizeX: 300, sizeY: 300 });
    const e = d.node('event.actorBeginOverlap', {}, {}, [64, 96]);
    const cast = d.node('cast.to', { class: player.cls.id }, {}, [360, 96]);
    const yes = d.node('debug.printString', {}, { text: 'Le joueur' }, [720, 40]);
    const no = d.node('debug.printString', {}, { text: 'Autre chose' }, [720, 300]);
    d.link(e, 'then', cast, 'exec').link(e, 'other', cast, 'object').link(cast, 'then', yes, 'exec').link(cast, 'failed', no, 'exec');
    const crate = pb.blueprint('BP_Caisse');
    crate.component('StaticMesh', 'Caisse', { sizeX: 80, sizeY: 80, color: '#8b5a2b' });
    crate.component('BoxCollision', 'Contact', { sizeX: 90, sizeY: 90 });
    pb.place(d, 200, 0);
    pb.place(crate, 260, 80);
    pb.playerStart(-300, 0);
    return pb.project;
  },
  scenario: [{ wait: 0.3 }, { teleport: [140, -60] }, { wait: 0.3 }],
  predict: {
    question: 'Que montre l’Output Log, dans l’ordre ?',
    options: [
      '« Autre chose », puis « Le joueur »',
      '« Le joueur » seulement',
      '« Le joueur », puis « Autre chose »',
      'Rien : le Cast ne trouve que la caisse dans le niveau',
    ],
    answer: 0,
    explanation:
      'Il y a deux overlaps. La caisse, posée dans la Zone, entre la première : Other Actor est la caisse, ce n’est pas un BP_Joueur, le Cast sort par Cast Failed et affiche « Autre chose ». Puis le joueur entre : le Cast réussit, « Le joueur ». Le Cast teste l’objet reçu ; il ne cherche personne.',
    verify: (p) => p.length === 2 && p[0] === 'Autre chose' && p[1] === 'Le joueur',
  },
});
