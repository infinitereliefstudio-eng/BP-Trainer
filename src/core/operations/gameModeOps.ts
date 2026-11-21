/**
 * The GameMode settings, where UE keeps them: a GameMode Blueprint's Class
 * Defaults (Default Pawn Class, Player Controller Class), Project Settings ›
 * Maps & Modes › Default GameMode, and a level's World Settings › GameMode Override.
 */
import { rootParent } from '../model/inheritance';
import { findClass, type BlueprintClass, type GameModeDefaults, type Level, type Project } from '../model/project';
import type { OpResult } from './graphOps';
import { addClass } from './projectOps';

/** Which native class each Class Default takes, and how UE names it. */
const WANTS: Record<keyof GameModeDefaults, { root: string; label: string }> = {
  defaultPawnClass: { root: 'Pawn', label: 'Default Pawn Class : choisis un Blueprint de classe parente Pawn.' },
  playerControllerClass: { root: 'PlayerController', label: 'Player Controller Class : choisis un Blueprint de classe parente PlayerController.' },
};

const isMode = (p: Project, id: string) => {
  const cls = findClass(p, id);
  return !!cls && rootParent(p, cls) === 'GameModeBase';
};

/**
 * A Class Default of a GameMode Blueprint. `classId`: a Blueprint of the
 * right family, '' for UE's native class (DefaultPawn, PlayerController),
 * undefined to inherit the parent Blueprint's value again.
 */
export function setGameModeDefault(p: Project, gameModeId: string, key: keyof GameModeDefaults, classId: string | undefined): OpResult {
  const gm = findClass(p, gameModeId);
  if (!gm || rootParent(p, gm) !== 'GameModeBase') return { ok: false, reason: 'Ce Blueprint n’est pas un GameMode (classe parente GameModeBase).' };
  if (classId) {
    const cls = findClass(p, classId);
    if (!cls || rootParent(p, cls) !== WANTS[key].root) return { ok: false, reason: WANTS[key].label };
  }
  const defaults = { ...gm.gameMode };
  if (classId === undefined) delete defaults[key];
  else defaults[key] = classId;
  gm.gameMode = defaults;
  return { ok: true, value: undefined };
}

/** Project Settings › Maps & Modes › Default GameMode: a GameMode Blueprint, or '' for UE's GameModeBase. */
export function setDefaultGameMode(p: Project, classId: string): OpResult {
  if (classId && !isMode(p, classId)) return { ok: false, reason: 'Choisis un Blueprint de classe parente GameModeBase.' };
  const mm = { ...p.mapsModes };
  if (classId) mm.defaultGameMode = classId;
  else delete mm.defaultGameMode;
  p.mapsModes = mm;
  return { ok: true, value: undefined };
}

/** World Settings › GameMode Override of a level: a GameMode Blueprint, or '' for none (the Default GameMode then). */
export function setGameModeOverride(p: Project, levelId: string, classId: string): OpResult {
  const level = p.levels.find((l) => l.id === levelId);
  if (!level) return { ok: false, reason: 'Niveau introuvable.' };
  if (classId && !isMode(p, classId)) return { ok: false, reason: 'Choisis un Blueprint de classe parente GameModeBase.' };
  if (classId) level.gameModeOverride = classId;
  else delete level.gameModeOverride;
  return { ok: true, value: undefined };
}

/**
 * The project's Default GameMode Blueprint, made if there is none yet
 * (BP_GameMode, as UE's templates have their BP_ThirdPersonGameMode).
 */
export function ensureDefaultGameMode(p: Project): OpResult<BlueprintClass> {
  const id = p.mapsModes?.defaultGameMode;
  const existing = id ? findClass(p, id) : undefined;
  if (existing && rootParent(p, existing) === 'GameModeBase') return { ok: true, value: existing };
  const made = addClass(p, 'BP_GameMode', 'GameModeBase');
  if (!made.ok) return made;
  p.mapsModes = { ...p.mapsModes, defaultGameMode: made.value.id };
  return made;
}

/** Set a Class Default of the Default GameMode (made if needed): what lessons do to give the player a pawn or a Player Controller. */
export function setDefaultGameModeClass(p: Project, key: keyof GameModeDefaults, classId: string | undefined): OpResult {
  if (classId === undefined && !p.mapsModes?.defaultGameMode) return { ok: true, value: undefined };
  const gm = ensureDefaultGameMode(p);
  if (!gm.ok) return gm;
  return setGameModeDefault(p, gm.value.id, key, classId);
}

/** The level a GameMode is the override of, for the Class Settings' « used by » line. */
export function levelsOverriddenBy(p: Project, gameModeId: string): Level[] {
  return p.levels.filter((l) => l.gameModeOverride === gameModeId);
}
