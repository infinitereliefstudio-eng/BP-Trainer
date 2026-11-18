import { describe, expect, it } from 'vitest';
import { getLesson } from '../src/core/lessons';
import { solveCatalog, solveDialogue } from '../src/core/lessons/library/tables';
import { runLesson } from '../src/core/lessons/runner';
import { createClass, createProject } from '../src/core/model/project';
import {
  addDataTable,
  addDataTableRow,
  removeDataTable,
  renameDataTableRow,
  setDataTableStruct,
} from '../src/core/operations/dataTableOps';
import { addStruct, addStructMember, removeStruct, renameStruct } from '../src/core/operations/structOps';
import { restore, snapshot } from '../src/core/history/history';
import { parseProject, serializeProject } from '../src/core/serialization/serialize';
import { addNode } from '../src/core/operations/graphOps';
import { addClass } from '../src/core/operations/projectOps';

const failing = (lessonId: string, change: (p: ReturnType<typeof createProject>) => void) => {
  const lesson = getLesson(lessonId)!;
  const p = lesson.setup();
  change(p);
  const run = runLesson(lesson, parseProject(serializeProject(p)));
  return { run, failed: run.results.filter((r) => !r.ok).map((r) => r.check.id) };
};

describe('V7 data tables', () => {
  it('row names are unique, tables in use cannot be removed, renaming a struct follows', () => {
    const p = createProject('t');
    const s = addStruct(p, 'S_Fiche');
    if (!s.ok) throw new Error(s.reason);
    addStructMember(p, s.value.id);
    const t = addDataTable(p, 'S_Fiche', 'DT_Objets');
    if (!t.ok) throw new Error(t.reason);
    expect(addDataTableRow(p, t.value.id, 'Lampe').ok).toBe(true);
    expect(addDataTableRow(p, t.value.id, 'lampe').ok).toBe(false);
    expect(addDataTableRow(p, t.value.id, 'Cle').ok).toBe(true);
    expect(renameDataTableRow(p, t.value.id, 1, 'LAMPE').ok).toBe(false);
    expect(renameStruct(p, s.value.id, 'S_Objet').ok).toBe(true);
    expect(p.dataTables[0].struct).toBe('S_Objet');
    expect(removeStruct(p, s.value.id).ok).toBe(false);
    const c = addClass(p, 'BP_Lecteur');
    if (!c.ok) throw new Error(c.reason);
    const cls = c.value;
    const graph = cls.graphs[0];
    addNode(graph, 'dataTable.getRow', 0, 0, { table: t.value.id });
    expect(removeDataTable(p, t.value.id).ok).toBe(false);
  });

  it('changing the row structure resets the values', () => {
    const p = createProject('t');
    const a = addStruct(p, 'S_A');
    const b = addStruct(p, 'S_B');
    if (!a.ok || !b.ok) throw new Error('struct');
    const t = addDataTable(p, 'S_A');
    if (!t.ok) throw new Error(t.reason);
    addDataTableRow(p, t.value.id, 'Un', { x: 'y' });
    expect(setDataTableStruct(p, t.value.id, 'S_B').ok).toBe(true);
    expect(p.dataTables[0].rows[0].value).toEqual({});
  });

  it('an old project gets an empty list of data tables', () => {
    const project = createProject('t');
    project.classes.push(createClass('BP_A'));
    const p = project as unknown as Record<string, unknown>;
    delete p.dataTables;
    const back = parseProject(JSON.stringify({ kind: 'bp-trainer-project', format: 7, project: p }));
    expect(back.dataTables).toEqual([]);
  });

  it('catalogue: without Row Not Found, the missing name prints an empty line', () => {
    const lesson = getLesson('l-catalogue')!;
    const p = lesson.setup();
    solveCatalog(p, false);
    expect(runLesson(lesson, p).passed).toBe(false);
  });

  it('dialogue: testing the end before printing loses the last line', () => {
    const lesson = getLesson('l-dialogue-table')!;
    const p = lesson.setup();
    solveDialogue(p, true);
    expect(runLesson(lesson, p).passed).toBe(false);
  });
});

describe('V7 save game', () => {
  it('piggy bank: without loading, the next game starts again from 1', () => {
    const { run, failed } = failing('l-tirelire', () => {});
    expect(run.passed).toBe(false);
    expect(failed).toContain('again');
  });

  it('D17: the buggy setup errors at the very first game', () => {
    const { run, failed } = failing('d17-premiere-partie', () => {});
    expect(failed).toContain('no-errors');
    expect(run.runtimeErrors.length).toBeGreaterThan(0);
  });

  it('D18: the slot is written before the Set, so the record is 0', () => {
    const { failed } = failing('d18-record', () => {});
    expect(failed).toEqual(expect.arrayContaining(['slot', 'shown']));
  });

  it('checkpoint: the empty setup leaves the player at the start', () => {
    const { failed } = failing('l-checkpoint', () => {});
    expect(failed).not.toContain('start');
    expect(failed).toContain('back');
  });

  it('a lesson starts from its own slots, not from what an earlier Play wrote', () => {
    const lesson = getLesson('l-tirelire')!;
    const p = lesson.setup();
    lesson.solve(p);
    p.saveSlots = { 'Tirelire|0': { classId: '', className: 'BP_Sauvegarde', values: { Pieces: 40 } } };
    expect(runLesson(lesson, p).passed).toBe(true);
  });

  it('undo never brings an old save back', () => {
    const p = createProject('t');
    const before = snapshot(p, { kind: 'project' });
    p.saveSlots = { 'A|0': { classId: '', className: 'X', values: {} } };
    restore(p, { kind: 'project' }, before);
    expect(p.saveSlots?.['A|0']).toBeDefined();
  });
});
