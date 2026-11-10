/**
 * Line Trace By Channel in the top view: a ray stopped by the first shape
 * that blocks its channel.
 *
 * What blocks, following UE's default collision presets: a Static Mesh that
 * blocks (BlockAll) with queries enabled stops both channels; a Box Collision
 * (a trigger, OverlapAll) stops neither; the player's capsule (Pawn preset)
 * ignores Visibility and blocks Camera. Being hidden changes nothing.
 */
import { collisionQueries } from '../types/enums';
import { componentShape, playerShape, raycast, type Shape } from './physics';
import type { ActorRT, ComponentRT } from './world';

export const CHANNEL_VISIBILITY = 0;
export const CHANNEL_CAMERA = 1;

export interface TraceHit {
  actor: ActorRT;
  comp?: ComponentRT;
  x: number;
  y: number;
  nx: number;
  ny: number;
  distance: number;
}

/** A debug line of a trace: red up to the hit, green after it, as UE draws it. */
export interface DebugLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  hit?: { x: number; y: number };
  /** Simulation time until which it stays drawn; Infinity for Persistent. */
  until: number;
}

function blockers(a: ActorRT, channel: number): { comp?: ComponentRT; shape: Shape }[] {
  const out: { comp?: ComponentRT; shape: Shape }[] = [];
  if (a.isPlayer && channel === CHANNEL_CAMERA) out.push({ shape: playerShape(a) });
  for (const c of a.components) {
    if (c.kind !== 'StaticMesh' || !c.props.blocks || !collisionQueries(c.props.collision)) continue;
    const shape = componentShape(a, c);
    if (shape) out.push({ comp: c, shape });
  }
  return out;
}

export function lineTrace(
  actors: ActorRT[],
  start: { x: number; y: number },
  end: { x: number; y: number },
  channel: number,
  ignore: Set<string>,
): TraceHit | undefined {
  const len = Math.hypot(end.x - start.x, end.y - start.y);
  if (len < 1e-6) return undefined;
  const dx = (end.x - start.x) / len,
    dy = (end.y - start.y) / len;
  let best: TraceHit | undefined;
  for (const a of actors) {
    if (a.destroyed || ignore.has(a.id)) continue;
    for (const b of blockers(a, channel)) {
      const h = raycast(b.shape, start.x, start.y, dx, dy, len);
      if (!h || (best && h.t >= best.distance)) continue;
      best = { actor: a, comp: b.comp, x: start.x + dx * h.t, y: start.y + dy * h.t, nx: h.nx, ny: h.ny, distance: h.t };
    }
  }
  return best;
}
