/** Level mutators: placing, moving and configuring actor instances. */
import { newId } from '../model/ids';
import { isPlaceableParent, type LevelActor, type Project, levelOf } from '../model/project';
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

export function movePlayerStart(p: Project, x: number, y: number): void {
  levelOf(p).playerStart.x = Math.round(x);
  levelOf(p).playerStart.y = Math.round(y);
}
