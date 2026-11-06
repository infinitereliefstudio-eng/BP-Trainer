/** Level mutators: placing, moving and configuring actor instances. */
import { newId } from '../model/ids';
import type { LevelActor, Project } from '../model/project';
import type { Value } from '../types/values';
import type { OpResult } from './graphOps';

/** UE-style labels in the level: BP_Lampe, BP_Lampe2, BP_Lampe3… */
function nextLabel(p: Project, base: string): string {
  const taken = new Set(p.level.actors.map((a) => a.name));
  if (!taken.has(base)) return base;
  for (let i = 2; ; i++) if (!taken.has(`${base}${i}`)) return `${base}${i}`;
}

export function placeActor(p: Project, classId: string, x: number, y: number): OpResult<LevelActor> {
  const cls = p.classes.find((c) => c.id === classId);
  if (!cls) return { ok: false, reason: 'Blueprint introuvable.' };
  const a: LevelActor = {
    id: newId('a'),
    classId,
    name: nextLabel(p, cls.name),
    x: Math.round(x),
    y: Math.round(y),
    yaw: 0,
    overrides: {},
  };
  p.level.actors.push(a);
  return { ok: true, value: a };
}

export function moveActor(p: Project, id: string, x: number, y: number): void {
  const a = p.level.actors.find((x2) => x2.id === id);
  if (a) {
    a.x = x;
    a.y = y;
  }
}

export function snapActor(p: Project, id: string, grid = 10): void {
  const a = p.level.actors.find((x) => x.id === id);
  if (a) {
    a.x = Math.round(a.x / grid) * grid;
    a.y = Math.round(a.y / grid) * grid;
  }
}

export function updateActor(p: Project, id: string, patch: Partial<Pick<LevelActor, 'x' | 'y' | 'yaw' | 'name'>>): void {
  const a = p.level.actors.find((x) => x.id === id);
  if (a) Object.assign(a, patch);
}

export function setActorOverride(p: Project, id: string, variableId: string, value: Value | undefined): void {
  const a = p.level.actors.find((x) => x.id === id);
  if (!a) return;
  if (value === undefined) delete a.overrides[variableId];
  else a.overrides[variableId] = value;
}

export function removeActor(p: Project, id: string): void {
  p.level.actors = p.level.actors.filter((a) => a.id !== id);
}

export function duplicateActor(p: Project, id: string): OpResult<LevelActor> {
  const src = p.level.actors.find((a) => a.id === id);
  if (!src) return { ok: false, reason: 'Acteur introuvable.' };
  const res = placeActor(p, src.classId, src.x + 100, src.y + 100);
  if (res.ok) {
    res.value.yaw = src.yaw;
    res.value.overrides = structuredClone(src.overrides);
  }
  return res;
}

export function movePlayerStart(p: Project, x: number, y: number): void {
  p.level.playerStart.x = Math.round(x);
  p.level.playerStart.y = Math.round(y);
}
