/**
 * UI-2 (V7.85): the search and filters of the path.
 */
import { describe, expect, it } from 'vitest';
import { getLesson, LESSONS } from '../src/core/lessons';
import { estimatedMinutes } from '../src/core/lessons/duration';
import { fold, formatOf, isFiltered, matches, NO_FILTER, toTakeUp } from '../src/ui/home/pathFilter';

const none = { done: [] as string[] };
const find = (query: string, p = none) => LESSONS.filter((l) => matches(l, { ...NO_FILTER, query }, p)).map((l) => l.id);

describe('the search of the path (UI-2)', () => {
  it('ignores case, accents and the kind of apostrophe', () => {
    expect(fold('L’Héritage')).toBe("l'heritage");
    expect(find("l'heritage")).toContain('l-heritage');
    expect(find('MÉMO')).toEqual(find('memo'));
  });

  it('finds a step by its notions and its chapter, not only its title', () => {
    expect(find('cast')).toContain('l06-cle');
    expect(find('gameinstance')).toContain('l-sac-qui-suit');
  });

  it('finds a step by its code, and every word must match', () => {
    expect(find('X3')).toContain('x4-ronde');
    expect(find('porte timeline')).toContain('l-porte-glisse');
    expect(find('porte timeline')).not.toContain('l05-porte');
  });

  it('an empty search filters nothing', () => {
    expect(isFiltered(NO_FILTER)).toBe(false);
    expect(isFiltered({ ...NO_FILTER, query: '  ' })).toBe(false);
    expect(LESSONS.every((l) => matches(l, NO_FILTER, none))).toBe(true);
  });
});

describe('the filters of the path (UI-2)', () => {
  it('sorts every step into one format', () => {
    const count = (f: string) => LESSONS.filter((l) => formatOf(l) === f).length;
    expect(count('project')).toBe(5);
    expect(count('lesson') + count('exercise') + count('chain') + count('mixed') + count('project')).toBe(LESSONS.length);
    expect(formatOf(getLesson('s1-passage')!)).toBe('mixed');
    expect(formatOf(getLesson('t1-badge')!)).toBe('chain');
    expect(formatOf(getLesson('p1-sequence-delay')!)).toBe('exercise');
  });

  it('state: to do, passed, to take up again', () => {
    const p = { done: ['l01-bonjour', 'l02-lampe'], passedWith: { 'l02-lampe': 'solution' as const }, help: { 'l03-interrupteur': { hints: 1 } } };
    const ids = (state: 'todo' | 'done' | 'redo') => LESSONS.filter((l) => matches(l, { ...NO_FILTER, state }, p)).map((l) => l.id);
    expect(ids('done')).toEqual(['l01-bonjour', 'l02-lampe']);
    expect(ids('todo')).not.toContain('l01-bonjour');
    expect(ids('redo')).toEqual(['l02-lampe', 'l03-interrupteur']);
    expect(toTakeUp(getLesson('l01-bonjour')!, p)).toBe(false);
  });

  it('length: short, medium, long', () => {
    for (const length of ['short', 'medium', 'long'] as const) {
      for (const l of LESSONS.filter((x) => matches(x, { ...NO_FILTER, length }, none))) {
        const m = estimatedMinutes(l);
        if (length === 'short') expect(m).toBeLessThanOrEqual(10);
        if (length === 'medium') expect(m > 10 && m <= 20).toBe(true);
        if (length === 'long') expect(m).toBeGreaterThan(20);
      }
    }
  });
});
