/**
 * What a node *does* at runtime. Each behaviour is registered under the id
 * of its NodeDefinition. Impure nodes implement `exec` and return the exec
 * output pins to follow, in order; pure nodes implement `pure` and return
 * their output values.
 */
import type { BlueprintClass, NodeInstance, Project } from '../../model/project';
import type { NodeContext } from '../../nodes/definition';
import type { NoteCode } from '../runRecord';
import type { ActorRT, ComponentRT, ObjRef, RValue, TimerRT } from '../world';

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
}

export interface Behavior {
  exec?: (cx: ExecCx) => string[];
  pure?: (cx: ValueCx) => Record<string, RValue>;
}
