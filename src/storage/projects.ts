/**
 * The free-play projects (V7.41): several projects, each under a key of its
 * own, listed from what is stored (no separate index to fall out of step).
 *
 * The project saved before the V7.41 keeps its key, `project:sandbox`: it is
 * the project `main`. The others are `project:sandbox:<id>`. Every key starts
 * with `project:`, so the full backup carries them all.
 */
import { newId } from '@core/model/ids';
import type { Project } from '@core/model/project';
import { checkProjectName, copyName, type ProjectSummary, summarizeProjectText, uniqueName } from '@core/projects/list';
import { serializeProject } from '@core/serialization/serialize';
import { createStarterProject } from '@core/templates/starterProject';
import { LEGACY_KEY, SANDBOX_KEY } from './persistence';
import { readStored, removeStored, storedKeys, writeStored } from './storage';

/** The project saved before there were several. */
export const MAIN_ID = 'main';
const PREFIX = `${SANDBOX_KEY}:`;

export const sandboxKey = (id: string = MAIN_ID): string => (id === MAIN_ID ? SANDBOX_KEY : `${PREFIX}${id}`);

/** The project id of a free-play key, or undefined for any other key. */
export function sandboxIdOf(key: string): string | undefined {
  if (key === SANDBOX_KEY || key === LEGACY_KEY) return MAIN_ID;
  return key.startsWith(PREFIX) && key.length > PREFIX.length ? key.slice(PREFIX.length) : undefined;
}

export interface ProjectEntry extends ProjectSummary {
  id: string;
  key: string;
  /** The saved text, kept to export or copy it as it is. */
  text: string;
}

/** Every free-play project, the most recently changed first. Throws when the storage cannot be read. */
export async function listProjects(): Promise<ProjectEntry[]> {
  const keys = await storedKeys();
  const ids = new Set<string>();
  for (const k of keys) {
    const id = sandboxIdOf(k);
    if (id) ids.add(id);
  }
  const entries: ProjectEntry[] = [];
  for (const id of ids) {
    const key = sandboxKey(id);
    // The project of step 1 may still be under its first key.
    const stored = (await readStored(key)) ?? (id === MAIN_ID ? await readStored(LEGACY_KEY) : undefined);
    if (!stored) continue;
    entries.push({ id, key, text: stored.text, ...summarizeProjectText(stored.text, 'Projet sans nom') });
  }
  return entries.sort((a, b) => b.updatedAt - a.updatedAt || a.name.localeCompare(b.name, 'fr'));
}

const names = (list: ProjectEntry[], except?: string) => list.filter((e) => e.id !== except).map((e) => e.name);

async function saveNew(project: Project): Promise<string> {
  const id = newId('sb');
  await writeStored(sandboxKey(id), serializeProject(project));
  return id;
}

/** A new project from the starter project. Returns its id. */
export async function createProject(name: string): Promise<string> {
  const project = createStarterProject();
  project.name = name;
  return saveNew(project);
}

/** A free name for a new project: « Projet 1 », « Projet 2 »… */
export function nextProjectName(list: ProjectEntry[]): string {
  return uniqueName(`Projet ${list.length + 1}`, names(list));
}

/** Adds an imported project to the list (it never replaces one). Returns its id and name. */
export async function importProject(project: Project, list: ProjectEntry[]): Promise<{ id: string; name: string }> {
  project.name = uniqueName(project.name, names(list));
  return { id: await saveNew(project), name: project.name };
}

/** A copy of a project, saved as it is. Returns the id and name of the copy. */
export async function duplicateProject(entry: ProjectEntry, list: ProjectEntry[]): Promise<{ id: string; name: string }> {
  if (entry.damaged) throw new Error('Ce projet est illisible : exporte-le plutôt que de le copier.');
  const file = JSON.parse(entry.text) as { project: Project };
  const name = copyName(entry.name, names(list));
  const now = Date.now();
  file.project = { ...file.project, id: newId('p'), name, createdAt: now, updatedAt: now };
  const id = newId('sb');
  await writeStored(sandboxKey(id), JSON.stringify(file, null, 1));
  return { id, name };
}

/** Renames a project that is not open. Returns an error message, or null when done. */
export async function renameProject(entry: ProjectEntry, raw: string, list: ProjectEntry[]): Promise<string | null> {
  if (entry.damaged) return 'Ce projet est illisible : il ne peut pas être renommé.';
  const checked = checkProjectName(raw, names(list, entry.id));
  if ('error' in checked) return checked.error;
  const file = JSON.parse(entry.text) as { project: Project };
  // The date of the last change stays: renaming does not move the project in the list.
  file.project.name = checked.name;
  await writeStored(entry.key, JSON.stringify(file, null, 1));
  return null;
}

/** Deletes a project for good (its first key too, for the project of step 1). */
export async function deleteProject(entry: ProjectEntry): Promise<void> {
  await removeStored(entry.key);
  if (entry.id === MAIN_ID) await removeStored(LEGACY_KEY);
}

/**
 * Gives a free name to the projects that share one (V7.45: a full backup
 * restored from another device can bring a second « Projet 1 »). The most
 * recently changed keeps its name; the date of the others does not move.
 * Returns how many were renamed.
 */
export async function dedupeProjectNames(): Promise<number> {
  const taken: string[] = [];
  let renamed = 0;
  for (const entry of await listProjects()) {
    const name = entry.damaged ? entry.name : uniqueName(entry.name, taken);
    if (name !== entry.name) {
      const file = JSON.parse(entry.text) as { project: Project };
      file.project.name = name;
      await writeStored(entry.key, JSON.stringify(file, null, 1));
      renamed++;
    }
    taken.push(name);
  }
  return renamed;
}
