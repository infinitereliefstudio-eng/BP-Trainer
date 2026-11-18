/** The player's controller: Get Player Controller, Get Controller. */
import type { Behavior } from './types';

export const controllerBehaviors: Record<string, Behavior> = {
  'player.getController': {
    pure: (cx) => ({ result: { ref: 'actor', id: cx.world.playerController().id } }),
  },
  'pawn.getController': {
    // Only the possessed pawn has a controller; any other pawn gives None, as in UE.
    pure: (cx) => {
      const pawn = cx.world.actor(cx.in('target'), 'Target');
      return { result: pawn?.isPlayer ? { ref: 'actor', id: cx.world.playerController().id } : null };
    },
  },
};
