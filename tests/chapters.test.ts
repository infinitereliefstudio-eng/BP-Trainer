/**
 * UI-2 (V7.85): the chapters of the path. Each step falls in exactly one chapter, of its own level; each level
 * starts a chapter; chapters are in the order of the path.
 */
import { describe, expect, it } from 'vitest';
import { LESSONS } from '../src/core/lessons';
import { CHAPTERS, chapterOf, chaptersOf, chapterSteps } from '../src/core/lessons/chapters';
import { LEVELS } from '../src/core/lessons/levels';

describe('the chapters of the path (UI-2)', () => {
  it('each chapter starts at an existing step of its own level', () => {
    for (const c of CHAPTERS) {
      const first = LESSONS.find((l) => l.id === c.from);
      expect(first, c.from).toBeDefined();
      expect(first?.level, c.title).toBe(c.level);
    }
  });

  it('chapters follow the order of the path, none twice', () => {
    const at = CHAPTERS.map((c) => LESSONS.findIndex((l) => l.id === c.from));
    expect(at).toEqual([...at].sort((a, b) => a - b));
    expect(new Set(at).size).toBe(at.length);
  });

  it('the first step of each level opens a chapter, so no chapter runs over two levels', () => {
    const starts = new Set(CHAPTERS.map((c) => c.from));
    for (const lv of LEVELS) {
      const first = LESSONS.find((l) => l.level === lv.id);
      if (first) expect(starts.has(first.id), lv.title).toBe(true);
    }
    for (const c of chapterSteps()) for (const l of c.steps) expect(l.level, `${l.id} dans « ${c.title} »`).toBe(c.level);
  });

  it('every step is in one chapter, and the chapters are short enough to read', () => {
    const all = chapterSteps().flatMap((c) => c.steps.map((l) => l.id));
    expect(all).toEqual(LESSONS.map((l) => l.id));
    for (const c of chapterSteps()) expect(c.steps.length, c.title).toBeLessThanOrEqual(12);
  });

  it('finds a step’s chapter', () => {
    expect(chapterOf('l-ei-controleur')?.title).toBe('Enhanced Input');
    expect(chaptersOf('expert')).toHaveLength(1);
  });
});
