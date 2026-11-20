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
import { COMPONENT_CLASS, findClass, isPlaceableParent, type BlueprintClass, type NodeInstance, type Level, type Project, type SavedGame, levelOf } from '../model/project';
import { BUILTIN_HIERARCHY, makeHierarchy } from '../types/pins';
import type { Value } from '../types/values';
import { copyValue } from './values';
import type { PrintOptions } from './behaviors/types';
import { createActor, createController, createInputSubsystem, createPlayer } from './actorFactory';
import { Interpreter, type InterpreterHost, type NodeSite, type PauseInfo, type PinWatch } from './interpreter';
import { EnhancedInput } from './enhancedInput';
import { buildInputStack, keyKept, sendAction, sendKey } from './inputStack';
import { Journal, nextId, type ScreenMessage, type SimLogEntry } from './journal';
import { RunRecord, type NoteCode } from './runRecord';
import { movePlayer, type BlockingHit } from './movement';
import { endOverlapsWith, updateOverlaps, type Broadcast, type Fire } from './overlaps';
import { TimerSet } from './timers';
import { lineTrace, type DebugLine, type TraceHit } from './trace';
import { Umg, type UmgEvent } from '../umg/runtime';
import { type InputMode, TouchInput, type TouchOutcome } from '../umg/touchInput';
import { isRef, type ActorRT, type ComponentRT, type ObjRef, type RValue, type TimerRT } from './world';

export type { ScreenMessage, SimLogEntry, SimLogLevel } from './journal';

export const STEP = 1 / 60;

export type InputKey = 'E' | 'F' | 'SpaceBar';

export type { InputMode, TouchOutcome } from '../umg/touchInput';

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

/** EEndPlayReason::LevelTransition (the order of the enum in core/types/enums.ts). */
const LEVEL_TRANSITION = 1;

export interface SimulationOptions {
  seed?: number;
  breakpoints?: Set<string>;
  order?: ActorOrder;
  slots?: Record<string, SavedGame>;
  /** Told each time a node writes or deletes a slot, so that it can be kept at once. */
  onSlotsChanged?: () => void;
  /** The level to play (a level id): the one open in the editor if unset, as UE's Play In Editor. */
  levelId?: string;
  /** The Output Log and on-screen messages: a Game passes its own, kept from one level to the next. */
  journal?: Journal;
}

/** What Open Level asked for: done by the Game at the start of the next frame (core/runtime/game.ts). */
export interface TravelRequest {
  level: string;
  absolute: boolean;
  options: string;
}

export class Simulation implements InterpreterHost {
  time = 0;
  frame = 0;
  actors: ActorRT[] = [];
  readonly player: ActorRT;
  /** The level being played. */
  readonly level: Level;
  /** The player's PlayerController (a Blueprint when Player Controller Class is set), and its Enhanced Input subsystem. */
  readonly controller: ActorRT;
  private readonly subsystem = createInputSubsystem();
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
  /** Objects that are not actors (SaveGame): never in the level, found by reference only. */
  readonly objects: ActorRT[] = [];
  /**
   * Save slots, by "slot|user index": written by Save Game to Slot, kept
   * after the game. Play passes the project's own, so they outlive Stop.
   */
  readonly slots: Record<string, SavedGame>;
  /** Did a node write or delete a slot during this game? */
  slotsChanged = false;
  /** Enhanced Input: active Mapping Contexts and the state of each action. */
  readonly enhancedInput = new EnhancedInput();
  /**
   * Set Game Paused: game time stops (no Tick, latent actions, timers or
   * movement), input only reaches the actions marked Trigger when Paused.
   * Not the debugger's pause (`paused`), which stops everything.
   */
  gamePaused = false;
  /** UMG: the widget objects, the viewport, their life cycle and Bindings. */
  readonly umg: Umg;
  /**
   * Set Input Mode: Game Only (UE's start: touches on widgets are not
   * theirs), UI Only (the game gets nothing: no key, no action, no
   * joystick), Game and UI (both).
   */
  inputMode: InputMode = 'GameOnly';
  /** The Player Controller's Show Mouse Cursor. */
  showMouseCursor = false;
  /** Touches on the widgets' buttons (core/umg/touchInput). */
  private readonly touch: TouchInput;
  private readonly onSlotsChanged?: () => void;

  private readonly journal: Journal;
  /** Open Level was called: the level asked for (the last call wins, as UE's SetClientTravel). */
  travel?: TravelRequest;
  /** The world is ending for Open Level (Destruct, End Play): no new frame, no new travel. */
  private ending = false;
  /** End Play has run everywhere: the Game can make the next world. */
  ended = false;
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
  /**
   * An actor's own Event Dispatchers (On Actor Begin Overlap…), after its
   * matching event, as UE broadcasts them: the events bound to it run, with
   * Overlapped Actor and Other Actor.
   */
  private readonly broadcast: Broadcast = (actor, dispatcher, otherId) => {
    for (const b of [...(actor.bindings[dispatcher] ?? [])]) {
      const listener = this.findActor(b.actor);
      if (listener && !listener.destroyed) {
        this.interp.fire(listener, (n) => n.id === b.node, 'then', { overlapped: { ref: 'actor', id: actor.id }, other: { ref: 'actor', id: otherId } });
      }
    }
  };

  constructor(
    readonly project: Project,
    opts: SimulationOptions = {},
  ) {
    this.journal = opts.journal ?? new Journal();
    this.level = project.levels.find((l) => l.id === opts.levelId) ?? levelOf(project);
    this.rng = opts.seed ?? 12345;
    this.slots = opts.slots ?? {};
    this.onSlotsChanged = opts.onSlotsChanged;
    this.interp = new Interpreter(project, this, opts.breakpoints);
    this.umg = new Umg({
      project,
      objects: this.objects,
      objectById: (id) => this.findActor(id),
      newObjectName: (cls) => this.objectName(cls).name,
      warning: (text) => this.journal.warning(this.time, text),
      evaluate: (obj, graphId) => this.interp.evaluate(obj, graphId),
      classOf: (obj) => (obj.classId ? findClass(project, obj.classId) : undefined),
      carrier: (ref) => {
        const a = this.findActor(ref.actor);
        const alive = !!a && !a.destroyed;
        const c = alive ? a.components.find((k) => k.id === ref.id) : undefined;
        return { alive, visible: alive && !a.hidden && !!c?.props.visible };
      },
      drawSize: (ref) => {
        const c = this.findActor(ref.actor)?.components.find((k) => k.id === ref.id);
        return { w: Math.max(1, c?.props.sizeX ?? 500), h: Math.max(1, c?.props.sizeY ?? 500) };
      },
    });
    this.touch = new TouchInput({
      umg: this.umg,
      inputMode: () => this.inputMode,
      stopped: () => !!this.paused,
      ensureStarted: () => {
        if (!this.started) this.start();
      },
      record: this.record,
      findActor: (id) => this.findActor(id),
      fireButton: (obj, id, event) => this.fire(obj, (n) => n.def === 'event.widgetButton' && n.config.widget === id && n.config.event === event, 'then'),
      run: () => this.runPhases(),
      step: () => this.step(),
    });
    const ps = this.level.playerStart;
    const pawn = project.playerClassId ? findClass(project, project.playerClassId) : undefined;
    this.player = createPlayer(pawn && inheritedView(pawn, project, true));
    this.player.x = ps.x;
    this.player.y = ps.y;
    this.player.yaw = ps.yaw;
    if (this.player.classId) this.counters.set(this.player.classId, 1);
    const pcClass = project.playerControllerClassId ? findClass(project, project.playerControllerClassId) : undefined;
    this.controller = createController(pcClass && inheritedView(pcClass, project, true));
    if (this.controller.classId) this.counters.set(this.controller.classId, 1);
    this.spawnLevel();
    this.attachComponents(this.player);
    this.attachComponents(this.controller);
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
    for (const la of this.level.actors) {
      const cls = findClass(this.project, la.classId);
      // A SaveGame is not an actor, a PlayerController is made by the game: neither is placed.
      if (!cls || !isPlaceableParent(cls.parent)) continue;
      const a = createActor(la.id, la.name, this.objectName(cls).name, inheritedView(cls, this.project, true), la.overrides);
      a.x = la.x;
      a.y = la.y;
      a.yaw = la.yaw;
      this.actors.push(a);
      this.markClass(cls.id);
      this.attachComponents(a, la.componentOverrides);
    }
    if (this.player.classId) this.markClass(this.player.classId);
    if (this.controller.classId) this.markClass(this.controller.classId);
  }

  /**
   * The actor's Actor Components made in Blueprint: one object each, which
   * runs the component's graphs with its own variables (Self is the
   * component, Get Owner the actor). Its Instance Editable variables take the
   * values set in the actor's Blueprint, then those set on this placed actor.
   */
  private attachComponents(a: ActorRT, overrides: Record<string, Record<string, Value>> = {}): void {
    const cls = this.classOf(a);
    for (const c of cls?.components ?? []) {
      if (c.kind !== 'ActorComponent' || !c.classId) continue;
      const ccls = findClass(this.project, c.classId);
      if (ccls?.parent !== 'ActorComponent') continue;
      const values = { ...(c.values ?? {}), ...(overrides[c.id] ?? {}) };
      const obj = createActor(`cmp_${nextId()}`, `${c.name} (${a.label})`, `${a.objectName}.${c.name}`, inheritedView(ccls, this.project, true), values);
      obj.owner = a.id;
      obj.componentId = c.id;
      this.objects.push(obj);
      a.logic ??= {};
      a.logic[c.id] = obj.id;
      this.markClass(ccls.id);
    }
  }

  /**
   * The actor's Widget Components make their widget (V7.42), as UE's
   * UWidgetComponent::BeginPlay calls InitWidget: one object per actor,
   * owned by the player. Returns the events On Initialized to run. The
   * widget comes on the screen at the next frame.
   */
  initWidgetComponents(a: ActorRT): UmgEvent[] {
    const events: UmgEvent[] = [];
    for (const c of a.components) {
      if (c.kind !== 'Widget' || !c.classId || c.widget) continue;
      const made = this.umg.attach(c.classId, this.controller.id, { actor: a.id, id: c.id });
      if (!made) continue;
      c.widget = made.obj.id;
      events.push(...made.events);
    }
    return events;
  }

  /** The objects of the actor's Actor Components, still alive, in the order of its Components panel. */
  componentsOf(actor: ActorRT): ActorRT[] {
    const out: ActorRT[] = [];
    for (const id of Object.values(actor.logic ?? {})) {
      const o = this.objects.find((x) => x.id === id);
      if (o && !o.destroyed) out.push(o);
    }
    return out;
  }

  /** An actor of this class exists: so does one of each class it inherits from (diagnostics). */
  private markClass(classId: string): void {
    const cls = findClass(this.project, classId);
    for (const c of cls ? lineage(this.project, cls) : []) this.record.classes.add(c.id);
  }

  /** Fix the event order of the starting actors (the level, then the controller and the player). */
  private rankActors(order: ActorOrder): void {
    const ids = [...this.actors.map((a) => a.id), this.controller.id, this.player.id];
    if (order === 'reversed') ids.reverse();
    if (order === 'shuffled') {
      for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(this.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }
    }
    for (const [i, id] of ids.entries()) this.rank.set(id, i);
  }

  /**
   * Objects that run Blueprint logic, in event order: each actor (the
   * controller and the player only if they are Blueprints), its Actor
   * Components just before it. UE begins play the same way: an actor's
   * components first, then the actor's own Event BeginPlay.
   */
  private scripted(): ActorRT[] {
    const list = [...this.actors.filter((a) => !a.destroyed), ...[this.controller, this.player].filter((a) => a.classId)];
    const rank = (a: ActorRT) => this.rank.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    return list.sort((a, b) => rank(a) - rank(b)).flatMap((a) => [...this.componentsOf(a), a]);
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
    for (const a of this.scripted()) {
      // An actor's Widget Components make their widget as they begin play, before the actor's own Event BeginPlay.
      if (!a.owner) for (const e of this.initWidgetComponents(a)) this.fire(e.obj, (n) => n.def === e.def, 'then', e.outputs);
      this.fire(a, isBeginPlay, 'then');
    }
    this.runPhases();
  }

  /** Advance by real elapsed time, in fixed steps (at most 0.25 s at once). */
  advance(seconds: number): void {
    if (this.paused) return;
    this.accumulator += Math.min(seconds, 0.25);
    // After Open Level, no more frame of this world: the Game travels first.
    while (this.accumulator >= STEP && !this.paused && !this.travel && !this.ending) {
      this.accumulator -= STEP;
      this.step();
    }
  }

  /** One frame: move, overlaps, Tick, latent actions and timers, cleanup. */
  step(dt = STEP): void {
    if (!this.started) this.start();
    if (this.paused || this.ending) return;
    this.deltaSeconds = dt;
    if (this.gamePaused) {
      // UE's paused world: only input is processed, game time stands still.
      this.phases.push(
        () => this.fireActions(dt),
        // Widgets keep ticking while the game is paused (a pause menu must answer).
        ...this.widgetPhases(dt),
        () => {
          this.frame++;
          this.removeDestroyed();
        },
      );
      this.runPhases();
      return;
    }
    this.phases.push(
      // The player's input first, as UE's PlayerController ticks before the pawn moves.
      () => this.fireActions(dt),
      () => {
        // UI Only: the joystick is input too, and the game gets none.
        const move = this.inputMode === 'UIOnly' ? { x: 0, y: 0 } : this.move;
        for (const h of movePlayer(this.player, move, this.actors, dt)) this.fireHit(h);
      },
      () => {
        updateOverlaps([this.player, ...this.actors.filter((a) => !a.destroyed)], this.fire, this.broadcast);
      },
      () => this.fireAll((n) => n.def === 'event.tick', 'then', { delta: dt }),
      () => {
        for (const a of this.scripted()) {
          this.interp.tickLatents(a, dt);
          this.interp.tickTimelines(a, dt);
        }
        // A widget's Delay runs on the world's time too: it waits while the game is paused.
        for (const o of this.umg.widgetObjects()) this.interp.tickLatents(o, dt);
        this.timers.tick(dt, (t) => {
          const owner = this.findActor(t.actor);
          if (owner && !owner.destroyed) this.fire(owner, (n) => n.id === t.node, 'then');
        });
      },
      ...this.widgetPhases(dt),
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

  /**
   * UMG after the world: the Event Tick of each widget painted on the
   * screen, then the Bindings, polled when Slate paints the frame.
   */
  private widgetPhases(dt: number): (() => void)[] {
    return [
      // Widget Components: the widget of an actor that began play comes on the screen; the one of a destroyed actor leaves it.
      () => {
        for (const e of this.umg.syncComponents()) this.fire(e.obj, (n) => n.def === e.def, 'then', e.outputs);
      },
      () => {
        // Only painted widgets tick: a Collapsed or Hidden one stops, as in UE.
        for (const o of this.umg.ticking()) this.fire(o, (n) => n.def === 'event.widgetTick', 'then', { delta: dt });
      },
      () => this.umg.pollBindings(),
    ];
  }

  /**
   * The Designer's preview of a Widget Blueprint: a widget object made as
   * UE's Designer makes one (no On Initialized, no Construct), then its Event
   * Pre Construct with Is Design Time true, inner widgets first.
   */
  designTime(classId: string): ActorRT | null {
    const made = this.umg.create(classId, null);
    if (!made) return null;
    for (const o of this.umg.subtree(made.obj).reverse()) this.fire(o, (n) => n.def === 'event.preConstruct', 'then', { designTime: true });
    this.interp.drain(true);
    return made.obj;
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
    // An actor's Actor Components go with it.
    const goneObjects = this.objects.filter((o) => o.destroyed && o.owner);
    for (let i = this.objects.length - 1; i >= 0; i--) if (this.objects[i].destroyed && this.objects[i].owner) this.objects.splice(i, 1);
    const goneIds = new Set([...gone, ...goneObjects].map((g) => g.id));
    const remaining = [this.player, ...this.actors];
    for (const a of [...remaining, this.controller, ...this.objects]) {
      for (const key of Object.keys(a.bindings)) a.bindings[key] = a.bindings[key].filter((b) => !goneIds.has(b.actor));
    }
    for (const o of goneObjects) this.timers.dropOwner(o.id);
    for (const g of gone) {
      this.timers.dropOwner(g.id);
      endOverlapsWith(g, remaining, this.fire, this.broadcast);
    }
  }

  // -------------------------------------------------------------- travel

  /** Open Level (by Name): remembered until the next frame, when the Game travels. */
  openLevel(level: string, absolute: boolean, options: string): void {
    if (this.ending) return;
    this.travel = { level, absolute, options };
  }

  /** Get Current Level Name. */
  currentLevelName(): string {
    return this.level.name;
  }

  /** No level of that name: the travel fails, as UE logs it, and the game goes on in this level. */
  travelFailed(name: string): void {
    this.travel = undefined;
    this.journal.error(
      this.time,
      `Travel Failure: PackageMissing, Failed to load package '/Game/${name}'. Open Level : aucun niveau ne s’appelle « ${name} » dans ce projet (Content Drawer). La partie reste dans ${this.level.name}.`,
    );
  }

  /**
   * The world ends for Open Level: the widgets leave the screen (Event
   * Destruct), then each actor gets Event End Play with Level Transition,
   * then its Actor Components, the Player Controller and the player
   * included. A breakpoint may stop it: `ended` is set once all has run.
   * Timers, Delays and Timelines go with the world.
   */
  endForTravel(): void {
    if (this.ending) return;
    this.ending = true;
    const isEndPlay = (n: NodeInstance) => n.def === 'event.endPlay';
    this.phases.push(
      () => {
        for (const e of this.umg.tearDown()) this.fire(e.obj, (n) => n.def === e.def, 'then', e.outputs);
      },
      () => {
        for (const a of this.scripted().filter((o) => !o.owner)) {
          this.fire(a, isEndPlay, 'then', { reason: LEVEL_TRANSITION });
          for (const c of this.componentsOf(a)) this.fire(c, isEndPlay, 'then', { reason: LEVEL_TRANSITION });
        }
      },
      () => {
        this.ended = true;
      },
    );
    this.runPhases();
  }

  /** A line of the engine in the Output Log (LoadMap…). */
  engineLog(text: string): void {
    this.journal.engine(this.time, text);
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
    this.enhancedInput.press(key);
    this.dispatchKey(key, 'pressed');
  }

  releaseKey(key: InputKey): void {
    this.enhancedInput.release(key);
    this.dispatchKey(key, 'released');
  }

  /**
   * Enhanced Input events of this frame, each sent to every actor of the
   * input stack that binds the action, from the top: an action event has no
   * Consume Input in UE.
   */
  private fireActions(dt: number): void {
    for (const f of this.enhancedInput.process(this.project, dt)) {
      // In UI Only, the Player Controller gets no input at all: the widgets have it.
      if (this.inputMode === 'UIOnly') {
        this.record.uiOnlyBlocked.add(f.action);
        continue;
      }
      // While paused, only the actions marked Trigger when Paused reach the graphs (UE's bTriggerWhenPaused).
      if (this.gamePaused && !this.project.inputActions?.find((a) => a.id === f.action)?.triggerWhenPaused) {
        this.record.pausedActions.add(f.action);
        continue;
      }
      sendAction(this.inputStack(), this.interp, f.action, f.event, { value: f.value, elapsed: f.elapsed, triggeredSeconds: f.triggeredSeconds });
    }
  }

  addMappingContext(id: string, priority: number, ignorePressed = true): void {
    this.enhancedInput.addContext(id, priority, this.project, ignorePressed);
  }

  removeMappingContext(id: string, ignorePressed = true): void {
    this.enhancedInput.removeContext(id, this.project, ignorePressed);
  }

  private dispatchKey(key: InputKey, pin: 'pressed' | 'released'): void {
    if (!this.started) this.start();
    if (this.paused) return;
    this.record.keys.add(key);
    // Key events do not execute while the game is paused (their Execute when Paused is off, UE's default).
    if (this.gamePaused) return;
    if (this.inputMode === 'UIOnly') {
      this.record.uiOnlyBlocked.add(key);
      return;
    }
    sendKey(this.inputStack(), this.interp, key, pin);
    this.runPhases();
  }

  /** UE's input stack, from the top (see inputStack.ts). */
  inputStack(): ActorRT[] {
    return buildInputStack(this.actors, this.controller, this.player);
  }

  /** When an actor keeps a key (Consume Input), the actors below it that bind it too. */
  keyKeptFrom(key: InputKey): { by: ActorRT; missed: ActorRT[] } | undefined {
    return keyKept(this.inputStack(), this.interp, key);
  }

  /** Actors with an input event that will not fire because input is off. */
  deafActors(key?: InputKey): ActorRT[] {
    return this.scripted().filter(
      (a) =>
        !a.receivesInput &&
        this.interp.hasEvent(a, (n) => (n.def === 'event.inputKey' && (!key || n.config.key === key)) || (!key && n.def === 'input.action')),
    );
  }

  click(actorId: string): void {
    const a = this.actors.find((x) => x.id === actorId);
    if (!a || this.paused) return;
    this.record.clicked.add(a.id);
    this.fire(a, (n) => n.def === 'event.actorOnClicked', 'then');
    this.runPhases();
  }

  // ------------------------------------------------------------- widgets

  /** Set Input Mode …; Flush Input releases every key. */
  setInputMode(mode: InputMode, flush = false): void {
    this.inputMode = mode;
    if (flush) this.enhancedInput.flush();
  }

  /** A finger goes down on the widgets (x, y on a screen `width` wide and 720 high): see core/umg/touchInput. */
  touchDown(x: number, y: number, width: number): TouchOutcome {
    return this.touch.down({ x, y, width });
  }

  /** The finger goes up: On Released, then On Clicked if it is still on the same Button. */
  touchUp(x: number, y: number, width: number): void {
    this.touch.up({ x, y, width });
  }

  /** A finger goes down inside a Widget Component's widget (its object id; x, y on its Draw Size). */
  touchDownOn(component: string, x: number, y: number): TouchOutcome {
    return this.touch.down({ x, y, component });
  }

  touchUpOn(component: string, x: number, y: number): void {
    this.touch.up({ x, y, component });
  }

  /** A lesson's scenario taps a Button by name (the nth of that name, top to bottom, with `nth`). */
  tapButton(widgetClass: string, button: string, nth?: number): TouchOutcome {
    return this.touch.tap(widgetClass, button, nth);
  }

  teleportPlayer(x: number, y: number): void {
    this.player.x = x;
    this.player.y = y;
  }

  // ------------------------------------------------------------ WorldApi

  setGamePaused(paused: boolean): void {
    this.gamePaused = paused;
  }

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

  /** An actor, a component's object or a SaveGame by id (destroyed ones included). */
  objectById(id: string): ActorRT | undefined {
    return this.findActor(id);
  }

  /**
   * What the debugger can watch for a class: its placed and spawned actors,
   * the controller and the player, the objects of its Actor Components and its widget objects.
   */
  instancesOf(classId: string): ActorRT[] {
    const all = [...this.actors, this.player, ...(this.controller.classId ? [this.controller] : []), ...this.objects.filter((o) => o.owner || o.widget)];
    return all.filter((a) => !a.destroyed && this.isA(a, classId));
  }

  private findActor(id: string): ActorRT | undefined {
    if (id === this.player.id) return this.player;
    if (id === this.controller.id) return this.controller;
    if (id === this.subsystem.id) return this.subsystem;
    return this.actors.find((a) => a.id === id) ?? this.objects.find((o) => o.id === id);
  }

  // ---------------------------------------------------------- save games

  createSaveGame(classId: string): ActorRT | null {
    const cls = findClass(this.project, classId);
    if (cls?.parent !== 'SaveGame') return null;
    const obj = createActor(`obj_${nextId()}`, '', this.objectName(cls).name, inheritedView(cls, this.project, true), {});
    obj.label = obj.objectName;
    this.objects.push(obj);
    return obj;
  }

  private static slotKey(slot: string, user: number): string {
    return `${slot}|${user}`;
  }

  saveGame(obj: ActorRT, slot: string, user: number): boolean {
    const cls = this.classOf(obj);
    if (!slot || !cls || cls.parent !== 'SaveGame') return false;
    const values: Record<string, Value> = {};
    for (const v of cls.variables) values[v.name] = copyValue(obj.vars[v.id]) as Value;
    this.slots[Simulation.slotKey(slot, user)] = { classId: cls.id, className: cls.name, values, savedAt: Math.round(this.time * 100) / 100 };
    this.slotsChanged = true;
    this.onSlotsChanged?.();
    return true;
  }

  loadGame(slot: string, user: number): ActorRT | null {
    const saved = this.slots[Simulation.slotKey(slot, user)];
    if (!saved) return null;
    const cls = findClass(this.project, saved.classId) ?? this.project.classes.find((c) => c.name === saved.className);
    const obj = cls ? this.createSaveGame(cls.id) : null;
    if (!obj) return null;
    // Properties are matched by name, as UE's serializer does: a renamed or removed variable is not restored.
    for (const v of this.classOf(obj)?.variables ?? []) if (v.name in saved.values) obj.vars[v.id] = copyValue(saved.values[v.name] as RValue);
    return obj;
  }

  saveExists(slot: string, user: number): boolean {
    return !!this.slots[Simulation.slotKey(slot, user)];
  }

  deleteSave(slot: string, user: number): boolean {
    const key = Simulation.slotKey(slot, user);
    if (!this.slots[key]) return false;
    delete this.slots[key];
    this.slotsChanged = true;
    this.onSlotsChanged?.();
    return true;
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

  /** Is the actor of class `classId`, or of a child of it? `classId` may be a native class (Cast To PlayerController). */
  isA(actor: ActorRT, classId: unknown): boolean {
    if (typeof classId === 'string' && classId in BUILTIN_HIERARCHY) return makeHierarchy().isA(actor.native, classId);
    return isA(this.project, actor.classId, classId);
  }

  playerController(): ActorRT {
    return this.controller;
  }

  inputSubsystem(): ActorRT {
    return this.subsystem;
  }

  ownerOf(c: ComponentRT): ActorRT | undefined {
    return [this.player, this.controller, ...this.actors].find((a) => a.components.includes(c));
  }

  /** The actor carrying an Actor Component's object (Get Owner), or null. */
  ownerActor(obj: ActorRT): ActorRT | null {
    const a = obj.owner ? this.findActor(obj.owner) : undefined;
    return a && !a.destroyed ? a : null;
  }

  /**
   * The actor's components of a class (Get Components by Class): its scene
   * components when the class is a native one (StaticMeshComponent…), then
   * its Actor Components made in Blueprint of that class or a child of it.
   */
  componentsByClass(actor: ActorRT, classId: unknown): RValue[] {
    if (typeof classId !== 'string' || !classId) return [];
    const out: RValue[] = [];
    if (classId in BUILTIN_HIERARCHY) {
      const h = makeHierarchy();
      for (const c of actor.components) if (h.isA(COMPONENT_CLASS[c.kind], classId)) out.push({ ref: 'component', actor: actor.id, id: c.id });
    }
    for (const o of this.componentsOf(actor)) if (this.isA(o, classId)) out.push({ ref: 'actor', id: o.id });
    return out;
  }

  allActors(): ActorRT[] {
    return [...this.actors.filter((a) => !a.destroyed), this.player];
  }

  spawn(classId: string, x: number, y: number, yaw: number): ActorRT | null {
    const cls = findClass(this.project, classId);
    if (!cls) return null;
    if (cls.parent === 'SaveGame') {
      this.runtimeError(`SpawnActor failed : ${cls.name} est un SaveGame, pas un acteur. Utilise Create Save Game Object.`);
      return null;
    }
    if (cls.parent === 'ActorComponent') {
      this.runtimeError(`SpawnActor : ${cls.name} est un Actor Component, pas un acteur. On l’ajoute dans les Components d’un acteur.`);
      return null;
    }
    if (!isPlaceableParent(cls.parent)) {
      this.runtimeError(`SpawnActor : ${cls.name} est un Player Controller. Le jeu le crée lui-même (Player Controller Class) : on ne le fait pas apparaître.`);
      return null;
    }
    const { n, name } = this.objectName(cls);
    const a = createActor(`spawn_${nextId()}`, `${cls.name}${n + 1}`, name, inheritedView(cls, this.project, true), {});
    a.x = x;
    a.y = y;
    a.yaw = yaw;
    this.actors.push(a);
    this.markClass(cls.id);
    this.attachComponents(a);
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
    if (actor.id === this.controller.id) {
      this.runtimeError('Destroy Actor : le Player Controller ne peut pas être détruit dans cette version.');
      return;
    }
    // Its Actor Components go with it, in the same chain of execution.
    for (const o of [actor, ...this.componentsOf(actor)]) {
      o.destroyed = true;
      o.destroyedInRun = this.interp.run;
      o.latent = {};
    }
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
    this.journal.error(this.time, `Blueprint Runtime Error: "${message}".${where}`, explain, s && { graphId: s.graphId, nodeId: s.nodeId });
  }
}
