/**
 * Lot 1 of the backlog (reliability): saved work is never lost or written
 * over. One test per finding of the review of 17 November (D1 to D8).
 */
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LESSONS } from '../src/core/lessons';
import { createClass, createProject, PROJECT_FORMAT, type Project, levelOf } from '../src/core/model/project';
import { projectRules, RULE_CHANGES, RULES_VERSION, rulesChangedSince } from '../src/core/model/rules';
import { checkProgress, sanitizeProgress } from '../src/core/progress/progress';
import { Simulation } from '../src/core/runtime/simulation';
import { parseProject, serializeProject } from '../src/core/serialization/serialize';
import { EditorStore } from '../src/core/store/editorStore';
import { createStarterProject } from '../src/core/templates/starterProject';
import { BACKUP_KIND, makeBackup, parseBackup, restoreBackup } from '../src/storage/backup';
import { kv } from '../src/storage/idb';
import { flushSaves, loadSavedProject, RESCUE_PREFIX, saveProject, startAutosave } from '../src/storage/persistence';
import { readStored, StorageReadError, storedKeys, writeMany, writeStored } from '../src/storage/storage';
import { loadProgress, openWorkspace, saveProgress, startOver } from '../src/ui/workspace';

// ----------------------------------------------------------- browser shims

class MemoryStorage {
  private map = new Map<string, string>();
  /** Set to make every write throw, like a full or disabled localStorage. */
  refuse = false;
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
    if (this.refuse) throw new Error('QuotaExceededError');
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
const g = globalThis as Record<string, unknown>;
g.localStorage = local;
const doc = new EventTarget() as EventTarget & { visibilityState: string };
doc.visibilityState = 'visible';
g.document ??= doc;
g.window ??= new EventTarget();

async function clearAll() {
  for (const k of await kv.keys()) await kv.del(k);
  local.clear();
  local.refuse = false;
}

beforeEach(clearAll);
afterEach(() => vi.restoreAllMocks());

const projectText = (p: Project = createStarterProject()) => serializeProject(p);
const lessonKey = (id: string) => `project:lesson:${id}`;

// ----------------------------------------------------------------- D1

describe('D1 — a saved project that cannot be read is never written over', () => {
  it('a project from a newer version is refused, kept as it is, and can be rescued', async () => {
    const lesson = LESSONS[0];
    const key = lessonKey(lesson.id);
    const newer = JSON.stringify({ kind: 'bp-trainer-project', format: PROJECT_FORMAT + 1, project: createStarterProject() });
    await writeStored(key, newer);

    const loaded = await loadSavedProject(key);
    expect(loaded.status).toBe('newer');

    const opened = await openWorkspace({ kind: 'lesson', lessonId: lesson.id });
    expect(opened.ok).toBe(false);
    if (opened.ok) return;
    expect(opened.blocked.status).toBe('newer');
    expect((await readStored(key))?.text).toBe(newer);

    const ws = await startOver(opened.blocked);
    expect(ws.fresh).toBe(true);
    const rescued = (await storedKeys()).filter((k) => k.startsWith(`${RESCUE_PREFIX}${key}:`));
    expect(rescued).toHaveLength(1);
    expect((await readStored(rescued[0]))?.text).toBe(newer);
    expect((await loadSavedProject(key)).status).toBe('ok');
  });

  it('a damaged project is refused with a reason, and nothing is written', async () => {
    await writeStored('project:sandbox', '{"kind":"bp-trainer-project","format":8,"project":{"classes":"oops"}}');
    const opened = await openWorkspace({ kind: 'sandbox' });
    expect(opened.ok).toBe(false);
    if (opened.ok) return;
    expect(opened.blocked.status).toBe('damaged');
    expect(opened.blocked.reason).toMatch(/classes/);
    expect((await readStored('project:sandbox'))?.text).toContain('oops');
  });

  it('a storage that does not answer is not taken for an empty one', async () => {
    await saveProject(createStarterProject(), 'project:sandbox');
    vi.spyOn(kv, 'get').mockRejectedValue(new Error('IDB down'));
    await expect(readStored('project:sandbox')).rejects.toBeInstanceOf(StorageReadError);
    const opened = await openWorkspace({ kind: 'sandbox' });
    expect(opened.ok).toBe(false);
    if (!opened.ok) expect(opened.blocked.status).toBe('unavailable');
    vi.restoreAllMocks();
    expect((await loadSavedProject('project:sandbox')).status).toBe('ok');
  });

  it('an absent project is created and saved', async () => {
    const opened = await openWorkspace({ kind: 'sandbox' });
    expect(opened.ok && opened.workspace.fresh).toBe(true);
    expect((await loadSavedProject('project:sandbox')).status).toBe('ok');
  });
});

// ----------------------------------------------------------------- D2

describe('D2 — one storage policy: the newest copy wins', () => {
  it('a copy written to localStorage after a refused IndexedDB write is not hidden by the older IndexedDB value', async () => {
    await writeStored('project:x', 'v1');
    const set = vi.spyOn(kv, 'set').mockRejectedValue(new Error('refused'));
    expect(await writeStored('project:x', 'v2')).toBe('local');
    expect((await readStored('project:x'))?.text).toBe('v2');
    set.mockRestore();
    // The full backup exports the newest copy too.
    expect((await makeBackup()).entries['project:x']).toBe('v2');
    // Once IndexedDB accepts writes again, its copy is the newest and localStorage is cleared.
    expect(await writeStored('project:x', 'v3')).toBe('idb');
    expect((await readStored('project:x'))?.text).toBe('v3');
    expect(local.getItem('project:x')).toBeNull();
  });

  it('reads values saved before revisions existed (plain strings)', async () => {
    await kv.set('progress', '{"done":["a"]}');
    expect((await readStored('progress'))?.text).toBe('{"done":["a"]}');
  });

  it('rejects when neither store accepts the write', async () => {
    vi.spyOn(kv, 'set').mockRejectedValue(new Error('refused'));
    local.refuse = true;
    await expect(writeStored('project:x', 'v1')).rejects.toThrow();
  });
});

// ----------------------------------------------------------------- D3

describe('D3 — imports are checked completely before anything is written', () => {
  const withClasses = (mutate: (p: Project) => void) => {
    const p = createStarterProject();
    mutate(p);
    return serializeProject(p);
  };

  it('refuses a Blueprint without any graph', () => {
    expect(() => parseProject(withClasses((p) => (p.classes[0].graphs = [])))).toThrow(/aucun graphe/);
  });

  it('refuses ill-formed nodes, classes, assets and level', () => {
    expect(() => parseProject(withClasses((p) => (p.classes[0].parent = 'Banana' as never)))).toThrow(/parente/);
    expect(() => parseProject(withClasses((p) => (p.classes = [])))).toThrow(/aucun Blueprint/);
    expect(() => parseProject(withClasses((p) => ((levelOf(p) as unknown as Record<string, unknown>).actors = 3)))).toThrow(/actors/);
    expect(() => parseProject(withClasses((p) => {
          p.classes.push({ ...p.classes[0] });
        }))).toThrow(/même identifiant/);
    expect(() => parseProject(withClasses((p) => ((p.dataTables as unknown) = [{ id: 't', name: 'T', rows: [] }])))).toThrow(/structure/);
    expect(() =>
      parseProject(
        withClasses((p) => {
          const graph = p.classes[0].graphs[0];
          graph.nodes.n = { id: 'n', def: 'flow.branch', x: 'left' as never, y: 0, config: {}, defaults: {} };
        }),
      ),
    ).toThrow(/nombre/);
  });

  it('repairs what can safely be dropped: a wire to a missing node, an actor of a missing class', () => {
    const text = withClasses((p) => {
      const graph = p.classes[0].graphs[0];
      graph.links.l = { id: 'l', from: { node: 'nowhere', pin: 'then' }, to: { node: 'nowhere2', pin: 'exec' } };
      levelOf(p).actors.push({ id: 'a', classId: 'gone', name: 'Ghost', x: 0, y: 0, yaw: 0, overrides: {} });
      (p as unknown as { playerClassId: string }).playerClassId = 'gone';
    });
    const p = parseProject(text);
    expect(p.classes[0].graphs[0].links.l).toBeUndefined();
    expect(levelOf(p).actors.some((a) => a.classId === 'gone')).toBe(false);
    expect('playerClassId' in p).toBe(false);
  });

  it('every lesson, alternative and reference solution goes through the check unchanged', () => {
    for (const lesson of LESSONS) {
      const projects = [lesson.setup()];
      const solved = lesson.setup();
      lesson.solve(solved);
      projects.push(solved);
      for (const alt of lesson.alternatives ?? []) {
        const p = lesson.setup();
        alt.build(p);
        projects.push(p);
      }
      for (const p of projects) {
        const text = serializeProject(p);
        expect(serializeProject(parseProject(text)), lesson.id).toBe(text);
      }
    }
  });

  it('refuses a backup whose progress is ill-formed, without writing anything', async () => {
    const bad = JSON.stringify({ kind: BACKUP_KIND, format: 1, entries: { progress: JSON.stringify({ done: [], read: 17 }) } });
    expect(() => parseBackup(bad)).toThrow(/read/);
    const badProject = JSON.stringify({
      kind: BACKUP_KIND,
      format: 1,
      entries: { 'project:sandbox': withClasses((p) => (p.classes[0].graphs = [])) },
    });
    expect(() => parseBackup(badProject)).toThrow(/aucun graphe/);
    expect(await storedKeys()).toEqual([]);
  });

  it('checks a progress field by field', () => {
    expect(checkProgress({ done: ['a'], read: ['m'], days: ['2026-11-18'] })).toEqual([]);
    expect(checkProgress({ done: [], read: 17 })).toHaveLength(1);
    expect(checkProgress({ done: 'a' })).toHaveLength(1);
    expect(checkProgress({ done: [], review: { q: { box: 'x', due: 1 } } })).toHaveLength(1);
    const kept = sanitizeProgress({ done: ['a'], read: 17, days: ['d'] });
    expect(kept).toEqual({ progress: { done: ['a'], days: ['d'] }, complete: false });
  });
});

// ----------------------------------------------------------------- D4

describe('D4 — closing a workspace saves at once, and reopening reads that save', () => {
  it('a change followed by an immediate close and reopen is not lost', async () => {
    const opened = await openWorkspace({ kind: 'sandbox' });
    if (!opened.ok) throw new Error('not opened');
    const { store, key } = opened.workspace;
    const stop = startAutosave(store, key, 10_000);
    store.project.name = 'Changé juste avant de fermer';
    store.notify('model');
    stop();
    const again = await loadSavedProject(key);
    expect(again.status === 'ok' && again.project.name).toBe('Changé juste avant de fermer');
  });

  it('flushSaves writes what an autosave still had waiting', async () => {
    const store = new EditorStore(createStarterProject());
    const stop = startAutosave(store, 'project:sandbox', 10_000);
    store.project.name = 'En attente';
    store.notify('model');
    await flushSaves();
    const saved = await loadSavedProject('project:sandbox');
    expect(saved.status === 'ok' && saved.project.name).toBe('En attente');
    stop();
  });
});

// ----------------------------------------------------------------- D5

describe('D5 — save slots written during Play are kept at once', () => {
  it('the simulation reports each slot write, and the autosave keeps it without Stop', async () => {
    const p = createProject();
    p.classes.push(createClass('BP_Jeu'), createClass('SG_Partie', 'SaveGame'));
    const store = new EditorStore(p);
    const stop = startAutosave(store, 'project:sandbox', 10_000);
    p.saveSlots = {};
    let told = 0;
    const sim = new Simulation(structuredClone(p), {
      slots: p.saveSlots,
      onSlotsChanged: () => {
        told++;
        store.slotsWritten();
      },
    });
    const save = sim.createSaveGame(p.classes[1].id);
    expect(save).not.toBeNull();
    sim.saveGame(save!, 'Slot1', 0);
    expect(told).toBe(1);
    await flushSaves();
    const saved = await loadSavedProject('project:sandbox');
    expect(saved.status === 'ok' && Object.keys(saved.project.saveSlots ?? {})).toEqual(['Slot1|0']);
    sim.deleteSave('Slot1', 0);
    expect(told).toBe(2);
    stop();
  });
});

// ----------------------------------------------------------------- D6, D8

describe('D6 and D8 — writes are done when committed, and a restore is all or nothing', () => {
  it('a transaction that fails keeps none of its writes', async () => {
    await expect(kv.putMany([['a', 'x'], ['b', () => 1]])).rejects.toBeDefined();
    expect(await kv.get('a')).toBeUndefined();
  });

  it('a restore that the device refuses leaves the stored data as it was', async () => {
    await writeStored('progress', '{"done":["avant"]}');
    vi.spyOn(kv, 'putMany').mockRejectedValue(new Error('refused'));
    local.setItem('project:sandbox', 'ancien');
    local.refuse = true;
    await expect(writeMany({ progress: '{"done":["après"]}', 'project:sandbox': projectText() })).rejects.toThrow();
    local.refuse = false;
    expect((await readStored('progress'))?.text).toBe('{"done":["avant"]}');
    expect(local.getItem('project:sandbox')).toBe('ancien');
  });

  it('a full backup keeps the copies set aside, and restores everything at once', async () => {
    const text = projectText();
    await writeStored('progress', JSON.stringify({ done: ['l01-bonjour'] }));
    await writeStored('project:sandbox', text);
    await writeStored(`${RESCUE_PREFIX}project:sandbox:2026`, '{broken');
    await writeStored('something-else', 'x');
    const backup = await makeBackup();
    expect(Object.keys(backup.entries)).toEqual(['progress', 'project:sandbox', `${RESCUE_PREFIX}project:sandbox:2026`]);
    await clearAll();
    expect(await restoreBackup(parseBackup(JSON.stringify(backup)))).toBe(3);
    expect((await readStored('project:sandbox'))?.text).toBe(text);
    expect((await readStored(`${RESCUE_PREFIX}project:sandbox:2026`))?.text).toBe('{broken');
  });

  it('a restore goes through the write queue: a save asked for during it lands after it, and a read waits for it (V7.26)', async () => {
    await writeStored('progress', '{"done":["avant"]}');
    const restore = writeMany({ progress: '{"done":["restauré"]}' });
    const read = readStored('progress');
    const save = writeStored('progress', '{"done":["après"]}');
    await Promise.all([restore, save]);
    expect((await read)?.text).toBe('{"done":["restauré"]}');
    expect((await readStored('progress'))?.text).toBe('{"done":["après"]}');
  });
});

// ----------------------------------------------------------------- D7

describe('D7 — the progress: saving errors are reported, unreadable parts are set aside', () => {
  it('saveProgress rejects when the device refuses it', async () => {
    vi.spyOn(kv, 'set').mockRejectedValue(new Error('refused'));
    local.refuse = true;
    await expect(saveProgress({ done: ['a'] })).rejects.toThrow();
  });

  it('a partly damaged progress keeps what is usable, and the original is copied aside', async () => {
    const original = JSON.stringify({ done: ['l01'], read: 17 });
    await writeStored('progress', original);
    const loaded = await loadProgress();
    expect(loaded).toEqual({ progress: { done: ['l01'] }, problem: 'repaired' });
    const rescue = (await storedKeys()).find((k) => k.startsWith(`${RESCUE_PREFIX}progress:`));
    expect(rescue && (await readStored(rescue))?.text).toBe(original);
  });

  it('a progress that cannot be read is reported as such, not as empty', async () => {
    vi.spyOn(kv, 'get').mockRejectedValue(new Error('IDB down'));
    expect((await loadProgress()).problem).toBe('unavailable');
  });
});

// ------------------------------------------------- rules and lesson revisions

describe('versions of the simulation rules and of the lessons', () => {
  it('new projects are made under the current rules', () => {
    expect(createProject().rules).toBe(RULES_VERSION);
    expect(rulesChangedSince(createProject())).toEqual([]);
  });

  it('guesses the rules of older projects from their last save', () => {
    const before = RULE_CHANGES[0].since - 1;
    expect(projectRules({ updatedAt: before })).toBe(1);
    expect(projectRules({ updatedAt: RULE_CHANGES[0].since + 1 })).toBe(2);
    expect(projectRules({ updatedAt: Date.now() })).toBe(RULES_VERSION);
    expect(rulesChangedSince({ updatedAt: before }).map((c) => c.version)).toEqual(RULE_CHANGES.map((c) => c.version));
  });

  it('tells the learner once when a saved project predates a rule change', async () => {
    const p = createStarterProject();
    delete p.rules;
    p.updatedAt = RULE_CHANGES[0].since - 1000;
    await saveProject(p, 'project:sandbox');
    const first = await openWorkspace({ kind: 'sandbox' });
    expect(first.ok && first.workspace.notices.length).toBe(1);
    expect(first.ok && first.workspace.notices[0]).toMatch(/Consume Input/);
    const second = await openWorkspace({ kind: 'sandbox' });
    expect(second.ok && second.workspace.notices).toEqual([]);
  });

  it('tells the learner when a lesson was revised after they started it', async () => {
    const lesson = LESSONS[0];
    const opened = await openWorkspace({ kind: 'lesson', lessonId: lesson.id });
    if (!opened.ok) throw new Error('not opened');
    expect(opened.workspace.store.project.lessonRevision).toBe(1);
    const was = lesson.revision;
    lesson.revision = 2;
    try {
      const again = await openWorkspace({ kind: 'lesson', lessonId: lesson.id });
      expect(again.ok && again.workspace.notices.join(' ')).toMatch(/revue/);
    } finally {
      lesson.revision = was;
    }
  });
});
