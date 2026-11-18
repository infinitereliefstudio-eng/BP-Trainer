/** Enhanced Input nodes: activate or deactivate a Mapping Context for the player. */
import type { Behavior } from './types';

export const enhancedInputBehaviors: Record<string, Behavior> = {
  'input.addMappingContext': {
    exec: (cx) => {
      const id = cx.node.config.context;
      // As UE: a None context is just ignored, with a warning in the log.
      if (typeof id === 'string' && id) cx.world.addMappingContext(id, Math.trunc(cx.num('priority')));
      else cx.world.runtimeError('Add Mapping Context : aucun Mapping Context choisi (Details).');
      return ['then'];
    },
  },
  'input.removeMappingContext': {
    exec: (cx) => {
      const id = cx.node.config.context;
      if (typeof id === 'string' && id) cx.world.removeMappingContext(id);
      return ['then'];
    },
  },
};
