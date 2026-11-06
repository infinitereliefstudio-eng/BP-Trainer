/**
 * Saving: autosave to IndexedDB (falls back to localStorage), plus export
 * and import of a project file, so work survives a cleared browser.
 */
import type { Project } from '@core/model/project';
import { parseProject, serializeProject } from '@core/serialization/serialize';
import type { EditorStore } from '@core/store/editorStore';
import { kv } from './idb';

const KEY = 'current-project';

export async function loadSavedProject(): Promise<Project | null> {
  try {
    const json = await kv.get<string>(KEY);
    if (json) return parseProject(json);
  } catch {
    /* fall through to localStorage */
  }
  try {
    const json = localStorage.getItem(KEY);
    if (json) return parseProject(json);
  } catch {
    /* nothing saved, or unreadable */
  }
  return null;
}

export async function saveProject(p: Project): Promise<void> {
  const json = serializeProject(p);
  try {
    await kv.set(KEY, json);
  } catch {
    localStorage.setItem(KEY, json);
  }
}

/** Save shortly after each model change. Returns an unsubscribe function. */
export function startAutosave(store: EditorStore, delayMs = 700): () => void {
  let timer: number | undefined;
  let warned = false;
  const flush = () => {
    timer = undefined;
    saveProject(store.project).catch(() => {
      if (warned) return;
      warned = true;
      store.warn('Sauvegarde automatique indisponible ici : pense à exporter ton projet (menu ⋮).');
    });
  };
  const unsub = store.subscribe((kind) => {
    if (kind !== 'model') return;
    if (timer !== undefined) clearTimeout(timer);
    timer = window.setTimeout(flush, delayMs);
  });
  const onHide = () => {
    if (document.visibilityState === 'hidden' && timer !== undefined) {
      clearTimeout(timer);
      flush();
    }
  };
  document.addEventListener('visibilitychange', onHide);
  return () => {
    unsub();
    document.removeEventListener('visibilitychange', onHide);
  };
}

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
