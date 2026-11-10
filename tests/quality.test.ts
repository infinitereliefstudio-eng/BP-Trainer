/**
 * V3 step E: quality of solutions. Notion checks never block; robustness
 * cases and alternatives are tested against the lessons they belong to;
 * construction advice fires on the shapes it describes, and only on them.
 */
import { describe, expect, it } from 'vitest';
import { edit, ProjectBuilder } from '../src/core/lessons/builder';
import { getLesson, LESSONS } from '../src/core/lessons';
import { runLesson, runRobustness } from '../src/core/lessons/runner';
import { lessonLabel } from '../src/core/lessons/types';
import { adviceFor } from '../src/core/quality/advice';
import { newAdvice } from '../src/core/quality/lessonAdvice';
import { parseProject, serializeProject } from '../src/core/serialization/serialize';

/**
 * Cases the lesson's own reference solution does not hold: the feedback then
 * says so, which is the point of the feature.
 */
const REFERENCE_FAILS = new Set(['l10-dispatcher:orphan']);

describe('notion checks', () => {
  it('a working solution without the aimed notion passes, with the notion unchecked', () => {
    const lesson = getLesson('l04-touche')!;
    const p = lesson.setup();
    lesson.alternatives![0].build(p);
    const run = runLesson(lesson, p);
    expect(run.passed).toBe(true);
    const branch = run.results.find((r) => r.check.id === 'branch')!;
    expect(branch.check.notion).toBe(true);
    expect(branch.ok).toBe(false);
  });

  it('refactor constraints stay blocking', () => {
    for (const l of LESSONS.filter((x) => x.kind === 'refactor')) {
      expect(runLesson(l, l.setup()).passed, l.title).toBe(false);
    }
  });
});

describe('alternatives', () => {
  const withAlt = LESSONS.filter((l) => l.alternatives?.length);
  it('exist on several lessons', () => expect(withAlt.length).toBeGreaterThanOrEqual(5));
  for (const lesson of withAlt) {
    for (const alt of lesson.alternatives!) {
      it(`${lessonLabel(lesson)}. ${lesson.title} — ${alt.title}: passes the lesson`, () => {
        const p = lesson.setup();
        alt.build(p);
        const run = runLesson(lesson, parseProject(serializeProject(p)));
        expect(run.compileErrors.map((m) => m.text)).toEqual([]);
        expect(run.results.filter((r) => !r.ok && !r.check.notion).map((r) => `${r.check.label}: ${r.reason}`)).toEqual([]);
        expect(run.passed).toBe(true);
        expect(alt.gains.length).toBeGreaterThan(20);
        expect(alt.loses.length).toBeGreaterThan(20);
      });
    }
  }
});

describe('robustness cases', () => {
  const withCases = LESSONS.filter((l) => l.robustness?.length);
  it('exist on about ten lessons', () => expect(withCases.length).toBeGreaterThanOrEqual(9));
  for (const lesson of withCases) {
    it(`${lessonLabel(lesson)}. ${lesson.title}: the reference solution holds`, () => {
      const p = lesson.setup();
      lesson.solve(p);
      for (const r of runRobustness(lesson, p)) {
        const key = `${lesson.id}:${r.case.id}`;
        expect(r.ok, `${r.case.label}: ${r.reason}`).toBe(!REFERENCE_FAILS.has(key));
      }
    });
  }

  it('L’ascenseur: a fixed step per Tick passes at 30 images per second only by luck, and fails at 120', () => {
    const lesson = getLesson('l-ascenseur')!;
    const p = lesson.setup();
    const b = edit(p, 'BP_Ascenseur');
    const tick = b.node('event.tick', {}, {}, [64, 96]);
    const loc = b.node('actor.getLocation', {}, {}, [200, 320]);
    const split = b.node('math.breakVector', {}, {}, [400, 320]);
    const less = b.node('math.lessFloat', {}, { b: 600 }, [600, 320]);
    const br = b.node('flow.branch', {}, {}, [700, 96]);
    // 200 cm/s at 30 images per second: 6.667 cm per Tick.
    const move = b.node('actor.addOffset', {}, { delta: { x: 200 / 30, y: 0, z: 0 } }, [1000, 96]);
    b.link(tick, 'then', br, 'exec').link(loc, 'result', split, 'in').link(split, 'x', less, 'a').link(less, 'result', br, 'condition').link(br, 'true', move, 'exec');
    expect(runLesson(lesson, p).passed).toBe(true);
    const [fast] = runRobustness(lesson, p);
    expect(fast.ok).toBe(false);
    expect(fast.reason).toMatch(/120 images par seconde/);
    expect(adviceFor(p).map((a) => a.rule)).toContain('tick-no-delta');
  });

  it('Le générateur prévient: a Bind guarded by Is Valid holds with an unlinked lamp', () => {
    const lesson = getLesson('l10-dispatcher')!;
    const p = lesson.setup();
    lesson.solve(p);
    const lamp = edit(p, 'BP_Lampe');
    const nodes = Object.values(lamp.graph.nodes);
    const begin = nodes.find((n) => n.def === 'event.beginPlay')!.id;
    const bind = nodes.find((n) => n.def === 'dispatcher.bind')!.id;
    const get = nodes.find((n) => n.def === 'var.get')!.id;
    for (const l of Object.values(lamp.graph.links)) if (l.from.node === begin) delete lamp.graph.links[l.id];
    const valid = lamp.node('flow.isValid', {}, {}, [240, 96]);
    lamp.link(begin, 'then', valid, 'exec').link(get, 'value', valid, 'object').link(valid, 'valid', bind, 'exec');
    expect(runLesson(lesson, p).passed).toBe(true);
    expect(runRobustness(lesson, p).map((r) => r.ok)).toEqual([true]);
  });
});

describe('construction advice', () => {
  const rules = (build: (b: ReturnType<ProjectBuilder['blueprint']>) => void) => {
    const pb = new ProjectBuilder('t');
    const b = pb.blueprint('BP');
    b.component('PointLight', 'Lumiere');
    build(b);
    return adviceFor(pb.project).map((a) => a.rule);
  };

  it('Tick that only watches a value', () => {
    expect(
      rules((b) => {
        const v = b.variable('bOn', { category: 'bool' });
        const tick = b.node('event.tick');
        const set = b.node('component.setVisibility');
        b.link(tick, 'then', set, 'exec').link(b.node('var.get', { variable: v }), 'value', set, 'visible').target('Lumiere', set);
      }),
    ).toEqual(['tick-poll']);
  });

  it('Delay and Get All Actors Of Class behind Tick', () => {
    const r = rules((b) => {
      const tick = b.node('event.tick');
      const delay = b.node('time.delay');
      const all = b.node('actor.getAllOfClass');
      b.link(tick, 'then', delay, 'exec').link(delay, 'completed', all, 'exec');
    });
    expect(r).toContain('delay-on-tick');
    expect(r).toContain('search-on-tick');
    expect(r).not.toContain('tick-poll');
  });

  it('a Tick that moves with Delta Seconds gets no advice; without it, one', () => {
    const moving = (delta: boolean) =>
      rules((b) => {
        const tick = b.node('event.tick');
        const move = b.node('actor.addOffset');
        const vec = b.node('math.makeVector');
        b.link(tick, 'then', move, 'exec').link(vec, 'result', move, 'delta');
        if (delta) b.link(tick, 'delta', vec, 'x');
      });
    expect(moving(true)).toEqual([]);
    expect(moving(false)).toEqual(['tick-no-delta']);
  });

  it('an overlap that never looks at Other Actor', () => {
    const overlap = (wired: boolean) =>
      rules((b) => {
        const ev = b.node('event.actorBeginOverlap');
        const print = b.node('debug.printString');
        b.link(ev, 'then', print, 'exec');
        if (wired) b.link(ev, 'other', print, 'text');
      });
    expect(overlap(false)).toEqual(['overlap-anyone']);
    expect(overlap(true)).toEqual([]);
  });

  it('the same chain of three nodes twice', () => {
    const chain = (b: ReturnType<ProjectBuilder['blueprint']>, from: string, pin: string, last: string) => {
      const a = b.node('debug.printString', {}, { text: 'Alerte' });
      const c = b.node('component.setVisibility', {}, { visible: true });
      const d = b.node('debug.printString', {}, { text: last });
      b.link(from, pin, a, 'exec').link(a, 'then', c, 'exec').link(c, 'then', d, 'exec').target('Lumiere', c);
    };
    expect(
      rules((b) => {
        const key = b.node('event.inputKey', { key: 'E' });
        chain(b, key, 'pressed', 'Fin');
        chain(b, key, 'released', 'Fin');
      }),
    ).toEqual(['copied-chain']);
    expect(
      rules((b) => {
        const key = b.node('event.inputKey', { key: 'E' });
        chain(b, key, 'pressed', 'Fin');
        chain(b, key, 'released', 'Autre');
      }),
    ).toEqual([]);
  });

  it('no reference solution of a Débutant lesson gets advice at its level', () => {
    for (const l of LESSONS.filter((x) => x.level === 'debutant' && x.kind !== 'predict')) {
      const p = l.setup();
      l.solve(p);
      expect(newAdvice(l, p).map((a) => `${l.title}: ${a.title}`)).toEqual([]);
    }
  });

  it('advice already present in the lesson’s starting project is not blamed on the learner', () => {
    for (const l of LESSONS.filter((x) => x.kind !== 'predict')) expect(newAdvice(l, l.setup()), l.title).toEqual([]);
  });

  it('Générateur et lampe: the Tick of the reference solution is pointed out, as its challenge says', () => {
    const l = getLesson('l09-generateur')!;
    const p = l.setup();
    l.solve(p);
    expect(newAdvice(l, p).map((a) => a.rule)).toEqual(['tick-poll']);
  });
});
