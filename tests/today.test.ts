/**
 * UI-2 (V7.84): the « Aujourd'hui » page and the rail of the home screen, without the DOM.
 */
import { describe, expect, it } from 'vitest';
import { getLesson, LESSONS } from '../src/core/lessons';
import { milestoneMinutes } from '../src/core/lessons/duration';
import { DAY } from '../src/core/review/schedule';
import { type Page, SPACES, spaceOf } from '../src/ui/home/pages';
import { continuePlan, nextStep, REVIEW_SESSION, reviewPlan, reworkPlan } from '../src/ui/home/todayPlan';

const NOW = Date.UTC(2026, 10, 27, 12);

describe('the rail (UI-2)', () => {
  it('has every page once, in three spaces', () => {
    const pages = SPACES.flatMap((s) => s.pages.map((p) => p.id));
    expect(new Set(pages).size).toBe(pages.length);
    expect([...pages].sort()).toEqual((['today', 'path', 'review', 'nodes', 'memo', 'notebook', 'projects'] as Page[]).sort());
    expect(SPACES.map((s) => s.label)).toEqual(['Apprendre', 'Consulter', 'Créer']);
  });

  it('finds the space of a page', () => {
    expect(spaceOf('review').id).toBe('learn');
    expect(spaceOf('memo').id).toBe('consult');
    expect(spaceOf('projects').id).toBe('create');
  });
});

describe('Continuer (UI-2)', () => {
  it('starts with the first step', () => {
    const { main, next } = continuePlan({ done: [] }, NOW);
    expect(main?.lesson.id).toBe(LESSONS[0].id);
    expect(main?.how).toBe('start');
    expect(main?.minutesLeft).toBeGreaterThan(0);
    expect(next).toBeUndefined();
  });

  it('goes on with the next step of the path', () => {
    const { main } = continuePlan({ done: [LESSONS[0].id] }, NOW);
    expect(main?.lesson.id).toBe(LESSONS[1].id);
    expect(main?.how).toBe('continue');
  });

  it('resumes the step left last, and offers the next one beside it', () => {
    const left = LESSONS[20];
    const { main, next } = continuePlan({ done: [LESSONS[0].id], last: { kind: 'lesson', lessonId: left.id } }, NOW);
    expect(main?.lesson).toBe(left);
    expect(main?.how).toBe('resume');
    expect(next?.id).toBe(LESSONS[1].id);
  });

  it('a step left last and passed since is not resumed', () => {
    const { main } = continuePlan({ done: [LESSONS[0].id], last: { kind: 'lesson', lessonId: LESSONS[0].id } }, NOW);
    expect(main?.how).toBe('continue');
  });

  it('a project in milestones says the one open and the time left for the rest', () => {
    const project = LESSONS.find((l) => (l.milestones?.length ?? 0) >= 3)!;
    const each = milestoneMinutes(project);
    const { main } = continuePlan({ done: [], last: { kind: 'lesson', lessonId: project.id }, milestones: { [project.id]: 1 } }, NOW);
    expect(main?.milestone).toEqual({ at: 2, of: each.length });
    expect(main?.minutesLeft).toBe(each.slice(1).reduce((a, b) => a + b, 0));
  });

  it('nothing to continue once every step is passed', () => {
    expect(continuePlan({ done: LESSONS.map((l) => l.id) }, NOW).main).toBeUndefined();
    expect(nextStep({ done: LESSONS.map((l) => l.id) }, NOW)).toBeUndefined();
  });
});

describe('Révision and À retravailler (UI-2)', () => {
  it('nothing unlocked before a first step', () => {
    const r = reviewPlan({ done: [] }, NOW);
    expect(r).toMatchObject({ questions: 0, due: 0, any: false });
    expect(reworkPlan({ done: [] }, NOW).cards).toBe(0);
  });

  it('counts a session of questions at most, and its minutes', () => {
    const done = LESSONS.slice(0, 30).map((l) => l.id);
    const doneAt = Object.fromEntries(done.map((id) => [id, NOW - 3 * DAY]));
    const r = reviewPlan({ done, doneAt }, NOW);
    expect(r.due).toBeGreaterThan(REVIEW_SESSION);
    expect(r.questions).toBe(REVIEW_SESSION);
    expect(r.minutes).toBeGreaterThanOrEqual(3);
  });

  it('says when the next question comes back when none is due', () => {
    const id = getLesson('l01-bonjour')!.id;
    const r = reviewPlan({ done: [id], doneAt: { [id]: NOW } }, NOW);
    expect(r.questions).toBe(0);
    expect(r.any).toBe(true);
    expect(r.nextDue).toBeGreaterThan(NOW);
  });
});
