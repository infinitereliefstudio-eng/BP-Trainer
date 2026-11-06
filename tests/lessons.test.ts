import { INTERPRETER_NODES } from '../src/core/runtime/interpreter';
import { describe, expect, it } from 'vitest';
import { LESSONS } from '../src/core/lessons';
import { runLesson } from '../src/core/lessons/runner';
import { allDefinitions } from '../src/core/nodes/registry';
import { hasBehavior } from '../src/core/runtime/behaviors';
import { parseProject, serializeProject } from '../src/core/serialization/serialize';

describe('lessons', () => {
  for (const lesson of LESSONS) {
    it(`${lesson.number}. ${lesson.title}: the empty setup fails`, () => {
      const run = runLesson(lesson, lesson.setup());
      expect(run.passed).toBe(false);
    });
    it(`${lesson.number}. ${lesson.title}: the reference solution passes`, () => {
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
    const lesson = LESSONS[3];
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
