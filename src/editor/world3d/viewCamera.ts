/**
 * The level editor's camera in 3D (3D-1, V7.78): UE's viewport types. Perspective orbits around a point (one finger),
 * moves in the screen's plane and comes closer (two fingers); the orthographic views (Top, Bottom, Left, Right,
 * Front, Back) look along an axis, move and zoom. The app's Top view is still the 2D canvas (WorldCanvas): this
 * camera has one too, for completeness.
 *
 * Axes as everywhere in world3d: the level's X and Y are three.js's X and Z, heights are three.js's Y. The side views
 * are UE's (ELevelViewportType, V7.81): Front and Back look along X (Front from +X, the face of an actor that looks
 * towards +X, +Y to the left; Back from -X), Right and Left look along Y (Right from +Y, X to the right; Left from -Y).
 */
import { OrthographicCamera, PerspectiveCamera, Plane, Raycaster, Vector2, Vector3, type Camera } from 'three';
import type { Point } from '../camera';

export type ViewKind = 'Perspective' | 'Top' | 'Bottom' | 'Left' | 'Right' | 'Front' | 'Back';

/** Where an orthographic camera stands from what it looks at, and which way is up on the screen. */
const ORTHO: Record<Exclude<ViewKind, 'Perspective'>, { dir: [number, number, number]; up: [number, number, number] }> = {
  Top: { dir: [0, 1, 0], up: [0, 0, -1] },
  Bottom: { dir: [0, -1, 0], up: [0, 0, -1] },
  Front: { dir: [1, 0, 0], up: [0, 1, 0] },
  Back: { dir: [-1, 0, 0], up: [0, 1, 0] },
  Left: { dir: [0, 0, -1], up: [0, 1, 0] },
  Right: { dir: [0, 0, 1], up: [0, 1, 0] },
};

const DEG = Math.PI / 180;
const MIN_DIST = 120;
const MAX_DIST = 30000;
const MIN_SCALE = 0.02;
const MAX_SCALE = 6;

export interface Bounds {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** Highest point, in cm. */
  h: number;
}

export class ViewCamera {
  /** 32° high: a phone in landscape is wide, and a wider angle would bend the verticals at the edges. */
  readonly persp = new PerspectiveCamera(32, 1, 5, 60000);
  readonly ortho = new OrthographicCamera(-1, 1, 1, -1, 1, 40000);
  /** The point looked at, in three.js coordinates. */
  readonly target = new Vector3();
  /** Perspective: turn around the target (0 = from +Y of the level, as in Play) and angle under the horizon, in degrees. */
  yaw = 0;
  pitch = 45;
  distance = 1500;
  /** Orthographic: screen pixels per cm. */
  scale = 0.5;
  private w = 1;
  private h = 1;
  private readonly v = new Vector3();
  private readonly ray = new Raycaster();
  private readonly ndcV = new Vector2();

  constructor(public kind: ViewKind = 'Perspective') {}

  get three(): Camera {
    return this.kind === 'Perspective' ? this.persp : this.ortho;
  }

  get isOrtho(): boolean {
    return this.kind !== 'Perspective';
  }

  resize(w: number, h: number): void {
    this.w = Math.max(1, w);
    this.h = Math.max(1, h);
    this.place();
  }

  /** Put the cameras where target, angles, distance and scale say. */
  place(): void {
    if (this.kind === 'Perspective') {
      const c = this.persp;
      c.aspect = this.w / this.h;
      const p = this.pitch * DEG,
        y = this.yaw * DEG;
      c.position.set(
        this.target.x + Math.sin(y) * Math.cos(p) * this.distance,
        this.target.y + Math.sin(p) * this.distance,
        this.target.z + Math.cos(y) * Math.cos(p) * this.distance,
      );
      c.up.set(0, 1, 0);
      c.lookAt(this.target);
      c.updateProjectionMatrix();
      c.updateMatrixWorld();
      return;
    }
    const o = ORTHO[this.kind];
    const c = this.ortho;
    const hw = this.w / 2 / this.scale,
      hh = this.h / 2 / this.scale;
    c.left = -hw;
    c.right = hw;
    c.top = hh;
    c.bottom = -hh;
    c.position.set(this.target.x + o.dir[0] * 10000, this.target.y + o.dir[1] * 10000, this.target.z + o.dir[2] * 10000);
    c.up.set(...o.up);
    c.lookAt(this.target);
    c.updateProjectionMatrix();
    c.updateMatrixWorld();
  }

  /** One finger on the void: turn around the target (Perspective only). */
  orbit(dx: number, dy: number): void {
    if (this.isOrtho) return;
    this.yaw -= dx * 0.35;
    this.pitch = Math.min(89, Math.max(4, this.pitch + dy * 0.3));
    this.place();
  }

  /** Two fingers: the view follows the fingers in the screen's plane. */
  pan(dx: number, dy: number): void {
    const k = this.cmPerPx();
    const cam = this.three;
    const right = new Vector3().setFromMatrixColumn(cam.matrixWorld, 0);
    const up = new Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
    this.target.addScaledVector(right, -dx * k).addScaledVector(up, dy * k);
    this.place();
  }

  /** Two fingers apart (factor > 1): closer, keeping the point under the fingers in place in an orthographic view. */
  zoom(factor: number, sx: number, sy: number): void {
    if (!(factor > 0)) return;
    if (this.kind === 'Perspective') {
      this.distance = Math.min(MAX_DIST, Math.max(MIN_DIST, this.distance / factor));
      this.place();
      return;
    }
    const before = this.screenToPlane(sx, sy);
    this.scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, this.scale * factor));
    this.place();
    const after = this.screenToPlane(sx, sy);
    this.target.add(before.sub(after));
    this.place();
  }

  /** Frame a part of the level (UE's F): the whole of it in view, with a margin. */
  frame(b: Bounds): void {
    const cx = (b.x0 + b.x1) / 2,
      cy = (b.y0 + b.y1) / 2;
    const sx = Math.max(60, b.x1 - b.x0),
      sy = Math.max(60, b.y1 - b.y0),
      sh = Math.max(60, b.h);
    this.target.set(cx, sh / 3, cy);
    if (this.kind === 'Perspective') {
      const radius = Math.hypot(sx, sy, sh) / 2;
      const fov = this.persp.fov * DEG;
      const fit = Math.min(fov, 2 * Math.atan(Math.tan(fov / 2) * (this.w / this.h)));
      this.distance = Math.min(MAX_DIST, Math.max(MIN_DIST, (radius / Math.sin(fit / 2)) * 1.05));
      // The sphere around the box is too cautious: bring the camera in until the box's corners just fit the screen.
      for (let i = 0; i < 6; i++) {
        this.place();
        let m = 0;
        for (const x of [b.x0, b.x1])
          for (const y of [b.y0, b.y1])
            for (const h of [0, sh]) {
              this.v.set(x, h, y).project(this.persp);
              m = Math.max(m, Math.abs(this.v.x), Math.abs(this.v.y));
            }
        if (!(m > 0)) break;
        this.distance = Math.min(MAX_DIST, Math.max(MIN_DIST, this.distance * (0.4 + 0.6 * (m / 0.8))));
      }
    } else {
      const along = { Top: [sx, sy], Bottom: [sx, sy], Front: [sy, sh], Back: [sy, sh], Left: [sx, sh], Right: [sx, sh] }[this.kind];
      this.scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.min(this.w / along[0], this.h / along[1]) * 0.88));
      if (this.kind !== 'Top' && this.kind !== 'Bottom') this.target.y = sh / 2;
    }
    this.place();
  }

  /** Where a point of the level at height `h` is on the screen, in CSS px. */
  toScreen(x: number, y: number, h = 0): Point & { behind: boolean } {
    this.v.set(x, h, y).project(this.three);
    return { x: ((this.v.x + 1) / 2) * this.w, y: ((1 - this.v.y) / 2) * this.h, behind: this.v.z > 1 };
  }

  /** A ray from the camera through a screen point. */
  rayAt(sx: number, sy: number): Raycaster {
    this.ndcV.set((sx / this.w) * 2 - 1, 1 - (sy / this.h) * 2);
    this.ray.setFromCamera(this.ndcV, this.three);
    return this.ray;
  }

  /** The point of the floor under a screen point, in level coordinates; none when the view looks along the floor. */
  floorAt(sx: number, sy: number): Point | undefined {
    const r = this.rayAt(sx, sy).ray;
    if (Math.abs(r.direction.y) < 0.08) return undefined;
    const p = r.intersectPlane(new Plane(new Vector3(0, 1, 0), 0), new Vector3());
    return p ? { x: p.x, y: p.z } : undefined;
  }

  /**
   * Where a dragged actor goes, in level coordinates: on the floor when the view looks down enough, otherwise on the
   * plane that faces the camera (a side view moves along its horizontal axis only, the level having no height yet).
   */
  dragPoint(sx: number, sy: number): Point | undefined {
    const f = this.floorAt(sx, sy);
    if (f && !this.isOrtho) return f;
    if (f && (this.kind === 'Top' || this.kind === 'Bottom')) return f;
    const p = this.screenToPlane(sx, sy);
    return { x: p.x, y: p.z };
  }

  /** Centimetres for a screen pixel at a point of the level (the gizmo keeps its size on the screen with it). */
  cmPerPxAt(x: number, y: number, h = 0): number {
    if (this.isOrtho) return 1 / this.scale;
    const d = this.persp.position.distanceTo(this.v.set(x, h, y));
    return (2 * d * Math.tan((this.persp.fov * DEG) / 2)) / this.h;
  }

  /** How the view looks at the floor: 1 from above, -1 from below, about 0 from the side. */
  verticalLook(): number {
    const d = new Vector3().subVectors(this.three.position, this.target).normalize();
    return d.y;
  }

  /** Centimetres for a screen pixel, at the target. */
  private cmPerPx(): number {
    if (this.isOrtho) return 1 / this.scale;
    return (2 * this.distance * Math.tan((this.persp.fov * DEG) / 2)) / this.h;
  }

  /** The point under a screen point on the plane through the target that faces the camera. */
  private screenToPlane(sx: number, sy: number): Vector3 {
    const r = this.rayAt(sx, sy).ray;
    const n = new Vector3().subVectors(this.three.position, this.target).normalize();
    const plane = new Plane().setFromNormalAndCoplanarPoint(n, this.target);
    return r.intersectPlane(plane, new Vector3()) ?? this.target.clone();
  }
}
