/**
 * Lot 2 of the backlog (towards autonomy): notions of the path, help used,
 * the Cast To chain (T1, A1) with its delayed step, and « Montre-moi ».
 */
import { describe, expect, it } from 'vitest';
import { whereItStopped } from '../src/core/explain/stops';
import { getLesson, LESSONS } from '../src/core/lessons';
import { availability } from '../src/core/lessons/chain';
import { estimatedMinutes } from '../src/core/lessons/duration';
import { edit } from '../src/core/lessons/builder';
import { autonomyTrap, transferBadge } from '../src/core/lessons/library/chainCast';
import { runLesson, runRobustness } from '../src/core/lessons/runner';
import { isChainExercise, lessonLabel } from '../src/core/lessons/types';
import type { Project } from '../src/core/model/project';
import { acquiredNotions, missingNotions, NOTIONS, stepNotions } from '../src/core/notions';
import { LESSON_NOTIONS } from '../src/core/notions/lessonNotions';
import { writtenNotions } from '../src/core/notions/practice';
import { disconnectPin } from '../src/core/operations/graphOps';
import { checkProgress, helpLevel, type Progress, withHelp, withHelpReset, withPassed } from '../src/core/progress/progress';

const graphOf = (p: Project, cls: string) => p.classes.find((c) => c.name === cls)!.graphs[0];
const nodeOf = (p: Project, cls: string, def: string) => Object.values(graphOf(p, cls).nodes).find((n) => n.def === def)!;

describe('notions of the path', () => {
  const ids = new Set(NOTIONS.map((n) => n.id));

  it('every step has its notions, all from the catalogue', () => {
    expect(LESSONS.filter((l) => !LESSON_NOTIONS[l.id]).map((l) => l.id)).toEqual([]);
    expect(Object.keys(LESSON_NOTIONS).filter((id) => !getLesson(id))).toEqual([]);
    for (const [id, n] of Object.entries(LESSON_NOTIONS)) {
      if (getLesson(id)?.kind !== 'synthesis') expect(n.teaches.length, id).toBeGreaterThan(0);
      for (const x of [...n.teaches, ...n.requires]) expect(ids.has(x), `${id}: ${x}`).toBe(true);
    }
  });

  it('a step only requires notions taught by an earlier step', () => {
    const taught = new Set<string>();
    const late: string[] = [];
    for (const l of LESSONS) {
      for (const r of stepNotions(l.id).requires) if (!taught.has(r)) late.push(`${l.id} → ${r}`);
      for (const t of stepNotions(l.id).teaches) taught.add(t);
    }
    expect(late).toEqual([]);
  });

  it('a synthesis, a mixed practice or an Expert project declares what its solution writes (V7.62: the home screen warns from it; V7.72: Expert)', () => {
    // Notions every step uses from the Débutant on: not worth listing.
    const everywhere = new Set(['variables', 'math', 'branch', 'events', 'print', 'components']);
    const missing: string[] = [];
    for (const l of LESSONS) {
      const n = stepNotions(l.id);
      if (l.kind !== 'synthesis' && !n.teaches.includes('mixed') && l.level !== 'expert') continue;
      const start = l.setup();
      const solved = l.setup();
      l.solve(solved);
      for (const w of writtenNotions(start, solved)) if (!everywhere.has(w) && !n.teaches.includes(w) && !n.requires.includes(w)) missing.push(`${l.id} → ${w}`);
    }
    expect(missing).toEqual([]);
  });

  it('every notion of the catalogue is taught somewhere', () => {
    const taught = new Set(LESSONS.flatMap((l) => stepNotions(l.id).teaches));
    expect(NOTIONS.filter((n) => !taught.has(n.id)).map((n) => n.id)).toEqual([]);
  });

  it('shows what a step needs that is not acquired yet', () => {
    const acquired = acquiredNotions(['l01-bonjour', 'l02-lampe', 'l03-interrupteur']);
    expect(missingNotions('l07-verrou', acquired).map((n) => n.id)).toEqual(['branch', 'rotation']);
    expect(missingNotions('l03-interrupteur', acquired)).toEqual([]);
  });

  it('gives every step a duration between 5 and 30 minutes (45 for a synthesis, 120 for an Expert project)', () => {
    for (const l of LESSONS) {
      const m = estimatedMinutes(l);
      expect(m % 5, l.id).toBe(0);
      expect(m, l.id).toBeGreaterThanOrEqual(5);
      expect(m, l.id).toBeLessThanOrEqual(l.level === 'expert' ? 120 : l.kind === 'synthesis' ? 45 : 30);
    }
  });
});

describe('help used on a lesson', () => {
  const base: Progress = { done: [] };

  it('tells how a lesson was passed', () => {
    expect(helpLevel(undefined)).toBe('alone');
    expect(helpLevel({ hints: 1 })).toBe('hints');
    expect(helpLevel({ hints: 3 })).toBe('solution');
    expect(helpLevel({ hints: 0, solution: true })).toBe('solution');
  });

  it('records the help at the pass, and keeps the best result when passed again', () => {
    let p = withHelp(base, 'l', (h) => ({ ...h, hints: 2 }));
    p = withPassed(p, 'l', 1);
    expect(p.passedWith?.l).toBe('hints');
    p = withHelpReset(p, 'l');
    expect(p.help?.l).toBeUndefined();
    p = withPassed(p, 'l', 2);
    expect(p.passedWith?.l).toBe('alone');
    p = withHelp(p, 'l', (h) => ({ ...h, solution: true }));
    expect(withPassed(p, 'l', 3).passedWith?.l).toBe('alone');
  });

  it('is unchanged when nothing changes', () => {
    const p = withHelp(base, 'l', (h) => ({ ...h, tried: true }));
    expect(withHelp(p, 'l', (h) => ({ ...h, tried: true }))).toBe(p);
  });

  it('is checked in a backup', () => {
    expect(checkProgress({ done: [], help: { l: { hints: 1, tried: true } }, passedWith: { l: 'hints' } })).toEqual([]);
    expect(checkProgress({ done: [], help: { l: { hints: 'x' } } })).toHaveLength(1);
    expect(checkProgress({ done: [], passedWith: { l: 'cheat' } })).toHaveLength(1);
  });
});

describe('the Cast To chain', () => {
  it('places T1 and A1 in the path without renumbering the lessons', () => {
    expect(isChainExercise(transferBadge)).toBe(true);
    expect(lessonLabel(transferBadge)).toBe('Transfert T1');
    expect(lessonLabel(autonomyTrap)).toBe('Autonomie A1');
    expect(lessonLabel(getLesson('l07-verrou')!)).toBe('Leçon 13');
    expect(lessonLabel(getLesson('l08-refermer')!)).toBe('Leçon 14');
    const order = LESSONS.map((l) => l.id);
    expect(order.indexOf('t1-badge')).toBe(order.indexOf('l07-verrou') + 1);
    expect(order.indexOf('a1-piege')).toBeGreaterThan(order.indexOf('t1-badge'));
  });

  it('offers A1 two days after T1 is passed', () => {
    const day = 24 * 3600 * 1000;
    expect(availability(autonomyTrap, [], {})).toEqual({ ready: false, after: 't1-badge' });
    expect(availability(autonomyTrap, ['t1-badge'], { 't1-badge': 0 }, day)).toEqual({ ready: false, from: 2 * day });
    expect(availability(autonomyTrap, ['t1-badge'], { 't1-badge': 0 }, 2 * day).ready).toBe(true);
    expect(availability(autonomyTrap, ['t1-badge'], undefined).ready).toBe(true);
    expect(availability(transferBadge, [], {}).ready).toBe(true);
  });

  it('T1: a solution with the badge written in the graph passes, but not the "badge 3" robustness case', () => {
    const p = transferBadge.setup();
    transferBadge.solve(p);
    expect(runRobustness(transferBadge, p).every((r) => r.ok)).toBe(true);

    const hard = transferBadge.setup();
    transferBadge.solve(hard);
    const g = graphOf(hard, 'BP_Terminal');
    const ge = nodeOf(hard, 'BP_Terminal', 'math.greaterEqualInt');
    disconnectPin(g, { node: ge.id, pin: 'a' });
    ge.defaults.a = 2;
    expect(runLesson(transferBadge, hard).passed).toBe(true);
    expect(runRobustness(transferBadge, hard).map((r) => r.ok)).toEqual([false]);
  });

  it('A1: life kept in the trap fails, and so does a trap that drains on Tick', () => {
    const p = autonomyTrap.setup();
    autonomyTrap.solve(p);
    expect(runLesson(autonomyTrap, p).passed).toBe(true);
    expect(runRobustness(autonomyTrap, p).every((r) => r.ok)).toBe(true);

    const unchecked = autonomyTrap.setup();
    autonomyTrap.solve(unchecked);
    const cast = nodeOf(unchecked, 'BP_Piege', 'cast.to');
    disconnectPin(graphOf(unchecked, 'BP_Piege'), { node: cast.id, pin: 'object' });
    const run = runLesson(autonomyTrap, unchecked);
    expect(run.passed).toBe(false);
  });
});

describe('« Montre-moi »', () => {
  /** T1 solved, but the Cast tests the terminal itself: it always fails, without any error. */
  function castOnSelf(): Project {
    const p = transferBadge.setup();
    transferBadge.solve(p);
    const b = edit(p, 'BP_Terminal');
    const cast = nodeOf(p, 'BP_Terminal', 'cast.to');
    disconnectPin(b.graph, { node: cast.id, pin: 'object' });
    const self = b.node('actor.self', {}, {}, [200, 300]);
    b.link(self, 'self', cast.id, 'object');
    return p;
  }

  it('points at the node the white wire never reached when a Cast always fails', () => {
    const p = castOnSelf();
    const run = runLesson(transferBadge, p);
    expect(run.compileErrors).toEqual([]);
    expect(run.passed).toBe(false);
    const stops = whereItStopped(run.sim!.project, run.sim!);
    const branch = nodeOf(p, 'BP_Terminal', 'flow.branch');
    expect(stops[0]).toMatchObject({ kind: 'stopped', nodeId: branch.id });
    expect(stops[0].text).toMatch(/Cast To BP_Joueur n’a jamais réussi/);
  });

  it('names an event that has wires but never fired', () => {
    const p = castOnSelf();
    const b = edit(p, 'BP_Terminal');
    const gone = b.node('event.destroyed', {}, {}, [64, 700]);
    const say = b.node('debug.printString', {}, {}, [400, 700]);
    b.link(gone, 'then', say, 'exec');
    const run = runLesson(transferBadge, p);
    const stops = whereItStopped(run.sim!.project, run.sim!);
    expect(stops.find((s) => s.kind === 'silent')).toMatchObject({ nodeId: gone });
  });

  it('points at the node of a runtime error first', () => {
    const p = autonomyTrap.setup();
    autonomyTrap.solve(p);
    const minus = nodeOf(p, 'BP_Piege', 'math.subtractInt');
    minus.def = 'math.divideInt';
    minus.defaults.b = 0;
    const run = runLesson(autonomyTrap, p);
    expect(run.compileErrors).toEqual([]);
    expect(run.passed).toBe(false);
    const stops = whereItStopped(run.sim!.project, run.sim!);
    expect(stops[0].kind).toBe('error');
    expect(stops.length).toBeLessThanOrEqual(3);
  });
});
