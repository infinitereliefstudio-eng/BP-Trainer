import { describe, expect, it } from 'vitest';
import { getLesson, LESSONS } from '../src/core/lessons';
import { lessonLabel } from '../src/core/lessons/types';
import { INTERPRETER_NODES } from '../src/core/runtime/interpreter';
import { runLesson } from '../src/core/lessons/runner';
import { allDefinitions } from '../src/core/nodes/registry';
import { hasBehavior } from '../src/core/runtime/behaviors';
import { parseProject, serializeProject } from '../src/core/serialization/serialize';

describe('lessons', () => {
  it('ids are unique', () => {
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(LESSONS.length);
  });

  for (const lesson of LESSONS.filter((l) => l.kind === 'predict')) {
    it(`${lessonLabel(lesson)}. ${lesson.title}: the expected answer is what really happens`, () => {
      const run = runLesson(lesson, lesson.setup());
      expect(run.compileErrors.map((m) => m.text)).toEqual([]);
      expect(run.runtimeErrors).toEqual([]);
      expect(lesson.predict!.verify(run.prints), run.prints.join(', ')).toBe(true);
      expect(lesson.predict!.answer).toBeLessThan(lesson.predict!.options.length);
    });
  }

  for (const lesson of LESSONS.filter((l) => l.kind !== 'predict')) {
    it(`${lessonLabel(lesson)}. ${lesson.title}: the empty setup fails`, () => {
      const run = runLesson(lesson, lesson.setup());
      expect(run.passed).toBe(false);
    });
    it(`${lessonLabel(lesson)}. ${lesson.title}: the reference solution passes`, () => {
      const p = lesson.setup();
      lesson.solve(p);
      const run = runLesson(lesson, parseProject(serializeProject(p)));
      const failed = run.results.filter((r) => !r.ok).map((r) => `${r.check.label}: ${r.reason}`);
      expect(run.compileErrors.map((m) => m.text)).toEqual([]);
      expect(failed).toEqual([]);
      expect(run.passed).toBe(true);
    });
  }

  it('lesson 4 explains Auto Receive Input when it is off', () => {
    const lesson = getLesson('l04-touche')!;
    const p = lesson.setup();
    lesson.solve(p);
    p.classes[0].autoReceiveInput = false;
    const run = runLesson(lesson, p);
    expect(run.passed).toBe(false);
    expect(run.notes.join(' ')).toContain('Auto Receive Input');
  });
});

describe('every executable node has a behaviour', () => {
  it('impure nodes are runnable', () => {
    const missing = allDefinitions()
      .filter((d) => d.kind !== 'event' && d.style !== 'getter' && !INTERPRETER_NODES.has(d.id))
      .filter((d) => !hasBehavior(d.id))
      .map((d) => d.id);
    expect(missing).toEqual([]);
  });
});
