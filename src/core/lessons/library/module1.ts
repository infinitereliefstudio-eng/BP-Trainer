/** Module 1 — Premiers pas: messages, lights, overlaps, input. */
import { T } from '../../types/pins';
import { edit, ProjectBuilder } from '../builder';
import { noRuntimeErrors, printed, usesNode, visible, notion } from '../checks';
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
  level: 'debutant',
  number: 1,
  title: 'Prise en main',
  situation: 'Afficher « Bonjour » au lancement du jeu.',
  notions: ['Event BeginPlay', 'Print String', 'Compile', 'Play'],
  remember: 'Rien ne s’exécute sans événement : le fil blanc part d’un événement (BeginPlay, une touche, un overlap…) et passe de nœud en nœud, dans l’ordre.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        'Le projet contient un Blueprint, **BP_Bonjour** : un simple cube. Un Blueprint est un **modèle** ; le cube posé dans le niveau en est une **instance**. Ce que tu écris dans BP_Bonjour, chaque instance l’exécutera.\n\n' +
        'L’écran de l’éditeur :\n\n' +
        '- au centre, l’**Event Graph**, où l’on écrit la logique avec des nœuds reliés par des fils ;\n- ☰ ouvre **My Blueprint** (composants, variables, fonctions) ;\n- ☷ ouvre **Details** : les réglages de ce qui est sélectionné ;\n- en haut, **Compile** vérifie le Blueprint, **▶ Play** lance le jeu, et les onglets passent du graphe au niveau.',
    },
    {
      title: 'Les événements et le fil blanc',
      body:
        'Rien ne s’exécute tout seul. Tout part d’un **événement**, un nœud à en-tête rouge : le moteur le déclenche quand quelque chose arrive.\n\n' +
        '**Event BeginPlay** se déclenche **une fois**, quand l’acteur commence à jouer. Pour un acteur posé dans le niveau, c’est au lancement de la partie.\n\n' +
        'De sa pin blanche (le petit triangle à droite) part le **fil d’exécution**, le fil blanc. Il dit quels nœuds s’exécutent et dans quel ordre : de l’événement vers la droite, nœud après nœud. Un nœud qui a des pins blanches ne s’exécute que si un fil blanc y arrive : posé juste à côté, sans fil, il ne s’exécute **jamais**.\n\n' +
        'Les nœuds **sans** pin blanche (les nœuds « purs », verts, comme un Get de variable) suivent une autre règle, que tu verras à la leçon « Interrupteur à touche » : ils sont calculés au moment où un nœud traversé par le fil blanc lit leur valeur.',
    },
    {
      title: 'Print String et ses pins',
      body:
        '**Print String** affiche un texte à l’écran pendant quelques secondes et l’écrit dans l’**Output Log** (le panneau du bas). C’est l’outil de base pour voir ce que fait un Blueprint.\n\n' +
        '- **In String** : le texte à afficher. Touche le champ pour le changer.\n- **Print to Screen** et **Print to Log** : où l’afficher (les deux par défaut).\n- **Duration** : combien de secondes il reste à l’écran.\n\n' +
        'Pour poser un nœud : **appui long sur le vide** du graphe, la palette s’ouvre, tape une partie du nom (« print »). Pour relier : tire un fil depuis une pin jusqu’à une autre.',
    },
    {
      title: 'Le plan',
      body:
        '1. Pose un **Event BeginPlay** (palette, « begin »).\n2. Pose un **Print String** et relie la sortie blanche de BeginPlay à son entrée blanche.\n3. Écris « Bonjour » dans In String.\n4. Touche **Compile** : une coche verte dit que le Blueprint est correct. ▶ Play compile aussi avant de lancer.\n\n' +
        'Le piège du débutant : poser les deux nœuds sans les relier. Rien ne s’affiche, et aucune erreur ne le signale.',
    },
    {
      title: 'Dans UE',
      body:
        'Un nouveau Blueprint d’acteur a déjà trois événements grisés : BeginPlay, ActorBeginOverlap et Tick. Grisés veut dire « posés mais vides » : ils ne coûtent rien tant que rien n’y est relié.\n\n' +
        'Print String est un outil de **développement** : il n’apparaît pas dans un jeu exporté (build Shipping). Pour un texte que le joueur doit voir, on passe par un widget (UMG).',
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
  level: 'debutant',
  number: 2,
  title: 'Allumer une lampe',
  situation: 'La lampe est éteinte. Elle doit s’allumer au démarrage du jeu.',
  notions: ['Composants', 'Point Light', 'Set Visibility', 'Target'],
  remember: 'Un nœud agit sur ce qui est branché sur Target : pour agir sur un composant, place sa référence dans le graphe et relie-la à Target.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        '**BP_Lampe** est posée au milieu du niveau. Elle est faite de deux **composants**, listés dans My Blueprint :\n\n' +
        '- **Pied**, un Static Mesh : le poteau gris qu’on voit ;\n- **Lumiere**, une Point Light : la lumière.\n\n' +
        'Sélectionne Lumiere : dans Details, sa case **Visible** est décochée. Les propriétés d’un composant sont son état **au lancement**. La lampe démarre donc éteinte, et c’est ta logique qui doit l’allumer.',
    },
    {
      title: 'Agir sur un composant',
      body:
        'Un nœud qui agit sur quelque chose a une pin **Target** : « sur qui j’agis ». Pour agir sur Lumiere, il faut placer dans le graphe une **référence** vers elle : dans My Blueprint, touche **Get** à côté de Lumiere. Un petit nœud bleu apparaît ; sa sortie se branche sur Target.\n\n' +
        'Le bleu est la couleur des **références** (objets, composants, acteurs). Une référence n’est pas le composant lui-même : c’est une adresse qui permet de l’atteindre.',
    },
    {
      title: 'Set Visibility',
      body:
        '**Set Visibility** rend un composant visible ou invisible. Pour une Point Light, cela revient à l’allumer ou l’éteindre.\n\n' +
        '- **Target** : le composant (ici Lumiere). Obligatoire : sans lui, le nœud ne sait pas sur quoi agir.\n- **New Visibility** : coché = visible, décoché = caché.\n- **Propagate to Children** : appliquer aussi aux composants attachés en dessous. Inutile ici.\n\n' +
        'C’est un nœud à fil blanc : il ne fait rien tant que l’exécution n’y passe pas.',
    },
    {
      title: 'Le plan',
      body:
        '1. **Event BeginPlay**.\n2. → **Set Visibility**, New Visibility **coché**.\n3. Get **Lumiere** → pin Target.\n\n' +
        'Ne coche pas Visible dans les propriétés de Lumiere : la lampe serait allumée, mais pas par la logique, et la vérification le refuse. C’est la différence entre un **réglage de départ** (Details) et une **action pendant le jeu** (le graphe).',
    },
    {
      title: 'Dans UE',
      body:
        'Dans UE, on obtient la référence d’un composant en le glissant depuis le panneau Components vers le graphe, ou par la palette (« Get Lumiere »). Le nœud est le même.\n\n' +
        'Set Visibility cache aussi les ombres et la lumière émise. Pour seulement ne plus dessiner l’objet en jeu, UE a aussi **Set Hidden in Game** : un réglage distinct que l’éditeur continue de montrer.',
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
  level: 'debutant',
  number: 3,
  title: 'L’interrupteur',
  situation: 'La lampe s’allume quand le joueur entre dans sa zone, et s’éteint quand il en sort.',
  notions: ['Box Collision', 'Begin / End Overlap', 'Other Actor'],
  remember: 'Un overlap ne se déclenche qu’avec une collision qui fait des requêtes (Query) : Begin quand on entre, End quand on sort, et Other Actor dit qui.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        'La lampe a un troisième composant : **Zone**, une Box Collision, le carré en pointillés dans le niveau. Une zone de collision ne se voit pas en jeu et ne bloque rien : elle **détecte** qui la traverse.\n\n' +
        'Quand un acteur y entre, le moteur déclenche un **Begin Overlap** ; quand il en sort, un **End Overlap**. Le joueur part à gauche de la lampe, hors de la zone.',
    },
    {
      title: 'Deux façons d’écouter',
      body:
        '- **Event ActorBeginOverlap** / **Event ActorEndOverlap** : réagissent à **n’importe quelle** zone de l’acteur. Simples, mais si la lampe avait deux zones, on ne saurait pas laquelle.\n- **On Component Begin Overlap (Zone)** / **On Component End Overlap (Zone)** : réagissent à **cette** zone précise. On les trouve dans la palette, catégorie Collision.\n\n' +
        'Les deux ont une sortie **Other Actor** : l’acteur qui est entré ou sorti. On ne s’en sert pas encore ; elle servira à reconnaître le joueur.',
    },
    {
      title: 'Le plan',
      body:
        'Deux événements, deux chemins indépendants :\n\n' +
        '1. **Begin Overlap** → **Set Visibility** (Target = Lumiere, coché).\n2. **End Overlap** → **Set Visibility** (Target = Lumiere, décoché).\n\n' +
        'Tu peux réutiliser le même Get Lumiere pour les deux Target : une référence se lit autant de fois qu’on veut.\n\n' +
        'Teste avec ▶ Play : déplace le joueur au joystick vers la lampe, puis éloigne-le.',
    },
    {
      title: 'Le piège',
      body:
        'Oublier la sortie. Avec seulement Begin Overlap, la lampe s’allume et ne s’éteint plus jamais : la vérification « éteinte quand il en ressort » échoue.\n\n' +
        'Une zone ne prévient que de ce qui **change** : on entre, on sort. Rester dedans ne déclenche rien de plus.',
    },
    {
      title: 'Dans UE',
      body:
        'Un overlap n’arrive que si les **deux** acteurs ont **Generate Overlap Events** activé et que leurs réglages de collision se « chevauchent » (Overlap) au lieu de s’ignorer. C’est la première chose à vérifier quand un overlap ne se déclenche pas.',
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
  level: 'debutant',
  number: 4,
  title: 'Interrupteur à touche',
  situation: 'La touche E allume la lampe, puis l’éteint, puis la rallume…',
  notions: ['Input E', 'Variable Boolean', 'Branch', 'FlipFlop'],
  remember: 'Une variable garde un état d’un événement à l’autre ; Branch choisit le chemin selon un Boolean. Sans Auto Receive Input, un Blueprint n’entend pas les touches.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        'La même lampe, éteinte, sans zone. **Auto Receive Input** est déjà activé dans Class Settings : la lampe entend les touches. Sans ce réglage, un acteur du niveau n’entend rien, même avec un événement de touche dans son graphe.',
    },
    {
      title: 'Les touches',
      body:
        'Un événement de touche (**E**, dans la palette) a deux sorties blanches :\n\n' +
        '- **Pressed** : au moment où l’on appuie ;\n- **Released** : au moment où l’on relâche.\n\n' +
        'Ici, seul Pressed sert. En Play, les boutons E, F et Espace sont à l’écran.',
    },
    {
      title: 'Se souvenir avec une variable',
      body:
        'Un appui sur E ne sait pas ce qui s’est passé avant. Pour alterner, la lampe doit **se souvenir** de son état : c’est le rôle d’une **variable**.\n\n' +
        'Dans My Blueprint, Variables › **+**, type **Boolean**, nom `bEstAllumee` (le « b » est la convention d’UE pour un booléen). Sa valeur par défaut, décochée, dit « éteinte » au lancement.\n\n' +
        '- **Get bEstAllumee** (vert, sans fil blanc) lit la valeur.\n- **Set bEstAllumee** (fil blanc) l’écrit.\n\n' +
        'Get est un **nœud pur** : il n’a pas de pin blanche, donc aucun fil blanc n’y arrive, et pourtant il sert. Il ne s’exécute pas de lui-même : il est calculé au moment où un nœud traversé par le fil blanc (ici le Branch) lit sa sortie.\n\n' +
        '**Branch** reçoit un booléen sur **Condition** et envoie le fil blanc sur **True** ou sur **False**. Une seule des deux sorties s’exécute.',
    },
    {
      title: 'Le plan',
      body:
        '**E** (Pressed) → **Branch**, Condition = Get bEstAllumee.\n\n' +
        '- **True** (elle est allumée) : Set Visibility décoché → **Set bEstAllumee** décoché.\n- **False** (elle est éteinte) : Set Visibility coché → **Set bEstAllumee** coché.\n\n' +
        'Le piège : changer la lumière sans mettre la variable à jour. Le premier appui allume, puis la variable dit toujours « éteinte » et chaque appui rallume une lampe déjà allumée.',
    },
    {
      title: 'D’autres façons',
      body:
        '- **FlipFlop** alterne tout seul entre ses sorties A et B à chaque passage, sans variable visible.\n- **Toggle Visibility** inverse la visibilité d’un composant en un nœud.\n\n' +
        'Elles marchent, mais la variable est la plus utile : d’autres Blueprints pourront lire `bEstAllumee` pour savoir si la lampe est allumée. Un FlipFlop garde son état pour lui.\n\n' +
        'Dans UE, les touches se gèrent aujourd’hui avec **Enhanced Input** (des Input Actions plutôt que des touches en dur). L’idée de Pressed / Released reste la même (Started / Completed).',
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
    notion(usesNode('branch', 'BP_Lampe', ['flow.branch'], 'Le graphe utilise un Branch', 'Utilise un Branch pour choisir entre allumer et éteindre.')),
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
