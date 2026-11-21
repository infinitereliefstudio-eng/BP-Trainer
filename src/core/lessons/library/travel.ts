/**
 * V7.50, chantier n° 4 (docs/PLAN_NIVEAUX.md): the first four steps on
 * levels and the GameInstance, in the Avancé right after « Le checkpoint ».
 * The station has two levels: Lvl_Principal (a corridor with a door at its
 * end) and Lvl_Atelier.
 *
 * - « Le couloir » (discover): the door does Open Level (by Name); in the
 *   workshop, a panel prints Get Current Level Name.
 * - P17 « Le score après la porte » (predict): the pawn's Score starts again
 *   from its default in the new level, and the Print after Open Level runs.
 * - « Le sac qui suit » (guided): the coins picked up are counted in a
 *   GameInstance (BP_Jeu, chosen in Maps & Modes), read again in the workshop.
 * - D27 « Le sac vide » (debug): Game Instance Class forgotten, every Cast To
 *   BP_Jeu fails without a word.
 */
import type { Project } from '../../model/project';
import { setGameInstanceClass } from '../../operations/levelAssetOps';
import { addClass, setPlayerClass } from '../../operations/projectOps';
import { T } from '../../types/pins';
import { ClassBuilder, edit, ProjectBuilder } from '../builder';
import { noRuntimeErrors, normText, notion, printedNumbers, usesNode } from '../checks';
import type { Check, CheckContext, Lesson } from '../types';
import { PREDICT_METHOD, wipe } from './kit';
import { predictLesson } from './predicts';

export const LEVELS_MODULE = 'Niveaux et GameInstance';
const MAIN = 'Lvl_Principal';
const WORKSHOP = 'Lvl_Atelier';
const START: [number, number] = [-420, 0];
const DOOR: [number, number] = [320, 0];
const COINS: [number, number][] = [
  [-220, 0],
  [40, 0],
];

const cls = (p: Project, name: string) => p.classes.find((c) => c.name === name)!;
const vid = (p: Project, className: string, v: string) => cls(p, className).variables.find((x) => x.name === v)!.id;

/** The door at the end of the corridor: a frame and a zone, graph empty. */
function doorClass(pb: ProjectBuilder): ClassBuilder {
  const b = pb.blueprint('BP_Porte');
  b.component('StaticMesh', 'Cadre', { sizeX: 40, sizeY: 150, color: '#c08a3e', blocks: false });
  b.component('BoxCollision', 'Zone', { sizeX: 120, sizeY: 170 });
  return b;
}

/** Overlap → Open Level (by Name) Lvl_Atelier. */
function openOnOverlap(b: ClassBuilder): string {
  const open = b.node('level.open', {}, { level: WORKSHOP }, [400, 96]);
  b.link(b.node('event.actorBeginOverlap', {}, {}, [64, 96]), 'then', open, 'exec');
  return open;
}

/** Into the door, then a moment in the next level. */
const throughDoor = [{ teleport: DOOR }, { wait: 0.4 }];

/** Where the game is at the end: in the workshop, or a word on why not. */
function reachedWorkshop(cx: CheckContext): true | string {
  if (cx.level() === WORKSHOP) return true;
  const failure = cx.errors().find((e) => e.includes('Travel Failure'));
  if (failure) {
    const asked = /package '\/Game\/([^']*)'/.exec(failure)?.[1] ?? '';
    return `Open Level n’a trouvé aucun niveau nommé « ${asked} » : Level Name doit être exactement ${WORKSHOP}, le nom de l’asset dans le Content Drawer (sans espace ni « .umap »).`;
  }
  return `La partie est restée dans ${cx.level()} : en touchant la porte, BP_Porte doit faire Open Level (by Name) vers ${WORKSHOP}.`;
}

// ------------------------------------------------------------ Le couloir

function corridorProject(): Project {
  const pb = new ProjectBuilder('Le couloir');
  pb.place(doorClass(pb), ...DOOR);
  pb.playerStart(...START);
  const panel = pb.blueprint('BP_Panneau');
  panel.component('StaticMesh', 'Ecran', { sizeX: 120, sizeY: 60, color: '#4a8fd6', blocks: false });
  pb.level(WORKSHOP, (q) => {
    q.place(panel, 200, -160);
    q.playerStart(-300, 0);
  });
  return pb.project;
}

function solveCorridor(p: Project): void {
  openOnOverlap(edit(p, 'BP_Porte'));
  const panel = edit(p, 'BP_Panneau');
  const print = panel.node('debug.printString', {}, {}, [400, 96]);
  panel.link(panel.node('event.beginPlay', {}, {}, [64, 96]), 'then', print, 'exec').link(panel.node('level.currentName', {}, {}, [120, 260]), 'result', print, 'text');
}

export const lessonCorridor: Lesson = {
  id: 'l-couloir',
  module: LEVELS_MODULE,
  level: 'avance',
  number: 0,
  title: 'Le couloir',
  situation:
    'La station a deux niveaux : le couloir, où le joueur commence, et l’atelier. Au bout du couloir, une porte. Quand le joueur la touche, il doit arriver dans l’atelier, où un panneau dit dans quel niveau on est.',
  chain: { notion: 'levels', step: 'discover' },
  notions: ['Open Level (by Name)', 'Get Current Level Name', 'Level'],
  remember:
    'Open Level (by Name) quitte le niveau pour celui qui porte ce nom, au début de l’image suivante : tout le niveau quitté disparaît, et le nouveau démarre comme au premier Play. Get Current Level Name dit où l’on est.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        `- **${MAIN}** (le couloir) : **BP_Porte** au bout, un cadre et une **Zone**. Graphe vide. Le joueur part à gauche.\n` +
        `- **${WORKSHOP}** (l’atelier) : **BP_Panneau**, un écran bleu. Graphe vide.\n\n` +
        'Les deux sont des assets **Level** du Content Drawer : touche-en un deux fois pour l’ouvrir dans l’éditeur. Le test fait entrer le joueur dans la porte.',
    },
    {
      title: 'Ce qui est nouveau : changer de niveau',
      body:
        'Un jeu d’UE est fait de **niveaux** : des fichiers .umap, chacun avec ses acteurs. **Open Level (by Name)** (catégorie Game) quitte le niveau en cours pour celui dont on donne le nom, **Level Name** : le nom de l’asset, ici `Lvl_Atelier`, sans « .umap ».\n\n' +
        'Ce n’est pas immédiat : la fin de la chaîne s’exécute encore, puis, au début de l’image suivante, **tout le niveau quitté disparaît** (acteurs, joueur, Player Controller, widgets, timers) et le nouveau démarre comme au premier Play : Construction Scripts, puis BeginPlay.',
    },
    {
      title: 'Où suis-je ?',
      body:
        '**Get Current Level Name** (pur) rend le nom du niveau en cours. Laisse **Remove Prefix String** coché : décoché, il rend le nom avec le préfixe du Play dans l’éditeur (`UEDPIE_0_Lvl_Atelier`), utile seulement pour le déboguer.\n\n' +
        'Pendant Play, la barre du haut affiche aussi le niveau en cours, et l’Output Log note chaque voyage (`LogLoad: LoadMap`).',
    },
    {
      title: 'Pas à pas',
      body:
        `1. **BP_Porte** : **Event ActorBeginOverlap** → **Open Level (by Name)**, Level Name = \`${WORKSHOP}\`.\n` +
        `2. Ouvre **${WORKSHOP}** (Content Drawer), puis **BP_Panneau** : **Event BeginPlay** → **Print String**, son In String relié à **Get Current Level Name**.\n` +
        `3. Rouvre **${MAIN}** et lance Play : marche jusqu’à la porte. Play lance le niveau ouvert dans l’éditeur, comme dans UE.`,
    },
  ],
  objectives: [`Toucher la porte mène dans ${WORKSHOP}.`, 'Le panneau de l’atelier affiche le nom du niveau : Lvl_Atelier.', 'Touche Vérifier : le joueur entre dans la porte.'],
  hints: [
    'Le changement de niveau part de la porte, quand le joueur la touche. Et le nom affiché, qui le connaît ?',
    'Event ActorBeginOverlap ; Open Level (by Name) ; Event BeginPlay ; Get Current Level Name ; Print String.',
    `Solution : BP_Porte, ActorBeginOverlap → Open Level (by Name), Level Name = ${WORKSHOP}. BP_Panneau, BeginPlay → Print String (In String = Get Current Level Name).`,
  ],
  challenge: 'Pose une porte dans l’atelier qui ramène au couloir. En revenant, la porte du couloir est-elle la même qu’au départ ? Et le joueur, où réapparaît-il ?',
  setup: corridorProject,
  scenario: [{ wait: 0.3 }, { checkpoint: 'debut' }, ...throughDoor],
  checks: [
    {
      id: 'start',
      label: `Le jeu commence dans ${MAIN}`,
      at: 'debut',
      test: (cx) => (cx.level() === MAIN ? true : `Le jeu a quitté ${MAIN} avant que le joueur touche la porte : Open Level doit partir de l’overlap de la porte, pas du BeginPlay.`),
    },
    { id: 'travel', label: `Toucher la porte mène dans ${WORKSHOP}`, test: reachedWorkshop },
    {
      id: 'name',
      label: 'Le panneau affiche Lvl_Atelier',
      test: (cx) => {
        const shown = cx.prints().map((p) => p.trim());
        if (shown.includes(WORKSHOP)) return true;
        if (shown.some((p) => p.endsWith(WORKSHOP))) return `Le panneau affiche « ${shown.find((p) => p.endsWith(WORKSHOP))} » : coche Remove Prefix String sur Get Current Level Name.`;
        return 'Rien n’affiche Lvl_Atelier : dans l’atelier, BP_Panneau doit faire Print String de Get Current Level Name à son Event BeginPlay.';
      },
    },
    notion(usesNode('open-level', 'BP_Porte', ['level.open'], 'La porte fait Open Level (by Name)', 'BP_Porte doit changer de niveau avec Open Level (by Name).')),
    noRuntimeErrors(),
  ],
  solve: solveCorridor,
  avoid: [
    {
      defs: ['actor.setLocation'],
      in: 'BP_Porte',
      label: 'Téléporter le joueur au lieu de changer de niveau',
      why: 'Set Actor Location déplace le joueur dans le même niveau : l’atelier est un autre niveau, avec ses propres acteurs. Open Level (by Name) le charge.',
    },
  ],
};

// ----------------------------------------------------------------- P17

const P17 = ['Score : 0', 'Porte franchie', 'Score : 0'];

export const predictScoreDoor: Lesson = predictLesson({
  id: 'p17-score-porte',
  code: 'P17',
  module: LEVELS_MODULE,
  level: 'avance',
  title: 'Le score après la porte',
  situation:
    'Le joueur a un Score, qui vaut 0 au départ. En touchant la porte, il passe à 10, puis la porte fait Open Level vers l’atelier et affiche un message. Dans l’atelier, que dit le joueur ?',
  notions: ['Open Level (by Name)', 'Valeur par défaut', 'Pion du joueur'],
  remember:
    'Après Open Level, le joueur est un pion neuf, créé par le GameMode du nouveau niveau : ses variables repartent de leur valeur par défaut. Et Open Level n’arrête pas la chaîne : les nœuds placés après lui s’exécutent encore.',
  cards: [
    {
      title: 'À lire',
      body:
        '**BP_Joueur** est le pion du joueur (Default Pawn Class de BP_GameMode). Il a une variable **Score** (Integer, 0 par défaut). Son **Event BeginPlay** affiche « Score : » suivi de Score.\n\n' +
        '**BP_Porte**, au bout du couloir : **ActorBeginOverlap** → **Cast To BP_Joueur** (Other Actor) → **Set Score** = 10 → **Open Level (by Name)** (Lvl_Atelier) → **Print String** « Porte franchie ».\n\n' +
        'Le test : le joueur entre dans la porte, puis on attend un peu dans l’atelier.',
    },
    {
      title: 'La question',
      body:
        'Deux idées se croisent ici :\n\n' +
        '- Open Level coupe-t-il la chaîne sur-le-champ, ou la laisse-t-il finir ?\n' +
        '- Dans l’atelier, le joueur est-il le même qu’avant la porte, avec son Score à 10 ?\n\n' +
        'Rappelle-toi « Le couloir » : qu’est-ce qui disparaît au changement de niveau ?',
    },
    PREDICT_METHOD,
  ],
  hints: [
    'Open Level fait le voyage au début de l’image suivante : la chaîne en cours a le temps de finir.',
    'Le joueur de l’atelier est créé par le nouveau niveau, comme au premier Play : son BeginPlay repart, avec la valeur par défaut de Score.',
    `Réponse : ${P17.join(', ')}.`,
  ],
  setup() {
    const pb = new ProjectBuilder('Prédis P17');
    const player = pb.blueprint('BP_Joueur', 'Pawn');
    const score = player.variable('Score', T.int, 0);
    setPlayerClass(pb.project, player.cls.id);
    const text = player.node('conv.intToString', {}, {}, [200, 300]);
    const join = player.node('string.append', {}, { in0: 'Score : ' }, [400, 260]);
    const show = player.node('debug.printString', {}, {}, [640, 96]);
    player.link(player.node('event.beginPlay', {}, {}, [64, 96]), 'then', show, 'exec');
    player.link(player.node('var.get', { variable: score }, {}, [40, 300]), 'value', text, 'in').link(text, 'result', join, 'in1').link(join, 'result', show, 'text');
    const door = doorClass(pb);
    const ov = door.node('event.actorBeginOverlap', {}, {}, [64, 96]);
    const cast = door.node('cast.to', { class: player.cls.id }, {}, [340, 96]);
    const set = door.node('var.setExternal', { owner: player.cls.id, variable: score }, { value: 10 }, [640, 96]);
    const open = door.node('level.open', {}, { level: WORKSHOP }, [940, 96]);
    const after = door.node('debug.printString', {}, { text: P17[1] }, [1240, 96]);
    door.link(ov, 'then', cast, 'exec').link(ov, 'other', cast, 'object').link(cast, 'then', set, 'exec').link(cast, 'as', set, 'target');
    door.link(set, 'then', open, 'exec').link(open, 'then', after, 'exec');
    pb.place(door, ...DOOR);
    pb.playerStart(...START);
    pb.level(WORKSHOP, (q) => q.playerStart(-300, 0));
    return pb.project;
  },
  scenario: [{ wait: 0.2 }, ...throughDoor],
  predict: {
    question: 'Quels messages s’affichent, dans l’ordre ?',
    options: [
      `${P17[0]}, ${P17[1]}, Score : 10`,
      `${P17[0]}, Score : 10`,
      P17.join(', '),
      `${P17[0]}, ${P17[2]}`,
    ],
    answer: 2,
    explanation:
      'Open Level ne coupe pas la chaîne : « Porte franchie » s’affiche encore, puis le voyage se fait au début de l’image suivante. L’atelier crée alors un joueur neuf (le GameMode fait apparaître son Default Pawn Class) : son BeginPlay repart, avec Score à sa valeur par défaut, 0. Le 10 est parti avec l’ancien pion. Pour garder une valeur d’un niveau à l’autre, il faut un objet qui survit au voyage : le GameInstance.',
    verify: (p) => p.join('|') === P17.join('|'),
  },
});

// ------------------------------------------------------- Le sac qui suit

/**
 * The coins counted in the pawn: two coins in the corridor, each adds 1 to
 * BP_Joueur's Pieces and goes; the door opens the workshop, where
 * BP_Comptoir prints the pawn's Pieces at BeginPlay (0: a new pawn).
 */
function bagProject(name: string): Project {
  const pb = new ProjectBuilder(name);
  const player = pb.blueprint('BP_Joueur', 'Pawn');
  const pieces = player.variable('Pieces', T.int, 0);
  setPlayerClass(pb.project, player.cls.id);
  const coin = pb.blueprint('BP_Piece');
  coin.component('StaticMesh', 'Piece', { shape: 'cylinder', sizeX: 40, sizeY: 40, color: '#eab308', blocks: false });
  coin.component('BoxCollision', 'Zone', { sizeX: 70, sizeY: 70 });
  const ov = coin.node('event.actorBeginOverlap', {}, {}, [64, 96]);
  const cast = coin.node('cast.to', { class: player.cls.id }, {}, [340, 96]);
  const get = coin.node('var.getExternal', { owner: player.cls.id, variable: pieces }, {}, [480, 300]);
  const add = coin.node('math.addInt', {}, { b: 1 }, [700, 300]);
  const set = coin.node('var.setExternal', { owner: player.cls.id, variable: pieces }, {}, [640, 96]);
  coin.link(ov, 'then', cast, 'exec').link(ov, 'other', cast, 'object').link(cast, 'then', set, 'exec').link(cast, 'as', set, 'target');
  coin.link(cast, 'as', get, 'target').link(get, 'value', add, 'a').link(add, 'result', set, 'value');
  coin.link(set, 'then', coin.node('actor.destroy', {}, {}, [940, 96]), 'exec');
  const door = doorClass(pb);
  openOnOverlap(door);
  for (const at of COINS) pb.place(coin, ...at);
  pb.place(door, ...DOOR);
  pb.playerStart(...START);
  const desk = pb.blueprint('BP_Comptoir');
  desk.component('StaticMesh', 'Comptoir', { sizeX: 160, sizeY: 60, color: '#4a8fd6', blocks: false });
  const begin = desk.node('event.beginPlay', {}, {}, [64, 96]);
  const dcast = desk.node('cast.to', { class: player.cls.id }, {}, [340, 96]);
  const dget = desk.node('var.getExternal', { owner: player.cls.id, variable: pieces }, {}, [480, 300]);
  const text = desk.node('conv.intToString', {}, {}, [700, 300]);
  const show = desk.node('debug.printString', {}, {}, [700, 96]);
  desk.link(begin, 'then', dcast, 'exec').link(desk.node('actor.getPlayerPawn', {}, {}, [120, 300]), 'result', dcast, 'object');
  desk.link(dcast, 'then', show, 'exec').link(dcast, 'as', dget, 'target').link(dget, 'value', text, 'in').link(text, 'result', show, 'text');
  pb.level(WORKSHOP, (q) => {
    q.place(desk, 160, -140);
    q.playerStart(-300, 0);
  });
  return pb.project;
}

/** BP_Jeu (GameInstance, Pieces), chosen in Maps & Modes; the coins and the desk go through Get Game Instance → Cast To BP_Jeu. */
function solveBag(p: Project): void {
  const made = addGameInstance(p);
  const pieces = vid(p, 'BP_Jeu', 'Pieces');
  const coin = edit(p, 'BP_Piece');
  wipe(coin.graph);
  const ov = coin.node('event.actorBeginOverlap', {}, {}, [64, 96]);
  const cast = coin.node('cast.to', { class: made }, {}, [340, 96]);
  const get = coin.node('var.getExternal', { owner: made, variable: pieces }, {}, [480, 300]);
  const add = coin.node('math.addInt', {}, { b: 1 }, [700, 300]);
  const set = coin.node('var.setExternal', { owner: made, variable: pieces }, {}, [640, 96]);
  coin.link(ov, 'then', cast, 'exec').link(coin.node('game.getGameInstance', {}, {}, [120, 300]), 'result', cast, 'object').link(cast, 'then', set, 'exec');
  coin.link(cast, 'as', set, 'target').link(cast, 'as', get, 'target').link(get, 'value', add, 'a').link(add, 'result', set, 'value');
  coin.link(set, 'then', coin.node('actor.destroy', {}, {}, [940, 96]), 'exec');
  const desk = edit(p, 'BP_Comptoir');
  wipe(desk.graph);
  const begin = desk.node('event.beginPlay', {}, {}, [64, 96]);
  const dcast = desk.node('cast.to', { class: made }, {}, [340, 96]);
  const dget = desk.node('var.getExternal', { owner: made, variable: pieces }, {}, [480, 300]);
  const text = desk.node('conv.intToString', {}, {}, [700, 300]);
  const show = desk.node('debug.printString', {}, {}, [700, 96]);
  desk.link(begin, 'then', dcast, 'exec').link(desk.node('game.getGameInstance', {}, {}, [120, 300]), 'result', dcast, 'object');
  desk.link(dcast, 'then', show, 'exec').link(dcast, 'as', dget, 'target').link(dget, 'value', text, 'in').link(text, 'result', show, 'text');
}

/** BP_Jeu, a GameInstance with Pieces (Integer), made the Game Instance Class. Returns its id. */
function addGameInstance(p: Project): string {
  const r0 = addClass(p, 'BP_Jeu', 'GameInstance');
  if (!r0.ok) throw new Error(r0.reason);
  const jeu = new ClassBuilder(r0.value, p);
  jeu.variable('Pieces', T.int, 0);
  const r = setGameInstanceClass(p, jeu.cls.id);
  if (!r.ok) throw new Error(r.reason);
  return jeu.cls.id;
}

/** The GameInstance Blueprint chosen in Maps & Modes, if any. */
const chosenInstance = (cx: CheckContext) => cx.project.classes.find((c) => c.id === cx.project.mapsModes?.gameInstanceClass);

/** The checks shared by « Le sac qui suit » and D27: two coins in the corridor, 2 at the desk of the workshop. */
const BAG_SCENARIO = [{ wait: 0.3 }, { teleport: COINS[0] }, { wait: 0.2 }, { teleport: COINS[1] }, { wait: 0.2 }, ...throughDoor];

function bagChecks(): Check[] {
  return [
    {
      id: 'instance-class',
      label: 'Un Blueprint GameInstance est la Game Instance Class',
      test: (cx) => {
        if (chosenInstance(cx)) return true;
        const made = cx.project.classes.find((c) => c.parent === 'GameInstance');
        return made
          ? `${made.name} existe, mais le jeu ne l’utilise pas : choisis-le dans Project Settings › Maps & Modes › Game Instance Class (menu ⋮). Sans ça, le jeu crée un GameInstance ordinaire et chaque Cast To ${made.name} échoue.`
          : 'Crée un Blueprint de classe parente GameInstance : Content Drawer › + Add › Blueprint Class › All Classes › GameInstance.';
      },
    },
    { id: 'travel', label: `La porte mène dans ${WORKSHOP}`, test: reachedWorkshop },
    {
      id: 'count',
      label: 'Dans l’atelier, le comptoir affiche 2',
      test: (cx) => {
        if (cx.level() !== WORKSHOP) return 'Le joueur n’est pas arrivé dans l’atelier.';
        const shown = printedNumbers(cx);
        const last = shown.at(-1);
        if (last === '2') return true;
        if (cx.prints().some((p) => normText(p).includes('vide'))) return 'Le comptoir dit que le sac est vide : son Cast To vers le GameInstance échoue (sortie Cast Failed).';
        if (last === '0')
          return 'Le comptoir affiche 0 : le compte est resté dans un objet du couloir, refait à neuf derrière la porte (le pion l’est, P17). Compte les pièces dans le GameInstance, et que le comptoir le lise.';
        return last === undefined
          ? 'Le comptoir n’affiche aucun nombre dans l’atelier : à son BeginPlay, Get Game Instance → Cast To → Print String du nombre de pièces.'
          : `Le comptoir affiche ${last} au lieu de 2 : chaque pièce doit ajouter 1, une seule fois.`;
      },
    },
    notion({
      id: 'instance-count',
      label: 'Le compte des pièces est dans le GameInstance',
      test: (cx) => {
        const gi = chosenInstance(cx);
        const v = gi?.variables.find((x) => x.type.category === 'int' && !x.type.container);
        if (!gi || !v) return 'Le GameInstance a besoin d’une variable Integer pour compter les pièces.';
        return cx.gameInstance(v.name) === 2 ? true : `${v.name} du GameInstance vaut ${String(cx.gameInstance(v.name))} à la fin, au lieu de 2 : ce sont les pièces qui doivent l’augmenter.`;
      },
    }),
    notion(usesNode('get-instance', 'BP_Comptoir', ['game.getGameInstance'], 'Le comptoir lit le GameInstance', 'BP_Comptoir doit lire le compte par Get Game Instance, puis Cast To.')),
    noRuntimeErrors(),
  ];
}

export const lessonBag: Lesson = {
  id: 'l-sac-qui-suit',
  module: LEVELS_MODULE,
  level: 'avance',
  number: 0,
  title: 'Le sac qui suit',
  situation:
    'Deux pièces traînent dans le couloir. Le joueur les ramasse, passe la porte, et le comptoir de l’atelier annonce combien il en a : 0. Comme dans P17, le compte est parti avec le pion du couloir. Il doit suivre le joueur d’un niveau à l’autre.',
  chain: { notion: 'game-instance', step: 'guided' },
  notions: ['GameInstance', 'Game Instance Class', 'Get Game Instance', 'Cast To'],
  remember:
    'Ce qui doit survivre à Open Level va dans le GameInstance : un seul objet de Play à Stop, choisi dans Project Settings › Maps & Modes › Game Instance Class. On l’atteint par Get Game Instance puis Cast To. Le reste du niveau, pion compris, est refait à neuf.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        '- **BP_Joueur** (le pion) : une variable **Pieces**.\n' +
        '- **BP_Piece**, deux fois dans le couloir : ActorBeginOverlap → Cast To BP_Joueur → Pieces + 1 → Destroy Actor.\n' +
        `- **BP_Porte** : Open Level vers ${WORKSHOP}.\n` +
        `- **BP_Comptoir**, dans ${WORKSHOP} : BeginPlay → Get Player Pawn → Cast To BP_Joueur → Print String de Pieces. Il affiche 0.`,
    },
    {
      title: 'Trois durées de vie',
      body:
        '- **Dans le niveau** : acteurs, pion, Player Controller, GameMode, widgets. Open Level les refait à neuf.\n' +
        '- **Pendant la partie** : le **GameInstance**. Le jeu en crée un seul au lancement et le garde jusqu’à la fermeture : ses variables traversent les portes.\n' +
        '- **Après la fermeture** : le **Save Game**, écrit sur le disque (« Le checkpoint »).\n\n' +
        'Le GameInstance n’est pas un acteur : il n’est dans aucun niveau, n’a ni BeginPlay ni composants. Ses événements à lui sont **Event Init** (au lancement) et **Event Shutdown** (à la fermeture).',
    },
    {
      title: 'Créer et brancher le GameInstance',
      body:
        '1. **Content Drawer** › **+ Add** › **Blueprint Class** › **All Classes** › **GameInstance**, nomme-le `BP_Jeu`. Ajoute-lui une variable **Pieces** (Integer).\n' +
        '2. Menu **⋮** › **Project Settings** › **Maps & Modes** › **Game Instance Class** = `BP_Jeu`. Sans ce réglage, le jeu crée un GameInstance ordinaire, et tout Cast To BP_Jeu échoue.',
    },
    {
      title: 'Compter dedans, le relire',
      body:
        '- **BP_Piece** : remplace le Cast To BP_Joueur par **Get Game Instance** → **Cast To BP_Jeu**, puis Pieces + 1 sur **As BP_Jeu**, et Destroy Actor.\n' +
        '- **BP_Comptoir** : **Get Game Instance** → **Cast To BP_Jeu** → Print String de Pieces.\n\n' +
        'Get Game Instance rend le même objet dans le couloir et dans l’atelier : c’est tout le secret. Pendant Play, l’Outliner montre une ligne GameInstance où lire Pieces en direct.',
    },
  ],
  objectives: ['BP_Jeu (GameInstance) est la Game Instance Class.', 'Les pièces ajoutent 1 au Pieces de BP_Jeu.', 'Dans l’atelier, le comptoir affiche 2.'],
  hints: [
    'Quel objet existe encore après la porte ? Où le choisit-on, et comment l’atteindre depuis une pièce ou le comptoir ?',
    'Blueprint GameInstance ; Maps & Modes › Game Instance Class ; Get Game Instance ; Cast To BP_Jeu ; Get / Set Pieces.',
    'Solution : BP_Jeu (GameInstance, Pieces), choisi dans Maps & Modes. BP_Piece : Overlap → Cast To BP_Jeu (Object = Get Game Instance) → Set Pieces (Pieces + 1) → Destroy Actor. BP_Comptoir : BeginPlay → Cast To BP_Jeu (Get Game Instance) → Print String (Pieces).',
  ],
  challenge: 'Fais afficher le compte dès le lancement, dans le couloir aussi : où le mettre pour qu’il s’affiche une seule fois, quel que soit le niveau de départ ?',
  setup: () => bagProject('Le sac qui suit'),
  scenario: BAG_SCENARIO,
  checks: bagChecks(),
  solve: solveBag,
  avoid: [
    {
      defs: ['save.toSlot', 'save.fromSlot'],
      label: 'Passer par un Save Game pour traverser la porte',
      why: 'Un slot survit à la fermeture du jeu : c’est trop pour une valeur qui ne doit durer que la partie, et il resterait à la partie suivante. Le GameInstance garde les valeurs d’un niveau à l’autre, puis disparaît à Stop.',
    },
  ],
};

// --------------------------------------------------------------- D27

export const debug27: Lesson = {
  id: 'd27-sac-vide',
  kind: 'debug',
  code: 'D27',
  module: LEVELS_MODULE,
  level: 'avance',
  number: 0,
  title: 'Le sac vide',
  situation:
    'Le sac marchait. Depuis qu’on a recopié le projet, les pièces restent par terre quand le joueur les touche, et dans l’atelier le comptoir annonce « Le sac est vide ». Aucune erreur dans l’Output Log.',
  notions: ['Game Instance Class', 'Cast Failed', 'Get Game Instance'],
  remember:
    'Get Game Instance rend toujours un objet, jamais None. Si la Game Instance Class n’est pas réglée, c’est un GameInstance ordinaire : chaque Cast To BP_Jeu part alors par Cast Failed, sans erreur.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        'La solution du « Sac qui suit » : **BP_Jeu** (GameInstance, Pieces) ; **BP_Piece** : Get Game Instance → Cast To BP_Jeu → Pieces + 1 → Destroy Actor ; **BP_Comptoir** : Get Game Instance → Cast To BP_Jeu → Print String. Le comptoir dit aussi « Le sac est vide » sur **Cast Failed**.',
    },
    {
      title: 'Ce qui cloche',
      body:
        'Les pièces ne disparaissent plus : la chaîne s’arrête avant Destroy Actor. Le comptoir prend la sortie Cast Failed. Pas d’Accessed None : la référence n’est pas vide, mais ce n’est pas ce que le Cast attend.\n\n' +
        'Pendant Play, ouvre l’Outliner : la ligne **GameInstance** dit de quelle classe est l’objet que rend Get Game Instance. Puis regarde où cette classe se choisit.',
    },
  ],
  objectives: ['Trouver pourquoi le sac reste vide.', 'Les pièces disparaissent, et le comptoir affiche 2.'],
  hints: [
    'Le Cast To BP_Jeu s’exécute bien, et part par Cast Failed. Get Game Instance rend un objet : de quelle classe ? Qui décide de cette classe ?',
    'Outliner de Play (ligne GameInstance) ; Project Settings › Maps & Modes › Game Instance Class.',
    'Solution : Game Instance Class est revenue sur GameInstance : le jeu crée un GameInstance ordinaire, que Cast To BP_Jeu refuse. Menu ⋮ › Project Settings › Maps & Modes › Game Instance Class = BP_Jeu. Aucun nœud à changer.',
  ],
  challenge: 'Dans BP_Comptoir, sur Cast Failed, affiche aussi la classe de l’objet reçu (Get Display Name, ou Get Object Name) : un message qui dit où chercher fait gagner du temps la prochaine fois.',
  setup() {
    const p = bagProject('Le sac vide');
    solveBag(p);
    const desk = edit(p, 'BP_Comptoir');
    const cast = Object.values(desk.graph.nodes).find((n) => n.def === 'cast.to')!.id;
    desk.link(cast, 'failed', desk.node('debug.printString', {}, { text: 'Le sac est vide' }, [700, 400]), 'exec');
    delete p.mapsModes!.gameInstanceClass;
    return p;
  },
  scenario: BAG_SCENARIO,
  checks: bagChecks(),
  solve(p) {
    const r = setGameInstanceClass(p, cls(p, 'BP_Jeu').id);
    if (!r.ok) throw new Error(r.reason);
  },
};
