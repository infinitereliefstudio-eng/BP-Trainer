/**
 * The level as a three.js scene during Play (3D-0, V7.77). Each frame, `sync` brings the scene in line with the
 * simulation: one object per drawn component (meshes, Box Collision wire boxes, light glows, Text Render sprites),
 * the player's capsule, the Line Traces' debug lines and the selection ring. Objects are made once and only moved
 * afterwards; they are rebuilt when their shape changes, and freed when their actor goes (Destroy Actor, Open Level).
 *
 * As in Play's top view, what is hidden in game is not drawn (Visible off, Set Actor Hidden In Game, the bulbs of
 * Point Lights); Box Collisions stay drawn, in wire, as the top view does to help learn.
 *
 * In the level editor (3D-1, V7.78, `editor`), as in UE's viewport: hidden components show faded, each Point Light
 * has its bulb, the Player Starts are drawn, and the view mode can be Lit, Unlit or Wireframe. Names, widget frames
 * and the variables' names on the reference arrows are HTML over the view (Level3DEditor).
 */
import {
  AmbientLight,
  BoxGeometry,
  BoxHelper,
  BufferGeometry,
  CapsuleGeometry,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  EdgesGeometry,
  Float32BufferAttribute,
  GridHelper,
  Group,
  HemisphereLight,
  LineBasicMaterial,
  LineDashedMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type Object3D,
  PlaneGeometry,
  PointLight,
  type Raycaster,
  RingGeometry,
  Scene,
  SphereGeometry,
  AdditiveBlending,
  type Sprite,
  type Material,
} from 'three';
import { componentShape } from '@core/runtime/physics';
import type { DebugLine } from '@core/runtime/trace';
import { componentTransform, PLAYER_RADIUS, type ActorRT, type ComponentRT } from '@core/runtime/world';
import { actorRadius, WORLD } from '../world/worldRender';
import { lightHeight, meshHeight, PLAYER_HEIGHT, TEXT_HEIGHT, ZONE_HEIGHT } from './heights';
import { glowTexture, textSprite } from './textures';

const DEG = Math.PI / 180;
/** Real lights at once: the nearest ones to the camera's target; the others keep their glow on the floor only. */
export const MAX_LIGHTS = 8;
/** UE's Intensity (5000 by default) to three.js's, for a light that fades as 1 / distance (decay 1). */
const LIGHT_SCALE = 260 / 5000;
const FLOOR_SIZE = 40000;

interface Item {
  sig: string;
  obj: Object3D;
  /** Keeps the last colour set, to avoid touching the material every frame. */
  color?: string;
}

export type ViewMode = 'Lit' | 'Unlit' | 'Wireframe';

export interface SyncInput {
  actors: readonly ActorRT[];
  /** Editor only: the level's Player Starts. */
  playerStarts?: readonly { id: string; x: number; y: number; yaw: number }[];
  /** Editor only: an actor's Instance Editable variable points at another actor. */
  references?: readonly { from: string; to: string }[];
  /** The Blueprint's Viewport: the selected component (`actor id|component id`), outlined. */
  selectedComponent?: string;
  player?: ActorRT;
  debugLines?: readonly DebugLine[];
  selectedId?: string;
  /** Where the camera looks: the lights nearest to it get a real light. */
  focus: { x: number; y: number };
}

export class LevelScene {
  readonly scene = new Scene();
  private readonly items = new Map<string, Item>();
  private readonly pool: PointLight[] = [];
  private readonly capsule: Group;
  private readonly ring: Mesh;
  private traces?: LineSegments;
  private readonly pickable: Object3D[] = [];
  private refs?: LineSegments;
  private outline?: BoxHelper;
  private axes?: LineSegments;
  /** Lit, Unlit or Wireframe (UE's view modes, editor only). */
  mode: ViewMode = 'Lit';

  constructor(readonly editor = false) {
    this.scene.background = new Color(WORLD.floor);
    // The level's base light: a dim underground room, so the lamps of the lessons show when they are switched on.
    this.scene.add(new HemisphereLight(0xc8d2e0, 0x2a2622, 1.1));
    this.scene.add(new AmbientLight(0xffffff, 0.35));
    const sun = new DirectionalLight(0xffffff, 0.7);
    sun.position.set(-600, 1400, 900);
    this.scene.add(sun);

    const floor = new Mesh(new PlaneGeometry(FLOOR_SIZE, FLOOR_SIZE), new MeshStandardMaterial({ color: 0x34383f, roughness: 0.95, metalness: 0 }));
    floor.rotation.x = -Math.PI / 2;
    floor.name = 'floor';
    this.scene.add(floor);
    // One line per metre, a stronger one every 5 m, as the top view's grid.
    const grid = new GridHelper(FLOOR_SIZE, FLOOR_SIZE / 100, 0x4a4f58, 0x3e434b);
    grid.position.y = 0.6;
    (grid.material as Material).transparent = true;
    (grid.material as Material).opacity = 0.7;
    this.scene.add(grid);

    for (let i = 0; i < MAX_LIGHTS; i++) {
      // Every light is always there (intensity 0 when unused): adding or removing one would rebuild the shaders.
      const l = new PointLight(0xffffff, 0, 600, 1);
      this.pool.push(l);
      this.scene.add(l);
    }

    this.capsule = makeCapsule();
    this.scene.add(this.capsule);

    this.ring = new Mesh(new RingGeometry(1, 1.12, 48), new MeshBasicMaterial({ color: WORLD.selected, transparent: true, opacity: 0.95, depthWrite: false }));
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 2;
    this.ring.visible = false;
    this.scene.add(this.ring);
  }

  sync(input: SyncInput): void {
    const seen = new Set<string>();
    this.pickable.length = 0;
    const lights: { x: number; y: number; h: number; color: string; intensity: number; radius: number }[] = [];
    const player = input.player && !input.player.hidden && !input.player.destroyed ? input.player : undefined;
    const drawn = input.actors.filter((a) => (this.editor || !a.hidden) && !a.destroyed && !a.isPlayer);
    if (player) drawn.push(player);

    for (const a of drawn) {
      for (const c of a.components) {
        // In game a hidden component is not drawn; the editor shows it faded, as UE's viewport does.
        if (!c.props.visible && !this.editor) continue;
        const key = `${a.id}|${c.id}`;
        if (c.kind === 'StaticMesh') {
          const item = this.item(key, `${c.props.shape}|${c.props.sizeX}|${c.props.sizeY}|${c.props.blocks}`, () => makeMesh(c));
          placeMesh(item, a, c, this.mode, c.props.visible ? 1 : 0.35);
          item.obj.userData.actorId = a.isPlayer ? undefined : a.id;
          item.obj.userData.compId = c.id;
          item.obj.userData.prio = 1;
          if (!a.isPlayer) this.pickable.push(item.obj);
        } else if (c.kind === 'BoxCollision') {
          const item = this.item(key, `${c.props.sizeX}|${c.props.sizeY}`, () => makeZone(c, this.editor));
          for (const hit of item.obj.children) {
            hit.userData = { actorId: a.id, compId: c.id, prio: 2 };
            this.pickable.push(hit);
          }
          const t = componentTransform(a, c);
          // The box's own size, stretched by its world scale (V7.83).
          item.obj.scale.set(Math.abs(t.sx), Math.abs(t.sz), Math.abs(t.sy));
          item.obj.position.set(t.x, (ZONE_HEIGHT * Math.abs(t.sz)) / 2, t.y);
          item.obj.rotation.y = -t.yaw * DEG;
          const hot = [...a.compOverlaps].some((k) => k.startsWith(`${c.id}|`));
          const color = hot ? WORLD.zoneHot : '#d0d0d0';
          if (item.color !== color) {
            item.color = color;
            const m = (item.obj as LineSegments).material as LineDashedMaterial;
            m.color.set(color);
            m.opacity = hot ? 1 : 0.5;
          }
        } else if (c.kind === 'PointLight') {
          const t = componentTransform(a, c);
          if (this.editor) {
            // The bulb, an editor sprite in UE: coloured when the light is on at the start.
            const bulb = this.item(`${key}|bulb`, 'bulb', makeBulb);
            bulb.obj.position.set(t.x, lightHeight(a.components), t.y);
            bulb.obj.userData.actorId = a.id;
            bulb.obj.userData.compId = c.id;
            bulb.obj.userData.prio = 0;
            const on = c.props.visible && c.props.intensity > 0;
            const color = on ? c.props.color : '#4b5058';
            if (bulb.color !== color) {
              bulb.color = color;
              ((bulb.obj as Mesh).material as MeshBasicMaterial).color.set(color);
            }
            this.pickable.push(bulb.obj);
            seen.add(`${key}|bulb`);
            if (!c.props.visible) continue;
          }
          if (c.props.intensity <= 0) continue;
          const radius = Math.max(20, c.props.radius);
          const item = this.item(key, 'glow', makeGlow);
          item.obj.position.set(t.x, 1.2, t.y);
          item.obj.scale.set(radius, radius, 1);
          const m = (item.obj as Mesh).material as MeshBasicMaterial;
          if (item.color !== c.props.color) {
            item.color = c.props.color;
            m.color.set(c.props.color);
          }
          m.opacity = Math.min(1, c.props.intensity / 5000) * 0.5;
          lights.push({ x: t.x, y: t.y, h: lightHeight(a.components), color: c.props.color, intensity: c.props.intensity, radius });
        } else if (c.kind === 'TextRender') {
          const item = this.item(key, `${c.props.text}|${c.props.color}`, () => textSprite(c.props.text, c.props.color));
          const t = componentTransform(a, c);
          if (!item.obj.userData.base) item.obj.userData.base = { x: item.obj.scale.x, y: item.obj.scale.y };
          const base = item.obj.userData.base as { x: number; y: number };
          const k = Math.abs(t.sz);
          item.obj.scale.set(base.x * k, base.y * k, 1);
          (item.obj as Sprite).position.set(t.x, TEXT_HEIGHT * k, t.y);
          ((item.obj as Sprite).material as Material).opacity = c.props.visible ? 1 : 0.35;
          if (this.editor) {
            item.obj.userData = { actorId: a.id, compId: c.id, prio: 0 };
            this.pickable.push(item.obj);
          }
        }
        // Widget Components are HTML over the view (ComponentWidgets), placed with the camera.
        else continue;
        seen.add(key);
      }
    }

    for (const ps of input.playerStarts ?? []) {
      const key = `start|${ps.id}`;
      const item = this.item(key, 'start', makePlayerStart);
      item.obj.position.set(ps.x, 0, ps.y);
      item.obj.rotation.y = -ps.yaw * DEG;
      item.obj.traverse((o) => {
        if (o.userData.hit) {
          o.userData.actorId = ps.id;
          this.pickable.push(o);
        }
      });
      seen.add(key);
    }

    for (const [key, item] of this.items) {
      if (seen.has(key)) continue;
      if (this.outline && item.obj === (this.outline as BoxHelper & { object?: Object3D }).object) this.outline.visible = false;
      this.scene.remove(item.obj);
      dispose(item.obj);
      this.items.delete(key);
    }

    this.placeLights(this.mode === 'Lit' ? lights : [], input.focus);
    this.placeReferences(input.references ?? [], drawn);
    this.placePlayer(player);
    const sel = input.selectedId ? drawn.find((a) => a.id === input.selectedId) : undefined;
    const start = input.selectedId ? input.playerStarts?.find((p) => p.id === input.selectedId) : undefined;
    this.placeRing(sel ? { x: sel.x, y: sel.y, r: actorRadius(sel) + 14 } : start ? { x: start.x, y: start.y, r: PLAYER_RADIUS + 26 } : undefined);
    this.placeTraces(input.debugLines ?? []);
    this.placeOutline(input.selectedComponent);
  }

  /** The Blueprint's Viewport: its origin, the actor's root, and the axes X (red), Y (green) and Z (blue), as in UE. */
  showAxes(): void {
    if (this.axes) return;
    const L = 90;
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute([0, 1, 0, L, 1, 0, 0, 1, 0, 0, 1, L, 0, 1, 0, 0, L, 0], 3));
    const red = new Color('#e0433a'),
      green = new Color('#5bc236'),
      blue = new Color('#2f6fe4');
    g.setAttribute('color', new Float32BufferAttribute([...red.toArray(), ...red.toArray(), ...green.toArray(), ...green.toArray(), ...blue.toArray(), ...blue.toArray()], 3));
    this.axes = new LineSegments(g, new LineBasicMaterial({ vertexColors: true, depthTest: false, transparent: true }));
    this.axes.renderOrder = 900;
    this.scene.add(this.axes);
  }

  /** The component under a ray (the Blueprint's Viewport): small ones first, then meshes, then collision boxes. */
  pickComponent(ray: Raycaster): string | undefined {
    const hits = ray.intersectObjects(this.pickable, false).filter((h) => h.object.userData.compId);
    hits.sort((p, q) => (p.object.userData.prio ?? 1) - (q.object.userData.prio ?? 1) || p.distance - q.distance);
    return hits[0]?.object.userData.compId as string | undefined;
  }

  /** The selected component's box, in UE's selection colour. */
  private placeOutline(key: string | undefined): void {
    const item = key ? (this.items.get(key) ?? this.items.get(`${key}|bulb`)) : undefined;
    if (!item) {
      if (this.outline) this.outline.visible = false;
      return;
    }
    if (!this.outline) {
      this.outline = new BoxHelper(item.obj, WORLD.selected);
      (this.outline.material as Material).depthTest = false;
      this.outline.renderOrder = 950;
      this.scene.add(this.outline);
    }
    this.outline.visible = true;
    this.outline.setFromObject(item.obj);
  }

  /** The actor under a ray: its meshes first, then the actor whose origin is nearest to where the ray meets the floor. */
  pick(ray: Raycaster, actors: readonly ActorRT[], reach = 60): string | undefined {
    const hit = ray.intersectObjects(this.pickable, false)[0];
    const id = hit?.object.userData.actorId as string | undefined;
    if (id) return id;
    const o = ray.ray.origin,
      d = ray.ray.direction;
    if (d.y >= -1e-6) return undefined;
    const k = -o.y / d.y;
    const fx = o.x + d.x * k,
      fy = o.z + d.z * k;
    let best: { id: string; d: number } | undefined;
    for (const a of actors) {
      if (a.isPlayer || (a.hidden && !this.editor) || a.destroyed || !a.components.length) continue;
      const dist = Math.hypot(fx - a.x, fy - a.y);
      if (dist < reach && (!best || dist < best.d)) best = { id: a.id, d: dist };
    }
    return best?.id;
  }

  dispose(): void {
    this.scene.traverse((o) => dispose(o, false));
    this.items.clear();
  }

  private item(key: string, sig: string, make: () => Object3D): Item {
    let it = this.items.get(key);
    if (it && it.sig !== sig) {
      this.scene.remove(it.obj);
      dispose(it.obj);
      it = undefined;
    }
    if (!it) {
      it = { sig, obj: make() };
      this.items.set(key, it);
      this.scene.add(it.obj);
    }
    return it;
  }

  private placeLights(lights: { x: number; y: number; h: number; color: string; intensity: number; radius: number }[], focus: { x: number; y: number }): void {
    lights.sort((p, q) => Math.hypot(p.x - focus.x, p.y - focus.y) - Math.hypot(q.x - focus.x, q.y - focus.y));
    this.pool.forEach((l, i) => {
      const s = lights[i];
      if (!s) {
        l.intensity = 0;
        return;
      }
      l.position.set(s.x, s.h, s.y);
      l.color.set(s.color);
      l.intensity = s.intensity * LIGHT_SCALE;
      // UE's Attenuation Radius: the light reaches no further.
      l.distance = s.radius * 1.15;
    });
  }

  private placePlayer(p: ActorRT | undefined): void {
    this.capsule.visible = !!p;
    if (!p) return;
    this.capsule.position.set(p.x, 0, p.y);
    this.capsule.rotation.y = -p.yaw * DEG;
  }

  private placeRing(at: { x: number; y: number; r: number } | undefined): void {
    this.ring.visible = !!at;
    if (!at) return;
    this.ring.position.set(at.x, 2, at.y);
    this.ring.scale.set(at.r, at.r, 1);
  }

  /** Editor: a dashed arrow from an actor to the actor its Instance Editable reference points at, as in the top view. */
  private placeReferences(refs: readonly { from: string; to: string }[], actors: readonly ActorRT[]): void {
    if (this.refs) {
      this.scene.remove(this.refs);
      this.refs.geometry.dispose();
      this.refs = undefined;
    }
    if (!refs.length) return;
    const byId = new Map(actors.map((a) => [a.id, a]));
    const pos: number[] = [];
    const h = 20;
    for (const r of refs) {
      const a = byId.get(r.from),
        b = byId.get(r.to);
      if (!a || !b || a === b) continue;
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      if (d < 1) continue;
      const ux = (b.x - a.x) / d,
        uy = (b.y - a.y) / d;
      const gap = Math.min(40, d / 3);
      const x1 = a.x + ux * gap,
        y1 = a.y + uy * gap,
        x2 = b.x - ux * gap,
        y2 = b.y - uy * gap;
      pos.push(x1, h, y1, x2, h, y2);
      // The arrow's head, flat on the floor.
      const k = 18;
      pos.push(x2, h, y2, x2 - ux * k - uy * k * 0.5, h, y2 - uy * k + ux * k * 0.5);
      pos.push(x2, h, y2, x2 - ux * k + uy * k * 0.5, h, y2 - uy * k - ux * k * 0.5);
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(pos, 3));
    this.refs = new LineSegments(g, refMaterial());
    this.refs.computeLineDistances();
    this.scene.add(this.refs);
  }

  /** Line Traces as UE draws them: red up to the hit, green beyond; at the height of the player's chest. */
  private placeTraces(lines: readonly DebugLine[]): void {
    if (this.traces) {
      this.scene.remove(this.traces);
      this.traces.geometry.dispose();
      this.traces = undefined;
    }
    if (!lines.length) return;
    const pos: number[] = [];
    const col: number[] = [];
    const red = new Color(WORLD.traceMiss),
      green = new Color(WORLD.traceHit);
    const h = 60;
    const seg = (x1: number, y1: number, x2: number, y2: number, c: Color) => {
      pos.push(x1, h, y1, x2, h, y2);
      col.push(c.r, c.g, c.b, c.r, c.g, c.b);
    };
    for (const l of lines) {
      if (!l.hit) seg(l.x1, l.y1, l.x2, l.y2, red);
      else {
        seg(l.x1, l.y1, l.hit.x, l.hit.y, red);
        seg(l.hit.x, l.hit.y, l.x2, l.y2, green);
        // The hit point: a small square, as UE draws it.
        const r = 8,
          x = l.hit.x,
          y = l.hit.y;
        seg(x - r, y - r, x + r, y - r, red);
        seg(x + r, y - r, x + r, y + r, red);
        seg(x + r, y + r, x - r, y + r, red);
        seg(x - r, y + r, x - r, y - r, red);
      }
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new Float32BufferAttribute(col, 3));
    this.traces = new LineSegments(g, traceMaterial());
    this.scene.add(this.traces);
  }
}

let traceMat: LineBasicMaterial | undefined;
let refMat: LineDashedMaterial | undefined;
const refMaterial = () => (refMat ??= new LineDashedMaterial({ color: WORLD.reference, dashSize: 12, gapSize: 9, transparent: true, depthTest: false }));
const traceMaterial = () => (traceMat ??= new LineBasicMaterial({ vertexColors: true, depthTest: false, transparent: true }));

function makeMesh(c: ComponentRT): Mesh {
  const h = meshHeight(c);
  const { shape, sizeX, sizeY } = c.props;
  const geo = shape === 'cylinder' ? new CylinderGeometry(sizeX / 2, sizeX / 2, h, 28) : new BoxGeometry(sizeX, h, sizeY);
  const lit = new MeshStandardMaterial({ color: c.props.color, roughness: 0.7, metalness: 0.05 });
  const m = new Mesh(geo, lit);
  m.userData.h = h;
  m.userData.lit = lit;
  return m;
}

function placeMesh(item: Item, a: ActorRT, c: ComponentRT, mode: ViewMode, opacity: number): void {
  const shape = componentShape(a, c);
  if (!shape) return;
  const m = item.obj as Mesh;
  // Lit: the standard material; Unlit and Wireframe: a flat one, kept on the mesh once made.
  const lit = m.userData.lit as MeshStandardMaterial;
  if (!m.userData.flat) m.userData.flat = new MeshBasicMaterial({ color: c.props.color });
  const flat = m.userData.flat as MeshBasicMaterial;
  const mat = mode === 'Lit' ? lit : flat;
  if (m.material !== mat) m.material = mat;
  flat.wireframe = mode === 'Wireframe';
  for (const x of [lit, flat]) {
    x.transparent = opacity < 1;
    x.opacity = opacity;
    x.depthWrite = opacity >= 1;
  }
  // The mesh's own size, stretched by its world scale (V7.83).
  const t = componentTransform(a, c);
  m.scale.set(Math.abs(t.sx), Math.abs(t.sz), Math.abs(t.sy));
  const h = (m.userData.h as number) * Math.abs(t.sz);
  m.position.set(shape.cx, h / 2, shape.cy);
  m.rotation.y = shape.kind === 'circle' ? -t.yaw * DEG : -shape.angle;
  if (item.color !== c.props.color) {
    item.color = c.props.color;
    lit.color.set(c.props.color);
    flat.color.set(c.props.color);
  }
}

/** A Point Light's bulb in the editor (UE's light sprite): a small sphere, tappable. */
function makeBulb(): Mesh {
  return new Mesh(new SphereGeometry(12, 16, 12), new MeshBasicMaterial({ color: '#4b5058' }));
}

/** A Player Start: a dashed capsule's outline and an arrow where it faces; an invisible cylinder takes the taps. */
function makePlayerStart(): Group {
  const g = new Group();
  const ring = new LineSegments(
    new EdgesGeometry(new CylinderGeometry(PLAYER_RADIUS, PLAYER_RADIUS, PLAYER_HEIGHT, 16)),
    new LineDashedMaterial({ color: WORLD.start, dashSize: 10, gapSize: 7 }),
  );
  ring.computeLineDistances();
  ring.position.y = PLAYER_HEIGHT / 2;
  const arrow = new Mesh(new ConeGeometry(14, 40, 12), new MeshBasicMaterial({ color: WORLD.start }));
  arrow.rotation.z = -Math.PI / 2;
  arrow.position.set(PLAYER_RADIUS + 30, 10, 0);
  const hit = new Mesh(new CylinderGeometry(PLAYER_RADIUS + 10, PLAYER_RADIUS + 10, PLAYER_HEIGHT, 12), new MeshBasicMaterial({ visible: false }));
  hit.position.y = PLAYER_HEIGHT / 2;
  hit.userData.hit = true;
  g.add(ring, arrow, hit);
  return g;
}

function makeZone(c: ComponentRT, editor: boolean): LineSegments {
  const box = new BoxGeometry(c.props.sizeX, ZONE_HEIGHT, c.props.sizeY);
  const edges = new EdgesGeometry(box);
  const l = new LineSegments(edges, new LineDashedMaterial({ color: '#d0d0d0', dashSize: 14, gapSize: 10, transparent: true, opacity: 0.5 }));
  l.computeLineDistances();
  // In the editor, an invisible box takes the taps (a line is too thin for a finger).
  if (editor) l.add(new Mesh(box, new MeshBasicMaterial({ visible: false })));
  else box.dispose();
  return l;
}

function makeGlow(): Mesh {
  const m = new Mesh(
    new CircleGeometry(1, 40),
    new MeshBasicMaterial({ map: glowTexture(), transparent: true, depthWrite: false, blending: AdditiveBlending, opacity: 0.5 }),
  );
  m.rotation.x = -Math.PI / 2;
  return m;
}

/** UE's default character capsule (radius 34, 180 high), with a nose that shows where it looks. */
function makeCapsule(): Group {
  const g = new Group();
  const body = new Mesh(
    new CapsuleGeometry(PLAYER_RADIUS, PLAYER_HEIGHT - PLAYER_RADIUS * 2, 6, 20),
    new MeshStandardMaterial({ color: WORLD.player, roughness: 0.5, metalness: 0.1 }),
  );
  body.position.y = PLAYER_HEIGHT / 2;
  const nose = new Mesh(new ConeGeometry(12, 30, 16), new MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }));
  nose.rotation.z = -Math.PI / 2;
  nose.position.set(PLAYER_RADIUS + 10, PLAYER_HEIGHT * 0.72, 0);
  g.add(body, nose);
  g.visible = false;
  return g;
}

function dispose(o: Object3D, deep = true): void {
  const free = (x: Object3D) => {
    const any = x as Object3D & { geometry?: BufferGeometry; material?: Material | Material[] };
    any.geometry?.dispose();
    const mats = Array.isArray(any.material) ? [...any.material] : any.material ? [any.material] : [];
    for (const extra of [x.userData.lit, x.userData.flat]) if (extra && !mats.includes(extra)) mats.push(extra as Material);
    for (const m of mats) {
      const map = (m as Material & { map?: { dispose(): void } }).map;
      // The glow texture is shared by every light: never freed here.
      if (map && map !== glowTexture()) map.dispose();
      m.dispose();
    }
  };
  if (deep) o.traverse(free);
  else free(o);
}
