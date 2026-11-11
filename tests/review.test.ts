import { describe, expect, it } from 'vitest';
import { LESSONS } from '../src/core/lessons';
import { MEMO, MEMO_THEMES } from '../src/core/reference/memo';
import { lessonsByNode, nodeCards } from '../src/core/reference/nodeIndex';
import { QUIZ } from '../src/core/review';
import { answered, DAY, dayKey, dueDate, dueQuestions, INTERVALS, knownCount, shuffled, streak, unlocked } from '../src/core/review/schedule';
import { getDefinition } from '../src/core/nodes/registry';

describe('review questions', () => {
  it('ids are unique', () => {
    expect(new Set(QUIZ.map((q) => q.id)).size).toBe(QUIZ.length);
  });

  it('each question belongs to an existing lesson or memo card', () => {
    const lessons = new Set(LESSONS.map((l) => l.id));
    const memos = new Set(MEMO.map((m) => m.id));
    for (const q of QUIZ) {
      expect(!!q.lesson !== !!q.memo, q.id).toBe(true);
      if (q.lesson) expect(lessons.has(q.lesson), q.id).toBe(true);
      if (q.memo) expect(memos.has(q.memo), q.id).toBe(true);
    }
  });

  it('each question has four distinct options and an explanation', () => {
    for (const q of QUIZ) {
      expect(q.options.length, q.id).toBe(4);
      expect(new Set(q.options).size, q.id).toBe(4);
      expect(q.why.length, q.id).toBeGreaterThan(20);
      expect(q.question.trim().endsWith('?'), q.id).toBe(true);
    }
  });

  it('every lesson and every memo card has at least one question', () => {
    const asked = new Set(QUIZ.map((q) => q.lesson ?? q.memo));
    expect(LESSONS.filter((l) => !asked.has(l.id)).map((l) => l.id)).toEqual([]);
    expect(MEMO.filter((m) => !asked.has(m.id)).map((m) => m.id)).toEqual([]);
  });
});

describe('review schedule', () => {
  const now = new Date(2026, 10, 11, 15, 0, 0).getTime();
  const [q1, q2] = QUIZ.filter((q) => q.lesson);
  const memoQ = QUIZ.find((q) => q.memo)!;

  it('a question unlocks with its lesson, or once its memo card is read', () => {
    expect(unlocked(q1, { done: [] })).toBe(false);
    expect(unlocked(q1, { done: [q1.lesson!] })).toBe(true);
    expect(unlocked(memoQ, { done: [] })).toBe(false);
    expect(unlocked(memoQ, { done: [], read: [memoQ.memo!] })).toBe(true);
  });

  it('is due a day after the lesson, at once for lessons passed before reviews existed', () => {
    const fresh = { done: [q1.lesson!], doneAt: { [q1.lesson!]: now } };
    expect(dueQuestions(QUIZ, fresh, now)).toEqual([]);
    expect(dueQuestions(QUIZ, fresh, now + DAY).map((q) => q.id)).toEqual([q1.id]);
    expect(dueQuestions(QUIZ, { done: [q1.lesson!] }, now).map((q) => q.id)).toEqual([q1.id]);
  });

  it('a right answer pushes the question further each time, a wrong one brings it back tomorrow', () => {
    let state = answered(undefined, true, now);
    expect(state).toEqual({ box: 0, due: now + INTERVALS[0] * DAY });
    state = answered(state, true, now);
    expect(state).toEqual({ box: 1, due: now + INTERVALS[1] * DAY });
    for (let i = 0; i < 10; i++) state = answered(state, true, now);
    expect(state.box).toBe(INTERVALS.length - 1);
    expect(answered(state, false, now)).toEqual({ box: 0, due: now + DAY });
  });

  it('orders due questions from the most overdue, and counts the known ones', () => {
    const who = {
      done: [q1.lesson!, q2.lesson!],
      review: { [q1.id]: { box: 2, due: now - DAY }, [q2.id]: { box: 0, due: now - 3 * DAY } },
    };
    expect(dueQuestions(QUIZ, who, now).map((q) => q.id)).toEqual([q2.id, q1.id]);
    expect(dueDate(q1, who)).toBe(now - DAY);
    expect(knownCount(QUIZ, who)).toBe(1);
  });

  it('counts the days in a row, ending today or yesterday', () => {
    const d = (offset: number) => dayKey(now - offset * DAY);
    expect(streak([], now)).toBe(0);
    expect(streak([d(0)], now)).toBe(1);
    expect(streak([d(2), d(1), d(0)], now)).toBe(3);
    expect(streak([d(3), d(2), d(1)], now)).toBe(3);
    expect(streak([d(5), d(2)], now)).toBe(0);
    expect(streak([d(4), d(1), d(0)], now)).toBe(2);
  });

  it('shuffles the same way for the same seed, keeping every item', () => {
    const items = ['a', 'b', 'c', 'd'];
    expect(shuffled(items, 7)).toEqual(shuffled(items, 7));
    expect([...shuffled(items, 7)].sort()).toEqual(items);
    const orders = new Set(Array.from({ length: 30 }, (_, i) => shuffled(items, i).join('')));
    expect(orders.size).toBeGreaterThan(5);
  });
});

describe('memo', () => {
  it('ids are unique and themes exist', () => {
    expect(new Set(MEMO.map((m) => m.id)).size).toBe(MEMO.length);
    const themes = new Set(MEMO_THEMES.map((t) => t.id));
    for (const m of MEMO) expect(themes.has(m.theme), m.id).toBe(true);
    for (const t of MEMO_THEMES) expect(MEMO.some((m) => m.theme === t.id), t.id).toBe(true);
  });

  it('linked lessons exist', () => {
    const lessons = new Set(LESSONS.map((l) => l.id));
    for (const m of MEMO) for (const id of m.lessons ?? []) expect(lessons.has(id), `${m.id} → ${id}`).toBe(true);
  });

  it('texts have no stray escapes and close their marks', () => {
    for (const m of MEMO) {
      expect(m.body.includes('\\n'), m.id).toBe(false);
      expect((m.body.match(/\*\*/g) ?? []).length % 2, m.id).toBe(0);
      expect((m.body.match(/`/g) ?? []).length % 2, m.id).toBe(0);
    }
  });
});

describe('node index', () => {
  it('lists each node once, with a description', () => {
    const cards = nodeCards();
    expect(cards.length).toBeGreaterThan(150);
    expect(new Set(cards.map((c) => c.id)).size).toBe(cards.length);
    for (const c of cards) {
      expect(getDefinition(c.id), c.id).toBeTruthy();
      expect(c.title.length, c.id).toBeGreaterThan(0);
    }
  });

  it('knows which lessons use a node', () => {
    const usage = lessonsByNode();
    expect(usage.get('debug.printString')).toContain('l01-bonjour');
    expect(usage.get('timeline.node')).toContain('l-porte-glisse');
    expect(usage.get('trace.lineByChannel')).toContain('l-regarder');
  });
});
