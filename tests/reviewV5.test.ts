/**
 * V5: the review of a passed solution (size against the known solutions,
 * nodes to avoid, overall grade), the new construction rules, the glossary
 * behind each lesson's notions, and the wrong-but-working answers of the
 * new lessons.
 */
import { describe, expect, it } from 'vitest';
import { edit, ProjectBuilder } from '../src/core/lessons/builder';
import { getLesson, LESSONS } from '../src/core/lessons';
import { runLesson, runRobustness } from '../src/core/lessons/runner';
import type { Lesson } from '../src/core/lessons/types';
import type { Project } from '../src/core/model/project';
import { adviceFor } from '../src/core/quality/advice';
import { newAdvice } from '../src/core/quality/lessonAdvice';
import { avoidHits, knownSolutions, sizeReport, verdict } from '../src/core/quality/review';
import { firstSeen, notionHelp } from '../src/core/reference/glossary';
import { GLOSSARY } from '../src/core/reference/glossaryData';

const review = (lesson: Lesson, p: Project) => {
  const run = runLesson(lesson, p);
  const parts = { robustness: runRobustness(lesson, p), advice: newAdvice(lesson, p), size: sizeReport(lesson, p), avoided: avoidHits(lesson, p) };
  return { run, ...parts, verdict: verdict(run, parts) };
};

const built = LESSONS.filter((l) => l.kind !== 'predict');

describe('known solutions', () => {
  for (const lesson of built) {
    it(`${lesson.id}: no known solution is called heavy, uses a node to avoid, or gets advice from the new rules`, () => {
      for (const k of knownSolutions(lesson)) {
        const s = sizeReport(lesson, k.project)!;
        expect(s.verdict, k.title).toBe('compact');
        expect(s.extra, k.title).toEqual([]);
        expect(avoidHits(lesson, k.project).map((h) => h.avoid.label), k.title).toEqual([]);
        const fresh = newAdvice(lesson, k.project).filter((a) => ['dead-node', 'unread-node', 'bool-compare', 'lone-sequence', 'write-only', 'orphan-event', 'cast-on-tick'].includes(a.rule));
        expect(fresh.map((a) => `${a.rule}: ${a.title}`), k.title).toEqual([]);
      }
    });
  }

  it('the reference solution of a lesson without robustness trouble is graded solid', () => {
    for (const id of ['l01-bonjour', 'l04-touche', 'l-jauge', 'l-ventilateur', 'l-cloture', 'd9-minuteur']) {
      const lesson = getLesson(id)!;
      const p = lesson.setup();
      lesson.solve(p);
      const r = review(lesson, p);
      expect(r.run.passed, id).toBe(true);
      expect(r.verdict.stars, `${id}: ${r.verdict.points.filter((x) => !x.ok).map((x) => x.text)}`).toBe(3);
    }
  });
});

describe('size and nodes to avoid', () => {
  it('La jauge: Branch instead of Clamp passes, weighs more, misses the notion', () => {
    const lesson = getLesson('l-jauge')!;
    const p = lesson.setup();
    const b = edit(p, 'BP_Batterie');
    const v = b.cls.variables[0].id;
    const side = (key: string, y: number, add: string, amount: number, cmp: string, limit: number) => {
      const ev = b.node('event.inputKey', { key }, {}, [64, y]);
      const sum = b.node(add, {}, { b: amount }, [300, y + 200]);
      b.link(b.node('var.get', { variable: v }, {}, [100, y + 200]), 'value', sum, 'a');
      const test = b.node(cmp, {}, { b: limit }, [500, y + 200]);
      const br = b.node('flow.branch', {}, {}, [600, y]);
      const capped = b.node('var.set', { variable: v }, { value: limit }, [900, y - 80]);
      const plain = b.node('var.set', { variable: v }, {}, [900, y + 120]);
      const say1 = b.node('debug.printString', {}, {}, [1200, y - 80]);
      const say2 = b.node('debug.printString', {}, {}, [1200, y + 120]);
      b.link(ev, 'pressed', br, 'exec').link(sum, 'result', test, 'a').link(test, 'result', br, 'condition');
      b.link(br, 'true', capped, 'exec').link(br, 'false', plain, 'exec').link(sum, 'result', plain, 'value');
      b.link(capped, 'then', say1, 'exec').link(capped, 'out', say1, 'text').link(plain, 'then', say2, 'exec').link(plain, 'out', say2, 'text');
    };
    side('E', 96, 'math.addInt', 30, 'math.greaterInt', 100);
    side('F', 600, 'math.subtractInt', 45, 'math.lessInt', 0);
    const r = review(lesson, p);
    expect(r.run.results.filter((x) => !x.ok && !x.check.notion).map((x) => x.reason)).toEqual([]);
    expect(r.run.passed).toBe(true);
    expect(r.size!.verdict).toBe('heavy');
    expect(r.size!.extra.map((e) => e.title)).toContain('Branch');
    expect(r.verdict.stars).toBeLessThan(3);
    expect(r.verdict.points.some((x) => !x.ok && /notion/.test(x.text))).toBe(true);
  });

  it('La jauge: without any bound it fails, naming 110', () => {
    const lesson = getLesson('l-jauge')!;
    const p = lesson.setup();
    const b = edit(p, 'BP_Batterie');
    const v = b.cls.variables[0].id;
    const ev = b.node('event.inputKey', { key: 'E' });
    const sum = b.node('math.addInt', {}, { b: 30 });
    const set = b.node('var.set', { variable: v });
    const say = b.node('debug.printString');
    b.link(b.node('var.get', { variable: v }), 'value', sum, 'a').link(sum, 'result', set, 'value');
    b.link(ev, 'pressed', set, 'exec').link(set, 'then', say, 'exec').link(set, 'out', say, 'text');
    const run = runLesson(lesson, p);
    expect(run.passed).toBe(false);
    expect(run.results.find((r) => r.check.id === 'max')!.reason).toMatch(/110/);
  });

  it('Le ventilateur: a Branch back to 0 passes without the notion', () => {
    const lesson = getLesson('l-ventilateur')!;
    const p = lesson.setup();
    const b = edit(p, 'BP_Ventilateur');
    const v = b.cls.variables[0].id;
    const ev = b.node('event.inputKey', { key: 'E' });
    const ge = b.node('math.greaterEqualInt', {}, { b: 3 });
    const br = b.node('flow.branch');
    const zero = b.node('var.set', { variable: v }, { value: 0 });
    const inc = b.node('var.incrementInt');
    const say = b.node('debug.printString');
    b.link(b.node('var.get', { variable: v }), 'value', ge, 'a').link(ge, 'result', br, 'condition').link(ev, 'pressed', br, 'exec');
    b.link(br, 'true', zero, 'exec').link(br, 'false', inc, 'exec').link(b.node('var.get', { variable: v }), 'value', inc, 'value');
    b.link(zero, 'then', say, 'exec').link(inc, 'then', say, 'exec').link(b.node('var.get', { variable: v }), 'value', say, 'text');
    const r = review(lesson, p);
    expect(r.run.passed).toBe(true);
    expect(r.run.results.find((x) => x.check.id === 'modulo')!.ok).toBe(false);
    expect(r.robustness.map((x) => x.ok)).toEqual([true]);
  });

  it('La clôture: five copied Spawn Actor pass, then fail with 8 posts and weigh more', () => {
    const lesson = getLesson('l-cloture')!;
    const p = lesson.setup();
    const b = edit(p, 'BP_Chantier');
    const post = p.classes.find((c) => c.name === 'BP_Poteau')!.id;
    let prev = b.node('event.beginPlay');
    let pin = 'then';
    for (let i = 0; i < 5; i++) {
      const spawn = b.node('actor.spawn', {}, { class: post, location: { x: i * 150, y: 0, z: 0 } });
      b.link(prev, pin, spawn, 'exec');
      prev = spawn;
      pin = 'then';
    }
    const r = review(lesson, p);
    expect(r.run.passed).toBe(true);
    expect(r.robustness[0].ok).toBe(false);
    expect(r.robustness[0].reason).toMatch(/5 poteau/);
    expect(r.verdict.stars).toBeLessThan(3);
  });

  it('a Tick added to L’interrupteur is pointed out with what to use instead', () => {
    const lesson = getLesson('l03-interrupteur')!;
    const p = lesson.setup();
    lesson.solve(p);
    const b = edit(p, 'BP_Lampe');
    const tick = b.node('event.tick');
    const say = b.node('debug.printString');
    b.link(tick, 'then', say, 'exec');
    const hits = avoidHits(lesson, p);
    expect(hits.map((h) => h.title)).toEqual(['Event Tick']);
    expect(hits[0].avoid.why).toMatch(/Overlap/);
    expect(review(lesson, p).verdict.stars).toBeLessThan(3);
  });

  it('avoid lists only name existing lessons and nodes that are not already in the starting project by mistake', () => {
    for (const l of LESSONS) expect(avoidHits(l, l.setup()), l.id).toEqual([]);
  });

  it('D9: a DoOnce that hides the message leaves the timer running, and fails', () => {
    const lesson = getLesson('d9-minuteur')!;
    const p = lesson.setup();
    const b = edit(p, 'BP_Fusee');
    const nodes = Object.values(b.graph.nodes);
    const go = nodes.find((n) => n.def === 'debug.printString' && n.defaults.text === 'Décollage')!.id;
    const br = nodes.find((n) => n.def === 'flow.branch')!.id;
    for (const l of Object.values(b.graph.links)) if (l.to.node === go) delete b.graph.links[l.id];
    const once = b.node('flow.doOnce');
    b.link(br, 'false', once, 'exec').link(once, 'completed', go, 'exec');
    const run = runLesson(lesson, p);
    expect(run.passed).toBe(false);
    expect(run.results.find((r) => r.check.id === 'once')!.ok).toBe(true);
    expect(run.results.find((r) => r.check.id === 'stopped')!.reason).toMatch(/continue de tourner/);
  });
});

describe('new construction rules', () => {
  const rules = (build: (b: ReturnType<ProjectBuilder['blueprint']>) => void) => {
    const pb = new ProjectBuilder('t');
    const b = pb.blueprint('BP');
    build(b);
    return adviceFor(pb.project).map((a) => a.rule);
  };

  it('a node no white wire reaches, a pure node nobody reads', () => {
    expect(rules((b) => void b.node('debug.printString'))).toEqual(['dead-node']);
    expect(rules((b) => void b.node('math.addInt'))).toEqual(['unread-node']);
  });

  it('a Boolean compared with a ticked box', () => {
    expect(
      rules((b) => {
        const v = b.variable('bOn', { category: 'bool' });
        const eq = b.node('logic.equalBool', {}, { b: true });
        const br = b.node('flow.branch');
        b.link(b.node('event.beginPlay'), 'then', br, 'exec').link(b.node('var.get', { variable: v }), 'value', eq, 'a').link(eq, 'result', br, 'condition');
      }),
    ).toEqual(['bool-compare']);
  });

  it('a Sequence with one output, a variable written and never read, a Custom Event nobody calls', () => {
    expect(
      rules((b) => {
        const seq = b.node('flow.sequence');
        const say = b.node('debug.printString');
        b.link(b.node('event.beginPlay'), 'then', seq, 'exec').link(seq, 'then0', say, 'exec');
      }),
    ).toEqual(['lone-sequence']);
    expect(
      rules((b) => {
        const v = b.variable('Score', { category: 'int' });
        b.link(b.node('event.beginPlay'), 'then', b.node('var.set', { variable: v }, { value: 3 }), 'exec');
      }),
    ).toEqual(['write-only']);
    expect(
      rules((b) => {
        b.link(b.node('event.custom', { name: 'Oublie' }), 'then', b.node('debug.printString'), 'exec');
      }),
    ).toEqual(['orphan-event']);
  });

  it('a Cast repeated on Tick', () => {
    const r = rules((b) => {
      const tick = b.node('event.tick');
      const cast = b.node('cast.to');
      const move = b.node('actor.addOffset');
      b.link(tick, 'then', cast, 'exec').link(cast, 'then', move, 'exec').link(tick, 'delta', b.node('math.makeVector'), 'x');
    });
    expect(r).toContain('cast-on-tick');
  });
});

describe('glossary', () => {
  it('every notion named by a lesson has a help card', () => {
    const missing = [...new Set(LESSONS.flatMap((l) => l.notions))].filter((n) => !notionHelp(n));
    expect(missing).toEqual([]);
  });

  it('entries are complete and no name is claimed twice', () => {
    const seen = new Set<string>();
    for (const e of GLOSSARY) {
      expect(e.what.length, e.title).toBeGreaterThan(40);
      for (const n of e.names) {
        expect(seen.has(n.toLowerCase()), n).toBe(false);
        seen.add(n.toLowerCase());
      }
    }
  });

  it('knows where a notion was first met', () => {
    const fan = getLesson('l-ventilateur')!;
    expect(firstSeen('Variable Integer', fan)?.id).toBe('l04-touche'); // same card as Variable Boolean
    expect(firstSeen('% (Integer)', fan)).toBeUndefined();
    expect(firstSeen('Event BeginPlay', getLesson('l01-bonjour')!)).toBeUndefined();
  });
});
