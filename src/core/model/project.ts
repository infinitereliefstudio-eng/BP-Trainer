/**
 * The project model: plain, JSON-serialisable data.
 *
 * Nothing here knows about the screen or the interpreter. Every change goes
 * through `operations` (pure mutators) wrapped by the history, so undo/redo
 * and saving work the same way for every feature.
 */
import type { PinType } from '../types/pins';
import type { Value } from '../types/values';
import { newId } from './ids';
import { RULES_VERSION } from './rules';

export interface PinRef {
  node: string;
  pin: string;
}

/** A link always goes from an output pin to an input pin. */
export interface Link {
  id: string;
  from: PinRef;
  to: PinRef;
}

export interface NodeInstance {
  id: string;
  /** Id of the NodeDefinition in the library, e.g. "flow.branch". */
  def: string;
  x: number;
  y: number;
  /** Per-node settings: variable id, custom event name, number of outputs… */
  config: Record<string, Value>;
  /** Literal values typed on unconnected input pins, keyed by pin id. */
  defaults: Record<string, Value>;
  /**
   * Types adopted by the node's wildcard pins, by group ("default" when the
   * node has one group), encoded as in types/wildcard. Internal state, kept
   * apart from the settings the user edits in `config`.
   */
  wild?: Record<string, string>;
}

/**
 * 'construction' is the Construction Script: one per class, run when an
 * instance is placed or changed in the editor and when it spawns, before BeginPlay.
 */
export type GraphKind = 'event' | 'function' | 'construction';

export const CONSTRUCTION_SCRIPT = 'ConstructionScript';

export interface Graph {
  id: string;
  name: string;
  kind: GraphKind;
  nodes: Record<string, NodeInstance>;
  links: Record<string, Link>;
  /** Signature of a function graph. */
  fn?: FunctionSignature;
  /**
   * Set on the function graph that implements an interface function with
   * outputs (UE implements those as functions, not events). Its signature
   * is kept equal to the interface's by operations/interfaceOps.
   */
  iface?: { interface: string; fn: string };
}

export interface FunctionSignature {
  inputs: Param[];
  outputs: Param[];
  /** Pure functions have no exec pins and run each time a value is read. */
  pure: boolean;
  description: string;
  /** Local Variables: reset to their default value at each call, as in UE. */
  locals?: LocalVariable[];
}

/** A variable that lives only during one call of a function. */
export interface LocalVariable {
  id: string;
  name: string;
  type: PinType;
  defaultValue: Value;
}

export interface Variable {
  id: string;
  name: string;
  type: PinType;
  defaultValue: Value;
  instanceEditable: boolean;
  /** Only this Blueprint may read or set it (UE's Private): other Blueprints get a compile error. */
  private?: boolean;
  /** Becomes an input pin of Spawn Actor, set before the new actor's BeginPlay. Needs Instance Editable, as in UE. */
  exposeOnSpawn?: boolean;
  category: string;
  tooltip: string;
}

/** Variables shown as pins on Spawn Actor for this class. */
export function spawnPins(cls: BlueprintClass): Variable[] {
  return cls.variables.filter((v) => v.exposeOnSpawn && v.instanceEditable);
}

export type ComponentKind =
  | 'Scene'
  | 'StaticMesh'
  | 'PointLight'
  | 'BoxCollision'
  | 'TextRender';

export interface Component {
  id: string;
  name: string;
  kind: ComponentKind;
  /** Parent component id; the root has none. */
  parent?: string;
  /** Initial values of the component's properties (Details panel). */
  props: ComponentProps;
}

export type MeshShape = 'cube' | 'cylinder' | 'door';

/**
 * Component properties, in UE units: centimetres and degrees. Each kind
 * uses a subset (a light ignores `shape`, a box ignores `color`…).
 */
export interface ComponentProps {
  /** Relative location and yaw, from the parent component. */
  x: number;
  y: number;
  yaw: number;
  /** Mesh size or box extent (full size). */
  sizeX: number;
  sizeY: number;
  shape: MeshShape;
  /** UE's "Visible" property: the state when the game starts. */
  visible: boolean;
  /** Static meshes block the player when true. */
  blocks: boolean;
  color: string;
  intensity: number;
  /** Point light attenuation radius. */
  radius: number;
  text: string;
  /** UE's Collision Enabled, an ECollisionEnabled index (3 = Query and Physics). */
  collision: number;
}

/**
 * The native class at the top of a Blueprint. SaveGame is UE's USaveGame: an
 * object, not an actor (no components, never placed), whose variables are
 * written to a slot by Save Game to Slot.
 */
export type ParentClass = 'Actor' | 'Pawn' | 'SaveGame';

/** Native parents a Blueprint can be created from. */
export const NATIVE_PARENTS: ParentClass[] = ['Actor', 'Pawn', 'SaveGame'];

/** A parameter of an Event Dispatcher (and of the events bound to it). */
export interface Param {
  id: string;
  name: string;
  type: PinType;
}

export interface Dispatcher {
  id: string;
  name: string;
  params: Param[];
}

export interface InterfaceFunction {
  id: string;
  name: string;
  /** Inputs, given by the message and received by the implementation. */
  inputs?: Param[];
  /**
   * Outputs, returned to the message. A function with outputs is implemented
   * as a function graph (Graph.iface), one without as an event, like UE.
   */
  outputs?: Param[];
}

/** A Blueprint Interface asset: function signatures only, no implementation. */
export interface BlueprintInterface {
  id: string;
  name: string;
  functions: InterfaceFunction[];
}

export interface BlueprintClass {
  id: string;
  name: string;
  /** The native class at the top: Actor or Pawn (for a child Blueprint, its parent's). */
  parent: ParentClass;
  /** Parent Blueprint, when this class inherits from another Blueprint (see inheritance.ts). */
  parentClassId?: string;
  /** UE's "Auto Receive Input": input events fire only when true. */
  autoReceiveInput: boolean;
  components: Component[];
  variables: Variable[];
  graphs: Graph[];
  dispatchers: Dispatcher[];
  /** Ids of the Blueprint Interfaces this class implements (Class Settings). */
  interfaces: string[];
}

/** An instance of a Blueprint class placed in the level. */
export interface LevelActor {
  id: string;
  classId: string;
  name: string;
  x: number;
  y: number;
  yaw: number;
  /** Values of Instance Editable variables, keyed by variable id. */
  overrides: Record<string, Value>;
}

export interface Level {
  actors: LevelActor[];
  playerStart: { x: number; y: number; yaw: number };
}

/** A user Enum asset: named entries, stored as their index (Byte in UE). */
export interface UserEnum {
  id: string;
  name: string;
  entries: string[];
}

/** A member of a Structure asset. */
export interface StructMember {
  id: string;
  name: string;
  type: PinType;
  defaultValue: Value;
}

/** A Structure asset (Content Browser › Structure): named members, no logic. */
export interface UserStruct {
  id: string;
  name: string;
  members: StructMember[];
}

/** A row of a Data Table: its Row Name and a value of the table's structure. */
export interface DataTableRow {
  name: string;
  /** A structure value, indexed by member id (a missing member has its default). */
  value: Record<string, Value>;
}

/**
 * A Data Table asset (Content Browser › Data Table): rows of one structure,
 * each with a unique Row Name. `struct` names the structure, like a pin type.
 */
export interface DataTable {
  id: string;
  name: string;
  struct: string;
  rows: DataTableRow[];
}

/**
 * What Save Game to Slot wrote: the SaveGame class and its variables, by
 * name (UE serializes properties by name: a renamed variable is not found).
 */
export interface SavedGame {
  classId: string;
  className: string;
  values: Record<string, Value>;
  /** Simulation time of the save, for the slots panel. */
  savedAt?: number;
}

/** Keys the app's Play offers (on-screen buttons). */
export type KeyName = 'E' | 'F' | 'SpaceBar';
export const KEY_NAMES: KeyName[] = ['E', 'F', 'SpaceBar'];

/**
 * When a mapped key makes its action fire, as UE's Input Triggers. None
 * (an empty list) is UE's implicit Down: triggered every frame while held.
 */
export type InputTriggerKind = 'Down' | 'Pressed' | 'Released' | 'Hold';

export interface InputTrigger {
  kind: InputTriggerKind;
  /** Hold: seconds the key must be held (Hold Time Threshold). */
  holdTime?: number;
  /** Hold: trigger once, not every frame after the threshold (Is One Shot). */
  oneShot?: boolean;
}

/**
 * An Input Action asset: something the player can do (Interagir, Sauter),
 * whatever the key. The app's actions are digital (Value Type: Digital (bool)).
 */
export interface InputAction {
  id: string;
  name: string;
  valueType: 'Bool';
}

/** A line of a Mapping Context: this key drives this action, with these triggers. */
export interface InputMapping {
  action: string;
  key: KeyName;
  triggers: InputTrigger[];
}

/** An Input Mapping Context asset: which keys drive which actions, active once added (Add Mapping Context). */
export interface MappingContext {
  id: string;
  name: string;
  mappings: InputMapping[];
}

export interface Project {
  /** Format version of the saved file, see serialization/migrate. */
  format: number;
  id: string;
  name: string;
  classes: BlueprintClass[];
  interfaces: BlueprintInterface[];
  enums: UserEnum[];
  structs: UserStruct[];
  dataTables: DataTable[];
  /** Enhanced Input: Input Actions and Input Mapping Contexts. */
  inputActions: InputAction[];
  mappingContexts: MappingContext[];
  /**
   * Save slots, by "slot name|user index". They outlive Play, as files on
   * disk do in UE; a lesson's check starts from its own (Lesson.slots).
   */
  saveSlots?: Record<string, SavedGame>;
  /** Class used for the player (UE's Default Pawn Class); a plain pawn if unset. */
  playerClassId?: string;
  /** Version of the simulation rules the project was last opened under (see rules.ts). */
  rules?: number;
  /** For a lesson's project: the revision of the lesson it was started from (Lesson.revision). */
  lessonRevision?: number;
  level: Level;
  createdAt: number;
  updatedAt: number;
}

export const PROJECT_FORMAT = 9;

const DEFAULT_PROPS: Record<ComponentKind, Partial<ComponentProps>> = {
  Scene: {},
  StaticMesh: { sizeX: 100, sizeY: 100, shape: 'cube', blocks: true, color: '#8a8f99' },
  PointLight: { sizeX: 0, sizeY: 0, intensity: 5000, radius: 600, color: '#ffd27a' },
  BoxCollision: { sizeX: 200, sizeY: 200, blocks: false },
  TextRender: { text: 'Text', color: '#ffffff' },
};

export function componentDefaults(kind: ComponentKind): ComponentProps {
  return {
    x: 0,
    y: 0,
    yaw: 0,
    sizeX: 0,
    sizeY: 0,
    shape: 'cube',
    visible: true,
    blocks: false,
    color: '#ffffff',
    intensity: 0,
    radius: 0,
    text: '',
    collision: 3,
    ...DEFAULT_PROPS[kind],
  };
}

export function createLevel(): Level {
  return { actors: [], playerStart: { x: 0, y: 0, yaw: 0 } };
}

/** Engine class each component kind maps to (used for reference pins). */
export const COMPONENT_CLASS: Record<ComponentKind, string> = {
  Scene: 'SceneComponent',
  StaticMesh: 'StaticMeshComponent',
  PointLight: 'PointLightComponent',
  BoxCollision: 'BoxComponent',
  TextRender: 'TextRenderComponent',
};

export const COMPONENT_LABEL: Record<ComponentKind, string> = {
  Scene: 'Scene',
  StaticMesh: 'Static Mesh',
  PointLight: 'Point Light',
  BoxCollision: 'Box Collision',
  TextRender: 'Text Render',
};

// ---------------------------------------------------------------- factories

export function createGraph(name: string, kind: GraphKind = 'event'): Graph {
  const g: Graph = { id: newId('g'), name, kind, nodes: {}, links: {} };
  if (kind === 'function') g.fn = { inputs: [], outputs: [], pure: false, description: '' };
  return g;
}

export function createClass(name: string, parent: ParentClass = 'Actor'): BlueprintClass {
  return {
    id: newId('c'),
    name,
    parent,
    autoReceiveInput: false,
    // A SaveGame is an object, not an actor: no components at all.
    components: parent === 'SaveGame' ? [] : [{ id: newId('cmp'), name: 'DefaultSceneRoot', kind: 'Scene', props: componentDefaults('Scene') }],
    variables: [],
    graphs: [createGraph('EventGraph', 'event')],
    dispatchers: [],
    interfaces: [],
  };
}

export function createProject(name = 'Mon projet'): Project {
  const now = Date.now();
  return {
    format: PROJECT_FORMAT,
    rules: RULES_VERSION,
    id: newId('p'),
    name,
    classes: [],
    interfaces: [],
    enums: [],
    structs: [],
    dataTables: [],
    inputActions: [],
    mappingContexts: [],
    level: createLevel(),
    createdAt: now,
    updatedAt: now,
  };
}

// ------------------------------------------------------------------ lookups

export function findClass(p: Project, id: string): BlueprintClass | undefined {
  return p.classes.find((c) => c.id === id);
}

export function findGraph(c: BlueprintClass, id: string): Graph | undefined {
  return c.graphs.find((g) => g.id === id);
}

export function findVariable(c: BlueprintClass, id: string): Variable | undefined {
  return c.variables.find((v) => v.id === id);
}

/** A local variable of one of the class's functions, with its graph. */
export function findLocal(c: BlueprintClass, id: string): { graph: Graph; local: LocalVariable } | undefined {
  for (const graph of c.graphs) {
    const local = graph.fn?.locals?.find((l) => l.id === id);
    if (local) return { graph, local };
  }
  return undefined;
}

export function findDispatcher(c: BlueprintClass, id: string): Dispatcher | undefined {
  return c.dispatchers.find((d) => d.id === id);
}

export function findInterface(p: Project, id: string): BlueprintInterface | undefined {
  return p.interfaces.find((i) => i.id === id);
}

export function findComponent(c: BlueprintClass, id: string): Component | undefined {
  return c.components.find((k) => k.id === id);
}

export function linksOfPin(g: Graph, ref: PinRef): Link[] {
  return Object.values(g.links).filter(
    (l) =>
      (l.from.node === ref.node && l.from.pin === ref.pin) ||
      (l.to.node === ref.node && l.to.pin === ref.pin),
  );
}

export function linksOfNode(g: Graph, nodeId: string): Link[] {
  return Object.values(g.links).filter((l) => l.from.node === nodeId || l.to.node === nodeId);
}

/** UE-style unique naming: "NewVar", "NewVar_0", "NewVar_1"… */
export function uniqueName(base: string, taken: Iterable<string>): string {
  const set = new Set(taken);
  if (!set.has(base)) return base;
  for (let i = 0; ; i++) {
    const candidate = `${base}_${i}`;
    if (!set.has(candidate)) return candidate;
  }
}

/** Key identifying a parameter list by its types: events bind to dispatchers with the same key. */
export function signatureKey(params: { type: PinType }[]): string {
  return params.map((p) => `${p.type.category}${p.type.subtype ? `:${p.type.subtype}` : ''}${p.type.container ? '[]' : ''}`).join(',');
}
