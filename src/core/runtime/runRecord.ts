/**
 * What happened during a play session, kept for "why did this node not
 * run?": how often each node ran, which exec outputs it took, and the
 * silent events UE does not log (a Delay ignoring a call, a closed Do Once,
 * a message to an actor without the interface…).
 *
 * Unlike the Execution Trace it is not bounded: one counter per node and pin.
 */

/** A silent runtime event worth explaining. */
export type NoteCode =
  | 'delay.ignored'
  | 'delay.restarted'
  | 'doOnce.closed'
  | 'gate.closed'
  | 'dispatcher.noListener'
  | 'iface.notImplemented'
  | 'iface.noTarget'
  | 'call.noTarget';

export interface NodeRuns {
  count: number;
  first: number;
  last: number;
  /** Order of the first and last run among everything recorded (same-time events). */
  firstSeq: number;
  lastSeq: number;
}

export interface WriteRecord {
  actor: string;
  variable: string;
  time: number;
  /** Order among reads and writes (several can happen at the same time). */
  seq: number;
}

export const nodeKey = (graphId: string, nodeId: string) => `${graphId}:${nodeId}`;

export class RunRecord {
  /** Simulation time, kept up to date by the Simulation. */
  time = 0;
  /** While true (debugger reads), nothing is recorded. */
  muted = false;
  readonly runs = new Map<string, NodeRuns>();
  /** "graph:node:pin" → times this exec output was followed (dead ends included). */
  readonly taken = new Map<string, number>();
  readonly notes = new Map<string, Map<NoteCode, { count: number; detail?: string }>>();
  /** Classes that had at least one actor during the session. */
  readonly classes = new Set<string>();
  readonly keys = new Set<string>();
  /** Actor ids clicked, and destroyed. */
  readonly clicked = new Set<string>();
  readonly destroyed = new Set<string>();
  /** "actor:variable" → last time a Blueprint read it. */
  readonly reads = new Map<string, { time: number; seq: number }>();
  private seq = 0;
  /** Last write made by a Set on another Blueprint, per node. */
  readonly writes = new Map<string, WriteRecord>();

  ran(graphId: string, nodeId: string): void {
    if (this.muted) return;
    const k = nodeKey(graphId, nodeId);
    const r = this.runs.get(k);
    const seq = ++this.seq;
    if (r) {
      r.count++;
      r.last = this.time;
      r.lastSeq = seq;
    } else this.runs.set(k, { count: 1, first: this.time, last: this.time, firstSeq: seq, lastSeq: seq });
  }

  took(graphId: string, nodeId: string, pin: string): void {
    if (this.muted) return;
    const k = `${nodeKey(graphId, nodeId)}:${pin}`;
    this.taken.set(k, (this.taken.get(k) ?? 0) + 1);
  }

  note(graphId: string, nodeId: string, code: NoteCode, detail?: string): void {
    if (this.muted) return;
    const k = nodeKey(graphId, nodeId);
    const m = this.notes.get(k) ?? new Map();
    this.notes.set(k, m);
    const prev = m.get(code);
    m.set(code, { count: (prev?.count ?? 0) + 1, detail: detail ?? prev?.detail });
  }

  read(actorId: string, variable: string): void {
    if (!this.muted) this.reads.set(`${actorId}:${variable}`, { time: this.time, seq: ++this.seq });
  }

  wrote(graphId: string, nodeId: string, actorId: string, variable: string): void {
    if (!this.muted) this.writes.set(nodeKey(graphId, nodeId), { actor: actorId, variable, time: this.time, seq: ++this.seq });
  }

  // ---------------------------------------------------------------- queries

  runsOf(graphId: string, nodeId: string): NodeRuns | undefined {
    return this.runs.get(nodeKey(graphId, nodeId));
  }

  takenCount(graphId: string, nodeId: string, pin: string): number {
    return this.taken.get(`${nodeKey(graphId, nodeId)}:${pin}`) ?? 0;
  }

  notesOf(graphId: string, nodeId: string): Map<NoteCode, { count: number; detail?: string }> {
    return this.notes.get(nodeKey(graphId, nodeId)) ?? new Map();
  }
}
