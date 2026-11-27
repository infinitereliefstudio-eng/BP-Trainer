/**
 * The 3D view's camera during Play (3D-0, V7.77): high and behind, at a fixed angle, following the player, like a
 * game made from UE's Top Down template. It never turns: the joystick keeps pushing the way the screen shows, as in
 * the top view, so no lesson changes direction. Two fingers pinch to come closer or go further.
 *
 * Axes: the level's X and Y (cm, Y down the screen in the top view) are three.js's X and Z; three.js's Y is up.
 * The camera stands on the side of +Y (the bottom of the top view) and looks towards -Y.
 */
import { PerspectiveCamera, Vector3 } from 'three';
import type { Point } from '../camera';

export const MIN_DISTANCE = 600;
export const MAX_DISTANCE = 4200;
/** Angle under the horizon, in degrees: steep enough to see over the walls, low enough to see heights. */
const PITCH = 55;
const DEG = Math.PI / 180;

export class FollowCamera {
  /** A narrow field of view: a phone in landscape is wide, and a wide angle would bend the edges of the level. */
  readonly three = new PerspectiveCamera(34, 1, 10, 40000);
  /** Distance from the point looked at, in cm. */
  distance = 1700;
  /** The point looked at, on the floor (level X, level Y). */
  readonly target = { x: 0, y: 0 };
  private width = 1;
  private height = 1;
  private placed = false;
  private readonly v = new Vector3();

  resize(width: number, height: number): void {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.three.aspect = this.width / this.height;
    this.three.updateProjectionMatrix();
  }

  zoomBy(factor: number): void {
    this.distance = Math.min(MAX_DISTANCE, Math.max(MIN_DISTANCE, this.distance / factor));
  }

  /** Follow (x, y) smoothly; the first call jumps there. `dt` in seconds. */
  follow(x: number, y: number, dt: number): void {
    if (!this.placed) {
      this.target.x = x;
      this.target.y = y;
      this.placed = true;
    } else {
      const k = 1 - Math.exp(-Math.max(0, dt) * 8);
      this.target.x += (x - this.target.x) * k;
      this.target.y += (y - this.target.y) * k;
    }
    this.place();
  }

  /** Look at (x, y) at once, without following there: a new level (Open Level), a new Player Start (V7.81). */
  jumpTo(x: number, y: number): void {
    this.target.x = x;
    this.target.y = y;
    this.placed = true;
    this.place();
  }

  /** Put the three.js camera where `target` and `distance` say. */
  place(): void {
    const p = PITCH * DEG;
    // Look a little ahead of the player (towards the top of the screen), where he is going more often than not.
    const ahead = this.distance * 0.06;
    const tx = this.target.x,
      tz = this.target.y - ahead;
    this.three.position.set(tx, Math.sin(p) * this.distance, tz + Math.cos(p) * this.distance);
    this.three.lookAt(tx, 0, tz);
    this.three.updateMatrixWorld();
  }

  /** Where a point of the level at height `h` (cm) is on the screen, in CSS px. */
  toScreen(wx: number, wy: number, h = 0): Point {
    this.v.set(wx, h, wy).project(this.three);
    return { x: ((this.v.x + 1) / 2) * this.width, y: ((1 - this.v.y) / 2) * this.height };
  }

  /** Normalised device coordinates of a screen point, for the Raycaster. */
  ndc(sx: number, sy: number): { x: number; y: number } {
    return { x: (sx / this.width) * 2 - 1, y: 1 - (sy / this.height) * 2 };
  }
}
