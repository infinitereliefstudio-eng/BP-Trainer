/** Plausible but wrong answers must fail for the right reason. */
import { describe, expect, it } from 'vitest';
import { edit } from '../src/core/lessons/builder';
import { lesson8 } from '../src/core/lessons/library/module2';
import { lampFollowsGenerator, lesson9, setReference } from '../src/core/lessons/library/module3';
import { lesson12 } from '../src/core/lessons/library/module4';
import { runLesson } from '../src/core/lessons/runner';
import { contextFor } from '../src/core/nodes/registry';
import { connect, disconnectPin, removeNodes } from '../src/core/operations/graphOps';
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
    const run = runLesson(lesson8, p);
    expect(failed(run)).toEqual(['again']);
    // The door did move (opened, then closed too early): say so, not "it did not move".
    expect(run.results.find((r) => r.check.id === 'again')?.reason).toMatch(/déjà refermée/);
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

  describe('L12', () => {
    /** The solved station, with a change applied to BP_Generateur's graph. */
    function solvedWith(change: (gen: ReturnType<typeof edit>, find: (def: string, i?: number) => string) => void) {
      const p = lesson12.setup();
      lesson12.solve(p);
      const gen = edit(p, 'BP_Generateur');
      const find = (def: string, i = 0) => Object.values(gen.graph.nodes).filter((n) => n.def === def)[i].id;
      change(gen, find);
      return runLesson(lesson12, p);
    }

    it('starting without counting the fuses fails "locked"', () => {
      const run = solvedWith((gen, find) => disconnectPin(gen.graph, { node: find('flow.branch'), pin: 'condition' }));
      expect(failed(run)).toEqual(['locked']);
    });

    it('a timer never cleared fails "timer"', () => {
      const run = solvedWith((gen, find) => {
        const stop = find('time.clearTimer');
        const off = Object.values(gen.graph.links).find((l) => l.to.node === stop && l.to.pin === 'exec')!.from.node;
        const tellOff = Object.values(gen.graph.links).find((l) => l.from.node === stop && l.from.pin === 'then')!.to.node;
        removeNodes(gen.graph, [stop]);
        connect(gen.graph, { node: off, pin: 'then' }, { node: tellOff, pin: 'exec' }, contextFor(gen.cls, gen.project));
      });
      expect(failed(run)).toEqual(['timer']);
    });

    it('fuel that only goes down, without Clamp, fails "clamp"', () => {
      const run = solvedWith((gen, find) => {
        const clamp = find('math.clampFloat');
        const minus = find('math.subtractFloat');
        const write = Object.values(gen.graph.links).find((l) => l.from.node === clamp)!.to;
        removeNodes(gen.graph, [clamp]);
        connect(gen.graph, { node: minus, pin: 'result' }, write, contextFor(gen.cls, gen.project));
      });
      expect(failed(run)).toEqual(['clamp']);
    });

    it('a door that does not listen fails "start" and "bind"', () => {
      const p = lesson12.setup();
      lesson12.solve(p);
      const door = edit(p, 'BP_Porte');
      removeNodes(door.graph, Object.values(door.graph.nodes).filter((n) => n.def === 'dispatcher.bind').map((n) => n.id));
      expect(failed(runLesson(lesson12, p))).toEqual(['start', 'bind']);
    });
  });
});
