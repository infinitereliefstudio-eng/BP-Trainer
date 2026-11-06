/**
 * The Blueprint interpreter: runs event graphs node by node.
 *
 * - One explicit stack of frames is shared by every actor. Exec flow is
 *   single-threaded: a chain runs to its end, or to a latent node, before
 *   the next event is taken from the queue.
 * - Calling an event (Custom Event, Event Dispatcher, interface message)
 *   pushes its chain on top of the caller's: it runs first, then the caller
 *   continues — exactly like a function call in UE.
 * - Because the state lives in the interpreter and not in the JS call stack,
 *   execution can stop *before* any node (breakpoint, step) and resume later.
 * - Data inputs are pulled when a node asks for them; pure nodes are
 *   recomputed for every read; impure nodes keep their last outputs.
 */
import type { BlueprintClass, Graph, Link, NodeInstance, PinRef, Project } from '../model/project';
import type { NodeContext, PinSpec } from '../nodes/definition';
import { contextFor, findPin, getDefinition, nodeTitle, pinValue, resolvePins } from '../nodes/registry';
import { defaultValueFor } from '../types/values';
import { getBehavior } from './behaviors';
import { RESUME, type ExecCx, type ValueCx, type WorldApi } from './behaviors/types';
import type { ActorRT, RValue } from './world';

/** Where execution currently is: used for error messages and the trace. */
export interface NodeSite {
  actor: ActorRT;
  classId: string;
  className: string;
  graphId: string;
  graphName: string;
  nodeId: string;
  nodeTitle: string;
  /** Exec wire that led here, if any (for the animated wires). */
  via?: string;
}

export interface InterpreterHost extends WorldApi {
  /** Called before each node runs, so errors can name it. */
  enterNode(site: NodeSite): void;
  runtimeError(message: string): void;
  /** While muted, reads made by the debugger do not log errors. */
  mute(on: boolean): void;
}

interface GraphIndex {
  graph: Graph;
  cls: BlueprintClass;
  ctx: NodeContext;
  /** "node:pin" of a data input → the link feeding it. */
  dataIn: Map<string, Link>;
  /** "node:pin" of an exec output → the exec inputs it drives, with the wire. */
  execOut: Map<string, { to: PinRef; link: string }[]>;
}

/**
 * 'in': run the node, entered through exec input `pin`.
 * 'out': continue from the node's exec output `pin` (an event firing, a
 * finished Delay), after storing `outputs` as the node's output values.
 */
interface Frame {
  actor: ActorRT;
  gi: GraphIndex;
  node: string;
  mode: 'in' | 'out';
  pin: string;
  via?: string;
  outputs?: Record<string, RValue>;
}

export interface PauseInfo {
  reason: 'breakpoint' | 'step';
  actorId: string;
  actorLabel: string;
  classId: string;
  graphId: string;
  nodeId: string;
  nodeTitle: string;
}

export interface PinWatch {
  pin: string;
  label: string;
  direction: 'in' | 'out';
  value: RValue;
  type: PinSpec['type'];
}

/** Steps allowed for one event before UE-style "Infinite loop detected". */
export const MAX_STEPS = 100_000;
const MAX_PURE_DEPTH = 64;

export class Interpreter {
  /** Node ids where execution stops. Not saved with the project, like UE. */
  readonly breakpoints = new Set<string>();
  paused: PauseInfo | null = null;

  private graphs = new Map<string, GraphIndex>();
  private byClass = new Map<string, GraphIndex[]>();
  private stack: Frame[] = [];
  private queue: Frame[][] = [];
  private steps = 0;
  private skipBreak = false;
  private stepping = false;

  constructor(
    project: Project,
    private readonly host: InterpreterHost,
  ) {
    for (const cls of project.classes) {
      const ctx = contextFor(cls, project);
      const list: GraphIndex[] = [];
      for (const graph of cls.graphs) {
        const gi: GraphIndex = { graph, cls, ctx, dataIn: new Map(), execOut: new Map() };
        for (const l of Object.values(graph.links)) {
          const fromNode = graph.nodes[l.from.node];
          const spec = fromNode && findPin(fromNode, l.from.pin, ctx);
          if (!spec) continue;
          if (spec.type.category === 'exec') {
            const key = `${l.from.node}:${l.from.pin}`;
            const arr = gi.execOut.get(key) ?? [];
            arr.push({ to: l.to, link: l.id });
            gi.execOut.set(key, arr);
          } else {
            gi.dataIn.set(`${l.to.node}:${l.to.pin}`, l);
          }
        }
        this.graphs.set(graph.id, gi);
        list.push(gi);
      }
      this.byClass.set(cls.id, list);
    }
  }

  /** Does this actor's class contain a node matching `match`? */
  hasEvent(actor: ActorRT, match: (n: NodeInstance) => boolean): boolean {
    const list = actor.classId ? this.byClass.get(actor.classId) : undefined;
    return !!list?.some((gi) => gi.graph.kind === 'event' && Object.values(gi.graph.nodes).some(match));
  }

  /** Queue every event node of the actor's class that matches. Run by drain(). */
  fire(actor: ActorRT, match: (n: NodeInstance) => boolean, execPin: string, outputs: Record<string, RValue> = {}): void {
    const frames = this.eventFrames(actor, match, execPin, outputs);
    if (frames.length) this.queue.push(frames);
  }

  /** Count down latent actions and queue the ones that are due. */
  tickLatents(actor: ActorRT, dt: number): void {
    for (const [nodeId, action] of Object.entries(actor.latent)) {
      action.remaining -= dt;
      if (action.remaining > 1e-9) continue;
      delete actor.latent[nodeId];
      const gi = this.graphs.get(action.graphId);
      if (gi) this.queue.push([{ actor, gi, node: nodeId, mode: 'out', pin: action.outPin }]);
    }
  }

  /** Is there queued or suspended work? */
  get busy(): boolean {
    return this.stack.length > 0 || this.queue.length > 0;
  }

  // ------------------------------------------------------------ debugger

  /** Leave the breakpoint and run until the next one. */
  continue(): void {
    if (!this.paused) return;
    this.paused = null;
    this.skipBreak = true;
    this.stepping = false;
  }

  /** Run the paused node and stop before the next node that runs. */
  step(): void {
    if (!this.paused) return;
    this.paused = null;
    this.skipBreak = true;
    this.stepping = true;
  }

  /** Values on the pins of the paused node, read without side effects on the log. */
  watchPaused(): PinWatch[] {
    const p = this.paused;
    const frame = this.stack[this.stack.length - 1];
    if (!p || !frame) return [];
    const { actor, gi } = frame;
    const node = gi.graph.nodes[p.nodeId];
    if (!node) return [];
    const result: PinWatch[] = [];
    this.host.mute(true);
    try {
      for (const spec of resolvePins(node, gi.ctx)) {
        if (spec.type.category === 'exec') continue;
        const value =
          spec.dir === 'in' ? this.readInput(actor, gi, node, spec.id, 0) : this.readOutput(actor, gi, node.id, spec.id, 0);
        result.push({ pin: spec.id, label: spec.name || spec.id, direction: spec.dir, value, type: spec.type });
      }
    } finally {
      this.host.mute(false);
    }
    return result;
  }

  // ---------------------------------------------------------------- exec

  /**
   * Run queued work until there is none left (true) or a breakpoint stops
   * it (false; call continue()/step() then drain() again).
   */
  drain(): boolean {
    if (this.paused) return false;
    for (;;) {
      if (!this.stack.length) {
        const next = this.queue.shift();
        if (!next) return true;
        this.steps = 0;
        for (let i = next.length - 1; i >= 0; i--) this.stack.push(next[i]);
        continue;
      }
      const f = this.stack[this.stack.length - 1];
      if (f.actor.destroyed) {
        this.stack.pop();
        continue;
      }
      if (!this.skipBreak && this.breakable(f) && (this.stepping || this.breakpoints.has(f.node))) {
        const node = f.gi.graph.nodes[f.node];
        this.paused = {
          reason: this.stepping ? 'step' : 'breakpoint',
          actorId: f.actor.id,
          actorLabel: f.actor.label,
          classId: f.gi.cls.id,
          graphId: f.gi.graph.id,
          nodeId: f.node,
          nodeTitle: node ? nodeTitle(node, f.gi.ctx) : '?',
        };
        this.stepping = false;
        return false;
      }
      this.skipBreak = false;
      this.stack.pop();
      if (++this.steps > MAX_STEPS) {
        this.host.runtimeError(
          `Infinite loop detected. Blueprint: ${f.gi.cls.name} — plus de ${MAX_STEPS.toLocaleString('fr-FR')} nœuds exécutés pour un seul événement.`,
        );
        this.stack.length = 0;
        continue;
      }
      this.execute(f);
    }
  }

  /** Breakpoints stop on nodes being entered and on events firing. */
  private breakable(f: Frame): boolean {
    if (f.mode === 'in') return f.pin !== RESUME;
    const node = f.gi.graph.nodes[f.node];
    return !!node && getDefinition(node.def)?.kind === 'event';
  }

  private enter(f: Frame): void {
    const node = f.gi.graph.nodes[f.node];
    this.host.enterNode({
      actor: f.actor,
      classId: f.gi.cls.id,
      className: f.gi.cls.name,
      graphId: f.gi.graph.id,
      graphName: f.gi.graph.name,
      nodeId: f.node,
      nodeTitle: node ? nodeTitle(node, f.gi.ctx) : '?',
      via: f.via,
    });
  }

  private eventFrames(actor: ActorRT, match: (n: NodeInstance) => boolean, pin: string, outputs: Record<string, RValue>): Frame[] {
    if (actor.destroyed || !actor.classId) return [];
    const frames: Frame[] = [];
    for (const gi of this.byClass.get(actor.classId) ?? []) {
      if (gi.graph.kind !== 'event') continue;
      for (const n of Object.values(gi.graph.nodes)) {
        if (match(n)) frames.push({ actor, gi, node: n.id, mode: 'out', pin, outputs });
      }
    }
    return frames;
  }

  private pushTargets(actor: ActorRT, gi: GraphIndex, node: string, pin: string): void {
    const targets = gi.execOut.get(`${node}:${pin}`) ?? [];
    for (let i = targets.length - 1; i >= 0; i--) {
      this.stack.push({ actor, gi, node: targets[i].to.node, mode: 'in', pin: targets[i].to.pin, via: targets[i].link });
    }
  }

  private execute(f: Frame): void {
    const { actor, gi } = f;
    const node = gi.graph.nodes[f.node];
    if (!node) return;
    if (f.mode === 'out') {
      if (getDefinition(node.def)?.kind === 'event') this.enter(f);
      if (f.outputs) actor.outputs[node.id] = { ...f.outputs };
      this.pushTargets(actor, gi, node.id, f.pin);
      return;
    }
    this.enter(f);
    const behavior = getBehavior(node.def);
    if (!behavior?.exec) {
      this.host.runtimeError(`Le nœud ${nodeTitle(node, gi.ctx)} ne s'exécute pas encore dans cette version.`);
      return;
    }
    let resume = false;
    const calls: Frame[] = [];
    const cx: ExecCx = {
      ...this.valueCx(actor, gi, node, 0),
      entry: f.pin,
      out: (pin, value) => {
        (actor.outputs[node.id] ??= {})[pin] = value;
      },
      state: <T extends object>(init: () => T): T => {
        const st = actor.nodeState[node.id] as T | undefined;
        if (st) return st;
        const fresh = init();
        actor.nodeState[node.id] = fresh;
        return fresh;
      },
      resume: () => {
        resume = true;
      },
      latentActive: () => node.id in actor.latent,
      startLatent: (seconds, pin) => {
        actor.latent[node.id] = { graphId: gi.graph.id, remaining: seconds, outPin: pin };
      },
      params: () => {
        const values: Record<string, RValue> = {};
        for (const spec of resolvePins(node, gi.ctx)) {
          if (spec.dir !== 'in' || spec.type.category === 'exec' || spec.id === 'target') continue;
          values[spec.id] = this.readInput(actor, gi, node, spec.id, 0);
        }
        return values;
      },
      callEvents: (target, match, outputs) => {
        const frames = this.eventFrames(target, match, 'then', outputs);
        calls.push(...frames);
        return frames.length;
      },
    };
    const outs = behavior.exec(cx);
    if (resume) this.stack.push({ actor, gi, node: node.id, mode: 'in', pin: RESUME });
    for (let i = outs.length - 1; i >= 0; i--) this.pushTargets(actor, gi, node.id, outs[i]);
    // Called events go on top: they run before this node's outputs continue.
    for (let i = calls.length - 1; i >= 0; i--) this.stack.push(calls[i]);
  }

  // ---------------------------------------------------------------- data

  private valueCx(actor: ActorRT, gi: GraphIndex, node: NodeInstance, depth: number): ValueCx {
    const read = (pin: string) => this.readInput(actor, gi, node, pin, depth);
    return {
      actor,
      node,
      world: this.host,
      ctx: gi.ctx,
      in: read,
      num: (pin) => Number(read(pin)) || 0,
      bool: (pin) => !!read(pin),
      str: (pin) => {
        const v = read(pin);
        return v === null || v === undefined ? '' : typeof v === 'object' ? this.host.displayName(v as RValue) : String(v);
      },
    };
  }

  private readInput(actor: ActorRT, gi: GraphIndex, node: NodeInstance, pin: string, depth: number): RValue {
    const spec = findPin(node, pin, gi.ctx);
    const link = gi.dataIn.get(`${node.id}:${pin}`);
    if (!link) {
      if (!spec) return null;
      if (spec.defaultsToSelf) return { ref: 'actor', id: actor.id };
      return structuredClone(pinValue(node, spec)) as RValue;
    }
    return this.readOutput(actor, gi, link.from.node, link.from.pin, depth + 1);
  }

  private readOutput(actor: ActorRT, gi: GraphIndex, nodeId: string, pin: string, depth: number): RValue {
    const src = gi.graph.nodes[nodeId];
    if (!src) return null;
    const def = getDefinition(src.def);
    switch (src.def) {
      case 'var.get':
        return actor.vars[String(src.config.variable)] ?? null;
      case 'var.component':
        return { ref: 'component', actor: actor.id, id: String(src.config.component) };
      case 'actor.self':
        return { ref: 'actor', id: actor.id };
      case 'event.custom':
        if (pin === 'delegate') return { ref: 'delegate', actor: actor.id, node: src.id };
        break;
    }
    if (def?.kind === 'pure') {
      if (depth > MAX_PURE_DEPTH) {
        this.host.runtimeError('Boucle de nœuds purs : un nœud pur dépend de lui-même.');
        return null;
      }
      const behavior = getBehavior(src.def);
      if (!behavior?.pure) return null;
      return behavior.pure(this.valueCx(actor, gi, src, depth))[pin] ?? null;
    }
    const stored = actor.outputs[nodeId]?.[pin];
    if (stored !== undefined) return stored;
    const spec: PinSpec | undefined = findPin(src, pin, gi.ctx);
    return spec ? (defaultValueFor(spec.type) as RValue) : null;
  }
}
