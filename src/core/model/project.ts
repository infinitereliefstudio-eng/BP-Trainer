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
import type { WidgetNode } from './widgets';

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
  /**
   * A native function of the parent class that this graph overrides, as UE's
   * My Blueprint › Functions › Override (V7.53: a GameMode's ChoosePlayerStart).
   * Its name and signature are fixed: the engine calls it.
   */
  override?: OverridableFunction;
}

/** The parent-class functions a Blueprint can override (Functions › Override): a GameMode's, so far. */
export type OverridableFunction = 'ChoosePlayerStart' | 'GetDefaultPawnClassForController';

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
  | 'TextRender'
  /**
   * UE's Widget Component (V7.42): a User Widget carried by the actor, one
   * object per actor. `classId` is its Widget Class (a Widget Blueprint);
   * `props.sizeX` × `props.sizeY` its Draw Size, in screen pixels. Only the
   * Screen space is simulated: drawn over the view, it follows the actor.
   */
  | 'Widget'
  /** A Blueprint of the project whose parent is ActorComponent: logic only, no place in the world. */
  | 'ActorComponent';

export interface Component {
  id: string;
  name: string;
  kind: ComponentKind;
  /** Parent component id; the root has none. An Actor Component is never attached: it has none either. */
  parent?: string;
  /** Initial values of the component's properties (Details panel). */
  props: ComponentProps;
  /** An Actor Component: its Blueprint class (parent ActorComponent). A Widget Component: its Widget Class (a Widget Blueprint), absent for None. */
  classId?: string;
  /**
   * An Actor Component: values of its class's Instance Editable variables for
   * this actor class, by variable id (Details of the component in the actor's Blueprint).
   */
  values?: Record<string, Value>;
}

/**
 * Scene components have a place in the actor (a transform, a parent). An
 * Actor Component made in Blueprint has none: it only carries logic.
 */
export const isSceneComponent = (c: { kind: ComponentKind }): boolean => c.kind !== 'ActorComponent';

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
 * written to a slot by Save Game to Slot. PlayerController is an actor that
 * the game makes by itself for the player (never placed): it sits on the
 * input stack and owns the Enhanced Input Local Player Subsystem.
 * UserWidget is a Widget Blueprint (UMG): an interface drawn over the game,
 * made of a widget tree (its Designer) and a graph; created by Create Widget.
 * GameInstance is UE's UGameInstance: one object for the whole game, made
 * before the first level and kept through Open Level (Game Instance Class
 * in Maps & Modes); never placed, no components, no BeginPlay.
 * GameModeBase is UE's AGameModeBase: the rules of a level. Each world makes
 * one (Default GameMode, or the level's GameMode Override); its Class
 * Defaults say which pawn and Player Controller the game makes for the player.
 */
export type ParentClass = 'Actor' | 'Pawn' | 'PlayerController' | 'SaveGame' | 'ActorComponent' | 'UserWidget' | 'GameInstance' | 'GameModeBase';

/** Native parents a Blueprint can be created from. */
export const NATIVE_PARENTS: ParentClass[] = ['Actor', 'Pawn', 'PlayerController', 'SaveGame', 'ActorComponent', 'UserWidget', 'GameInstance', 'GameModeBase'];

/**
 * Six families that never mix: actors (Actor, Pawn, PlayerController),
 * SaveGame objects, Actor Components (added to actors, never placed),
 * Widget Blueprints (on the screen, never in the level), the GameInstance
 * (one object for the whole game) and GameModes (made by each world, never placed).
 */
export type ClassFamily = 'actor' | 'save' | 'component' | 'widget' | 'instance' | 'mode';
export const familyOf = (parent: ParentClass): ClassFamily =>
  parent === 'SaveGame'
    ? 'save'
    : parent === 'ActorComponent'
      ? 'component'
      : parent === 'UserWidget'
        ? 'widget'
        : parent === 'GameInstance'
          ? 'instance'
          : parent === 'GameModeBase'
            ? 'mode'
            : 'actor';

/** Can instances of this native class be placed in the level or spawned? */
export const isPlaceableParent = (parent: ParentClass): boolean => parent === 'Actor' || parent === 'Pawn';

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
  /** The native class at the top: Actor, Pawn, PlayerController or SaveGame (for a child Blueprint, its parent's). */
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
  /** A Widget Blueprint: its widget tree (Designer), in tree order. */
  widgets?: WidgetNode[];
  /** A GameMode's Class Defaults (unset: inherited from its parent Blueprint, else UE's DefaultPawn and PlayerController). */
  gameMode?: GameModeDefaults;
  /**
   * A child Blueprint's Class Defaults for the variables it inherits (V7.67): variable id → the value it
   * starts with in this class and its own children, and the type it was set for (a value set for another
   * type, after the parent changed the variable, is ignored). Unset: the parent's default.
   */
  inheritedDefaults?: Record<string, InheritedDefault>;
}

/** A child's own default for an inherited variable: the value, and the variable's type when it was set. */
export interface InheritedDefault {
  value: Value;
  type: PinType;
}

/** The Class Defaults of a GameModeBase Blueprint that the app simulates: what the game makes for the player. */
export interface GameModeDefaults {
  /** Default Pawn Class: a Pawn Blueprint (class id). */
  defaultPawnClass?: string;
  /** Player Controller Class: a PlayerController Blueprint (class id). */
  playerControllerClass?: string;
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
  /** Values of its Actor Components' Instance Editable variables for this actor: component id → variable id → value. */
  componentOverrides?: Record<string, Record<string, Value>>;
}

/**
 * A level (UE's Level asset, a .umap): its placed actors and its Player
 * Start. A project has one or more; Play plays the one open in the editor,
 * as UE's Play In Editor does.
 */
export interface Level {
  id: string;
  /** Its asset name, the one Open Level (by Name) asks for: Lvl_Couloir. */
  name: string;
  actors: LevelActor[];
  /** Its first Player Start (« PlayerStart » in the Outliner), always there. */
  playerStart: PlayerStartSpot;
  /** More Player Starts (format 18): PlayerStart2, PlayerStart3… The GameMode chooses one (Choose Player Start). */
  otherStarts?: PlacedPlayerStart[];
  /** World Settings › GameMode Override: a GameModeBase Blueprint (class id) used in this level instead of the Default GameMode. */
  gameModeOverride?: string;
}

/** A Player Start: where the GameMode may make the player appear. */
export interface PlayerStartSpot {
  x: number;
  y: number;
  yaw: number;
  /** Player Start Tag (a Name): what a GameMode's Choose Player Start can look for. */
  tag?: string;
}

/** A Player Start placed after the first one. */
export interface PlacedPlayerStart extends PlayerStartSpot {
  /** Starts with « ps_ » (MAIN_START_ID is the first one's). */
  id: string;
  /** Its label in the Outliner: PlayerStart2… */
  name: string;
}

/** The id of a level's first Player Start, in the Outliner and the runtime. */
export const MAIN_START_ID = 'playerStart';

/** Every Player Start of a level, the first one first, with its id and label. */
export function playerStartsOf(level: Level): PlacedPlayerStart[] {
  return [{ ...level.playerStart, id: MAIN_START_ID, name: 'PlayerStart' }, ...(level.otherStarts ?? [])];
}

/** Is this Outliner or runtime id a Player Start's? */
export const isPlayerStartId = (id: string | undefined): boolean => id === MAIN_START_ID || !!id?.startsWith('ps_');

/** Project Settings › Maps & Modes. */
export interface MapsModes {
  /** Game Default Map: the level the game starts in (a level id). The lessons' checks start there too. */
  gameDefaultMap?: string;
  /** Game Instance Class: a Blueprint of parent GameInstance (a class id). Unset: UE's plain GameInstance, which no Cast To BP_… accepts. */
  gameInstanceClass?: string;
  /** Default GameMode: a GameModeBase Blueprint (a class id), for every level without GameMode Override. Unset: UE's GameModeBase. */
  defaultGameMode?: string;
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

/** A Structure asset (Content Drawer › Structure): named members, no logic. */
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
 * A Data Table asset (Content Drawer › Data Table): rows of one structure,
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
  /** UE's Trigger when Paused: the action still fires while the game is paused (Set Game Paused). */
  triggerWhenPaused?: boolean;
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
  /** Version of the simulation rules the project was last opened under (see rules.ts). */
  rules?: number;
  /** For a lesson's project: the revision of the lesson it was started from (Lesson.revision). */
  lessonRevision?: number;
  /** The levels, never empty (format 14: before, a single `level`). */
  levels: Level[];
  /** The level open in the editor (the first if unset or gone). */
  editorLevelId?: string;
  /** Project Settings › Maps & Modes. */
  mapsModes?: MapsModes;
  createdAt: number;
  updatedAt: number;
}

export const PROJECT_FORMAT = 19;

const DEFAULT_PROPS: Record<ComponentKind, Partial<ComponentProps>> = {
  Scene: {},
  StaticMesh: { sizeX: 100, sizeY: 100, shape: 'cube', blocks: true, color: '#8a8f99' },
  PointLight: { sizeX: 0, sizeY: 0, intensity: 5000, radius: 600, color: '#ffd27a' },
  BoxCollision: { sizeX: 200, sizeY: 200, blocks: false },
  TextRender: { text: 'Text', color: '#ffffff' },
  // UE's default Draw Size: 500 × 500.
  Widget: { sizeX: 500, sizeY: 500 },
  ActorComponent: {},
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

/** The level every project starts with, and the one an older project's level becomes. */
export const MAIN_LEVEL_ID = 'lvl-principal';
export const MAIN_LEVEL_NAME = 'Lvl_Principal';

export function createLevel(name = MAIN_LEVEL_NAME, id = MAIN_LEVEL_ID): Level {
  return { id, name, actors: [], playerStart: { x: 0, y: 0, yaw: 0 } };
}

/** The level open in the editor: the one the level view, the Outliner and Play work on. */
export function levelOf(p: Project): Level {
  return p.levels.find((l) => l.id === p.editorLevelId) ?? p.levels[0];
}

/** Game Default Map: where the game starts (the lessons' checks too). */
export function defaultLevel(p: Project): Level {
  return p.levels.find((l) => l.id === p.mapsModes?.gameDefaultMap) ?? p.levels[0];
}

export function findLevel(p: Project, id: string): Level | undefined {
  return p.levels.find((l) => l.id === id);
}

/** A level by its asset name, as Open Level (by Name) finds it (case ignored, as UE's names). */
export function findLevelByName(p: Project, name: string): Level | undefined {
  const n = name.trim().toLowerCase();
  return p.levels.find((l) => l.name.toLowerCase() === n);
}

/** Engine class each component kind maps to (used for reference pins). */
export const COMPONENT_CLASS: Record<ComponentKind, string> = {
  Scene: 'SceneComponent',
  StaticMesh: 'StaticMeshComponent',
  PointLight: 'PointLightComponent',
  BoxCollision: 'BoxComponent',
  TextRender: 'TextRenderComponent',
  Widget: 'WidgetComponent',
  ActorComponent: 'ActorComponent',
};

export const COMPONENT_LABEL: Record<ComponentKind, string> = {
  Scene: 'Scene',
  StaticMesh: 'Static Mesh',
  PointLight: 'Point Light',
  BoxCollision: 'Box Collision',
  TextRender: 'Text Render',
  Widget: 'Widget',
  ActorComponent: 'Actor Component',
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
    // A SaveGame is an object, an Actor Component and a widget have no place in the world: no components at all.
    components: familyOf(parent) !== 'actor' ? [] : [{ id: newId('cmp'), name: 'DefaultSceneRoot', kind: 'Scene', props: componentDefaults('Scene') }],
    variables: [],
    graphs: [createGraph('EventGraph', 'event')],
    dispatchers: [],
    interfaces: [],
    // As in UE5, a new Widget Blueprint has no root: the first widget placed becomes it.
    ...(parent === 'UserWidget' ? { widgets: [] } : {}),
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
    levels: [createLevel()],
    mapsModes: { gameDefaultMap: MAIN_LEVEL_ID },
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
