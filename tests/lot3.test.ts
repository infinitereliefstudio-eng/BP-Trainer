/**
 * Lot 3a of the path plan (V7.15): the four new Confirmé steps, and the
 * wrong answers each one is built to catch.
 */
import { describe, expect, it } from 'vitest';
import { getLesson, LESSONS } from '../src/core/lessons';
import { edit } from '../src/core/lessons/builder';
import { runLesson } from '../src/core/lessons/runner';
import type { Lesson } from '../src/core/lessons/types';
import { referenceQuery, findInBlueprints } from '../src/core/search/find';
import type { Project } from '../src/core/model/project';
import { removeNodes } from '../src/core/operations/graphOps';
import { T } from '../src/core/types/pins';

const lesson = (id: string) => getLesson(id)!;
const solved = (l: Lesson, tweak?: (p: Project) => void) => {
  const p = l.setup();
  l.solve(p);
  tweak?.(p);
  return p;
};
const failed = (l: Lesson, p: Project) =>
  runLesson(l, p)
    .results.filter((r) => !r.ok && !r.check.notion)
    .map((r) => r.check.id);

describe('lot 3a: place in the path', () => {
  it('the four steps are in the Confirmé, after what they need', () => {
    const at = (id: string) => LESSONS.findIndex((l) => l.id === id);
    for (const id of ['l-choisis-outil', 'd21-qui-eteint', 'r4-interagir-ue5', 'l-menu-pause']) expect(lesson(id).level, id).toBe('confirme');
    expect(at('l-choisis-outil')).toBeGreaterThan(at('l11-interface'));
    expect(at('d21-qui-eteint')).toBeGreaterThan(at('l-qui-modifie'));
    expect(at('l-menu-pause')).toBeGreaterThan(at('l-vagues'));
    expect(lesson('d21-qui-eteint').code).toBe('D21');
    expect(lesson('r4-interagir-ue5').code).toBe('R4');
  });
});

describe('Choisis ton outil', () => {
  const l = lesson('l-choisis-outil');

  it('an alarm that looks for its beacons (Get All Actors Of Class) fails: it must not know them', () => {
    const p = solved(l, (p) => {
      const alarm = edit(p, 'BP_Alarme');
      const beacon = p.classes.find((c) => c.name === 'BP_Gyrophare')!;
      alarm.node('actor.getAllOfClass', {}, { class: beacon.id }, [400, 400]);
    });
    expect(failed(l, p)).toContain('alarm-blind');
  });

  it('an alarm holding references fails the same way', () => {
    const p = solved(l, (p) => {
      edit(p, 'BP_Alarme').variable('Gyrophares', T.array(T.object('BP_Gyrophare')));
    });
    expect(failed(l, p)).toContain('alarm-blind');
  });

  it('a breaker that casts fails, even if the appliances turn off', () => {
    const p = solved(l, (p) => {
      const lamp = p.classes.find((c) => c.name === 'BP_Lampe')!;
      const b = edit(p, 'BP_Disjoncteur');
      const leave = b.node('event.actorEndOverlap', {}, {}, [64, 700]);
      const cast = b.node('cast.to', { class: lamp.id }, {}, [400, 700]);
      b.link(leave, 'then', cast, 'exec').link(leave, 'other', cast, 'object');
    });
    expect(failed(l, p)).toEqual(['breaker-nocast']);
  });
});

describe('Qui a éteint la lumière ?', () => {
  const l = lesson('d21-qui-eteint');

  it('Find References on Event Eteindre, in all Blueprints, finds the two callers', () => {
    const p = l.setup();
    const lamp = p.classes.find((c) => c.name === 'BP_Lampe')!;
    const ev = Object.values(lamp.graphs[0].nodes).find((n) => n.def === 'event.custom' && n.config.name === 'Eteindre')!;
    const found = findInBlueprints(p, referenceQuery(p, lamp, ev)).map((c) => c.className);
    expect(found).toEqual(expect.arrayContaining(['BP_Lampe', 'BP_Interrupteur', 'BP_Ventilation']));
    expect(found).not.toContain('BP_Detecteur');
  });

  it('cutting the switch instead of the leftover call breaks the exit', () => {
    const p = l.setup();
    const g = p.classes.find((c) => c.name === 'BP_Interrupteur')!.graphs[0];
    removeNodes(g, Object.values(g.nodes).filter((n) => n.def === 'call.custom').map((n) => n.id));
    expect(failed(l, p)).toEqual(['stays-on', 'switch']);
  });
});

describe('Interagir comme dans UE5', () => {
  const l = lesson('r4-interagir-ue5');

  it('the start works for three objects but not the chest, and objects still listen', () => {
    expect(failed(l, l.setup())).toEqual(['chest', 'no-listener']);
  });
});

describe('Le menu pause', () => {
  const l = lesson('l-menu-pause');

  it('without Trigger when Paused the game stays paused, and the check says why', () => {
    const p = solved(l, (p) => {
      for (const a of p.inputActions) delete a.triggerWhenPaused;
    });
    const run = runLesson(l, p);
    const resumes = run.results.find((r) => r.check.id === 'resumes')!;
    expect(resumes.ok).toBe(false);
    expect(resumes.reason).toContain('Trigger when Paused');
  });
});
