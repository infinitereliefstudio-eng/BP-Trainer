/**
 * Play drawn in 3D (3D-0, V7.77): the prototype of the 3D roadmap's step A (docs/FEUILLE_DE_ROUTE_3D_UI.md). The
 * simulation does not change: the level stays flat in the logic, and is only drawn in volume (heights.ts), with a
 * camera that follows the player (followCamera.ts).
 *
 * Gestures: a tap on an actor clicks it (Event ActorOnClicked) and picks it in the Outliner, as in the top view; two
 * fingers pinch to come closer. The frame is drawn only while the game runs, or after a change (pause, step, pick):
 * a paused game costs no battery.
 *
 * Ejected (UE's F8, V7.80), the view leaves the follow camera for a free one: one finger turns around (on an actor
 * too), two fingers move and pinch, as in the level editor; a tap picks an actor without clicking it (V7.81).
 *
 * If WebGL is missing (rare on a phone), `onUnavailable` is called: Play goes back to the top view.
 */
import { useEffect, useRef } from 'preact/hooks';
import { Raycaster, Vector2 } from 'three';
import type { PlaySession } from '../world/playSession';
import { GestureController, type GestureHost } from '../gestures';
import { FollowCamera } from './followCamera';
import { WIDGET_HEIGHT } from './heights';
import { LevelScene } from './levelScene';
import { dropRenderer, makeRenderer } from './renderer';
import { ViewCamera } from './viewCamera';

interface Props {
  session: PlaySession;
  onUnavailable: () => void;
  /** Frames drawn per second, about once a second (shown in Play's toolbar during the trial). */
  onFps?: (fps: number) => void;
}

const noop = () => undefined;

export function World3DCanvas({ session, onUnavailable, onFps }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const live = useRef({ onFps, onUnavailable });
  live.current = { onFps, onUnavailable };

  useEffect(() => {
    const wrap = wrapRef.current!;
    const made = makeRenderer(wrap);
    if (!made) {
      live.current.onUnavailable();
      return;
    }
    const renderer = made;
    const canvas = renderer.domElement;

    const cam = new FollowCamera();
    const level = new LevelScene();
    const ray = new Raycaster();
    const ndc = new Vector2();
    let sim = session.sim;
    /** The free camera while ejected. */
    let free: ViewCamera | undefined;
    let size = { w: 1, h: 1 };
    let dirty = true;
    let last = 0;
    let frames = 0;
    let fpsSince = performance.now();

    // The widgets of Widget Components follow their actor on the screen with this camera.
    const projector = { toScreen: (x: number, y: number) => (free ?? cam).toScreen(x, y, WIDGET_HEIGHT) };
    session.camera = projector;

    // The smoke test (?e2e) asks where an actor is on the screen, to tap it.
    if (location.search.includes('e2e')) {
      (window as unknown as { bp3d: unknown }).bp3d = {
        screenOf: (label: string) => {
          const a = sim.actors.find((x) => x.label === label);
          return a && cam.toScreen(a.x, a.y, 40);
        },
      };
    }

    const ro = new ResizeObserver(() => {
      const r = wrap.getBoundingClientRect();
      renderer.setSize(r.width, r.height, true);
      cam.resize(r.width, r.height);
      size = { w: r.width, h: r.height };
      free?.resize(r.width, r.height);
      dirty = true;
      draw(performance.now());
    });
    ro.observe(wrap);

    function draw(t: number): void {
      // Open Level made a new world: start the camera again on the new Player Start.
      if (session.sim !== sim) {
        sim = session.sim;
        cam.jumpTo(sim.player.x, sim.player.y);
        // Ejected during the journey: the free camera starts again over the new level.
        free = undefined;
      }
      if (!session.running && !dirty) return;
      dirty = false;
      const dt = last ? Math.min(0.1, (t - last) / 1000) : 0;
      last = t;
      cam.follow(sim.player.x, sim.player.y, dt);
      if (session.ejected && !free) {
        // Leave the pawn where the follow camera looks from, then move freely.
        free = new ViewCamera('Perspective');
        free.resize(size.w, size.h);
        free.target.set(cam.target.x, 0, cam.target.y);
        free.pitch = 55;
        free.distance = cam.distance;
        free.place();
      } else if (!session.ejected) free = undefined;
      level.sync({
        actors: sim.actors,
        player: sim.player,
        debugLines: sim.debugLines,
        selectedId: session.selected,
        focus: free ? { x: free.target.x, y: free.target.z } : cam.target,
      });
      renderer.render(level.scene, free ? free.three : cam.three);
      frames++;
      if (t - fpsSince >= 1000) {
        live.current.onFps?.(Math.round((frames * 1000) / (t - fpsSince)));
        frames = 0;
        fpsSince = t;
      }
    }

    const offFrame = session.onFrame(() => draw(performance.now()));
    // Pause, single frame, a pick in the Outliner: draw once more.
    const offUi = session.onUi(() => {
      if (!session.running) {
        dirty = true;
        last = 0;
        draw(performance.now());
      }
    });

    const host: GestureHost = {
      hitAt(sx, sy) {
        const p = cam.ndc(sx, sy);
        ndc.set(p.x, p.y);
        ray.setFromCamera(ndc, cam.three);
        const id = level.pick(free ? free.rayAt(sx, sy) : ray, sim.actors);
        return id ? { kind: 'node', node: id } : { kind: 'empty' };
      },
      selectionMode: () => false,
      onTap(hit) {
        if (hit.kind !== 'node') return;
        // Ejected, the finger is the editor's (UE's mouse after F8): it picks, the game receives nothing (V7.81).
        if (!session.ejected) sim.click(hit.node);
        session.select(hit.node);
        dirty = true;
      },
      onDoubleTap: noop,
      onLongPress: noop,
      onPan(dx, dy) {
        if (!free) return;
        free.orbit(dx, dy);
        dirty = true;
        draw(performance.now());
      },
      onPinch(cx, cy, factor, dx, dy) {
        if (free) {
          free.zoom(factor, cx, cy);
          free.pan(dx, dy);
        } else {
          cam.zoomBy(factor);
          cam.place();
        }
        dirty = true;
        draw(performance.now());
      },
      // A drag that starts on an actor moves nothing in Play; ejected, it turns the free camera as on the void (V7.81).
      onNodeDragStart: noop,
      onNodeDrag(dx, dy) {
        host.onPan(dx, dy);
      },
      onNodeDragEnd: noop,
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
      offFrame();
      offUi();
      gestures.dispose();
      ro.disconnect();
      level.dispose();
      dropRenderer(renderer);
      if (session.camera === projector) session.camera = undefined;
    };
  }, [session]);

  return <div class="graph-canvas world world3d" ref={wrapRef} data-view="3d" />;
}
