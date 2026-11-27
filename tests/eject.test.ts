/** Revue de la marche A (V7.81) : Eject lâche les touches tenues, la caméra de Play saute sur le nouveau niveau. */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createProject } from '../src/core/model/project';
import { FollowCamera } from '../src/editor/world3d/followCamera';
import { PlaySession } from '../src/editor/world/playSession';

const g = globalThis as unknown as Record<string, unknown>;
beforeAll(() => {
  g.requestAnimationFrame = () => 0;
  g.cancelAnimationFrame = () => undefined;
});
afterAll(() => {
  delete g.requestAnimationFrame;
  delete g.cancelAnimationFrame;
});

describe('Eject (V7.81)', () => {
  it('lets go of a key held when it ejects, once only', () => {
    const s = new PlaySession(createProject());
    const release = vi.spyOn(s.sim, 'releaseKey');
    s.pressKey('E');
    s.setEjected(true);
    expect(release).toHaveBeenCalledWith('E');
    // The touch that held E ends afterwards: nothing more is sent.
    s.releaseKey('E');
    expect(release).toHaveBeenCalledTimes(1);
    s.dispose();
  });
});

describe('follow camera after Open Level (V7.81)', () => {
  it('jumps to the new Player Start instead of sliding there', () => {
    const cam = new FollowCamera();
    cam.resize(800, 370);
    cam.follow(0, 0, 0);
    cam.jumpTo(3000, 2000);
    cam.follow(3000, 2000, 0.016);
    expect(cam.target.x).toBeCloseTo(3000);
    expect(cam.target.y).toBeCloseTo(2000);
  });
});
