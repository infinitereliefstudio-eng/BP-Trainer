/**
 * Saving projects: autosave (through storage.ts, the single storage policy),
 * plus export and import of a project file, so work survives a cleared browser.
 *
 * A saved project that cannot be read is never taken for "nothing saved":
 * loadSavedProject says why, and keeps the text so that it can be rescued.
 */
import type { Project } from '@core/model/project';
import { parseProject, ProjectFileError, serializeProject } from '@core/serialization/serialize';
import type { EditorStore } from '@core/store/editorStore';
import { readStored, settled, StorageReadError, writeStored } from './storage';

/** Key of the free-play project; step 1 saved it under 'current-project'. */
export const SANDBOX_KEY = 'project:sandbox';
const LEGACY_KEY = 'current-project';

/** Where an unreadable saved text is copied before anything else is written. */
export const RESCUE_PREFIX = 'rescue:';

export type LoadResult =
  | { status: 'absent' }
  | { status: 'ok'; project: Project }
  /** Saved by a newer version of the app. */
  | { status: 'newer'; reason: string; text: string }
  /** Saved, but not a readable project. */
  | { status: 'damaged'; reason: string; text: string }
  /** The storage itself did not answer. */
  | { status: 'unavailable'; reason: string };

export async function loadSavedProject(key = SANDBOX_KEY): Promise<LoadResult> {
  let stored: { text: string } | undefined;
  try {
    stored = await readStored(key);
    if (!stored && key === SANDBOX_KEY) stored = await readStored(LEGACY_KEY);
  } catch (e) {
    return { status: 'unavailable', reason: e instanceof StorageReadError ? e.message : String(e) };
  }
  if (!stored) return { status: 'absent' };
  try {
    return { status: 'ok', project: parseProject(stored.text) };
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    const newer = e instanceof ProjectFileError && e.kind === 'newer';
    return { status: newer ? 'newer' : 'damaged', reason, text: stored.text };
  }
}

export async function saveProject(p: Project, key = SANDBOX_KEY): Promise<void> {
  await writeStored(key, serializeProject(p));
}

/** Keeps a copy of a text that could not be opened, under a key of its own. Returns that key. */
export async function rescueText(key: string, text: string, now = new Date()): Promise<string> {
  const rescueKey = `${RESCUE_PREFIX}${key}:${now.toISOString()}`;
  await writeStored(rescueKey, text);
  return rescueKey;
}

// ----------------------------------------------------------------- autosave

/** Flushers of the autosaves running now. */
const flushers = new Set<() => void>();

/** Saves at once what every autosave still had waiting, and waits for every write to finish. */
export async function flushSaves(): Promise<void> {
  for (const flush of flushers) flush();
  await settled();
}

/**
 * Save shortly after each model change (and each change of the save slots,
 * even during Play). Leaving the app or closing the workspace saves at once.
 * Returns the function that stops it, after a last save.
 */
export function startAutosave(store: EditorStore, key = SANDBOX_KEY, delayMs = 700): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let warned = false;
  const save = () => {
    timer = undefined;
    saveProject(store.project, key).then(
      () => {
        warned = false;
      },
      () => {
        if (warned) return;
        warned = true;
        store.warn('Sauvegarde automatique impossible sur cet appareil : pense à exporter ton projet (menu ⋮).');
      },
    );
  };
  const flush = () => {
    if (timer === undefined) return;
    clearTimeout(timer);
    save();
  };
  const unsub = store.subscribe((kind) => {
    if (kind !== 'model' && kind !== 'slots') return;
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(save, delayMs);
  });
  const onHide = () => {
    if (document.visibilityState === 'hidden') flush();
  };
  document.addEventListener('visibilitychange', onHide);
  window.addEventListener('pagehide', flush);
  flushers.add(flush);
  return () => {
    unsub();
    document.removeEventListener('visibilitychange', onHide);
    window.removeEventListener('pagehide', flush);
    flushers.delete(flush);
    flush();
  };
}

// ----------------------------------------------------------- project files

export function exportProject(p: Project): void {
  const blob = new Blob([serializeProject(p)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safe = p.name.replace(/[^\w-]+/g, '_') || 'projet';
  a.href = url;
  a.download = `${safe}.bptrainer.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Ask the user for a project file and parse it. */
export function pickProjectFile(): Promise<Project | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      try {
        resolve(parseProject(await file.text()));
      } catch (e) {
        reject(e);
      }
    };
    input.click();
  });
}
