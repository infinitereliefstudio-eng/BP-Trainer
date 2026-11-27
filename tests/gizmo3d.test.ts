/** 3D-2 (V7.79): the gizmo's arithmetic, on a plain top-down projector (1 cm = 1 px, Y down) and on a real camera. */
import { Raycaster, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { Gizmo, GIZMO_PX, HIT_HALF } from '../src/editor/world3d/gizmo';
import { GizmoDrag, type Transform } from '../src/editor/world3d/gizmoDrag';
import { alongAxis, axisOf, normalizeYaw, snap, turn, type GizmoSettings } from '../src/editor/world3d/gizmoMath';
import { ViewCamera } from '../src/editor/world3d/viewCamera';

const flat = {
  toScreen: (x: number, y: number) => ({ x, y }),
  dragPoint: (x: number, y: number) => ({ x, y }),
  verticalLook: () => 1,
};
const settings = (p: Partial<GizmoSettings> = {}): GizmoSettings => ({ tool: 'Move', space: 'World', grid: 10, rotation: 10, scale: 0.25, ...p });
const box: Transform = { x: 100, y: 50, yaw: 0, scaleX: 1, scaleY: 1, scaleZ: 1 };

describe('gizmo arithmetic', () => {
  it('snaps as UE, and never gives -0', () => {
    expect(snap(213.47, 10)).toBe(210);
    expect(snap(213.47, 0)).toBe(213);
    expect(Object.is(snap(-0.2, 10), 0)).toBe(true);
    expect(normalizeYaw(270)).toBe(-90);
    expect(normalizeYaw(-180)).toBe(180);
    expect(turn(170, -170)).toBe(20);
  });

  it('measures a drag along an axis as the screen shows it', () => {
    expect(alongAxis(flat, { x: 0, y: 0 }, 0, axisOf('x', 0), 40, 25)).toBeCloseTo(40);
    expect(alongAxis(flat, { x: 0, y: 0 }, 0, axisOf('y', 0), 40, 25)).toBeCloseTo(25);
    // Local space: the X of an actor turned by 90° is the level's Y.
    expect(alongAxis(flat, { x: 0, y: 0 }, 0, axisOf('x', 90), 0, 30)).toBeCloseTo(30);
  });
});

describe('a drag of a handle', () => {
  it('moves along X only, landing on the grid', () => {
    const d = new GizmoDrag('x', box, flat, settings(), { x: 150, y: 50 });
    const t = d.at({ x: 187, y: 90 });
    expect(t.x).toBe(140);
    expect(t.y).toBe(50);
  });

  it('moves along the actor’s own X in Local space', () => {
    const d = new GizmoDrag('x', { ...box, yaw: 90 }, flat, settings({ space: 'Local' }), { x: 100, y: 100 });
    const t = d.at({ x: 100, y: 133 });
    expect(t.x).toBeCloseTo(100);
    expect(t.y).toBeCloseTo(80);
  });

  it('slides on the floor with the square', () => {
    const d = new GizmoDrag('xy', box, flat, settings(), { x: 120, y: 70 });
    expect(d.at({ x: 161, y: 33 })).toMatchObject({ x: 140, y: 10 });
  });

  it('turns by the angle around the gizmo, snapped to the rotation step', () => {
    const d = new GizmoDrag('rot', box, flat, settings(), { x: 200, y: 50 });
    // A quarter turn clockwise on the screen (Y down) around (100, 50): +90° of Yaw, as in the top view.
    let t = box;
    for (let a = 0; a <= 90; a += 10) t = d.at({ x: 100 + 100 * Math.cos((a * Math.PI) / 180), y: 50 + 100 * Math.sin((a * Math.PI) / 180) });
    expect(t.yaw).toBe(90);
    const seenFromBelow = new GizmoDrag('rot', box, { ...flat, verticalLook: () => -1 }, settings(), { x: 200, y: 50 });
    let u = box;
    for (let a = 0; a <= 90; a += 10) u = seenFromBelow.at({ x: 100 + 100 * Math.cos((a * Math.PI) / 180), y: 50 + 100 * Math.sin((a * Math.PI) / 180) });
    expect(u.yaw).toBe(-90);
  });

  it('changes the Scale as UE does: by the way the finger goes along the handle, snapped to the Scale Snap factor (V7.83)', () => {
    // The handle's own length (90 px) adds 1.
    expect(new GizmoDrag('sx', box, flat, settings(), { x: 150, y: 50 }).at({ x: 240, y: 50 }).scaleX).toBe(2);
    // 25 px: +0.28, on the 0.25 step.
    const t = new GizmoDrag('sy', box, flat, settings(), { x: 100, y: 80 }).at({ x: 100, y: 105 });
    expect([t.scaleX, t.scaleY, t.scaleZ]).toEqual([1, 1.25, 1]);
    // Never 0 or less.
    expect(new GizmoDrag('sx', box, flat, settings(), { x: 150, y: 50 }).at({ x: -500, y: 50 }).scaleX).toBe(0.25);
    // The centre cube: the three together.
    const u = new GizmoDrag('sxy', { ...box, scaleX: 2 }, flat, settings(), { x: 100, y: 50 }).at({ x: 190, y: 50 });
    expect([u.scaleX, u.scaleY, u.scaleZ]).toEqual([4, 2, 2]);
    // Without snap, on the thousandth.
    expect(new GizmoDrag('sx', box, flat, settings({ scale: 0 }), { x: 150, y: 50 }).at({ x: 160, y: 50 }).scaleX).toBe(1.111);
  });

  it('works through a real camera: the red arrow seen in Perspective moves along X', () => {
    const cam = new ViewCamera('Perspective');
    cam.resize(800, 300);
    cam.frame({ x0: -300, y0: -300, x1: 300, y1: 300, h: 100 });
    const view = { toScreen: (x: number, y: number, h?: number) => cam.toScreen(x, y, h), dragPoint: (x: number, y: number) => cam.dragPoint(x, y), verticalLook: () => cam.verticalLook() };
    const o: Transform = { x: 0, y: 0, yaw: 0, scaleX: 1, scaleY: 1, scaleZ: 1 };
    const a = cam.toScreen(40, 0, 5),
      b = cam.toScreen(140, 0, 5);
    const t = new GizmoDrag('x', o, view, settings({ grid: 0 }), a).at(b);
    expect(t.x).toBeGreaterThan(90);
    expect(t.x).toBeLessThan(110);
    expect(t.y).toBe(0);
  });
});

describe('gizmo handles under a finger (V7.81)', () => {
  // 1 cm per px: the gizmo is 90 px long, a finger is about 44 px wide.
  const down = (x: number, y: number) => new Raycaster(new Vector3(x, 1000, y), new Vector3(0, -1, 0));
  const at = (mode: 'Move' | 'Rotate' | 'Scale') => {
    const g = new Gizmo();
    g.place(mode, 0, 0, 5, 0, 1);
    return g;
  };

  it('takes a finger at least 44 px wide on every handle', () => {
    expect(2 * HIT_HALF * GIZMO_PX).toBeGreaterThanOrEqual(44);
    const move = at('Move');
    // 21 px beside the X arrow, 21 px beside the Y arrow.
    expect(move.pick(down(70, 21))).toBe('x');
    expect(move.pick(down(70, -21))).toBe('x');
    expect(move.pick(down(21, 70))).toBe('y');
    // 20 px outside and inside the ring.
    expect(at('Rotate').pick(down(67.5 + 20, 0))).toBe('rot');
    expect(at('Rotate').pick(down(0, 67.5 - 20))).toBe('rot');
    expect(at('Scale').pick(down(80, 21))).toBe('sx');
  });

  it('gives the arrows their whole length, the yellow square what lies between them, the centre to the centre cube', () => {
    expect(at('Move').pick(down(27, 27))).toBe('xy');
    expect(at('Move').pick(down(45, 40))).toBe('xy');
    expect(at('Move').pick(down(40, 10))).toBe('x');
    expect(at('Move').pick(down(10, 40))).toBe('y');
    expect(at('Scale').pick(down(5, 3))).toBe('sxy');
  });
});
