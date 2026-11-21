/** Level nodes: Open Level only asks for the travel; the Game does it at the next frame (core/runtime/game.ts). */
import type { Behavior } from './types';

/** What UE's Play In Editor puts before a level's name (the first PIE instance). */
export const PIE_PREFIX = 'UEDPIE_0_';

export const levelBehaviors: Record<string, Behavior> = {
  'level.open': {
    exec: (cx) => {
      cx.world.openLevel(cx.str('level'), cx.bool('absolute'), cx.str('options'));
      return ['then'];
    },
  },
  'playerStart.getTag': {
    pure: (cx) => ({ result: cx.world.actor(cx.in('target'), 'Target')?.playerStartTag ?? '' }),
  },
  'level.currentName': {
    pure: (cx) => {
      const name = cx.world.currentLevelName() ?? '';
      return { result: cx.bool('removePrefix') ? name : `${PIE_PREFIX}${name}` };
    },
  },
};
