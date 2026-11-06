/**
 * What a node *does* at runtime. Each behaviour is registered under the id
 * of its NodeDefinition. Impure nodes implement `exec` and return the exec
 * output pins to follow, in order; pure nodes implement `pure` and return
 * their output values.
 */
import type { NodeInstance } from '../../model/project';
import type { ActorRT, ComponentRT, RValue } from '../world';

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
  ownerOf(c: ComponentRT): ActorRT | undefined;
  destroy(actor: ActorRT): void;
  displayName(ref: RValue): string;
}

export interface ValueCx {
  readonly actor: ActorRT;
  readonly node: NodeInstance;
  readonly world: WorldApi;
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
}

export interface Behavior {
  exec?: (cx: ExecCx) => string[];
  pure?: (cx: ValueCx) => Record<string, RValue>;
}
