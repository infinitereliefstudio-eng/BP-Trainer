/**
 * More "Prédis" exercises (V4): read a Blueprint and choose what it prints.
 * P6 integer division, P7 Gate, P8 a Set that copies an array.
 */
import { T } from '../../types/pins';
import { ProjectBuilder } from '../builder';
import type { Lesson } from '../types';

const OBJECTIVES = [
  'Lis le graphe sans lancer Play : suis le fil blanc depuis l’événement.',
  'Choisis ta réponse dans l’onglet Prédis.',
  'Puis lance ▶ Play et regarde l’Output Log pour vérifier.',
];

const predictLesson = (l: Omit<Lesson, 'kind' | 'objectives' | 'checks' | 'solve' | 'number'>): Lesson => ({
  ...l,
  kind: 'predict',
  number: 0,
  objectives: OBJECTIVES,
  checks: [],
  solve: () => {},
});

// ----------------------------------------------------------------------- P6

export const predict6: Lesson = predictLesson({
  id: 'p6-division',
  code: 'P6',
  module: 'Premiers pas',
  level: 'debutant',
  title: 'Sept divisé par deux',
  situation: 'Deux divisions de 7 par 2 : l’une avec des pins vertes d’Integer, l’autre avec des Float. Affichent-elles la même chose ?',
  notions: ['Integer et Float', 'Division entière', 'Types des pins'],
  remember: 'Une division entre deux Integer donne un Integer : la partie après la virgule est perdue (7 / 2 = 3). Pour garder la virgule, divise des Float.',
  cards: [
    {
      title: 'À lire',
      body:
        'Ouvre **BP_Calcul**. Les deux nœuds **÷** se ressemblent, mais regarde la couleur de leurs pins : le premier travaille sur des **Integer** (nombres entiers), le second sur des **Float** (nombres à virgule).\n\n' +
        'Le résultat d’un nœud a le type de sa pin de sortie. Question : que peut contenir un Integer ?',
    },
  ],
  hints: [
    'Un Integer ne peut pas contenir 3,5.',
    'La division entière garde la partie entière et jette le reste : elle n’arrondit pas.',
    'Réponse : 3, puis 3.5.',
  ],
  setup() {
    const pb = new ProjectBuilder('Prédis P6');
    const b = pb.blueprint('BP_Calcul');
    pb.place(b, 0, 0);
    const ev = b.node('event.beginPlay', {}, {}, [64, 96]);
    const divInt = b.node('math.divideInt', {}, { a: 7, b: 2 }, [300, 300]);
    const divFloat = b.node('math.divideFloat', {}, { a: 7, b: 2 }, [640, 300]);
    const p1 = b.node('debug.printString', {}, {}, [380, 96]);
    const p2 = b.node('debug.printString', {}, {}, [720, 96]);
    b.link(ev, 'then', p1, 'exec').link(p1, 'then', p2, 'exec');
    b.link(divInt, 'result', p1, 'text').link(divFloat, 'result', p2, 'text');
    pb.playerStart(-400, 0);
    return pb.project;
  },
  scenario: [{ wait: 0.2 }],
  predict: {
    question: 'Que voit-on dans l’Output Log ?',
    options: ['3.5, puis 3.5', '3, puis 3.5', '4, puis 3.5', '3, puis 3'],
    answer: 1,
    explanation:
      'Entre deux Integer, la division est entière : 7 / 2 donne 3, le reste est jeté (pas d’arrondi vers 4). Entre deux Float, elle garde la virgule : 3,5. C’est le type des pins qui décide, pas les nombres qu’on y écrit.',
    verify: (p) => p.length === 2 && Number(p[0]) === 3 && Number(p[1]) === 3.5,
  },
});

// ----------------------------------------------------------------------- P7

export const predict7: Lesson = predictLesson({
  id: 'p7-gate',
  code: 'P7',
  module: 'Portes et objets',
  level: 'intermediaire',
  title: 'Le Gate',
  situation: 'Un Sequence envoie le fil blanc trois fois vers le même Gate : dans Enter, puis dans Open, puis encore dans Enter. Combien de fois « Passe » s’affiche-t-il ?',
  notions: ['Gate', 'Sequence', 'Start Closed'],
  remember: 'Un Gate ne laisse sortir par Exit que ce qui entre par Enter pendant qu’il est ouvert. Open, Close et Toggle changent son état sans rien faire sortir.',
  cards: [
    {
      title: 'À lire',
      body:
        'Ouvre **BP_Sas**. Un **Gate** est une porte sur le fil blanc : ce qui arrive par **Enter** ressort par **Exit** seulement si la porte est ouverte.\n\n' +
        '**Open**, **Close** et **Toggle** l’ouvrent ou la ferment. Ici **Start Closed** est coché : au départ, elle est fermée.\n\n' +
        'Sequence exécute Then 0, puis Then 1, puis Then 2, dans l’ordre.',
    },
  ],
  hints: [
    'Suis les trois sorties du Sequence une par une, en notant l’état de la porte.',
    'Entrer par Open ouvre la porte, mais ne fait rien sortir par Exit.',
    'Réponse : une seule fois. Le premier Enter trouve la porte fermée, Open l’ouvre, le second Enter passe.',
  ],
  setup() {
    const pb = new ProjectBuilder('Prédis P7');
    const b = pb.blueprint('BP_Sas');
    pb.place(b, 0, 0);
    const ev = b.node('event.beginPlay', {}, {}, [64, 160]);
    const seq = b.node('flow.sequence', { outputs: 3 }, {}, [320, 160]);
    const gate = b.node('flow.gate', {}, { startClosed: true }, [640, 160]);
    const say = b.node('debug.printString', {}, { text: 'Passe' }, [940, 160]);
    b.link(ev, 'then', seq, 'exec');
    b.link(seq, 'then0', gate, 'enter').link(seq, 'then1', gate, 'open').link(seq, 'then2', gate, 'enter');
    b.link(gate, 'exit', say, 'exec');
    pb.playerStart(-400, 0);
    return pb.project;
  },
  scenario: [{ wait: 0.2 }],
  predict: {
    question: 'Combien de fois « Passe » s’affiche-t-il ?',
    options: ['Jamais', 'Une fois', 'Deux fois', 'Trois fois'],
    answer: 1,
    explanation:
      'Then 0 entre par Enter : la porte est fermée (Start Closed), rien ne sort. Then 1 entre par Open : la porte s’ouvre, mais Open ne fait rien sortir. Then 2 entre par Enter : la porte est ouverte, le fil blanc sort par Exit et « Passe » s’affiche une fois.',
    verify: (p) => p.join(',') === 'Passe',
  },
});

// ----------------------------------------------------------------------- P8

export const predict8: Lesson = predictLesson({
  id: 'p8-copie-tableau',
  code: 'P8',
  module: 'Données',
  level: 'confirme',
  title: 'Deux tableaux, ou un seul ?',
  situation: 'Sauvegarde reçoit le tableau Sac avec un Set. Ensuite, on ajoute un objet à Sac. Combien d’éléments contient Sauvegarde ?',
  notions: ['Tableau (Array)', 'Set copie la valeur', 'Copie ou référence'],
  remember: 'Un Set sur un tableau (ou une structure) copie tout son contenu : les deux variables ne partagent rien, modifier l’une ne change pas l’autre.',
  cards: [
    {
      title: 'À lire',
      body:
        'Ouvre **BP_Coffre**. La variable **Sac** contient deux objets. Le graphe fait **Set Sauvegarde = Sac**, puis **Add** « Lampe » à Sac, puis affiche le nombre d’éléments de **Sauvegarde**, et celui de **Sac**.\n\n' +
        'Question : après le Set, Sauvegarde et Sac sont-ils le même tableau, ou deux tableaux qui se ressemblent ?',
    },
  ],
  hints: [
    'Une variable de tableau contient le tableau lui-même, pas un lien vers un tableau partagé.',
    'Set recopie les éléments de Sac dans Sauvegarde, au moment où il s’exécute.',
    'Réponse : 2, puis 3. Sauvegarde garde les deux objets du moment de la copie.',
  ],
  setup() {
    const pb = new ProjectBuilder('Prédis P8');
    const b = pb.blueprint('BP_Coffre');
    pb.place(b, 0, 0);
    const sac = b.variable('Sac', T.array(T.string), ['Clé', 'Pile']);
    const save = b.variable('Sauvegarde', T.array(T.string), []);
    const ev = b.node('event.beginPlay', {}, {}, [64, 96]);
    const set = b.node('var.set', { variable: save }, {}, [340, 96]);
    const add = b.node('array.add', {}, { item: 'Lampe' }, [640, 96]);
    const p1 = b.node('debug.printString', {}, {}, [940, 96]);
    const p2 = b.node('debug.printString', {}, {}, [1240, 96]);
    const len1 = b.node('array.length', {}, {}, [760, 340]);
    const len2 = b.node('array.length', {}, {}, [1060, 340]);
    b.link(ev, 'then', set, 'exec').link(set, 'then', add, 'exec').link(add, 'then', p1, 'exec').link(p1, 'then', p2, 'exec');
    b.link(b.node('var.get', { variable: sac }, {}, [120, 260]), 'value', set, 'value');
    b.link(b.node('var.get', { variable: sac }, {}, [420, 300]), 'value', add, 'array');
    b.link(b.node('var.get', { variable: save }, {}, [540, 400]), 'value', len1, 'array');
    b.link(b.node('var.get', { variable: sac }, {}, [860, 440]), 'value', len2, 'array');
    b.link(len1, 'result', p1, 'text').link(len2, 'result', p2, 'text');
    pb.playerStart(-400, 0);
    return pb.project;
  },
  scenario: [{ wait: 0.2 }],
  predict: {
    question: 'Que voit-on dans l’Output Log (Sauvegarde, puis Sac) ?',
    options: ['3, puis 3', '2, puis 3', '2, puis 2', '0, puis 3'],
    answer: 1,
    explanation:
      'Set copie le contenu de Sac dans Sauvegarde : à ce moment-là, deux éléments. Ensuite Add modifie Sac seulement, qui passe à trois. Sauvegarde reste à deux : les deux variables ne partagent rien. C’est la même règle pour une structure.',
    verify: (p) => p.join(',') === '2,3',
  },
});
