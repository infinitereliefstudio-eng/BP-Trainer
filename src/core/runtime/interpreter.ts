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
import { eventKey, isA, lineage } from '../model/inheritance';
import type { BlueprintClass, Graph, Link, NodeInstance, PinRef, Project } from '../model/project';
import type { NodeContext, PinSpec } from '../nodes/definition';
import { contextFor, findPin, getDefinition, nodeTitle, pinValue, resolvePins } from '../nodes/registry';
import { defaultValueFor } from '../types/values';
import { getBehavior } from './behaviors';
import { RESUME, type ExecCx, type ValueCx, type WorldApi } from './behaviors/types';
import type { RunRecord } from './runRecord';
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
  /** What ran, for diagnostics. */
  readonly record: RunRecord;
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
 * 'ret': marks where a function call returns; `node` is the call node.
 */
interface Frame {
  actor: ActorRT;
  /** Where this run keeps node outputs and node memory. */
  scope: Scope;
  gi: GraphIndex;
  node: string;
  mode: 'in' | 'out' | 'ret';
  pin: string;
  via?: string;
  outputs?: Record<string, RValue>;
}

/**
 * Node outputs and node memory (DoOnce, loops…) of one graph run. An Event
 * Graph uses the actor's own, kept between events as in UE; each function
 * call gets a fresh one, like UE's per-call locals, so a function can call
 * itself and its macros start anew each call.
 */
interface Scope {
  outputs: Record<string, Record<string, RValue>>;
  state: Record<string, unknown>;
  /** Local Variables of a function call, by id. Empty for an Event Graph. */
  locals: Record<string, RValue>;
}

const actorScope = (a: ActorRT): Scope => ({ outputs: a.outputs, state: a.nodeState, locals: {} });
/** A function call: fresh node memory, and its Local Variables at their default values. */
const callScope = (graph: Graph): Scope => {
  const locals: Record<string, RValue> = {};
  for (const l of graph.fn?.locals ?? []) locals[l.id] = structuredClone(l.defaultValue) as RValue;
  return { outputs: {}, state: {}, locals };
};

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

/** Nodes run by the interpreter itself rather than by a behaviour. */
export const INTERPRETER_NODES = new Set(['var.get', 'var.getLocal', 'var.component', 'actor.self', 'fn.entry', 'fn.return', 'call.pureFunction', 'util.comment']);

/** Events and function entries: where a chain starts. */
function isEntry(node: NodeInstance | undefined): boolean {
  const kind = node && getDefinition(node.def)?.kind;
  return kind === 'event' || (kind === 'entry' && node!.def === 'fn.entry');
}

export class Interpreter {
  paused: PauseInfo | null = null;
  /** Last values seen on each node's pins, per actor ("actor:node" → pin → value). */
  readonly lastValues = new Map<string, Record<string, RValue>>();

  private graphs = new Map<string, GraphIndex>();
  private byClass = new Map<string, GraphIndex[]>();
  private stack: Frame[] = [];
  private queue: Frame[][] = [];
  private steps = 0;
  private skipBreak = false;
  private stepping = false;

  constructor(
    private readonly project: Project,
    private readonly host: InterpreterHost,
    /** Node ids where execution stops. Not saved with the project, like UE. */
    readonly breakpoints: Set<string> = new Set(),
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

  /** Does this actor's class, or one it inherits from, contain an event node matching `match`? */
  hasEvent(actor: ActorRT, match: (n: NodeInstance) => boolean): boolean {
    return this.chain(actor.classId).some((c) =>
      (this.byClass.get(c.id) ?? []).some((gi) => gi.graph.kind === 'event' && Object.values(gi.graph.nodes).some(match)),
    );
  }

  /** The class of an actor, then its parents. */
  private chain(classId: string | undefined): BlueprintClass[] {
    const cls = classId ? this.project.classes.find((c) => c.id === classId) : undefined;
    return cls ? lineage(this.project, cls) : [];
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
      if (gi) this.queue.push([{ actor, scope: actorScope(actor), gi, node: nodeId, mode: 'out', pin: action.outPin }]);
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
    const { actor, gi, scope } = frame;
    const node = gi.graph.nodes[p.nodeId];
    if (!node) return [];
    const result: PinWatch[] = [];
    this.host.mute(true);
    try {
      for (const spec of resolvePins(node, gi.ctx)) {
        if (spec.type.category === 'exec') continue;
        const value =
          spec.dir === 'in' ? this.readInput(actor, scope, gi, node, spec.id, 0) : this.readOutput(actor, scope, gi, node.id, spec.id, 0);
        result.push({ pin: spec.id, label: spec.name || spec.id, direction: spec.dir, value, type: spec.type });
      }
    } finally {
      this.host.mute(false);
    }
    return result;
  }

  /**
   * Values on a node's pins the last time it ran for this actor, like UE's
   * watched pins. A pin that never ran has no value (undefined).
   */
  watchNode(actor: ActorRT, graphId: string, nodeId: string): (PinWatch & { known: boolean })[] {
    const gi = this.graphs.get(graphId);
    const node = gi?.graph.nodes[nodeId];
    if (!gi || !node) return [];
    const rec = this.lastValues.get(`${actor.id}:${nodeId}`) ?? {};
    const stored = actor.outputs[nodeId] ?? {};
    return resolvePins(node, gi.ctx)
      .filter((spec) => spec.type.category !== 'exec')
      .map((spec) => {
        const v = spec.id in rec ? rec[spec.id] : spec.dir === 'out' ? stored[spec.id] : undefined;
        return { pin: spec.id, label: spec.name || spec.id, direction: spec.dir, value: v ?? null, type: spec.type, known: v !== undefined };
      });
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
    if (f.mode === 'ret') return false;
    return isEntry(f.gi.graph.nodes[f.node]);
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

  /**
   * Event nodes that answer for `actor`, from its class up to its parents.
   * An event a class defines hides the parent's version (override), which
   * then runs only through a "Parent:" node. `from` starts higher in the chain.
   */
  private eventFrames(actor: ActorRT, match: (n: NodeInstance) => boolean, pin: string, outputs: Record<string, RValue>, from?: string): Frame[] {
    if (actor.destroyed || !actor.classId) return [];
    let chain = this.chain(actor.classId);
    if (from) chain = chain.slice(Math.max(0, chain.findIndex((c) => c.id === from)));
    const frames: Frame[] = [];
    const overridden = new Set<string>();
    for (const cls of chain) {
      const defined: string[] = [];
      for (const gi of this.byClass.get(cls.id) ?? []) {
        if (gi.graph.kind !== 'event') continue;
        for (const n of Object.values(gi.graph.nodes)) {
          if (getDefinition(n.def)?.kind !== 'event') continue;
          const key = eventKey(n);
          defined.push(key);
          if (!overridden.has(key) && match(n)) frames.push({ actor, scope: actorScope(actor), gi, node: n.id, mode: 'out', pin, outputs });
        }
      }
      for (const k of defined) overridden.add(k);
    }
    return frames;
  }

  private pushTargets(actor: ActorRT, scope: Scope, gi: GraphIndex, node: string, pin: string): void {
    this.host.record.took(gi.graph.id, node, pin);
    const targets = gi.execOut.get(`${node}:${pin}`) ?? [];
    for (let i = targets.length - 1; i >= 0; i--) {
      this.stack.push({ actor, scope, gi, node: targets[i].to.node, mode: 'in', pin: targets[i].to.pin, via: targets[i].link });
    }
  }

  private execute(f: Frame): void {
    const { actor, gi, scope } = f;
    const node = gi.graph.nodes[f.node];
    if (!node) return;
    if (f.mode === 'ret') {
      // The function ended without reaching a Return Node: default outputs.
      scope.outputs[node.id] = this.defaultOutputs(f);
      return;
    }
    if (f.mode === 'out') {
      if (isEntry(node)) this.enter(f);
      if (f.outputs) {
        scope.outputs[node.id] = { ...f.outputs };
        for (const [pin, v] of Object.entries(f.outputs)) this.remember(actor, node.id, pin, v);
      }
      this.pushTargets(actor, scope, gi, node.id, f.pin);
      return;
    }
    this.enter(f);
    if (node.def === 'fn.return') {
      this.returnFrom(actor, scope, gi, node);
      return;
    }
    const behavior = getBehavior(node.def);
    if (!behavior?.exec) {
      this.host.runtimeError(`Le nœud ${nodeTitle(node, gi.ctx)} ne s'exécute pas encore dans cette version.`);
      return;
    }
    let resume = false;
    const calls: Frame[] = [];
    const base = this.valueCx(actor, scope, gi, node, 0);
    const cx: ExecCx = {
      ...base,
      entry: f.pin,
      out: (pin, value) => {
        scope.outputs[node.id] ??= {};
        scope.outputs[node.id][pin] = value;
        this.remember(actor, node.id, pin, value);
      },
      state: <T extends object>(init: () => T): T => {
        const st = scope.state[node.id] as T | undefined;
        if (st) return st;
        const fresh = init();
        scope.state[node.id] = fresh;
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
          values[spec.id] = this.readInput(actor, scope, gi, node, spec.id, 0);
        }
        return values;
      },
      callEvents: (target, match, outputs) => {
        const frames = this.eventFrames(target, match, 'then', outputs);
        calls.push(...frames);
        return frames.length;
      },
      callParentEvent: (key, outputs) => {
        const parent = gi.cls.parentClassId;
        const frames = parent ? this.eventFrames(actor, (n) => eventKey(n) === key, 'then', outputs, parent) : [];
        calls.push(...frames);
        return frames.length;
      },
      callFunction: (target, graphId, params, virtual = true) => {
        const entry = this.functionEntry(target, graphId, virtual);
        if (!entry) return;
        calls.push(entry, { actor, scope, gi, node: node.id, mode: 'ret', pin: '' });
        entry.outputs = params;
      },
      writeRef: (pin, value) => this.writeRef(actor, scope, gi, node, pin, value),
      setLocal: (id, value) => {
        scope.locals[id] = value;
      },
    };
    const outs = behavior.exec(cx);
    if (resume) this.stack.push({ actor, scope, gi, node: node.id, mode: 'in', pin: RESUME });
    for (let i = outs.length - 1; i >= 0; i--) this.pushTargets(actor, scope, gi, node.id, outs[i]);
    // Called events go on top: they run before this node's outputs continue.
    for (let i = calls.length - 1; i >= 0; i--) this.stack.push(calls[i]);
  }

  // ------------------------------------------------------------ functions

  /**
   * The frame that starts a function graph of `target`, or undefined (logged).
   * `virtual`: if the target's class (or a class between it and the one that
   * wrote the function) overrides it by name, its version runs, as in UE.
   */
  private functionEntry(target: ActorRT, graphId: string, virtual = true): Frame | undefined {
    let gi = this.graphs.get(graphId);
    if (!gi || !isA(this.project, target.classId, gi.cls.id)) {
      this.host.runtimeError(`${target.label} n'a pas cette fonction.`);
      return undefined;
    }
    if (virtual) {
      const name = gi.graph.name;
      const owner = gi.cls.id;
      for (const c of this.chain(target.classId)) {
        if (c.id === owner) break;
        const over = (this.byClass.get(c.id) ?? []).find((x) => x.graph.kind === 'function' && x.graph.name === name);
        if (over) {
          gi = over;
          break;
        }
      }
    }
    const entry = Object.values(gi.graph.nodes).find((n) => n.def === 'fn.entry');
    if (!entry) return undefined;
    return { actor: target, scope: callScope(gi.graph), gi, node: entry.id, mode: 'out', pin: 'then' };
  }

  /** Return Node: hand the outputs to the caller and drop the rest of the function. */
  private returnFrom(actor: ActorRT, scope: Scope, gi: GraphIndex, node: NodeInstance): void {
    const values: Record<string, RValue> = {};
    for (const p of gi.graph.fn?.outputs ?? []) values[p.id] = this.readInput(actor, scope, gi, node, p.id, 0);
    while (this.stack.length) {
      const f = this.stack.pop()!;
      if (f.mode === 'ret') {
        f.scope.outputs[f.node] = values;
        return;
      }
    }
  }

  private defaultOutputs(ret: Frame): Record<string, RValue> {
    const call = ret.gi.graph.nodes[ret.node];
    const values: Record<string, RValue> = {};
    if (!call) return values;
    for (const spec of resolvePins(call, ret.gi.ctx)) {
      if (spec.dir === 'out' && spec.type.category !== 'exec') values[spec.id] = defaultValueFor(spec.type) as RValue;
    }
    return values;
  }

  /**
   * A pure function runs to its end on the spot, each time a value is read.
   * Breakpoints are not checked inside it.
   */
  private runPure(actor: ActorRT, scope: Scope, gi: GraphIndex, call: NodeInstance, depth: number): Record<string, RValue> {
    const cx = this.valueCx(actor, scope, gi, call, depth);
    const target = this.host.actor(cx.in('target'), 'Target');
    if (!target) return {};
    const entry = this.functionEntry(target, String(call.config.graph), !call.config.parent);
    if (!entry) return {};
    const params: Record<string, RValue> = {};
    for (const spec of resolvePins(call, gi.ctx)) {
      if (spec.dir === 'in' && spec.id !== 'target') params[spec.id] = cx.in(spec.id);
    }
    entry.outputs = params;
    const base = this.stack.length;
    this.stack.push({ actor, scope, gi, node: call.id, mode: 'ret', pin: '' }, entry);
    let steps = 0;
    while (this.stack.length > base) {
      const f = this.stack.pop()!;
      if (++steps > MAX_STEPS) {
        this.host.runtimeError(`Infinite loop detected dans la fonction pure ${nodeTitle(call, gi.ctx)}.`);
        this.stack.length = base;
        return {};
      }
      if (!f.actor.destroyed) this.execute(f);
    }
    return scope.outputs[call.id] ?? {};
  }

  // ---------------------------------------------------------------- data

  /** The node feeding a data input, through any Reroute nodes. */
  private sourceOf(gi: GraphIndex, node: NodeInstance, pin: string): NodeInstance | undefined {
    let link = gi.dataIn.get(`${node.id}:${pin}`);
    for (let guard = 0; link && guard < 64; guard++) {
      const src = gi.graph.nodes[link.from.node];
      if (src?.def !== 'util.reroute') return src;
      link = gi.dataIn.get(`${src.id}:in`);
    }
    return undefined;
  }

  /** Pass-by-reference write: the variable wired into `pin` takes `value`. */
  private writeRef(actor: ActorRT, scope: Scope, gi: GraphIndex, node: NodeInstance, pin: string, value: RValue): boolean {
    const src = this.sourceOf(gi, node, pin);
    if (src?.def === 'var.get') {
      actor.vars[String(src.config.variable)] = value;
      return true;
    }
    if (src?.def === 'var.getLocal') {
      scope.locals[String(src.config.variable)] = value;
      return true;
    }
    if (src?.def === 'array.getRef') {
      // The array is the variable's own (a Get hands it over as is): change the element in place.
      const arr = this.readInput(actor, scope, gi, src, 'array', 0);
      const i = Math.trunc(Number(this.readInput(actor, scope, gi, src, 'index', 0)) || 0);
      if (Array.isArray(arr) && i >= 0 && i < arr.length) arr[i] = value;
      return true;
    }
    if (src?.def === 'var.getExternal') {
      const target = this.host.actor(this.readInput(actor, scope, gi, src, 'target', 0), 'Target');
      if (target) target.vars[String(src.config.variable)] = value;
      return true;
    }
    return false;
  }

  private remember(actor: ActorRT, nodeId: string, pin: string, value: RValue): void {
    const key = `${actor.id}:${nodeId}`;
    const rec = this.lastValues.get(key) ?? {};
    this.lastValues.set(key, rec);
    rec[pin] = value;
  }

  private valueCx(actor: ActorRT, scope: Scope, gi: GraphIndex, node: NodeInstance, depth: number): ValueCx {
    const read = (pin: string) => {
      const v = this.readInput(actor, scope, gi, node, pin, depth);
      this.remember(actor, node.id, pin, v);
      return v;
    };
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

  private readInput(actor: ActorRT, scope: Scope, gi: GraphIndex, node: NodeInstance, pin: string, depth: number): RValue {
    const spec = findPin(node, pin, gi.ctx);
    const link = gi.dataIn.get(`${node.id}:${pin}`);
    if (!link) {
      if (!spec) return null;
      if (spec.defaultsToSelf) return { ref: 'actor', id: actor.id };
      return structuredClone(pinValue(node, spec)) as RValue;
    }
    return this.readOutput(actor, scope, gi, link.from.node, link.from.pin, depth + 1);
  }

  private readOutput(actor: ActorRT, scope: Scope, gi: GraphIndex, nodeId: string, pin: string, depth: number): RValue {
    const src = gi.graph.nodes[nodeId];
    if (!src) return null;
    const def = getDefinition(src.def);
    switch (src.def) {
      case 'var.get':
        this.host.record.read(actor.id, String(src.config.variable));
        return actor.vars[String(src.config.variable)] ?? null;
      case 'var.getLocal':
        return scope.locals[String(src.config.variable)] ?? null;
      case 'var.component':
        return { ref: 'component', actor: actor.id, id: String(src.config.component) };
      case 'actor.self':
        return { ref: 'actor', id: actor.id };
      case 'util.reroute':
        return this.readInput(actor, scope, gi, src, 'in', depth + 1);
      case 'event.custom':
        if (pin === 'delegate') return { ref: 'delegate', actor: actor.id, node: src.id };
        break;
    }
    if (def?.kind === 'pure') {
      if (depth > MAX_PURE_DEPTH) {
        this.host.runtimeError('Boucle de nœuds purs : un nœud pur dépend de lui-même.');
        return null;
      }
      if (src.def === 'call.pureFunction') return this.runPure(actor, scope, gi, src, depth)[pin] ?? null;
      const behavior = getBehavior(src.def);
      if (!behavior?.pure) return null;
      const value = behavior.pure(this.valueCx(actor, scope, gi, src, depth))[pin] ?? null;
      this.remember(actor, src.id, pin, value);
      return value;
    }
    const stored = scope.outputs[nodeId]?.[pin];
    if (stored !== undefined) return stored;
    const spec: PinSpec | undefined = findPin(src, pin, gi.ctx);
    return spec ? (defaultValueFor(spec.type) as RValue) : null;
  }
}
