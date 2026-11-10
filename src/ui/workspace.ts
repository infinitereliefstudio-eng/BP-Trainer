/**
 * Workspaces: the free-play project, or one project per lesson. Each has its
 * own save slot; lesson progress is saved separately.
 */
import { getLesson } from '@core/lessons';
import type { Project } from '@core/model/project';
import { EditorStore } from '@core/store/editorStore';
import { createStarterProject } from '@core/templates/starterProject';
import { loadJson, loadSavedProject, saveJson, saveProject, SANDBOX_KEY } from '@storage/persistence';

export type WorkspaceRef =
  | { kind: 'sandbox' }
  | { kind: 'lesson'; lessonId: string }
  /** Another way to solve a lesson, built on its starting project: free to try, never saved. */
  | { kind: 'alternative'; lessonId: string; index: number };

export interface Workspace {
  ref: WorkspaceRef;
  store: EditorStore;
  key: string;
}

export function workspaceKey(ref: WorkspaceRef): string {
  if (ref.kind === 'alternative') return `scratch:alternative:${ref.lessonId}:${ref.index}`;
  return ref.kind === 'sandbox' ? SANDBOX_KEY : `project:lesson:${ref.lessonId}`;
}

/** Workspaces that are thrown away when closed. */
export const isScratch = (ref: WorkspaceRef) => ref.kind === 'alternative';

function freshProject(ref: WorkspaceRef): Project {
  if (ref.kind === 'sandbox') return createStarterProject();
  const lesson = getLesson(ref.lessonId);
  if (!lesson) throw new Error(`Unknown lesson ${ref.lessonId}`);
  const project = lesson.setup();
  if (ref.kind === 'alternative') {
    const alt = lesson.alternatives?.[ref.index];
    if (!alt) throw new Error(`Unknown alternative ${ref.index} of ${ref.lessonId}`);
    alt.build(project);
    project.name = `${lesson.title} — ${alt.title}`;
  }
  return project;
}

export async function openWorkspace(ref: WorkspaceRef): Promise<Workspace & { fresh: boolean }> {
  const key = workspaceKey(ref);
  if (isScratch(ref)) return { ref, key, store: new EditorStore(freshProject(ref)), fresh: true };
  const saved = await loadSavedProject(key);
  const project = saved ?? freshProject(ref);
  if (!saved) await saveProject(project, key).catch(() => undefined);
  return { ref, key, store: new EditorStore(project), fresh: !saved };
}

/** Throw away a lesson's work and start it again from its setup. */
export function resetLesson(ws: Workspace): void {
  if (ws.ref.kind !== 'lesson') return;
  ws.store.replaceProject(freshProject(ws.ref));
}

// ------------------------------------------------------------------ progress

const PROGRESS_KEY = 'progress';

export interface Progress {
  done: string[];
  last?: WorkspaceRef;
}

export async function loadProgress(): Promise<Progress> {
  return (await loadJson<Progress>(PROGRESS_KEY)) ?? { done: [] };
}

export async function saveProgress(p: Progress): Promise<void> {
  await saveJson(PROGRESS_KEY, p).catch(() => undefined);
}
