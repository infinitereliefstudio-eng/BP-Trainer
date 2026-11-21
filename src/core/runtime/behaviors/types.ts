/**
 * What a node *does* at runtime. Each behaviour is registered under the id
 * of its NodeDefinition. Impure nodes implement `exec` and return the exec
 * output pins to follow, in order; pure nodes implement `pure` and return
 * their output values.
 */
import type { BlueprintClass, NodeInstance, Project } from '../../model/project';
import type { NodeContext } from '../../nodes/definition';
import type { NoteCode } from '../runRecord';
import type { DebugLine, TraceHit } from '../trace';
import type { Umg, UmgEvent } from '../../umg/runtime';
import type { ActorRT, ComponentRT, ObjRef, RValue, TimelineRT, TimerRT } from '../world';

/** Entry pin used when a node asked to be resumed (loops). */
export const RESUME = '__resume';

export interface PrintOptions {
  toScreen: boolean;
  toLog: boolean;
  duration: number;
}

/** The part of the simulation a node may touch. */
export interface WorldApi {
  readonly time: number;
  /** Duration of the frame being played (Get World Delta Seconds). */
  readonly deltaSeconds: number;
  /** First thing blocking `channel` between two points, skipping the actors of `ignore`. */
  lineTrace(start: { x: number; y: number }, end: { x: number; y: number }, channel: number, ignore: Set<string>): TraceHit | undefined;
  /** Keep a trace's debug line on screen. */
  debugLine(line: DebugLine): void;
  random(): number;
  print(actor: ActorRT, text: string, opts: PrintOptions): void;
  /** Resolve a reference; logs "Accessed None" and returns null when empty. */
  component(ref: RValue, pinName: string): ComponentRT | null;
  actor(ref: RValue, pinName: string): ActorRT | null;
  /** Resolve without logging: interface messages and Is Valid accept None. */
  tryActor(ref: RValue): ActorRT | null;
  isValid(ref: RValue): boolean;
  readonly project: Project;
  classOf(actor: ActorRT): BlueprintClass | undefined;
  /** Is the actor of this class, or of a Blueprint that inherits from it? */
  isA(actor: ActorRT, classId: unknown): boolean;
  ownerOf(c: ComponentRT): ActorRT | undefined;
  /** The objects of an actor's Actor Components made in Blueprint, alive, in Components order. */
  componentsOf(actor: ActorRT): ActorRT[];
  /** The actor's Widget Components make their widget (UE's InitWidget): the events On Initialized to run, before its BeginPlay. */
  initWidgetComponents(actor: ActorRT): UmgEvent[];
  /** The actor carrying an Actor Component's object (Get Owner), or null. */
  ownerActor(obj: ActorRT): ActorRT | null;
  /** Get Components by Class: the actor's components of that class (a Blueprint id or a native class name). */
  componentsByClass(actor: ActorRT, classId: unknown): RValue[];
  destroy(actor: ActorRT): void;
  displayName(ref: RValue): string;
  /** Log a Blueprint Runtime Error at the current node. */
  runtimeError(message: string): void;
  /** Every live actor, the player included, in level order. */
  allActors(): ActorRT[];
  /** Spawn an actor of a Blueprint class; BeginPlay runs at once. */
  spawn(classId: string, x: number, y: number, yaw: number): ActorRT | null;
  /** Set Timer by Event: returns the handle, or null for Time <= 0. */
  setTimer(event: ObjRef, time: number, looping: boolean): RValue;
  /** The timer behind a handle, if it is still running. */
  timer(handle: RValue): TimerRT | undefined;
  clearTimer(handle: RValue): void;
  /** Record a silent event at the current node (a Delay ignoring a call…), for diagnostics. */
  note(code: NoteCode, detail?: string): void;
  /** A Blueprint read, or a Set on another Blueprint wrote, a variable of `actor`. */
  varRead(actor: ActorRT, variable: string): void;
  varWritten(actor: ActorRT, variable: string): void;
  /** A new SaveGame object (not an actor: never in the level), or null if the class is not a SaveGame. */
  createSaveGame(classId: string): ActorRT | null;
  /** Save Game to Slot: a copy of the object's variables, by name. False for an empty slot name. */
  saveGame(obj: ActorRT, slot: string, user: number): boolean;
  /** Load Game from Slot: a new object from what was saved, or null. */
  loadGame(slot: string, user: number): ActorRT | null;
  saveExists(slot: string, user: number): boolean;
  deleteSave(slot: string, user: number): boolean;
  /**
   * Enhanced Input: activate a Mapping Context for the player, or deactivate
   * it. `ignorePressed`: UE's Ignore All Pressed Keys Until Release (default on).
   */
  addMappingContext(id: string, priority: number, ignorePressed?: boolean): void;
  removeMappingContext(id: string, ignorePressed?: boolean): void;
  /** The player's PlayerController, always there while the game runs. */
  playerController(): ActorRT;
  /** The player's Enhanced Input Local Player Subsystem (an object, not an actor). */
  inputSubsystem(): ActorRT;
  /** Set Game Paused: game time stops, input only reaches the actions marked Trigger when Paused. */
  readonly gamePaused: boolean;
  setGamePaused(paused: boolean): void;
  /** UMG: widget objects, the viewport, their properties. */
  readonly umg: Umg;
  /** Set Input Mode … on the Player Controller (Flush Input releases every key). */
  setInputMode(mode: 'GameOnly' | 'UIOnly' | 'GameAndUI', flush?: boolean): void;
  /** The Player Controller's Show Mouse Cursor. */
  showMouseCursor: boolean;
  /** Open Level (by Name): the travel is done at the start of the next frame (core/runtime/game.ts). */
  openLevel(level: string, absolute: boolean, options: string): void;
  /** The name of the level being played (Get Current Level Name, without prefix). */
  currentLevelName(): string;
  /** The GameMode of this world (Get Game Mode). */
  readonly gameMode: ActorRT;
  /** The GameInstance of the game (Get Game Instance). */
  readonly gameInstance: ActorRT;
  /** Quit Game: the game closes at the start of the next frame (core/runtime/game.ts). */
  quitGame(): void;
}

export interface ValueCx {
  readonly actor: ActorRT;
  readonly node: NodeInstance;
  readonly world: WorldApi;
  readonly ctx: NodeContext;
  in(pin: string): RValue;
  num(pin: string): number;
  bool(pin: string): boolean;
  str(pin: string): string;
}

export interface ExecCx extends ValueCx {
  /** Exec input pin that triggered this run, or RESUME. */
  readonly entry: string;
  out(pin: string, value: RValue): void;
  /** Per-instance memory of this node, created on first use. */
  state<T extends object>(init: () => T): T;
  /** Run this node again (entry RESUME) after the chain it starts. */
  resume(): void;
  latentActive(): boolean;
  /** Start (or restart) this node's latent action. */
  startLatent(seconds: number, outPin: string): void;
  /** Values of every data input except Target: the parameters of a call. */
  params(): Record<string, RValue>;
  /**
   * Run event nodes of `target` that match, right after this node and
   * before its outputs continue (a synchronous call). Returns how many ran.
   */
  callEvents(target: ActorRT, match: (n: NodeInstance) => boolean, outputs: Record<string, RValue>): number;
  /** Run a function graph of `target` to its end; its outputs become this node's. */
  callFunction(target: ActorRT, graphId: string, params: Record<string, RValue>, virtual?: boolean): void;
  /** "Parent: Event": run the parent class's version of an overridden event, on this actor. */
  callParentEvent(eventKey: string, outputs: Record<string, RValue>): number;
  /**
   * Write through a pass-by-reference input (Increment Int, Clear and
   * Invalidate Timer…): the variable wired into `pin` gets `value`.
   * Returns false when the pin is not wired to a variable.
   */
  writeRef(pin: string, value: RValue): boolean;
  /** Playback state of this Timeline node on this actor. */
  timeline(): TimelineRT;
  /** Run the Construction Script of `target` right after this node (Spawn Actor). */
  callConstruction(target: ActorRT): void;
  /** Write a Local Variable of the function call this node runs in. */
  setLocal(id: string, value: RValue): void;
}

export interface Behavior {
  exec?: (cx: ExecCx) => string[];
  pure?: (cx: ValueCx) => Record<string, RValue>;
}
