/**
 * Just enough 2D geometry for the top view: oriented boxes and circles,
 * overlap tests (separating axis) and pushing the player out of walls.
 */
import { collisionQueries } from '../types/enums';
import { componentTransform, PLAYER_RADIUS, type ActorRT, type ComponentRT } from './world';

export type Shape =
  | { kind: 'obb'; cx: number; cy: number; hx: number; hy: number; angle: number }
  | { kind: 'circle'; cx: number; cy: number; r: number };

const DEG = Math.PI / 180;

/** Footprint of a component in world space, or undefined if it has none. */
export function componentShape(actor: ActorRT, c: ComponentRT): Shape | undefined {
  const t = componentTransform(actor, c);
  const a = t.yaw * DEG;
  if (c.kind === 'BoxCollision') {
    return { kind: 'obb', cx: t.x, cy: t.y, hx: c.props.sizeX / 2, hy: c.props.sizeY / 2, angle: a };
  }
  if (c.kind === 'StaticMesh') {
    if (c.props.shape === 'cylinder') return { kind: 'circle', cx: t.x, cy: t.y, r: c.props.sizeX / 2 };
    if (c.props.shape === 'door') {
      // A door pivots on its hinge: the mesh spans 0..sizeX along its local X.
      const half = c.props.sizeX / 2;
      return { kind: 'obb', cx: t.x + Math.cos(a) * half, cy: t.y + Math.sin(a) * half, hx: half, hy: c.props.sizeY / 2, angle: a };
    }
    return { kind: 'obb', cx: t.x, cy: t.y, hx: c.props.sizeX / 2, hy: c.props.sizeY / 2, angle: a };
  }
  return undefined;
}

export function playerShape(p: ActorRT): Shape {
  return { kind: 'circle', cx: p.x, cy: p.y, r: PLAYER_RADIUS };
}

/**
 * Shapes that generate overlap events for an actor: its Box Collisions, plus
 * the capsule for the player. A Blueprint player's own zones count too, as
 * every component of a Pawn does in UE.
 */
export function overlapShapes(actor: ActorRT): { comp?: ComponentRT; shape: Shape }[] {
  const out: { comp?: ComponentRT; shape: Shape }[] = actor.isPlayer ? [{ shape: playerShape(actor) }] : [];
  for (const c of actor.components) {
    if (c.kind !== 'BoxCollision' || !collisionQueries(c.props.collision)) continue;
    const s = componentShape(actor, c);
    if (s) out.push({ comp: c, shape: s });
  }
  return out;
}

function corners(b: Extract<Shape, { kind: 'obb' }>): [number, number][] {
  const c = Math.cos(b.angle),
    s = Math.sin(b.angle);
  const pts: [number, number][] = [];
  for (const [sx, sy] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]) {
    const lx = sx * b.hx,
      ly = sy * b.hy;
    pts.push([b.cx + lx * c - ly * s, b.cy + lx * s + ly * c]);
  }
  return pts;
}

/** Closest point of a box to a point, in world space. */
function closestOnObb(b: Extract<Shape, { kind: 'obb' }>, px: number, py: number): [number, number] {
  const c = Math.cos(b.angle),
    s = Math.sin(b.angle);
  const dx = px - b.cx,
    dy = py - b.cy;
  const lx = Math.max(-b.hx, Math.min(b.hx, dx * c + dy * s));
  const ly = Math.max(-b.hy, Math.min(b.hy, -dx * s + dy * c));
  return [b.cx + lx * c - ly * s, b.cy + lx * s + ly * c];
}

export function overlaps(a: Shape, b: Shape): boolean {
  if (a.kind === 'circle' && b.kind === 'circle') return Math.hypot(a.cx - b.cx, a.cy - b.cy) < a.r + b.r;
  if (a.kind === 'circle' && b.kind === 'obb') {
    const [qx, qy] = closestOnObb(b, a.cx, a.cy);
    return Math.hypot(a.cx - qx, a.cy - qy) < a.r;
  }
  if (a.kind === 'obb' && b.kind === 'circle') return overlaps(b, a);
  // Two boxes: separating axis theorem on the four edge normals.
  const A = a as Extract<Shape, { kind: 'obb' }>;
  const B = b as Extract<Shape, { kind: 'obb' }>;
  const ca = corners(A),
    cb = corners(B);
  for (const angle of [A.angle, A.angle + Math.PI / 2, B.angle, B.angle + Math.PI / 2]) {
    const ax = Math.cos(angle),
      ay = Math.sin(angle);
    const pa = ca.map(([x, y]) => x * ax + y * ay);
    const pb = cb.map(([x, y]) => x * ax + y * ay);
    if (Math.max(...pa) <= Math.min(...pb) || Math.max(...pb) <= Math.min(...pa)) return false;
  }
  return true;
}

/** Move a circle out of a blocking shape; returns the corrected centre. */
export function pushOut(px: number, py: number, r: number, wall: Shape): [number, number] {
  if (wall.kind === 'circle') {
    const dx = px - wall.cx,
      dy = py - wall.cy;
    const d = Math.hypot(dx, dy);
    const min = r + wall.r;
    if (d >= min || d === 0) return [px, py];
    return [wall.cx + (dx / d) * min, wall.cy + (dy / d) * min];
  }
  const [qx, qy] = closestOnObb(wall, px, py);
  const dx = px - qx,
    dy = py - qy;
  const d = Math.hypot(dx, dy);
  if (d >= r) return [px, py];
  if (d > 1e-6) return [qx + (dx / d) * r, qy + (dy / d) * r];
  // Centre inside the box: leave along the shortest local axis.
  const c = Math.cos(wall.angle),
    s = Math.sin(wall.angle);
  const lx = (px - wall.cx) * c + (py - wall.cy) * s;
  const ly = -(px - wall.cx) * s + (py - wall.cy) * c;
  const outX = wall.hx - Math.abs(lx);
  const outY = wall.hy - Math.abs(ly);
  let nx = lx,
    ny = ly;
  if (outX < outY) nx = Math.sign(lx || 1) * (wall.hx + r);
  else ny = Math.sign(ly || 1) * (wall.hy + r);
  return [wall.cx + nx * c - ny * s, wall.cy + nx * s + ny * c];
}
