/** Module 1 — Premiers pas: messages, lights, overlaps, input. */
import { T } from '../../types/pins';
import { edit, ProjectBuilder } from '../builder';
import { noRuntimeErrors, printed, usesNode, visible } from '../checks';
import type { Lesson } from '../types';

const MODULE = 'Premiers pas';

/** Lamp used by lessons 2 to 4: a pole and a light that starts off. */
function lampProject(name: string, withZone: boolean, input = false) {
  const pb = new ProjectBuilder(name);
  const lamp = pb.blueprint('BP_Lampe');
  lamp.component('StaticMesh', 'Pied', { shape: 'cylinder', sizeX: 40, sizeY: 40, color: '#6b7280' });
  lamp.component('PointLight', 'Lumiere', { visible: false, radius: 380 });
  if (withZone) lamp.component('BoxCollision', 'Zone', { sizeX: 300, sizeY: 300 });
  lamp.cls.autoReceiveInput = input;
  pb.place(lamp, 0, 0);
  pb.playerStart(-500, 0);
  return pb.project;
}

export const lesson1: Lesson = {
  id: 'l01-bonjour',
  module: MODULE,
  number: 1,
  title: 'Prise en main',
  situation: 'Afficher « Bonjour » au lancement du jeu.',
  notions: ['Event BeginPlay', 'Print String', 'Compile', 'Play'],
  cards: [
    {
      title: 'L’éditeur',
      body:
        'Tu es dans l’éditeur du Blueprint **BP_Bonjour**. Au centre, l’**Event Graph** : c’est là qu’on écrit la logique avec des nœuds.\n\n' +
        '☰ ouvre **My Blueprint** (composants, variables), ☷ ouvre **Details** (les propriétés de ce qui est sélectionné).',
    },
    {
      title: 'Les événements et le fil blanc',
      body:
        'Les nœuds à en-tête rouge sont des **événements** : ils démarrent l’exécution. **Event BeginPlay** se déclenche une seule fois, au lancement.\n\n' +
        'Le **fil blanc** est le fil d’exécution : il dit dans quel ordre les nœuds s’exécutent, de gauche à droite.',
    },
    {
      title: 'Ton premier nœud',
      body:
        '**Print String** affiche un texte à l’écran pendant quelques secondes et l’écrit dans l’**Output Log**. C’est l’outil de base pour voir ce qui se passe.\n\n' +
        'Touche le champ à côté de `In String` pour changer le texte.',
    },
  ],
  objectives: [
    'Ajoute un Event BeginPlay (appui long sur le vide du graphe).',
    'Relie-le à un Print String par le fil blanc.',
    'Écris « Bonjour » dans In String.',
    'Touche Vérifier. Tu peux aussi lancer ▶ Play pour le voir.',
  ],
  hints: [
    'Appui long sur une zone vide du graphe : la palette s’ouvre. Tape « begin ».',
    'Il te faut Event BeginPlay et Print String. Tire un fil depuis la pin blanche de BeginPlay jusqu’à l’entrée de Print String.',
    'Solution : Event BeginPlay → Print String, avec In String = Bonjour.',
  ],
  challenge: 'Affiche deux messages l’un après l’autre, avec un seul Event BeginPlay.',
  setup() {
    const pb = new ProjectBuilder('Leçon 1');
    const bp = pb.blueprint('BP_Bonjour');
    bp.component('StaticMesh', 'Cube', { sizeX: 100, sizeY: 100, color: '#7c8aa5' });
    pb.place(bp, 0, 0);
    pb.playerStart(-300, 0);
    return pb.project;
  },
  scenario: [{ wait: 0.5 }],
  checks: [printed('hello', 'Bonjour'), noRuntimeErrors()],
  solve(p) {
    const b = edit(p, 'BP_Bonjour');
    const e = b.node('event.beginPlay');
    const pr = b.node('debug.printString', {}, { text: 'Bonjour' });
    b.link(e, 'then', pr, 'exec');
  },
};

export const lesson2: Lesson = {
  id: 'l02-lampe',
  module: MODULE,
  number: 2,
  title: 'Allumer une lampe',
  situation: 'La lampe est éteinte. Elle doit s’allumer au démarrage du jeu.',
  notions: ['Composants', 'Point Light', 'Set Visibility', 'Target'],
  cards: [
    {
      title: 'Les composants',
      body:
        'Un Blueprint est fait de **composants** : ici un **Pied** (Static Mesh) et une **Lumiere** (Point Light). Ils sont listés dans My Blueprint.\n\n' +
        'Sélectionne **Lumiere** : dans Details, sa case **Visible** est décochée. C’est son état au lancement.',
    },
    {
      title: 'Agir sur un composant',
      body:
        'Pour changer un composant pendant le jeu, il faut une **référence** vers lui : touche **Get** à côté de Lumiere dans My Blueprint.\n\n' +
        'Branche cette référence sur la pin **Target** de **Set Visibility**, et coche **New Visibility**.',
    },
  ],
  objectives: [
    'Au lancement (Event BeginPlay), rends la Lumiere visible avec Set Visibility.',
    'Ne coche pas Visible dans les propriétés : allume-la par la logique.',
    'Touche Vérifier.',
  ],
  hints: [
    'Event BeginPlay déclenche l’action ; Set Visibility allume ou éteint un composant.',
    'Nœuds : Event BeginPlay, Set Visibility, et la référence Lumiere (bouton Get dans My Blueprint) branchée sur Target.',
    'Solution : Event BeginPlay → Set Visibility (Target = Lumiere, New Visibility coché).',
  ],
  challenge: 'Allume la lampe 2 secondes après le lancement, avec un Delay.',
  setup: () => lampProject('Leçon 2', false),
  scenario: [{ wait: 0.3 }],
  checks: [
    visible('on', 'BP_Lampe', 'Lumiere', true, 'La lumière est allumée peu après le lancement'),
    {
      id: 'logic',
      label: 'La lumière est allumée par la logique, pas par sa propriété Visible',
      test: (cx) =>
        cx.project.classes.find((c) => c.name === 'BP_Lampe')?.components.find((c) => c.name === 'Lumiere')?.props.visible === false
          ? true
          : 'Décoche Visible dans les propriétés de Lumiere : c’est ta logique qui doit l’allumer.',
    },
    noRuntimeErrors(),
  ],
  solve(p) {
    const b = edit(p, 'BP_Lampe');
    const e = b.node('event.beginPlay');
    const set = b.node('component.setVisibility', {}, { visible: true });
    b.link(e, 'then', set, 'exec').target('Lumiere', set);
  },
};

export const lesson3: Lesson = {
  id: 'l03-interrupteur',
  module: MODULE,
  number: 3,
  title: 'L’interrupteur',
  situation: 'La lampe s’allume quand le joueur entre dans sa zone, et s’éteint quand il en sort.',
  notions: ['Box Collision', 'Begin / End Overlap', 'Other Actor'],
  cards: [
    {
      title: 'Les zones de collision',
      body:
        'La lampe a maintenant une **Zone** (Box Collision), le carré en pointillés dans le niveau. Elle ne bloque rien : elle détecte qui la traverse.\n\n' +
        'Quand un acteur y entre, le moteur déclenche un **Begin Overlap** ; quand il sort, un **End Overlap**.',
    },
    {
      title: 'Deux façons de l’écouter',
      body:
        '**Event ActorBeginOverlap** réagit à n’importe quelle zone de l’acteur. **On Component Begin Overlap (Zone)** réagit à cette zone précise : on l’obtient dans la palette, catégorie Collision.\n\n' +
        'La pin **Other Actor** dit qui est entré. On s’en servira plus tard pour reconnaître le joueur.',
    },
  ],
  objectives: [
    'Quand le joueur entre dans la Zone, allume la Lumiere.',
    'Quand il en sort, éteins-la.',
    'Teste avec ▶ Play en déplaçant le joueur au joystick, puis Vérifier.',
  ],
  hints: [
    'Il faut deux événements : un pour l’entrée, un pour la sortie.',
    'Nœuds : Event ActorBeginOverlap et Event ActorEndOverlap (ou leurs versions On Component), deux Set Visibility.',
    'Solution : BeginOverlap → Set Visibility (Lumiere, coché) ; EndOverlap → Set Visibility (Lumiere, décoché).',
  ],
  challenge: 'Refais-le avec un seul Set Visibility… et Toggle Visibility.',
  setup: () => lampProject('Leçon 3', true),
  scenario: [
    { wait: 0.3 },
    { checkpoint: 'avant' },
    { teleport: [-60, 0] },
    { wait: 0.3 },
    { checkpoint: 'dedans' },
    { teleport: [-500, 0] },
    { wait: 0.3 },
    { checkpoint: 'apres' },
  ],
  checks: [
    visible('before', 'BP_Lampe', 'Lumiere', false, 'Éteinte tant que le joueur est loin', 'avant'),
    visible('inside', 'BP_Lampe', 'Lumiere', true, 'Allumée quand le joueur entre dans la zone', 'dedans'),
    visible('after', 'BP_Lampe', 'Lumiere', false, 'Éteinte quand il en ressort', 'apres'),
    noRuntimeErrors(),
  ],
  solve(p) {
    const b = edit(p, 'BP_Lampe');
    const begin = b.node('event.actorBeginOverlap', {}, {}, [64, 96]);
    const on = b.node('component.setVisibility', {}, { visible: true }, [380, 96]);
    const end = b.node('event.actorEndOverlap', {}, {}, [64, 420]);
    const off = b.node('component.setVisibility', {}, { visible: false }, [380, 420]);
    b.link(begin, 'then', on, 'exec').target('Lumiere', on);
    b.link(end, 'then', off, 'exec').target('Lumiere', off);
  },
};

export const lesson4: Lesson = {
  id: 'l04-touche',
  module: MODULE,
  number: 4,
  title: 'Interrupteur à touche',
  situation: 'La touche E allume la lampe, puis l’éteint, puis la rallume…',
  notions: ['Input E', 'Variable Boolean', 'Branch', 'FlipFlop'],
  cards: [
    {
      title: 'Les touches',
      body:
        'Un événement de touche (**E**) a deux sorties : **Pressed** quand on appuie, **Released** quand on relâche. En Play, les boutons E, F et Espace sont à l’écran.\n\n' +
        'Dans UE, un acteur ne reçoit les touches que si **Auto Receive Input** est activé : c’est déjà fait ici, dans Class Settings.',
    },
    {
      title: 'Se souvenir avec une variable',
      body:
        'Pour alterner, la lampe doit se souvenir de son état. Crée une **variable** Boolean (Variables › +), par exemple `bEstAllumee`.\n\n' +
        '**Branch** choisit un chemin selon un booléen : si la lampe est allumée on l’éteint, sinon on l’allume, et on met la variable à jour avec **Set**.',
    },
  ],
  objectives: [
    'Quand on appuie sur E, la lampe change d’état : éteinte → allumée → éteinte…',
    'Utilise une variable Boolean et un Branch.',
    'Touche Vérifier.',
  ],
  hints: [
    'Il faut savoir si la lampe est allumée au moment de l’appui : c’est le rôle de la variable.',
    'Nœuds : Input E (Pressed), Get bEstAllumee → Branch, deux Set Visibility, deux Set bEstAllumee.',
    'Solution : E Pressed → Branch(bEstAllumee). True → Set Visibility décoché → Set bEstAllumee = false. False → Set Visibility coché → Set bEstAllumee = true.',
  ],
  challenge: 'Refais-le sans variable : avec un FlipFlop, ou avec Toggle Visibility.',
  setup: () => lampProject('Leçon 4', false, true),
  scenario: [
    { wait: 0.2 },
    { press: 'E' },
    { release: 'E' },
    { checkpoint: 'un' },
    { press: 'E' },
    { release: 'E' },
    { checkpoint: 'deux' },
    { press: 'E' },
    { release: 'E' },
    { checkpoint: 'trois' },
  ],
  checks: [
    visible('p1', 'BP_Lampe', 'Lumiere', true, '1er appui : la lampe s’allume', 'un'),
    visible('p2', 'BP_Lampe', 'Lumiere', false, '2e appui : elle s’éteint', 'deux'),
    visible('p3', 'BP_Lampe', 'Lumiere', true, '3e appui : elle se rallume', 'trois'),
    usesNode('branch', 'BP_Lampe', ['flow.branch'], 'Le graphe utilise un Branch', 'Utilise un Branch pour choisir entre allumer et éteindre.'),
    noRuntimeErrors(),
  ],
  solve(p) {
    const b = edit(p, 'BP_Lampe');
    const v = b.variable('bEstAllumee', T.bool, false);
    const key = b.node('event.inputKey', { key: 'E' }, {}, [64, 200]);
    const get = b.node('var.get', { variable: v }, {}, [120, 380]);
    const br = b.node('flow.branch', {}, {}, [340, 200]);
    const off = b.node('component.setVisibility', {}, { visible: false }, [620, 60]);
    const setF = b.node('var.set', { variable: v }, { value: false }, [940, 60]);
    const on = b.node('component.setVisibility', {}, { visible: true }, [620, 400]);
    const setT = b.node('var.set', { variable: v }, { value: true }, [940, 400]);
    b.link(key, 'pressed', br, 'exec').link(get, 'value', br, 'condition');
    b.link(br, 'true', off, 'exec').target('Lumiere', off).link(off, 'then', setF, 'exec');
    b.link(br, 'false', on, 'exec').target('Lumiere', on).link(on, 'then', setT, 'exec');
  },
};
