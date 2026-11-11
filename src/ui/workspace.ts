/**
 * Workspaces: the free-play project, or one project per lesson. Each has its
 * own save slot; lesson progress is saved separately.
 */
import { getLesson } from '@core/lessons';
import type { Project } from '@core/model/project';
import { answered, dayKey, type ReviewState } from '@core/review/schedule';
import { EditorStore } from '@core/store/editorStore';
import { createStarterProject } from '@core/templates/starterProject';
import { loadJson, loadSavedProject, saveJson, saveProject, SANDBOX_KEY } from '@storage/persistence';

export type WorkspaceRef =
  | { kind: 'sandbox' }
  | { kind: 'lesson'; lessonId: string }
  /** Another way to solve a lesson, built on its starting project: free to try, never saved. */
  | { kind: 'alternative'; lessonId: string; index: number }
  /** The reference solution of a lesson, as a graph to read: never saved. */
  | { kind: 'solution'; lessonId: string };

export interface Workspace {
  ref: WorkspaceRef;
  store: EditorStore;
  key: string;
}

export function workspaceKey(ref: WorkspaceRef): string {
  if (ref.kind === 'alternative') return `scratch:alternative:${ref.lessonId}:${ref.index}`;
  if (ref.kind === 'solution') return `scratch:solution:${ref.lessonId}`;
  return ref.kind === 'sandbox' ? SANDBOX_KEY : `project:lesson:${ref.lessonId}`;
}

/** Workspaces that are thrown away when closed. */
export const isScratch = (ref: WorkspaceRef) => ref.kind === 'alternative' || ref.kind === 'solution';

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

export async function openWorkspace(ref: WorkspaceRef): Promise<Workspace & { fresh: boolean }> {
  const key = workspaceKey(ref);
  if (isScratch(ref)) {
    const store = new EditorStore(freshProject(ref));
    if (ref.kind === 'solution') {
      const cls = mostChangedClass(getLesson(ref.lessonId)!.setup(), store.project);
      if (cls) store.openClass(cls);
    }
    return { ref, key, store, fresh: true };
  }
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
  /** When each lesson was passed: its review question comes a day later. */
  doneAt?: Record<string, number>;
  /** Spaced review: the box and due date of each question already asked. */
  review?: ReviewState;
  /** Memo cards already read (their questions join the review). */
  read?: string[];
  /** Calendar days with some activity, for the streak (the last 400 are kept). */
  days?: string[];
}

/** The progress with today counted as an active day. */
export function withToday(p: Progress, now = Date.now()): Progress {
  const day = dayKey(now);
  if (p.days?.includes(day)) return p;
  return { ...p, days: [...(p.days ?? []), day].slice(-400) };
}

/** The progress once a lesson is passed (unchanged if it already was). */
export function withPassed(p: Progress, lessonId: string, now = Date.now()): Progress {
  if (p.done.includes(lessonId)) return p;
  return withToday({ ...p, done: [...p.done, lessonId], doneAt: { ...p.doneAt, [lessonId]: now } }, now);
}

/** The progress after answering a review question. */
export function withAnswer(p: Progress, questionId: string, right: boolean, now = Date.now()): Progress {
  return withToday({ ...p, review: { ...p.review, [questionId]: answered(p.review?.[questionId], right, now) } }, now);
}

/** The progress once a memo card has been read. */
export function withRead(p: Progress, memoId: string, now = Date.now()): Progress {
  if (p.read?.includes(memoId)) return p;
  return withToday({ ...p, read: [...(p.read ?? []), memoId] }, now);
}

export async function loadProgress(): Promise<Progress> {
  const p = await loadJson<Progress>(PROGRESS_KEY);
  return p && Array.isArray(p.done) ? p : { done: [] };
}

export async function saveProgress(p: Progress): Promise<void> {
  await saveJson(PROGRESS_KEY, p).catch(() => undefined);
}
