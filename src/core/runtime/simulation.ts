/**
 * A play session ("Play In Editor"): spawns the level, then advances time in
 * fixed 1/60 s steps made of resumable phases (move and overlaps, Tick,
 * latent actions and timers, cleanup). It has no rendering: the UI draws its
 * state, the lesson runner checks it.
 *
 * The work itself lives beside it: actorFactory (instances), movement and
 * overlaps (physics events), timers, journal (Output Log and screen). This
 * class orders them and answers the interpreter (WorldApi).
 */
import { explainRuntime } from '../explain/runtime';
import { inheritedView, isA, lineage } from '../model/inheritance';
import { findClass, type BlueprintClass, type NodeInstance, type Project } from '../model/project';
import type { PrintOptions } from './behaviors/types';
import { createActor, createPlayer } from './actorFactory';
import { Interpreter, type InterpreterHost, type NodeSite, type PauseInfo, type PinWatch } from './interpreter';
import { Journal, nextId, type ScreenMessage, type SimLogEntry } from './journal';
import { RunRecord, type NoteCode } from './runRecord';
import { movePlayer, type BlockingHit } from './movement';
import { endOverlapsWith, updateOverlaps, type Fire } from './overlaps';
import { TimerSet } from './timers';
import { lineTrace, type DebugLine, type TraceHit } from './trace';
import { isRef, type ActorRT, type ComponentRT, type ObjRef, type RValue, type TimerRT } from './world';

export type { ScreenMessage, SimLogEntry, SimLogLevel } from './journal';

export const STEP = 1 / 60;

export type InputKey = 'E' | 'F' | 'SpaceBar';

/**
 * The order actors run their events in (BeginPlay, Tick, input). UE does not
 * guarantee it, so Play shuffles it; lesson checks run 'level' then
 * 'reversed' to catch solutions that only work by luck.
 */
export type ActorOrder = 'level' | 'reversed' | 'shuffled';

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

export class Simulation implements InterpreterHost {
  time = 0;
  frame = 0;
  actors: ActorRT[] = [];
  readonly player: ActorRT;
  /** Last nodes run, oldest first (bounded). */
  trace: TraceEntry[] = [];
  /** Joystick direction, each axis in [-1, 1]. */
  move = { x: 0, y: 0 };
  /** Duration of the frame being played. */
  deltaSeconds = STEP;
  /** Debug lines of Line Traces still on screen. */
  debugLines: DebugLine[] = [];
  /** Running timers (Set Timer by Event). */
  readonly timers = new TimerSet();
  /** Everything that ran, for "why did this node not run?". */
  readonly record = new RunRecord();

  private readonly journal = new Journal();
  private interp: Interpreter;
  private site: NodeSite | undefined;
  private rng: number;
  /** Position of each starting actor in the event order (spawned ones run after, in spawn order). */
  private readonly rank = new Map<string, number>();
  private readonly order: ActorOrder;
  private accumulator = 0;
  private started = false;
  private muted = false;
  /** Remaining parts of the current frame, kept when a breakpoint stops it. */
  private phases: (() => void)[] = [];
  /** Instances made so far per class, for UE-style names (BP_Lampe_C_2). */
  private counters = new Map<string, number>();
  private readonly fire: Fire = (actor, match, pin, outputs) => this.interp.fire(actor, match, pin, outputs);

  constructor(
    readonly project: Project,
    opts: { seed?: number; breakpoints?: Set<string>; order?: ActorOrder } = {},
  ) {
    this.rng = opts.seed ?? 12345;
    this.interp = new Interpreter(project, this, opts.breakpoints);
    const ps = project.level.playerStart;
    const pawn = project.playerClassId ? findClass(project, project.playerClassId) : undefined;
    this.player = createPlayer(pawn && inheritedView(pawn, project, true));
    this.player.x = ps.x;
    this.player.y = ps.y;
    this.player.yaw = ps.yaw;
    if (this.player.classId) this.counters.set(this.player.classId, 1);
    this.spawnLevel();
    this.order = opts.order ?? 'level';
    this.rankActors(this.order);
    this.construct();
  }

  /**
   * Construction Scripts run as soon as the level exists, before any
   * BeginPlay: this is also what the editor's level view shows.
   */
  private construct(): void {
    for (const a of this.scripted()) this.interp.construct(a);
    this.interp.drain(true);
  }

  // ------------------------------------------------------------- journal

  get log(): SimLogEntry[] {
    return this.journal.log;
  }

  get screen(): ScreenMessage[] {
    return this.journal.screen;
  }

  get runtimeErrors(): number {
    return this.journal.runtimeErrors;
  }

  // --------------------------------------------------------------- level

  /** The next UE-style object name for a class: BP_Lampe_C_0, _C_1… */
  private objectName(cls: BlueprintClass): { n: number; name: string } {
    const n = this.counters.get(cls.id) ?? 0;
    this.counters.set(cls.id, n + 1);
    return { n, name: `${cls.name}_C_${n}` };
  }

  private spawnLevel(): void {
    for (const la of this.project.level.actors) {
      const cls = findClass(this.project, la.classId);
      if (!cls) continue;
      const a = createActor(la.id, la.name, this.objectName(cls).name, inheritedView(cls, this.project, true), la.overrides);
      a.x = la.x;
      a.y = la.y;
      a.yaw = la.yaw;
      this.actors.push(a);
      this.markClass(cls.id);
    }
    if (this.player.classId) this.markClass(this.player.classId);
  }

  /** An actor of this class exists: so does one of each class it inherits from (diagnostics). */
  private markClass(classId: string): void {
    const cls = findClass(this.project, classId);
    for (const c of cls ? lineage(this.project, cls) : []) this.record.classes.add(c.id);
  }

  /** Fix the event order of the starting actors (the level, then the player). */
  private rankActors(order: ActorOrder): void {
    const ids = [...this.actors.map((a) => a.id), this.player.id];
    if (order === 'reversed') ids.reverse();
    if (order === 'shuffled') {
      for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(this.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }
    }
    for (const [i, id] of ids.entries()) this.rank.set(id, i);
  }

  /** Actors that run Blueprint logic (the player only if it is a Blueprint), in event order. */
  private scripted(): ActorRT[] {
    const list = [...this.actors.filter((a) => !a.destroyed), ...(this.player.classId ? [this.player] : [])];
    const rank = (a: ActorRT) => this.rank.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    return list.sort((a, b) => rank(a) - rank(b));
  }

  private fireAll(match: (n: NodeInstance) => boolean, pin: string, outputs?: Record<string, RValue>): void {
    for (const a of this.scripted()) this.fire(a, match, pin, outputs);
  }

  // ---------------------------------------------------------------- time

  /** Fire BeginPlay on every actor, in event order. */
  start(): void {
    if (this.started) return;
    this.started = true;
    const isBeginPlay = (n: NodeInstance) => n.def === 'event.beginPlay';
    const first = this.scripted().filter((a) => this.interp.hasEvent(a, isBeginPlay));
    if (this.order === 'shuffled' && first.length > 1) {
      this.journal.info(
        this.time,
        `Ordre des BeginPlay pour cette partie : ${first.map((a) => a.label).join(', ')}. Il change à chaque Play : UE ne garantit pas l'ordre entre acteurs.`,
      );
    }
    for (const a of this.scripted()) this.interp.autoPlayTimelines(a);
    this.fireAll(isBeginPlay, 'then');
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

  /** One frame: move, overlaps, Tick, latent actions and timers, cleanup. */
  step(dt = STEP): void {
    if (!this.started) this.start();
    if (this.paused) return;
    this.deltaSeconds = dt;
    this.phases.push(
      () => {
        for (const h of movePlayer(this.player, this.move, this.actors, dt)) this.fireHit(h);
      },
      () => {
        updateOverlaps([this.player, ...this.actors.filter((a) => !a.destroyed)], this.fire);
      },
      () => this.fireAll((n) => n.def === 'event.tick', 'then', { delta: dt }),
      () => {
        for (const a of this.scripted()) {
          this.interp.tickLatents(a, dt);
          this.interp.tickTimelines(a, dt);
        }
        this.timers.tick(dt, (t) => {
          const owner = this.findActor(t.actor);
          if (owner && !owner.destroyed) this.fire(owner, (n) => n.id === t.node, 'then');
        });
      },
      () => {
        this.time += dt;
        this.record.time = this.time;
        this.frame++;
        this.journal.expire(this.time);
        this.debugLines = this.debugLines.filter((l) => l.until > this.time + 1e-9);
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

  /**
   * The player is blocked by a mesh: both actors get Event Hit, every frame
   * the contact lasts. The one that moved gets the surface normal, the other
   * its opposite (the direction it is pushed in), as UE's ReceiveHit.
   */
  private fireHit(h: BlockingHit): void {
    const isHit = (n: NodeInstance) => n.def === 'event.hit';
    const at: RValue = { x: h.x, y: h.y, z: 0 };
    const comp: RValue = { ref: 'component', actor: h.actor.id, id: h.comp.id };
    this.fire(h.actor, isHit, 'then', {
      myComp: comp,
      other: { ref: 'actor', id: this.player.id },
      otherComp: null,
      location: at,
      normal: { x: -h.nx, y: -h.ny, z: 0 },
    });
    if (this.player.classId) {
      this.fire(this.player, isHit, 'then', {
        myComp: null,
        other: { ref: 'actor', id: h.actor.id },
        otherComp: comp,
        location: at,
        normal: { x: h.nx, y: h.ny, z: 0 },
      });
    }
  }

  private removeDestroyed(): void {
    const gone = this.actors.filter((a) => a.destroyed);
    if (!gone.length) return;
    this.actors = this.actors.filter((a) => !a.destroyed);
    const goneIds = new Set(gone.map((g) => g.id));
    const remaining = [this.player, ...this.actors];
    for (const a of remaining) {
      for (const key of Object.keys(a.bindings)) a.bindings[key] = a.bindings[key].filter((b) => !goneIds.has(b.actor));
    }
    for (const g of gone) {
      this.timers.dropOwner(g.id);
      endOverlapsWith(g, remaining, this.fire);
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
    this.record.keys.add(key);
    for (const a of this.scripted()) {
      if (a.receivesInput) this.fire(a, (n) => n.def === 'event.inputKey' && n.config.key === key, pin);
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
    this.record.clicked.add(a.id);
    this.fire(a, (n) => n.def === 'event.actorOnClicked', 'then');
    this.runPhases();
  }

  teleportPlayer(x: number, y: number): void {
    this.player.x = x;
    this.player.y = y;
  }

  // ------------------------------------------------------------ WorldApi

  random(): number {
    // Mulberry32: deterministic, so lesson checks are reproducible.
    this.rng += 0x6d2b79f5;
    let t = this.rng;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  print(actor: ActorRT, text: string, opts: PrintOptions): void {
    this.journal.print(this.time, actor.id, actor.objectName, text, opts);
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

  /** The actor's class with everything it inherits. */
  classOf(actor: ActorRT): BlueprintClass | undefined {
    const cls = actor.classId ? findClass(this.project, actor.classId) : undefined;
    return cls && inheritedView(cls, this.project, true);
  }

  /** Is the actor of class `classId`, or of a child of it? */
  isA(actor: ActorRT, classId: unknown): boolean {
    return isA(this.project, actor.classId, classId);
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
    const { n, name } = this.objectName(cls);
    const a = createActor(`spawn_${nextId()}`, `${cls.name}${n + 1}`, name, inheritedView(cls, this.project, true), {});
    a.x = x;
    a.y = y;
    a.yaw = yaw;
    this.actors.push(a);
    this.markClass(cls.id);
    return a;
  }

  lineTrace(start: { x: number; y: number }, end: { x: number; y: number }, channel: number, ignore: Set<string>): TraceHit | undefined {
    return lineTrace(this.allActors(), start, end, channel, ignore);
  }

  debugLine(line: DebugLine): void {
    this.debugLines.push(line);
    if (this.debugLines.length > 200) this.debugLines.shift();
  }

  setTimer(event: ObjRef, time: number, looping: boolean): RValue {
    return event.ref === 'delegate' ? this.timers.set(event, time, looping) : null;
  }

  timer(handle: RValue): TimerRT | undefined {
    return this.timers.get(handle);
  }

  clearTimer(handle: RValue): void {
    this.timers.clear(handle);
  }

  destroy(actor: ActorRT): void {
    if (actor.isPlayer) {
      this.runtimeError('Destroy Actor : le joueur ne peut pas être détruit dans cette version.');
      return;
    }
    actor.destroyed = true;
    actor.latent = {};
    this.record.destroyed.add(actor.id);
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
    this.record.ran(site.graphId, site.nodeId);
    this.trace.push({
      id: nextId(),
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
    this.record.muted = on;
  }

  note(code: NoteCode, detail?: string): void {
    if (this.site) this.record.note(this.site.graphId, this.site.nodeId, code, detail);
  }

  varRead(actor: ActorRT, variable: string): void {
    this.record.read(actor.id, variable);
  }

  varWritten(actor: ActorRT, variable: string): void {
    if (this.site) this.record.wrote(this.site.graphId, this.site.nodeId, actor.id, variable);
  }

  runtimeError(message: string): void {
    if (this.muted) return;
    const s = this.site;
    const where = s ? ` Node: ${s.nodeTitle} Graph: ${s.graphName} Blueprint: ${s.className}` : '';
    const explain = explainRuntime(message, s && { project: this.project, graphId: s.graphId, nodeId: s.nodeId });
    this.journal.error(this.time, `Blueprint Runtime Error: "${message}".${where}`, explain);
  }
}
