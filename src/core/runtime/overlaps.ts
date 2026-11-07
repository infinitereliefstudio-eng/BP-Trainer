/**
 * Overlap events between live actors, once per frame: End events first,
 * then Begin events, like a frame of UE overlaps.
 */
import type { NodeInstance } from '../model/project';
import { overlapShapes, overlaps } from './physics';
import type { ActorRT, RValue } from './world';

export type Fire = (actor: ActorRT, match: (n: NodeInstance) => boolean, pin: string, outputs?: Record<string, RValue>) => void;

const other = (id: string): Record<string, RValue> => ({ other: { ref: 'actor', id } });

export function updateOverlaps(live: ActorRT[], fire: Fire): void {
  const shapes = new Map(live.map((a) => [a.id, overlapShapes(a)]));
  const nextActor = new Map<string, Set<string>>(live.map((a) => [a.id, new Set()]));
  const nextComp = new Map<string, Set<string>>(live.map((a) => [a.id, new Set()]));

  for (let i = 0; i < live.length; i++) {
    for (let j = i + 1; j < live.length; j++) {
      const A = live[i],
        B = live[j];
      let any = false;
      for (const x of shapes.get(A.id)!) {
        for (const y of shapes.get(B.id)!) {
          if (!overlaps(x.shape, y.shape)) continue;
          any = true;
          if (x.comp) nextComp.get(A.id)!.add(`${x.comp.id}|${B.id}`);
          if (y.comp) nextComp.get(B.id)!.add(`${y.comp.id}|${A.id}`);
        }
      }
      if (any) {
        nextActor.get(A.id)!.add(B.id);
        nextActor.get(B.id)!.add(A.id);
      }
    }
  }

  for (const a of live) {
    const nextC = nextComp.get(a.id)!;
    for (const key of a.compOverlaps) {
      if (nextC.has(key)) continue;
      const [comp, id] = key.split('|');
      fire(a, (n) => n.def === 'event.componentEndOverlap' && n.config.component === comp, 'then', other(id));
    }
    const nextA = nextActor.get(a.id)!;
    for (const id of a.overlaps) if (!nextA.has(id)) fire(a, (n) => n.def === 'event.actorEndOverlap', 'then', other(id));
  }
  for (const a of live) {
    const prevC = a.compOverlaps;
    const prevA = a.overlaps;
    a.compOverlaps = nextComp.get(a.id)!;
    a.overlaps = nextActor.get(a.id)!;
    for (const key of a.compOverlaps) {
      if (prevC.has(key)) continue;
      const [comp, id] = key.split('|');
      fire(a, (n) => n.def === 'event.componentBeginOverlap' && n.config.component === comp, 'then', other(id));
    }
    for (const id of a.overlaps) if (!prevA.has(id)) fire(a, (n) => n.def === 'event.actorBeginOverlap', 'then', other(id));
  }
}

/** An actor removed from the level ends its overlaps with the ones that stay. */
export function endOverlapsWith(gone: ActorRT, remaining: ActorRT[], fire: Fire): void {
  for (const a of remaining) {
    if (!a.overlaps.has(gone.id)) continue;
    a.overlaps.delete(gone.id);
    for (const k of [...a.compOverlaps]) if (k.endsWith(`|${gone.id}`)) a.compOverlaps.delete(k);
    fire(a, (n) => n.def === 'event.actorEndOverlap', 'then', other(gone.id));
  }
}
