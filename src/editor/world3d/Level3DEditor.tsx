/**
 * The level editor in 3D (3D-1, V7.78): UE's viewport in Perspective or in an orthographic view other than Top (the
 * top view stays the 2D canvas, WorldCanvas). Same work as there: tap to select, double tap for the Details, long
 * press on an actor for its menu or on the floor to place one, drag an actor to move it. Moving happens on the floor
 * (the level has no height yet: step B of the 3D roadmap); in a side view, along the view's horizontal axis.
 *
 * Gestures: one finger on the void turns around the point looked at (Perspective) or moves the view (orthographic);
 * two fingers move and pinch. `center` frames an actor (UE's F; '*' frames the whole level).
 * Drawn on demand: nothing is redrawn while nothing changes.
 */
import { useEffect, useRef } from 'preact/hooks';
import { isPlayerStartId, levelOf, MAIN_START_ID, playerStartsOf } from '@core/model/project';
import { actorScale, findPlayerStart, moveActor, setActorScale, updateActor } from '@core/operations/levelOps';
import { Simulation } from '@core/runtime/simulation';
import { componentShape } from '@core/runtime/physics';
import { componentTransform, type ActorRT } from '@core/runtime/world';
import type { EditorStore } from '@core/store/editorStore';
import { GestureController, type GestureHost } from '../gestures';
import { levelReferences, type WorldRequests } from '../world/WorldCanvas';
import { widgetNames } from '../world/worldRender';
import { meshHeight, WIDGET_HEIGHT } from './heights';
import { Gizmo } from './gizmo';
import { GIZMO_HEIGHT, GizmoDrag, type Transform } from './gizmoDrag';
import { type GizmoSettings, type Handle, snap } from './gizmoMath';
import { declutter, HtmlLabels, type Label, textScaleOfPage } from './htmlLabels';
import { LevelScene, type ViewMode } from './levelScene';
import { dropRenderer, makeRenderer } from './renderer';
import { type Bounds, ViewCamera, type ViewKind } from './viewCamera';

interface Props {
  store: EditorStore;
  requests: WorldRequests;
  kind: Exclude<ViewKind, 'Top'>;
  mode: ViewMode;
  /** Frame an actor or a Player Start ('*': the whole level). `n` changes on every request. */
  center?: { id: string; n: number };
  /** The viewport bar's transform tool, space and snaps (3D-2). */
  gizmo: GizmoSettings;
  onUnavailable: () => void;
}

const focusOf = (id: string) => (isPlayerStartId(id) ? ({ kind: 'playerStart', id } as const) : ({ kind: 'actor', id } as const));
const noop = () => undefined;

/**
 * One editor camera per level (`project id|level id`), kept while the app runs, as UE keeps a viewport camera per
 * level (V7.81): another lesson or another level opens framed on itself, and coming back finds the view as it was.
 * It outlives a change of view type: the new view looks at the same place.
 */
const cameras = new Map<string, ViewCamera>();

export function Level3DEditor({ store, requests, kind, mode, center, gizmo: settings, onUnavailable }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const live = useRef({
    requests,
    onUnavailable,
    invalidate: noop as () => void,
    frame: noop as (id: string) => void,
    kind,
    mode,
    settings,
    cam: undefined as ViewCamera | undefined,
  });
  live.current.requests = requests;
  live.current.onUnavailable = onUnavailable;
  live.current.settings = settings;

  useEffect(() => {
    const wrap = wrapRef.current!;
    const made = makeRenderer(wrap);
    if (!made) {
      live.current.onUnavailable();
      return;
    }
    const renderer = made;
    const canvas = renderer.domElement;
    const labels = new HtmlLabels();
    wrap.appendChild(labels.el);
    const level = new LevelScene(true);
    level.mode = live.current.mode;
    const gizmo = new Gizmo();
    level.scene.add(gizmo.group);
    let handleDrag: { drag: GizmoDrag; id: string; at: { x: number; y: number } } | undefined;
    let cam = new ViewCamera(live.current.kind);
    let camKey = '';
    let needFrame = false;
    let size = { w: 1, h: 1 };
    /** The camera of the level being edited; a level seen for the first time is framed whole. */
    const levelCamera = () => {
      const key = `${store.project.id}|${levelOf(store.project).id}`;
      if (key === camKey) return;
      camKey = key;
      let c = cameras.get(key);
      if (!c) {
        c = new ViewCamera(live.current.kind);
        cameras.set(key, c);
        needFrame = true;
      }
      c.kind = live.current.kind;
      c.resize(size.w, size.h);
      cam = c;
      live.current.cam = c;
    };
    levelCamera();
    let preview: Simulation | undefined;
    let raf = 0;
    let sized = false;
    let down = { x: 0, y: 0 };
    let drag: { id: string; at: { x: number; y: number }; from: { x: number; y: number }; orig: { x: number; y: number } } | undefined;

    const sim = () => (preview ??= new Simulation(store.project));
    const actors = (): ActorRT[] => sim().actors;
    const starts = () => playerStartsOf(levelOf(store.project));

    const bounds = (only?: string): Bounds => {
      const b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity, h: 100 };
      const add = (x: number, y: number, r: number, h: number) => {
        b.x0 = Math.min(b.x0, x - r);
        b.y0 = Math.min(b.y0, y - r);
        b.x1 = Math.max(b.x1, x + r);
        b.y1 = Math.max(b.y1, y + r);
        b.h = Math.max(b.h, h);
      };
      for (const s of starts()) if (!only || only === s.id) add(s.x, s.y, 80, 180);
      // The real footprint of each mesh and zone, not a circle around the actor: a long wall would widen the frame.
      for (const a of actors()) {
        if (only && only !== a.id) continue;
        add(a.x, a.y, 30, 60);
        for (const c of a.components) {
          const sh = componentShape(a, c);
          const h = c.kind === 'StaticMesh' ? meshHeight(c) : 60;
          if (!sh) {
            const t = componentTransform(a, c);
            add(t.x, t.y, 30, h);
          } else if (sh.kind === 'circle') add(sh.cx, sh.cy, sh.r, h);
          else {
            const co = Math.abs(Math.cos(sh.angle)),
              si = Math.abs(Math.sin(sh.angle));
            const ex = sh.hx * co + sh.hy * si,
              ey = sh.hx * si + sh.hy * co;
            add(sh.cx - ex, sh.cy, 0, h);
            add(sh.cx + ex, sh.cy, 0, h);
            add(sh.cx, sh.cy - ey, 0, h);
            add(sh.cx, sh.cy + ey, 0, h);
          }
        }
      }
      if (b.x0 === Infinity) return { x0: -400, y0: -400, x1: 400, y1: 400, h: 200 };
      return b;
    };

    const selected = (): string | undefined => {
      const f = store.focus;
      return f.kind === 'actor' ? f.id : f.kind === 'playerStart' ? (f.id ?? MAIN_START_ID) : undefined;
    };

    const draw = () => {
      raf = 0;
      if (!sized) return;
      levelCamera();
      if (needFrame) {
        needFrame = false;
        cam.frame(bounds());
      }
      const list = actors();
      const sel = selected();
      level.mode = live.current.mode;
      level.sync({
        actors: list,
        playerStarts: starts(),
        references: levelReferences(store.project),
        selectedId: sel,
        focus: { x: cam.target.x, y: cam.target.z },
      });
      placeGizmo(sel);
      renderer.render(level.scene, cam.three);
      labels.update(declutter(labelsOf(list, sel), textScaleOfPage()));
    };
    const invalidate = () => {
      if (!raf) raf = requestAnimationFrame(draw);
    };
    live.current.invalidate = invalidate;

    /** What the gizmo works on: the selected actor or Player Start, as a transform of the level. */
    const transformOf = (id: string): Transform | undefined => {
      if (isPlayerStartId(id)) {
        const ps = findPlayerStart(store.project, id);
        return ps && { x: ps.x, y: ps.y, yaw: ps.yaw, scaleX: 1, scaleY: 1, scaleZ: 1 };
      }
      const a = levelOf(store.project).actors.find((x) => x.id === id);
      if (!a) return undefined;
      const s = actorScale(store.project, a);
      return { x: a.x, y: a.y, yaw: a.yaw, scaleX: s.x, scaleY: s.y, scaleZ: s.z };
    };

    /** The gizmo on the selection; none with Select. Scale works on actors (their root's Scale), not on Player Starts. */
    const placeGizmo = (sel: string | undefined) => {
      const t = sel ? transformOf(sel) : undefined;
      const tool = live.current.settings.tool;
      const mode = !t || tool === 'Select' || (tool === 'Scale' && sel && isPlayerStartId(sel)) ? undefined : tool;
      if (!t || !mode) return gizmo.place(undefined, 0, 0, 0, 0, 1);
      // Scale is always local, as in UE.
      const yaw = mode === 'Scale' || (mode === 'Move' && live.current.settings.space === 'Local') ? t.yaw : 0;
      gizmo.place(mode, t.x, t.y, GIZMO_HEIGHT, yaw, cam.cmPerPxAt(t.x, t.y, GIZMO_HEIGHT));
    };

    /** Write a transform to the selected actor or Player Start. */
    const applyTransform = (id: string, t: Transform) => {
      if (isPlayerStartId(id)) {
        const ps = findPlayerStart(store.project, id);
        if (ps) Object.assign(ps, { x: t.x, y: t.y, yaw: t.yaw });
      } else {
        updateActor(store.project, id, { x: t.x, y: t.y, yaw: t.yaw });
        const before = transformOf(id);
        if (before && (before.scaleX !== t.scaleX || before.scaleY !== t.scaleY || before.scaleZ !== t.scaleZ))
          setActorScale(store.project, id, { x: t.scaleX, y: t.scaleY, z: t.scaleZ });
      }
      preview = undefined;
      store.touch();
    };

    /** Names under the actors and Player Starts, Widget Component frames, and the variables' names of the selected actor's references. */
    const labelsOf = (list: ActorRT[], sel: string | undefined): Label[] => {
      const out: Label[] = [];
      const shown = (p: { x: number; y: number; behind: boolean }) => !p.behind && p.x > -200 && p.y > -200 && p.x < 4000 && p.y < 4000;
      const rect = wrap.getBoundingClientRect();
      const names = widgetNames(store.project);
      for (const a of list) {
        const p = cam.toScreen(a.x, a.y, 0);
        if (shown(p)) out.push({ key: `a|${a.id}`, text: a.label, x: p.x, y: p.y + 6, cls: a.id === sel ? 'selected' : undefined });
        for (const c of a.components) {
          if (c.kind !== 'Widget') continue;
          const t = componentTransform(a, c);
          const q = cam.toScreen(t.x, t.y, WIDGET_HEIGHT);
          if (!shown(q)) continue;
          // As in the top view: the frame of its Draw Size, at the size it will have on the screen in Play.
          const k = rect.height / 720;
          const name = c.classId ? (names[c.classId] ?? c.name) : `${c.name} (Widget Class : None)`;
          out.push({ key: `w|${a.id}|${c.id}`, text: name, x: q.x, y: q.y, w: c.props.sizeX * k, h: c.props.sizeY * k, cls: 'frame', faded: !c.props.visible });
        }
      }
      for (const s of starts()) {
        const p = cam.toScreen(s.x, s.y, 0);
        if (shown(p)) out.push({ key: `s|${s.id}`, text: s.tag ? `Player Start · ${s.tag}` : 'Player Start', x: p.x, y: p.y + 6, cls: 'start' });
      }
      if (sel) {
        const byId = new Map(list.map((a) => [a.id, a]));
        for (const r of levelReferences(store.project)) {
          if (r.from !== sel && r.to !== sel) continue;
          const a = byId.get(r.from),
            b = byId.get(r.to);
          if (!a || !b) continue;
          const p = cam.toScreen(a.x + (b.x - a.x) * 0.45, a.y + (b.y - a.y) * 0.45, 20);
          if (shown(p)) out.push({ key: `r|${r.from}|${r.to}|${r.label}`, text: r.label, x: p.x, y: p.y - 18, cls: 'ref' });
        }
      }
      return out;
    };

    live.current.frame = (id: string) => {
      cam.frame(id === '*' ? bounds() : bounds(id));
      invalidate();
    };

    // The smoke test (?e2e) asks where an actor is on the screen, to tap or drag it.
    if (location.search.includes('e2e')) {
      (window as unknown as { bp3dEdit: unknown }).bp3dEdit = {
        screenOf: (label: string) => {
          const a = actors().find((x) => x.label === label);
          return a && cam.toScreen(a.x, a.y, 40);
        },
      };
    }

    const ro = new ResizeObserver(() => {
      const r = wrap.getBoundingClientRect();
      if (!r.width || !r.height) return;
      renderer.setSize(r.width, r.height, true);
      size = { w: r.width, h: r.height };
      cam.resize(r.width, r.height);
      sized = true;
      draw();
    });
    ro.observe(wrap);
    const unsub = store.subscribe((k) => {
      if (k === 'model') preview = undefined;
      invalidate();
    });

    const host: GestureHost = {
      hitAt(sx, sy) {
        down = { x: sx, y: sy };
        const handle = gizmo.pick(cam.rayAt(sx, sy));
        if (handle) return { kind: 'node', node: `gizmo:${handle}` };
        const id = level.pick(cam.rayAt(sx, sy), actors(), 70);
        return id ? { kind: 'node', node: id } : { kind: 'empty' };
      },
      selectionMode: () => false,
      onTap(hit) {
        if (hit.kind === 'node' && hit.node.startsWith('gizmo:')) return;
        store.setFocus(hit.kind === 'node' ? focusOf(hit.node) : { kind: 'none' });
      },
      onDoubleTap(hit) {
        if (hit.kind !== 'node' || hit.node.startsWith('gizmo:')) return;
        store.setFocus(focusOf(hit.node));
        live.current.requests.openDetails();
      },
      onLongPress(hit, sx, sy) {
        if (hit.kind === 'node' && hit.node.startsWith('gizmo:')) return;
        if (hit.kind === 'node' && !isPlayerStartId(hit.node)) {
          store.setFocus({ kind: 'actor', id: hit.node });
          live.current.requests.openActorMenu(hit.node, sx, sy);
        } else if (hit.kind === 'empty') {
          // Placed where the finger is on the floor; a side view, which shows no floor, places under the point looked at.
          const at = cam.floorAt(sx, sy) ?? { x: cam.target.x, y: cam.target.z };
          live.current.requests.openPlaceMenu(at, sx, sy);
        }
      },
      onPan(dx, dy) {
        if (cam.isOrtho) cam.pan(dx, dy);
        else cam.orbit(dx, dy);
        invalidate();
      },
      onPinch(cx, cy, factor, dx, dy) {
        cam.zoom(factor, cx, cy);
        cam.pan(dx, dy);
        invalidate();
      },
      onNodeDragStart(id) {
        if (id.startsWith('gizmo:')) {
          const sel = selected();
          const t = sel && transformOf(sel);
          if (!sel || !t) return;
          const handle = id.slice(6) as Handle;
          const view = { toScreen: (x: number, y: number, h?: number) => cam.toScreen(x, y, h), dragPoint: (x: number, y: number) => cam.dragPoint(x, y), verticalLook: () => cam.verticalLook() };
          handleDrag = { drag: new GizmoDrag(handle, t, view, live.current.settings, down), id: sel, at: { ...down } };
          gizmo.setActive(handle);
          store.begin(handle === 'rot' ? 'Tourner un acteur' : handle.startsWith('s') ? 'Changer l’échelle d’un acteur' : 'Déplacer un acteur', { kind: 'project' });
          return;
        }
        const from = cam.dragPoint(down.x, down.y);
        const p = isPlayerStartId(id) ? findPlayerStart(store.project, id) : levelOf(store.project).actors.find((a) => a.id === id);
        if (!from || !p) return;
        drag = { id, at: { ...down }, from, orig: { x: p.x, y: p.y } };
        store.setFocus(focusOf(id));
        store.begin(isPlayerStartId(id) ? 'Déplacer le Player Start' : 'Déplacer un acteur', { kind: 'project' });
      },
      onNodeDrag(dsx, dsy) {
        if (handleDrag) {
          handleDrag.at.x += dsx;
          handleDrag.at.y += dsy;
          applyTransform(handleDrag.id, handleDrag.drag.at(handleDrag.at));
          return;
        }
        if (!drag) {
          host.onPan(dsx, dsy);
          return;
        }
        drag.at.x += dsx;
        drag.at.y += dsy;
        const now = cam.dragPoint(drag.at.x, drag.at.y);
        if (!now) return;
        const x = drag.orig.x + now.x - drag.from.x,
          y = drag.orig.y + now.y - drag.from.y;
        if (isPlayerStartId(drag.id)) {
          const ps = findPlayerStart(store.project, drag.id);
          if (ps) {
            ps.x = x;
            ps.y = y;
          }
        } else moveActor(store.project, drag.id, x, y);
        preview = undefined;
        store.touch();
      },
      onNodeDragEnd() {
        if (handleDrag) {
          handleDrag = undefined;
          gizmo.setActive(undefined);
          store.commit();
          return;
        }
        const d = drag;
        drag = undefined;
        if (!d) return;
        // On the grid of the viewport bar (whole centimetres when the grid snap is off).
        const t = transformOf(d.id);
        const g = live.current.settings.grid;
        if (t) applyTransform(d.id, { ...t, x: snap(t.x, g), y: snap(t.y, g) });
        store.commit();
      },
      onWireStart: noop,
      onWireMove: noop,
      onWireEnd: noop,
      onWireCancel: noop,
      onRectStart: noop,
      onRectMove: noop,
      onRectEnd: noop,
    };
    const gestures = new GestureController(canvas, host);

    return () => {
      gestures.dispose();
      ro.disconnect();
      unsub();
      if (raf) cancelAnimationFrame(raf);
      gizmo.dispose();
      level.dispose();
      labels.el.remove();
      dropRenderer(renderer);
      live.current.invalidate = noop;
      live.current.frame = noop;
      live.current.cam = undefined;
    };
  }, [store]);

  // Another view type or view mode: same camera target, redrawn.
  useEffect(() => {
    live.current.kind = kind;
    live.current.mode = mode;
    const cam = live.current.cam;
    if (cam && cam.kind !== kind) {
      const wasPersp = cam.kind === 'Perspective';
      cam.kind = kind;
      // Keep about the same size on the screen from one kind of camera to the other.
      const h = Math.max(1, wrapRef.current?.clientHeight ?? 400);
      const span = 2 * Math.tan((cam.persp.fov * Math.PI) / 360);
      if (wasPersp && kind !== 'Perspective') cam.scale = h / (cam.distance * span);
      else if (!wasPersp && kind === 'Perspective') cam.distance = h / (cam.scale * span);
      cam.place();
    }
    live.current.invalidate();
  }, [kind, mode]);

  useEffect(() => {
    if (center) live.current.frame(center.id);
  }, [center?.n]);

  useEffect(() => live.current.invalidate(), [settings.tool, settings.space, settings.grid, settings.rotation, settings.scale]);

  return <div class="graph-canvas world world3d editor3d" ref={wrapRef} data-view={kind} />;
}
