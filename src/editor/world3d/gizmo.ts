/**
 * The transform gizmo of UE's viewport (3D-2, V7.79), drawn over everything at a constant size on the screen: Move
 * (red X and green Y arrows, a yellow square to slide on the floor), Rotate (the blue ring of the Yaw, the only turn
 * the level has yet), Scale (X and Y with a cube at their end, and a centre cube for both). Z is not there: the level
 * has no height yet (step B of the 3D roadmap). Each handle has a thick invisible twin that takes the finger, at least
 * 44 px wide on the screen (V7.81); where twins overlap, the arrows win over the yellow square
 * between them, and the centre cube over the Scale arms.
 */
import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  type Object3D,
  type Raycaster,
  TorusGeometry,
} from 'three';
import type { Handle } from './gizmoMath';

export const GIZMO_COLORS = { x: '#e0433a', y: '#5bc236', z: '#2f6fe4', plane: '#f5c21b', active: '#ffe14d', uniform: '#d8d8d8' };

/** The gizmo's length on the screen, in px. */
export const GIZMO_PX = 90;
/** Half the width of a handle's invisible twin, in gizmo units: 2 × 0.25 × 90 = 45 px for a finger (V7.81). */
export const HIT_HALF = 0.25;
/** Handles that win when a finger is on several twins: the arrows over the yellow square that sits between them, the
 * centre cube over the arms that start from it. */
const FIRST: readonly Handle[] = ['x', 'y', 'sxy'];

type Mode = 'Move' | 'Rotate' | 'Scale';

export class Gizmo {
  readonly group = new Group();
  private readonly parts: Record<Mode, Group> = { Move: new Group(), Rotate: new Group(), Scale: new Group() };
  private readonly hits: Object3D[] = [];
  private readonly mats = new Map<Handle, MeshBasicMaterial[]>();
  private active?: Handle;
  mode: Mode = 'Move';

  constructor() {
    this.group.renderOrder = 1000;
    this.buildMove();
    this.buildRotate();
    this.buildScale();
    for (const g of Object.values(this.parts)) this.group.add(g);
    this.group.visible = false;
  }

  /**
   * Show the gizmo at a point of the level (x, y, height h), turned by `yaw` (Local space; Scale is always local),
   * at `cmPerPx` centimetres for a screen pixel there. `mode` undefined hides it.
   */
  place(mode: Mode | undefined, x: number, y: number, h: number, yaw: number, cmPerPx: number): void {
    this.group.visible = !!mode;
    if (!mode) return;
    this.mode = mode;
    for (const [m, g] of Object.entries(this.parts)) g.visible = m === mode;
    this.group.position.set(x, h, y);
    this.group.rotation.y = (-yaw * Math.PI) / 180;
    const s = GIZMO_PX * cmPerPx;
    this.group.scale.set(s, s, s);
    this.group.updateMatrixWorld(true);
  }

  /** The handle under a ray, if any (only those of the visible mode). */
  pick(ray: Raycaster): Handle | undefined {
    if (!this.group.visible) return undefined;
    const shown = (o: Object3D | null): boolean => !o || (o.visible && shown(o.parent));
    const live = this.hits.filter((h) => shown(h.parent));
    const hits = ray.intersectObjects(live, false).map((h) => h.object.userData.handle as Handle);
    return hits.find((h) => FIRST.includes(h)) ?? hits[0];
  }

  /** The handle being dragged turns yellow, as in UE. */
  setActive(h: Handle | undefined): void {
    if (this.active === h) return;
    const paint = (handle: Handle | undefined, on: boolean) => {
      if (!handle) return;
      for (const m of this.mats.get(handle) ?? []) m.color.set(on ? GIZMO_COLORS.active : (m.userData.color as string));
    };
    paint(this.active, false);
    this.active = h;
    paint(h, true);
  }

  dispose(): void {
    this.group.traverse((o) => {
      const m = o as Mesh;
      m.geometry?.dispose();
      (m.material as MeshBasicMaterial | undefined)?.dispose();
    });
  }

  private mat(handle: Handle, color: string, opacity = 1): MeshBasicMaterial {
    const m = new MeshBasicMaterial({ color, depthTest: false, depthWrite: false, transparent: true, opacity });
    m.userData.color = color;
    const list = this.mats.get(handle) ?? [];
    list.push(m);
    this.mats.set(handle, list);
    return m;
  }

  private hit(handle: Handle, mesh: Mesh, into: Group): void {
    mesh.material = new MeshBasicMaterial({ visible: false });
    mesh.userData.handle = handle;
    this.hits.push(mesh);
    into.add(mesh);
  }

  private layer(o: Mesh): Mesh {
    o.renderOrder = 1000;
    return o;
  }

  /** An arrow from the centre along +X (rotated for Y). */
  private arrow(handle: 'x' | 'y', color: string, into: Group): void {
    const g = new Group();
    const shaft = this.layer(new Mesh(new CylinderGeometry(0.022, 0.022, 0.8, 8), this.mat(handle, color)));
    shaft.rotation.z = -Math.PI / 2;
    shaft.position.x = 0.4;
    const head = this.layer(new Mesh(new ConeGeometry(0.075, 0.22, 14), this.mat(handle, color)));
    head.rotation.z = -Math.PI / 2;
    head.position.x = 0.9;
    g.add(shaft, head);
    const fat = new Mesh(new CylinderGeometry(HIT_HALF, HIT_HALF, 1.05, 8));
    fat.rotation.z = -Math.PI / 2;
    fat.position.x = 0.55;
    this.hit(handle, fat, g);
    // Y of the level is three.js's +Z: a quarter turn the other way round.
    if (handle === 'y') g.rotation.y = -Math.PI / 2;
    into.add(g);
  }

  private buildMove(): void {
    const g = this.parts.Move;
    this.arrow('x', GIZMO_COLORS.x, g);
    this.arrow('y', GIZMO_COLORS.y, g);
    const sq = this.layer(new Mesh(new BoxGeometry(0.22, 0.01, 0.22), this.mat('xy', GIZMO_COLORS.plane, 0.7)));
    sq.position.set(0.3, 0, 0.3);
    g.add(sq);
    const fat = new Mesh(new BoxGeometry(2 * HIT_HALF, 0.1, 2 * HIT_HALF));
    fat.position.set(0.3, 0, 0.3);
    this.hit('xy', fat, g);
  }

  private buildRotate(): void {
    const g = this.parts.Rotate;
    const ring = this.layer(new Mesh(new TorusGeometry(0.75, 0.022, 8, 64), this.mat('rot', GIZMO_COLORS.z)));
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
    const fat = new Mesh(new TorusGeometry(0.75, HIT_HALF, 6, 32));
    fat.rotation.x = Math.PI / 2;
    this.hit('rot', fat, g);
  }

  private buildScale(): void {
    const g = this.parts.Scale;
    for (const [handle, color, turn] of [
      ['sx', GIZMO_COLORS.x, 0],
      ['sy', GIZMO_COLORS.y, -Math.PI / 2],
    ] as const) {
      const arm = new Group();
      const line = this.layer(new Mesh(new CylinderGeometry(0.02, 0.02, 0.8, 8), this.mat(handle, color)));
      line.rotation.z = -Math.PI / 2;
      line.position.x = 0.4;
      const cube = this.layer(new Mesh(new BoxGeometry(0.13, 0.13, 0.13), this.mat(handle, color)));
      cube.position.x = 0.86;
      arm.add(line, cube);
      const fat = new Mesh(new BoxGeometry(1.05, 2 * HIT_HALF, 2 * HIT_HALF));
      fat.position.x = 0.55;
      this.hit(handle, fat, arm);
      arm.rotation.y = turn;
      g.add(arm);
    }
    const centre = this.layer(new Mesh(new BoxGeometry(0.15, 0.15, 0.15), this.mat('sxy', GIZMO_COLORS.uniform)));
    g.add(centre);
    this.hit('sxy', new Mesh(new BoxGeometry(2 * HIT_HALF, 2 * HIT_HALF, 2 * HIT_HALF)), g);
  }
}
