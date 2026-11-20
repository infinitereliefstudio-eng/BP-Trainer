/**
 * V7.41: several free-play projects. The project saved before them stays
 * where it was; the others each have a key; create, copy, rename, import and
 * delete never touch another project.
 */
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { createProject as createModel } from '../src/core/model/project';
import { checkProjectName, copyName, summarizeProjectText, uniqueName } from '../src/core/projects/list';
import { sanitizeProgress } from '../src/core/progress/progress';
import { serializeProject } from '../src/core/serialization/serialize';
import { createStarterProject } from '../src/core/templates/starterProject';
import { makeBackup } from '../src/storage/backup';
import { kv } from '../src/storage/idb';
import { LEGACY_KEY, SANDBOX_KEY } from '../src/storage/persistence';
import {
  createProject,
  deleteProject,
  duplicateProject,
  importProject,
  listProjects,
  MAIN_ID,
  nextProjectName,
  renameProject,
  sandboxIdOf,
  sandboxKey,
} from '../src/storage/projects';
import { readStored, writeStored } from '../src/storage/storage';
import { openWorkspace, workspaceKey } from '../src/ui/workspace';

class MemoryStorage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null;
  }
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, String(v));
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  clear() {
    this.map.clear();
  }
}
const local = new MemoryStorage();
(globalThis as Record<string, unknown>).localStorage = local;

beforeEach(async () => {
  for (const k of await kv.keys()) await kv.del(k);
  local.clear();
});

const saved = (name: string, updatedAt = Date.now()) => {
  const p = createModel(name);
  p.updatedAt = updatedAt;
  return serializeProject(p);
};

describe('names and summaries', () => {
  it('reads a project text without opening it', () => {
    const s = summarizeProjectText(saved('Ma lampe', 42), 'x');
    expect(s).toEqual({ name: 'Ma lampe', updatedAt: 42, blueprints: 0 });
    expect(summarizeProjectText('{oops', 'Sans nom').damaged).toBeDefined();
    expect(summarizeProjectText('{"kind":"autre"}', 'Sans nom').damaged).toBeDefined();
  });

  it('keeps names unique, trimmed and short', () => {
    expect(checkProjectName('  Mon   jeu ', [])).toEqual({ name: 'Mon jeu' });
    expect(checkProjectName('   ', [])).toHaveProperty('error');
    expect(checkProjectName('mon jeu', ['Mon jeu'])).toHaveProperty('error');
    expect(checkProjectName('x'.repeat(61), [])).toHaveProperty('error');
    expect(uniqueName('Projet 1', ['Projet 1', 'projet 1 2'])).toBe('Projet 1 3');
    expect(copyName('Porte', ['Porte', 'Porte (copie)'])).toBe('Porte (copie) 2');
  });
});

describe('the free-play projects', () => {
  it('keeps the project saved before the V7.41 under its key, as « main »', async () => {
    await writeStored(SANDBOX_KEY, saved('Mon projet'));
    expect(sandboxKey()).toBe(SANDBOX_KEY);
    expect(sandboxIdOf(SANDBOX_KEY)).toBe(MAIN_ID);
    expect(sandboxIdOf('project:lesson:l1')).toBeUndefined();
    const list = await listProjects();
    expect(list.map((e) => [e.id, e.name])).toEqual([[MAIN_ID, 'Mon projet']]);
    // A sandbox reference with no id still opens it.
    expect(workspaceKey({ kind: 'sandbox' })).toBe(SANDBOX_KEY);
  });

  it('lists the project of step 1 still under its first key', async () => {
    await writeStored(LEGACY_KEY, saved('Ancien'));
    const list = await listProjects();
    expect(list.map((e) => [e.id, e.name])).toEqual([[MAIN_ID, 'Ancien']]);
    await deleteProject(list[0]);
    expect(await listProjects()).toEqual([]);
  });

  it('creates, copies, renames and deletes without touching the others', async () => {
    await writeStored(SANDBOX_KEY, saved('Mon projet', 1000));
    const id = await createProject('La porte');
    expect(workspaceKey({ kind: 'sandbox', projectId: id })).toBe(`project:sandbox:${id}`);
    let list = await listProjects();
    expect(list.map((e) => e.name)).toEqual(['La porte', 'Mon projet']);
    expect(nextProjectName(list)).toBe('Projet 3');

    const door = list.find((e) => e.id === id)!;
    const copy = await duplicateProject(door, list);
    expect(copy.name).toBe('La porte (copie)');
    list = await listProjects();
    expect(list).toHaveLength(3);
    const copied = list.find((e) => e.id === copy.id)!;
    expect(JSON.parse(copied.text).project.id).not.toBe(JSON.parse(door.text).project.id);

    expect(await renameProject(door, 'Mon projet', list)).toMatch(/déjà/);
    expect(await renameProject(door, 'La porte qui grince', list)).toBeNull();
    list = await listProjects();
    expect(list.map((e) => e.name).sort()).toEqual(['La porte (copie)', 'La porte qui grince', 'Mon projet']);

    await deleteProject(list.find((e) => e.id === copy.id)!);
    list = await listProjects();
    expect(list.map((e) => e.name).sort()).toEqual(['La porte qui grince', 'Mon projet']);
    expect(await readStored(sandboxKey(copy.id))).toBeUndefined();
  });

  it('adds an imported project to the list under a free name', async () => {
    await writeStored(SANDBOX_KEY, saved('Mon projet'));
    const { id, name } = await importProject(createModel('Mon projet'), await listProjects());
    expect(name).toBe('Mon projet 2');
    expect(id).not.toBe(MAIN_ID);
    expect((await listProjects()).map((e) => e.name).sort()).toEqual(['Mon projet', 'Mon projet 2']);
  });

  it('opens each project from its own key', async () => {
    await writeStored(SANDBOX_KEY, serializeProject(createStarterProject()));
    const id = await createProject('Autre');
    const opened = await openWorkspace({ kind: 'sandbox', projectId: id });
    expect(opened.ok && opened.workspace.store.project.name).toBe('Autre');
    const main = await openWorkspace({ kind: 'sandbox' });
    expect(main.ok && main.workspace.store.project.name).toBe('Mon premier projet');
  });

  it('lists a damaged project instead of hiding it', async () => {
    await writeStored(sandboxKey('sb_x'), '{abîmé');
    const [entry] = await listProjects();
    expect(entry.damaged).toBeDefined();
    await expect(duplicateProject(entry, [entry])).rejects.toThrow(/illisible/);
    expect(await renameProject(entry, 'Nouveau', [entry])).toMatch(/illisible/);
  });

  it('puts every project in the full backup', async () => {
    await writeStored(SANDBOX_KEY, saved('Mon projet'));
    const id = await createProject('Deuxième');
    const backup = await makeBackup();
    expect(Object.keys(backup.entries)).toEqual(expect.arrayContaining([SANDBOX_KEY, sandboxKey(id)]));
  });

  it('remembers which project was opened last', () => {
    const { progress } = sanitizeProgress({ done: [], last: { kind: 'sandbox', projectId: 'sb_1' } });
    expect(progress.last).toEqual({ kind: 'sandbox', projectId: 'sb_1' });
    expect(sanitizeProgress({ done: [], last: { kind: 'sandbox', projectId: 3 } }).progress.last).toBeUndefined();
  });
});
