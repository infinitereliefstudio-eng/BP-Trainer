/** Actor functions: destroy and spawn, find by class, location and rotation. */
import { spawnPins } from '../../model/project';
import { copyValue, toVec } from '../values';
import type { ActorRT, RValue } from '../world';
import { RESUME, type Behavior, type ValueCx } from './types';

const DEG = Math.PI / 180;
const ref = (a: ActorRT): RValue => ({ ref: 'actor', id: a.id });

/** Actors of the class chosen on the Class pin (a class id), in level order. */
function ofClass(cx: ValueCx): ActorRT[] {
  const id = cx.in('class');
  if (typeof id !== 'string' || !id) return [];
  return cx.world.allActors().filter((a) => cx.world.isA(a, id));
}

export const actorBehaviors: Record<string, Behavior> = {
  'actor.destroy': {
    // Event Destroyed runs first (a synchronous call), then the actor goes.
    exec: (cx) => {
      const st = cx.state(() => ({ pending: '' }));
      if (cx.entry === RESUME) {
        const a = cx.world.tryActor({ ref: 'actor', id: st.pending });
        st.pending = '';
        if (a) cx.world.destroy(a);
        return ['then'];
      }
      const a = cx.world.actor(cx.in('target'), 'Target');
      if (!a) return ['then'];
      if (!a.isPlayer && cx.callEvents(a, (n) => n.def === 'event.destroyed', {}) > 0) {
        st.pending = a.id;
        cx.resume();
        return [];
      }
      cx.world.destroy(a);
      return ['then'];
    },
  },

  'actor.spawn': {
    // The new actor's BeginPlay runs before the chain continues, as in UE.
    exec: (cx) => {
      const id = cx.in('class');
      if (typeof id !== 'string' || !id) {
        cx.world.runtimeError('SpawnActor failed because no class was specified');
        cx.out('result', null);
        return ['then'];
      }
      const loc = toVec(cx.in('location'));
      const rot = toVec(cx.in('rotation'));
      const a = cx.world.spawn(id, loc.x, loc.y, rot.z);
      // Expose on Spawn pins exist only for the class picked on the node itself.
      const cls = a && cx.node.defaults.class === id ? cx.world.classOf(a) : undefined;
      if (a && cls) for (const v of spawnPins(cls)) a.vars[v.id] = copyValue(cx.in(`expose:${v.id}`));
      cx.out('result', a ? ref(a) : null);
      // The Construction Script sees the exposed values, then BeginPlay runs.
      if (a) cx.callConstruction(a);
      if (a) cx.callEvents(a, (n) => n.def === 'event.beginPlay', {});
      return ['then'];
    },
  },

  'actor.getAllOfClass': {
    exec: (cx) => {
      cx.out('actors', ofClass(cx).map(ref));
      return ['then'];
    },
  },

  'actor.getOfClass': {
    exec: (cx) => {
      const first = ofClass(cx)[0];
      cx.out('result', first ? ref(first) : null);
      return ['then'];
    },
  },

  'actor.setHidden': {
    exec: (cx) => {
      const a = cx.world.actor(cx.in('target'), 'Target');
      if (a) a.hidden = cx.bool('hidden');
      return ['then'];
    },
  },

  'actor.getLocation': {
    pure: (cx) => {
      const a = cx.world.actor(cx.in('target'), 'Target');
      return { result: a ? { x: a.x, y: a.y, z: 0 } : { x: 0, y: 0, z: 0 } };
    },
  },

  'actor.setLocation': {
    exec: (cx) => {
      const a = cx.world.actor(cx.in('target'), 'Target');
      const v = toVec(cx.in('location'));
      if (a) {
        a.x = v.x;
        a.y = v.y;
      }
      cx.out('result', !!a);
      return ['then'];
    },
  },

  'actor.addOffset': {
    exec: (cx) => {
      const a = cx.world.actor(cx.in('target'), 'Target');
      const d = toVec(cx.in('delta'));
      if (a) {
        a.x += d.x;
        a.y += d.y;
      }
      return ['then'];
    },
  },

  'actor.getRotation': {
    pure: (cx) => {
      const a = cx.world.actor(cx.in('target'), 'Target');
      return { result: { x: 0, y: 0, z: a ? a.yaw : 0 } };
    },
  },

  'actor.setRotation': {
    exec: (cx) => {
      const a = cx.world.actor(cx.in('target'), 'Target');
      if (a) a.yaw = toVec(cx.in('rotation')).z;
      cx.out('result', !!a);
      return ['then'];
    },
  },

  'actor.getForward': {
    pure: (cx) => {
      const a = cx.world.actor(cx.in('target'), 'Target');
      const yaw = (a?.yaw ?? 0) * DEG;
      return { result: { x: Math.cos(yaw), y: Math.sin(yaw), z: 0 } };
    },
  },

  'actor.distanceTo': {
    pure: (cx) => {
      const a = cx.world.actor(cx.in('target'), 'Target');
      const b = cx.world.tryActor(cx.in('other'));
      return { result: a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0 };
    },
  },

  'actor.getClassName': {
    pure: (cx) => ({ result: cx.world.tryActor(cx.in('object'))?.classId ?? null }),
  },
};
