/** V7.9: the Blueprint Viewport (moving components) and the level Outliner. */
import { describe, expect, it } from 'vitest';
import { ProjectBuilder } from '../src/core/lessons/builder';
import { componentInActor, moveComponentBy, parentYaw, roundComponentLocation } from '../src/core/operations/viewportOps';
import { outlinerRows } from '../src/core/model/outliner';

function lamp() {
  const pb = new ProjectBuilder('vp');
  const b = pb.blueprint('BP_Porte');
  const pivot = b.component('Scene', 'Pivot', { yaw: 90 });
  const door = b.component('StaticMesh', 'Porte', { x: 50, y: 0 });
  const cls = b.cls;
  cls.components.find((c) => c.id === door)!.parent = pivot;
  return { pb, b, cls, pivot, door };
}

describe('Viewport: moving a component', () => {
  it('a component under a turned parent moves in the parent’s frame, so it follows the finger', () => {
    const { cls, door, pivot } = lamp();
    expect(parentYaw(cls.components, door)).toBe(90);
    const before = componentInActor(cls.components, door);
    expect(moveComponentBy(cls, cls.components, door, 30, 0)).toBe(true);
    const after = componentInActor(cls.components, door);
    expect(after.x - before.x).toBeCloseTo(30);
    expect(after.y - before.y).toBeCloseTo(0);
    // Relative Location changed along the parent's own axes.
    const d = cls.components.find((c) => c.id === door)!.props;
    expect(d.x).toBeCloseTo(50);
    expect(d.y).toBeCloseTo(-30);
    expect(cls.components.find((c) => c.id === pivot)!.props.x).toBe(0);
  });

  it('the root never moves, and a drag ends on whole centimetres', () => {
    const { cls, door } = lamp();
    const root = cls.components.find((c) => !c.parent)!;
    expect(moveComponentBy(cls, cls.components, root.id, 10, 10)).toBe(false);
    moveComponentBy(cls, cls.components, door, 0.4, 12.6);
    roundComponentLocation(cls, door);
    const d = cls.components.find((c) => c.id === door)!.props;
    expect([d.x, d.y]).toEqual([63, 0]);
  });
});

describe('level Outliner', () => {
  it('lists the Player Start, the placed actors and the WorldSettings with their type, sorted by label as UE, and filters', () => {
    const { pb, b } = lamp();
    const lampe = pb.blueprint('BP_Lampe');
    pb.place(lampe, 0, 0);
    pb.place(b, 100, 0);
    const rows = outlinerRows(pb.project, '');
    expect(rows.map((r) => `${r.label}:${r.type}`)).toEqual(['BP_Lampe:BP_Lampe', 'BP_Porte:BP_Porte', 'Player Start:PlayerStart', 'WorldSettings:WorldSettings']);
    expect(outlinerRows(pb.project, 'porte').map((r) => r.label)).toEqual(['BP_Porte']);
    expect(outlinerRows(pb.project, 'start')[0].id).toBe('playerStart');
  });
});
