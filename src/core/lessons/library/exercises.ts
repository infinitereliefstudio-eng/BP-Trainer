/**
 * Short exercises between lessons. "Prédis" : read a Blueprint and choose
 * what it prints before running it. "Débogue" : repair a broken Blueprint.
 */
import { removeNodes } from '../../operations/graphOps';
import { implementInterface } from '../../operations/classOps';
import { addInterface, addInterfaceFunction } from '../../operations/projectOps';
import { T } from '../../types/pins';
import { edit, ProjectBuilder } from '../builder';
import { noRuntimeErrors, visible } from '../checks';
import type { Lesson } from '../types';
import { interactionWorld, lampFollowsGenerator, playerInteracts, setReference } from './module3';
import { DEBUG_METHOD, PREDICT_METHOD } from './kit';
import { generatorBlueprint, lampBlueprint } from './props';
import { levelOf } from '../../model/project';

const PREDICT_OBJECTIVES = [
  'Lis le graphe sans lancer Play : suis le fil blanc depuis l’événement.',
  'Choisis ta réponse dans l’onglet Prédis.',
  'Puis lance ▶ Play et regarde l’Output Log pour vérifier.',
];

/** A predict exercise: nothing to build, no checks. */
function predictLesson(l: Omit<Lesson, 'kind' | 'objectives' | 'checks' | 'solve'>): Lesson {
  return { ...l, kind: 'predict', objectives: PREDICT_OBJECTIVES, checks: [], solve: () => {} };
}

const print = (text: string) => ['debug.printString', {}, { text }] as const;

// ----------------------------------------------------------------------- P1

export const predict1: Lesson = predictLesson({
  id: 'p1-sequence-delay',
  code: 'P1',
  module: 'Premiers pas',
  level: 'intermediaire',
  number: 4,
  title: 'Sequence et Delay',
  situation: 'Un Sequence lance deux chaînes. La première contient un Delay. Dans quel ordre les messages s’affichent-ils ?',
  notions: ['Sequence', 'Delay (latent)'],
  remember: 'Sequence lance ses sorties l’une après l’autre sans attendre : un Delay ne bloque que la chaîne où il se trouve.',
  cards: [
    {
      title: 'À lire',
      body:
        'Ouvre l’Event Graph de **BP_Ordre**. Au lancement, **Event BeginPlay** entre dans un **Sequence**, qui a deux sorties :\n\n' +
        '- **Then 0** : Print String « A » → **Delay** (1 seconde) → Print String « B » ;\n- **Then 1** : Print String « C ».',
    },
    {
      title: 'Sequence',
      body:
        '**Sequence** exécute ses sorties **l’une après l’autre**, dans l’ordre des numéros : tout ce qui part de Then 0, puis tout ce qui part de Then 1. C’est un moyen de ranger un long fil blanc en plusieurs morceaux lisibles, sans changer ce qu’il fait.\n\n' +
        'Question clé : quand Sequence considère-t-il que Then 0 est « fini » pour passer à Then 1 ?',
    },
    {
      title: 'Delay, un nœud latent',
      body:
        '**Delay** porte une petite horloge : c’est un nœud **latent**. Il ne fige pas le jeu pendant sa durée. Il met **la suite de sa chaîne** de côté, et le moteur la reprendra quand le temps sera écoulé.\n\n' +
        'Pendant ce temps, l’exécution qui l’a atteint ne reste pas bloquée dessus. Que fait-elle alors ?',
    },
    PREDICT_METHOD,
  ],
  hints: [
    'Un nœud latent (avec une horloge) ne bloque pas le jeu : il met sa suite de côté.',
    'Pendant que le Delay attend, Sequence passe à Then 1.',
    'Réponse : A, C, puis B une seconde plus tard.',
  ],
  setup() {
    const pb = new ProjectBuilder('Prédis P1');
    const b = pb.blueprint('BP_Ordre');
    pb.place(b, 0, 0);
    const ev = b.node('event.beginPlay', {}, {}, [64, 160]);
    const seq = b.node('flow.sequence', {}, {}, [340, 160]);
    const a = b.node(...print('A'), [620, 40]);
    const wait = b.node('time.delay', {}, { duration: 1 }, [940, 40]);
    const bb = b.node(...print('B'), [1220, 40]);
    const c = b.node(...print('C'), [620, 300]);
    b.link(ev, 'then', seq, 'exec').link(seq, 'then0', a, 'exec').link(a, 'then', wait, 'exec').link(wait, 'completed', bb, 'exec');
    b.link(seq, 'then1', c, 'exec');
    pb.playerStart(-400, 0);
    return pb.project;
  },
  scenario: [{ wait: 1.5 }],
  predict: {
    question: 'Dans quel ordre les messages s’affichent-ils ?',
    options: ['A, B, C', 'A, C, puis B une seconde plus tard', 'C, A, B', 'A, C, et B jamais'],
    answer: 1,
    explanation:
      'Then 0 affiche A, puis atteint le Delay : la suite (B) est mise de côté pour 1 s. Sequence passe aussitôt à Then 1 et affiche C. Une seconde plus tard, le Delay se termine et B s’affiche.',
    verify: (p) => p.join(',') === 'A,C,B',
  },
});

// ----------------------------------------------------------------------- P2

export const predict2: Lesson = predictLesson({
  id: 'p2-forloop-delay',
  code: 'P2',
  module: 'Portes et objets',
  level: 'intermediaire',
  number: 8,
  title: 'For Loop et Delay',
  situation: 'Une boucle de 0 à 2 avec un Delay dans son corps. Que s’affiche-t-il ?',
  notions: ['For Loop', 'Delay', 'Sortie Index'],
  remember: 'Une boucle tourne d’un coup, dans la même image : elle n’attend pas un Delay placé dans son corps.',
  cards: [
    {
      title: 'À lire',
      body:
        'Ouvre **BP_Boucle**. Au lancement, un **For Loop** va de **First = 0** à **Last = 2**.\n\n' +
        '- **Loop Body** → **Delay** (1 seconde) → Print String qui affiche **Index**.\n- **Completed** → Print String « Fini ».',
    },
    {
      title: 'For Loop',
      body:
        '**For Loop** exécute **Loop Body** une fois pour chaque valeur de First à Last **comprises** (ici 0, 1, 2), puis sort par **Completed**. La sortie **Index** donne le numéro du tour en cours.\n\n' +
        'Une boucle tourne **d’un coup** : tous ses tours, puis Completed, se font dans la même image, sans attendre ce qui se passe dans le corps.',
    },
    {
      title: 'Ce que l’on sait déjà du Delay',
      body:
        '- Il met la suite de sa chaîne de côté pour plus tard, sans bloquer.\n- **Un Delay déjà en cours ignore les nouveaux appels** : il ne repart pas, il ne s’empile pas.\n- Le Print String placé après lui lit Index **au moment où il s’exécute**, pas au moment où le Delay a démarré.\n\n' +
        'Trois questions : combien de fois le Delay démarre-t-il vraiment ? Quand « Fini » s’affiche-t-il ? Et que vaut Index quand le Delay se termine ?',
    },
    PREDICT_METHOD,
  ],
  hints: [
    'Combien de fois le Delay démarre-t-il vraiment ?',
    'Le Print branché après le Delay lit l’Index au moment où il s’exécute, une seconde plus tard.',
    'Réponse : Fini tout de suite, puis 2 une seconde plus tard.',
  ],
  setup() {
    const pb = new ProjectBuilder('Prédis P2');
    const b = pb.blueprint('BP_Boucle');
    pb.place(b, 0, 0);
    const ev = b.node('event.beginPlay', {}, {}, [64, 120]);
    const loop = b.node('flow.forLoop', {}, { first: 0, last: 2 }, [340, 120]);
    const wait = b.node('time.delay', {}, { duration: 1 }, [680, 40]);
    const say = b.node('debug.printString', {}, {}, [1000, 40]);
    const done = b.node(...print('Fini'), [680, 320]);
    b.link(ev, 'then', loop, 'exec').link(loop, 'body', wait, 'exec').link(wait, 'completed', say, 'exec');
    b.link(loop, 'index', say, 'text').link(loop, 'completed', done, 'exec');
    pb.playerStart(-400, 0);
    return pb.project;
  },
  scenario: [{ wait: 1.5 }],
  predict: {
    question: 'Que voit-on dans l’Output Log ?',
    options: ['0, 1, 2, Fini', 'Fini, puis 0, 1, 2 une seconde plus tard', 'Fini, puis 2 une seconde plus tard', '0, puis Fini'],
    answer: 2,
    explanation:
      'Les trois tours de boucle se font dans la même frame. Le 1er démarre le Delay, les 2 suivants sont ignorés car il est déjà en cours. Completed affiche aussitôt « Fini ». Une seconde plus tard, le Delay se termine une seule fois, et le Print lit Index, qui vaut alors 2, sa dernière valeur.',
    verify: (p) => p.join(',') === 'Fini,2',
  },
});

// ----------------------------------------------------------------------- P3

export const predict3: Lesson = predictLesson({
  id: 'p3-random-pur',
  code: 'P3',
  module: 'Faire communiquer les Blueprints',
  level: 'intermediaire',
  number: 10,
  title: 'Un nœud pur lu deux fois',
  situation: 'Un seul Random Integer in Range est relié à deux Print String. Les deux nombres affichés seront-ils les mêmes ?',
  notions: ['Nœud pur', 'Random Integer in Range'],
  remember: 'Un nœud pur est recalculé à chaque lecture : pour réutiliser la même valeur, stocke-la dans une variable.',
  cards: [
    {
      title: 'À lire',
      body:
        'Ouvre **BP_De**. Au lancement, deux **Print String** s’exécutent l’un après l’autre. Les deux lisent la sortie du **même** nœud **Random Integer in Range** (Min 1, Max 1000), relié par deux fils.',
    },
    {
      title: 'Nœud pur, nœud impur',
      body:
        'Un nœud **impur** a des pins blanches : il s’exécute quand le fil blanc passe, une fois, et son résultat reste disponible pour la suite.\n\n' +
        'Un nœud **pur** (vert, sans pin blanche) n’a pas de moment à lui. Il calcule sa valeur **quand un autre nœud la lui demande**. Il ne garde rien en mémoire entre deux demandes.\n\n' +
        'Ici, deux Print String demandent la valeur. Combien de fois le nœud calcule-t-il ? Et pour un tirage au hasard, qu’est-ce que ça change ?',
    },
    {
      title: 'Pourquoi ça compte',
      body:
        'Le jour où l’on tire un nombre pour **choisir** et qu’on le relit pour **afficher**, le joueur risque de voir un autre nombre que celui qui a servi. La leçon « Les cartes tirées sans remise » en fait un vrai bug.',
    },
    PREDICT_METHOD,
  ],
  hints: [
    'Un nœud pur ne garde pas de résultat en mémoire.',
    'Il est recalculé chaque fois qu’un nœud lit sa sortie. Ici, il est lu deux fois.',
    'Réponse : en général deux nombres différents.',
  ],
  setup() {
    const pb = new ProjectBuilder('Prédis P3');
    const b = pb.blueprint('BP_De');
    pb.place(b, 0, 0);
    const ev = b.node('event.beginPlay', {}, {}, [64, 96]);
    const rnd = b.node('math.randomIntInRange', {}, { min: 1, max: 1000 }, [300, 340]);
    const p1 = b.node('debug.printString', {}, {}, [380, 96]);
    const p2 = b.node('debug.printString', {}, {}, [700, 96]);
    b.link(ev, 'then', p1, 'exec').link(p1, 'then', p2, 'exec').link(rnd, 'result', p1, 'text').link(rnd, 'result', p2, 'text');
    pb.playerStart(-400, 0);
    return pb.project;
  },
  scenario: [{ wait: 0.2 }],
  predict: {
    question: 'Les deux messages affichent…',
    options: ['toujours le même nombre', 'en général deux nombres différents', 'un nombre, puis 0'],
    answer: 1,
    explanation:
      'Un nœud pur est recalculé à chaque lecture : chaque Print String demande sa valeur, donc le dé est lancé deux fois. Pour réutiliser le même tirage, stocke-le d’abord dans une variable avec Set, puis lis la variable.',
    verify: (p) => p.length === 2 && p[0] !== p[1],
  },
});

// ----------------------------------------------------------------------- D1

export const debug1: Lesson = {
  id: 'd1-accessed-none',
  kind: 'debug',
  code: 'D1',
  module: 'Faire communiquer les Blueprints',
  level: 'confirme',
  number: 9,
  title: 'Accessed None',
  situation: 'Les deux lampes devraient suivre le générateur. L’une d’elles reste éteinte et l’Output Log se remplit d’erreurs.',
  notions: ['Accessed None', 'Output Log', 'Details d’une instance'],
  remember: 'Accessed None nomme le nœud et la pin vides : remonte jusqu’à la référence, puis vérifie le niveau (Instance Editable) ou le Set qui devait la remplir.',
  cards: [
    DEBUG_METHOD,
    {
      title: 'Ce qui est en place',
      body:
        'Un **BP_Generateur** (E le démarre ou l’arrête, il affiche son état) et deux lampes, **BP_Lampe** et **BP_Lampe2**, instances du même Blueprint BP_Lampe.\n\n' +
        'BP_Lampe a une variable **Generateur** (référence vers BP_Generateur, **Instance Editable**). Son graphe :\n\n' +
        '- **Event Tick** → **Set Visibility** (Lumiere) ;\n- New Visibility = **Generateur › bEnMarche**, lu à travers la référence.\n\n' +
        'Le graphe est le même pour les deux lampes : c’est le **réglage de chaque instance** qui diffère.',
    },
    {
      title: 'Lire Accessed None',
      body:
        'Lance Play, appuie sur E, ouvre l’**Output Log**. L’erreur **Accessed None trying to read property…** dit :\n\n' +
        '- quelle **variable** était vide ;\n- quel **nœud**, dans quel **graphe** et quel **Blueprint**.\n\n' +
        '« None » veut dire « aucun acteur » : la référence ne désigne rien. Le nœud qui lit bEnMarche à travers elle n’a personne à qui demander.\n\n' +
        'Touche **Pourquoi ?** sous l’erreur : l’appli remonte le fil jusqu’à la source de la référence vide.',
    },
    {
      title: 'Où se règle une référence',
      body:
        'Une variable Instance Editable a une valeur **par instance**, réglée dans le **niveau** : onglet Niveau, touche une lampe, et regarde sa variable Generateur dans Details.\n\n' +
        'Le graphe dit « lis le générateur de cette lampe ». Le niveau dit **lequel**. Quand une instance sur deux plante avec le même graphe, c’est ce réglage qu’il faut regarder en premier.',
    },
  ],
  objectives: ['Les deux lampes s’allument quand le générateur démarre.', 'Plus aucune erreur dans l’Output Log.'],
  hints: [
    'Le graphe de BP_Lampe est correct : le problème est dans le niveau.',
    'Dans le Niveau, ouvre Outliner · Details (bord droit) et touche chaque lampe dans l’Outliner : regarde sa variable Generateur dans Details.',
    'Solution : sur BP_Lampe2, règle Generateur sur BP_Generateur.',
  ],
  setup() {
    const pb = new ProjectBuilder('Débogue D1');
    const { b: gen } = generatorBlueprint(pb);
    const lamp = lampBlueprint(pb);
    const genId = pb.place(gen, 0, -260);
    const l1 = pb.place(lamp, -300, 80);
    const l2 = pb.place(lamp, 300, 80);
    pb.playerStart(-600, 300);
    const ref = lamp.variable('Generateur', T.object('BP_Generateur'));
    lamp.cls.variables.find((v) => v.id === ref)!.instanceEditable = true;
    levelOf(pb.project).actors.find((a) => a.id === l1)!.overrides[ref] = `actor:${genId}`;
    levelOf(pb.project).actors.find((a) => a.id === l2)!.overrides[ref] = null;
    lampFollowsGenerator(lamp, gen, ref, false);
    return pb.project;
  },
  scenario: [{ wait: 0.3 }, { press: 'E' }, { release: 'E' }, { wait: 0.1 }],
  checks: [
    visible('l1', 'BP_Lampe', 'Lumiere', true, 'La première lampe s’allume'),
    visible('l2', 'BP_Lampe2', 'Lumiere', true, 'La seconde lampe s’allume aussi'),
    noRuntimeErrors(),
  ],
  solve(p) {
    const ref = edit(p, 'BP_Lampe').cls.variables.find((v) => v.name === 'Generateur')!.id;
    setReference(p, 'BP_Lampe2', ref, 'BP_Generateur');
  },
};

// ----------------------------------------------------------------------- D2

export const debug2: Lesson = {
  id: 'd2-interface-oubliee',
  kind: 'debug',
  code: 'D2',
  module: 'Faire communiquer les Blueprints',
  level: 'confirme',
  number: 11,
  title: 'Le message qui se perd',
  situation: 'E ouvre la porte et allume la lampe, mais le générateur ne réagit pas. Et l’Output Log ne signale aucune erreur.',
  notions: ['Implemented Interfaces', 'Event d’interface ≠ Custom Event'],
  remember: 'Un message d’interface vers un Blueprint qui n’a pas l’interface dans Class Settings est ignoré sans erreur : c’est la première chose à vérifier.',
  cards: [
    DEBUG_METHOD,
    {
      title: 'Ce qui est en place',
      body:
        'Une interface **BPI_Interactif** avec une fonction **Interagir**. Sur IA_Interagir (la touche E), **BP_Joueur** envoie le message **Interagir** à tous les acteurs qu’il touche.\n\n' +
        '- **BP_Lampe** et **BP_Porte** fonctionnent : E à côté d’elles les fait réagir.\n- **BP_Generateur** a un graphe qui semble faire la même chose : un nœud rouge nommé **Interagir** → inverse bEnMarche → affiche l’état. Pourtant, rien ne se passe.\n\n' +
        'Et l’Output Log ne signale rien.',
    },
    {
      title: 'Une panne silencieuse',
      body:
        'Un **message d’interface** envoyé à un acteur qui n’implémente pas l’interface **ne fait rien, sans erreur**. C’est voulu : c’est ce qui permet au joueur d’envoyer Interagir à tout ce qu’il touche sans se soucier de qui sait répondre.\n\n' +
        'Le revers : quand un Blueprint « devrait » répondre et ne répond pas, aucune erreur ne pointe le problème.',
    },
    {
      title: 'Où comparer',
      body:
        'Compare BP_Lampe, qui marche, avec BP_Generateur, sur deux points :\n\n' +
        '1. **Class Settings** (dans Details) › **Implemented Interfaces** : l’interface est-elle listée ?\n2. Le nœud rouge de départ : touche-le et lis son titre dans Details. Un **Event Interagir** d’interface et un **Custom Event** nommé Interagir se ressemblent, mais seul le premier reçoit le message.\n\n' +
        'Un nom identique ne crée aucun lien : c’est l’interface qui relie l’envoi et la réception.',
    },
  ],
  objectives: ['Le générateur démarre quand on appuie sur E à côté de lui.', 'La lampe et la porte fonctionnent toujours.'],
  hints: [
    'Un Custom Event qui s’appelle « Interagir » n’est pas l’événement de l’interface : il ne reçoit pas le message.',
    'Dans BP_Generateur : Class Settings › Interfaces › Add › BPI_Interactif. Puis My Blueprint › Interfaces › Event.',
    'Solution : implémente BPI_Interactif dans BP_Generateur, pose Event Interagir et relie-le au Set bEnMarche à la place du Custom Event.',
  ],
  setup() {
    const { pb } = interactionWorld('Débogue D2');
    const p = pb.project;
    const r = addInterface(p, 'BPI_Interactif');
    if (!r.ok) throw new Error(r.reason);
    addInterfaceFunction(p, r.value.id, 'Interagir');
    const iface = r.value.id;
    const fn = r.value.functions[0].id;
    playerInteracts(edit(p, 'BP_Joueur'), iface, fn);

    const lamp = edit(p, 'BP_Lampe');
    implementInterface(lamp.cls, iface);
    const le = lamp.node('event.interface', { interface: iface, fn }, {}, [64, 96]);
    const tog = lamp.node('component.toggleVisibility', {}, {}, [400, 96]);
    lamp.link(le, 'then', tog, 'exec').target('Lumiere', tog);

    const door = edit(p, 'BP_Porte');
    implementInterface(door.cls, iface);
    const de = door.node('event.interface', { interface: iface, fn }, {}, [64, 96]);
    const rot = door.node('component.setRelativeRotation', {}, { rotation: { x: 0, y: 0, z: 90 } }, [400, 96]);
    door.link(de, 'then', rot, 'exec').target('Porte', rot);

    // The bug: a Custom Event named like the interface function, no interface.
    const gen = edit(p, 'BP_Generateur');
    const running = gen.cls.variables.find((v) => v.name === 'bEnMarche')!.id;
    const ce = gen.node('event.custom', { name: 'Interagir' }, {}, [64, 96]);
    const get = gen.node('var.get', { variable: running }, {}, [160, 300]);
    const not = gen.node('logic.not', {}, {}, [320, 300]);
    const set = gen.node('var.set', { variable: running }, {}, [440, 96]);
    const say = gen.node('debug.printString', {}, {}, [760, 96]);
    gen.link(ce, 'then', set, 'exec').link(get, 'value', not, 'a').link(not, 'result', set, 'value');
    gen.link(set, 'then', say, 'exec').link(set, 'out', say, 'text');
    return p;
  },
  scenario: [
    { wait: 0.2 },
    { teleport: [-500, -180] },
    { wait: 0.1 },
    { press: 'E' },
    { release: 'E' },
    { checkpoint: 'generateur' },
    { teleport: [-500, 180] },
    { wait: 0.1 },
    { press: 'E' },
    { release: 'E' },
  ],
  checks: [
    {
      id: 'gen',
      label: 'E près du générateur : il démarre',
      at: 'generateur',
      test: (cx) => (cx.variable('BP_Generateur', 'bEnMarche') === true ? true : 'Le générateur n’a pas reçu le message : bEnMarche vaut toujours false.'),
    },
    visible('lamp', 'BP_Lampe', 'Lumiere', true, 'La lampe fonctionne toujours'),
    noRuntimeErrors(),
  ],
  solve(p) {
    const gen = edit(p, 'BP_Generateur');
    const iface = p.interfaces[0];
    implementInterface(gen.cls, iface.id);
    const ce = Object.values(gen.graph.nodes).find((n) => n.def === 'event.custom')!;
    const set = Object.values(gen.graph.nodes).find((n) => n.def === 'var.set')!.id;
    removeNodes(gen.graph, [ce.id]);
    const ev = gen.node('event.interface', { interface: iface.id, fn: iface.functions[0].id }, {}, [64, 96]);
    gen.link(ev, 'then', set, 'exec');
  },
};
