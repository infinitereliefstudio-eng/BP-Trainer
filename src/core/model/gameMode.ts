/**
 * The GameMode, as in UE: each world makes one, from the level's World
 * Settings › GameMode Override, else the project's Default GameMode (Maps &
 * Modes), else UE's GameModeBase. Its Class Defaults say which pawn (Default
 * Pawn Class) and which Player Controller (Player Controller Class) the game
 * makes for the player; unset, a Blueprint GameMode inherits them from its
 * parent Blueprint, and UE's GameModeBase gives DefaultPawn and PlayerController.
 */
import { lineage, rootParent } from './inheritance';
import { type BlueprintClass, findClass, type GameModeDefaults, type Level, type Project } from './project';

/** The GameMode Blueprint a level is played with (undefined: UE's GameModeBase). */
export function gameModeOf(p: Project, level: Level): BlueprintClass | undefined {
  for (const id of [level.gameModeOverride, p.mapsModes?.defaultGameMode]) {
    const cls = id ? findClass(p, id) : undefined;
    if (cls && rootParent(p, cls) === 'GameModeBase') return cls;
  }
  return undefined;
}

/** A Class Default of a GameMode Blueprint, as its class chain gives it. */
export function gameModeDefault(p: Project, gm: BlueprintClass | undefined, key: keyof GameModeDefaults): string | undefined {
  if (!gm) return undefined;
  for (const c of lineage(p, gm)) if (c.gameMode && key in c.gameMode) return c.gameMode[key];
  return undefined;
}

/** The pawn and Player Controller Blueprints the game makes for the player in this level (undefined: UE's native ones). */
export function playerClassesFor(p: Project, level: Level): { pawn?: BlueprintClass; controller?: BlueprintClass; gameMode?: BlueprintClass } {
  const gameMode = gameModeOf(p, level);
  const pick = (key: keyof GameModeDefaults, root: string) => {
    const id = gameModeDefault(p, gameMode, key);
    const cls = id ? findClass(p, id) : undefined;
    return cls && rootParent(p, cls) === root ? cls : undefined;
  };
  return { gameMode, pawn: pick('defaultPawnClass', 'Pawn'), controller: pick('playerControllerClass', 'PlayerController') };
}

/**
 * Forget what no longer fits (after a deletion or a Parent Class change): a
 * Default GameMode or GameMode Override that is not a GameModeBase, a Default
 * Pawn Class that is not a Pawn, a Player Controller Class that is not a PlayerController.
 */
export function pruneGameModes(p: Project): void {
  const is = (id: string | undefined, root: string) => {
    const cls = id ? findClass(p, id) : undefined;
    return !!cls && rootParent(p, cls) === root;
  };
  if (p.mapsModes?.defaultGameMode && !is(p.mapsModes.defaultGameMode, 'GameModeBase')) delete p.mapsModes.defaultGameMode;
  for (const l of p.levels) if (l.gameModeOverride && !is(l.gameModeOverride, 'GameModeBase')) delete l.gameModeOverride;
  for (const c of p.classes) {
    const gm = c.gameMode;
    if (!gm) continue;
    if (rootParent(p, c) !== 'GameModeBase') {
      delete c.gameMode;
      continue;
    }
    if (gm.defaultPawnClass && !is(gm.defaultPawnClass, 'Pawn')) delete gm.defaultPawnClass;
    if (gm.playerControllerClass && !is(gm.playerControllerClass, 'PlayerController')) delete gm.playerControllerClass;
  }
}

/** Is this Blueprint the player's pawn in at least one level (by its GameMode)? */
export function isPlayerPawnClass(p: Project, classId: string): boolean {
  return p.levels.some((l) => playerClassesFor(p, l).pawn?.id === classId);
}

/** Is this Blueprint the Player Controller Class in at least one level (by its GameMode)? */
export function isPlayerControllerClass(p: Project, classId: string): boolean {
  return p.levels.some((l) => playerClassesFor(p, l).controller?.id === classId);
}
