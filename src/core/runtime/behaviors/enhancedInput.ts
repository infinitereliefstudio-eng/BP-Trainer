/**
 * Enhanced Input nodes: the player's subsystem, and activating or
 * deactivating a Mapping Context on it.
 */
import type { Behavior, ExecCx } from './types';

/** The subsystem on the Target pin, or null (Accessed None) when it is not one. */
function subsystem(cx: ExecCx, node: string): boolean {
  const t = cx.world.actor(cx.in('target'), 'Target');
  if (!t) return false;
  if (t.id !== cx.world.inputSubsystem().id) {
    cx.world.runtimeError(`${node} : Target n’est pas l’Enhanced Input Local Player Subsystem.`);
    return false;
  }
  return true;
}

export const enhancedInputBehaviors: Record<string, Behavior> = {
  'input.subsystem': {
    // Like UE's getter: None when the Player Controller pin is None, no error.
    pure: (cx) => {
      const pc = cx.world.tryActor(cx.in('controller'));
      const sub = cx.world.inputSubsystem();
      return { result: pc && pc.id === cx.world.playerController().id ? { ref: 'actor', id: sub.id } : null };
    },
  },
  'input.addMappingContext': {
    exec: (cx) => {
      // As UE, a call on None is skipped with "Accessed None", and the chain goes on.
      if (!subsystem(cx, 'Add Mapping Context')) return ['then'];
      const id = cx.node.config.context;
      if (typeof id === 'string' && id) cx.world.addMappingContext(id, Math.trunc(cx.num('priority')), cx.node.config.ignorePressed !== false);
      else cx.world.runtimeError('Add Mapping Context : aucun Mapping Context choisi (Details).');
      return ['then'];
    },
  },
  'input.removeMappingContext': {
    exec: (cx) => {
      if (!subsystem(cx, 'Remove Mapping Context')) return ['then'];
      const id = cx.node.config.context;
      if (typeof id === 'string' && id) cx.world.removeMappingContext(id, cx.node.config.ignorePressed !== false);
      return ['then'];
    },
  },
};
