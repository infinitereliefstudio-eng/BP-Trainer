/**
 * Writes the solved project of some lessons to tools/e2e/out/<id>.json,
 * for smoke.py to load into the app (IndexedDB key "project:lesson:<id>").
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { getLesson } from '../../src/core/lessons';
import { serializeProject } from '../../src/core/serialization/serialize';

const OUT = new URL('./out/', import.meta.url);

it('generates solved lesson projects', () => {
  mkdirSync(OUT, { recursive: true });
  for (const id of ['l03-interrupteur', 'l10-dispatcher', 'l11-interface', 'l12-station']) {
    const lesson = getLesson(id)!;
    const p = lesson.setup();
    lesson.solve(p);
    writeFileSync(new URL(`${id}.json`, OUT), serializeProject(p));
  }
});
