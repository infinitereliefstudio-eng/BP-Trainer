/** V7.46: several levels per project (UE's Level assets), format 14. */
import { describe, expect, it } from 'vitest';
import { LESSONS } from '../src/core/lessons';
import { runLesson } from '../src/core/lessons/runner';
import { createClass, createProject, defaultLevel, findLevelByName, levelOf, MAIN_LEVEL_NAME, PROJECT_FORMAT, type Project } from '../src/core/model/project';
import { addLevel, removeLevel, renameLevel, setGameDefaultMap } from '../src/core/operations/levelAssetOps';
import { placeActor } from '../src/core/operations/levelOps';
import { removeClass } from '../src/core/operations/projectOps';
import { Simulation } from '../src/core/runtime/simulation';
import { parseProject, serializeProject } from '../src/core/serialization/serialize';
import { EditorStore } from '../src/core/store/editorStore';
import { createStarterProject } from '../src/core/templates/starterProject';

function withLamp(): { p: Project; lamp: string } {
  const p = createProject();
  const cls = createClass('BP_Lampe');
  p.classes.push(cls);
  return { p, lamp: cls.id };
}

/** The project as a format-13 file wrote it: one `level`, no `levels`. */
function asFormat13(p: Project): string {
  const old = structuredClone(p) as unknown as Record<string, unknown>;
  old.level = { actors: p.levels[0].actors, playerStart: p.levels[0].playerStart };
  delete old.levels;
  delete old.mapsModes;
  delete old.editorLevelId;
  old.format = 13;
  return JSON.stringify({ kind: 'bp-trainer-project', format: 13, project: old });
}

describe('format 14: a project has levels', () => {
  it('starts with Lvl_Principal, the Game Default Map', () => {
    const p = createProject();
    expect(PROJECT_FORMAT).toBeGreaterThanOrEqual(14);
    expect(p.levels.map((l) => l.name)).toEqual([MAIN_LEVEL_NAME]);
    expect(defaultLevel(p)).toBe(p.levels[0]);
    expect(levelOf(p)).toBe(p.levels[0]);
  });

  it('turns the one level of an older project into Lvl_Principal, actors and Player Start kept', () => {
    const { p, lamp } = withLamp();
    placeActor(p, lamp, 120, -40);
    levelOf(p).playerStart = { x: -300, y: 10, yaw: 90 };
    const back = parseProject(asFormat13(p));
    expect(back.format).toBe(PROJECT_FORMAT);
    expect(back.levels).toHaveLength(1);
    expect(back.levels[0].name).toBe('Lvl_Principal');
    expect(back.levels[0].actors.map((a) => [a.name, a.x, a.y])).toEqual([['BP_Lampe', 120, -40]]);
    expect(back.levels[0].playerStart).toEqual({ x: -300, y: 10, yaw: 90 });
    expect(back.mapsModes?.gameDefaultMap).toBe(back.levels[0].id);
    expect('level' in back).toBe(false);
  });

  it('keeps every level, the open one and the Game Default Map through a save', () => {
    const { p, lamp } = withLamp();
    const b = addLevel(p, 'Lvl_Couloir');
    if (!b.ok) throw new Error(b.reason);
    p.editorLevelId = b.value.id;
    placeActor(p, lamp, 0, 0);
    setGameDefaultMap(p, b.value.id);
    const back = parseProject(serializeProject(p));
    expect(back.levels.map((l) => [l.name, l.actors.length])).toEqual([
      ['Lvl_Principal', 0],
      ['Lvl_Couloir', 1],
    ]);
    expect(levelOf(back).name).toBe('Lvl_Couloir');
    expect(defaultLevel(back).name).toBe('Lvl_Couloir');
  });

  it('refuses two levels of the same name, repairs a lost open level or Game Default Map', () => {
    const { p } = withLamp();
    addLevel(p, 'Lvl_B');
    const twin = structuredClone(p);
    twin.levels[1].name = 'lvl_principal';
    expect(() => parseProject(serializeProject(twin))).toThrow(/Lvl_Principal|lvl_principal/);
    const lost = structuredClone(p);
    lost.editorLevelId = 'nowhere';
    lost.mapsModes = { gameDefaultMap: 'nowhere' };
    const back = parseProject(serializeProject(lost));
    expect(back.editorLevelId).toBeUndefined();
    expect(back.mapsModes?.gameDefaultMap).toBe(back.levels[0].id);
  });
});

describe('levels as assets', () => {
  it('adds levels with unique names in the assets’ shared namespace, without spaces', () => {
    const { p } = withLamp();
    expect(addLevel(p, 'Lvl_B').ok).toBe(true);
    const again = addLevel(p, 'Lvl_B');
    expect(again.ok && again.value.name).toBe('Lvl_B_0');
    expect(addLevel(p, 'Mon niveau').ok).toBe(false);
    const clash = renameLevel(p, p.levels[1].id, 'BP_Lampe');
    expect(clash.ok).toBe(false);
    expect(renameLevel(p, p.levels[1].id, 'Lvl_Atelier').ok).toBe(true);
    expect(findLevelByName(p, 'lvl_atelier')?.id).toBe(p.levels[1].id);
  });

  it('keeps at least one level, never deletes the open one, moves the Game Default Map', () => {
    const { p } = withLamp();
    const main = p.levels[0].id;
    expect(removeLevel(p, main, main).ok).toBe(false);
    const b = addLevel(p, 'Lvl_B');
    if (!b.ok) throw new Error(b.reason);
    setGameDefaultMap(p, b.value.id);
    const refused = removeLevel(p, b.value.id, b.value.id);
    expect(refused.ok).toBe(false);
    expect(removeLevel(p, b.value.id, main).ok).toBe(true);
    expect(p.levels).toHaveLength(1);
    expect(p.mapsModes?.gameDefaultMap).toBe(main);
  });

  it('removes a deleted Blueprint’s actors from every level', () => {
    const { p, lamp } = withLamp();
    p.classes.push(createClass('BP_Porte'));
    placeActor(p, lamp, 0, 0);
    const b = addLevel(p, 'Lvl_B');
    if (!b.ok) throw new Error(b.reason);
    p.editorLevelId = b.value.id;
    placeActor(p, lamp, 50, 0);
    expect(p.levels.map((l) => l.actors.length)).toEqual([1, 1]);
    expect(removeClass(p, lamp).ok).toBe(true);
    expect(p.levels.map((l) => l.actors.length)).toEqual([0, 0]);
  });

  it('opens a level in the editor without an undo step', () => {
    const store = new EditorStore(createStarterProject());
    const b = store.applyProject('Créer un niveau', (p) => addLevel(p, 'Lvl_B'));
    if (!b.ok) throw new Error(b.reason);
    store.openLevel(b.value.id);
    expect(levelOf(store.project).name).toBe('Lvl_B');
    store.undo();
    expect(store.project.levels.map((l) => l.name)).toEqual(['Lvl_Principal']);
    expect(levelOf(store.project).name).toBe('Lvl_Principal');
  });
});

describe('Play and the checks', () => {
  it('Play plays the level open in the editor, with its own actors and Player Start', () => {
    const { p, lamp } = withLamp();
    placeActor(p, lamp, 0, 0);
    const b = addLevel(p, 'Lvl_B');
    if (!b.ok) throw new Error(b.reason);
    b.value.playerStart = { x: 500, y: 200, yaw: 0 };
    p.editorLevelId = b.value.id;
    const sim = new Simulation(p);
    expect(sim.level.name).toBe('Lvl_B');
    expect(sim.actors).toHaveLength(0);
    expect([sim.player.x, sim.player.y]).toEqual([500, 200]);
    expect(new Simulation(p, { levelId: p.levels[0].id }).actors).toHaveLength(1);
  });

  it('checks a lesson in its Game Default Map, whatever level the editor shows', () => {
    const lesson = LESSONS[0];
    const p = lesson.setup();
    lesson.solve(p);
    const b = addLevel(p, 'Lvl_Brouillon');
    if (!b.ok) throw new Error(b.reason);
    p.editorLevelId = b.value.id;
    expect(runLesson(lesson, p).passed).toBe(true);
  });
});
