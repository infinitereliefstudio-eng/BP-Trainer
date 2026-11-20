/**
 * Runtime state of a simulation: actors spawned from the level, their
 * components, variables and per-node memory. Units are UE's: centimetres
 * and degrees, X to the right and Y downwards on screen (top view).
 */
import type { ComponentKind, ComponentProps } from '../model/project';
import type { WidgetProps } from '../model/widgets';
import type { Value } from '../types/values';

/**
 * A reference to an actor, one of its components, or one of its events
 * (the red "delegate" pin of a Custom Event). `null` is None.
 */
export type ObjRef =
  | { ref: 'actor'; id: string }
  | { ref: 'component'; actor: string; id: string }
  | { ref: 'delegate'; actor: string; node: string }
  | { ref: 'timer'; id: number };

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

/** Playback of one Timeline node on one actor. */
export interface TimelineRT {
  graphId: string;
  /** Position in seconds, from 0 to the timeline's length. */
  pos: number;
  playing: boolean;
  reverse: boolean;
}

export interface ActorRT {
  id: string;
  /** Level label, e.g. "BP_Lampe2". */
  label: string;
  /** UE-style object name used in logs, e.g. "BP_Lampe_C_1". */
  objectName: string;
  classId?: string;
  className: string;
  /** The native class at the top (Actor, Pawn, PlayerController, SaveGame…), for Cast To a native class. */
  native: string;
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
  /** Timeline node id → its playback state (created on first use). */
  timelines: Record<string, TimelineRT>;
  /** Other actors currently overlapping, and component-level pairs. */
  overlaps: Set<string>;
  compOverlaps: Set<string>;
  /** Event Dispatcher id → events bound to it, in binding order. */
  bindings: Record<string, Binding[]>;
  receivesInput: boolean;
  /** Set Actor Hidden In Game: not drawn, still colliding (as in UE). */
  hidden: boolean;
  destroyed: boolean;
  /**
   * An actor's Actor Components made in Blueprint: component id (in its
   * class) → id of the object that runs its logic.
   */
  logic?: Record<string, string>;
  /** A widget object (UMG): its widgets ticked Is Variable, by widget id → their reference on the screen. */
  widgetRefs?: Record<string, RValue>;
  /** A widget object (an instance of a Widget Blueprint, made by Create Widget): its state on the screen. */
  widget?: WidgetRT;
  /**
   * A widget of a Designer ticked Is Variable (a Text Block, a Progress
   * Bar…): the widget object it belongs to and its id there. Its properties
   * live in that object's `widget.state`.
   */
  widgetEl?: { host: string; id: string };
  /** For the object of an Actor Component: the actor that carries it (Get Owner), and its component id there. */
  owner?: string;
  componentId?: string;
  /**
   * The chain of execution (Interpreter.run) in which Destroy Actor hit it.
   * As in UE, where the actor really goes at the end of the frame, the rest
   * of that chain still runs; its latent actions and later events do not.
   */
  destroyedInRun?: number;
}

/**
 * The running state of a widget object (UMG). Properties changed by the
 * game (Set Text…) or by Bindings are kept by widget id over the Designer's
 * values; '' is the object itself (Set Visibility on a whole widget).
 */
export interface WidgetRT {
  /** Owning Player given to Create Widget (the controller's id), or null. */
  owner: string | null;
  state: Record<string, Partial<WidgetProps> & { removed?: boolean }>;
  /** User Widgets placed in its Designer: widget id → the widget object made for it. */
  nested: Record<string, string>;
  /** Children added by Add Child to …: panel widget id → widget objects, in order. */
  children: Record<string, string[]>;
  /** Where it is shown: added to the viewport, or the panel of another widget it was added to. */
  inViewport: boolean;
  zOrder: number;
  /** Order of the Add to Viewport, for widgets of the same Z-Order. */
  addedAt: number;
  parent?: { obj: string; panel: string };
  /** For a User Widget placed in another's Designer: that widget object and its widget id there. */
  placedIn?: { obj: string; id: string };
  /** On the screen now (Construct ran, Destruct not yet). */
  onScreen: boolean;
  /** Bindings stopped by a Set on the same property: "widgetId:prop". */
  broken: Record<string, true>;
}

/** A timer set by Set Timer by Event: an event to call after Time seconds. */
export interface TimerRT {
  id: number;
  actor: string;
  node: string;
  time: number;
  remaining: number;
  looping: boolean;
  paused: boolean;
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
