/**
 * The GameInstance, as in UE: one object for the whole game, made before
 * the first level and kept through Open Level (core/runtime/game.ts). Its
 * class is chosen in Project Settings › Maps & Modes › Game Instance Class.
 * It is not an actor: no BeginPlay, Tick, overlap, input, Timeline or
 * Construction Script; its own events are Event Init and Event Shutdown.
 */
import { T } from '../../types/pins';
import { dataIn, dataOut, execIn, execOut, type NodeDefinition } from '../definition';

const CAT = 'Game';

export const gameInstanceNodes: NodeDefinition[] = [
  {
    id: 'event.gameInit',
    title: 'Event Init',
    category: 'Add Event',
    kind: 'event',
    unique: true,
    allowedIn: ['event'],
    description:
      'Le début d’un GameInstance : une seule fois, au lancement du jeu, avant le BeginPlay du premier niveau. Aucun niveau n’est encore joué : pas de joueur, pas de widget. On y met les valeurs de départ de la session.',
    keywords: ['init', 'initialisation', 'debut', 'lancement', 'game instance', 'demarrage'],
    pins: [execOut()],
  },
  {
    id: 'event.gameShutdown',
    title: 'Event Shutdown',
    category: 'Add Event',
    kind: 'event',
    unique: true,
    allowedIn: ['event'],
    description:
      'La fin d’un GameInstance : quand le jeu se ferme (Stop, ou Quit Game), après l’End Play du dernier niveau. Dernier moment pour écrire un Save Game. Rien ne le garantit si le jeu plante.',
    keywords: ['shutdown', 'fermeture', 'fin', 'quitter', 'game instance'],
    pins: [execOut()],
  },
  {
    id: 'game.getGameInstance',
    title: 'Get Game Instance',
    category: CAT,
    kind: 'pure',
    description:
      'Le GameInstance de la partie : le même objet dans tous les niveaux, de Play à Stop. Le nœud renvoie un GameInstance ; pour lire ses variables, Cast To BP_… (la classe choisie dans Project Settings › Maps & Modes › Game Instance Class, sans quoi le Cast échoue).',
    keywords: ['game instance', 'gameinstance', 'instance', 'session', 'persistant', 'garder entre niveaux'],
    pins: [dataOut('result', 'Return Value', T.object('GameInstance'))],
  },
  {
    id: 'game.quitGame',
    title: 'Quit Game',
    category: CAT,
    kind: 'function',
    // A Construction Script also runs in the editor: quitting from there makes no sense.
    allowedIn: ['event', 'function'],
    description:
      'Ferme le jeu. Ce n’est pas immédiat : la chaîne finit, puis tout le niveau reçoit Event End Play et le GameInstance Event Shutdown. En Play dans l’éditeur, c’est comme toucher Stop. Quit Preference « Background » : le jeu passe en arrière-plan (sur téléphone) au lieu de se fermer ; en Play, rien ne se passe.',
    keywords: ['quit', 'quitter', 'fermer', 'exit', 'fin du jeu', 'quit game'],
    pins: [
      execIn(),
      dataIn('player', 'Specific Player', T.object('PlayerController')),
      dataIn('preference', 'Quit Preference', T.enum('EQuitPreference'), { default: 0 }),
      dataIn('ignorePlatform', 'Ignore Platform Restrictions', T.bool, { default: false }),
      execOut(),
    ],
  },
];

/** Events that only exist in a GameInstance. */
export const GAME_INSTANCE_ONLY = new Set(['event.gameInit', 'event.gameShutdown']);

/** What a GameInstance's graph may not contain, as in UE: it is an object, not an actor, never in the level. */
export const NOT_IN_GAME_INSTANCE: Record<string, string> = {
  'event.beginPlay': 'un GameInstance n’a pas d’Event BeginPlay : Event Init joue ce rôle, une fois au lancement du jeu.',
  'event.tick': 'un GameInstance n’a pas d’Event Tick : ce n’est pas un acteur. Pour un rythme, un timer (Set Timer by Event).',
  'event.endPlay': 'Event End Play est un événement d’acteur. Le GameInstance reçoit Event Shutdown quand le jeu se ferme.',
  'event.destroyed': 'Event Destroyed est un événement d’acteur. Le GameInstance reçoit Event Shutdown quand le jeu se ferme.',
  'event.actorBeginOverlap': 'un GameInstance n’est pas dans le niveau : il n’a pas d’overlap.',
  'event.actorEndOverlap': 'un GameInstance n’est pas dans le niveau : il n’a pas d’overlap.',
  'event.componentBeginOverlap': 'un GameInstance n’a pas de composants.',
  'event.componentEndOverlap': 'un GameInstance n’a pas de composants.',
  'event.hit': 'un GameInstance n’est pas dans le niveau : il ne reçoit pas Event Hit.',
  'event.actorOnClicked': 'un GameInstance n’est pas dans le niveau : on ne peut pas cliquer dessus.',
  'event.inputKey': 'un GameInstance ne reçoit pas les entrées : c’est le Player Controller qui les reçoit.',
  'input.action': 'un GameInstance ne reçoit pas les entrées : c’est le Player Controller qui les reçoit.',
  'timeline.node': 'UE n’accepte de Timeline que dans un acteur.',
  'cs.entry': 'un GameInstance n’a pas de Construction Script.',
};
