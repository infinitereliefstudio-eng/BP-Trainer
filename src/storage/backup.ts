/**
 * Full backup: the progress and every saved project in one file, so that
 * clearing the app's storage or changing phone loses nothing.
 */
import { checkProgress } from '@core/progress/progress';
import { parseProject } from '@core/serialization/serialize';
import { RESCUE_PREFIX } from './persistence';
import { dedupeProjectNames } from './projects';
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
  // A backup from another device can bring a project whose name one here already has (V7.45).
  await dedupeProjectNames().catch(() => undefined);
  return Object.keys(b.entries).length;
}

// Kept here for the callers of the V4 to V7.44: the function lives in shareFile.ts (V7.45).
export { pickTextFile, saveFile } from './shareFile';
