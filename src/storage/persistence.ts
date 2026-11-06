/**
 * Saving: autosave to IndexedDB (falls back to localStorage), plus export
 * and import of a project file, so work survives a cleared browser.
 */
import type { Project } from '@core/model/project';
import { parseProject, serializeProject } from '@core/serialization/serialize';
import type { EditorStore } from '@core/store/editorStore';
import { kv } from './idb';

/** Key of the free-play project; step 1 saved it under 'current-project'. */
export const SANDBOX_KEY = 'project:sandbox';
const LEGACY_KEY = 'current-project';

async function readText(key: string): Promise<string | undefined> {
  try {
    const json = await kv.get<string>(key);
    if (json) return json;
  } catch {
    /* fall through to localStorage */
  }
  try {
    return localStorage.getItem(key) ?? undefined;
  } catch {
    return undefined;
  }
}

async function writeText(key: string, json: string): Promise<void> {
  try {
    await kv.set(key, json);
  } catch {
    localStorage.setItem(key, json);
  }
}

export async function loadSavedProject(key = SANDBOX_KEY): Promise<Project | null> {
  let json = await readText(key);
  if (!json && key === SANDBOX_KEY) json = await readText(LEGACY_KEY);
  if (!json) return null;
  try {
    return parseProject(json);
  } catch {
    return null;
  }
}

export async function saveProject(p: Project, key = SANDBOX_KEY): Promise<void> {
  await writeText(key, serializeProject(p));
}

export async function loadJson<T>(key: string): Promise<T | undefined> {
  const text = await readText(key);
  if (!text) return undefined;
  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined;
  }
}

export async function saveJson(key: string, value: unknown): Promise<void> {
  await writeText(key, JSON.stringify(value));
}

/** Save shortly after each model change. Returns an unsubscribe function. */
export function startAutosave(store: EditorStore, key = SANDBOX_KEY, delayMs = 700): () => void {
  let timer: number | undefined;
  let warned = false;
  const flush = () => {
    timer = undefined;
    saveProject(store.project, key).catch(() => {
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
