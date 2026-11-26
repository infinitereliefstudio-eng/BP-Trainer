/** 3D-0 (V7.77): the heights the 3D view guesses for a flat level, and its follow camera's projection. */
import { describe, expect, it } from 'vitest';
import { DOOR_HEIGHT, lightHeight, meshHeight, POST_HEIGHT, WALL_HEIGHT } from '../src/editor/world3d/heights';
import { FollowCamera, MAX_DISTANCE, MIN_DISTANCE } from '../src/editor/world3d/followCamera';
import type { ComponentProps } from '../src/core/model/project';

const mesh = (p: Partial<ComponentProps>) => ({
  kind: 'StaticMesh' as const,
  props: { x: 0, y: 0, yaw: 0, sizeX: 100, sizeY: 100, shape: 'cube', visible: true, blocks: true, color: '#888888', intensity: 0, radius: 0, text: '', collision: 3, ...p } as ComponentProps,
});

describe('heights of the 3D view', () => {
  it('reads a door, a wall, a lamp post, a crate and a pad', () => {
    expect(meshHeight(mesh({ shape: 'door', sizeX: 200, sizeY: 16 }))).toBe(DOOR_HEIGHT);
    expect(meshHeight(mesh({ sizeX: 40, sizeY: 600 }))).toBe(WALL_HEIGHT);
    expect(meshHeight(mesh({ shape: 'cylinder', sizeX: 40, sizeY: 40 }))).toBe(POST_HEIGHT);
    expect(meshHeight(mesh({ sizeX: 100, sizeY: 100 }))).toBe(90);
    expect(meshHeight(mesh({ sizeX: 300, sizeY: 300, blocks: false }))).toBe(6);
    expect(meshHeight(mesh({ shape: 'cylinder', sizeX: 90, sizeY: 90 }))).toBe(99);
  });

  it('every height is between 6 cm and a wall', () => {
    for (const shape of ['cube', 'cylinder', 'door'] as const)
      for (const sx of [10, 40, 100, 400, 2000])
        for (const sy of [10, 40, 100, 400, 2000])
          for (const blocks of [true, false]) {
            const h = meshHeight(mesh({ shape, sizeX: sx, sizeY: sy, blocks }));
            expect(h).toBeGreaterThanOrEqual(6);
            expect(h).toBeLessThanOrEqual(WALL_HEIGHT);
          }
  });

  it('a light sits on top of its post, or hangs higher', () => {
    expect(lightHeight([mesh({ shape: 'cylinder', sizeX: 40, sizeY: 40 })])).toBeGreaterThan(POST_HEIGHT);
    expect(lightHeight([mesh({ sizeX: 100, sizeY: 100 })])).toBeGreaterThan(POST_HEIGHT);
  });
});

describe('follow camera', () => {
  it('shows the player in the middle, and the top of the level higher on the screen', () => {
    const cam = new FollowCamera();
    cam.resize(800, 370);
    cam.follow(500, 300, 0);
    const p = cam.toScreen(500, 300);
    expect(Math.abs(p.x - 400)).toBeLessThan(1);
    expect(p.y).toBeGreaterThan(150);
    expect(p.y).toBeLessThan(300);
    // Further « up » in the top view (smaller Y) is higher on the screen; larger X is to the right.
    expect(cam.toScreen(500, 0).y).toBeLessThan(p.y);
    expect(cam.toScreen(800, 300).x).toBeGreaterThan(p.x);
  });

  it('follows smoothly and stays within its distances', () => {
    const cam = new FollowCamera();
    cam.resize(800, 370);
    cam.follow(0, 0, 0);
    cam.follow(1000, 0, 0.016);
    expect(cam.target.x).toBeGreaterThan(0);
    expect(cam.target.x).toBeLessThan(1000);
    cam.zoomBy(100);
    expect(cam.distance).toBeGreaterThanOrEqual(MIN_DISTANCE);
    cam.zoomBy(0.001);
    expect(cam.distance).toBeLessThanOrEqual(MAX_DISTANCE);
  });
});
