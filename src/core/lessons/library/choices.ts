/**
 * V2, Intermédiaire: choosing a path. Switch on Int (Default), an Enum state
 * machine with Switch on Enum, and the "Refactor" exercise from Branch to Switch.
 */
import { addEnum } from '../../operations/enumOps';
import { removeNodes } from '../../operations/graphOps';
import { T } from '../../types/pins';
import { edit, ProjectBuilder } from '../builder';
import { nodeOf } from './kit';
import { countPrints as count, noRuntimeErrors, PRESS_E, usesNode, visible, notion } from '../checks';
import type { Check, CheckContext, Lesson } from '../types';

const press = PRESS_E;

function printedAt(id: string, label: string, at: string, text: string, missing: string): Check {
  return { id, label, at, test: (cx) => (count(cx, text) > 0 ? true : missing) };
}

// ------------------------------------------------------------ Le digicode

function keypadProject() {
  const pb = new ProjectBuilder('Le digicode');
  const b = pb.blueprint('BP_Digicode');
  b.component('StaticMesh', 'Boitier', { sizeX: 70, sizeY: 50, color: '#334155' });
  b.component('PointLight', 'Voyant', { visible: false, radius: 220, color: '#22c55e' });
  b.cls.autoReceiveInput = true;
  b.variable('Essai', T.int, 0);
  pb.place(b, 0, 0);
  pb.playerStart(-300, 0);
  return pb.project;
}

export const lessonKeypad: Lesson = {
  id: 'l-digicode',
  module: 'Choisir un chemin',
  level: 'intermediaire',
  number: 0,
  title: 'Le digicode',
  situation: 'Chaque appui sur E est un essai. Essai 1 : « Code faux ». Essai 2 : « Dernier essai ». Essai 3 : le voyant s’allume. Au-delà : « Bloqué ».',
  notions: ['Switch on Int', 'Default', 'Select'],
  remember: 'Switch on Int sort par la pin qui porte la valeur, et par Default pour toutes les autres : c’est là qu’on gère les cas qu’on n’a pas prévus.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        '**BP_Digicode** : un boîtier avec un **Voyant** vert (Point Light) éteint, et une variable **Essai** (Integer, 0). Il entend la touche E. Le graphe est vide.\n\n' +
        'Chaque appui sur E est un essai, et chaque numéro d’essai a sa réaction :\n\n' +
        '- 1 : « Code faux » ;\n- 2 : « Dernier essai » ;\n- 3 : le voyant s’allume ;\n- au-delà : « Bloqué ».',
    },
    {
      title: 'Plusieurs chemins',
      body:
        'Avec des Branch, choisir entre quatre cas demande trois Branch à la suite (Essai == 1 ? sinon Essai == 2 ? sinon…). C’est long, et l’ordre des tests devient une source d’erreurs.\n\n' +
        '**Switch on Int** fait ce choix en un nœud :\n\n' +
        '- **Selection** : l’entier à examiner (Get Essai) ;\n- une **sortie blanche par valeur** : le fil sort par celle qui porte la valeur de Selection ;\n- **Default** : la sortie de toutes les autres valeurs.\n\n' +
        'Sélectionne le Switch : dans Details, **Start Index** est la première valeur (règle-le à 1) et **Nombre de cas** combien de sorties (3). Il a alors les sorties 1, 2, 3 et Default.',
    },
    {
      title: 'Default',
      body:
        'Toute valeur sans sortie à elle (0, 4, 5, −2…) sort par **Default**. Ici, ce sont les essais 4 et 5.\n\n' +
        'Si Default n’est pas branché, ces valeurs ne font **rien, sans erreur**. C’est souvent là que se cache un « ça ne marche plus après quelques essais » : le cas qu’on n’avait pas prévu.',
    },
    {
      title: 'Le plan',
      body:
        '**E** (Pressed) → **Increment Int** (Essai) → **Switch on Int** (Selection = Get Essai).\n\n' +
        '- **1** → Print String « Code faux ».\n- **2** → Print String « Dernier essai ».\n- **3** → Set Visibility (Target = Voyant, coché).\n- **Default** → Print String « Bloqué ».\n\n' +
        'Compter **avant** le Switch : au premier appui, Essai vaut 1 quand le Switch le lit. Dans l’autre ordre, le premier appui passerait par 0, donc par Default.',
    },
    {
      title: 'Et Select ?',
      body:
        '**Select** fait le même genre de choix pour une **valeur** au lieu d’un chemin : selon son **Index**, il renvoie l’une de ses options. Un seul Print String avec un Select sur In String remplacerait les trois messages : c’est le défi.\n\n' +
        'Règle utile : Switch quand les cas **font** des choses différentes, Select quand ils ne diffèrent que par une **valeur**.',
    },
  ],
  objectives: [
    'À chaque appui sur E : ajoute 1 à la variable Essai (déjà créée), puis Switch on Int sur Essai.',
    'Sortie 1 : « Code faux ». Sortie 2 : « Dernier essai ». Sortie 3 : allume le Voyant.',
    'Default : « Bloqué ».',
    'Touche Vérifier : 5 appuis sur E.',
  ],
  hints: [
    'Règle Start Index à 1 et Nombre de cas à 3 dans Details, après avoir sélectionné le Switch.',
    'Nœuds : Input E, Increment Int (Get Essai), Switch on Int (Selection = Essai), trois Print String, Set Visibility (Voyant).',
    'Solution : E → Increment Int (Essai) → Switch on Int (Essai) ; 1 → Print « Code faux » ; 2 → Print « Dernier essai » ; 3 → Set Visibility (Voyant, coché) ; Default → Print « Bloqué ».',
  ],
  challenge: 'Remplace les Print String des sorties 1, 2 et Default par un seul, dont le texte vient d’un Select (Index = Essai).',
  setup: keypadProject,
  scenario: [
    { wait: 0.2 },
    ...press,
    { checkpoint: 'un' },
    ...press,
    { checkpoint: 'deux' },
    ...press,
    { checkpoint: 'trois' },
    ...press,
    ...press,
    { checkpoint: 'cinq' },
  ],
  checks: [
    printedAt('one', '1er essai : « Code faux »', 'un', 'code faux', 'Rien de « Code faux » au 1er essai : Essai vaut 1 à ce moment, la sortie 1 du Switch doit afficher le message.'),
    printedAt('two', '2e essai : « Dernier essai »', 'deux', 'dernier essai', 'Rien de « Dernier essai » au 2e essai.'),
    visible('three', 'BP_Digicode', 'Voyant', true, '3e essai : le voyant s’allume', 'trois'),
    {
      id: 'default',
      label: '4e et 5e essais : « Bloqué » (Default)',
      at: 'cinq',
      test: (cx) => {
        const n = count(cx, 'bloque');
        if (n === 2) return true;
        if (n === 0) return 'Rien ne s’affiche aux 4e et 5e essais : Essai vaut 4 puis 5, qui n’ont pas de sortie à eux. Ils passent par Default : relie-la à « Bloqué ».';
        return `« Bloqué » s’affiche ${n} fois au lieu de 2 : seuls les essais 4 et 5 doivent passer par Default.`;
      },
    },
    notion(usesNode('switch', 'BP_Digicode', ['flow.switchInt'], 'Le graphe utilise Switch on Int', 'Choisis la réaction avec un Switch on Int.')),
    noRuntimeErrors(),
  ],
  solve(p) {
    const b = edit(p, 'BP_Digicode');
    const essai = b.cls.variables[0].id;
    const key = b.node('event.inputKey', { key: 'E' });
    const inc = b.node('var.incrementInt');
    const sw = b.node('flow.switchInt', { start: 1, cases: 3 });
    const p1 = b.node('debug.printString', {}, { text: 'Code faux' }, [1000, 0]);
    const p2 = b.node('debug.printString', {}, { text: 'Dernier essai' }, [1000, 200]);
    const on = b.node('component.setVisibility', {}, { visible: true }, [1000, 400]);
    const dflt = b.node('debug.printString', {}, { text: 'Bloqué' }, [1000, 600]);
    b.link(key, 'pressed', inc, 'exec').link(b.node('var.get', { variable: essai }, {}, [340, 300]), 'value', inc, 'value');
    b.link(inc, 'then', sw, 'exec').link(inc, 'result', sw, 'selection');
    b.link(sw, 'case1', p1, 'exec').link(sw, 'case2', p2, 'exec').link(sw, 'case3', on, 'exec').link(sw, 'default', dflt, 'exec');
    b.target('Voyant', on);
  },
};

// ------------------------------------------------- Les états de la porte

const STATES = ['Fermee', 'Ouverte', 'Verrouillee'];

function doorYawOf(cx: CheckContext, label: string): number {
  const yaw = cx.component(label, 'Porte')?.props.yaw ?? 0;
  return ((((yaw + 180) % 360) + 360) % 360) - 180;
}

function stateDoorsProject() {
  const pb = new ProjectBuilder('Les états de la porte');
  const e = addEnum(pb.project, 'E_EtatPorte');
  if (!e.ok) throw new Error(e.reason);
  e.value.entries = [...STATES];
  const b = pb.blueprint('BP_Porte');
  b.component('StaticMesh', 'Porte', { shape: 'door', sizeX: 160, sizeY: 16, color: '#a0703c' });
  b.cls.autoReceiveInput = true;
  const etat = b.variable('Etat', T.enum('E_EtatPorte'), 0);
  b.cls.variables[0].instanceEditable = true;
  // Both doors must hear E: the event comes with Consume Input unchecked.
  b.node('event.inputKey', { key: 'E', consumeInput: false }, {}, [64, 96]);
  pb.place(b, 0, -200);
  const locked = pb.place(b, 0, 200);
  pb.project.level.actors.find((a) => a.id === locked)!.overrides[etat] = 2;
  pb.playerStart(-300, 0);
  return pb.project;
}

const stateOf = (cx: CheckContext, label: string) => STATES[Number(cx.variable(label, 'Etat'))] ?? '?';

export const lessonDoorStates: Lesson = {
  id: 'l-etats-porte',
  module: 'Choisir un chemin',
  level: 'intermediaire',
  number: 0,
  title: 'Les états de la porte',
  situation:
    'Deux portes, une variable Etat chacune (Enum E_EtatPorte : Fermee, Ouverte, Verrouillee). E ouvre une porte fermée, ferme une porte ouverte, et une porte verrouillée affiche « Verrouillée ».',
  notions: ['Enum', 'Switch on Enum', 'Machine à états', 'Instance Editable'],
  remember: 'Une Enum nomme les états possibles ; Switch on Enum a une sortie par état. Chaque sortie doit aussi mettre à jour l’état (Set), sinon le prochain passage reprend la même sortie.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        '- Une **Enum** **E_EtatPorte** (dans le Content Drawer) avec trois entrées : Fermee, Ouverte, Verrouillee.\n- **BP_Porte** : un battant (Porte) et une variable **Etat** de type E_EtatPorte, **Instance Editable**. Elle entend E : l’événement E est déjà posé, vide.\n- Deux portes dans le niveau : la première a Etat = **Fermee**, la seconde est réglée sur **Verrouillee** dans son Details.\n\n' +
        'Les deux reçoivent E en même temps : chacune doit réagir selon **son** état.\n\n' +
        'Pour que les deux l’entendent, l’événement E a **Consume Input** décoché (dans son Details). Coché, le réglage par défaut d’UE, le premier acteur qui reçoit la touche la garde : seule la dernière porte posée réagirait.',
    },
    {
      title: 'Une Enum',
      body:
        'Une **Enum** (énumération) est une liste fermée de noms. Une variable de ce type contient **un** de ces noms, jamais autre chose.\n\n' +
        'Pourquoi pas un Integer (0, 1, 2) ? Parce que `Etat == 2` ne dit rien à qui relit le graphe, alors que `Etat == Verrouillee` se lit tout seul. Et une faute de frappe sur un nombre passe inaperçue ; une Enum ne propose que les valeurs valides.',
    },
    {
      title: 'Switch on Enum',
      body:
        '**Switch on E_EtatPorte** (choisis l’Enum dans Details après l’avoir posé) a **une sortie par entrée** de l’Enum. Branche **Get Etat** sur Selection : le fil sort par l’état actuel.\n\n' +
        'Il n’a pas de sortie Default : chaque état a la sienne. Une sortie non branchée ne fait rien, sans erreur. Et si l’on ajoute un état à l’Enum, une nouvelle sortie apparaît sur tous les Switch, vide tant qu’on ne la branche pas.',
    },
    {
      title: 'Une machine à états',
      body:
        'Chaque sortie fait deux choses : **l’action**, puis **le nouvel état**.\n\n' +
        '- **Fermee** → Set Relative Rotation (Porte, Yaw 90) → **Set Etat** = Ouverte.\n- **Ouverte** → Set Relative Rotation (Porte, Yaw 0) → **Set Etat** = Fermee.\n- **Verrouillee** → Print String « Verrouillée ».\n\n' +
        'Le piège : oublier le Set Etat. La porte s’ouvre, mais Etat dit toujours Fermee : le prochain appui repasse par la même sortie et la rouvre au lieu de la fermer.',
    },
    {
      title: 'Dans UE',
      body:
        'Les machines à états sont partout : portes, ennemis (patrouille, alerte, attaque), menus, quêtes. Pour un personnage animé, UE a même un éditeur dédié, les **State Machines** de l’Animation Blueprint. L’idée reste celle-ci : un état courant, une réaction par état, et des transitions qui changent l’état.',
    },
  ],
  objectives: [
    'Dans BP_Porte, sur E : Switch on E_EtatPorte avec Get Etat.',
    'Fermee : tourne la Porte de 90° (Set Relative Rotation, Z = 90) puis Etat = Ouverte.',
    'Ouverte : remets-la à 0° puis Etat = Fermee. Verrouillee : affiche « Verrouillée ».',
    'Touche Vérifier : 2 appuis sur E.',
  ],
  hints: [
    'Les deux portes reçoivent E : chacune passe par la sortie de son propre état.',
    'Nœuds : l’événement E déjà posé, Switch on E_EtatPorte (choisis l’Enum dans Details), Get Etat, 2 Set Relative Rotation (Target = Porte), 2 Set Etat, Print String.',
    'Solution : E → Switch (Etat). Fermee → Set Relative Rotation (Z 90) → Set Etat = Ouverte. Ouverte → Set Relative Rotation (Z 0) → Set Etat = Fermee. Verrouillee → Print « Verrouillée ».',
  ],
  challenge: 'Ajoute l’état Bloquee à l’Enum : la nouvelle sortie apparaît sur le Switch. Fais-lui afficher « Bloquée ».',
  setup: stateDoorsProject,
  scenario: [{ wait: 0.2 }, ...press, { checkpoint: 'un' }, ...press, { checkpoint: 'deux' }],
  checks: [
    {
      id: 'open',
      label: '1er appui : la première porte s’ouvre, son Etat passe à Ouverte',
      at: 'un',
      test: (cx) => {
        const yaw = doorYawOf(cx, 'BP_Porte');
        if (Math.abs(Math.abs(yaw) - 90) > 1) return yaw === 0 ? 'La première porte n’a pas bougé.' : `La porte a tourné de ${yaw}° au lieu de 90°.`;
        return stateOf(cx, 'BP_Porte') === 'Ouverte' ? true : `La porte est ouverte, mais Etat vaut toujours ${stateOf(cx, 'BP_Porte')} : sans Set Etat, le prochain appui reprendra la même sortie.`;
      },
    },
    {
      id: 'close',
      label: '2e appui : elle se referme, Etat revient à Fermee',
      at: 'deux',
      test: (cx) => {
        const yaw = doorYawOf(cx, 'BP_Porte');
        if (Math.abs(yaw) > 1) return 'La première porte est restée ouverte au 2e appui : la sortie Ouverte doit la remettre à 0°.';
        return stateOf(cx, 'BP_Porte') === 'Fermee' ? true : `La porte est fermée, mais Etat vaut ${stateOf(cx, 'BP_Porte')}.`;
      },
    },
    {
      id: 'locked',
      label: 'La porte verrouillée ne bouge pas et affiche « Verrouillée »',
      at: 'deux',
      test: (cx) => {
        if (Math.abs(doorYawOf(cx, 'BP_Porte2')) > 1) return 'La porte verrouillée s’est ouverte : seule la sortie Fermee doit ouvrir.';
        return count(cx, 'verrouill') >= 2 ? true : 'La porte verrouillée doit afficher « Verrouillée » à chaque appui : relie la sortie Verrouillee à un Print String.';
      },
    },
    notion(usesNode('switch', 'BP_Porte', ['flow.switchEnum'], 'Le graphe utilise Switch on E_EtatPorte', 'Choisis l’action avec un Switch on E_EtatPorte.')),
    noRuntimeErrors(),
  ],
  solve(p) {
    const b = edit(p, 'BP_Porte');
    const etat = b.cls.variables[0].id;
    const key = nodeOf(b.graph, 'event.inputKey');
    const sw = b.node('flow.switchEnum', { enum: 'E_EtatPorte' });
    b.link(key, 'pressed', sw, 'exec').link(b.node('var.get', { variable: etat }, {}, [300, 300]), 'value', sw, 'selection');
    const open = b.node('component.setRelativeRotation', {}, { rotation: { x: 0, y: 0, z: 90 } }, [700, 0]);
    const setOpen = b.node('var.set', { variable: etat }, { value: 1 }, [1000, 0]);
    const close = b.node('component.setRelativeRotation', {}, { rotation: { x: 0, y: 0, z: 0 } }, [700, 300]);
    const setClosed = b.node('var.set', { variable: etat }, { value: 0 }, [1000, 300]);
    const msg = b.node('debug.printString', {}, { text: 'Verrouillée' }, [700, 600]);
    b.link(sw, 'case0', open, 'exec').link(open, 'then', setOpen, 'exec').target('Porte', open);
    b.link(sw, 'case1', close, 'exec').link(close, 'then', setClosed, 'exec').target('Porte', close);
    b.link(sw, 'case2', msg, 'exec');
  },
};

// ---------------------------------------------------------- Refactor R2

const COLORS = ['Vert', 'Orange', 'Rouge'];
const SAYS = ['Passe', 'Ralentis', 'Stop'];

function lightsProject() {
  const pb = new ProjectBuilder('Les feux');
  const e = addEnum(pb.project, 'E_Couleur');
  if (!e.ok) throw new Error(e.reason);
  e.value.entries = [...COLORS];
  const b = pb.blueprint('BP_Feu');
  b.component('StaticMesh', 'Poteau', { shape: 'cylinder', sizeX: 30, sizeY: 30, color: '#374151' });
  const couleur = b.variable('Couleur', T.enum('E_Couleur'), 0);
  b.cls.variables[0].instanceEditable = true;
  COLORS.forEach((_, i) => {
    const id = pb.place(b, 200 * i, 0);
    pb.project.level.actors.find((a) => a.id === id)!.overrides[couleur] = i;
  });
  // The clumsy version: three Branch in a row, one per colour.
  const begin = b.node('event.beginPlay', {}, {}, [64, 96]);
  let from = { node: begin, pin: 'then' };
  COLORS.forEach((_, i) => {
    const x = 380 + i * 600;
    const br = b.node('flow.branch', {}, {}, [x, 96]);
    const eq = b.node('logic.equalEnum', {}, {}, [x - 160, 300]);
    b.link(b.node('var.get', { variable: couleur }, {}, [x - 330, 300]), 'value', eq, 'a');
    b.graph.nodes[eq].defaults.b = i;
    b.link(eq, 'result', br, 'condition').link(from.node, from.pin, br, 'exec');
    b.link(br, 'true', b.node('debug.printString', {}, { text: SAYS[i] }, [x + 260, -60]), 'exec');
    from = { node: br, pin: 'false' };
  });
  pb.playerStart(-300, 200);
  return pb.project;
}

export const refactor2: Lesson = {
  id: 'r2-feux',
  kind: 'refactor',
  code: 'R2',
  module: 'Choisir un chemin',
  level: 'intermediaire',
  number: 0,
  title: 'Les feux',
  situation: 'Trois feux (Vert, Orange, Rouge) affichent Passe, Ralentis ou Stop au lancement. Ça marche, avec trois Branch enchaînés. Réécris-le avec un seul Switch.',
  notions: ['Refactor', 'Switch on Enum', 'Equal (Enum)'],
  remember: 'Refactorer, c’est réécrire sans changer ce que ça fait. Une chaîne de Branch qui compare la même variable à chaque valeur, c’est un Switch.',
  cards: [
    {
      title: 'Refactorer',
      body:
        'Un exercice **Refactor** donne un graphe qui **marche**. Le but n’est pas de changer ce qu’il fait, mais de le **réécrire mieux** : plus court, plus lisible, plus facile à faire évoluer. La vérification contrôle les deux : même comportement, et la contrainte de forme.\n\n' +
        'Avant de toucher au graphe, lance Play et note ce qu’il affiche : c’est ce qu’il faudra retrouver à la fin.',
    },
    {
      title: 'Ce qui est en place',
      body:
        '- Une Enum **E_Couleur** : Vert, Orange, Rouge.\n- **BP_Feu** avec une variable **Couleur** (Instance Editable). Trois feux dans le niveau, un par couleur.\n- Au BeginPlay : **Branch** (Couleur == Vert) → Print « Passe ». Sinon, **Branch** (Couleur == Orange) → « Ralentis ». Sinon, **Branch** (Couleur == Rouge) → « Stop ».\n\n' +
        'Trois Branch et trois **== (Enum)** pour une seule question : « quelle couleur ? ».',
    },
    {
      title: 'Ce qui cloche',
      body:
        '- Ajouter une couleur demande un quatrième Branch au bout de la chaîne.\n- L’ordre compte : une erreur dans le deuxième test empêche d’atteindre le troisième.\n- Pour savoir ce que fait le Rouge, il faut lire toute la chaîne.\n\n' +
        'Une chaîne de Branch qui compare **la même variable** à chacune de ses valeurs, c’est la définition d’un Switch.',
    },
    {
      title: 'La réécriture',
      body:
        '1. Garde **Event BeginPlay** et les **trois Print String** : seul le choix du chemin change.\n2. Supprime les trois Branch, les trois == et leurs Get (sélection multiple, puis Supprimer).\n3. Pose **Switch on E_Couleur** (choisis l’Enum dans Details), Selection = **Get Couleur**.\n4. Vert → « Passe », Orange → « Ralentis », Rouge → « Stop ».\n\n' +
        'Relance Play : les trois mêmes messages, une fois chacun.',
    },
  ],
  objectives: [
    'Les trois feux affichent toujours Passe, Ralentis et Stop au lancement.',
    'BP_Feu n’utilise plus aucun Branch, mais un Switch on E_Couleur.',
    'Touche Vérifier.',
  ],
  hints: [
    'Garde les trois Print String : seul le choix du chemin change.',
    'Nœuds : Event BeginPlay, Get Couleur, Switch on E_Couleur (choisis l’Enum dans Details), les trois Print String.',
    'Solution : BeginPlay → Switch on E_Couleur (Selection = Couleur) ; Vert → Print « Passe », Orange → « Ralentis », Rouge → « Stop ».',
  ],
  setup: lightsProject,
  scenario: [{ wait: 0.2 }],
  checks: [
    {
      id: 'same',
      label: 'Toujours : Passe, Ralentis, Stop, une fois chacun',
      test: (cx) => {
        const got = SAYS.map((s) => count(cx, s));
        return got.every((n) => n === 1) ? true : `Messages : ${cx.prints().join(', ') || 'aucun'}. Il fallait Passe, Ralentis et Stop, une fois chacun.`;
      },
    },
    {
      id: 'no-branch',
      label: 'Plus aucun Branch dans BP_Feu',
      test: (cx) => {
        const n = cx.nodes('BP_Feu').filter((x) => x.def === 'flow.branch').length;
        return n === 0 ? true : `Il reste ${n} Branch dans BP_Feu : remplace-les par un Switch on E_Couleur.`;
      },
    },
    usesNode('switch', 'BP_Feu', ['flow.switchEnum'], 'Un Switch on E_Couleur choisit le message', 'Ajoute un Switch on E_Couleur.'),
    noRuntimeErrors(),
  ],
  solve(p) {
    const b = edit(p, 'BP_Feu');
    const couleur = b.cls.variables[0].id;
    const drop = Object.values(b.graph.nodes).filter((n) => n.def === 'flow.branch' || n.def === 'logic.equalEnum' || n.def === 'var.get');
    removeNodes(
      b.graph,
      drop.map((n) => n.id),
    );
    const begin = Object.values(b.graph.nodes).find((n) => n.def === 'event.beginPlay')!.id;
    const prints = Object.values(b.graph.nodes).filter((n) => n.def === 'debug.printString');
    const sw = b.node('flow.switchEnum', { enum: 'E_Couleur' }, {}, [380, 96]);
    b.link(begin, 'then', sw, 'exec').link(b.node('var.get', { variable: couleur }, {}, [200, 300]), 'value', sw, 'selection');
    for (const [i, say] of SAYS.entries()) b.link(sw, `case${i}`, prints.find((n) => n.defaults.text === say)!.id, 'exec');
  },
};
