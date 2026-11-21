/**
 * The GameMode, as in UE: an actor that each world spawns from its level's
 * GameMode (World Settings › GameMode Override, else Maps & Modes › Default
 * GameMode). It has no shape and receives no input: what its graph may not
 * contain is listed in NOT_IN_GAME_MODE.
 */
import { T } from '../../types/pins';
import { dataOut, type NodeDefinition } from '../definition';

export const gameModeNodes: NodeDefinition[] = [
  {
    id: 'game.getGameMode',
    title: 'Get Game Mode',
    category: 'Game',
    kind: 'pure',
    description:
      'Le GameMode du niveau en cours : l’acteur des règles de la partie, que chaque niveau crée (World Settings › GameMode Override, sinon le Default GameMode de Project Settings › Maps & Modes). Il renvoie un GameModeBase : Cast To BP_… pour lire ses variables. Il disparaît avec le niveau : pour garder une valeur d’un niveau à l’autre, c’est le GameInstance.',
    keywords: ['game mode', 'gamemode', 'mode de jeu', 'regles', 'get game mode'],
    pins: [dataOut('result', 'Return Value', T.object('GameModeBase'))],
  },
];

/** What a GameMode's graph may not contain: it is an actor, but without shape, and the Player Controller receives the input. */
export const NOT_IN_GAME_MODE: Record<string, string> = {
  'event.actorBeginOverlap': 'un GameMode n’a pas de forme dans le niveau : il n’a pas d’overlap.',
  'event.actorEndOverlap': 'un GameMode n’a pas de forme dans le niveau : il n’a pas d’overlap.',
  'event.componentBeginOverlap': 'un GameMode n’a pas de composants ici.',
  'event.componentEndOverlap': 'un GameMode n’a pas de composants ici.',
  'event.hit': 'un GameMode n’a pas de forme : il ne reçoit pas Event Hit.',
  'event.actorOnClicked': 'un GameMode n’a pas de forme : on ne peut pas cliquer dessus.',
  'event.inputKey': 'un GameMode ne reçoit pas les entrées : c’est le Player Controller (ou le pion) qui les reçoit.',
  'input.action': 'un GameMode ne reçoit pas les entrées : c’est le Player Controller (ou le pion) qui les reçoit.',
  'cs.entry': 'un GameMode n’a pas de Construction Script dans l’appli.',
};
