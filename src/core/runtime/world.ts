/**
 * Runtime state of a simulation: actors spawned from the level, their
 * components, variables and per-node memory. Units are UE's: centimetres
 * and degrees, X to the right and Y downwards on screen (top view).
 */
import type { ComponentKind, ComponentProps } from '../model/project';
import type { Value } from '../types/values';

/**
 * A reference to an actor, one of its components, or one of its events
 * (the red "delegate" pin of a Custom Event). `null` is None.
 */
export type ObjRef =
  | { ref: 'actor'; id: string }
  | { ref: 'component'; actor: string; id: string }
  | { ref: 'delegate'; actor: string; node: string };

export type RValue = Exclude<Value, Value[]> | ObjRef | RValue[];

export function isRef(v: unknown): v is ObjRef {
  return typeof v === 'object' && v !== null && 'ref' in (v as object);
}

export interface ComponentRT {
  id: string;
  name: string;
  kind: ComponentKind;
  parent?: string;
  /** Live properties; start as a copy of the class defaults. */
  props: ComponentProps;
}

/** An event bound to an Event Dispatcher: which actor, which event node. */
export interface Binding {
  actor: string;
  node: string;
}

export interface LatentAction {
  graphId: string;
  remaining: number;
  outPin: string;
}

export interface ActorRT {
  id: string;
  /** Level label, e.g. "BP_Lampe2". */
  label: string;
  /** UE-style object name used in logs, e.g. "BP_Lampe_C_1". */
  objectName: string;
  classId?: string;
  className: string;
  isPlayer: boolean;
  x: number;
  y: number;
  yaw: number;
  components: ComponentRT[];
  vars: Record<string, RValue>;
  /** Last values written by impure/event nodes, per node then pin. */
  outputs: Record<string, Record<string, RValue>>;
  /** Memory of stateful nodes (DoOnce, FlipFlop, Gate, loops…). */
  nodeState: Record<string, unknown>;
  latent: Record<string, LatentAction>;
  /** Other actors currently overlapping, and component-level pairs. */
  overlaps: Set<string>;
  compOverlaps: Set<string>;
  /** Event Dispatcher id → events bound to it, in binding order. */
  bindings: Record<string, Binding[]>;
  receivesInput: boolean;
  destroyed: boolean;
}

export interface Transform2D {
  x: number;
  y: number;
  yaw: number;
}

const DEG = Math.PI / 180;

/** World transform of a component: actor transform composed with the parent chain. */
export function componentTransform(actor: ActorRT, comp: ComponentRT): Transform2D {
  const chain: ComponentRT[] = [];
  let cur: ComponentRT | undefined = comp;
  for (let guard = 0; cur && guard < 32; guard++) {
    chain.unshift(cur);
    const parentId: string | undefined = cur.parent;
    cur = parentId ? actor.components.find((c) => c.id === parentId) : undefined;
  }
  let t: Transform2D = { x: actor.x, y: actor.y, yaw: actor.yaw };
  for (const c of chain) {
    const r = t.yaw * DEG;
    t = {
      x: t.x + c.props.x * Math.cos(r) - c.props.y * Math.sin(r),
      y: t.y + c.props.x * Math.sin(r) + c.props.y * Math.cos(r),
      yaw: t.yaw + c.props.yaw,
    };
  }
  return t;
}

/** Player capsule radius and speed: UE's default Character values. */
export const PLAYER_RADIUS = 34;
export const PLAYER_SPEED = 600;
