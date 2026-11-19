/**
 * V7, Save Game: « La tirelire » (Confirmé: create, fill, save; load at
 * BeginPlay), « Débogue D17 — La première partie plante » (Load with no slot
 * yet gives None), « Prédis P11 — Load, Cast, lecture » (the slot holds
 * another SaveGame class), « Débogue D18 — Le record à zéro » (Save Game to
 * Slot before the Set) and « Le checkpoint » (Avancé: a position saved on
 * overlap, the player put back there at the next game). Each scenario stops
 * and plays again ({ restart: true }), keeping the slots.
 */
import type { Project, SavedGame } from '../../model/project';
import { T } from '../../types/pins';
import { edit, ProjectBuilder, type ClassBuilder } from '../builder';
import { countPrints, noRuntimeErrors, notion, printedNumbers, usesNode } from '../checks';
import type { CheckContext, Lesson, ScenarioStep } from '../types';
import { DEBUG_METHOD, getVar, nodeOf, PREDICT_METHOD, say, setVar, tap, varId, wipe } from './kit';

const cls = (p: Project, name: string) => p.classes.find((c) => c.name === name)!;
const vid = (p: Project, className: string, v: string) => cls(p, className).variables.find((x) => x.name === v)!.id;

/** Get / Set of a variable of another Blueprint (here, a SaveGame object). */
const getOf = (b: ClassBuilder, p: Project, owner: string, v: string, at: [number, number]) =>
  b.node('var.getExternal', { owner: cls(p, owner).id, variable: vid(p, owner, v) }, {}, at);
const setOf = (b: ClassBuilder, p: Project, owner: string, v: string, at: [number, number]) =>
  b.node('var.setExternal', { owner: cls(p, owner).id, variable: vid(p, owner, v) }, {}, at);

/** The slot of a check run, whatever user index. */
const slotOf = (cx: CheckContext, name: string): SavedGame | undefined => cx.sim.slots[`${name}|0`];

const RESTART: ScenarioStep[] = [{ checkpoint: 'avant' }, { restart: true }, { wait: 0.3 }];

// ------------------------------------------------------------- La tirelire

function piggyProject() {
  const pb = new ProjectBuilder('La tirelire');
  const save = pb.blueprint('BP_Sauvegarde', 'SaveGame');
  save.variable('Pieces', T.int, 0);
  const b = pb.blueprint('BP_Tirelire');
  b.component('StaticMesh', 'Cochon', { shape: 'cylinder', sizeX: 70, sizeY: 60, color: '#f472b6' });
  b.cls.autoReceiveInput = true;
  b.variable('Pieces', T.int, 0);
  // What already works: E counts a coin and prints the total. It forgets everything at Stop.
  const key = b.node('event.inputKey', { key: 'E' }, {}, [64, 96]);
  const inc = b.node('var.incrementInt', {}, {}, [360, 96]);
  const show = say(b, [660, 96]);
  b.link(key, 'pressed', inc, 'exec').link(getVar(b, 'Pieces', [200, 300]), 'value', inc, 'value').link(inc, 'then', show, 'exec').link(inc, 'result', show, 'text');
  pb.place(b, 0, 0);
  pb.playerStart(-300, 0);
  return pb.project;
}

/** BeginPlay → Load → Cast → Set Pieces ; after the Print of E → Create → Set Pieces on it → Save. */
export function solvePiggy(p: Project): void {
  const b = edit(p, 'BP_Tirelire');
  const save = cls(p, 'BP_Sauvegarde');
  const begin = b.node('event.beginPlay', {}, {}, [64, 500]);
  const load = b.node('save.fromSlot', {}, { slot: 'Tirelire' }, [320, 500]);
  const cast = b.node('cast.to', { class: save.id }, {}, [620, 500]);
  const keep = setVar(b, 'Pieces', [940, 500]);
  const saved = getOf(b, p, 'BP_Sauvegarde', 'Pieces', [800, 700]);
  b.link(begin, 'then', load, 'exec').link(load, 'then', cast, 'exec').link(load, 'result', cast, 'object');
  b.link(cast, 'then', keep, 'exec').link(cast, 'as', saved, 'target').link(saved, 'value', keep, 'value');
  const show = nodeOf(b.graph, 'debug.printString');
  const create = b.node('save.create', {}, { saveClass: save.id }, [960, 96]);
  const fill = setOf(b, p, 'BP_Sauvegarde', 'Pieces', [1260, 96]);
  const write = b.node('save.toSlot', {}, { slot: 'Tirelire' }, [1560, 96]);
  b.link(show, 'then', create, 'exec').link(create, 'then', fill, 'exec').link(create, 'result', fill, 'target');
  b.link(getVar(b, 'Pieces', [1100, 300]), 'value', fill, 'value').link(fill, 'then', write, 'exec').link(create, 'result', write, 'object');
}

export const lessonPiggyBank: Lesson = {
  id: 'l-tirelire',
  module: 'Sauvegarde',
  level: 'confirme',
  number: 0,
  title: 'La tirelire',
  situation:
    'Chaque appui sur E met une pièce dans la tirelire et affiche le total. Mais à chaque nouvelle partie, elle repart de zéro. Elle doit retrouver ses pièces : trois pièces, Stop, Play, une pièce de plus, et elle affiche 4.',
  notions: ['SaveGame', 'Create Save Game Object', 'Save Game to Slot', 'Load Game from Slot', 'Slot de sauvegarde'],
  remember:
    'Une variable meurt avec la partie. Pour la garder : une classe SaveGame (rien que des variables), Create Save Game Object, la remplir, Save Game to Slot. À la partie suivante : Load Game from Slot, Cast To, et relire.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        '- **BP_Sauvegarde** : un Blueprint de classe parente **SaveGame**, avec une variable **Pieces** (Integer). Ouvre-le : pas de composants, pas de place dans le niveau, seulement des variables.\n- **BP_Tirelire** : entend IA_Interagir (la touche E). Sa variable **Pieces** compte les pièces ; le graphe fait déjà IA_Interagir → Increment Int → Print String.\n\n' +
        'Lance Play, appuie trois fois, Stop, Play : on repart de 1. Tout ce que contient un acteur disparaît à la fin de la partie.',
    },
    {
      title: 'Un SaveGame, un slot',
      body:
        'Un **SaveGame** est un objet qui n’existe que pour être écrit. Le moteur sait le copier dans un **slot**, un fichier sur le disque désigné par un nom (**Slot Name**) et un numéro de joueur (**User Index**, 0 en solo).\n\n' +
        '- **Create Save Game Object** : crée un objet de la classe choisie (pin Save Game Class), variables à leur valeur par défaut. Sa sortie est déjà du type BP_Sauvegarde.\n- **Save Game to Slot** : écrit une copie de ses variables dans le slot.\n- **Load Game from Slot** : relit le slot et crée un objet avec ce qui y était. Sa sortie est un simple **SaveGame** : un **Cast To BP_Sauvegarde** est nécessaire pour lire Pieces.\n\n' +
        'Dans l’appli, Content Drawer › Slots de sauvegarde montre ce qui est écrit, et permet d’effacer.',
    },
    {
      title: 'Sauver',
      body:
        'Après le Print String de IA_Interagir :\n\n' +
        '1. **Create Save Game Object** (Save Game Class = BP_Sauvegarde).\n2. **Set Pieces** sur cet objet : tire un fil depuis Return Value et cherche « Set Pieces ». Valeur = Get Pieces de la tirelire.\n3. **Save Game to Slot** : Save Game Object = le même Return Value, Slot Name = « Tirelire ».\n\n' +
        'Les deux variables s’appellent Pieces, mais ce sont deux variables : celle de la tirelire (dans le niveau) et celle du SaveGame (dans l’objet à écrire).',
    },
    {
      title: 'Charger',
      body:
        'Au **BeginPlay** de la tirelire :\n\n' +
        '1. **Load Game from Slot** (Slot Name = « Tirelire », le même nom).\n2. **Cast To BP_Sauvegarde** (Object = Return Value).\n3. Sortie du haut → **Set Pieces** (celle de la tirelire) = Pieces lu depuis **As BP_Sauvegarde**.\n\n' +
        'À la toute première partie, le slot n’existe pas : Load renvoie **None**, le Cast échoue en silence, et Pieces garde 0. C’est exactement ce qu’on veut ici.',
    },
    {
      title: 'Dans UE',
      body:
        'Le slot est un fichier **Tirelire.sav** dans le dossier Saved/SaveGames du projet. Le supprimer revient à « effacer la partie ».\n\n' +
        'Un nom de slot mal recopié (« Tirelire » à l’écriture, « tirelire » à la lecture) suffit à tout perdre sans erreur : garde-le dans une variable ou une constante, écrit une seule fois.',
    },
  ],
  objectives: [
    'Après chaque pièce : Create Save Game Object (BP_Sauvegarde), Set Pieces sur l’objet, Save Game to Slot (« Tirelire »).',
    'Au BeginPlay : Load Game from Slot (« Tirelire »), Cast To BP_Sauvegarde, et reprends Pieces.',
    'Touche Vérifier : trois pièces, puis Stop, Play, et une pièce de plus.',
  ],
  hints: [
    'Deux moments : écrire (après chaque pièce) et relire (au début de chaque partie). Même Slot Name des deux côtés.',
    'Nœuds : Create Save Game Object, Set Pieces (tiré depuis l’objet), Save Game to Slot ; Event BeginPlay, Load Game from Slot, Cast To BP_Sauvegarde, Get Pieces (depuis As BP_Sauvegarde), Set Pieces.',
    'Solution : IA_Interagir → … → Print String → Create Save Game Object (BP_Sauvegarde) → Set Pieces (Target = l’objet, = Pieces) → Save Game to Slot (l’objet, « Tirelire »). BeginPlay → Load Game from Slot (« Tirelire ») → Cast To BP_Sauvegarde → Set Pieces = As BP_Sauvegarde › Pieces.',
  ],
  challenge: 'Ajoute une action IA_Vider sur F dans IMC_Joueur : elle vide la tirelire et efface la sauvegarde (Delete Game in Slot).',
  setup: piggyProject,
  scenario: [{ wait: 0.2 }, ...tap('E'), ...tap('E'), ...tap('E'), ...RESTART, ...tap('E')],
  checks: [
    {
      id: 'first',
      label: 'Première partie : 1, 2, 3',
      at: 'avant',
      test: (cx) => (printedNumbers(cx).join() === '1,2,3' ? true : `Première partie : ${printedNumbers(cx).join(', ') || 'rien'}. Il fallait 1, 2, 3.`),
    },
    {
      id: 'saved',
      label: 'Le slot « Tirelire » garde 3 pièces',
      at: 'avant',
      test: (cx) => {
        const s = Object.values(cx.sim.slots)[0];
        if (!s) return 'Aucun slot n’a été écrit : Save Game to Slot doit recevoir l’objet créé par Create Save Game Object.';
        return s.values.Pieces === 3 ? true : `Le slot contient Pieces = ${String(s.values.Pieces)} : remplis l’objet (Set Pieces) avant de l’écrire.`;
      },
    },
    {
      id: 'again',
      label: 'Partie suivante : la pièce de plus affiche 4',
      test: (cx) => {
        const n = printedNumbers(cx);
        const last = n[n.length - 1];
        if (last === '4') return true;
        if (last === '1') return 'La nouvelle partie repart de 1 : au BeginPlay, relis le slot (Load Game from Slot, Cast To BP_Sauvegarde) et reprends Pieces.';
        return `Après la relance, la tirelire affiche ${last ?? 'rien'} au lieu de 4.`;
      },
    },
    notion(usesNode('load', 'BP_Tirelire', ['save.fromSlot'], 'La tirelire relit le slot (Load Game from Slot)', 'Relis la sauvegarde avec Load Game from Slot.')),
    noRuntimeErrors(),
  ],
  solve: solvePiggy,
};

// ------------------------------------------------------- Débogue D17

function firstGameProject(fixed = false) {
  const pb = new ProjectBuilder('Débogue D17');
  const save = pb.blueprint('BP_Sauvegarde', 'SaveGame');
  save.variable('Pieces', T.int, 0);
  const b = pb.blueprint('BP_Tirelire');
  b.component('StaticMesh', 'Cochon', { shape: 'cylinder', sizeX: 70, sizeY: 60, color: '#f472b6' });
  b.cls.autoReceiveInput = true;
  b.variable('Sauvegarde', T.object('BP_Sauvegarde'));
  pb.place(b, 0, 0);
  pb.playerStart(-300, 0);
  firstGameGraph(b, pb.project, fixed);
  return pb.project;
}

function firstGameGraph(b: ClassBuilder, p: Project, fixed: boolean): void {
  const save = cls(p, 'BP_Sauvegarde');
  const begin = b.node('event.beginPlay', {}, {}, [64, 96]);
  const load = b.node('save.fromSlot', {}, { slot: 'Tirelire' }, [320, 96]);
  const cast = b.node('cast.to', { class: save.id }, {}, [620, 96]);
  const keep = setVar(b, 'Sauvegarde', [940, 96]);
  b.link(begin, 'then', load, 'exec').link(load, 'then', cast, 'exec').link(load, 'result', cast, 'object').link(cast, 'then', keep, 'exec').link(cast, 'as', keep, 'value');
  if (fixed) {
    const create = b.node('save.create', {}, { saveClass: save.id }, [940, 300]);
    const keep2 = setVar(b, 'Sauvegarde', [1240, 300]);
    b.link(cast, 'failed', create, 'exec').link(create, 'then', keep2, 'exec').link(create, 'result', keep2, 'value');
  }
  // E: one more coin in the SaveGame object, print it, write it.
  const key = b.node('event.inputKey', { key: 'E' }, {}, [64, 560]);
  const add = b.node('math.addInt', {}, { b: 1 }, [500, 760]);
  const set = setOf(b, p, 'BP_Sauvegarde', 'Pieces', [700, 560]);
  const show = say(b, [1000, 560]);
  const write = b.node('save.toSlot', {}, { slot: 'Tirelire' }, [1300, 560]);
  const read = getOf(b, p, 'BP_Sauvegarde', 'Pieces', [300, 760]);
  b.link(key, 'pressed', set, 'exec').link(getVar(b, 'Sauvegarde', [100, 760]), 'value', read, 'target').link(read, 'value', add, 'a').link(add, 'result', set, 'value');
  b.link(getVar(b, 'Sauvegarde', [560, 900]), 'value', set, 'target').link(set, 'then', show, 'exec').link(set, 'out', show, 'text');
  b.link(show, 'then', write, 'exec').link(getVar(b, 'Sauvegarde', [1160, 760]), 'value', write, 'object');
}

export const debug17: Lesson = {
  id: 'd17-premiere-partie',
  kind: 'debug',
  code: 'D17',
  module: 'Sauvegarde',
  level: 'confirme',
  number: 0,
  title: 'La première partie plante',
  situation:
    'La tirelire garde ses pièces dans un objet SaveGame qu’elle charge au lancement. Sur l’ordinateur du développeur, tout marche. Chez un nouveau joueur, chaque appui sur E remplit l’Output Log d’erreurs, et rien n’est jamais sauvé.',
  notions: ['Load Game from Slot', 'Does Save Game Exist', 'Cast Failed', 'Accessed None'],
  remember:
    'À la toute première partie, il n’y a aucune sauvegarde : Load Game from Slot renvoie None, sans erreur. Il faut prévoir ce cas : charger si le slot existe, sinon créer une sauvegarde neuve.',
  cards: [
    DEBUG_METHOD,
    {
      title: 'Ce qui est en place',
      body:
        '- **BP_Sauvegarde** (SaveGame) : une variable **Pieces**.\n- **BP_Tirelire** : une variable **Sauvegarde**, une référence vers un BP_Sauvegarde.\n\n' +
        'Au **BeginPlay** : Load Game from Slot (« Tirelire ») → Cast To BP_Sauvegarde → **Set Sauvegarde** = As BP_Sauvegarde. La sortie **Cast Failed** n’est reliée à rien.\n\n' +
        'Sur **IA_Interagir** (E) : Pieces de la Sauvegarde + 1 → Print String → Save Game to Slot (Sauvegarde, « Tirelire »).',
    },
    {
      title: 'Pourquoi « chez le développeur, ça marche »',
      body:
        'Le développeur a un slot « Tirelire » sur son disque depuis longtemps : Load le trouve, le Cast réussit, Sauvegarde est remplie.\n\n' +
        'Le nouveau joueur n’a **rien** sur le disque. Que renvoie Load Game from Slot pour un slot absent ? Par quelle sortie le Cast part-il alors ? Et que vaut la variable Sauvegarde ensuite ?\n\n' +
        'Lis l’erreur de l’Output Log et touche **Pourquoi ?** : elle remonte jusqu’à la variable vide.',
    },
    {
      title: 'Le cas oublié',
      body:
        'Un chargement a toujours deux issues : il y a une sauvegarde, ou il n’y en a pas encore. Le second cas est celui de **tout nouveau joueur**, et c’est le seul que le développeur ne voit jamais.\n\n' +
        'Deux façons de le traiter :\n- tester d’abord avec **Does Save Game Exist** ;\n- ou se servir de **Cast Failed**, qui sort justement quand Load a renvoyé None.\n\n' +
        'Dans ce cas, il faut une sauvegarde **neuve** : Create Save Game Object, rangée dans la même variable.',
    },
    {
      title: 'Ce qu’on attend',
      body: 'Première partie : aucune erreur, 1 puis 2. Partie suivante : la pièce de plus donne 3. Le test efface tout avant de commencer : il joue bien le rôle du nouveau joueur.',
    },
  ],
  objectives: ['Première partie sans aucune erreur : 1, puis 2.', 'Après Stop et Play : 3.'],
  hints: [
    'Mets un breakpoint sur Set Sauvegarde : est-il atteint à la première partie ?',
    'Cast Failed ne mène nulle part : Sauvegarde reste None, et tout ce qui la lit échoue.',
    'Solution : Cast Failed → Create Save Game Object (BP_Sauvegarde) → Set Sauvegarde (Return Value).',
  ],
  setup: () => firstGameProject(),
  scenario: [{ wait: 0.2 }, ...tap('E'), ...tap('E'), ...RESTART, ...tap('E')],
  checks: [
    {
      id: 'first',
      label: 'Première partie : 1, puis 2',
      at: 'avant',
      test: (cx) => (printedNumbers(cx).join() === '1,2' ? true : `Première partie : ${printedNumbers(cx).join(', ') || 'rien'}. Il fallait 1, puis 2.`),
    },
    {
      id: 'next',
      label: 'Partie suivante : 3',
      test: (cx) => {
        const n = printedNumbers(cx);
        return n[n.length - 1] === '3' ? true : `Après la relance : ${n[n.length - 1] ?? 'rien'}. Il fallait 3 : la première partie doit avoir écrit le slot.`;
      },
    },
    noRuntimeErrors(),
  ],
  solve(p) {
    const b = edit(p, 'BP_Tirelire');
    wipe(b.graph);
    firstGameGraph(b, p, true);
  },
};

// ------------------------------------------------------------ Prédis P11

/** A game saved "before": the slot Partie holds a BP_Reglages, not a BP_Progression. */
const settingsSlot = (): Record<string, SavedGame> => ({ 'Partie|0': { classId: '', className: 'BP_Reglages', values: { Volume: 7 } } });

export const predict11: Lesson = {
  id: 'p11-load-cast',
  kind: 'predict',
  code: 'P11',
  module: 'Sauvegarde',
  level: 'confirme',
  number: 0,
  title: 'Load, Cast, lecture',
  situation:
    'Le slot « Partie » existe déjà. Le menu le charge au lancement, fait un Cast To BP_Progression et affiche Niveau, ou « Pas une progression » si le Cast échoue. Qu’affiche-t-il ?',
  notions: ['Load Game from Slot', 'Cast To', 'Slot de sauvegarde'],
  remember: 'Un slot garde la classe de l’objet qu’on y a écrit. Load Game from Slot rend cet objet-là ; le Cast vers une autre classe SaveGame échoue, sans erreur.',
  cards: [
    {
      title: 'À lire',
      body:
        'Deux classes **SaveGame** :\n- **BP_Reglages** : une variable **Volume** (Integer) ;\n- **BP_Progression** : une variable **Niveau** (Integer, 1 par défaut).\n\n' +
        'Ouvre le **Content Drawer** : la section Slots de sauvegarde montre le slot **Partie**, déjà écrit avant cette partie. Regarde quelle classe il contient.\n\n' +
        'Au **BeginPlay** de **BP_Menu** : **Load Game from Slot** (« Partie ») → **Cast To BP_Progression**.\n- Sortie du haut → Print String de **Niveau** (As BP_Progression).\n- **Cast Failed** → Print String « Pas une progression ».',
    },
    {
      title: 'Ce que font ces nœuds',
      body:
        '- **Load Game from Slot** crée un objet de la classe qui a été **écrite** dans le slot, avec ses valeurs sauvées. Sa sortie est typée SaveGame, la classe de base de toutes les sauvegardes.\n- **Cast To** vérifie que cet objet est bien de la classe demandée (ou d’une classe enfant). Sinon : Cast Failed, sans erreur.\n\n' +
        'Question à te poser : la classe écrite dans le slot et la classe du Cast sont-elles les mêmes ?',
    },
    PREDICT_METHOD,
  ],
  objectives: [
    'Lis le graphe et le slot sans lancer Play.',
    'Choisis ta réponse dans l’onglet Prédis.',
    'Puis lance ▶ Play et regarde l’Output Log pour vérifier.',
  ],
  hints: ['Le slot Partie contient un BP_Reglages.', 'Un BP_Reglages n’est pas un BP_Progression : le Cast échoue.', 'Réponse : « Pas une progression ».'],
  slots: settingsSlot,
  setup() {
    const pb = new ProjectBuilder('Prédis P11');
    pb.blueprint('BP_Reglages', 'SaveGame').variable('Volume', T.int, 5);
    const prog = pb.blueprint('BP_Progression', 'SaveGame');
    prog.variable('Niveau', T.int, 1);
    const b = pb.blueprint('BP_Menu');
    b.component('TextRender', 'Titre', { text: 'Menu' });
    const begin = b.node('event.beginPlay', {}, {}, [64, 96]);
    const load = b.node('save.fromSlot', {}, { slot: 'Partie' }, [320, 96]);
    const cast = b.node('cast.to', { class: prog.cls.id }, {}, [620, 96]);
    const show = say(b, [940, 40]);
    const read = b.node('var.getExternal', { owner: prog.cls.id, variable: varId(prog, 'Niveau') }, {}, [800, 260]);
    b.link(begin, 'then', load, 'exec').link(load, 'then', cast, 'exec').link(load, 'result', cast, 'object');
    b.link(cast, 'then', show, 'exec').link(cast, 'as', read, 'target').link(read, 'value', show, 'text');
    b.link(cast, 'failed', say(b, [940, 360], 'Pas une progression'), 'exec');
    pb.place(b, 0, 0);
    pb.playerStart(-300, 0);
    pb.project.saveSlots = settingsSlot();
    return pb.project;
  },
  scenario: [{ wait: 0.2 }],
  checks: [],
  solve: () => {},
  predict: {
    question: 'Que voit-on dans l’Output Log ?',
    options: ['Pas une progression', '1 (la valeur par défaut de Niveau)', '7 (la valeur sauvée dans le slot)', 'Une erreur Accessed None'],
    answer: 0,
    explanation:
      'Le slot Partie contient un BP_Reglages : Load Game from Slot recrée un BP_Reglages. Le Cast To BP_Progression échoue, sans erreur, et la sortie Cast Failed affiche « Pas une progression ». Niveau n’est jamais lu. Un slot par sorte de sauvegarde (Reglages, Partie) évite cette confusion.',
    verify: (prints) => prints.join('|') === 'Pas une progression',
  },
};

// ------------------------------------------------------- Débogue D18

function recordProject(fixed = false) {
  const pb = new ProjectBuilder('Débogue D18');
  const rec = pb.blueprint('BP_Record', 'SaveGame');
  rec.variable('Record', T.int, 0);
  const b = pb.blueprint('BP_Borne');
  b.component('StaticMesh', 'Borne', { sizeX: 80, sizeY: 60, color: '#7c3aed' });
  b.cls.autoReceiveInput = true;
  b.variable('Score', T.int, 0);
  pb.place(b, 0, 0);
  pb.playerStart(-300, 0);
  recordGraph(b, pb.project, fixed);
  return pb.project;
}

function recordGraph(b: ClassBuilder, p: Project, fixed: boolean): void {
  const rec = cls(p, 'BP_Record');
  // BeginPlay: show the record, if there is one.
  const begin = b.node('event.beginPlay', {}, {}, [64, 96]);
  const exists = b.node('save.exists', {}, { slot: 'Records' }, [320, 96]);
  const br = b.node('flow.branch', {}, {}, [620, 96]);
  const load = b.node('save.fromSlot', {}, { slot: 'Records' }, [880, 40]);
  const cast = b.node('cast.to', { class: rec.id }, {}, [1160, 40]);
  const text = b.node('string.append', {}, { in0: 'Record : ' }, [1400, 260]);
  const show = say(b, [1480, 40]);
  const read = getOf(b, p, 'BP_Record', 'Record', [1240, 260]);
  b.link(begin, 'then', exists, 'exec').link(exists, 'then', br, 'exec').link(exists, 'result', br, 'condition').link(br, 'true', load, 'exec');
  b.link(load, 'then', cast, 'exec').link(load, 'result', cast, 'object').link(cast, 'then', show, 'exec').link(cast, 'as', read, 'target');
  b.link(read, 'value', text, 'in1').link(text, 'result', show, 'text');
  // E: ten points.
  const e = b.node('event.inputKey', { key: 'E' }, {}, [64, 520]);
  const add = b.node('math.addInt', {}, { b: 10 }, [300, 700]);
  const set = setVar(b, 'Score', [400, 520]);
  const shown = say(b, [700, 520]);
  b.link(e, 'pressed', set, 'exec').link(getVar(b, 'Score', [100, 700]), 'value', add, 'a').link(add, 'result', set, 'value').link(set, 'then', shown, 'exec').link(set, 'out', shown, 'text');
  // F: end of the game, keep the score as the record.
  const f = b.node('event.inputKey', { key: 'F' }, {}, [64, 900]);
  const create = b.node('save.create', {}, { saveClass: rec.id }, [320, 900]);
  const fill = setOf(b, p, 'BP_Record', 'Record', [620, 900]);
  const write = b.node('save.toSlot', {}, { slot: 'Records' }, [920, 900]);
  b.link(f, 'pressed', create, 'exec').link(create, 'result', fill, 'target').link(getVar(b, 'Score', [480, 1100]), 'value', fill, 'value').link(create, 'result', write, 'object');
  if (fixed) b.link(create, 'then', fill, 'exec').link(fill, 'then', write, 'exec');
  else b.link(create, 'then', write, 'exec').link(write, 'then', fill, 'exec');
}

export const debug18: Lesson = {
  id: 'd18-record',
  kind: 'debug',
  code: 'D18',
  module: 'Sauvegarde',
  level: 'confirme',
  number: 0,
  title: 'Le record à zéro',
  situation:
    'La borne d’arcade compte 10 points par appui sur E. F termine la partie et sauve le score comme record. Au lancement suivant, elle affiche « Record : 0 », quel que soit le score. Aucune erreur.',
  notions: ['Save Game to Slot', 'Create Save Game Object', 'Ordre du fil blanc'],
  remember: 'Save Game to Slot écrit l’objet tel qu’il est à cet instant. Ce qu’on change après n’est pas sauvé : remplis d’abord, écris ensuite.',
  cards: [
    DEBUG_METHOD,
    {
      title: 'Ce qui est en place',
      body:
        '- **BP_Record** (SaveGame) : une variable **Record**.\n- **BP_Borne** : une variable **Score**.\n\n' +
        '- **IA_Marquer** (E) : Score + 10, affiché.\n- **IA_Sauvegarder** (F) : Create Save Game Object (BP_Record), Save Game to Slot (« Records »), Set Record = Score.\n- **BeginPlay** : si le slot « Records » existe (Does Save Game Exist), Load, Cast To BP_Record, et affiche « Record : » suivi de Record.',
    },
    {
      title: 'Enquêter',
      body:
        'Lance Play, trois fois E, F, Stop, Play : « Record : 0 ».\n\n' +
        'Le slot a bien été écrit : sinon BeginPlay n’afficherait rien du tout. Ouvre le Content Drawer, section Slots de sauvegarde : que contient Records ?\n\n' +
        'Puis suis le fil blanc de **IA_Sauvegarder**, nœud par nœud. À l’instant où Save Game to Slot copie l’objet, que vaut Record dedans ?',
    },
    {
      title: 'Une copie, à un instant',
      body:
        '**Save Game to Slot** ne garde pas un lien vers l’objet : il en écrit une **copie**, telle qu’elle est quand le fil blanc passe par lui. Changer l’objet ensuite ne touche plus le slot.\n\n' +
        'C’est le même principe qu’un Print String : il affiche la valeur du moment, pas celle de la fin.',
    },
  ],
  objectives: ['Après trois appuis sur E, F, puis Stop et Play : « Record : 30 ».'],
  hints: [
    'Le slot contient Record = 0 : il a été écrit avant d’être rempli.',
    'L’ordre sur le fil de IA_Sauvegarder : Create, puis Save, puis Set Record. Le Set arrive trop tard.',
    'Solution : IA_Sauvegarder → Create Save Game Object → Set Record (= Score) → Save Game to Slot.',
  ],
  setup: () => recordProject(),
  scenario: [{ wait: 0.2 }, ...tap('E'), ...tap('E'), ...tap('E'), ...tap('F'), ...RESTART],
  checks: [
    {
      id: 'slot',
      label: 'Le slot Records garde 30',
      at: 'avant',
      test: (cx) => {
        const s = slotOf(cx, 'Records');
        if (!s) return 'Le slot Records n’a pas été écrit.';
        return s.values.Record === 30 ? true : `Le slot Records contient Record = ${String(s.values.Record)} : il a été écrit avant que Record soit rempli.`;
      },
    },
    { id: 'shown', label: 'Au lancement suivant : « Record : 30 »', test: (cx) => (countPrints(cx, 'Record : 30') ? true : 'Le lancement suivant n’affiche pas « Record : 30 ».') },
    noRuntimeErrors(),
  ],
  solve(p) {
    const b = edit(p, 'BP_Borne');
    wipe(b.graph);
    recordGraph(b, p, true);
  },
};

// ------------------------------------------------------------- Le checkpoint

const START: [number, number] = [-600, 0];

function checkpointProject() {
  const pb = new ProjectBuilder('Le checkpoint');
  pb.blueprint('BP_Partie', 'SaveGame').variable('Position', T.vector, { x: 0, y: 0, z: 0 });
  const b = pb.blueprint('BP_Checkpoint');
  b.component('StaticMesh', 'Dalle', { sizeX: 120, sizeY: 120, color: '#16a34a', blocks: false });
  b.component('BoxCollision', 'Zone', { sizeX: 140, sizeY: 140 });
  pb.place(b, 0, 0);
  pb.playerStart(START[0], START[1]);
  return pb.project;
}

/** Overlap → Create → Set Position (own location) → Save ; BeginPlay → Load → Cast → Set Actor Location (player). */
export function solveCheckpoint(p: Project): void {
  const b = edit(p, 'BP_Checkpoint');
  const partie = cls(p, 'BP_Partie');
  const ov = b.node('event.actorBeginOverlap', {}, {}, [64, 96]);
  const create = b.node('save.create', {}, { saveClass: partie.id }, [360, 96]);
  const fill = setOf(b, p, 'BP_Partie', 'Position', [660, 96]);
  const write = b.node('save.toSlot', {}, { slot: 'Checkpoint' }, [960, 96]);
  b.link(ov, 'then', create, 'exec').link(create, 'then', fill, 'exec').link(create, 'result', fill, 'target').link(b.node('actor.getLocation', {}, {}, [500, 300]), 'result', fill, 'value');
  b.link(fill, 'then', write, 'exec').link(create, 'result', write, 'object');
  const begin = b.node('event.beginPlay', {}, {}, [64, 520]);
  const load = b.node('save.fromSlot', {}, { slot: 'Checkpoint' }, [360, 520]);
  const cast = b.node('cast.to', { class: partie.id }, {}, [660, 520]);
  const move = b.node('actor.setLocation', {}, {}, [960, 520]);
  const read = getOf(b, p, 'BP_Partie', 'Position', [820, 740]);
  b.link(begin, 'then', load, 'exec').link(load, 'then', cast, 'exec').link(load, 'result', cast, 'object').link(cast, 'then', move, 'exec');
  b.link(cast, 'as', read, 'target').link(read, 'value', move, 'location').link(b.node('actor.getPlayerPawn', {}, {}, [760, 880]), 'result', move, 'target');
}

const near = (cx: CheckContext, x: number, y: number) => Math.hypot(cx.sim.player.x - x, cx.sim.player.y - y) < 20;

export const lessonCheckpoint: Lesson = {
  id: 'l-checkpoint',
  module: 'Sauvegarde',
  level: 'avance',
  number: 0,
  title: 'Le checkpoint',
  situation:
    'Le joueur traverse une dalle verte, puis s’en éloigne. S’il relance le jeu, il doit réapparaître sur la dalle, pas au point de départ. La toute première partie, lui, commence normalement au départ.',
  notions: ['Save Game to Slot', 'Load Game from Slot', 'Set Actor Location', 'Get Player Pawn', 'Checkpoint'],
  remember:
    'Un checkpoint sauve au moment où l’on passe, une seule fois : la position du point de reprise, pas une référence d’acteur. Au lancement, on relit le slot et on y replace le joueur ; sans slot, rien ne bouge.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        '- **BP_Partie** (SaveGame) : une variable **Position** (Vector).\n- **BP_Checkpoint** : une dalle verte et une **Zone**, au centre du niveau. Graphe vide.\n- Le joueur part à gauche, loin de la dalle.\n\n' +
        'Le test : la dalle traversée, le joueur s’éloigne à droite, puis Stop, Play.',
    },
    {
      title: 'Sauver au bon moment',
      body:
        'Un checkpoint ne sauve pas en continu : il sauve **quand on le passe**. Sur Event Tick, il écrirait sur le disque soixante fois par seconde, pour rien. Dans UE, une écriture prend du temps et peut faire saccader le jeu.\n\n' +
        'Sur **Event ActorBeginOverlap** du checkpoint :\n1. **Create Save Game Object** (BP_Partie).\n2. **Set Position** sur l’objet = **Get Actor Location** du checkpoint lui-même (Target = self).\n3. **Save Game to Slot** (« Checkpoint »).\n\n' +
        'On sauve la **position de la dalle**, un point de reprise sûr, plutôt que celle du joueur à cet instant (il pourrait être en plein saut, au bord d’un trou).',
    },
    {
      title: 'Reprendre',
      body:
        'Au **BeginPlay** du checkpoint :\n1. **Load Game from Slot** (« Checkpoint »).\n2. **Cast To BP_Partie**.\n3. Sortie du haut → **Set Actor Location** : Target = **Get Player Pawn**, New Location = Position (As BP_Partie).\n\n' +
        'Première partie : pas de slot, Load renvoie None, le Cast échoue en silence, et le joueur reste au départ. Rien à ajouter.',
    },
    {
      title: 'Ce qu’on ne sauve pas',
      body:
        'Une **référence** vers un acteur (le checkpoint, une porte) ne survit pas d’une partie à l’autre : l’acteur sera recréé, ce ne sera plus « le même ». On sauve ce qui permet de le retrouver : une position, un identifiant (un Name), un état (ouvert, ramassé).\n\n' +
        'Avec plusieurs checkpoints, chacun écrit le même slot : le dernier traversé gagne, c’est ce qu’on veut.',
    },
  ],
  objectives: [
    'Toucher la dalle sauve l’endroit où elle se trouve (slot « Checkpoint »).',
    'À la partie suivante, le joueur reprend sur la dalle.',
    'Touche Vérifier : la dalle, plus loin, puis Stop et Play.',
  ],
  hints: [
    'Où sauver et charger : dans le joueur, ou dans le checkpoint ? Comment obtenir la référence du joueur pour le déplacer ?',
    'Nœuds : Event ActorBeginOverlap, Create Save Game Object, Set Position, Get Actor Location, Save Game to Slot ; Event BeginPlay, Load Game from Slot, Cast To BP_Partie, Get Position, Get Player Pawn, Set Actor Location.',
    'Solution : Overlap → Create Save Game Object (BP_Partie) → Set Position (= Get Actor Location) → Save Game to Slot (« Checkpoint »). BeginPlay → Load Game from Slot (« Checkpoint ») → Cast To BP_Partie → Set Actor Location (Target = Get Player Pawn, New Location = Position).',
  ],
  challenge: 'Pose un second checkpoint plus loin : en le traversant après le premier, c’est lui qui doit compter à la relance.',
  setup: checkpointProject,
  scenario: [
    { wait: 0.3 },
    { checkpoint: 'debut' },
    { teleport: [0, 0] },
    { wait: 0.2 },
    { teleport: [500, 0] },
    { wait: 0.3 },
    ...RESTART,
  ],
  checks: [
    {
      id: 'start',
      label: 'Première partie : le joueur commence au départ',
      at: 'debut',
      test: (cx) => (near(cx, START[0], START[1]) ? true : 'À la première partie, le joueur a été déplacé alors qu’aucun checkpoint n’a encore été passé.'),
    },
    {
      id: 'saved',
      label: 'Passer la dalle écrit le slot « Checkpoint »',
      at: 'avant',
      test: (cx) => (slotOf(cx, 'Checkpoint') ? true : 'Le slot « Checkpoint » n’a pas été écrit en passant sur la dalle.'),
    },
    {
      id: 'back',
      label: 'Partie suivante : le joueur réapparaît sur la dalle',
      test: (cx) =>
        near(cx, 0, 0)
          ? true
          : `Après la relance, le joueur est en (${Math.round(cx.sim.player.x)}, ${Math.round(cx.sim.player.y)}) au lieu de la dalle (0, 0) : au BeginPlay, relis le slot et place le joueur (Get Player Pawn) à Position.`,
    },
    notion(usesNode('save', 'BP_Checkpoint', ['save.toSlot'], 'Le checkpoint écrit le slot', 'Le checkpoint doit écrire la position avec Save Game to Slot.')),
    noRuntimeErrors(),
  ],
  solve: solveCheckpoint,
  avoid: [
    {
      defs: ['event.tick'],
      in: 'BP_Checkpoint',
      label: 'Sauver sur Event Tick',
      why: 'Écrire sur le disque à chaque image ralentit le jeu et use le stockage. Un checkpoint sauve quand on le traverse : Event ActorBeginOverlap.',
    },
  ],
};
