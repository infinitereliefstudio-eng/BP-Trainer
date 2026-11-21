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
import { gameModeOf, playerClassesFor } from '../../model/gameMode';
import { ensureDefaultGameMode, setGameModeDefault, setGameModeOverride } from '../../operations/gameModeOps';
import { addFunction, addFunctionParam, overrideFunction } from '../../operations/functionOps';
import { addInputAction, addMapping, addMappingContext } from '../../operations/inputOps';
import { ensurePlayerInput } from '../ue5Input';
import { lineage } from '../../model/inheritance';
import { setGameInstanceClass } from '../../operations/levelAssetOps';
import { addClass, setPlayerClass } from '../../operations/projectOps';
import { T } from '../../types/pins';
import { ClassBuilder, edit, ProjectBuilder } from '../builder';
import { noRuntimeErrors, normText, notion, printedNumbers, usesNode } from '../checks';
import type { Check, CheckContext, Lesson } from '../types';
import { editable, getVar, nodeOf, override, PREDICT_METHOD, wipe } from './kit';
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
const DRONE_UP = 'Drone : montée';

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

// =================================================================== V7.51


// ------------------------------------------- Arriver par la bonne porte

const DOOR_N: [number, number] = [320, -200];
const DOOR_S: [number, number] = [320, 200];
const ARRIVAL_N: [number, number] = [250, -220];
const ARRIVAL_S: [number, number] = [250, 220];
const WORKSHOP_START: [number, number] = [-300, 0];

/**
 * Two doors at the end of the corridor (Sortie: Nord, Sud), both to the
 * workshop. The workshop has three Player Starts: the first in the middle,
 * then PlayerStart2 (tag Nord) and PlayerStart3 (tag Sud). BP_Jeu, the Game
 * Instance Class, has Arrivee (Name); BP_GameMode, the Default GameMode, is empty.
 */
function doorsProject(): Project {
  const pb = new ProjectBuilder('Arriver par la bonne porte');
  const jeu = pb.blueprint('BP_Jeu', 'GameInstance');
  jeu.variable('Arrivee', T.name, '');
  setGameInstanceClass(pb.project, jeu.cls.id);
  const gm = ensureDefaultGameMode(pb.project);
  if (!gm.ok) throw new Error(gm.reason);
  const door = doorClass(pb);
  const exit = editable(door, 'Sortie', T.name, 'Nord');
  openOnOverlap(door);
  pb.place(door, ...DOOR_N);
  override(pb, pb.place(door, ...DOOR_S), exit, 'Sud');
  pb.playerStart(...START);
  pb.level(WORKSHOP, (q) => {
    q.playerStart(...WORKSHOP_START);
    q.morePlayerStart(...ARRIVAL_N, 90, 'Nord');
    q.morePlayerStart(...ARRIVAL_S, 270, 'Sud');
  });
  return pb.project;
}

/**
 * The door writes its Sortie into BP_Jeu before Open Level. BP_GameMode
 * overrides Choose Player Start: Get All Actors Of Class (PlayerStart) →
 * Cast To BP_Jeu → For Each → Branch (Get Player Start Tag == Arrivee) →
 * Return Node (the element); Completed → Return Node (the first one).
 */
function solveDoors(p: Project): void {
  const jeu = cls(p, 'BP_Jeu').id;
  const arrivee = vid(p, 'BP_Jeu', 'Arrivee');
  const door = edit(p, 'BP_Porte');
  const open = nodeOf(door.graph, 'level.open');
  const ov = nodeOf(door.graph, 'event.actorBeginOverlap');
  for (const [id, l] of Object.entries(door.graph.links)) if (l.from.node === ov) delete door.graph.links[id];
  const cast = door.node('cast.to', { class: jeu }, {}, [340, 300]);
  const set = door.node('var.setExternal', { owner: jeu, variable: arrivee }, {}, [640, 300]);
  door.link(ov, 'then', cast, 'exec').link(door.node('game.getGameInstance', {}, {}, [120, 420]), 'result', cast, 'object');
  door.link(cast, 'then', set, 'exec').link(cast, 'as', set, 'target').link(getVar(door, 'Sortie', [420, 480]), 'value', set, 'value').link(set, 'then', open, 'exec');
  const gmCls = cls(p, 'BP_GameMode');
  const made = overrideFunction(p, gmCls, 'ChoosePlayerStart');
  if (!made.ok) throw new Error(made.reason);
  const g = made.value;
  const b = new ClassBuilder(gmCls, p).inGraph(g.id);
  const entry = nodeOf(g, 'fn.entry');
  const ret = nodeOf(g, 'fn.return');
  const out = g.fn!.outputs[0].id;
  for (const id of Object.keys(g.links)) delete g.links[id];
  const all = b.node('actor.getAllOfClass', {}, { class: 'PlayerStart' }, [300, 0]);
  const gcast = b.node('cast.to', { class: jeu }, {}, [600, 0]);
  const each = b.node('flow.forEachLoop', {}, {}, [900, 0]);
  const tag = b.node('playerStart.getTag', {}, {}, [900, 300]);
  const get = b.node('var.getExternal', { owner: jeu, variable: arrivee }, {}, [900, 420]);
  const same = b.node('name.equal', {}, {}, [1150, 300]);
  const branch = b.node('flow.branch', {}, {}, [1200, 0]);
  const first = b.node('array.get', {}, { index: 0 }, [1200, 520]);
  const fallback = b.node('fn.return', { graph: g.id }, {}, [1500, 400]);
  b.link(entry, 'then', all, 'exec').link(all, 'then', gcast, 'exec').link(b.node('game.getGameInstance', {}, {}, [400, 200]), 'result', gcast, 'object');
  b.link(gcast, 'then', each, 'exec').link(all, 'actors', each, 'array').link(each, 'body', branch, 'exec');
  b.link(each, 'element', tag, 'target').link(tag, 'result', same, 'a').link(gcast, 'as', get, 'target').link(get, 'value', same, 'b').link(same, 'result', branch, 'condition');
  b.link(branch, 'true', ret, 'exec').link(each, 'element', ret, out);
  b.link(each, 'completed', fallback, 'exec').link(all, 'actors', first, 'array').link(first, 'item', fallback, out);
}

/** After going through the door `side`: in the workshop, on the Player Start of that side. */
function arrivedBy(side: 'Nord' | 'Sud', at?: string): Check {
  const mine = side === 'Nord' ? ARRIVAL_N : ARRIVAL_S;
  const other = side === 'Nord' ? ARRIVAL_S : ARRIVAL_N;
  const near = (cx: CheckContext, [x, y]: [number, number]) => Math.hypot(cx.sim.player.x - x, cx.sim.player.y - y) < 60;
  return {
    id: side === 'Nord' ? 'nord' : 'sud',
    label: `Par la porte ${side.toLowerCase()}, le joueur arrive au Player Start ${side}`,
    at,
    test: (cx) => {
      const where = reachedWorkshop(cx);
      if (where !== true) return where;
      if (near(cx, mine)) return true;
      const level = cx.project.levels.find((l) => l.name === WORKSHOP)!;
      const gm = gameModeOf(cx.project, level);
      if (!gm || !lineage(cx.project, gm).some((c) => c.graphs.some((g) => g.override === 'ChoosePlayerStart')))
        return 'Le GameMode a choisi un Player Start au hasard, comme UE le fait sans consigne : surcharge sa fonction Choose Player Start (BP_GameMode › My Blueprint › Functions › Override) et rends le Player Start dont le Player Start Tag vaut Arrivee.';
      if (near(cx, other))
        return `Passé par la porte ${side.toLowerCase()}, le joueur arrive au ${side === 'Nord' ? 'sud' : 'nord'} : chaque porte doit noter sa propre Sortie (la variable de l’instance posée), et Choose Player Start chercher le Player Start dont le tag vaut Arrivee.`;
      if (near(cx, WORKSHOP_START))
        return cx.sim.log.some((l) => l.text.includes('Player start not found'))
          ? 'Choose Player Start a rendu None : dans UE, le joueur n’apparaîtrait pas. Rends le Player Start trouvé, et sur Completed un repli (le premier, Get index 0).'
          : 'Le joueur est arrivé sur le premier Player Start de l’atelier, au milieu : Choose Player Start n’a pas trouvé de Player Start dont le tag vaut Arrivee. La porte écrit-elle Arrivee avant Open Level ?';
      return `Le joueur est arrivé ailleurs qu’au Player Start ${side} : Choose Player Start doit rendre ce Player Start lui-même (Array Element de la boucle).`;
    },
  };
}

export const lessonRightDoor: Lesson = {
  id: 'l-bonne-porte',
  module: LEVELS_MODULE,
  level: 'avance',
  number: 0,
  // V7.53: several Player Starts and Choose Player Start (before: the pawn moved by BP_Arrivee at BeginPlay).
  revision: 2,
  title: 'Arriver par la bonne porte',
  situation:
    'Le couloir a deux portes vers l’atelier, au nord et au sud, et l’atelier trois Player Start : au milieu, au nord, au sud. Quelle que soit la porte, le joueur apparaît sur l’un d’eux, au hasard. Il doit arriver du côté par lequel il est entré.',
  chain: { notion: 'levels', step: 'guided' },
  recalls: ['other-bp'],
  notions: ['GameInstance', 'Player Start Tag', 'Choose Player Start', 'Get All Actors Of Class'],
  remember:
    'C’est le GameMode qui choisit où le joueur apparaît : sa fonction Choose Player Start, surchargée, cherche le Player Start dont le tag correspond. Le niveau suivant ne sait rien du précédent : la porte laisse un Name dans le GameInstance avant Open Level.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        `- **${MAIN}** : deux **BP_Porte**, au nord et au sud. Chacune a une variable **Sortie** (Name, Instance Editable) : Nord pour l’une, Sud pour l’autre. Leur graphe fait déjà Open Level vers ${WORKSHOP}.\n` +
        `- **${WORKSHOP}** : trois **Player Start**. Le premier au milieu, **PlayerStart2** au nord avec **Player Start Tag** = Nord, **PlayerStart3** au sud avec Sud (touche-les dans l’Outliner de l’atelier pour voir leurs Details).\n` +
        '- **BP_Jeu**, la Game Instance Class, a une variable **Arrivee** (Name), vide au départ. **BP_GameMode**, le Default GameMode, est vide.',
    },
    {
      title: 'L’idée : c’est le GameMode qui choisit',
      body:
        'À chaque niveau, avant les BeginPlay, le GameMode fait apparaître le joueur. Il appelle sa fonction **Choose Player Start** : par défaut, elle prend un Player Start libre, au hasard. On la **surcharge** pour choisir soi-même.\n\n' +
        'Rien de l’ancien niveau ne passe la porte, sauf le GameInstance. La porte y laisse un **Name** avant de partir (« Sud »), et Choose Player Start cherche le Player Start qui porte ce tag. On ne garde pas l’acteur porte : il disparaît avec le couloir.',
    },
    {
      title: 'La porte : noter d’où l’on part',
      body:
        'Dans **BP_Porte**, entre **ActorBeginOverlap** et **Open Level** :\n\n' +
        '1. **Get Game Instance** → **Cast To BP_Jeu**.\n2. **Set Arrivee** sur As BP_Jeu, valeur = **Sortie** (la variable de cette porte-ci).\n3. Puis Open Level, comme avant.\n\n' +
        'Chaque porte posée a sa propre Sortie : un seul graphe suffit pour les deux.',
    },
    {
      title: 'Le GameMode : choisir le Player Start',
      body:
        'Ouvre **BP_GameMode** › My Blueprint › Functions › **Override › ChoosePlayerStart**. Le graphe a déjà son entrée (Player) et son **Return Node** (Return Value) :\n\n' +
        '1. **Get All Actors Of Class** (Actor Class = **PlayerStart**), puis **Get Game Instance** → **Cast To BP_Jeu**.\n2. **For Each Loop** sur Out Actors. Dans Loop Body : **Branch**, Condition = **Equal (Name)** entre **Get Player Start Tag** (Array Element) et **Arrivee**.\n3. Sur True : **Return Node**, Return Value = Array Element. La boucle s’arrête là.\n4. Sur **Completed** (rien trouvé) : un second Return Node avec le premier Player Start (**Get** index 0). Ne rends jamais None : dans UE, le joueur n’apparaîtrait pas.\n\n' +
        'Au couloir, Arrivee est vide : le premier Player Start, sans tag, correspond aussi.',
    },
  ],
  objectives: ['La porte sud mène au Player Start Sud.', 'La porte nord mène au Player Start Nord.', 'Touche Vérifier : deux parties, une par porte.'],
  hints: [
    'Qui fait apparaître le joueur dans un niveau, et quelle fonction lui demande où ? Quelle donnée simple dit « je viens du sud » ?',
    'Get Game Instance ; Cast To BP_Jeu ; Set Arrivee (= Sortie) ; Override › Choose Player Start ; Get All Actors Of Class (PlayerStart) ; For Each Loop ; Get Player Start Tag ; Equal (Name) ; Branch ; Return Node.',
    'Solution : BP_Porte, Overlap → Cast To BP_Jeu (Get Game Instance) → Set Arrivee = Sortie → Open Level. BP_GameMode › Override › Choose Player Start : Get All Actors Of Class (PlayerStart) → Cast To BP_Jeu → For Each Loop → Branch (Get Player Start Tag == Arrivee) → Return Node (Array Element) ; Completed → Return Node (Get index 0).',
  ],
  challenge: 'Vide Arrivee une fois le joueur placé : que se passerait-il sinon en revenant au couloir par une porte qui n’a pas de Player Start à son nom ? Et si tu lançais Play directement dans l’atelier ?',
  setup: doorsProject,
  scenario: [{ wait: 0.3 }, { teleport: DOOR_S }, { wait: 0.4 }, { checkpoint: 'sud' }, { restart: true }, { wait: 0.3 }, { teleport: DOOR_N }, { wait: 0.4 }],
  checks: [
    arrivedBy('Sud', 'sud'),
    arrivedBy('Nord'),
    notion({
      id: 'note',
      label: 'Le GameInstance garde la porte d’arrivée',
      test: (cx) => (normText(String(cx.gameInstance('Arrivee') ?? '')) === 'nord' ? true : 'Arrivee, dans BP_Jeu, doit valoir la Sortie de la porte prise (Nord à la fin) : la porte l’écrit avant Open Level.'),
    }),
    notion({
      id: 'choose',
      label: 'Le GameMode choisit le Player Start (Choose Player Start)',
      test: (cx) => {
        const level = cx.project.levels.find((l) => l.name === WORKSHOP)!;
        const gm = gameModeOf(cx.project, level);
        const overridden = gm && lineage(cx.project, gm).some((c) => c.graphs.some((g) => g.override === 'ChoosePlayerStart'));
        return overridden ? true : 'Le joueur doit être placé par le GameMode de l’atelier : surcharge Choose Player Start (My Blueprint › Functions › Override), plutôt que de le déplacer après coup.';
      },
    }),
    noRuntimeErrors(),
  ],
  solve: solveDoors,
  avoid: [
    {
      defs: ['actor.setLocation'],
      label: 'Déplacer le pion après son apparition',
      why: 'Set Actor Location sur le pion au BeginPlay marche, mais le joueur est d’abord apparu ailleurs (et ses BeginPlay ont vu ce premier endroit). Dans UE, on laisse le GameMode le faire apparaître au bon Player Start : Choose Player Start.',
    },
    {
      defs: ['save.toSlot'],
      label: 'Écrire la porte dans un Save Game',
      why: 'Ça marcherait, mais un slot est fait pour survivre à la fermeture du jeu : la prochaine partie croirait arriver par la porte de la dernière fois. Pour la durée de la partie, le GameInstance suffit.',
    },
  ],
};

// ------------------------------------------- D28 L'objet ramassé réapparaît

const KEY: [number, number] = [-220, 0];
const BACK_DOOR: [number, number] = [300, 0];

/**
 * A key in the corridor (Id: Cle_Couloir); the door to the workshop, and a
 * door back. BP_Jeu keeps CleRamassee (Actor reference): set to the key when
 * picked up; at BeginPlay, the key destroys itself if it is valid. After a
 * round trip, the reference is None: the key is back.
 */
function keyProject(): Project {
  const pb = new ProjectBuilder('L’objet ramassé réapparaît');
  const jeu = pb.blueprint('BP_Jeu', 'GameInstance');
  const picked = jeu.variable('CleRamassee', T.object('Actor'));
  setGameInstanceClass(pb.project, jeu.cls.id);
  const key = pb.blueprint('BP_Cle');
  key.component('StaticMesh', 'Cle', { sizeX: 40, sizeY: 20, color: '#facc15', blocks: false });
  key.component('BoxCollision', 'Zone', { sizeX: 80, sizeY: 80 });
  editable(key, 'Id', T.name, 'Cle_Couloir');
  const ov = key.node('event.actorBeginOverlap', {}, {}, [64, 96]);
  const cast = key.node('cast.to', { class: jeu.cls.id }, {}, [340, 96]);
  const keep = key.node('var.setExternal', { owner: jeu.cls.id, variable: picked }, {}, [640, 96]);
  const said = key.node('debug.printString', {}, { text: 'Clé ramassée' }, [940, 96]);
  key.link(ov, 'then', cast, 'exec').link(key.node('game.getGameInstance', {}, {}, [120, 300]), 'result', cast, 'object');
  key.link(cast, 'then', keep, 'exec').link(cast, 'as', keep, 'target').link(key.node('actor.self', {}, {}, [440, 300]), 'self', keep, 'value');
  key.link(keep, 'then', said, 'exec').link(said, 'then', key.node('actor.destroy', {}, {}, [1240, 96]), 'exec');
  const begin = key.node('event.beginPlay', {}, {}, [64, 560]);
  const bcast = key.node('cast.to', { class: jeu.cls.id }, {}, [340, 560]);
  const get = key.node('var.getExternal', { owner: jeu.cls.id, variable: picked }, {}, [480, 760]);
  const valid = key.node('flow.isValid', {}, {}, [700, 560]);
  key.link(begin, 'then', bcast, 'exec').link(key.node('game.getGameInstance', {}, {}, [120, 760]), 'result', bcast, 'object');
  key.link(bcast, 'then', valid, 'exec').link(bcast, 'as', get, 'target').link(get, 'value', valid, 'object');
  key.link(valid, 'valid', key.node('actor.destroy', {}, {}, [1000, 560]), 'exec');
  pb.place(key, ...KEY);
  const door = doorClass(pb);
  openOnOverlap(door);
  pb.place(door, ...DOOR);
  pb.playerStart(...START);
  const back = pb.blueprint('BP_PorteRetour');
  back.component('StaticMesh', 'Cadre', { sizeX: 40, sizeY: 150, color: '#c08a3e', blocks: false });
  back.component('BoxCollision', 'Zone', { sizeX: 120, sizeY: 170 });
  back.link(back.node('event.actorBeginOverlap', {}, {}, [64, 96]), 'then', back.node('level.open', {}, { level: MAIN }, [400, 96]), 'exec');
  pb.level(WORKSHOP, (q) => {
    q.place(back, ...BACK_DOOR);
    q.playerStart(...WORKSHOP_START);
  });
  return pb.project;
}

/** A Set of Name in BP_Jeu: the key adds its Id when picked up, and destroys itself at BeginPlay if its Id is in. */
function solveKey(p: Project): void {
  const jeuCls = cls(p, 'BP_Jeu');
  const jeu = new ClassBuilder(jeuCls, p);
  const picked = jeu.variable('Ramasses', T.set(T.name));
  const key = edit(p, 'BP_Cle');
  wipe(key.graph);
  const ov = key.node('event.actorBeginOverlap', {}, {}, [64, 96]);
  const cast = key.node('cast.to', { class: jeuCls.id }, {}, [340, 96]);
  const list = key.node('var.getExternal', { owner: jeuCls.id, variable: picked }, {}, [480, 300]);
  const add = key.node('set.add', {}, {}, [640, 96]);
  const said = key.node('debug.printString', {}, { text: 'Clé ramassée' }, [940, 96]);
  key.link(ov, 'then', cast, 'exec').link(key.node('game.getGameInstance', {}, {}, [120, 300]), 'result', cast, 'object');
  key.link(cast, 'then', add, 'exec').link(cast, 'as', list, 'target').link(list, 'value', add, 'set').link(getVar(key, 'Id', [480, 420]), 'value', add, 'item');
  key.link(add, 'then', said, 'exec').link(said, 'then', key.node('actor.destroy', {}, {}, [1240, 96]), 'exec');
  const begin = key.node('event.beginPlay', {}, {}, [64, 560]);
  const bcast = key.node('cast.to', { class: jeuCls.id }, {}, [340, 560]);
  const blist = key.node('var.getExternal', { owner: jeuCls.id, variable: picked }, {}, [480, 760]);
  const has = key.node('set.contains', {}, {}, [700, 760]);
  const branch = key.node('flow.branch', {}, {}, [700, 560]);
  key.link(begin, 'then', bcast, 'exec').link(key.node('game.getGameInstance', {}, {}, [120, 760]), 'result', bcast, 'object');
  key.link(bcast, 'as', blist, 'target').link(blist, 'value', has, 'set').link(getVar(key, 'Id', [480, 880]), 'value', has, 'item');
  key.link(bcast, 'then', branch, 'exec').link(has, 'result', branch, 'condition').link(branch, 'true', key.node('actor.destroy', {}, {}, [1000, 560]), 'exec');
}

export const debug28: Lesson = {
  id: 'd28-objet-revient',
  kind: 'debug',
  code: 'D28',
  module: LEVELS_MODULE,
  level: 'avance',
  number: 0,
  title: 'L’objet ramassé réapparaît',
  situation:
    'Le joueur ramasse la clé du couloir, va à l’atelier, puis revient. La clé est de nouveau par terre. Pourtant, BP_Jeu (le GameInstance) garde la clé ramassée, et la clé vérifie au BeginPlay si elle l’a été. Aucune erreur.',
  notions: ['GameInstance', 'Is Valid', 'Set', 'Name'],
  remember:
    'Une référence d’acteur ne survit pas à son niveau : l’acteur est détruit avec lui, la référence vaut None derrière la porte. Ce qui doit durer se garde sous une forme qui ne dépend pas du niveau : un nom, un numéro (ici l’Id de la clé, dans un Set of Name du GameInstance).',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        '- **BP_Jeu** (Game Instance Class) : **CleRamassee**, une référence d’acteur.\n' +
        '- **BP_Cle** (Id = Cle_Couloir, Instance Editable) : à l’overlap, Set CleRamassee = **Self**, Print « Clé ramassée », Destroy Actor. Au BeginPlay : **Is Valid** (CleRamassee) → Destroy Actor.\n' +
        `- Une porte vers ${WORKSHOP}, et dans l’atelier **BP_PorteRetour**, qui ramène au couloir.\n\n` +
        'Le test : la clé, la porte, la porte du retour.',
    },
    {
      title: 'Ce qui cloche',
      body:
        'Au retour, le couloir est un niveau neuf : sa clé est un nouvel acteur, qui fait son BeginPlay. Que vaut alors CleRamassee ?\n\n' +
        'Pendant Play, ouvre l’Outliner, ligne **GameInstance** : regarde CleRamassee avant la porte, puis après le retour.',
    },
  ],
  objectives: ['Trouver pourquoi la clé revient.', 'Après l’aller-retour, la clé n’est plus dans le couloir.'],
  hints: [
    'Le GameInstance garde bien quelque chose. Mais ce qu’il garde, l’acteur clé du premier passage, existe-t-il encore au retour ?',
    'Is Valid ; référence d’acteur après Open Level ; Set of Name ; Add ; Contains ; la variable Id de la clé.',
    'Solution : la référence vaut None après l’aller-retour (sa clé a été détruite avec le niveau), Is Valid est faux et la clé reste. Garde plutôt son Id : une variable Ramasses (Set of Name) dans BP_Jeu ; à l’overlap, Add (Id) ; au BeginPlay, Contains (Id) → Branch → Destroy Actor.',
  ],
  challenge: 'Pose une deuxième clé (Id = Cle_Atelier) dans l’atelier : sans rien changer d’autre, chacune doit se souvenir d’elle-même.',
  setup: keyProject,
  scenario: [{ wait: 0.3 }, { teleport: KEY }, { wait: 0.2 }, { teleport: DOOR }, { wait: 0.4 }, { teleport: BACK_DOOR }, { wait: 0.4 }],
  checks: [
    {
      id: 'picked',
      label: 'La clé se ramasse au premier passage',
      test: (cx) => (cx.prints().filter((m) => m === 'Clé ramassée').length === 1 ? true : 'Au premier passage, toucher la clé doit afficher « Clé ramassée » et la faire disparaître, une fois.'),
    },
    {
      id: 'back',
      label: 'Le joueur est revenu dans le couloir',
      test: (cx) => (cx.levels().join(' › ') === `${MAIN} › ${WORKSHOP} › ${MAIN}` ? true : `Le jeu devait aller dans l’atelier puis revenir : il a joué ${cx.levels().join(' › ')}.`),
    },
    {
      id: 'gone',
      label: 'Au retour, la clé n’est plus là',
      test: (cx) =>
        cx.sim.actors.some((a) => a.className === 'BP_Cle' && !a.destroyed)
          ? 'La clé est revenue : la référence gardée désignait l’acteur clé du premier passage, détruit avec son niveau. Derrière la porte elle vaut None, et Is Valid répond faux. Garde ce qui ne dépend pas du niveau : l’Id de la clé, dans un Set of Name du GameInstance.'
          : true,
    },
    noRuntimeErrors(),
  ],
  solve: solveKey,
};

// ---------------------------------------------- T6 Le pion de l'atelier

function droneProject(): Project {
  const pb = new ProjectBuilder('Le pion de l’atelier');
  const player = pb.blueprint('BP_Joueur', 'Pawn');
  setPlayerClass(pb.project, player.cls.id);
  // The project is set up as UE5's template: BP_PlayerController adds IMC_Joueur (empty here).
  ensurePlayerInput(pb.project, []);
  const drone = pb.blueprint('BP_Drone', 'Pawn');
  drone.link(drone.node('event.beginPlay', {}, {}, [64, 96]), 'then', drone.node('debug.printString', {}, { text: 'Drone en ligne' }, [400, 96]), 'exec');
  // The drone's own controls: IMC_Drone (E → IA_Monter) exists, nothing adds it yet.
  const action = must(addInputAction(pb.project, 'IA_Monter'));
  const imc = must(addMappingContext(pb.project, 'IMC_Drone'));
  must(addMapping(pb.project, imc.id, action.id, 'E'));
  drone.link(drone.node('input.action', { action: action.id }, {}, [64, 400]), 'started', drone.node('debug.printString', {}, { text: DRONE_UP }, [400, 400]), 'exec');
  const door = doorClass(pb);
  openOnOverlap(door);
  pb.place(door, ...DOOR);
  pb.playerStart(...START);
  const bench = pb.blueprint('BP_Etabli');
  bench.component('StaticMesh', 'Etabli', { sizeX: 160, sizeY: 70, color: '#64748b', blocks: false });
  pb.level(WORKSHOP, (q) => {
    q.place(bench, 160, -160);
    q.playerStart(...WORKSHOP_START);
  });
  return pb.project;
}

function solveDrone(p: Project): void {
  // The drone adds its Mapping Context to the Player Controller that possesses it, as it begins play.
  const drone = edit(p, 'BP_Drone');
  const said = Object.values(drone.graph.nodes).find((n) => n.def === 'debug.printString' && n.defaults.text === 'Drone en ligne')!.id;
  const add = drone.node('input.addMappingContext', { context: p.mappingContexts.find((c) => c.name === 'IMC_Drone')!.id }, {}, [700, 96]);
  const sub = drone.node('input.subsystem', {}, {}, [460, 250]);
  drone.link(said, 'then', add, 'exec').link(drone.node('player.getController', {}, {}, [200, 250]), 'result', sub, 'controller').link(sub, 'result', add, 'target');
  const made = addClass(p, 'BP_GameModeAtelier', 'GameModeBase');
  if (!made.ok) throw new Error(made.reason);
  const pawn = setGameModeDefault(p, made.value.id, 'defaultPawnClass', cls(p, 'BP_Drone').id);
  if (!pawn.ok) throw new Error(pawn.reason);
  const level = p.levels.find((l) => l.name === WORKSHOP)!;
  const r = setGameModeOverride(p, level.id, made.value.id);
  if (!r.ok) throw new Error(r.reason);
}

export const transferDrone: Lesson = {
  id: 't6-pion-atelier',
  code: 'T6',
  // V7.54: the drone's own controls (IMC_Drone, added through Get Player Controller), the template's BP_PlayerController.
  revision: 2,
  module: LEVELS_MODULE,
  level: 'avance',
  number: 0,
  title: 'Le pion de l’atelier',
  situation:
    'Dans l’atelier, on ne marche pas : on pilote un drone. BP_Drone est prêt, mais derrière la porte le joueur est toujours BP_Joueur. Dans le couloir, il doit le rester.',
  chain: { notion: 'game-mode', step: 'transfer' },
  notions: ['GameMode', 'Default Pawn Class', 'GameMode Override', 'World Settings'],
  remember:
    'C’est le GameMode du niveau qui fait apparaître le joueur. Un niveau qui veut un autre pion a son propre GameMode, choisi dans ses World Settings (GameMode Override) ; les autres gardent le Default GameMode.',
  cards: [
    {
      title: 'Cahier des charges',
      body:
        '**BP_Joueur** est le pion de tout le projet : Default Pawn Class de **BP_GameMode**, le Default GameMode (Project Settings › Maps & Modes). **BP_Drone** est un autre Blueprint Pawn ; son BeginPlay affiche « Drone en ligne ».\n\n' +
        `- Dans ${WORKSHOP}, le joueur est un **BP_Drone**.\n` +
        `- Dans ${MAIN}, il reste un **BP_Joueur**.\n` +
        '- Un troisième niveau ajouté plus tard doit avoir BP_Joueur sans qu’on y touche.\n' +
        `- Le drone a ses commandes : **IMC_Drone** (E → IA_Monter) est prêt, et l’événement IA_Monter de BP_Drone affiche « ${DRONE_UP} ». Mais personne n’ajoute IMC_Drone : le drone doit l’ajouter lui-même en apparaissant, au Player Controller du joueur.`,
    },
    {
      title: 'Comment t’y prendre',
      body:
        'Tu as déjà réglé une Player Controller Class dans un GameMode (« Les contrôles au Player Controller »). Ici, même mécanique, mais pour un seul niveau. Avant de toucher à quoi que ce soit :\n\n' +
        '1. Qui décide du pion, et à quel moment ?\n2. Changer BP_GameMode, est-ce changer un niveau ou tous ?\n3. Où un niveau dit-il « pas le GameMode par défaut, celui-ci » ?\n4. Un Mapping Context s’ajoute à quoi, et qui peut l’atteindre depuis le drone (« Les contrôles au Player Controller ») ?\n\n' +
        'Indice de lieu : dans l’Outliner d’un niveau, la ligne **WorldSettings**.',
    },
  ],
  objectives: [`Dans ${WORKSHOP}, le joueur est BP_Drone.`, `Dans ${MAIN}, il reste BP_Joueur.`, 'Le Default GameMode garde BP_Joueur.', 'Dans l’atelier, E fait monter le drone.'],
  hints: [
    'Qui fait apparaître le pion d’un niveau ? Et un niveau peut-il en choisir un autre que celui du projet ?',
    'Content Drawer › Blueprint Class › Game Mode Base ; Class Defaults › Default Pawn Class ; Outliner de l’atelier › WorldSettings › GameMode Override ; Get Player Controller ; Enhanced Input Local Player Subsystem ; Add Mapping Context.',
    `Solution : un nouveau GameMode (BP_GameModeAtelier), Default Pawn Class = BP_Drone ; ouvre ${WORKSHOP}, Outliner › WorldSettings › GameMode Override = BP_GameModeAtelier. BP_GameMode ne change pas. BP_Drone, après « Drone en ligne » : Add Mapping Context (IMC_Drone), Target = Enhanced Input Local Player Subsystem de Get Player Controller.`,
  ],
  challenge: 'De retour au couloir, IMC_Drone est-il encore là ? (Le Player Controller est refait à chaque niveau.) Puis : le GameMode de l’atelier peut-il hériter de BP_GameMode pour ne changer que le pion ?',
  setup: droneProject,
  scenario: [{ wait: 0.3 }, { checkpoint: 'debut' }, ...throughDoor, { press: 'E' }, { wait: 0.1 }, { release: 'E' }, { wait: 0.1 }],
  recalls: ['player-controller', 'enhanced-input'],
  checks: [
    {
      id: 'corridor',
      label: `Dans ${MAIN}, le joueur est BP_Joueur`,
      at: 'debut',
      test: (cx) =>
        cx.sim.player.className === 'BP_Joueur'
          ? true
          : `Dans le couloir, le joueur est ${cx.sim.player.className || 'le pion par défaut'} : le Default GameMode (BP_GameMode) doit garder BP_Joueur. Seul l’atelier change.`,
    },
    { id: 'travel', label: `La porte mène dans ${WORKSHOP}`, test: reachedWorkshop },
    {
      id: 'drone',
      label: `Dans ${WORKSHOP}, le joueur est BP_Drone`,
      test: (cx) => {
        if (cx.level() !== WORKSHOP) return 'Le joueur n’est pas arrivé dans l’atelier.';
        if (cx.sim.player.className === 'BP_Drone') return true;
        const level = cx.project.levels.find((l) => l.name === WORKSHOP);
        if (!level?.gameModeOverride) return `Dans l’atelier, le joueur est encore ${cx.sim.player.className || 'le pion par défaut'} : l’atelier prend le Default GameMode. Donne-lui le sien : World Settings › GameMode Override.`;
        return `L’atelier a son GameMode (${cx.sim.gameMode.className}), mais sa Default Pawn Class n’est pas BP_Drone : règle-la dans ses Class Defaults.`;
      },
    },
    {
      id: 'online',
      label: 'Le drone annonce « Drone en ligne »',
      test: (cx) => (cx.prints().includes('Drone en ligne') ? true : 'Le BeginPlay de BP_Drone ne s’est pas exécuté : le drone n’a pas été créé comme pion.'),
    },
    notion({
      id: 'override',
      label: 'L’atelier a son GameMode (GameMode Override)',
      test: (cx) => {
        const level = cx.project.levels.find((l) => l.name === WORKSHOP)!;
        if (!level.gameModeOverride) return 'Le pion de l’atelier doit venir d’un GameMode Override dans ses World Settings.';
        // A level without override, as one added later: the Default GameMode's pawn, whatever the corridor's own settings.
        const later = { ...cx.project.levels.find((l) => l.name === MAIN)!, gameModeOverride: undefined };
        return playerClassesFor(cx.project, later).pawn?.name === 'BP_Joueur'
          ? true
          : 'Le Default GameMode doit garder BP_Joueur : un niveau ajouté plus tard, sans GameMode Override, aurait sinon un autre pion. Seul l’atelier change, par son GameMode Override.';
      },
    }),
    {
      id: 'controls',
      label: 'Dans l’atelier, E fait monter le drone',
      test: (cx) => {
        if (cx.prints().includes(DRONE_UP)) return true;
        if (cx.sim.player.className !== 'BP_Drone') return 'Le drone n’est pas le joueur dans l’atelier : règle d’abord son GameMode.';
        return 'E ne fait rien au drone : IMC_Drone n’est ajouté nulle part. À son BeginPlay, BP_Drone fait Add Mapping Context (IMC_Drone) sur l’Enhanced Input Local Player Subsystem de Get Player Controller.';
      },
    },
    noRuntimeErrors(),
  ],
  solve: solveDrone,
};

// ------------------------------------------- A4 Reprendre la partie

const RESUME_SCENARIO = [
  { wait: 0.3 },
  { checkpoint: 'debut' },
  { teleport: COINS[0] },
  { wait: 0.2 },
  ...throughDoor,
  { checkpoint: 'atelier' },
  { restart: true as const },
  { wait: 0.6 },
];

/** The int variable of the chosen GameInstance (the bag), if any. */
function bagValue(cx: CheckContext): number | undefined {
  const v = chosenInstance(cx)?.variables.find((x) => x.type.category === 'int' && !x.type.container);
  return v ? Number(cx.gameInstance(v.name)) : undefined;
}

/**
 * BP_Sauvegarde (Niveau, Pieces). BP_Jeu has a function Sauver (Niveau: Name)
 * that writes the slot « Partie »; the door calls it with its destination just
 * before Open Level, and Event Shutdown with the level being played (on a
 * phone, Shutdown does not come when the app is killed: the door's save is
 * the one that counts). Event Init reads the slot back, Pieces at once, the
 * level in Reprendre; BP_GameMode's BeginPlay opens Reprendre if set, then clears it.
 */
function solveResume(p: Project): void {
  const savePb = new ClassBuilder(must(addClass(p, 'BP_Sauvegarde', 'SaveGame')), p);
  const niveau = savePb.variable('Niveau', T.name, '');
  const savedPieces = savePb.variable('Pieces', T.int, 0);
  const saveId = savePb.cls.id;
  const jeuCls = cls(p, 'BP_Jeu');
  const jeu = new ClassBuilder(jeuCls, p);
  const resume = jeu.variable('Reprendre', T.name, '');
  const pieces = vid(p, 'BP_Jeu', 'Pieces');
  // Sauver (Niveau) : Create → Set Niveau → Set Pieces → Save Game to Slot (« Partie »).
  const fn = addFunction(jeuCls, 'Sauver');
  const param = addFunctionParam(p, jeuCls, fn.id, 'inputs', T.name)!;
  param.name = 'Niveau';
  const f = jeu.inGraph(fn.id);
  const entry = nodeOf(fn, 'fn.entry');
  const create = f.node('save.create', {}, { saveClass: saveId }, [340, 0]);
  const setLevel = f.node('var.setExternal', { owner: saveId, variable: niveau }, {}, [640, 0]);
  const setBag = f.node('var.setExternal', { owner: saveId, variable: savedPieces }, {}, [940, 0]);
  const write = f.node('save.toSlot', {}, { slot: 'Partie' }, [1240, 0]);
  f.link(entry, 'then', create, 'exec').link(create, 'then', setLevel, 'exec').link(create, 'result', setLevel, 'target').link(entry, param.id, setLevel, 'value');
  f.link(setLevel, 'then', setBag, 'exec').link(create, 'result', setBag, 'target').link(f.node('var.get', { variable: pieces }, {}, [760, 200]), 'value', setBag, 'value');
  f.link(setBag, 'then', write, 'exec').link(create, 'result', write, 'object');
  // Shutdown → Sauver (Get Current Level Name, as a Name).
  const down = jeu.node('event.gameShutdown', {}, {}, [64, 96]);
  const callDown = jeu.node('call.function', { owner: jeuCls.id, graph: fn.id }, {}, [640, 96]);
  const toName = jeu.node('conv.stringToName', {}, {}, [440, 300]);
  jeu.link(down, 'then', callDown, 'exec').link(jeu.node('level.currentName', {}, {}, [200, 300]), 'result', toName, 'in').link(toName, 'result', callDown, param.id);
  // Init → Load → Cast → Set Pieces → Set Reprendre.
  const init = jeu.node('event.gameInit', {}, {}, [64, 560]);
  const load = jeu.node('save.fromSlot', {}, { slot: 'Partie' }, [340, 560]);
  const cast = jeu.node('cast.to', { class: saveId }, {}, [640, 560]);
  const keepBag = jeu.node('var.set', { variable: pieces }, {}, [940, 560]);
  const keepLevel = jeu.node('var.set', { variable: resume }, {}, [1240, 560]);
  jeu.link(init, 'then', load, 'exec').link(load, 'then', cast, 'exec').link(load, 'result', cast, 'object').link(cast, 'then', keepBag, 'exec');
  const g1 = jeu.node('var.getExternal', { owner: saveId, variable: savedPieces }, {}, [800, 760]);
  const g2 = jeu.node('var.getExternal', { owner: saveId, variable: niveau }, {}, [1100, 760]);
  jeu.link(g1, 'value', keepBag, 'value').link(g2, 'value', keepLevel, 'value');
  jeu.link(cast, 'as', g1, 'target').link(cast, 'as', g2, 'target').link(keepBag, 'then', keepLevel, 'exec');
  // BP_Porte: Overlap → Cast To BP_Jeu → Sauver (Lvl_Atelier) → Open Level, as before.
  const door = edit(p, 'BP_Porte');
  const ov = nodeOf(door.graph, 'event.actorBeginOverlap');
  const open = nodeOf(door.graph, 'level.open');
  for (const [id, l] of Object.entries(door.graph.links)) if (l.from.node === ov) delete door.graph.links[id];
  const dcast = door.node('cast.to', { class: jeuCls.id }, {}, [340, 300]);
  const callDoor = door.node('call.function', { owner: jeuCls.id, graph: fn.id }, { [param.id]: WORKSHOP }, [640, 300]);
  door.link(ov, 'then', dcast, 'exec').link(door.node('game.getGameInstance', {}, {}, [120, 420]), 'result', dcast, 'object');
  door.link(dcast, 'then', callDoor, 'exec').link(dcast, 'as', callDoor, 'target').link(callDoor, 'then', open, 'exec');
  // BP_GameMode: BeginPlay → Cast To BP_Jeu → Is None (Reprendre)? false → Open Level (Reprendre) → Reprendre = None.
  const gm = edit(p, 'BP_GameMode');
  const begin = gm.node('event.beginPlay', {}, {}, [64, 96]);
  const gcast = gm.node('cast.to', { class: jeuCls.id }, {}, [340, 96]);
  const get = gm.node('var.getExternal', { owner: jeuCls.id, variable: resume }, {}, [480, 300]);
  const none = gm.node('name.isNone', {}, {}, [700, 300]);
  const branch = gm.node('flow.branch', {}, {}, [700, 96]);
  const go = gm.node('level.open', {}, {}, [1000, 96]);
  const clear = gm.node('var.setExternal', { owner: jeuCls.id, variable: resume }, { value: '' }, [1300, 96]);
  gm.link(begin, 'then', gcast, 'exec').link(gm.node('game.getGameInstance', {}, {}, [120, 300]), 'result', gcast, 'object');
  gm.link(gcast, 'as', get, 'target').link(get, 'value', none, 'in').link(gcast, 'then', branch, 'exec').link(none, 'result', branch, 'condition');
  gm.link(branch, 'false', go, 'exec').link(get, 'value', go, 'level').link(go, 'then', clear, 'exec').link(gcast, 'as', clear, 'target');
}

function must<T>(r: { ok: true; value: T } | { ok: false; reason: string }): T {
  if (!r.ok) throw new Error(r.reason);
  return r.value;
}

export const autonomyResume: Lesson = {
  id: 'a4-reprendre',
  code: 'A4',
  chain: { notion: 'game-instance', step: 'autonomy', after: { lesson: 'l-sac-qui-suit', days: 2 } },
  module: LEVELS_MODULE,
  level: 'avance',
  number: 0,
  title: 'Reprendre la partie',
  situation:
    'Le sac suit le joueur d’un niveau à l’autre. Mais si on quitte le jeu dans l’atelier, tout repart de zéro au lancement suivant, au couloir. Il faut reprendre là où on s’était arrêté : au bon niveau, avec son sac.',
  notions: ['GameInstance', 'Event Init', 'Event Shutdown', 'SaveGame', 'Open Level (by Name)'],
  remember:
    'Deux durées, deux outils : le GameInstance garde la partie en cours d’un niveau à l’autre ; le Save Game la garde d’un lancement à l’autre. Le GameInstance fait le lien : il relit le slot au lancement (Event Init). Il l’écrit aux moments clés (une porte) et à Event Shutdown en plus : sur un téléphone, fermer l’appli ne déclenche pas Shutdown.',
  cards: [
    {
      title: 'Cahier des charges',
      body:
        'Le projet du « Sac qui suit », résolu : **BP_Jeu** (Game Instance Class) compte les pièces, le comptoir de l’atelier les affiche. **BP_GameMode** est le Default GameMode (son pion : BP_Joueur).\n\n' +
        '- Une première partie, sans sauvegarde, commence au couloir avec un sac vide.\n' +
        '- Le joueur ramasse une pièce, passe la porte : le comptoir affiche 1.\n' +
        '- Il quitte (Stop), puis relance (Play) : la partie **reprend dans l’atelier**, et le comptoir affiche encore **1**.\n\n' +
        'Le test fait exactement ça : une pièce, la porte, Stop, Play.',
    },
    {
      title: 'Comment t’y prendre',
      body:
        'Pas de liste de nœuds. Réponds d’abord :\n\n' +
        '1. Quoi écrire sur le disque, et sous quelle forme (un niveau peut-il s’écrire comme un nom) ?\n2. À quels moments écrire, pour avoir le dernier état même si le joueur ferme l’appli d’un coup (sur un téléphone, Event Shutdown n’a alors pas lieu) ? Et quand relire ?\n3. Au lancement, qui peut faire Open Level vers le niveau retrouvé, et quand ? (Event Init vient avant le GameMode et le joueur.)\n4. Que se passe-t-il au lancement suivant si le niveau retrouvé est déjà le bon ?\n\n' +
        'Les indices s’ouvrent après un premier essai.',
    },
  ],
  objectives: ['Sans sauvegarde : le couloir, un sac vide.', 'Après Stop puis Play : l’atelier, et le sac retrouvé.'],
  hints: [
    'Quels sont les deux moments à lui du GameInstance ? Et sous quelle forme écrire le niveau en cours ?',
    'SaveGame (Niveau en Name, Pieces) ; une fonction Sauver (Niveau) dans BP_Jeu ; la porte et Event Shutdown l’appellent ; Get Current Level Name ; String to Name ; Save Game to Slot ; Event Init ; Load Game from Slot ; Cast To ; BeginPlay du GameMode ; Open Level (by Name).',
    'Solution : BP_Sauvegarde (Niveau, Pieces). BP_Jeu : une fonction Sauver (Niveau : Name) → Create Save Game Object → Niveau, Pieces → Save Game to Slot (« Partie ») ; BP_Porte l’appelle avec Lvl_Atelier juste avant Open Level, Event Shutdown avec Get Current Level Name. Event Init → Load Game from Slot → Cast To BP_Sauvegarde → Pieces, et un Name Reprendre = Niveau. BP_GameMode : BeginPlay → Cast To BP_Jeu → si Reprendre n’est pas None → Open Level (Reprendre), puis Reprendre = None.',
  ],
  challenge: 'Ajoute « Nouvelle partie » : un moyen d’effacer le slot (Delete Game in Slot) pour repartir du couloir. Et la pièce ramassée après la dernière porte : à quel autre moment la sauver, sans écrire à chaque image ?',
  setup() {
    const p = bagProject('Reprendre la partie');
    solveBag(p);
    return p;
  },
  scenario: RESUME_SCENARIO,
  checks: [
    {
      id: 'fresh',
      label: 'Sans sauvegarde : le couloir, sac vide',
      at: 'debut',
      test: (cx) => {
        if (cx.level() !== MAIN) return `Sans aucune sauvegarde, la partie doit commencer au couloir : elle est partie vers ${cx.level()}.`;
        return bagValue(cx) === 0 ? true : 'Sans sauvegarde, le sac doit être vide au lancement.';
      },
    },
    {
      id: 'first',
      label: 'Avant de quitter : l’atelier, le comptoir affiche 1',
      at: 'atelier',
      test: (cx) => (cx.level() === WORKSHOP && printedNumbers(cx).at(-1) === '1' ? true : 'Avant de quitter, le joueur doit être dans l’atelier et le comptoir afficher 1 : le sac du « Sac qui suit » doit toujours marcher.'),
    },
    {
      id: 'level',
      label: 'Après Stop puis Play, la partie reprend dans l’atelier',
      test: (cx) =>
        cx.level() === WORKSHOP
          ? true
          : `Après Stop puis Play, la partie est dans ${cx.level()} : au lancement, rien ne relit le niveau sauvé pour y retourner (Open Level vers le nom retrouvé).`,
    },
    {
      id: 'bag',
      label: 'Après Stop puis Play, le sac a toujours 1 pièce',
      test: (cx) => {
        const v = bagValue(cx);
        if (v === 1) return printedNumbers(cx).at(-1) === '1' ? true : 'Le sac a bien 1 pièce, mais le comptoir de l’atelier ne l’a pas affiché après la reprise.';
        return `Après Stop puis Play, le sac vaut ${v ?? '?'} : le GameInstance est neuf à chaque lancement. Il doit relire le slot au lancement (Event Init), et le slot avoir été écrit avant (Event Shutdown, ou à la porte).`;
      },
    },
    noRuntimeErrors(),
  ],
  solve: solveResume,
};
