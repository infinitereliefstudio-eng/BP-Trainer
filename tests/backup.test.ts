import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { serializeProject } from '../src/core/serialization/serialize';
import { createStarterProject } from '../src/core/templates/starterProject';
import { BACKUP_KIND, makeBackup, parseBackup, restoreBackup } from '../src/storage/backup';
import { kv } from '../src/storage/idb';

describe('full backup', () => {
  it('exports the progress and every project, and restores them', async () => {
    const project = serializeProject(createStarterProject());
    await kv.set('progress', JSON.stringify({ done: ['l01-bonjour'] }));
    await kv.set('project:sandbox', project);
    await kv.set('project:lesson:l01-bonjour', project);
    await kv.set('something-else', 'x');

    const backup = await makeBackup(new Date('2026-11-11T10:00:00Z'));
    expect(backup.kind).toBe(BACKUP_KIND);
    expect(Object.keys(backup.entries).sort()).toEqual(['progress', 'project:lesson:l01-bonjour', 'project:sandbox']);

    await kv.del('progress');
    await kv.del('project:sandbox');
    const n = await restoreBackup(parseBackup(JSON.stringify(backup)));
    expect(n).toBe(3);
    expect(JSON.parse((await kv.get<string>('progress'))!)).toEqual({ done: ['l01-bonjour'] });
    expect(await kv.get<string>('project:sandbox')).toBe(project);
  });

  it('refuses a file that is not a backup, with a reason', () => {
    expect(() => parseBackup('not json')).toThrow(/sauvegarde/);
    expect(() => parseBackup(serializeProject(createStarterProject()))).toThrow(/Importer un projet/);
    expect(() => parseBackup(JSON.stringify({ kind: BACKUP_KIND, format: 99, entries: {} }))).toThrow(/plus récente/);
    expect(() => parseBackup(JSON.stringify({ kind: BACKUP_KIND, format: 1, entries: { 'project:sandbox': '{broken' } }))).toThrow(/illisible/);
  });

  it('ignores entries that do not belong in a backup', () => {
    const b = parseBackup(JSON.stringify({ kind: BACKUP_KIND, format: 1, entries: { other: 'x', progress: '{"done":[]}' } }));
    expect(Object.keys(b.entries)).toEqual(['progress']);
  });
});
