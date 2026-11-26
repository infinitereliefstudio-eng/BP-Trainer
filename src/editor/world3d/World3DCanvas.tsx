/**
 * Play drawn in 3D (3D-0, V7.77): the prototype of the 3D roadmap's step A (docs/FEUILLE_DE_ROUTE_3D_UI.md). The
 * simulation does not change: the level stays flat in the logic, and is only drawn in volume (heights.ts), with a
 * camera that follows the player (followCamera.ts).
 *
 * Gestures: a tap on an actor clicks it (Event ActorOnClicked) and picks it in the Outliner, as in the top view; two
 * fingers pinch to come closer. The frame is drawn only while the game runs, or after a change (pause, step, pick):
 * a paused game costs no battery.
 *
 * If WebGL is missing (rare on a phone), `onUnavailable` is called: Play goes back to the top view.
 */
import { useEffect, useRef } from 'preact/hooks';
import { Raycaster, Vector2, WebGLRenderer } from 'three';
import type { PlaySession } from '../world/playSession';
import { GestureController, type GestureHost } from '../gestures';
import { FollowCamera } from './followCamera';
import { WIDGET_HEIGHT } from './heights';
import { LevelScene } from './levelScene';

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
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ antialias: true, powerPreference: 'default' });
    } catch {
      live.current.onUnavailable();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const canvas = renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.touchAction = 'none';
    wrap.appendChild(canvas);

    const cam = new FollowCamera();
    const level = new LevelScene();
    const ray = new Raycaster();
    const ndc = new Vector2();
    let sim = session.sim;
    let dirty = true;
    let last = 0;
    let frames = 0;
    let fpsSince = performance.now();

    // The widgets of Widget Components follow their actor on the screen with this camera.
    const projector = { toScreen: (x: number, y: number) => cam.toScreen(x, y, WIDGET_HEIGHT) };
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
      dirty = true;
      draw(performance.now());
    });
    ro.observe(wrap);

    function draw(t: number): void {
      // Open Level made a new world: start the camera again on the new Player Start.
      if (session.sim !== sim) {
        sim = session.sim;
        cam.follow(sim.player.x, sim.player.y, 0);
      }
      if (!session.running && !dirty) return;
      dirty = false;
      const dt = last ? Math.min(0.1, (t - last) / 1000) : 0;
      last = t;
      cam.follow(sim.player.x, sim.player.y, dt);
      level.sync({
        actors: sim.actors,
        player: sim.player,
        debugLines: sim.debugLines,
        selectedId: session.selected,
        focus: cam.target,
      });
      renderer.render(level.scene, cam.three);
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
        const id = level.pick(ray, sim.actors);
        return id ? { kind: 'node', node: id } : { kind: 'empty' };
      },
      selectionMode: () => false,
      onTap(hit) {
        if (hit.kind !== 'node') return;
        sim.click(hit.node);
        session.select(hit.node);
        dirty = true;
      },
      onDoubleTap: noop,
      onLongPress: noop,
      onPan: noop,
      onPinch(_cx, _cy, factor) {
        cam.zoomBy(factor);
        dirty = true;
        cam.place();
        draw(performance.now());
      },
      // A drag that starts on an actor moves nothing in Play.
      onNodeDragStart: noop,
      onNodeDrag: noop,
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
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
      if (session.camera === projector) session.camera = undefined;
    };
  }, [session]);

  return <div class="graph-canvas world world3d" ref={wrapRef} data-view="3d" />;
}
