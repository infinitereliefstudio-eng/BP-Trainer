/**
 * Keys held as a finger holds them (V7.23): the runner replays each passing
 * scenario with every tap held 0.1 s, and Add / Remove Mapping Context
 * ignore a key already down (UE's Ignore All Pressed Keys Until Release).
 */
import { describe, expect, it } from 'vitest';
import { getLesson, LESSONS } from '../src/core/lessons';
import { HOLD_NOTE, HOLD_SECONDS, heldTaps, runLesson } from '../src/core/lessons/runner';
import type { ScenarioStep } from '../src/core/lessons/types';
import { lessonLabel } from '../src/core/lessons/types';
import { parseProject, serializeProject } from '../src/core/serialization/serialize';

const solved = (id: string) => {
  const lesson = getLesson(id)!;
  const p = lesson.setup();
  lesson.solve(p);
  return { lesson, p: parseProject(serializeProject(p)) };
};

describe('heldTaps', () => {
  it('holds a tap and takes the hold from the wait after it', () => {
    const sc: ScenarioStep[] = [{ press: 'E' }, { release: 'E' }, { wait: 0.5 }];
    const held = heldTaps(sc);
    expect(held).toEqual([{ press: 'E' }, { wait: HOLD_SECONDS }, { release: 'E' }, { wait: 0.5 - HOLD_SECONDS }]);
  });

  it('holds a tap with no wait after it too, and leaves a long press as it is', () => {
    expect(heldTaps([{ press: 'E' }, { release: 'E' }, { checkpoint: 'a' }])).toEqual([{ press: 'E' }, { wait: HOLD_SECONDS }, { release: 'E' }, { checkpoint: 'a' }]);
    const long: ScenarioStep[] = [{ press: 'F' }, { wait: 1 }, { release: 'F' }];
    expect(heldTaps(long)).toBe(long);
  });
});

describe('X1 « La radio de la station », E held as a finger holds it', () => {
  it('the reference solution passes: the E that opens the conversation is not also « next line »', () => {
    const { lesson, p } = solved('x1-radio');
    expect(runLesson(lesson, p).passed).toBe(true);
  });

  it('with Ignore All Pressed Keys Until Release unchecked, R2 comes at once and the step fails', () => {
    const { lesson, p } = solved('x1-radio');
    for (const c of p.classes) for (const g of c.graphs) for (const n of Object.values(g.nodes)) if (n.def === 'input.addMappingContext') n.config.ignorePressed = false;
    const run = runLesson(lesson, p);
    expect(run.passed).toBe(false);
    expect(run.notes[0]).toBe(HOLD_NOTE);
    expect(run.results.find((r) => !r.ok)?.reason).toContain('Ignore All Pressed Keys Until Release');
  });
});

describe('every step holds with keys held', () => {
  // runLesson already replays each solution with held taps (lessons.test.ts); this names the steps that tap a key.
  it('at least the steps with Enhanced Input are concerned', () => {
    const tapping = LESSONS.filter((l) => l.kind !== 'predict' && heldTaps(l.scenario) !== l.scenario).map(lessonLabel);
    expect(tapping.length).toBeGreaterThan(40);
  });
});
