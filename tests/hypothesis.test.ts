/**
 * « Hypothèse avant l'indice » (chantier n° 2, étape D): where the check
 * points, what the learner is told, and what the progress keeps.
 */
import { describe, expect, it } from 'vitest';
import { getDrill } from '../src/core/drills';
import { drillId, planOf, withChain } from '../src/core/drills/make';
import { asksHypothesis, diagnose, hypothesisFeedback } from '../src/core/explain/hypothesis';
import { getLesson, LESSONS } from '../src/core/lessons';
import { runLesson } from '../src/core/lessons/runner';
import { checkProgress, emptyProgress, sanitizeProgress, withCheck, withHelp, withHelpReset } from '../src/core/progress/progress';
import { CAST } from '../src/core/drills/families/cast';

const T0 = Date.UTC(2026, 10, 19, 9, 0);
const start = (id: string) => {
  const l = getLesson(id)!;
  return diagnose(runLesson(l, l.setup()));
};

describe('hypothesis: which steps ask', () => {
  it('every Débogue, and the drills to repair; nothing else', () => {
    for (const l of LESSONS) expect(asksHypothesis(l), l.id).toBe(l.kind === 'debug');
    const repair = Array.from({ length: 12 }, (_, s) => getDrill(drillId('cast', s))!).filter((d) => d.drill!.format === 'repair');
    expect(repair.length).toBeGreaterThan(0);
    for (const d of repair) expect(asksHypothesis(d)).toBe(true);
  });
});

describe('hypothesis: where the check points', () => {
  it('Accessed None: the reference', () => {
    expect(start('d1-accessed-none')?.hypothesis).toBe('reference');
  });

  it('a Branch that never went one way: the condition', () => {
    expect(start('d4-une-sur-deux')).toMatchObject({ hypothesis: 'condition', evidence: expect.stringMatching(/Branch/) });
  });

  it('an event that never fired: the event', () => {
    expect(start('d20-contexte')).toMatchObject({ hypothesis: 'event', evidence: expect.stringMatching(/jamais déclenché/) });
  });

  it('a Cast that never succeeded: the reference', () => {
    const badge = CAST.situations.find((s) => s.id === 'terminal')!;
    const plan = planOf({ ...CAST, situations: [badge] }, 0);
    const { project, roles } = withChain(plan);
    badge.mistakes.find((m) => m.id === 'object-self')!.apply(project, roles, plan.params);
    const drill = getDrill(drillId('cast', CAST.situations.indexOf(badge)))!;
    const found = diagnose(runLesson({ ...drill, scenario: badge.scenario(plan.params), checks: badge.checks(plan.params) }, project));
    expect(found).toMatchObject({ hypothesis: 'reference', evidence: expect.stringMatching(/Cast To BP_Joueur n’a jamais réussi/) });
  });

  it('nothing to say on a passed run, or one that does not compile', () => {
    const l = getLesson('d1-accessed-none')!;
    const p = l.setup();
    l.solve(p);
    expect(diagnose(runLesson(l, p))).toBeUndefined();
  });

  it('every Débogue start can be diagnosed without error', () => {
    for (const l of LESSONS.filter(asksHypothesis)) expect(() => diagnose(runLesson(l, l.setup())), l.id).not.toThrow();
  });
});

describe('hypothesis: what the learner is told', () => {
  const found = { hypothesis: 'reference' as const, evidence: 'une erreur Accessed None dans l’Output Log, un nœud a reçu une référence vide (None).' };
  it('right, wrong, unsure, undecided', () => {
    expect(hypothesisFeedback('reference', found)).toMatch(/^Bien vu, c’est la référence\. La vérification montre : une erreur Accessed None/);
    expect(hypothesisFeedback('event', found)).toMatch(/Ça désigne plutôt la référence : regarde là d’abord\.$/);
    expect(hypothesisFeedback('unsure', found)).toMatch(/plutôt la référence/);
    expect(hypothesisFeedback('condition', undefined)).toMatch(/Print String de la valeur suspecte, ou un breakpoint/);
    expect(hypothesisFeedback('unsure', undefined)).toMatch(/Lance ▶ Play/);
  });
});

describe('hypothesis: what the progress keeps', () => {
  it('kept with the help of the step, logged with the next check, asked again after Recommencer', () => {
    let p = withHelp(emptyProgress(), 'd1-accessed-none', (h) => ({ ...h, hints: 1, hypothesis: { choice: 'event', found: 'reference', evidence: 'x' } }));
    expect(p.help?.['d1-accessed-none'].hypothesis?.choice).toBe('event');
    p = withCheck(p, { lesson: 'd1-accessed-none', rev: 1 }, { passed: false, errors: ['accessed-none'], failed: ['a'], missed: [] }, T0);
    p = withHelp(p, 'd1-accessed-none', (h) => ({ ...h, hypothesis: { choice: 'condition' } }));
    p = withCheck(p, { lesson: 'd1-accessed-none', rev: 1 }, { passed: true, errors: [], failed: [], missed: [] }, T0 + 1000);
    // The first hypothesis of the attempt is the one kept.
    expect(p.log!.attempts[0].hypothesis).toEqual({ choice: 'event', found: 'reference' });
    expect(checkProgress(JSON.parse(JSON.stringify(p)))).toEqual([]);
    expect(sanitizeProgress(JSON.parse(JSON.stringify(p))).progress).toEqual(p);
    expect(withHelpReset(p, 'd1-accessed-none').help?.['d1-accessed-none']).toBeUndefined();
    expect(checkProgress({ done: [], help: { x: { hints: 1, hypothesis: { choice: 3 } } } })).toEqual(['« help » est mal formé']);
  });
});
