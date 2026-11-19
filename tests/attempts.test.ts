/**
 * The attempt log (chantier n° 2, étape A): one line per attempt at a step,
 * in the progress, versioned, saved with the full backup.
 */
import { describe, expect, it } from 'vitest';
import { getLesson, LESSONS } from '../src/core/lessons';
import { checkOutcome } from '../src/core/lessons/outcome';
import { HOLD_NOTE, type LessonRun, ORDER_NOTE, runLesson } from '../src/core/lessons/runner';
import {
  ATTEMPT_GAP,
  ATTEMPT_LOG_VERSION,
  type AttemptLog,
  type CheckOutcome,
  checkLog,
  logCheck,
  MAX_ATTEMPTS,
  sanitizeLog,
} from '../src/core/progress/attempts';
import { checkProgress, emptyProgress, type Progress, sanitizeProgress, withCheck, withHelp, withHelpReset, withoutLog, withPassed } from '../src/core/progress/progress';

const T0 = Date.UTC(2026, 10, 19, 9, 0);
const MIN = 60 * 1000;
const fail = (over: Partial<CheckOutcome> = {}): CheckOutcome => ({ passed: false, errors: [], failed: ['a'], missed: [], ...over });
const pass: CheckOutcome = { passed: true, errors: [], failed: [], missed: [] };
const step = { lesson: 'l1', rev: 1 };

/** Vérifier pressed, then (when it passed) the step marked passed, as Root does. */
function verify(p: Progress, outcome: CheckOutcome, at: number, s = step): Progress {
  const next = withCheck(p, s, outcome, at);
  return outcome.passed ? withPassed(next, s.lesson, at) : next;
}

describe('attempt log', () => {
  it('gathers the checks of one attempt until it is passed', () => {
    let p = emptyProgress();
    p = verify(p, fail({ errors: ['compile'], failed: [] }), T0);
    p = verify(p, fail({ errors: ['accessed-none'], failed: ['a', 'b'] }), T0 + MIN);
    p = verify(p, fail({ failed: ['a'] }), T0 + 2 * MIN);
    p = verify(p, pass, T0 + 3 * MIN);
    expect(p.log?.v).toBe(ATTEMPT_LOG_VERSION);
    expect(p.log?.attempts).toEqual([
      { lesson: 'l1', rev: 1, start: T0, end: T0 + 3 * MIN, checks: 4, passed: true, help: 'alone', hints: 0, errors: { compile: 1, 'accessed-none': 1 }, failed: { a: 2, b: 1 } },
    ]);
  });

  it('starts a new attempt after a success, marked as a replay', () => {
    let p = verify(emptyProgress(), pass, T0);
    p = verify(p, fail(), T0 + MIN);
    expect(p.log?.attempts.map((a) => [a.checks, a.passed, a.again])).toEqual([
      [1, true, undefined],
      [1, false, true],
    ]);
  });

  it('starts a new attempt when the step was left for a while', () => {
    let p = verify(emptyProgress(), fail(), T0);
    p = verify(p, fail(), T0 + ATTEMPT_GAP - 1);
    p = verify(p, fail(), T0 + 2 * ATTEMPT_GAP);
    expect(p.log?.attempts.map((a) => a.checks)).toEqual([2, 1]);
  });

  it('starts a new attempt when the step changed with an update of the app', () => {
    let p = verify(emptyProgress(), fail(), T0);
    p = verify(p, fail(), T0 + MIN, { lesson: 'l1', rev: 2 });
    expect(p.log?.attempts.map((a) => [a.rev, a.checks])).toEqual([
      [1, 1],
      [2, 1],
    ]);
  });

  it('keeps attempts at different steps apart, even when they interleave', () => {
    let p = verify(emptyProgress(), fail(), T0);
    p = verify(p, fail(), T0 + MIN, { lesson: 'l2', rev: 1 });
    p = verify(p, pass, T0 + 2 * MIN);
    expect(p.log?.attempts.map((a) => [a.lesson, a.checks, a.passed])).toEqual([
      ['l1', 2, true],
      ['l2', 1, false],
    ]);
  });

  it('Recommencer ends the attempt, unfinished, and starts the help over', () => {
    let p = verify(emptyProgress(), fail(), T0);
    p = withHelp(p, 'l1', (h) => ({ ...h, hints: 2 }));
    p = verify(p, fail(), T0 + MIN);
    p = withHelpReset(p, 'l1');
    p = verify(p, pass, T0 + 2 * MIN);
    expect(p.log?.attempts.map((a) => [a.checks, a.passed, a.closed, a.help, a.hints])).toEqual([
      [2, false, true, 'hints', 2],
      [1, true, undefined, 'alone', 0],
    ]);
  });

  it('records the help used when Vérifier was pressed', () => {
    let p = withHelp(emptyProgress(), 'l1', (h) => ({ ...h, hints: 1 }));
    p = verify(p, fail(), T0);
    p = withHelp(p, 'l1', (h) => ({ ...h, solution: true }));
    p = verify(p, pass, T0 + MIN);
    expect(p.log?.attempts[0]).toMatchObject({ help: 'solution', hints: 1, checks: 2 });
    expect(p.passedWith?.l1).toBe('solution');
  });

  it('counts a check as an active day', () => {
    const p = verify(emptyProgress(), fail(), T0);
    expect(p.days).toHaveLength(1);
  });

  it('keeps the last MAX_ATTEMPTS attempts', () => {
    let log: AttemptLog | undefined;
    for (let i = 0; i < MAX_ATTEMPTS + 5; i++) log = logCheck(log, { lesson: `l${i}`, rev: 1, wasDone: false }, fail(), { level: 'alone', hints: 0 }, T0 + i);
    expect(log?.attempts).toHaveLength(MAX_ATTEMPTS);
    expect(log?.attempts[0].lesson).toBe('l5');
  });

  it('can be emptied without touching the rest of the progress', () => {
    const p = verify(emptyProgress(), pass, T0);
    const q = withoutLog(p);
    expect(q.log).toBeUndefined();
    expect(q.done).toEqual(['l1']);
  });
});

describe('attempt log: storage', () => {
  const stored = () => verify(verify(emptyProgress(), fail({ errors: ['not-reached'] }), T0), pass, T0 + MIN);

  it('a progress with its log passes the backup check and survives a round trip', () => {
    const p = stored();
    const text = JSON.stringify(p);
    expect(checkProgress(JSON.parse(text))).toEqual([]);
    expect(sanitizeProgress(JSON.parse(text))).toEqual({ progress: p, complete: true });
  });

  it('a damaged attempt is dropped, the others kept, and a backup with it is refused', () => {
    const raw = JSON.parse(JSON.stringify(stored()));
    raw.log.attempts.push({ lesson: 'l9', checks: 'beaucoup' });
    const { progress, complete } = sanitizeProgress(raw);
    expect(complete).toBe(false);
    expect(progress.log?.attempts).toHaveLength(1);
    expect(progress.done).toEqual(['l1']);
    expect(checkProgress(raw)).toEqual(['1 essai(s) mal formé(s) dans le journal']);
  });

  it('an unreadable log costs nothing else', () => {
    const raw = { ...JSON.parse(JSON.stringify(stored())), log: 'cassé' };
    const { progress, complete } = sanitizeProgress(raw);
    expect(complete).toBe(false);
    expect(progress.log).toBeUndefined();
    expect(progress.done).toEqual(['l1']);
  });

  it('a log from a newer app is kept untouched, never rewritten', () => {
    const newer = { v: ATTEMPT_LOG_VERSION + 1, attempts: [{ whatever: true }] } as unknown as AttemptLog;
    expect(checkLog(newer)).toEqual([]);
    expect(sanitizeLog(newer)).toEqual({ log: newer, complete: true });
    const p: Progress = { ...emptyProgress(), log: newer };
    expect(withCheck(p, step, fail(), T0).log).toBe(newer);
    expect(withHelpReset(p, 'l1').log).toBe(newer);
  });
});

describe('attempt log: what a check found', () => {
  const base: LessonRun = { compileErrors: [], results: [], passed: false, runtimeErrors: [], notes: [], prints: [] };

  it('tells Accessed None from other runtime errors, as the Output Log writes them', () => {
    const run = { ...base, runtimeErrors: ['Blueprint Runtime Error: "Accessed None trying to read property Target". Node: …', 'Blueprint Runtime Error: "Infinite loop detected".'] };
    expect(checkOutcome(run).errors.sort()).toEqual(['accessed-none', 'runtime']);
  });

  it('notes a solution that depends on the BeginPlay order or on instant presses', () => {
    expect(checkOutcome({ ...base, notes: [ORDER_NOTE] }).errors).toEqual(['order']);
    expect(checkOutcome({ ...base, notes: [HOLD_NOTE] }).errors).toEqual(['hold']);
  });

  it('D1: the empty reference is logged as Accessed None', () => {
    const d1 = getLesson('d1-accessed-none')!;
    const out = checkOutcome(runLesson(d1, d1.setup()));
    expect(out.passed).toBe(false);
    expect(out.errors).toContain('accessed-none');
    expect(out.failed.length).toBeGreaterThan(0);
  });

  it('every step: the start fails with known check ids, the solution passes with none failed', () => {
    for (const lesson of LESSONS) {
      const ids = new Set(lesson.checks.map((c) => c.id));
      const start = lesson.setup();
      if (lesson.kind !== 'predict') {
        const out = checkOutcome(runLesson(lesson, start));
        expect(out.passed, lesson.id).toBe(false);
        for (const id of [...out.failed, ...out.missed]) expect(ids.has(id), `${lesson.id}: ${id}`).toBe(true);
        if (!out.errors.includes('compile')) expect(out.failed.length + out.missed.length, lesson.id).toBeGreaterThan(0);
      }
      lesson.solve(start);
      const solved = checkOutcome(runLesson(lesson, start));
      expect(solved.passed, lesson.id).toBe(true);
      expect(solved.failed, lesson.id).toEqual([]);
    }
  }, 120_000);
});
