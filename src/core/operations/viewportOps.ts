/**
 * The Blueprint editor's Viewport: moving a component by dragging it. The
 * drag is measured on screen, in the actor's frame (the Viewport shows the
 * actor at the origin, facing +X); the component's Location is relative to
 * its parent, which may be turned: the move is turned back into the
 * parent's frame, as UE's gizmo does with Relative Location.
 */
import type { BlueprintClass, Component } from '../model/project';

const DEG = Math.PI / 180;

/** Sum of the Rotation Yaw of the component's parents (the frame its Location is in). */
export function parentYaw(components: Component[], id: string): number {
  let yaw = 0;
  let cur = components.find((c) => c.id === id);
  for (let guard = 0; cur?.parent && guard < 32; guard++) {
    const parent = components.find((c) => c.id === cur?.parent);
    if (!parent) break;
    yaw += parent.props.yaw;
    cur = parent;
  }
  return yaw;
}

/** Where a component is in the actor's frame (the Viewport's world). */
export function componentInActor(components: Component[], id: string): { x: number; y: number; yaw: number } {
  const chain: Component[] = [];
  let cur = components.find((c) => c.id === id);
  for (let guard = 0; cur && guard < 32; guard++) {
    chain.unshift(cur);
    const parentId = cur.parent;
    cur = parentId ? components.find((c) => c.id === parentId) : undefined;
  }
  let t = { x: 0, y: 0, yaw: 0 };
  for (const c of chain) {
    const r = t.yaw * DEG;
    t = { x: t.x + c.props.x * Math.cos(r) - c.props.y * Math.sin(r), y: t.y + c.props.x * Math.sin(r) + c.props.y * Math.cos(r), yaw: t.yaw + c.props.yaw };
  }
  return t;
}

/**
 * Move one of the class's own components by (dx, dy) in the actor's frame.
 * `all` is every component the class has, inherited ones included (a
 * child's components hang on its parent's root). The root never moves: in
 * UE it is the actor's origin.
 */
export function moveComponentBy(cls: BlueprintClass, all: Component[], id: string, dx: number, dy: number): boolean {
  const comp = cls.components.find((c) => c.id === id);
  if (!comp?.parent) return false;
  const r = -parentYaw(all, id) * DEG;
  comp.props.x += dx * Math.cos(r) - dy * Math.sin(r);
  comp.props.y += dx * Math.sin(r) + dy * Math.cos(r);
  return true;
}

/** End of a drag: whole centimetres, as the Details panel shows them. */
export function roundComponentLocation(cls: BlueprintClass, id: string): void {
  const comp = cls.components.find((c) => c.id === id);
  if (!comp) return;
  // `|| 0`: no « -0 » in the Details panel.
  comp.props.x = Math.round(comp.props.x) || 0;
  comp.props.y = Math.round(comp.props.y) || 0;
}
