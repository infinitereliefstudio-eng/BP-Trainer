/** The player's walk: joystick direction, UE's default speed, pushed out of blocking meshes. */
import { collisionBlocks } from '../types/enums';
import { componentShape, pushOut } from './physics';
import { PLAYER_RADIUS, PLAYER_SPEED, type ActorRT } from './world';

export function movePlayer(player: ActorRT, move: { x: number; y: number }, actors: ActorRT[], dt: number): void {
  let { x: mx, y: my } = move;
  const len = Math.hypot(mx, my);
  if (len < 0.05) return;
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
        if (s) [nx, ny] = pushOut(nx, ny, PLAYER_RADIUS, s);
      }
    }
  }
  player.x = nx;
  player.y = ny;
}
