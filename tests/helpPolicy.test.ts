/** The help a step gives, by its level (lot 0, Tristan's choices of 18 November 2026). */
import { describe, expect, it } from 'vitest';
import { LESSONS } from '../src/core/lessons';
import { estimatedMinutes } from '../src/core/lessons/duration';
import { helpOffers } from '../src/core/lessons/helpPolicy';
import { lessonLabel, type Lesson } from '../src/core/lessons/types';
import { checkProgress, helpLevel, withHelp, emptyProgress } from '../src/core/progress/progress';

const first = (pred: (l: Lesson) => boolean) => LESSONS.find(pred)!;
const build = (level: Lesson['level']) => first((l) => l.level === level && (!l.kind || l.kind === 'build') && !l.chain);
const offers = (l: Lesson, tried = false, fails = 0, done = false) => helpOffers(l, { tried, fails, done }).map((o) => `${o.kind}:${o.available ? 'open' : 'locked'}`);

describe('help by level', () => {
  it('Débutant and Intermédiaire: hint, nodes and solution open at once', () => {
    for (const level of ['debutant', 'intermediaire'] as const) expect(offers(build(level))).toEqual(['hint:open', 'nodes:open', 'solution:open']);
  });

  it('Confirmé: hint after a try, no node list, solution after success or three failed checks', () => {
    const l = build('confirme');
    expect(offers(l)).toEqual(['hint:locked', 'solution:locked']);
    expect(offers(l, true, 2)).toEqual(['hint:open', 'solution:locked']);
    expect(offers(l, true, 3)).toEqual(['hint:open', 'solution:open']);
    expect(offers(l, true, 0, true)).toEqual(['hint:open', 'solution:open']);
    expect(helpOffers(l, { tried: true, fails: 1, done: false }).at(-1)?.locked).toContain('encore 2');
  });

  it('Avancé: the solution only after success, to compare', () => {
    const l = build('avance');
    expect(offers(l, true, 10)).toEqual(['hint:open', 'solution:locked']);
    expect(offers(l, true, 0, true)).toEqual(['hint:open', 'solution:open']);
  });

  it('Expert: no hint, no nodes, the solution after success', () => {
    const l: Lesson = { ...build('avance'), id: 'x-expert', level: 'expert' };
    expect(offers(l, true, 10)).toEqual(['solution:locked']);
    expect(offers(l, true, 0, true)).toEqual(['solution:open']);
  });

  it('a Prédis keeps its help open, whatever its level', () => {
    const p = first((l) => l.kind === 'predict' && l.level === 'confirme');
    expect(offers(p)).toEqual(['hint:open', 'nodes:open', 'solution:open']);
  });

  it('transfer and autonomy stay stricter than an open level: hints after a try, no nodes in autonomy', () => {
    const t = first((l) => l.chain?.step === 'transfer');
    const a = first((l) => l.chain?.step === 'autonomy');
    expect(t.level).toBe('intermediaire');
    expect(offers(t)).toEqual(['hint:locked', 'nodes:locked', 'solution:locked']);
    expect(offers(a, true)).toEqual(['hint:open', 'solution:open']);
  });
});

describe('failed checks in the progress', () => {
  it('are kept, validated, and do not change the help level', () => {
    const p = withHelp(emptyProgress(), 'l01-bonjour', (h) => ({ ...h, tried: true, fails: 2 }));
    expect(p.help?.['l01-bonjour']).toEqual({ hints: 0, tried: true, fails: 2 });
    expect(checkProgress(p)).toEqual([]);
    expect(checkProgress({ ...p, help: { x: { hints: 0, fails: 'deux' } } }).length).toBeGreaterThan(0);
    expect(helpLevel(p.help?.['l01-bonjour'])).toBe('alone');
  });
});

describe('synthesis and Expert steps', () => {
  it('a synthesis is labelled S…, unnumbered, and given more time; an Expert project up to two hours', () => {
    const base = build('avance');
    const s: Lesson = { ...base, id: 'x-synth', kind: 'synthesis', code: 'S9' };
    expect(lessonLabel(s)).toBe('Synthèse S9');
    expect(estimatedMinutes(s)).toBeGreaterThanOrEqual(estimatedMinutes(base));
    const e: Lesson = { ...base, id: 'x-expert-time', level: 'expert' };
    expect(estimatedMinutes(e)).toBeLessThanOrEqual(120);
  });

  it('a synthesis gives no node list, and its hints open after a first try, even in Débutant', () => {
    const s1 = LESSONS.find((l) => l.kind === 'synthesis' && l.level === 'debutant')!;
    expect(s1).toBeDefined();
    const before = helpOffers(s1, { tried: false, fails: 0, done: false });
    expect(before.map((o) => o.kind)).not.toContain('nodes');
    expect(before.every((o) => !o.available)).toBe(true);
    expect(helpOffers(s1, { tried: true, fails: 1, done: false }).every((o) => o.available)).toBe(true);
  });
});
