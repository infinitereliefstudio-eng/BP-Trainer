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
import { milestoneView } from '../src/core/lessons/milestones';
import { parseProject, serializeProject } from '../src/core/serialization/serialize';

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

describe('X6 « Le réveil », the terminal, E held as a finger holds it', () => {
  // Milestone 2 took over X1's radio (V7.72): the E that opens the journal is not also « next page ».
  const terminal = () => {
    const lesson = getLesson('x6-reveil')!;
    const p = lesson.setup();
    for (const m of lesson.milestones!.slice(0, 2)) m.solve(p);
    return { view: milestoneView(lesson, 1), p: parseProject(serializeProject(p)) };
  };

  it('the reference solution passes', () => {
    const { view, p } = terminal();
    expect(runLesson(view, p).passed).toBe(true);
  });

  it('with Ignore All Pressed Keys Until Release unchecked, J2 comes at once and the milestone fails', () => {
    const { view, p } = terminal();
    for (const c of p.classes) for (const g of c.graphs) for (const n of Object.values(g.nodes)) if (n.def === 'input.addMappingContext') n.config.ignorePressed = false;
    const run = runLesson(view, p);
    expect(run.passed).toBe(false);
    expect(run.notes).toContain(HOLD_NOTE);
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
