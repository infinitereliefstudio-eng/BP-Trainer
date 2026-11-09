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
import { generatorBlueprint, lampBlueprint } from './props';

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
  number: 4,
  title: 'Sequence et Delay',
  situation: 'Un Sequence lance deux chaînes. La première contient un Delay. Dans quel ordre les messages s’affichent-ils ?',
  notions: ['Sequence', 'Delay (latent)'],
  remember: 'Sequence lance ses sorties l’une après l’autre sans attendre : un Delay ne bloque que la chaîne où il se trouve.',
  cards: [
    {
      title: 'À lire',
      body:
        'Ouvre l’Event Graph de **BP_Ordre**. **Sequence** exécute **Then 0**, puis **Then 1**, dans la même frame.\\n\\n' +
        'Question : que fait l’exécution quand elle rencontre le **Delay** sur Then 0 ?',
    },
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
  number: 8,
  title: 'For Loop et Delay',
  situation: 'Une boucle de 0 à 2 avec un Delay dans son corps. Que s’affiche-t-il ?',
  notions: ['For Loop', 'Delay', 'Sortie Index'],
  remember: 'Une boucle tourne d’un coup, dans la même image : elle n’attend pas un Delay placé dans son corps.',
  cards: [
    {
      title: 'À lire',
      body:
        'Ouvre **BP_Boucle**. **For Loop** exécute **Loop Body** pour chaque index de First à Last, puis **Completed**.\\n\\n' +
        'Toute la boucle s’exécute d’un coup, dans la même frame. Et un Delay déjà en cours ignore les nouveaux appels…',
    },
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
  number: 10,
  title: 'Un nœud pur lu deux fois',
  situation: 'Un seul Random Integer in Range est relié à deux Print String. Les deux nombres affichés seront-ils les mêmes ?',
  notions: ['Nœud pur', 'Random Integer in Range'],
  remember: 'Un nœud pur est recalculé à chaque lecture : pour réutiliser la même valeur, stocke-la dans une variable.',
  cards: [
    {
      title: 'À lire',
      body:
        'Ouvre **BP_De**. Le nœud vert **Random Integer in Range** n’a pas de pin d’exécution : c’est un nœud **pur**.\\n\\n' +
        'Question : quand un nœud pur calcule-t-il sa valeur ?',
    },
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
  number: 9,
  title: 'Accessed None',
  situation: 'Les deux lampes devraient suivre le générateur. L’une d’elles reste éteinte et l’Output Log se remplit d’erreurs.',
  notions: ['Accessed None', 'Output Log', 'Details d’une instance'],
  remember: 'Accessed None nomme le nœud et la pin vides : remonte jusqu’à la référence, puis vérifie le niveau (Instance Editable) ou le Set qui devait la remplir.',
  cards: [
    {
      title: 'Enquêter',
      body:
        'Lance ▶ Play, appuie sur E, puis ouvre l’**Output Log** : l’erreur indique le **nœud**, le **graphe** et le **Blueprint** fautifs.\\n\\n' +
        '« Accessed None » veut dire qu’une référence est vide. Laquelle des deux lampes n’a pas de générateur ?',
    },
  ],
  objectives: ['Les deux lampes s’allument quand le générateur démarre.', 'Plus aucune erreur dans l’Output Log.'],
  hints: [
    'Le graphe de BP_Lampe est correct : le problème est dans le niveau.',
    'Touche chaque lampe dans l’onglet Niveau et regarde sa variable Generateur dans Details.',
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
    pb.project.level.actors.find((a) => a.id === l1)!.overrides[ref] = `actor:${genId}`;
    pb.project.level.actors.find((a) => a.id === l2)!.overrides[ref] = null;
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
  number: 11,
  title: 'Le message qui se perd',
  situation: 'E ouvre la porte et allume la lampe, mais le générateur ne réagit pas. Et l’Output Log ne signale aucune erreur.',
  notions: ['Implemented Interfaces', 'Event d’interface ≠ Custom Event'],
  remember: 'Un message d’interface vers un Blueprint qui n’a pas l’interface dans Class Settings est ignoré sans erreur : c’est la première chose à vérifier.',
  cards: [
    {
      title: 'Une panne silencieuse',
      body:
        'Un **Interface Message** envoyé à un acteur qui n’implémente pas l’interface ne fait rien, **sans erreur**. C’est pratique… et c’est aussi un piège.\\n\\n' +
        'Compare BP_Lampe, qui fonctionne, avec BP_Generateur : leurs **Class Settings**, et le nœud rouge de départ.',
    },
  ],
  objectives: ['Le générateur démarre quand on appuie sur E à côté de lui.', 'La lampe et la porte fonctionnent toujours.'],
  hints: [
    'Un Custom Event qui s’appelle « Interagir » n’est pas l’événement de l’interface : il ne reçoit pas le message.',
    'Dans BP_Generateur : Class Settings › + Implemented Interface › BPI_Interactif. Puis My Blueprint › Interfaces › Event.',
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
