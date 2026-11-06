/**
 * Drives a Simulation in real time for Play: pause, speed, single frame,
 * and a light notification channel for the overlay (≈10 updates/s).
 */
import type { Project } from '@core/model/project';
import { Simulation, STEP } from '@core/runtime/simulation';
import { ExecHeat } from '../debug/execHeat';

export type Speed = 0.25 | 1 | 4;

export class PlaySession {
  readonly sim: Simulation;
  running = true;
  speed: Speed = 1;
  private raf = 0;
  private last = 0;
  private lastNotify = 0;
  /** Glow of the wires and nodes that just ran, for the graph view. */
  readonly heat = new ExecHeat();
  private wasPaused = false;
  private frameListeners = new Set<() => void>();
  private uiListeners = new Set<() => void>();
  private pauseListeners = new Set<() => void>();

  /**
   * `breakpoints` is the editor's own set: adding one during Play takes
   * effect at once.
   */
  constructor(project: Project, breakpoints?: Set<string>) {
    // Play runs on a snapshot: editing the project later does not affect it.
    this.sim = new Simulation(structuredClone(project), { seed: Date.now() & 0xffff, breakpoints });
    this.sim.start();
    this.raf = requestAnimationFrame(this.loop);
  }

  private loop = (t: number): void => {
    const dt = this.last ? (t - this.last) / 1000 : 0;
    this.last = t;
    if (this.running) this.sim.advance(dt * this.speed);
    this.afterRun(t);
    for (const fn of this.frameListeners) fn();
    if (t - this.lastNotify > 100) {
      this.lastNotify = t;
      for (const fn of this.uiListeners) fn();
    }
    this.raf = requestAnimationFrame(this.loop);
  };

  /** Update the glow and report a breakpoint being hit. */
  private afterRun(t = performance.now()): void {
    this.heat.ingest(this.sim.trace, t);
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
    this.sim.resume();
    this.afterRun();
    this.notifyUi();
  }

  /** Run the paused node only, and stop before the next one. */
  stepNode(): void {
    this.sim.stepNode();
    this.wasPaused = false;
    this.afterRun();
    this.notifyUi();
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

  togglePause(): void {
    this.running = !this.running;
    this.notifyUi();
  }

  setSpeed(s: Speed): void {
    this.speed = s;
    this.notifyUi();
  }

  /** Advance exactly one frame while paused. */
  stepFrame(): void {
    this.running = false;
    this.sim.step(STEP);
    this.afterRun();
    this.notifyUi();
  }

  notifyUi(): void {
    for (const fn of this.uiListeners) fn();
  }

  dispose(): void {
    cancelAnimationFrame(this.raf);
    this.frameListeners.clear();
    this.uiListeners.clear();
    this.pauseListeners.clear();
  }
}
