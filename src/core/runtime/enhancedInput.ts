/**
 * Enhanced Input, as UE evaluates it once per frame:
 *
 * 1. The active Mapping Contexts (added by Add Mapping Context), highest
 *    Priority first. A key used by a mapping is consumed for the contexts
 *    below (UE's Input Actions consume their input by default).
 * 2. Each mapping gives a trigger state from its key and its triggers:
 *    None, Ongoing (a Hold below its threshold) or Triggered. No trigger is
 *    UE's implicit Down. An action's state is the highest of its mappings.
 * 3. The change of an action's state since the last frame gives its events,
 *    with UE's table: None→Ongoing Started; None→Triggered Started then
 *    Triggered; Ongoing→Ongoing Ongoing; Ongoing→Triggered Triggered;
 *    Ongoing→None Canceled; Triggered→Triggered Triggered; Triggered→Ongoing
 *    Ongoing; Triggered→None Completed.
 *
 * 4. Ignore All Pressed Keys Until Release (Add / Remove Mapping Context
 *    options, on by default in UE): a mapping that becomes active while its
 *    key is already down ignores that key until it is released. It still
 *    keeps the key from the contexts below. Without it, the E that opens a
 *    dialogue would, one frame later, also be « next line » in the
 *    dialogue's context.
 *
 * Simplifications: digital (bool) actions only, triggers on the mappings
 * only (not on the Input Action asset), no modifiers, no chorded actions.
 */
import type { InputTrigger, MappingContext, Project } from '../model/project';

export type TriggerState = 'None' | 'Ongoing' | 'Triggered';
export type ActionEvent = 'started' | 'ongoing' | 'triggered' | 'canceled' | 'completed';

const RANK: Record<TriggerState, number> = { None: 0, Ongoing: 1, Triggered: 2 };

export function transitionEvents(from: TriggerState, to: TriggerState): ActionEvent[] {
  if (from === 'None') return to === 'Ongoing' ? ['started'] : to === 'Triggered' ? ['started', 'triggered'] : [];
  if (from === 'Ongoing') return to === 'Ongoing' ? ['ongoing'] : to === 'Triggered' ? ['triggered'] : ['canceled'];
  return to === 'Triggered' ? ['triggered'] : to === 'Ongoing' ? ['ongoing'] : ['completed'];
}

/** What fires this frame for one action, with the values of the event's output pins. */
export interface ActionFiring {
  action: string;
  event: ActionEvent;
  value: boolean;
  elapsed: number;
  triggeredSeconds: number;
}

interface MappingMemory {
  wasActuated: boolean;
  heldFor: number;
  /** Hold with One Shot: it has triggered since the key went down. */
  fired: boolean;
}

interface ActionMemory {
  state: TriggerState;
  elapsed: number;
  triggeredSeconds: number;
}

/** The state one trigger gives this frame. */
function triggerState(t: InputTrigger | undefined, actuated: boolean, m: MappingMemory): TriggerState {
  switch (t?.kind ?? 'Down') {
    case 'Down':
      return actuated ? 'Triggered' : 'None';
    case 'Pressed':
      return actuated && !m.wasActuated ? 'Triggered' : 'None';
    case 'Released':
      if (actuated) return 'Ongoing';
      return m.wasActuated ? 'Triggered' : 'None';
    case 'Hold': {
      if (!actuated) return 'None';
      if (m.heldFor + 1e-9 < (t?.holdTime ?? 0.5)) return 'Ongoing';
      if (t?.oneShot && m.fired) return 'None';
      m.fired = true;
      return 'Triggered';
    }
  }
}

export class EnhancedInput {
  /** Active contexts, in the order they were added. */
  private contexts: { id: string; priority: number }[] = [];
  private held = new Set<string>();
  /** Keys pressed since the last frame: a tap shorter than a frame still counts. */
  private tapped = new Set<string>();
  private mappings = new Map<string, MappingMemory>();
  private actions = new Map<string, ActionMemory>();
  /** Mappings (`context:index`) that ignore their key until it is released. */
  private ignored = new Set<string>();

  press(key: string): void {
    this.held.add(key);
    this.tapped.add(key);
  }

  release(key: string): void {
    this.held.delete(key);
  }

  /**
   * Add Mapping Context: added again, it only takes its new priority. With
   * `ignorePressed` (UE's default), its mappings whose key is already down
   * wait for that key to be released.
   */
  addContext(id: string, priority: number, project?: Project, ignorePressed = true): void {
    this.change(project, ignorePressed, () => {
      this.contexts = this.contexts.filter((c) => c.id !== id);
      this.contexts.push({ id, priority });
    });
  }

  /** Remove Mapping Context: the mappings it hid become active, and wait for held keys to be released (UE's default). */
  removeContext(id: string, project?: Project, ignorePressed = true): void {
    this.change(project, ignorePressed, () => {
      this.contexts = this.contexts.filter((c) => c.id !== id);
    });
  }

  get activeContexts(): readonly string[] {
    return this.contexts.map((c) => c.id);
  }

  /** Apply a change of the active contexts; with `ignorePressed`, the mappings it makes active on a held key are ignored. */
  private change(project: Project | undefined, ignorePressed: boolean, apply: () => void): void {
    const before = project && ignorePressed ? this.liveMappings(project) : undefined;
    apply();
    if (!project || !before) return;
    for (const [mapping, key] of this.liveMappings(project)) {
      if (!before.has(mapping) && this.held.has(key)) this.ignored.add(mapping);
    }
  }

  /** The active contexts that exist, highest priority first (the earliest added first on a tie). */
  private ordered(project: Project) {
    return this.contexts
      .map((c, i) => ({ ...c, i, ctx: project.mappingContexts?.find((x) => x.id === c.id) }))
      .filter((c): c is { id: string; priority: number; i: number; ctx: MappingContext } => !!c.ctx)
      .sort((a, b) => b.priority - a.priority || a.i - b.i);
  }

  /** Mappings a key can reach now (`context:index` → key): those not hidden by a context of higher priority. */
  private liveMappings(project: Project): Map<string, string> {
    const live = new Map<string, string>();
    const taken = new Set<string>();
    for (const { id, ctx } of this.ordered(project)) {
      const here = new Set<string>();
      ctx.mappings.forEach((m, index) => {
        if (taken.has(m.key) || !project.inputActions?.some((a) => a.id === m.action)) return;
        live.set(`${id}:${index}`, m.key);
        here.add(m.key);
      });
      for (const k of here) taken.add(k);
    }
    return live;
  }

  /** One frame of evaluation: the events to fire, action by action, in UE's order. */
  process(project: Project, dt: number): ActionFiring[] {
    const states = new Map<string, { state: TriggerState; value: boolean }>();
    const consumed = new Set<string>();
    for (const { id, ctx } of this.ordered(project)) {
      const usedHere = new Set<string>();
      ctx.mappings.forEach((m, index) => {
        if (consumed.has(m.key) || !project.inputActions?.some((a) => a.id === m.action)) return;
        const key = `${id}:${index}`;
        const mem = this.mappings.get(key) ?? { wasActuated: false, heldFor: 0, fired: false };
        if (this.ignored.has(key)) {
          if (this.held.has(m.key)) {
            // Ignored until released, but the key stays taken from the contexts below.
            usedHere.add(m.key);
            return;
          }
          this.ignored.delete(key);
          mem.wasActuated = false;
          mem.heldFor = 0;
          mem.fired = false;
        }
        const actuated = this.held.has(m.key) || this.tapped.has(m.key);
        if (actuated) mem.heldFor += dt;
        const triggers = m.triggers.length ? m.triggers : [undefined];
        let state: TriggerState = 'None';
        for (const t of triggers) {
          const s = triggerState(t, actuated, mem);
          if (RANK[s] > RANK[state]) state = s;
        }
        if (!actuated) {
          mem.heldFor = 0;
          mem.fired = false;
        }
        mem.wasActuated = actuated;
        this.mappings.set(key, mem);
        if (actuated) usedHere.add(m.key);
        const prev = states.get(m.action);
        if (!prev || RANK[state] > RANK[prev.state]) states.set(m.action, { state, value: actuated || !!prev?.value });
        else if (actuated) prev.value = true;
      });
      for (const k of usedHere) consumed.add(k);
    }
    this.tapped.clear();

    const out: ActionFiring[] = [];
    const seen = new Set([...states.keys(), ...this.actions.keys()]);
    for (const action of seen) {
      const now = states.get(action) ?? { state: 'None' as TriggerState, value: false };
      const mem = this.actions.get(action) ?? { state: 'None', elapsed: 0, triggeredSeconds: 0 };
      const events = transitionEvents(mem.state, now.state);
      if (now.state !== 'None') mem.elapsed += dt;
      mem.triggeredSeconds = now.state === 'Triggered' ? mem.triggeredSeconds + dt : 0;
      for (const event of events) out.push({ action, event, value: now.value, elapsed: mem.elapsed, triggeredSeconds: mem.triggeredSeconds });
      mem.state = now.state;
      if (now.state === 'None') mem.elapsed = 0;
      this.actions.set(action, mem);
    }
    return out;
  }
}
