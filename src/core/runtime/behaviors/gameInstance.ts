/** The GameInstance (Get Game Instance) and Quit Game: the Game closes at the next frame (core/runtime/game.ts). */
import type { Behavior } from './types';

/** EQuitPreference::Background: on a phone the game goes to the background; in Play nothing happens. */
const BACKGROUND = 1;

export const gameInstanceBehaviors: Record<string, Behavior> = {
  'game.getGameInstance': {
    pure: (cx) => ({ result: cx.world.gameInstance ? { ref: 'actor', id: cx.world.gameInstance.id } : null }),
  },
  'game.quitGame': {
    exec: (cx) => {
      if (Math.trunc(cx.num('preference')) !== BACKGROUND) cx.world.quitGame();
      return ['then'];
    },
  },
};

/** Get Game Mode: the GameMode of the world being played. */
export const gameModeBehaviors: Record<string, Behavior> = {
  'game.getGameMode': {
    pure: (cx) => ({ result: cx.world.gameMode ? { ref: 'actor', id: cx.world.gameMode.id } : null }),
  },
};
