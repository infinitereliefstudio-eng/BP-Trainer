/** Plausible but wrong answers must fail for the right reason. */
import { describe, expect, it } from 'vitest';
import { edit } from '../src/core/lessons/builder';
import { lesson8 } from '../src/core/lessons/library/module2';
import { lampFollowsGenerator, lesson9, setReference } from '../src/core/lessons/library/module3';
import { runLesson } from '../src/core/lessons/runner';
import { T } from '../src/core/types/pins';

const failed = (run: ReturnType<typeof runLesson>) => run.results.filter((r) => !r.ok).map((r) => r.check.id);

describe('lesson variants', () => {
  it('L8 with a plain Delay closes the door too early', () => {
    const p = lesson8.setup();
    const b = edit(p, 'BP_Porte');
    const e = b.node('event.actorEndOverlap');
    const wait = b.node('time.delay', {}, { duration: 3 });
    const rot = b.node('component.setRelativeRotation', {}, { rotation: { x: 0, y: 0, z: 0 } });
    b.link(e, 'then', wait, 'exec').link(wait, 'completed', rot, 'exec').target('Porte', rot);
    expect(failed(runLesson(lesson8, p))).toEqual(['again']);
  });

  it('L9 without Is Valid logs Accessed None', () => {
    const p = lesson9.setup();
    const lamp = edit(p, 'BP_Lampe');
    const ref = lamp.variable('Generateur', T.object('BP_Generateur'));
    lamp.cls.variables.find((v) => v.id === ref)!.instanceEditable = true;
    setReference(p, 'BP_Lampe', ref, 'BP_Generateur');
    lampFollowsGenerator(lamp, edit(p, 'BP_Generateur'), ref, false);
    const run = runLesson(lesson9, p);
    expect(failed(run)).toEqual(['no-errors']);
    expect(run.runtimeErrors[0]).toMatch(/Accessed None/);
  });

  it('L9 with both lamps linked fails the "alone" check', () => {
    const p = lesson9.setup();
    lesson9.solve(p);
    const ref = edit(p, 'BP_Lampe').cls.variables[0].id;
    setReference(p, 'BP_Lampe2', ref, 'BP_Generateur');
    expect(failed(runLesson(lesson9, p))).toEqual(['alone']);
  });
});
