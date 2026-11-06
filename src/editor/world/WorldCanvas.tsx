/**
 * The level, seen from above. In edit mode actors and the Player Start can
 * be selected and dragged; in Play it shows the running simulation.
 */
import { useEffect, useRef } from 'preact/hooks';
import { moveActor, movePlayerStart, snapActor } from '@core/operations/levelOps';
import { componentShape, overlaps } from '@core/runtime/physics';
import { Simulation } from '@core/runtime/simulation';
import { PLAYER_RADIUS, type ActorRT } from '@core/runtime/world';
import type { EditorStore } from '@core/store/editorStore';
import { Camera, type Point } from '../camera';
import { GestureController, type GestureHost } from '../gestures';
import type { Hit } from '../hit';
import type { PlaySession } from './playSession';
import { actorRadius, renderWorld } from './worldRender';

export interface WorldRequests {
  openActorMenu(actorId: string, sx: number, sy: number): void;
  openPlaceMenu(world: Point, sx: number, sy: number): void;
  openDetails(): void;
}

interface Props {
  store: EditorStore;
  session?: PlaySession;
  requests: WorldRequests;
}

const noop = () => undefined;

export function WorldCanvas({ store, session, requests }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const live = useRef({
    camera: undefined as Camera | undefined,
    size: { w: 0, h: 0, dpr: 1 },
    preview: undefined as Simulation | undefined,
    dragId: undefined as string | undefined,
    frame: 0,
    session,
    requests,
  });
  live.current.session = session;
  live.current.requests = requests;

  const preview = (): Simulation => {
    const l = live.current;
    l.preview ??= new Simulation(store.project);
    return l.preview;
  };

  const actors = (): ActorRT[] => live.current.session?.sim.actors ?? preview().actors;

  const camera = (): Camera => {
    const l = live.current;
    if (!l.camera) {
      l.camera = new Camera();
      fit(l.camera);
    }
    return l.camera;
  };

  const fit = (cam: Camera) => {
    const { w, h } = live.current.size;
    if (!w) return;
    const ps = store.project.level.playerStart;
    let x0 = ps.x - 200,
      y0 = ps.y - 200,
      x1 = ps.x + 200,
      y1 = ps.y + 200;
    for (const a of actors()) {
      const r = actorRadius(a);
      x0 = Math.min(x0, a.x - r);
      y0 = Math.min(y0, a.y - r);
      x1 = Math.max(x1, a.x + r);
      y1 = Math.max(y1, a.y + r);
    }
    cam.fit({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, w, h - 60, 32);
    cam.zoom = Math.min(cam.zoom, 0.8);
    const cx = (x0 + x1) / 2,
      cy = (y0 + y1) / 2;
    cam.x = cx - w / 2 / cam.zoom;
    cam.y = cy - (h - 60) / 2 / cam.zoom;
  };

  const draw = () => {
    const l = live.current;
    l.frame = 0;
    const c = canvasRef.current?.getContext('2d');
    if (!c || !l.size.w) return;
    const s = l.session;
    const f = store.focus;
    if (s) followPlayer(camera(), s.sim.player, l.size.w, l.size.h);
    renderWorld(
      c,
      {
        actors: actors(),
        player: s?.sim.player,
        playerStart: store.project.level.playerStart,
        camera: camera(),
        width: l.size.w,
        height: l.size.h,
        playing: !!s,
        selectedId: s ? undefined : f.kind === 'actor' ? f.id : f.kind === 'playerStart' ? 'playerStart' : undefined,
      },
      l.size.dpr,
    );
  };

  const invalidate = () => {
    if (!live.current.frame) live.current.frame = requestAnimationFrame(draw);
  };

  /** Actor under a point: precise shapes first, then a small radius around the origin. */
  const actorAt = (wx: number, wy: number): string | undefined => {
    const z = camera().zoom;
    const probe = { kind: 'circle' as const, cx: wx, cy: wy, r: 14 / z };
    const list = actors();
    for (let i = list.length - 1; i >= 0; i--) {
      const a = list[i];
      for (const comp of a.components) {
        const shape = componentShape(a, comp);
        if (shape && comp.kind === 'StaticMesh' && overlaps(probe, shape)) return a.id;
      }
    }
    let best: { id: string; d: number } | undefined;
    for (const a of list) {
      const d = Math.hypot(wx - a.x, wy - a.y);
      if (d < Math.max(50, 30 / z) && (!best || d < best.d)) best = { id: a.id, d };
    }
    return best?.id;
  };

  useEffect(() => {
    const wrap = wrapRef.current!;
    const canvas = canvasRef.current!;
    const ro = new ResizeObserver(() => {
      const r = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const first = live.current.size.w === 0;
      live.current.size = { w: r.width, h: r.height, dpr };
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      canvas.style.width = `${r.width}px`;
      canvas.style.height = `${r.height}px`;
      if (first && live.current.camera) fit(live.current.camera);
      invalidate();
    });
    ro.observe(wrap);
    const unsub = store.subscribe((kind) => {
      if (kind === 'model') live.current.preview = undefined;
      invalidate();
    });

    const host: GestureHost = {
      hitAt(sx, sy): Hit {
        const w = camera().toWorld(sx, sy);
        if (!live.current.session) {
          const ps = store.project.level.playerStart;
          if (Math.hypot(w.x - ps.x, w.y - ps.y) < Math.max(PLAYER_RADIUS, 24 / camera().zoom)) return { kind: 'node', node: 'playerStart' };
        }
        const id = actorAt(w.x, w.y);
        return id ? { kind: 'node', node: id } : { kind: 'empty' };
      },
      selectionMode: () => false,
      onTap(hit) {
        const s = live.current.session;
        if (s) {
          if (hit.kind === 'node') s.sim.click(hit.node);
          return;
        }
        if (hit.kind !== 'node') return store.setFocus({ kind: 'none' });
        store.setFocus(hit.node === 'playerStart' ? { kind: 'playerStart' } : { kind: 'actor', id: hit.node });
      },
      onDoubleTap(hit) {
        if (live.current.session || hit.kind !== 'node') return;
        store.setFocus(hit.node === 'playerStart' ? { kind: 'playerStart' } : { kind: 'actor', id: hit.node });
        live.current.requests.openDetails();
      },
      onLongPress(hit, sx, sy) {
        if (live.current.session) return;
        if (hit.kind === 'node' && hit.node !== 'playerStart') {
          store.setFocus({ kind: 'actor', id: hit.node });
          live.current.requests.openActorMenu(hit.node, sx, sy);
        } else if (hit.kind === 'empty') {
          live.current.requests.openPlaceMenu(camera().toWorld(sx, sy), sx, sy);
        }
      },
      onPan(dx, dy) {
        camera().panBy(dx, dy);
        invalidate();
      },
      onPinch(cx, cy, factor, dx, dy) {
        const cam = camera();
        cam.zoomAt(cx, cy, factor);
        cam.panBy(dx, dy);
        invalidate();
      },
      onNodeDragStart(id) {
        if (live.current.session) return;
        live.current.dragId = id;
        store.setFocus(id === 'playerStart' ? { kind: 'playerStart' } : { kind: 'actor', id });
        store.begin(id === 'playerStart' ? 'Déplacer le Player Start' : 'Déplacer un acteur', { kind: 'project' });
      },
      onNodeDrag(dsx, dsy) {
        const id = live.current.dragId;
        if (!id) {
          camera().panBy(dsx, dsy);
          invalidate();
          return;
        }
        const z = camera().zoom;
        if (id === 'playerStart') {
          const ps = store.project.level.playerStart;
          ps.x += dsx / z;
          ps.y += dsy / z;
        } else {
          const a = store.project.level.actors.find((x) => x.id === id);
          if (a) moveActor(store.project, id, a.x + dsx / z, a.y + dsy / z);
        }
        live.current.preview = undefined;
        store.touch();
      },
      onNodeDragEnd() {
        const id = live.current.dragId;
        live.current.dragId = undefined;
        if (!id) return;
        if (id === 'playerStart') {
          const ps = store.project.level.playerStart;
          movePlayerStart(store.project, Math.round(ps.x / 10) * 10, Math.round(ps.y / 10) * 10);
        } else snapActor(store.project, id);
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
      if (live.current.frame) cancelAnimationFrame(live.current.frame);
    };
  }, [store]);

  // Redraw every animation frame while playing.
  useEffect(() => {
    if (!session) {
      invalidate();
      return;
    }
    return session.onFrame(draw);
  }, [session]);

  return (
    <div class="graph-canvas world" ref={wrapRef}>
      <canvas ref={canvasRef} />
    </div>
  );
}

/** Keep the player inside the middle of the view. */
function followPlayer(cam: Camera, p: ActorRT, w: number, h: number): void {
  const s = cam.toScreen(p.x, p.y);
  const mx = w * 0.25,
    my = h * 0.25;
  if (s.x < mx) cam.x -= (mx - s.x) / cam.zoom;
  if (s.x > w - mx) cam.x += (s.x - (w - mx)) / cam.zoom;
  if (s.y < my) cam.y -= (my - s.y) / cam.zoom;
  if (s.y > h - my) cam.y += (s.y - (h - my)) / cam.zoom;
}
