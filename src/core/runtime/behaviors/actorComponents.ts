/**
 * Actor Components made in Blueprint: Get Owner from a component, finding a
 * component by class, and binding to an actor's own overlap dispatchers.
 */
import type { RValue } from '../world';
import { communicationBehaviors } from './communication';
import type { Behavior } from './types';

export const actorComponentBehaviors: Record<string, Behavior> = {
  'component.getOwner': {
    pure: (cx) => {
      const obj = cx.world.actor(cx.in('target'), 'Target');
      const owner = obj && cx.world.ownerActor(obj);
      return { result: owner ? { ref: 'actor', id: owner.id } : null };
    },
  },

  // An actor's Owner is set by Spawn Actor's Owner pin in UE, which the trainer does not have: always None.
  'actor.getOwner': {
    pure: (cx) => {
      cx.world.actor(cx.in('target'), 'Target');
      return { result: null };
    },
  },

  'actor.getComponentByClass': {
    pure: (cx) => {
      const a = cx.world.actor(cx.in('target'), 'Target');
      const found = a ? cx.world.componentsByClass(a, cx.in('componentClass')) : [];
      return { result: found[0] ?? null };
    },
  },

  'actor.getComponentsByClass': {
    pure: (cx) => {
      const a = cx.world.actor(cx.in('target'), 'Target');
      const found: RValue[] = a ? cx.world.componentsByClass(a, cx.in('componentClass')) : [];
      return { result: found };
    },
  },

  // An actor's own dispatcher is kept like a Blueprint one, under its name (OnActorBeginOverlap).
  'dispatcher.bindNative': communicationBehaviors['dispatcher.bind'],
  'dispatcher.unbindNative': communicationBehaviors['dispatcher.unbind'],
};
