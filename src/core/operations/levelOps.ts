/** Level mutators: placing, moving and configuring actor instances. */
import { newId } from '../model/ids';
import { inheritedView } from '../model/inheritance';
import { levelActorScale, rootComponent, type Scale3 } from '../model/scale';
import { findClass, isPlaceableParent, isSceneComponent, MAIN_START_ID, type LevelActor, type PlacedPlayerStart, type PlayerStartSpot, playerStartsOf, type Project, levelOf } from '../model/project';
import type { Value } from '../types/values';
import type { OpResult } from './graphOps';

/** UE-style labels in the level: BP_Lampe, BP_Lampe2, BP_Lampe3… */
function nextLabel(p: Project, base: string): string {
  const taken = new Set(levelOf(p).actors.map((a) => a.name));
  if (!taken.has(base)) return base;
  for (let i = 2; ; i++) if (!taken.has(`${base}${i}`)) return `${base}${i}`;
}

export function placeActor(p: Project, classId: string, x: number, y: number): OpResult<LevelActor> {
  const cls = p.classes.find((c) => c.id === classId);
  if (!cls) return { ok: false, reason: 'Blueprint introuvable.' };
  if (cls.parent === 'SaveGame') return { ok: false, reason: `${cls.name} est un SaveGame : un objet, pas un acteur, il ne se pose pas dans le niveau.` };
  if (cls.parent === 'GameModeBase') {
    return { ok: false, reason: `${cls.name} est un GameMode : chaque niveau crée le sien au lancement. On le choisit dans Project Settings › Maps & Modes (Default GameMode) ou dans les World Settings du niveau (GameMode Override).` };
  }
  if (cls.parent === 'GameInstance') {
    return { ok: false, reason: `${cls.name} est un GameInstance : un seul objet pour toute la partie, hors de tout niveau. On le choisit dans Project Settings › Maps & Modes › Game Instance Class.` };
  }
  if (cls.parent === 'ActorComponent') {
    return { ok: false, reason: `${cls.name} est un Actor Component : il ne se pose pas dans le niveau, on l’ajoute dans les Components d’un acteur (+ Add).` };
  }
  if (cls.parent === 'UserWidget') {
    return { ok: false, reason: `${cls.name} est un Widget Blueprint : une interface à l’écran, pas un acteur. On l’affiche pendant le jeu avec Create Widget puis Add to Viewport.` };
  }
  if (!isPlaceableParent(cls.parent)) return { ok: false, reason: `${cls.name} est un Player Controller : le jeu le crée lui-même (Player Controller Class), il ne se pose pas dans le niveau.` };
  const a: LevelActor = {
    id: newId('a'),
    classId,
    name: nextLabel(p, cls.name),
    x: Math.round(x),
    y: Math.round(y),
    yaw: 0,
    overrides: {},
  };
  levelOf(p).actors.push(a);
  return { ok: true, value: a };
}

export function moveActor(p: Project, id: string, x: number, y: number): void {
  const a = levelOf(p).actors.find((x2) => x2.id === id);
  if (a) {
    a.x = x;
    a.y = y;
  }
}

export function snapActor(p: Project, id: string, grid = 10): void {
  const a = levelOf(p).actors.find((x) => x.id === id);
  if (a) {
    a.x = Math.round(a.x / grid) * grid;
    a.y = Math.round(a.y / grid) * grid;
  }
}

export function updateActor(p: Project, id: string, patch: Partial<Pick<LevelActor, 'x' | 'y' | 'yaw' | 'name'>>): void {
  const a = levelOf(p).actors.find((x) => x.id === id);
  if (a) Object.assign(a, patch);
}

/** The root component of a placed actor's Blueprint (inherited ones included), whose Scale is the actor's default. */
function rootOfClass(p: Project, a: LevelActor) {
  const cls = findClass(p, a.classId);
  return cls ? rootComponent(inheritedView(cls, p, true).components.filter(isSceneComponent)) : undefined;
}

/** A placed actor's Scale (Details › Transform): its own, or its Blueprint root's (V7.83). */
export function actorScale(p: Project, a: LevelActor): Scale3 {
  return levelActorScale(a, rootOfClass(p, a)?.props);
}

/** Set a placed actor's Scale; an axis equal to its Blueprint root's is left out, as an unchanged property in UE. */
export function setActorScale(p: Project, id: string, s: Scale3): void {
  const a = levelOf(p).actors.find((x) => x.id === id);
  if (!a) return;
  const base = levelActorScale({}, rootOfClass(p, a)?.props);
  for (const [k, v, b] of [
    ['scaleX', s.x, base.x],
    ['scaleY', s.y, base.y],
    ['scaleZ', s.z, base.z],
  ] as const) {
    if (v === b) delete a[k];
    else a[k] = v;
  }
}

export function setActorOverride(p: Project, id: string, variableId: string, value: Value | undefined): void {
  const a = levelOf(p).actors.find((x) => x.id === id);
  if (!a) return;
  if (value === undefined) delete a.overrides[variableId];
  else a.overrides[variableId] = value;
}

/** An Instance Editable variable of one of the actor's Actor Components, on this placed actor: a value, or back to its Blueprint's (undefined). */
export function setComponentOverride(p: Project, id: string, componentId: string, variableId: string, value: Value | undefined): void {
  const a = levelOf(p).actors.find((x) => x.id === id);
  if (!a) return;
  const own = { ...(a.componentOverrides?.[componentId] ?? {}) };
  if (value === undefined) delete own[variableId];
  else own[variableId] = value;
  a.componentOverrides = { ...(a.componentOverrides ?? {}), [componentId]: own };
  if (!Object.keys(own).length) delete a.componentOverrides[componentId];
  if (!Object.keys(a.componentOverrides).length) delete a.componentOverrides;
}

/** Value stored in an instance's Details for a reference to a placed actor. */
export const actorRefValue = (id: string) => `actor:${id}`;

export function removeActor(p: Project, id: string): void {
  levelOf(p).actors = levelOf(p).actors.filter((a) => a.id !== id);
  // References to it, set in other instances' Details, become None.
  for (const a of levelOf(p).actors) {
    for (const [k, v] of Object.entries(a.overrides)) if (v === actorRefValue(id)) a.overrides[k] = null;
    for (const values of Object.values(a.componentOverrides ?? {})) {
      for (const [k, v] of Object.entries(values)) if (v === actorRefValue(id)) values[k] = null;
    }
  }
}

export function duplicateActor(p: Project, id: string): OpResult<LevelActor> {
  const src = levelOf(p).actors.find((a) => a.id === id);
  if (!src) return { ok: false, reason: 'Acteur introuvable.' };
  const res = placeActor(p, src.classId, src.x + 100, src.y + 100);
  if (res.ok) {
    res.value.yaw = src.yaw;
    res.value.overrides = structuredClone(src.overrides);
    if (src.componentOverrides) res.value.componentOverrides = structuredClone(src.componentOverrides);
  }
  return res;
}

/** A Player Start of the level open in the editor, by its id (MAIN_START_ID: the first one). */
export function findPlayerStart(p: Project, id = MAIN_START_ID): PlayerStartSpot | undefined {
  const level = levelOf(p);
  return id === MAIN_START_ID ? level.playerStart : level.otherStarts?.find((s) => s.id === id);
}

export function movePlayerStart(p: Project, x: number, y: number, id = MAIN_START_ID): void {
  const s = findPlayerStart(p, id);
  if (!s) return;
  s.x = Math.round(x);
  s.y = Math.round(y);
}

/** Details of a Player Start: Location, Rotation, Player Start Tag (an empty tag is None, as UE's Name). */
export function setPlayerStart(p: Project, id: string, patch: Partial<PlayerStartSpot>): OpResult {
  const s = findPlayerStart(p, id);
  if (!s) return { ok: false, reason: 'Player Start introuvable.' };
  if (patch.tag !== undefined) {
    const tag = patch.tag.trim();
    if (tag) s.tag = tag;
    else delete s.tag;
  }
  for (const k of ['x', 'y', 'yaw'] as const) if (patch[k] !== undefined) s[k] = Math.round(patch[k]!);
  return { ok: true, value: undefined };
}

/**
 * Place Actors › Player Start: one more spot where the GameMode may make the
 * player appear (PlayerStart2, PlayerStart3…, as UE labels them).
 */
export function addPlayerStart(p: Project, x: number, y: number): OpResult<PlacedPlayerStart> {
  const level = levelOf(p);
  const taken = new Set(playerStartsOf(level).map((s) => s.name));
  let n = 2;
  while (taken.has(`PlayerStart${n}`)) n++;
  const s: PlacedPlayerStart = { id: newId('ps'), name: `PlayerStart${n}`, x: Math.round(x), y: Math.round(y), yaw: 0 };
  level.otherStarts = [...(level.otherStarts ?? []), s];
  return { ok: true, value: s };
}

/** Delete a Player Start; the first one stays (the app keeps one per level). */
export function removePlayerStart(p: Project, id: string): OpResult {
  const level = levelOf(p);
  if (id === MAIN_START_ID) return { ok: false, reason: 'Le premier Player Start reste : chaque niveau en garde au moins un dans l’appli. Déplace-le plutôt.' };
  if (!level.otherStarts?.some((s) => s.id === id)) return { ok: false, reason: 'Player Start introuvable.' };
  level.otherStarts = level.otherStarts.filter((s) => s.id !== id);
  if (!level.otherStarts.length) delete level.otherStarts;
  return { ok: true, value: undefined };
}
