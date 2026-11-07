/**
 * A play session ("Play In Editor"): spawns the level, moves the player,
 * detects overlaps, fires events and advances time in fixed 1/60 s steps.
 * It has no rendering: the UI draws its state, the lesson runner checks it.
 */
import { findClass, type BlueprintClass, type Project } from '../model/project';
import { defaultValueFor, type Value } from '../types/values';
import type { PrintOptions } from './behaviors/types';
import { Interpreter, type InterpreterHost, type NodeSite, type PauseInfo, type PinWatch } from './interpreter';
import { collisionBlocks } from '../types/enums';
import { componentShape, overlapShapes, overlaps, pushOut } from './physics';
import { isRef, PLAYER_RADIUS, PLAYER_SPEED, type ActorRT, type ComponentRT, type ObjRef, type RValue, type TimerRT } from './world';

export const STEP = 1 / 60;

export type InputKey = 'E' | 'F' | 'SpaceBar';

export interface ScreenMessage {
  id: number;
  text: string;
  until: number;
}

export type SimLogLevel = 'log' | 'warning' | 'error';

export interface SimLogEntry {
  id: number;
  time: number;
  level: SimLogLevel;
  text: string;
  /** For prints: the actor and the raw text, used by lesson checks. */
  actor?: string;
  message?: string;
}

/** One node run, for the Execution Trace and the animated wires. */
export interface TraceEntry {
  id: number;
  time: number;
  frame: number;
  actorId: string;
  actorLabel: string;
  classId: string;
  className: string;
  graphId: string;
  nodeId: string;
  nodeTitle: string;
  via?: string;
}

const TRACE_MAX = 400;

let seq = 0;

/** Object variables edited on a level instance are saved as "actor:<id>". */
function instanceValue(v: Value): RValue {
  if (typeof v === 'string' && v.startsWith('actor:')) return { ref: 'actor', id: v.slice(6) };
  return structuredClone(v) as RValue;
}

export class Simulation implements InterpreterHost {
  time = 0;
  frame = 0;
  actors: ActorRT[] = [];
  readonly player: ActorRT;
  log: SimLogEntry[] = [];
  screen: ScreenMessage[] = [];
  runtimeErrors = 0;
  /** Last nodes run, oldest first (bounded). */
  trace: TraceEntry[] = [];
  /** Joystick direction, each axis in [-1, 1]. */
  move = { x: 0, y: 0 };
  /** Running timers (Set Timer by Event), by handle id. */
  timers = new Map<number, TimerRT>();

  private interp: Interpreter;
  private site: NodeSite | undefined;
  private rng: number;
  private accumulator = 0;
  private started = false;
  private errorCounts = new Map<string, number>();
  private muted = false;
  /** Remaining parts of the current frame, kept when a breakpoint stops it. */
  private phases: (() => void)[] = [];
  /** Instances made so far per class, for UE-style names (BP_Lampe_C_2). */
  private counters = new Map<string, number>();
  private timerSeq = 0;

  constructor(
    readonly project: Project,
    opts: { seed?: number; breakpoints?: Set<string> } = {},
  ) {
    this.rng = opts.seed ?? 12345;
    this.interp = new Interpreter(project, this, opts.breakpoints);
    const ps = project.level.playerStart;
    const playerCls = project.playerClassId ? findClass(project, project.playerClassId) : undefined;
    this.player = playerCls
      ? { ...this.makeActor('player', 'Joueur', `${playerCls.name}_C_0`, playerCls, {}), isPlayer: true, receivesInput: true }
      : {
          id: 'player',
          label: 'Joueur',
          objectName: 'DefaultPawn_C_0',
          className: 'Pawn',
          isPlayer: true,
          x: 0,
          y: 0,
          yaw: 0,
          components: [],
          vars: {},
          outputs: {},
          nodeState: {},
          latent: {},
          overlaps: new Set(),
          compOverlaps: new Set(),
          bindings: {},
          receivesInput: false,
          hidden: false,
          destroyed: false,
        };
    this.player.x = ps.x;
    this.player.y = ps.y;
    this.player.yaw = ps.yaw;
    this.spawnLevel();
  }

  private makeActor(id: string, label: string, objectName: string, cls: BlueprintClass, overrides: Record<string, Value>): ActorRT {
    const vars: Record<string, RValue> = {};
    for (const v of cls.variables) {
      const value = v.instanceEditable && v.id in overrides ? overrides[v.id] : v.defaultValue;
      vars[v.id] = instanceValue(value ?? defaultValueFor(v.type));
    }
    return {
      id,
      label,
      objectName,
      classId: cls.id,
      className: cls.name,
      isPlayer: false,
      x: 0,
      y: 0,
      yaw: 0,
      components: cls.components.map((c) => ({ id: c.id, name: c.name, kind: c.kind, parent: c.parent, props: structuredClone(c.props) })),
      vars,
      outputs: {},
      nodeState: {},
      latent: {},
      overlaps: new Set(),
      compOverlaps: new Set(),
      bindings: {},
      receivesInput: cls.autoReceiveInput,
      hidden: false,
      destroyed: false,
    };
  }

  private spawnLevel(): void {
    const counters = this.counters;
    if (this.player.classId) counters.set(this.player.classId, 1);
    for (const la of this.project.level.actors) {
      const cls = findClass(this.project, la.classId);
      if (!cls) continue;
      const n = counters.get(cls.id) ?? 0;
      counters.set(cls.id, n + 1);
      const a = this.makeActor(la.id, la.name, `${cls.name}_C_${n}`, cls, la.overrides);
      a.x = la.x;
      a.y = la.y;
      a.yaw = la.yaw;
      this.actors.push(a);
    }
  }

  /** Actors that run Blueprint logic: the level, then the player if it is a Blueprint. */
  private scripted(): ActorRT[] {
    const list = this.actors.filter((a) => !a.destroyed);
    return this.player.classId ? [...list, this.player] : list;
  }

  /** Fire BeginPlay on every actor, in level order. */
  start(): void {
    if (this.started) return;
    this.started = true;
    for (const a of this.scripted()) this.interp.fire(a, (n) => n.def === 'event.beginPlay', 'then');
    this.runPhases();
  }

  /** Advance by real elapsed time, in fixed steps (at most 0.25 s at once). */
  advance(seconds: number): void {
    if (this.paused) return;
    this.accumulator += Math.min(seconds, 0.25);
    while (this.accumulator >= STEP && !this.paused) {
      this.accumulator -= STEP;
      this.step();
    }
  }

  /** One frame: move, overlaps, Tick, latent actions, cleanup. */
  step(dt = STEP): void {
    if (!this.started) this.start();
    if (this.paused) return;
    this.phases.push(
      () => {
        this.movePlayer(dt);
        this.updateOverlaps();
      },
      () => {
        for (const a of this.scripted()) this.interp.fire(a, (n) => n.def === 'event.tick', 'then', { delta: dt });
      },
      () => {
        for (const a of this.scripted()) this.interp.tickLatents(a, dt);
        this.tickTimers(dt);
      },
      () => {
        this.time += dt;
        this.frame++;
        this.screen = this.screen.filter((m) => m.until > this.time);
        this.removeDestroyed();
      },
    );
    this.runPhases();
  }

  /** Run queued Blueprint work, then the rest of the frame, unless a breakpoint stops it. */
  private runPhases(): void {
    for (;;) {
      if (!this.interp.drain()) return;
      const next = this.phases.shift();
      if (!next) return;
      next();
    }
  }

  // ------------------------------------------------------------- debugger

  get paused(): PauseInfo | null {
    return this.interp.paused;
  }

  get breakpoints(): Set<string> {
    return this.interp.breakpoints;
  }

  /** Resume after a breakpoint. */
  resume(): void {
    this.interp.continue();
    this.runPhases();
  }

  /** Run the node we are stopped on, and stop before the next one. */
  stepNode(): void {
    this.interp.step();
    this.runPhases();
  }

  watch(): PinWatch[] {
    return this.interp.watchPaused();
  }

  /** Last values of a node's pins for one actor. */
  watchNode(actorId: string, graphId: string, nodeId: string) {
    const a = this.findActor(actorId);
    return a ? this.interp.watchNode(a, graphId, nodeId) : [];
  }

  // ---------------------------------------------------------------- input

  pressKey(key: InputKey): void {
    this.dispatchKey(key, 'pressed');
  }

  releaseKey(key: InputKey): void {
    this.dispatchKey(key, 'released');
  }

  private dispatchKey(key: InputKey, pin: 'pressed' | 'released'): void {
    if (!this.started) this.start();
    if (this.paused) return;
    for (const a of this.scripted()) {
      if (!a.receivesInput) continue;
      this.interp.fire(a, (n) => n.def === 'event.inputKey' && n.config.key === key, pin);
    }
    this.runPhases();
  }

  /** Actors with an input event that will not fire because input is off. */
  deafActors(key?: InputKey): ActorRT[] {
    return this.scripted().filter(
      (a) => !a.receivesInput && this.interp.hasEvent(a, (n) => n.def === 'event.inputKey' && (!key || n.config.key === key)),
    );
  }

  click(actorId: string): void {
    const a = this.actors.find((x) => x.id === actorId);
    if (!a || this.paused) return;
    this.interp.fire(a, (n) => n.def === 'event.actorOnClicked', 'then');
    this.runPhases();
  }

  teleportPlayer(x: number, y: number): void {
    this.player.x = x;
    this.player.y = y;
  }

  // -------------------------------------------------------------- physics

  private movePlayer(dt: number): void {
    let { x: mx, y: my } = this.move;
    const len = Math.hypot(mx, my);
    if (len < 0.05) return;
    if (len > 1) {
      mx /= len;
      my /= len;
    }
    const p = this.player;
    let nx = p.x + mx * PLAYER_SPEED * dt;
    let ny = p.y + my * PLAYER_SPEED * dt;
    p.yaw = (Math.atan2(my, mx) * 180) / Math.PI;
    for (let iter = 0; iter < 3; iter++) {
      for (const a of this.actors) {
        if (a.destroyed) continue;
        for (const c of a.components) {
          if (c.kind !== 'StaticMesh' || !c.props.blocks || !collisionBlocks(c.props.collision)) continue;
          const s = componentShape(a, c);
          if (s) [nx, ny] = pushOut(nx, ny, PLAYER_RADIUS, s);
        }
      }
    }
    p.x = nx;
    p.y = ny;
  }

  private updateOverlaps(): void {
    const live = [this.player, ...this.actors.filter((a) => !a.destroyed)];
    const shapes = new Map(live.map((a) => [a.id, overlapShapes(a)]));
    const nextActor = new Map<string, Set<string>>(live.map((a) => [a.id, new Set()]));
    const nextComp = new Map<string, Set<string>>(live.map((a) => [a.id, new Set()]));

    for (let i = 0; i < live.length; i++) {
      for (let j = i + 1; j < live.length; j++) {
        const A = live[i],
          B = live[j];
        const sa = shapes.get(A.id)!,
          sb = shapes.get(B.id)!;
        let any = false;
        for (const x of sa) {
          for (const y of sb) {
            if (!overlaps(x.shape, y.shape)) continue;
            any = true;
            if (x.comp) nextComp.get(A.id)!.add(`${x.comp.id}|${B.id}`);
            if (y.comp) nextComp.get(B.id)!.add(`${y.comp.id}|${A.id}`);
          }
        }
        if (any) {
          nextActor.get(A.id)!.add(B.id);
          nextActor.get(B.id)!.add(A.id);
        }
      }
    }

    // End events first, then begin events, like a frame of UE overlaps.
    for (const a of live) {
      const nextC = nextComp.get(a.id)!;
      for (const key of a.compOverlaps) {
        if (nextC.has(key)) continue;
        const [comp, other] = key.split('|');
        this.interp.fire(a, (n) => n.def === 'event.componentEndOverlap' && n.config.component === comp, 'then', { other: { ref: 'actor', id: other } });
      }
      const nextA = nextActor.get(a.id)!;
      for (const other of a.overlaps) {
        if (!nextA.has(other)) this.interp.fire(a, (n) => n.def === 'event.actorEndOverlap', 'then', { other: { ref: 'actor', id: other } });
      }
    }
    for (const a of live) {
      const nextC = nextComp.get(a.id)!;
      const prevC = a.compOverlaps;
      const nextA = nextActor.get(a.id)!;
      const prevA = a.overlaps;
      a.compOverlaps = nextC;
      a.overlaps = nextA;
      for (const key of nextC) {
        if (prevC.has(key)) continue;
        const [comp, other] = key.split('|');
        this.interp.fire(a, (n) => n.def === 'event.componentBeginOverlap' && n.config.component === comp, 'then', { other: { ref: 'actor', id: other } });
      }
      for (const other of nextA) {
        if (!prevA.has(other)) this.interp.fire(a, (n) => n.def === 'event.actorBeginOverlap', 'then', { other: { ref: 'actor', id: other } });
      }
    }
  }

  /** Count timers down; a looping timer can fire several times in a long frame. */
  private tickTimers(dt: number): void {
    for (const t of [...this.timers.values()]) {
      if (t.paused) continue;
      t.remaining -= dt;
      const owner = this.findActor(t.actor);
      for (let guard = 0; t.remaining <= 1e-9 && guard < 1000; guard++) {
        if (owner && !owner.destroyed) this.interp.fire(owner, (n) => n.id === t.node, 'then');
        if (!t.looping) {
          this.timers.delete(t.id);
          break;
        }
        t.remaining += t.time;
      }
    }
  }

  private removeDestroyed(): void {
    const gone = this.actors.filter((a) => a.destroyed);
    if (!gone.length) return;
    for (const g of gone) for (const t of [...this.timers.values()]) if (t.actor === g.id) this.timers.delete(t.id);
    this.actors = this.actors.filter((a) => !a.destroyed);
    const goneIds = new Set(gone.map((g) => g.id));
    for (const a of [this.player, ...this.actors]) {
      for (const key of Object.keys(a.bindings)) a.bindings[key] = a.bindings[key].filter((b) => !goneIds.has(b.actor));
    }
    for (const g of gone) {
      for (const a of [this.player, ...this.actors]) {
        if (!a.overlaps.has(g.id)) continue;
        a.overlaps.delete(g.id);
        for (const k of [...a.compOverlaps]) if (k.endsWith(`|${g.id}`)) a.compOverlaps.delete(k);
        this.interp.fire(a, (n) => n.def === 'event.actorEndOverlap', 'then', { other: { ref: 'actor', id: g.id } });
      }
    }
  }

  // ------------------------------------------------------------ WorldApi

  random(): number {
    // Mulberry32: deterministic, so lesson checks are reproducible.
    let t = (this.rng += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  print(actor: ActorRT, text: string, opts: PrintOptions): void {
    if (opts.toScreen) this.screen.unshift({ id: ++seq, text, until: this.time + Math.max(0, opts.duration) });
    if (this.screen.length > 12) this.screen.length = 12;
    if (opts.toLog) {
      this.log.push({
        id: ++seq,
        time: this.time,
        level: 'log',
        text: `LogBlueprintUserMessages: [${actor.objectName}] ${text}`,
        actor: actor.id,
        message: text,
      });
    }
  }

  private findActor(id: string): ActorRT | undefined {
    if (id === this.player.id) return this.player;
    return this.actors.find((a) => a.id === id);
  }

  component(ref: RValue, pinName: string): ComponentRT | null {
    if (!isRef(ref) || ref.ref !== 'component') {
      this.runtimeError(`Accessed None trying to read property ${pinName}`);
      return null;
    }
    const a = this.findActor(ref.actor);
    const c = a && !a.destroyed ? a.components.find((k) => k.id === ref.id) : undefined;
    if (!c) {
      this.runtimeError(`Accessed None trying to read property ${pinName} (le composant n'existe plus)`);
      return null;
    }
    return c;
  }

  actor(ref: RValue, pinName: string): ActorRT | null {
    if (!isRef(ref) || ref.ref !== 'actor') {
      this.runtimeError(`Accessed None trying to read property ${pinName}`);
      return null;
    }
    const a = this.findActor(ref.id);
    if (!a || a.destroyed) {
      this.runtimeError(`Accessed None trying to read property ${pinName} (l'acteur a été détruit)`);
      return null;
    }
    return a;
  }

  tryActor(ref: RValue): ActorRT | null {
    if (!isRef(ref) || ref.ref !== 'actor') return null;
    const a = this.findActor(ref.id);
    return a && !a.destroyed ? a : null;
  }

  isValid(ref: RValue): boolean {
    if (!isRef(ref)) return false;
    if (ref.ref === 'actor') return !!this.tryActor(ref);
    if (ref.ref === 'timer') return this.timers.has(ref.id);
    const a = this.findActor(ref.actor);
    return !!a && !a.destroyed && (ref.ref === 'delegate' || a.components.some((c) => c.id === ref.id));
  }

  classOf(actor: ActorRT): BlueprintClass | undefined {
    return actor.classId ? findClass(this.project, actor.classId) : undefined;
  }

  ownerOf(c: ComponentRT): ActorRT | undefined {
    return [this.player, ...this.actors].find((a) => a.components.includes(c));
  }

  allActors(): ActorRT[] {
    return [...this.actors.filter((a) => !a.destroyed), this.player];
  }

  spawn(classId: string, x: number, y: number, yaw: number): ActorRT | null {
    const cls = findClass(this.project, classId);
    if (!cls) return null;
    const n = this.counters.get(cls.id) ?? 0;
    this.counters.set(cls.id, n + 1);
    const a = this.makeActor(`spawn_${++seq}`, `${cls.name}${n + 1}`, `${cls.name}_C_${n}`, cls, {});
    a.x = x;
    a.y = y;
    a.yaw = yaw;
    this.actors.push(a);
    return a;
  }

  setTimer(event: ObjRef, time: number, looping: boolean): RValue {
    if (event.ref !== 'delegate') return null;
    // UE: the same event set again replaces its timer; Time <= 0 clears it.
    const existing = [...this.timers.values()].find((t) => t.actor === event.actor && t.node === event.node);
    if (existing) this.timers.delete(existing.id);
    if (!(time > 0)) return null;
    const id = existing?.id ?? ++this.timerSeq;
    this.timers.set(id, { id, actor: event.actor, node: event.node, time, remaining: time, looping, paused: false });
    return { ref: 'timer', id };
  }

  timer(handle: RValue): TimerRT | undefined {
    return isRef(handle) && handle.ref === 'timer' ? this.timers.get(handle.id) : undefined;
  }

  clearTimer(handle: RValue): void {
    if (isRef(handle) && handle.ref === 'timer') this.timers.delete(handle.id);
  }

  destroy(actor: ActorRT): void {
    if (actor.isPlayer) {
      this.runtimeError('Destroy Actor : le joueur ne peut pas être détruit dans cette version.');
      return;
    }
    actor.destroyed = true;
    actor.latent = {};
  }

  displayName(ref: RValue): string {
    if (!isRef(ref)) return ref === null ? 'None' : String(ref);
    if (ref.ref === 'actor') return this.findActor(ref.id)?.label ?? 'None';
    if (ref.ref === 'timer') return this.timers.has(ref.id) ? `Timer Handle ${ref.id}` : 'Timer Handle (invalide)';
    const a = this.findActor(ref.actor);
    if (ref.ref === 'delegate') return a ? `${a.label} (événement)` : 'None';
    return a?.components.find((c) => c.id === ref.id)?.name ?? 'None';
  }

  enterNode(site: NodeSite): void {
    this.site = site;
    this.trace.push({
      id: ++seq,
      time: this.time,
      frame: this.frame,
      actorId: site.actor.id,
      actorLabel: site.actor.label,
      classId: site.classId,
      className: site.className,
      graphId: site.graphId,
      nodeId: site.nodeId,
      nodeTitle: site.nodeTitle,
      via: site.via,
    });
    if (this.trace.length > TRACE_MAX) this.trace.splice(0, this.trace.length - TRACE_MAX);
  }

  mute(on: boolean): void {
    this.muted = on;
  }

  runtimeError(message: string): void {
    if (this.muted) return;
    const s = this.site;
    const where = s ? ` Node: ${s.nodeTitle} Graph: ${s.graphName} Blueprint: ${s.className}` : '';
    const text = `Blueprint Runtime Error: "${message}".${where}`;
    const count = (this.errorCounts.get(text) ?? 0) + 1;
    this.errorCounts.set(text, count);
    this.runtimeErrors++;
    if (count <= 3) this.log.push({ id: ++seq, time: this.time, level: 'error', text });
    else if (count === 4) this.log.push({ id: ++seq, time: this.time, level: 'warning', text: `(erreur répétée, masquée) ${text}` });
  }
}
