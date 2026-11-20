/** Set Input Mode and Show Mouse Cursor: one player, so the controller wired is the player's own. */
import type { Behavior, ExecCx } from './types';

/** The Player Controller pin: None is Accessed None, as in UE. */
function controller(cx: ExecCx, pin = 'controller', label = 'Player Controller'): boolean {
  return !!cx.world.actor(cx.in(pin), label);
}

function mode(m: 'GameOnly' | 'UIOnly' | 'GameAndUI'): Behavior {
  return {
    exec: (cx) => {
      if (controller(cx)) cx.world.setInputMode(m, cx.bool('flush'));
      return ['then'];
    },
  };
}

export const inputModeBehaviors: Record<string, Behavior> = {
  'input.setModeGameOnly': mode('GameOnly'),
  'input.setModeUIOnly': mode('UIOnly'),
  'input.setModeGameAndUI': mode('GameAndUI'),
  'input.setShowMouseCursor': {
    exec: (cx) => {
      if (controller(cx, 'target', 'Target')) cx.world.showMouseCursor = cx.bool('show');
      return ['then'];
    },
  },
  'input.getShowMouseCursor': {
    pure: (cx) => ({ result: !!cx.world.tryActor(cx.in('target')) && cx.world.showMouseCursor }),
  },
};
