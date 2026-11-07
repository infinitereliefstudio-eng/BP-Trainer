/**
 * Timers set by Set Timer by Event. One timer per event (actor + Custom
 * Event node): setting it again replaces it, Time <= 0 clears it, as in UE.
 */
import { isRef, type ObjRef, type RValue, type TimerRT } from './world';

export class TimerSet {
  private timers = new Map<number, TimerRT>();
  private seq = 0;

  get size(): number {
    return this.timers.size;
  }

  values(): IterableIterator<TimerRT> {
    return this.timers.values();
  }

  /** Returns the handle, or None (null) when Time <= 0. */
  set(event: Extract<ObjRef, { ref: 'delegate' }>, time: number, looping: boolean): RValue {
    const existing = [...this.timers.values()].find((t) => t.actor === event.actor && t.node === event.node);
    if (existing) this.timers.delete(existing.id);
    if (!(time > 0)) return null;
    const id = existing?.id ?? ++this.seq;
    this.timers.set(id, { id, actor: event.actor, node: event.node, time, remaining: time, looping, paused: false });
    return { ref: 'timer', id };
  }

  get(handle: RValue): TimerRT | undefined {
    return isRef(handle) && handle.ref === 'timer' ? this.timers.get(handle.id) : undefined;
  }

  has(id: number): boolean {
    return this.timers.has(id);
  }

  clear(handle: RValue): void {
    if (isRef(handle) && handle.ref === 'timer') this.timers.delete(handle.id);
  }

  /** Timers bound to an actor's events go with it. */
  dropOwner(actorId: string): void {
    for (const t of [...this.timers.values()]) if (t.actor === actorId) this.timers.delete(t.id);
  }

  /** Count down; a looping timer can fire several times in a long frame. */
  tick(dt: number, fire: (t: TimerRT) => void): void {
    for (const t of [...this.timers.values()]) {
      if (t.paused) continue;
      t.remaining -= dt;
      for (let guard = 0; t.remaining <= 1e-9 && guard < 1000; guard++) {
        fire(t);
        if (!t.looping) {
          this.timers.delete(t.id);
          break;
        }
        t.remaining += t.time;
      }
    }
  }
}
