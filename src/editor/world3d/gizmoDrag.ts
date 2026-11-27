/**
 * One drag of a gizmo handle (3D-2, V7.79): from where the finger went on the screen, the new transform of what is
 * being moved, turned or scaled, snapped as UE does (grid, rotation, scale snaps of the viewport bar). Scale writes a scale, never a size (V7.83). The view frame is
 * the level's for an actor, the actor's for a component of the Blueprint's Viewport. No three.js, no DOM.
 */
import type { Point } from '../camera';
import {
  alongAxis,
  alongScreenAxis,
  axisOf,
  GIZMO_PX,
  type GizmoSettings,
  type Handle,
  normalizeYaw,
  type Projector,
  screenAngle,
  snap,
  snapScale,
  turn,
} from './gizmoMath';

export interface Transform {
  x: number;
  y: number;
  yaw: number;
  /** UE's Scale (Relative Scale 3D of a component, the root's for an actor): a factor, 1 by default (V7.83). */
  scaleX: number;
  scaleY: number;
  scaleZ: number;
}

export interface DragView extends Projector {
  /** Where the finger is on the floor, for the yellow square (undefined when the view looks along the floor). */
  dragPoint(sx: number, sy: number): Point | undefined;
  /** 1 from above, -1 from below, about 0 from the side. */
  verticalLook(): number;
}

/** Height at which the gizmo is drawn and measured, in cm. */
export const GIZMO_HEIGHT = 5;

export class GizmoDrag {
  private readonly startScreen: Point;
  private readonly center: Point;
  private readonly floorFrom?: Point;
  private angle: number;
  private turned = 0;

  constructor(
    readonly handle: Handle,
    readonly orig: Transform,
    private readonly view: DragView,
    private readonly settings: GizmoSettings,
    start: Point,
  ) {
    this.startScreen = { ...start };
    this.center = view.toScreen(orig.x, orig.y, GIZMO_HEIGHT);
    this.angle = screenAngle(this.center, start);
    if (handle === 'xy') this.floorFrom = view.dragPoint(start.x, start.y);
  }

  /** The transform for the finger at `p` (screen px). */
  at(p: Point): Transform {
    const o = this.orig;
    const s = this.settings;
    const dx = p.x - this.startScreen.x,
      dy = p.y - this.startScreen.y;
    const out: Transform = { ...o };
    switch (this.handle) {
      case 'x':
      case 'y': {
        const local = s.space === 'Local';
        const axis = axisOf(this.handle, local ? o.yaw : 0);
        let d = alongAxis(this.view, o, GIZMO_HEIGHT, axis, dx, dy);
        if (local) d = snap(d, s.grid);
        out.x = o.x + axis.x * d;
        out.y = o.y + axis.y * d;
        // World space: the coordinate that moved lands on the grid, as in UE.
        if (!local) {
          if (this.handle === 'x') out.x = snap(out.x, s.grid);
          else out.y = snap(out.y, s.grid);
        }
        break;
      }
      case 'xy': {
        const now = this.view.dragPoint(p.x, p.y);
        if (!now || !this.floorFrom) break;
        out.x = snap(o.x + now.x - this.floorFrom.x, s.grid);
        out.y = snap(o.y + now.y - this.floorFrom.y, s.grid);
        break;
      }
      case 'rot': {
        const look = this.view.verticalLook();
        if (Math.abs(look) < 0.25) {
          // Seen from the side, the ring is a line: a drag to the right turns as from above.
          this.turned = dx * 0.5;
        } else {
          const a = screenAngle(this.center, p);
          this.turned += turn(this.angle, a);
          this.angle = a;
        }
        const sign = look < -0.25 ? -1 : 1;
        out.yaw = normalizeYaw(snap(o.yaw + this.turned * sign, s.rotation));
        break;
      }
      case 'sx':
      case 'sy': {
        // As UE's Scale handles: the scale changes by how far the finger goes along the handle (its own length = +1),
        // whatever the size of the mesh; Scale Snap is a factor (V7.83).
        const px = alongScreenAxis(this.view, o, GIZMO_HEIGHT, axisOf(this.handle, o.yaw), dx, dy);
        if (this.handle === 'sx') out.scaleX = snapScale(o.scaleX + px / GIZMO_PX, s.scale);
        else out.scaleY = snapScale(o.scaleY + px / GIZMO_PX, s.scale);
        break;
      }
      case 'sxy': {
        // Up and to the right grows, down and to the left shrinks: the three axes together, as UE's centre cube.
        const f = Math.max(0.01, 1 + (dx - dy) / GIZMO_PX);
        out.scaleX = snapScale(o.scaleX * f, s.scale);
        out.scaleY = snapScale(o.scaleY * f, s.scale);
        out.scaleZ = snapScale(o.scaleZ * f, s.scale);
        break;
      }
    }
    return out;
  }
}
