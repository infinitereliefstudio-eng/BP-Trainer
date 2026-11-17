/**
 * More "Prédis" exercises (V4): read a Blueprint and choose what it prints.
 * P6 integer division, P7 Gate, P8 a Set that copies an array.
 */
import { T } from '../../types/pins';
import { ProjectBuilder } from '../builder';
import type { Lesson } from '../types';
import { PREDICT_METHOD } from './kit';

const OBJECTIVES = [
  'Lis le graphe sans lancer Play : suis le fil blanc depuis l’événement.',
  'Choisis ta réponse dans l’onglet Prédis.',
  'Puis lance ▶ Play et regarde l’Output Log pour vérifier.',
];

export const predictLesson = (l: Omit<Lesson, 'kind' | 'objectives' | 'checks' | 'solve' | 'number'>): Lesson => ({
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
        'Ouvre **BP_Calcul**. Au lancement (**Event BeginPlay**), deux **Print String** s’exécutent l’un après l’autre. Chacun affiche le résultat d’une division de **7 par 2**.\n\n' +
        'Les deux nœuds **÷** se ressemblent, mais regarde leurs pins :\n\n' +
        '- le premier a des pins vert d’eau (vert tirant sur le bleu) : il travaille sur des **Integer**, des nombres entiers ;\n- le second a des pins vert-jaune : il travaille sur des **Float**, des nombres à virgule.',
    },
    {
      title: 'Le type décide',
      body:
        'Dans un Blueprint, chaque pin a un **type**, et le résultat d’un nœud a le type de sa pin de sortie. Ce n’est pas le nombre écrit dans la case qui décide, c’est le nœud.\n\n' +
        'Question à te poser : quels nombres une variable ou une pin **Integer** peut-elle contenir ? Et si le vrai résultat ne rentre pas dedans, que devient la partie qui dépasse : arrondie, ou perdue ?',
    },
    {
      title: 'Pourquoi ça compte',
      body:
        'Ce piège revient dans les vrais projets : un pourcentage calculé avec `Score / Total` en Integer donne 0 tant que Score est plus petit que Total, et la barre de progression reste vide. Savoir lire la couleur d’une pin évite des heures de recherche.',
    },
    PREDICT_METHOD,
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
        'Ouvre **BP_Sas**. Au lancement, **Event BeginPlay** entre dans un **Sequence** à trois sorties, toutes reliées au **même Gate** :\n\n' +
        '- **Then 0** → entrée **Enter** ;\n- **Then 1** → entrée **Open** ;\n- **Then 2** → entrée **Enter**, de nouveau.\n\n' +
        'La sortie **Exit** du Gate mène à un Print String « Passe ». **Start Closed** est coché.',
    },
    {
      title: 'Le Gate',
      body:
        'Un **Gate** est une porte posée sur le fil blanc, avec une mémoire : ouverte ou fermée.\n\n' +
        '- **Enter** : le fil qui veut passer. Il ressort par **Exit** si la porte est ouverte ; sinon il s’arrête là, sans erreur.\n- **Open**, **Close**, **Toggle** : changent l’état de la porte. Ils ne font rien sortir par Exit.\n- **Start Closed** : l’état de départ. Coché, la porte commence fermée.\n\n' +
        'Sequence exécute Then 0, puis Then 1, puis Then 2, dans l’ordre.',
    },
    {
      title: 'Les questions à se poser',
      body:
        'Pour chacune des trois sorties du Sequence, dans l’ordre : par quelle entrée le fil arrive-t-il ? Dans quel état est la porte à ce moment-là ? Est-ce que quelque chose sort par Exit ?',
    },
    {
      title: 'À quoi ça sert',
      body:
        'Un Gate laisse passer un flux **répété** (un Tick, une touche maintenue) seulement pendant une période : on l’ouvre en entrant dans une zone, on le ferme en sortant. DoOnce, lui, ne laisse passer qu’**une** fois.',
    },
    PREDICT_METHOD,
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
        'Ouvre **BP_Coffre**. Deux variables de type **tableau de String** :\n\n' +
        '- **Sac**, qui contient au départ « Clé » et « Pile » ;\n- **Sauvegarde**, vide.\n\n' +
        'Au lancement, le fil blanc fait :\n\n' +
        '1. **Set Sauvegarde** = Get Sac ;\n2. **Add** « Lampe » au tableau Sac ;\n3. Print String de **Length** (Sauvegarde) ;\n4. Print String de **Length** (Sac).',
    },
    {
      title: 'Ce que font ces nœuds',
      body:
        '- **Set** range une valeur dans une variable, au moment où le fil blanc passe.\n- **Add** (pin en losange) ajoute un élément au bout du tableau relié, et le modifie **sur place**.\n- **Length** donne le nombre d’éléments d’un tableau, au moment où on le lit.',
    },
    {
      title: 'La question',
      body:
        'Après le Set, Sauvegarde et Sac sont-ils **le même tableau** vu par deux noms, ou **deux tableaux** qui ont le même contenu à cet instant ? Selon la réponse, l’Add sur Sac touche, ou non, Sauvegarde.\n\n' +
        'Indice de lecture : en Blueprint, une variable de tableau contient-elle le tableau lui-même, ou un lien vers un tableau rangé ailleurs ? Compare avec une variable de **référence** (bleue), qui, elle, désigne un acteur sans le contenir.',
    },
    PREDICT_METHOD,
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
