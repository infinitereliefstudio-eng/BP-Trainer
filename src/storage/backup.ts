/**
 * Full backup: the progress and every saved project in one file, so that
 * clearing the app's storage or changing phone loses nothing.
 */
import { parseProject } from '@core/serialization/serialize';
import { kv } from './idb';

export const BACKUP_KIND = 'bp-trainer-backup';
export const BACKUP_FORMAT = 1;

export interface Backup {
  kind: typeof BACKUP_KIND;
  format: number;
  savedAt: string;
  /** Storage key → stored text (projects are serialized project files, the progress is JSON). */
  entries: Record<string, string>;
}

/** Keys that belong in a backup. */
export const isBackupKey = (key: string) => key === 'progress' || key.startsWith('project:');

async function storedKeys(): Promise<string[]> {
  const keys = new Set<string>();
  try {
    for (const k of await kv.keys()) keys.add(k);
  } catch {
    /* IndexedDB unavailable: localStorage only */
  }
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) keys.add(k);
    }
  } catch {
    /* no localStorage */
  }
  return [...keys].filter(isBackupKey);
}

async function read(key: string): Promise<string | undefined> {
  try {
    const v = await kv.get<string>(key);
    if (v) return v;
  } catch {
    /* fall through to localStorage */
  }
  try {
    return localStorage.getItem(key) ?? undefined;
  } catch {
    return undefined;
  }
}

export async function makeBackup(now = new Date()): Promise<Backup> {
  const entries: Record<string, string> = {};
  for (const key of await storedKeys()) {
    const text = await read(key);
    if (text) entries[key] = text;
  }
  return { kind: BACKUP_KIND, format: BACKUP_FORMAT, savedAt: now.toISOString(), entries };
}

/** Checks a backup file's text; throws a message for the learner when it is not one. */
export function parseBackup(text: string): Backup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Ce fichier n’est pas une sauvegarde BP Trainer (JSON illisible).');
  }
  const b = data as Partial<Backup> | null;
  if (b?.kind !== BACKUP_KIND || typeof b.entries !== 'object' || !b.entries) {
    throw new Error('Ce fichier n’est pas une sauvegarde complète BP Trainer. Pour un seul projet, utilise « Importer un projet » dans l’éditeur.');
  }
  if ((b.format ?? 0) > BACKUP_FORMAT) throw new Error('Cette sauvegarde vient d’une version plus récente de BP Trainer : mets l’appli à jour.');
  const entries: Record<string, string> = {};
  for (const [key, value] of Object.entries(b.entries)) {
    if (!isBackupKey(key) || typeof value !== 'string') continue;
    try {
      if (key === 'progress') JSON.parse(value);
      else parseProject(value);
    } catch {
      throw new Error(`Sauvegarde abîmée : l’entrée « ${key} » est illisible. Rien n’a été modifié.`);
    }
    entries[key] = value;
  }
  return { kind: BACKUP_KIND, format: b.format ?? BACKUP_FORMAT, savedAt: String(b.savedAt ?? ''), entries };
}

/** Writes a backup over what is stored. Entries absent from the backup are kept. */
export async function restoreBackup(b: Backup): Promise<number> {
  let n = 0;
  for (const [key, value] of Object.entries(b.entries)) {
    try {
      await kv.set(key, value);
    } catch {
      localStorage.setItem(key, value);
    }
    n++;
  }
  return n;
}

/** Hand a file to the user: the share sheet on a phone (the installed app), a download otherwise. */
export async function saveFile(name: string, text: string): Promise<'shared' | 'downloaded'> {
  const file = new File([text], name, { type: 'application/json' });
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
  if (nav.canShare?.({ files: [file] }) && matchMedia('(pointer: coarse)').matches) {
    try {
      await nav.share({ files: [file], title: name });
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'shared';
      /* sharing refused: download instead */
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return 'downloaded';
}

export function pickTextFile(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      resolve(file ? await file.text() : null);
    };
    input.click();
  });
}
