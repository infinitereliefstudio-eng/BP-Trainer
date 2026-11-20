/**
 * UMG functions of a widget. One local player here: a widget's owner is the
 * player's controller, and its pawn the player.
 */
import type { Behavior } from './types';

export const widgetBehaviors: Record<string, Behavior> = {
  'widget.getOwningPlayer': {
    pure: (cx) => (cx.in('target') === null ? { result: null } : { result: { ref: 'actor', id: cx.world.playerController().id } }),
  },
  'widget.getOwningPlayerPawn': {
    pure: (cx) => (cx.in('target') === null ? { result: null } : { result: { ref: 'actor', id: 'player' } }),
  },
};
