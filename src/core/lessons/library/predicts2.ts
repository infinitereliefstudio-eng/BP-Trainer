/**
 * V5, two more "Prédis": P9 a Set that no white wire reaches (Débutant),
 * P10 For Loop with Break (Intermédiaire).
 */
import { T } from '../../types/pins';
import { ProjectBuilder } from '../builder';
import type { Lesson } from '../types';
import { PREDICT_METHOD } from './kit';
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
  remember: 'Un nœud à pins blanches ne s’exécute que si le fil blanc le traverse : un Set posé à côté, sans fil blanc, ne change rien. Un Get (nœud pur) n’a pas besoin de fil blanc : il donne la valeur du moment où un nœud exécuté le lit.',
  cards: [
    {
      title: 'À lire',
      body:
        'Ouvre **BP_Score**. La variable `Score` (Integer) vaut **10** au départ.\n\n' +
        'Depuis **Event BeginPlay**, le fil blanc traverse trois nœuds : un **Print String** qui lit Score, un **Set Score** qui range Score + 5, puis un second **Print String** qui relit Score.\n\n' +
        'Plus bas, un autre **Set Score** range **100**. Regarde bien ses pins blanches : où va-t-il chercher son exécution ?',
    },
    {
      title: 'Get et Set',
      body:
        '- **Get Score** n’a pas de fil blanc : il donne la valeur **au moment** où un nœud exécuté la lit. Trois Get différents dans le graphe peuvent donc donner trois valeurs différentes.\n- **Set Score** a des pins blanches : il ne range sa valeur que si le fil d’exécution passe par lui.\n\n' +
        'Pour chaque Print String, la question est : quelle valeur a Score à l’instant où le fil blanc l’atteint ?',
    },
    PREDICT_METHOD,
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
      'Le premier Print String lit Score avant tout changement : 10. Le Set relié au fil blanc range 10 + 5 : le second Print String lit 15. Le Set Score = 100 n’a aucun fil blanc : il ne s’exécute jamais. Ici, Compile le signale par un avertissement ; UE, lui, ne dit rien.',
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
        'Ouvre **BP_Recherche**. Au lancement, un **For Loop with Break** va de 1 à 10.\n\n' +
        '- **Loop Body** → Print String (Index) → **Branch** (Index >= 3) → True : entrée **Break** de la boucle.\n- **Completed** → Print String « Fin ».\n\n' +
        'Dans Loop Body, l’ordre compte : le Print String vient **avant** le Branch qui décide du Break.',
    },
    {
      title: 'For Loop with Break',
      body:
        'C’est un For Loop avec une entrée de plus, **Break** : quand le fil blanc y entre, la boucle ne lance **plus de nouveau tour**.\n\n' +
        'Deux points à préciser en lisant le graphe :\n\n' +
        '- le tour pendant lequel on entre dans Break : ce qui est déjà fait est fait, mais la boucle est-elle interrompue au milieu, ou ce tour va-t-il jusqu’au bout ?\n- après un Break, la boucle sort-elle par **Completed**, comme une boucle qui finit normalement, ou pas du tout ?',
    },
    {
      title: 'À quoi ça sert',
      body:
        'C’est la boucle de la **recherche** : parcourir une liste et s’arrêter dès qu’on a trouvé, au lieu de tout parcourir pour rien. Sa cousine **For Each Loop with Break** fait la même chose sur un tableau.',
    },
    PREDICT_METHOD,
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
