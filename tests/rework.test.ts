/**
 * « À retravailler en Blueprint » (chantier n° 2, étape B): the schedule by
 * notion, replayed from the attempt log, and the steps offered to redo.
 */
import { describe, expect, it } from 'vitest';
import { getLesson, LESSONS } from '../src/core/lessons';
import { LESSON_NOTIONS } from '../src/core/notions/lessonNotions';
import { ATTEMPT_GAP, type CheckOutcome } from '../src/core/progress/attempts';
import {
  checkProgress,
  emptyProgress,
  practiceHelpKey,
  type Progress,
  sanitizeProgress,
  withCheck,
  withHelp,
  withHelpReset,
  withPassed,
  withPostponed,
  withPracticeOpen,
} from '../src/core/progress/progress';
import { DAY } from '../src/core/review/schedule';
import { countsForRework, dueRework, nextRework, practiceEvents, REWORK_INTERVALS, reworkNotions, reworkSchedule, stepsFor } from '../src/core/rework/schedule';
import { reworkCards, suggestedSteps, whyNow } from '../src/core/rework/suggest';

const T0 = Date.UTC(2026, 10, 2, 9, 0);
const MIN = 60 * 1000;
const fail: CheckOutcome = { passed: false, errors: [], failed: ['x'], missed: [] };
const pass: CheckOutcome = { passed: true, errors: [], failed: [], missed: [] };

/** Vérifier on a step, as Root does (practice: from the queue, apart from the lesson). */
function verify(p: Progress, lesson: string, outcome: CheckOutcome, at: number, practice = false): Progress {
  const next = withCheck(p, { lesson, rev: getLesson(lesson)?.revision ?? 1, practice }, outcome, at);
  if (!outcome.passed) return next;
  return practice ? withPracticeOpen(next, lesson, false) : withPassed(next, lesson, at);
}

const cast = (p: Progress, now: number) => reworkSchedule(p, now).find((s) => s.notion === 'cast');

describe('rework: which steps count', () => {
  it('Prédis, syntheses and Expert projects do not count; building, repairing and transfer steps do', () => {
    expect(countsForRework(getLesson('p13-qui-entre')!)).toBe(false);
    expect(countsForRework(getLesson('s1-passage')!)).toBe(false);
    for (const l of LESSONS.filter((x) => x.code?.startsWith('X'))) expect(countsForRework(l)).toBe(false);
    expect(reworkNotions('l06-cle')).toEqual(LESSON_NOTIONS['l06-cle'].teaches);
    expect(reworkNotions('t1-badge')).toContain('cast');
  });

  it('every notion a counting step teaches can be practised again with that step', () => {
    const done = LESSONS.map((l) => l.id);
    for (const l of LESSONS.filter(countsForRework)) {
      for (const n of LESSON_NOTIONS[l.id]?.teaches ?? []) expect(stepsFor(n, done).map((x) => x.id), `${l.id} › ${n}`).toContain(l.id);
    }
  });
});

describe('rework: the schedule', () => {
  it('a notion comes back the day after the first step that teaches it', () => {
    const p = verify(emptyProgress(), 'l06-cle', pass, T0);
    expect(cast(p, T0)).toMatchObject({ box: 0, due: T0 + DAY, introduced: T0 });
    expect(dueRework(p, T0 + DAY - 1).map((s) => s.notion)).not.toContain('cast');
    expect(dueRework(p, T0 + DAY).map((s) => s.notion)).toContain('cast');
  });

  it('passed alone when due: J+1, J+3, J+7, J+14, then J+21', () => {
    let p = verify(emptyProgress(), 'l06-cle', pass, T0);
    let t = T0;
    const seen: number[] = [];
    for (let i = 0; i < 6; i++) {
      t = cast(p, t)!.due;
      p = verify(p, 'l06-cle', pass, t, true);
      seen.push((cast(p, t)!.due - t) / DAY);
    }
    expect(seen).toEqual([3, 7, 14, 21, 21, 21]);
    expect(REWORK_INTERVALS).toEqual([1, 3, 7, 14, 21]);
  });

  it('on the due day, a practice in the morning counts, whatever the hour of the first success', () => {
    let p = verify(emptyProgress(), 'l06-cle', pass, T0 + 10 * 60 * MIN);
    p = verify(p, 'l06-cle', pass, T0 + DAY, true);
    expect(cast(p, T0 + DAY)!.box).toBe(1);
  });

  it('practising ahead moves nothing; with hints, the same interval again', () => {
    let p = verify(emptyProgress(), 'l06-cle', pass, T0);
    p = verify(p, 'l06-cle', pass, T0 + 3 * 60 * MIN, true);
    expect(cast(p, T0)).toMatchObject({ box: 0, due: T0 + DAY });
    const t = T0 + 2 * DAY;
    p = withHelp(p, practiceHelpKey('l06-cle'), (h) => ({ ...h, hints: 1 }));
    p = verify(p, 'l06-cle', pass, t, true);
    expect(cast(p, t)).toMatchObject({ box: 0, due: t + DAY });
  });

  it('the solution seen, or an attempt started over, brings the notion back to the next day', () => {
    let p = verify(emptyProgress(), 'l06-cle', pass, T0);
    const t1 = T0 + DAY;
    p = verify(p, 'l06-cle', pass, t1, true);
    expect(cast(p, t1)!.box).toBe(1);
    const t2 = t1 + 3 * DAY;
    p = verify(p, 'l06-cle', fail, t2, true);
    p = withHelpReset(p, 'l06-cle', true);
    expect(cast(p, t2)).toMatchObject({ box: 0, due: t2 + DAY });
    const t3 = t2 + DAY;
    p = withHelp(p, practiceHelpKey('l06-cle'), (h) => ({ ...h, solution: true }));
    p = verify(p, 'l06-cle', pass, t3, true);
    expect(cast(p, t3)).toMatchObject({ box: 0, due: t3 + DAY });
  });

  it('an attempt still under way does not count; left for a while, it counts as not passed', () => {
    let p = verify(emptyProgress(), 'l06-cle', pass, T0);
    const t = T0 + DAY;
    p = verify(p, 'l06-cle', fail, t, true);
    expect(cast(p, t + MIN)!.last.t).toBe(T0);
    expect(cast(p, t + ATTEMPT_GAP)).toMatchObject({ box: 0, due: t + DAY, last: { result: 'failed', practice: true } });
  });

  it('failing a step before passing any that teaches the notion does not bring it in', () => {
    const p = verify(emptyProgress(), 'l06-cle', fail, T0);
    expect(cast(p, T0 + 2 * ATTEMPT_GAP)).toBeUndefined();
  });

  it('another step teaching the notion counts as a practice of it', () => {
    let p = verify(emptyProgress(), 'l06-cle', pass, T0);
    p = verify(p, 't1-badge', pass, T0 + DAY);
    expect(cast(p, T0 + DAY)!.box).toBe(1);
  });

  it('a step passed before the log existed counts on its day, with its help', () => {
    const p: Progress = { done: ['l06-cle', 'l01-bonjour'], doneAt: { 'l06-cle': T0 }, passedWith: { 'l06-cle': 'solution' } };
    expect(practiceEvents(p, T0).map((e) => [e.step, e.t, e.result])).toEqual([
      ['l01-bonjour', 0, 'alone'],
      ['l06-cle', T0, 'solution'],
    ]);
    expect(cast(p, T0)).toMatchObject({ box: 0, due: T0 + DAY });
    // Passed so long ago that its day was not kept: due now.
    expect(dueRework(p, T0).map((s) => s.notion)).toContain('events');
    expect(whyNow(reworkSchedule(p, T0).find((s) => s.notion === 'events')!, T0)).toMatch(/^Apprise avant le journal/);
  });

  it('a step passed again from the lesson itself counts once, not twice with the old pass', () => {
    let p = verify(emptyProgress(), 'l06-cle', pass, T0);
    p = verify(p, 'l06-cle', pass, T0 + DAY);
    expect(practiceEvents(p, T0 + DAY).filter((e) => e.step === 'l06-cle')).toHaveLength(2);
    expect(cast(p, T0 + DAY)!.box).toBe(1);
  });

  it('the most overdue first; a notion with no step to redo is not offered', () => {
    let p = verify(emptyProgress(), 'l06-cle', pass, T0);
    p = verify(p, 'l03-interrupteur', pass, T0 + DAY);
    const now = T0 + 3 * DAY;
    const due = dueRework(p, now).map((s) => s.notion);
    expect(due.indexOf('cast')).toBeLessThan(due.indexOf('overlap'));
    expect(nextRework(p, T0 + MIN)?.due).toBe(T0 + DAY);
  });
});

describe('rework: put off until tomorrow', () => {
  it('holds until the notion is practised again', () => {
    let p = verify(emptyProgress(), 'l06-cle', pass, T0);
    const t = T0 + DAY;
    p = withPostponed(p, 'cast', t + DAY, t);
    expect(cast(p, t)).toMatchObject({ due: t + DAY, postponedUntil: t + DAY });
    expect(dueRework(p, t).map((s) => s.notion)).not.toContain('cast');
    p = verify(p, 't1-badge', pass, t + 2 * 60 * MIN);
    expect(cast(p, t + 3 * 60 * MIN)!.postponedUntil).toBeUndefined();
  });
});

describe('rework: practice apart from the lesson', () => {
  it('a practice and the lesson keep their attempts and help apart', () => {
    let p = verify(emptyProgress(), 'l06-cle', pass, T0);
    p = withHelp(p, practiceHelpKey('l06-cle'), (h) => ({ ...h, hints: 2 }));
    p = verify(p, 'l06-cle', fail, T0 + DAY, true);
    p = verify(p, 'l06-cle', fail, T0 + DAY + MIN);
    const attempts = p.log!.attempts;
    expect(attempts.map((a) => [!!a.practice, a.again, a.help])).toEqual([
      [false, undefined, 'alone'],
      [true, true, 'hints'],
      [false, true, 'alone'],
    ]);
    expect(p.passedWith?.['l06-cle']).toBe('alone');
  });

  it('a practice under way is remembered until passed, and saved with the progress', () => {
    let p = withPracticeOpen(emptyProgress(), 'l06-cle', true);
    p = withPostponed(p, 'cast', T0 + DAY, T0);
    expect(p.rework).toEqual({ open: ['l06-cle'], postponed: { cast: { at: T0, until: T0 + DAY } } });
    expect(checkProgress(JSON.parse(JSON.stringify(p)))).toEqual([]);
    expect(sanitizeProgress(JSON.parse(JSON.stringify(p))).progress.rework).toEqual(p.rework);
    p = verify(p, 'l06-cle', pass, T0, true);
    expect(p.rework?.open).toEqual([]);
    expect(checkProgress({ done: [], rework: { open: 'x' } })).toEqual(['« rework » est mal formé']);
  });
});

describe('rework: which step to redo', () => {
  const done = LESSONS.map((l) => l.id);

  it('not the step practised last time, when there is another', () => {
    let p = verify(emptyProgress(), 'l06-cle', pass, T0);
    const s = cast({ ...p, done }, T0)!;
    expect(suggestedSteps(s, done)[0].id).not.toBe('l06-cle');
    p = verify(p, 't1-badge', pass, T0 + DAY);
    expect(suggestedSteps(cast({ ...p, done }, T0 + DAY)!, done)[0].id).not.toBe('t1-badge');
  });

  it('every candidate passed, counting, and teaching the notion', () => {
    const p = verify(emptyProgress(), 'l06-cle', pass, T0);
    const s = cast(p, T0)!;
    expect(suggestedSteps(s, p.done).map((l) => l.id)).toEqual(['l06-cle']);
    for (const l of suggestedSteps(s, done)) {
      expect(countsForRework(l)).toBe(true);
      expect(LESSON_NOTIONS[l.id].teaches).toContain('cast');
    }
  });

  it('tells why the notion is there', () => {
    const p = verify(emptyProgress(), 'l06-cle', pass, T0);
    expect(whyNow(cast(p, T0 + DAY)!, T0 + DAY)).toBe('Dernière pratique hier, réussie sans aide : premier rappel le lendemain.');
  });
});

describe('rework: cards of the queue', () => {
  it('notions practised by the same step make one card, redone once', () => {
    const p: Progress = { done: ['l01-bonjour', 'l06-cle'], doneAt: { 'l06-cle': T0 } };
    const cards = reworkCards(p, T0 + DAY);
    const first = cards.find((c) => c.steps[0].id === 'l01-bonjour')!;
    expect(first.notions.map((s) => s.notion).sort()).toEqual([...LESSON_NOTIONS['l01-bonjour'].teaches].sort());
    expect(new Set(cards.map((c) => c.steps[0].id)).size).toBe(cards.length);
    expect(cards.flatMap((c) => c.notions).length).toBe(dueRework(p, T0 + DAY).length);
  });

  it('in a card, the steps that practise all its notions come first', () => {
    const done = LESSONS.map((l) => l.id);
    const p: Progress = { done, doneAt: Object.fromEntries(done.map((id) => [id, T0])) };
    for (const card of reworkCards(p, T0 + DAY)) {
      const covers = (id: string) => card.notions.filter((s) => LESSON_NOTIONS[id].teaches.includes(s.notion)).length;
      expect(covers(card.steps[0].id), card.notions.map((s) => s.notion).join()).toBe(card.notions.length);
    }
  });
});
