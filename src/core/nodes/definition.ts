/**
 * Node definitions: the *shape* of each Blueprint node (title, pins,
 * settings). Behaviour at runtime is registered separately by the
 * interpreter (step 2), keyed by the same id, so the editor never depends
 * on execution code.
 */
import type { BlueprintClass, GraphKind, NodeInstance, Project } from '../model/project';
import type { ClassHierarchy, PinDirection, PinType } from '../types/pins';
import type { Value } from '../types/values';

export type NodeKind =
  | 'event' // red header, entry point (BeginPlay, Tick, Custom Event…)
  | 'function' // blue header, impure call (Print String, Set Visibility…)
  | 'pure' // green header, no exec pins (Random Integer…)
  | 'latent' // blue header with a clock (Delay…)
  | 'flow' // grey header, flow control macros (Branch, Sequence…)
  | 'entry' // purple header, a function's entry and return nodes
  | 'variable'; // variable / component getters and setters

/** How the node is drawn. */
export type NodeStyle =
  | 'standard' // header + pin rows
  | 'compact' // no header, a big symbol in the middle (+, ×, AND…)
  | 'getter'; // a pill with a single output (variable Get, Self…)

export interface PinSpec {
  id: string;
  name: string;
  dir: PinDirection;
  type: PinType;
  /** Literal used when the input is unconnected and the user typed nothing. */
  default?: Value;
  /** Object input that means "self" when left unconnected. */
  defaultsToSelf?: boolean;
  /** Object input that must be connected (the class is not that type). */
  required?: boolean;
  /** Hide the label on the node (unlabelled exec pins, compact nodes). */
  hideName?: boolean;
}

export interface NodeContext {
  cls: BlueprintClass;
  hierarchy: ClassHierarchy;
  /** The whole project, needed for nodes that refer to other Blueprints. */
  project?: Project;
}

export interface ConfigField {
  key: string;
  label: string;
  kind: 'string' | 'int' | 'choice';
  choices?: { value: string; label: string }[];
  min?: number;
  max?: number;
}

export interface NodeDefinition {
  id: string;
  title: string | ((node: NodeInstance, ctx: NodeContext) => string);
  /** Palette category, using UE's names ("Flow Control", "Utilities|Time"…). */
  category: string;
  kind: NodeKind;
  style?: NodeStyle;
  /** Symbol drawn on compact nodes. */
  symbol?: string;
  /** Help text in French, shown in the palette and the Details panel. */
  description: string;
  keywords?: string[];
  pins: PinSpec[] | ((node: NodeInstance, ctx: NodeContext) => PinSpec[]);
  config?: ConfigField[];
  defaultConfig?: Record<string, Value>;
  /** Only one per Event Graph (BeginPlay, Tick…). */
  unique?: boolean;
  /** Graph kinds the node may be placed in (latent nodes: event only). */
  allowedIn?: GraphKind[];
  /** Not listed as-is in the palette (variable nodes are generated). */
  hiddenFromPalette?: boolean;
}

// ------------------------------------------------------------ pin helpers

export const execIn = (id = 'exec', name = ''): PinSpec => ({
  id,
  name,
  dir: 'in',
  type: { category: 'exec' },
  hideName: name === '',
});

export const execOut = (id = 'then', name = ''): PinSpec => ({
  id,
  name,
  dir: 'out',
  type: { category: 'exec' },
  hideName: name === '',
});

export const dataIn = (
  id: string,
  name: string,
  type: PinType,
  extra: Partial<PinSpec> = {},
): PinSpec => ({ id, name, dir: 'in', type, ...extra });

export const dataOut = (
  id: string,
  name: string,
  type: PinType,
  extra: Partial<PinSpec> = {},
): PinSpec => ({ id, name, dir: 'out', type, ...extra });
