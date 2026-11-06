/**
 * Drives a Simulation in real time for Play: pause, speed, single frame,
 * and a light notification channel for the overlay (≈10 updates/s).
 */
import type { Project } from '@core/model/project';
import { Simulation, STEP } from '@core/runtime/simulation';

export type Speed = 0.25 | 1 | 4;

export class PlaySession {
  readonly sim: Simulation;
  running = true;
  speed: Speed = 1;
  private raf = 0;
  private last = 0;
  private lastNotify = 0;
  private frameListeners = new Set<() => void>();
  private uiListeners = new Set<() => void>();

  constructor(project: Project) {
    // Play runs on a snapshot: editing the project later does not affect it.
    this.sim = new Simulation(structuredClone(project), { seed: Date.now() & 0xffff });
    this.sim.start();
    this.raf = requestAnimationFrame(this.loop);
  }

  private loop = (t: number): void => {
    const dt = this.last ? (t - this.last) / 1000 : 0;
    this.last = t;
    if (this.running) this.sim.advance(dt * this.speed);
    for (const fn of this.frameListeners) fn();
    if (t - this.lastNotify > 100) {
      this.lastNotify = t;
      for (const fn of this.uiListeners) fn();
    }
    this.raf = requestAnimationFrame(this.loop);
  };

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
    this.notifyUi();
  }

  notifyUi(): void {
    for (const fn of this.uiListeners) fn();
  }

  dispose(): void {
    cancelAnimationFrame(this.raf);
    this.frameListeners.clear();
    this.uiListeners.clear();
  }
}
