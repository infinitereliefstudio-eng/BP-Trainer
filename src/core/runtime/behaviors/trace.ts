/** Line Trace By Channel. */
import { toInt, toVec } from '../values';
import { isRef, type RValue } from '../world';
import type { Behavior } from './types';

/** Seconds a "For Duration" debug line stays, UE's default Draw Time. */
const DRAW_TIME = 5;

export const traceBehaviors: Record<string, Behavior> = {
  'trace.lineByChannel': {
    exec: (cx) => {
      const start = toVec(cx.in('start'));
      const end = toVec(cx.in('end'));
      const ignore = new Set<string>();
      const list = cx.in('ignore');
      if (Array.isArray(list)) for (const r of list) if (isRef(r) && r.ref === 'actor') ignore.add(r.id);
      if (cx.bool('ignoreSelf')) ignore.add(cx.actor.id);
      const hit = cx.world.lineTrace(start, end, toInt(cx.num('channel')), ignore);
      const debug = toInt(cx.num('debug'));
      if (debug > 0) {
        const until = debug === 1 ? cx.world.time + cx.world.deltaSeconds : debug === 2 ? cx.world.time + DRAW_TIME : Number.POSITIVE_INFINITY;
        cx.world.debugLine({ x1: start.x, y1: start.y, x2: end.x, y2: end.y, hit: hit && { x: hit.x, y: hit.y }, until });
      }
      const vec = (x: number, y: number): RValue => ({ x, y, z: 0 });
      cx.out('result', !!hit);
      cx.out('hitActor', hit ? { ref: 'actor', id: hit.actor.id } : null);
      cx.out('hitComponent', hit?.comp ? { ref: 'component', actor: hit.actor.id, id: hit.comp.id } : null);
      cx.out('location', hit ? vec(hit.x, hit.y) : vec(0, 0));
      cx.out('normal', hit ? vec(hit.nx, hit.ny) : vec(0, 0));
      cx.out('distance', hit ? hit.distance : 0);
      return ['then'];
    },
  },
};
