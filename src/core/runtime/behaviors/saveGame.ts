/** Save Game nodes: SaveGame objects live outside the level; slots outlive the game (Simulation.slots). */
import type { ActorRT, RValue } from '../world';
import type { Behavior, ExecCx } from './types';

const ref = (a: ActorRT | null): RValue => (a ? { ref: 'actor', id: a.id } : null);
const slotOf = (cx: ExecCx) => ({ slot: cx.str('slot'), user: Math.trunc(cx.num('user')) });

export const saveGameBehaviors: Record<string, Behavior> = {
  'save.create': {
    exec: (cx) => {
      const id = cx.in('saveClass');
      const obj = typeof id === 'string' && id ? cx.world.createSaveGame(id) : null;
      if (!obj) cx.world.runtimeError('Create Save Game Object : choisis une classe SaveGame sur la pin Save Game Class.');
      cx.out('result', ref(obj));
      return ['then'];
    },
  },
  'save.toSlot': {
    exec: (cx) => {
      const { slot, user } = slotOf(cx);
      // As UE: a None object or an empty slot name just fails, Return Value false, no error.
      const obj = cx.world.tryActor(cx.in('object'));
      cx.out('result', !!obj && cx.world.saveGame(obj, slot, user));
      return ['then'];
    },
  },
  'save.fromSlot': {
    exec: (cx) => {
      const { slot, user } = slotOf(cx);
      cx.out('result', ref(cx.world.loadGame(slot, user)));
      return ['then'];
    },
  },
  'save.exists': {
    exec: (cx) => {
      const { slot, user } = slotOf(cx);
      cx.out('result', cx.world.saveExists(slot, user));
      return ['then'];
    },
  },
  'save.delete': {
    exec: (cx) => {
      const { slot, user } = slotOf(cx);
      cx.out('result', cx.world.deleteSave(slot, user));
      return ['then'];
    },
  },
};
