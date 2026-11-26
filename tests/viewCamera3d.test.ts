/** 3D-1 (V7.78): the level editor's camera in 3D (UE's viewport types) and the decluttering of its labels. */
import { describe, expect, it } from 'vitest';
import { ViewCamera } from '../src/editor/world3d/viewCamera';
import { declutter } from '../src/editor/world3d/htmlLabels';

const level = { x0: -800, y0: -600, x1: 800, y1: 400, h: 250 };

function cam(kind: ConstructorParameters<typeof ViewCamera>[0]) {
  const c = new ViewCamera(kind);
  c.resize(800, 250);
  c.frame(level);
  return c;
}

describe('viewport types', () => {
  it('frames the whole level on the screen, in every view', () => {
    for (const kind of ['Perspective', 'Top', 'Bottom', 'Left', 'Right', 'Front', 'Back'] as const) {
      const c = cam(kind);
      for (const x of [level.x0, level.x1])
        for (const y of [level.y0, level.y1]) {
          const p = c.toScreen(x, y, 0);
          expect(p.x, `${kind} x`).toBeGreaterThanOrEqual(-1);
          expect(p.x, `${kind} x`).toBeLessThanOrEqual(801);
          expect(p.y, `${kind} y`).toBeGreaterThanOrEqual(-1);
          expect(p.y, `${kind} y`).toBeLessThanOrEqual(251);
        }
    }
  });

  it('looks the way UE names them: X to the right from Front, mirrored from Back, Y to the right from Left', () => {
    const right = (kind: Parameters<typeof cam>[0], x: number, y: number) => cam(kind).toScreen(x, y).x;
    expect(right('Front', 500, 0)).toBeGreaterThan(right('Front', -500, 0));
    expect(right('Back', 500, 0)).toBeLessThan(right('Back', -500, 0));
    expect(right('Left', 0, 300)).toBeGreaterThan(right('Left', 0, -300));
    expect(right('Right', 0, 300)).toBeLessThan(right('Right', 0, -300));
    // Higher is higher on the screen in a side view.
    const f = cam('Front');
    expect(f.toScreen(0, 0, 200).y).toBeLessThan(f.toScreen(0, 0, 0).y);
  });

  it('drags on the floor in Perspective, and along the view in a side view', () => {
    const p = cam('Perspective');
    const a = p.toScreen(0, 0);
    const from = p.dragPoint(a.x, a.y)!;
    expect(Math.abs(from.x)).toBeLessThan(2);
    expect(Math.abs(from.y)).toBeLessThan(2);
    const f = cam('Front');
    const s = f.toScreen(0, 0);
    const d0 = f.dragPoint(s.x, s.y)!,
      d1 = f.dragPoint(s.x + 50, s.y)!;
    expect(d1.x - d0.x).toBeGreaterThan(0);
    expect(Math.abs(d1.y - d0.y)).toBeLessThan(1);
  });

  it('orbits in Perspective only, and keeps a sensible angle', () => {
    const p = cam('Perspective');
    p.orbit(0, 10000);
    expect(p.pitch).toBeLessThanOrEqual(89);
    p.orbit(0, -10000);
    expect(p.pitch).toBeGreaterThanOrEqual(4);
    const f = cam('Front');
    const before = f.toScreen(300, 0).x;
    f.orbit(200, 0);
    expect(f.toScreen(300, 0).x).toBe(before);
  });

  it('pinches closer and keeps the point under the fingers in an orthographic view', () => {
    const t = cam('Bottom');
    const s = t.toScreen(400, 200);
    t.zoom(2, s.x, s.y);
    const s2 = t.toScreen(400, 200);
    expect(Math.abs(s2.x - s.x)).toBeLessThan(0.5);
    expect(Math.abs(s2.y - s.y)).toBeLessThan(0.5);
  });
});

describe('labels', () => {
  it('keeps the selected one and drops those it would cover', () => {
    const out = declutter([
      { key: 'a', text: 'BP_Lampe', x: 100, y: 100 },
      { key: 'b', text: 'BP_Lampe2', x: 104, y: 102, cls: 'selected' },
      { key: 'c', text: 'BP_Porte', x: 400, y: 100 },
      { key: 'w', text: 'WBP_Barre', x: 100, y: 100, w: 80, h: 20, cls: 'frame' },
    ]);
    expect(out.map((l) => l.key).sort()).toEqual(['b', 'c', 'w']);
  });
});
