/**
 * Workspaces: the free-play project, or one project per lesson. Each has its
 * own save slot; lesson progress is saved separately.
 *
 * Opening never writes over a saved project that could not be read: the
 * workspace is refused (`blocked`), the text is kept, and the learner
 * chooses what to do (export it, start again with the original set aside).
 */
import { getLesson } from '@core/lessons';
import { RULES_VERSION, rulesChangedSince, rulesNotice } from '@core/model/rules';
import type { Project } from '@core/model/project';
import { emptyProgress, sanitizeProgress, type Progress } from '@core/progress/progress';
import { EditorStore } from '@core/store/editorStore';
import { createStarterProject } from '@core/templates/starterProject';
import { loadSavedProject, rescueText, saveProject, SANDBOX_KEY } from '@storage/persistence';
import { readStored, writeStored } from '@storage/storage';

export {
  type LessonHelp,
  withAnswer,
  withCheck,
  withHelp,
  withHelpReset,
  withPassed,
  withoutLog,
  withRead,
  withToday,
  type Progress,
} from '@core/progress/progress';

type ScratchRef =
  /** Another way to solve a lesson, built on its starting project: free to try, never saved. */
  | { kind: 'alternative'; lessonId: string; index: number }
  /** The reference solution of a lesson, as a graph to read: never saved. */
  | { kind: 'solution'; lessonId: string };

export type WorkspaceRef = { kind: 'sandbox' } | { kind: 'lesson'; lessonId: string } | ScratchRef;

export interface Workspace {
  ref: WorkspaceRef;
  store: EditorStore;
  key: string;
}

export interface OpenedWorkspace extends Workspace {
  fresh: boolean;
  /** Things to tell the learner once the workspace is open (rules or lesson changed since). */
  notices: string[];
}

/** A saved project that could not be opened. Nothing has been written over it. */
export interface BlockedWorkspace {
  ref: WorkspaceRef;
  key: string;
  status: 'newer' | 'damaged' | 'unavailable';
  reason: string;
  /** The saved text, kept as it is (absent when the storage did not answer). */
  text?: string;
}

export type OpenResult = { ok: true; workspace: OpenedWorkspace } | { ok: false; blocked: BlockedWorkspace };

export function workspaceKey(ref: WorkspaceRef): string {
  if (ref.kind === 'alternative') return `scratch:alternative:${ref.lessonId}:${ref.index}`;
  if (ref.kind === 'solution') return `scratch:solution:${ref.lessonId}`;
  return ref.kind === 'sandbox' ? SANDBOX_KEY : `project:lesson:${ref.lessonId}`;
}

/** Workspaces that are thrown away when closed. */
export const isScratch = (ref: WorkspaceRef): ref is ScratchRef => ref.kind === 'alternative' || ref.kind === 'solution';

function freshProject(ref: WorkspaceRef): Project {
  if (ref.kind === 'sandbox') return createStarterProject();
  const lesson = getLesson(ref.lessonId);
  if (!lesson) throw new Error(`Unknown lesson ${ref.lessonId}`);
  const project = lesson.setup();
  project.rules = RULES_VERSION;
  project.lessonRevision = lesson.revision ?? 1;
  if (ref.kind === 'alternative') {
    const alt = lesson.alternatives?.[ref.index];
    if (!alt) throw new Error(`Unknown alternative ${ref.index} of ${ref.lessonId}`);
    alt.build(project);
    project.name = `${lesson.title} — ${alt.title}`;
  }
  if (ref.kind === 'solution') {
    lesson.solve(project);
    project.name = `${lesson.title} (solution)`;
  }
  return project;
}

/** The class the solution added the most nodes to: the one worth showing first. */
function mostChangedClass(before: Project, after: Project): string | undefined {
  const count = (p: Project, name: string) =>
    p.classes.find((c) => c.name === name)?.graphs.reduce((n, g) => n + Object.keys(g.nodes).length, 0) ?? 0;
  let best: { id: string; added: number } | undefined;
  for (const cls of after.classes) {
    const added = count(after, cls.name) - count(before, cls.name);
    if (added > 0 && (!best || added > best.added)) best = { id: cls.id, added };
  }
  return best?.id;
}

/** What changed since the saved project was last opened; stamps the current rules on it. */
function noticesFor(ref: WorkspaceRef, project: Project): string[] {
  const notices: string[] = [];
  const rules = rulesNotice(rulesChangedSince(project));
  if (rules) notices.push(rules);
  project.rules = RULES_VERSION;
  const lesson = ref.kind === 'lesson' ? getLesson(ref.lessonId) : undefined;
  const current = lesson?.revision ?? 1;
  if (lesson && (project.lessonRevision ?? 1) < current) {
    notices.push(
      'Cette leçon a été revue depuis que tu l’as commencée (projet de départ ou vérification). Si elle ne passe plus, le bouton « Recommencer la leçon » de la fiche repart de la nouvelle version.',
    );
  }
  if (lesson) project.lessonRevision = current;
  return notices;
}

export async function openWorkspace(ref: WorkspaceRef): Promise<OpenResult> {
  const key = workspaceKey(ref);
  if (isScratch(ref)) {
    const store = new EditorStore(freshProject(ref));
    if (ref.kind === 'solution') {
      const cls = mostChangedClass(getLesson(ref.lessonId)!.setup(), store.project);
      if (cls) store.openClass(cls);
    }
    return { ok: true, workspace: { ref, key, store, fresh: true, notices: [] } };
  }
  const saved = await loadSavedProject(key);
  if (saved.status === 'ok') {
    const notices = noticesFor(ref, saved.project);
    if (notices.length) await saveProject(saved.project, key).catch(() => undefined);
    return { ok: true, workspace: { ref, key, store: new EditorStore(saved.project), fresh: false, notices } };
  }
  if (saved.status === 'absent') {
    const project = freshProject(ref);
    await saveProject(project, key).catch(() => undefined);
    return { ok: true, workspace: { ref, key, store: new EditorStore(project), fresh: true, notices: [] } };
  }
  const text = saved.status === 'unavailable' ? undefined : saved.text;
  return { ok: false, blocked: { ref, key, status: saved.status, reason: saved.reason, text } };
}

/**
 * Starts a blocked workspace again from scratch. The unreadable original is
 * first copied aside (kept in the full backup); if that copy fails, nothing
 * is written and the error is thrown.
 */
export async function startOver(blocked: BlockedWorkspace): Promise<OpenedWorkspace> {
  if (blocked.status === 'unavailable' || blocked.text === undefined) throw new Error('Le stockage ne répond pas : rien n’a été modifié.');
  await rescueText(blocked.key, blocked.text);
  const project = freshProject(blocked.ref);
  await saveProject(project, blocked.key);
  return { ref: blocked.ref, key: blocked.key, store: new EditorStore(project), fresh: true, notices: [] };
}

/** Throw away a lesson's work and start it again from its setup. */
export function resetLesson(ws: Workspace): void {
  if (ws.ref.kind !== 'lesson') return;
  ws.store.replaceProject(freshProject(ws.ref));
}

// ------------------------------------------------------------------ progress

const PROGRESS_KEY = 'progress';

export interface LoadedProgress {
  progress: Progress;
  /**
   * 'repaired': part of the stored progress was unreadable; the original was
   * copied aside, the rest is used. 'unavailable': the storage did not answer,
   * or the original could not be set aside: the progress must not be saved
   * over (it stays in memory only).
   */
  problem?: 'repaired' | 'unavailable';
}

export async function loadProgress(): Promise<LoadedProgress> {
  let stored: { text: string } | undefined;
  try {
    stored = await readStored(PROGRESS_KEY);
  } catch {
    return { progress: emptyProgress(), problem: 'unavailable' };
  }
  if (!stored) return { progress: emptyProgress() };
  let value: unknown;
  try {
    value = JSON.parse(stored.text);
  } catch {
    value = undefined;
  }
  const { progress, complete } = sanitizeProgress(value);
  if (complete) return { progress };
  try {
    await rescueText(PROGRESS_KEY, stored.text);
    return { progress, problem: 'repaired' };
  } catch {
    return { progress, problem: 'unavailable' };
  }
}

/** Saves the progress; rejects when the device refused it (the caller tells the learner). */
export async function saveProgress(p: Progress): Promise<void> {
  await writeStored(PROGRESS_KEY, JSON.stringify(p));
}
