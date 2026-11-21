/** Runtime actors made from a Blueprint class (level instances, spawns, the player). */
import { isSceneComponent, type BlueprintClass } from '../model/project';
import { defaultValueFor, type Value } from '../types/values';
import type { ActorRT, RValue } from './world';

/** Object variables edited on a level instance are saved as "actor:<id>". */
export function instanceValue(v: Value): RValue {
  if (typeof v === 'string' && v.startsWith('actor:')) return { ref: 'actor', id: v.slice(6) };
  // A list of references to placed actors (an Instance Editable array set in the level).
  if (Array.isArray(v) && v.some((x) => typeof x === 'string' && x.startsWith('actor:'))) return v.map(instanceValue);
  return structuredClone(v) as RValue;
}

/** An actor of a native class (no Blueprint): the plain pawn, the controller, the subsystem. */
export function blank(id: string, label: string, objectName: string, className: string): ActorRT {
  return {
    id,
    label,
    objectName,
    className,
    native: className,
    isPlayer: false,
    x: 0,
    y: 0,
    yaw: 0,
    components: [],
    vars: {},
    outputs: {},
    nodeState: {},
    latent: {},
    timelines: {},
    overlaps: new Set(),
    compOverlaps: new Set(),
    bindings: {},
    receivesInput: false,
    hidden: false,
    destroyed: false,
  };
}

/** An instance of `cls`: its components and variables, Instance Editable values overridden. */
export function createActor(id: string, label: string, objectName: string, cls: BlueprintClass, overrides: Record<string, Value>): ActorRT {
  const vars: Record<string, RValue> = {};
  for (const v of cls.variables) {
    const value = v.instanceEditable && v.id in overrides ? overrides[v.id] : v.defaultValue;
    vars[v.id] = instanceValue(value ?? defaultValueFor(v.type));
  }
  return {
    ...blank(id, label, objectName, cls.name),
    native: cls.parent,
    classId: cls.id,
    // Actor Components have no place in the world: their logic runs in an object of their own (Simulation.attachComponents).
    components: cls.components
      .filter(isSceneComponent)
      .map((c) => ({ id: c.id, name: c.name, kind: c.kind, parent: c.parent, props: structuredClone(c.props), ...(c.kind === 'Widget' && c.classId ? { classId: c.classId } : {}) })),
    vars,
    receivesInput: cls.autoReceiveInput,
  };
}

/** The player: an instance of the Default Pawn Class, or UE's plain DefaultPawn. */
export function createPlayer(cls: BlueprintClass | undefined): ActorRT {
  const base = cls ? createActor('player', 'Joueur', `${cls.name}_C_0`, cls, {}) : blank('player', 'Joueur', 'DefaultPawn_C_0', 'Pawn');
  // A Blueprint pawn is possessed: it always receives input.
  return { ...base, isPlayer: true, receivesInput: !!cls };
}

/**
 * The player's controller: an instance of the Player Controller Class, or
 * UE's native PlayerController. It is always on the input stack.
 */
export function createController(cls: BlueprintClass | undefined): ActorRT {
  const base = cls ? createActor('controller', 'PlayerController', `${cls.name}_C_0`, cls, {}) : blank('controller', 'PlayerController', 'PlayerController_0', 'PlayerController');
  return { ...base, receivesInput: true };
}

/**
 * The GameInstance: an instance of the Game Instance Class, or UE's plain
 * GameInstance. One for the whole game (core/runtime/game.ts), never in a level.
 */
export function createGameInstance(cls: BlueprintClass | undefined): ActorRT {
  return cls ? createActor(GAME_INSTANCE_ID, 'GameInstance', `${cls.name}_C_0`, cls, {}) : blank(GAME_INSTANCE_ID, 'GameInstance', 'GameInstance_0', 'GameInstance');
}

export const GAME_INSTANCE_ID = 'gameInstance';

/** The world's GameMode: an instance of its GameMode Blueprint, or UE's GameModeBase. An actor the game spawns, never placed. */
export function createGameMode(cls: BlueprintClass | undefined): ActorRT {
  return cls ? createActor('gameMode', 'GameMode', `${cls.name}_C_0`, cls, {}) : blank('gameMode', 'GameMode', 'GameModeBase_0', 'GameModeBase');
}

/** The player's Enhanced Input Local Player Subsystem: an object, never in the level. */
export function createInputSubsystem(): ActorRT {
  return blank('inputSubsystem', 'EnhancedInputLocalPlayerSubsystem', 'EnhancedInputLocalPlayerSubsystem_0', 'EnhancedInputLocalPlayerSubsystem');
}
