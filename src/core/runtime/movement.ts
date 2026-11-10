/** The player's walk: joystick direction, UE's default speed, pushed out of blocking meshes. */
import { collisionBlocks } from '../types/enums';
import { componentShape, pushOut } from './physics';
import { PLAYER_RADIUS, PLAYER_SPEED, type ActorRT, type ComponentRT } from './world';

/** The player was stopped by a mesh this frame: where, and the surface normal (towards the player). */
export interface BlockingHit {
  actor: ActorRT;
  comp: ComponentRT;
  x: number;
  y: number;
  nx: number;
  ny: number;
}

export function movePlayer(player: ActorRT, move: { x: number; y: number }, actors: ActorRT[], dt: number): BlockingHit[] {
  const hits = new Map<string, BlockingHit>();
  let { x: mx, y: my } = move;
  const len = Math.hypot(mx, my);
  if (len < 0.05) return [];
  if (len > 1) {
    mx /= len;
    my /= len;
  }
  let nx = player.x + mx * PLAYER_SPEED * dt;
  let ny = player.y + my * PLAYER_SPEED * dt;
  player.yaw = (Math.atan2(my, mx) * 180) / Math.PI;
  for (let iter = 0; iter < 3; iter++) {
    for (const a of actors) {
      if (a.destroyed) continue;
      for (const c of a.components) {
        if (c.kind !== 'StaticMesh' || !c.props.blocks || !collisionBlocks(c.props.collision)) continue;
        const s = componentShape(a, c);
        if (!s) continue;
        const [px, py] = pushOut(nx, ny, PLAYER_RADIUS, s);
        const d = Math.hypot(px - nx, py - ny);
        if (d > 1e-6 && !hits.has(c.id + a.id)) {
          const ux = (px - nx) / d,
            uy = (py - ny) / d;
          hits.set(c.id + a.id, { actor: a, comp: c, x: px - ux * PLAYER_RADIUS, y: py - uy * PLAYER_RADIUS, nx: ux, ny: uy });
        }
        nx = px;
        ny = py;
      }
    }
  }
  player.x = nx;
  player.y = ny;
  return [...hits.values()];
}
