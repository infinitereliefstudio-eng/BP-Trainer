/** 3D-2 (V7.79): the gizmo's arithmetic, on a plain top-down projector (1 cm = 1 px, Y down) and on a real camera. */
import { describe, expect, it } from 'vitest';
import { GizmoDrag, type Transform } from '../src/editor/world3d/gizmoDrag';
import { alongAxis, axisOf, normalizeYaw, snap, turn, type GizmoSettings } from '../src/editor/world3d/gizmoMath';
import { ViewCamera } from '../src/editor/world3d/viewCamera';

const flat = {
  toScreen: (x: number, y: number) => ({ x, y }),
  dragPoint: (x: number, y: number) => ({ x, y }),
  verticalLook: () => 1,
};
const settings = (p: Partial<GizmoSettings> = {}): GizmoSettings => ({ tool: 'Move', space: 'World', grid: 10, rotation: 10, scale: 10, ...p });
const box: Transform = { x: 100, y: 50, yaw: 0, sizeX: 100, sizeY: 60 };

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

  it('scales a box both ways, a door from its hinge, a cylinder round', () => {
    expect(new GizmoDrag('sx', box, flat, settings(), { x: 150, y: 50 }).at({ x: 170, y: 50 }).sizeX).toBe(140);
    expect(new GizmoDrag('sx', { ...box, sizing: 'door' }, flat, settings(), { x: 150, y: 50 }).at({ x: 170, y: 50 }).sizeX).toBe(120);
    const round = new GizmoDrag('sy', { ...box, sizeX: 60, sizeY: 60, sizing: 'round' }, flat, settings(), { x: 100, y: 80 }).at({ x: 100, y: 100 });
    expect([round.sizeX, round.sizeY]).toEqual([100, 100]);
    expect(new GizmoDrag('sx', box, flat, settings(), { x: 150, y: 50 }).at({ x: -500, y: 50 }).sizeX).toBe(1);
  });

  it('works through a real camera: the red arrow seen in Perspective moves along X', () => {
    const cam = new ViewCamera('Perspective');
    cam.resize(800, 300);
    cam.frame({ x0: -300, y0: -300, x1: 300, y1: 300, h: 100 });
    const view = { toScreen: (x: number, y: number, h?: number) => cam.toScreen(x, y, h), dragPoint: (x: number, y: number) => cam.dragPoint(x, y), verticalLook: () => cam.verticalLook() };
    const o: Transform = { x: 0, y: 0, yaw: 0, sizeX: 100, sizeY: 100 };
    const a = cam.toScreen(40, 0, 5),
      b = cam.toScreen(140, 0, 5);
    const t = new GizmoDrag('x', o, view, settings({ grid: 0 }), a).at(b);
    expect(t.x).toBeGreaterThan(90);
    expect(t.x).toBeLessThan(110);
    expect(t.y).toBe(0);
  });
});
