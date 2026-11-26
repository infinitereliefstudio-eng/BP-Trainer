/**
 * Drives a Game in real time for Play: pause, speed, single frame,
 * and a light notification channel for the overlay (≈10 updates/s).
 * `sim` is the world being played: Open Level replaces it.
 */
import type { Project } from '@core/model/project';
import { Game } from '@core/runtime/game';
import { type ActorOrder, type Simulation, STEP } from '@core/runtime/simulation';
import type { Point } from '../camera';
import { ExecHeat } from '../debug/execHeat';

export type Speed = 0.25 | 1 | 4;

/** Where a point of the level is on the screen: the top view's camera, or the 3D view's (3D-0, V7.77). */
export interface ScreenProjector {
  toScreen(wx: number, wy: number): Point;
}

export class PlaySession {
  readonly game: Game;
  running = true;
  speed: Speed = 1;
  private raf = 0;
  private last = 0;
  private lastNotify = 0;
  /** Glow of the wires and nodes that just ran, for the graph view. */
  readonly heat = new ExecHeat();
  /**
   * The actor picked in the Outliner or by tapping it in the level: shown in
   * the live Details, highlighted, and used as the debugged object.
   */
  selected?: string;
  /** The level view's camera, set by the view each frame: the widgets of Widget Components follow their actor with it. */
  camera?: ScreenProjector;
  /** Play drawn in 3D (« Vue 3D (essai) », 3D-0) or from above; the toolbar switches during Play. */
  view3d = false;
  /** Frames per second of the 3D view, measured about once a second (shown in the toolbar during the trial). */
  fps?: number;
  private wasPaused = false;
  private frameListeners = new Set<() => void>();
  private uiListeners = new Set<() => void>();
  private pauseListeners = new Set<() => void>();
  private quitListeners = new Set<() => void>();
  private quitTold = false;
  private disposed = false;

  /**
   * `breakpoints` is the editor's own set: adding one during Play takes
   * effect at once. `order` is the actors' event order (shuffled by default).
   */
  constructor(project: Project, breakpoints?: Set<string>, order: ActorOrder = 'shuffled', onSlotsChanged?: () => void) {
    // Play runs on a snapshot: editing the project later does not affect it. The save
    // slots are the project's own object, so what the game saves outlives Stop;
    // `onSlotsChanged` lets the app keep them at once, without waiting for Stop.
    project.saveSlots ??= {};
    this.game = new Game(structuredClone(project), {
      seed: Date.now() & 0xffff,
      breakpoints,
      order,
      slots: project.saveSlots,
      onSlotsChanged,
    });
    // A new level: what was picked in the Outliner is gone with the old world.
    this.game.onTravel = () => {
      this.selected = undefined;
      this.notifyUi();
    };
    this.game.start();
    this.raf = requestAnimationFrame(this.loop);
  }

  /** The world being played (a new one after each Open Level). */
  get sim(): Simulation {
    return this.game.world;
  }

  private loop = (t: number): void => {
    const dt = this.last ? (t - this.last) / 1000 : 0;
    this.last = t;
    if (this.running) this.game.advance(dt * this.speed);
    this.afterRun(t);
    // Quit Game may have stopped Play just now.
    if (this.disposed) return;
    for (const fn of this.frameListeners) fn();
    if (t - this.lastNotify > 100) {
      this.lastNotify = t;
      for (const fn of this.uiListeners) fn();
    }
    this.raf = requestAnimationFrame(this.loop);
  };

  /** Update the glow and report a breakpoint being hit, or Quit Game. */
  private afterRun(t = performance.now()): void {
    this.heat.ingest(this.sim.trace, t);
    if (this.game.quitted && !this.quitTold) {
      this.quitTold = true;
      for (const fn of this.quitListeners) fn();
      return;
    }
    const paused = !!this.sim.paused;
    if (paused !== this.wasPaused) {
      this.wasPaused = paused;
      if (paused) for (const fn of this.pauseListeners) fn();
      this.notifyUi();
    }
  }

  /** Called when execution stops at a breakpoint (or after a step). */
  onBreak(fn: () => void): () => void {
    this.pauseListeners.add(fn);
    return () => this.pauseListeners.delete(fn);
  }

  /** Leave the breakpoint. */
  resume(): void {
    this.game.resume();
    this.afterRun();
    this.notifyUi();
  }

  /** Run the paused node only, and stop before the next one. */
  stepNode(): void {
    this.game.stepNode();
    this.wasPaused = false;
    this.afterRun();
    this.notifyUi();
  }

  /** Called once Quit Game has closed the game: Play stops, as with Stop. */
  onQuit(fn: () => void): () => void {
    this.quitListeners.add(fn);
    return () => this.quitListeners.delete(fn);
  }

  /** Called every animation frame (canvas). */
  onFrame(fn: () => void): () => void {
    this.frameListeners.add(fn);
    return () => this.frameListeners.delete(fn);
  }

  /** Called about ten times a second (overlay, log). */
  onUi(fn: () => void): () => void {
    this.uiListeners.add(fn);
    return () => this.uiListeners.delete(fn);
  }

  select(actorId: string | undefined): void {
    this.selected = actorId;
    this.notifyUi();
    for (const fn of this.frameListeners) fn();
  }

  togglePause(): void {
    this.running = !this.running;
    this.notifyUi();
  }

  /** Switch between the 3D view and the top view (the app's addition: a game made in UE has one camera). */
  setView3d(on: boolean): void {
    this.view3d = on;
    this.camera = undefined;
    this.fps = undefined;
    this.notifyUi();
  }

  setSpeed(s: Speed): void {
    this.speed = s;
    this.notifyUi();
  }

  /** Advance exactly one frame while paused. */
  stepFrame(): void {
    this.running = false;
    this.game.step(STEP);
    this.afterRun();
    this.notifyUi();
  }

  notifyUi(): void {
    for (const fn of this.uiListeners) fn();
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.frameListeners.clear();
    this.uiListeners.clear();
    this.pauseListeners.clear();
    this.quitListeners.clear();
  }
}
