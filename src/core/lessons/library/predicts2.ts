/**
 * V5, two more "Prédis": P9 a Set that no white wire reaches (Débutant),
 * P10 For Loop with Break (Intermédiaire).
 */
import { T } from '../../types/pins';
import { ProjectBuilder } from '../builder';
import type { Lesson } from '../types';
import { predictLesson } from './predicts';

// ----------------------------------------------------------------------- P9

export const predict9: Lesson = predictLesson({
  id: 'p9-set-seul',
  code: 'P9',
  module: 'Variables',
  level: 'debutant',
  title: 'Le Set oublié',
  situation: 'Score vaut 10. Le graphe l’affiche, lui ajoute 5, puis l’affiche encore. Un autre Set, qui met Score à 100, est posé juste à côté. Qu’affiche l’Output Log ?',
  notions: ['Get / Set', 'Variable Integer', 'Event BeginPlay'],
  remember: 'Seuls les nœuds traversés par le fil blanc s’exécutent. Un Set posé à côté, sans fil blanc, ne change rien ; et un Get donne la valeur du moment où on la lit.',
  cards: [
    {
      title: 'À lire',
      body:
        'Ouvre **BP_Score**. Pars de **Event BeginPlay** et suis le **fil blanc** nœud après nœud, en notant sur un coin de papier ce que vaut `Score` à chaque étape.\n\n' +
        'Regarde bien le **Set Score = 100** : par où le fil blanc y arrive-t-il ?',
    },
    {
      title: 'Méthode pour prédire',
      body:
        '- Trouve l’événement : c’est le départ.\n- Avance d’un nœud à la fois le long du fil blanc.\n- À chaque Print String, remonte ses fils de données pour savoir ce qu’il lit **à ce moment-là**.\n- Ignore tout ce que le fil blanc ne touche pas.',
    },
  ],
  hints: ['Un nœud à pins blanches ne s’exécute que si un fil blanc y arrive.', 'Le Set Score = 100 n’est relié à aucun événement : il ne s’exécute jamais.', 'Réponse : 10, puis 15.'],
  setup() {
    const pb = new ProjectBuilder('Prédis P9');
    const b = pb.blueprint('BP_Score');
    pb.place(b, 0, 0);
    const score = b.variable('Score', T.int, 10);
    const ev = b.node('event.beginPlay', {}, {}, [64, 96]);
    const p1 = b.node('debug.printString', {}, {}, [340, 96]);
    const add = b.node('math.addInt', {}, { b: 5 }, [480, 320]);
    const set = b.node('var.set', { variable: score }, {}, [680, 96]);
    const p2 = b.node('debug.printString', {}, {}, [980, 96]);
    b.node('var.set', { variable: score }, { value: 100 }, [680, 460]);
    b.link(ev, 'then', p1, 'exec').link(p1, 'then', set, 'exec').link(set, 'then', p2, 'exec');
    b.link(b.node('var.get', { variable: score }, {}, [140, 260]), 'value', p1, 'text');
    b.link(b.node('var.get', { variable: score }, {}, [300, 340]), 'value', add, 'a').link(add, 'result', set, 'value');
    b.link(b.node('var.get', { variable: score }, {}, [800, 300]), 'value', p2, 'text');
    pb.playerStart(-400, 0);
    return pb.project;
  },
  scenario: [{ wait: 0.2 }],
  predict: {
    question: 'Que voit-on dans l’Output Log ?',
    options: ['10, puis 100', '10, puis 15', '15, puis 15', '100, puis 105'],
    answer: 1,
    explanation:
      'Le premier Print String lit Score avant tout changement : 10. Le Set relié au fil blanc range 10 + 5 : le second Print String lit 15. Le Set Score = 100 n’a aucun fil blanc : il ne s’exécute jamais. Compile le signale d’ailleurs par un avertissement.',
    verify: (p) => p.join(',') === '10,15',
  },
});

// ---------------------------------------------------------------------- P10

export const predict10: Lesson = predictLesson({
  id: 'p10-break',
  code: 'P10',
  module: 'Choisir un chemin',
  level: 'intermediaire',
  title: 'Sortir d’une boucle',
  situation: 'Un For Loop with Break va de 1 à 10 et affiche Index à chaque tour. Dès que Index atteint 3, le fil blanc entre dans Break. Completed affiche « Fin ». Qu’affiche l’Output Log ?',
  notions: ['For Loop with Break', 'Sortie Index', 'Branch'],
  remember: 'Break arrête la boucle après le tour en cours : ce tour-là va jusqu’au bout, les suivants n’ont pas lieu, et Completed sort quand même.',
  cards: [
    {
      title: 'À lire',
      body:
        'Ouvre **BP_Recherche**. **For Loop with Break** est un For Loop avec une entrée de plus : **Break**. Quand le fil blanc y entre, la boucle ne fera pas de tour supplémentaire.\n\n' +
        'Dans **Loop Body**, l’ordre compte : ici le **Print String** vient **avant** le Branch qui décide du Break.',
    },
    {
      title: 'À quoi ça sert',
      body:
        'C’est la boucle de la **recherche** : parcourir une liste et s’arrêter dès qu’on a trouvé, au lieu de tout parcourir pour rien.\n\n' +
        'Deux questions à se poser en lisant : le tour où l’on casse est-il affiché ? Et Completed sort-il après un Break ?',
    },
  ],
  hints: ['Déroule les tours un par un : Index = 1, puis 2, puis 3.', 'Au tour 3, le Print String s’exécute d’abord, puis le Branch envoie le fil dans Break.', 'Réponse : 1, 2, 3, Fin.'],
  setup() {
    const pb = new ProjectBuilder('Prédis P10');
    const b = pb.blueprint('BP_Recherche');
    pb.place(b, 0, 0);
    const ev = b.node('event.beginPlay', {}, {}, [64, 96]);
    const loop = b.node('flow.forLoopWithBreak', {}, { first: 1, last: 10 }, [340, 96]);
    const say = b.node('debug.printString', {}, {}, [700, 40]);
    const br = b.node('flow.branch', {}, {}, [1000, 40]);
    const ge = b.node('math.greaterEqualInt', {}, { b: 3 }, [820, 280]);
    const end = b.node('debug.printString', {}, { text: 'Fin' }, [700, 420]);
    b.link(ev, 'then', loop, 'exec').link(loop, 'body', say, 'exec').link(loop, 'index', say, 'text');
    b.link(say, 'then', br, 'exec').link(loop, 'index', ge, 'a').link(ge, 'result', br, 'condition');
    b.link(br, 'true', loop, 'break').link(loop, 'completed', end, 'exec');
    pb.playerStart(-400, 0);
    return pb.project;
  },
  scenario: [{ wait: 0.2 }],
  predict: {
    question: 'Que voit-on dans l’Output Log ?',
    options: ['1, 2, Fin', '1, 2, 3, Fin', '1, 2, 3 (sans Fin)', '1 à 10, puis Fin'],
    answer: 1,
    explanation:
      'Aux tours 1 et 2, le Branch sort par False : rien d’autre. Au tour 3, le Print String affiche 3, puis le Branch entre dans Break : la boucle ne fera pas le tour 4. Elle sort alors par Completed, comme une boucle qui finit normalement : « Fin » s’affiche.',
    verify: (p) => p.join(',') === '1,2,3,Fin',
  },
});
