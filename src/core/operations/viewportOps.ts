/**
 * The Blueprint editor's Viewport: moving a component by dragging it. The
 * drag is measured on screen, in the actor's frame (the Viewport shows the
 * actor at the origin, facing +X); the component's Location is relative to
 * its parent, which may be turned: the move is turned back into the
 * parent's frame, as UE's gizmo does with Relative Location.
 */
import { type BlueprintClass, type Component, isSceneComponent } from '../model/project';
import { chainOf, compose, type FrameTransform, rootComponent, scaleOf } from '../model/scale';

const DEG = Math.PI / 180;

/** Sum of the Rotation Yaw of the component's parents (the frame its Location is in). */
export function parentYaw(components: Component[], id: string): number {
  return parentFrame(components, id).yaw;
}

/**
 * The frame a component's Location is in, in the actor's frame: its parent's world Yaw and scale (a parent's scale
 * stretches its children's Location, as in UE: V7.83).
 */
export function parentFrame(components: Component[], id: string): FrameTransform {
  const c = components.find((k) => k.id === id);
  const scene = components.filter(isSceneComponent);
  const parent = c?.parent ? scene.find((k) => k.id === c.parent) : undefined;
  if (parent) return compose(chainOf(scene, parent), { x: 0, y: 0, yaw: 0 }, rootComponent(scene));
  // No parent: on the actor's origin, with the root's scale if it is not the root itself.
  const root = rootComponent(scene);
  const s = root && root !== c ? scaleOf(root.props) : { x: 1, y: 1, z: 1 };
  return { x: 0, y: 0, yaw: 0, sx: s.x, sy: s.y, sz: s.z };
}

/** Where a component is in the actor's frame (the Viewport's world), with its world scale. */
export function componentInActor(components: Component[], id: string): FrameTransform {
  const scene = components.filter(isSceneComponent);
  const c = scene.find((k) => k.id === id);
  if (!c) return { x: 0, y: 0, yaw: 0, sx: 1, sy: 1, sz: 1 };
  return compose(chainOf(scene, c), { x: 0, y: 0, yaw: 0 }, rootComponent(scene));
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
  const f = parentFrame(all, id);
  const r = -f.yaw * DEG;
  comp.props.x += (dx * Math.cos(r) - dy * Math.sin(r)) / (f.sx || 1);
  comp.props.y += (dx * Math.sin(r) + dy * Math.cos(r)) / (f.sy || 1);
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
