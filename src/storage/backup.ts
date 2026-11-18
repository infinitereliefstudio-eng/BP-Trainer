/**
 * Full backup: the progress and every saved project in one file, so that
 * clearing the app's storage or changing phone loses nothing.
 */
import { checkProgress } from '@core/progress/progress';
import { parseProject } from '@core/serialization/serialize';
import { RESCUE_PREFIX } from './persistence';
import { readStored, storedKeys, writeMany } from './storage';

export const BACKUP_KIND = 'bp-trainer-backup';
export const BACKUP_FORMAT = 1;

export interface Backup {
  kind: typeof BACKUP_KIND;
  format: number;
  savedAt: string;
  /** Storage key → stored text (projects are serialized project files, the progress is JSON). */
  entries: Record<string, string>;
}

/**
 * Keys that belong in a backup: the progress, the projects, and the copies
 * of anything that could not be opened (kept as they are, to be rescued).
 */
export const isBackupKey = (key: string) => key === 'progress' || key.startsWith('project:') || key.startsWith(RESCUE_PREFIX);

export async function makeBackup(now = new Date()): Promise<Backup> {
  const entries: Record<string, string> = {};
  for (const key of (await storedKeys()).filter(isBackupKey).sort()) {
    const stored = await readStored(key);
    if (stored) entries[key] = stored.text;
  }
  return { kind: BACKUP_KIND, format: BACKUP_FORMAT, savedAt: now.toISOString(), entries };
}

/**
 * Checks a backup file's text, every entry included; throws a message for
 * the learner when anything is wrong, before anything is written.
 */
export function parseBackup(text: string): Backup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Ce fichier n’est pas une sauvegarde BP Trainer (JSON illisible).');
  }
  const b = data as Partial<Backup> | null;
  if (b?.kind !== BACKUP_KIND || typeof b.entries !== 'object' || !b.entries || Array.isArray(b.entries)) {
    throw new Error('Ce fichier n’est pas une sauvegarde complète BP Trainer. Pour un seul projet, utilise « Importer un projet » dans l’éditeur.');
  }
  if ((b.format ?? 0) > BACKUP_FORMAT) throw new Error('Cette sauvegarde vient d’une version plus récente de BP Trainer : mets l’appli à jour.');
  const entries: Record<string, string> = {};
  for (const [key, value] of Object.entries(b.entries)) {
    if (!isBackupKey(key)) continue;
    const broken = (why: string) => new Error(`Sauvegarde abîmée : l’entrée « ${key} » ${why}. Rien n’a été modifié.`);
    if (typeof value !== 'string') throw broken('n’est pas du texte');
    if (key === 'progress') {
      let progress: unknown;
      try {
        progress = JSON.parse(value);
      } catch {
        throw broken('est illisible');
      }
      const problems = checkProgress(progress);
      if (problems.length) throw broken(`est mal formée (${problems.join(', ')})`);
    } else if (!key.startsWith(RESCUE_PREFIX)) {
      try {
        parseProject(value);
      } catch (e) {
        throw broken(`est illisible : ${(e as Error).message}`);
      }
    }
    entries[key] = value;
  }
  return { kind: BACKUP_KIND, format: b.format ?? BACKUP_FORMAT, savedAt: String(b.savedAt ?? ''), entries };
}

/**
 * Writes a checked backup over what is stored, all entries at once: if the
 * device refuses one, none is written. Entries absent from the backup are kept.
 */
export async function restoreBackup(b: Backup): Promise<number> {
  await writeMany(b.entries);
  return Object.keys(b.entries).length;
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
