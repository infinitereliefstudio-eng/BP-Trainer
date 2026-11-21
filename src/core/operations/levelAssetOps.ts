/**
 * The project's levels as assets (UE's Level, a .umap): add, rename,
 * delete. Which one the editor shows is EditorStore.openLevel.
 */
import { newId } from '../model/ids';
import { createLevel, type Level, type Project, uniqueName } from '../model/project';
import { validateName } from './classOps';
import { takenNames } from './enumOps';
import type { OpResult } from './graphOps';

/** A new, empty level (+ Add › Level), with its Player Start at the origin. */
export function addLevel(p: Project, name = 'Lvl_NewLevel'): OpResult<Level> {
  const n = name.trim() || 'Lvl_NewLevel';
  if (/\s/.test(n)) return { ok: false, reason: 'Un nom de niveau ne peut pas contenir d’espace : Open Level (by Name) le cherche tel quel.' };
  const level = createLevel(uniqueName(n, takenNames(p)), newId('lvl'));
  const err = validateName(level.name, takenNames(p));
  if (err) return { ok: false, reason: err };
  p.levels.push(level);
  return { ok: true, value: level };
}

/** Rename a level. The nodes that open it by name keep the old name, as in UE: the learner fixes them. */
export function renameLevel(p: Project, id: string, name: string): OpResult {
  const level = p.levels.find((l) => l.id === id);
  if (!level) return { ok: false, reason: 'Niveau introuvable.' };
  const n = name.trim();
  if (/\s/.test(n)) return { ok: false, reason: 'Un nom de niveau ne peut pas contenir d’espace : Open Level (by Name) le cherche tel quel.' };
  const err = validateName(n, takenNames(p, id));
  if (err) return { ok: false, reason: err };
  level.name = n;
  return { ok: true, value: undefined };
}

/**
 * Delete a level. As in UE, the level open in the editor cannot be deleted,
 * and a project keeps at least one. The Game Default Map moves to the first
 * level left if it was this one.
 */
export function removeLevel(p: Project, id: string, openId: string): OpResult {
  const level = p.levels.find((l) => l.id === id);
  if (!level) return { ok: false, reason: 'Niveau introuvable.' };
  if (p.levels.length === 1) return { ok: false, reason: 'Un projet garde au moins un niveau.' };
  if (id === openId) return { ok: false, reason: `${level.name} est ouvert dans l’éditeur : ouvre d’abord un autre niveau, comme dans UE.` };
  p.levels = p.levels.filter((l) => l.id !== id);
  p.mapsModes ??= {};
  if (p.mapsModes.gameDefaultMap === id || !p.levels.some((l) => l.id === p.mapsModes?.gameDefaultMap)) p.mapsModes.gameDefaultMap = p.levels[0].id;
  return { ok: true, value: undefined };
}

/** Project Settings › Maps & Modes › Game Instance Class: a GameInstance Blueprint, or '' for UE's plain GameInstance. */
export function setGameInstanceClass(p: Project, classId: string): OpResult {
  if (classId && p.classes.find((c) => c.id === classId)?.parent !== 'GameInstance') return { ok: false, reason: 'Choisis un Blueprint de classe parente GameInstance.' };
  const mm = { ...p.mapsModes };
  if (classId) mm.gameInstanceClass = classId;
  else delete mm.gameInstanceClass;
  p.mapsModes = mm;
  return { ok: true, value: undefined };
}

/** Project Settings › Maps & Modes › Game Default Map. */
export function setGameDefaultMap(p: Project, id: string): OpResult {
  if (!p.levels.some((l) => l.id === id)) return { ok: false, reason: 'Niveau introuvable.' };
  p.mapsModes = { ...p.mapsModes, gameDefaultMap: id };
  return { ok: true, value: undefined };
}
