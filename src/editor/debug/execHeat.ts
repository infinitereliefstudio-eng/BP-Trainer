/**
 * Turns the simulation's execution trace into "heat" for the graph view:
 * wires and nodes that just ran glow, then fade out, like Play In Editor.
 */
import type { TraceEntry } from '@core/runtime/simulation';

const FADE_MS = 800;

export class ExecHeat {
  private links = new Map<string, number>();
  private nodes = new Map<string, number>();
  private seen = 0;
  private now = 0;

  /** Read the trace entries added since last time. */
  ingest(trace: TraceEntry[], now: number): void {
    this.now = now;
    for (let i = trace.length - 1; i >= 0 && trace[i].id > this.seen; i--) {
      const e = trace[i];
      if (e.via) this.links.set(e.via, Math.max(this.links.get(e.via) ?? 0, now));
      this.nodes.set(e.nodeId, Math.max(this.nodes.get(e.nodeId) ?? 0, now));
    }
    if (trace.length) this.seen = Math.max(this.seen, trace[trace.length - 1].id);
  }

  private heat(t: number | undefined): number {
    if (t === undefined) return 0;
    return Math.max(0, 1 - (this.now - t) / FADE_MS);
  }

  linkHeat(id: string): number {
    return this.heat(this.links.get(id));
  }

  nodeHeat(id: string): number {
    return this.heat(this.nodes.get(id));
  }

  /** Is anything still glowing (the view must keep redrawing)? */
  get active(): boolean {
    for (const t of this.nodes.values()) if (this.now - t < FADE_MS) return true;
    return false;
  }
}
